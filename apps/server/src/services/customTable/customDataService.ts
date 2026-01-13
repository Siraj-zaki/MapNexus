/**
 * Custom Data Service
 * Handles CRUD operations on custom table data
 */

import { PrismaClient } from '@prisma/client';
import { getCustomTableByName } from './customTableService.js';
import {
  buildGeometryInsertSQL,
  buildGeometrySelectSQL,
  buildSpatialQuery,
  convertFromGeoJSON,
  convertToGeoJSON,
  GeoJSON,
  rowsToFeatureCollection,
} from './geoJsonService.js';

const prisma = new PrismaClient();

/**
 * Insert data into custom table
 */
export async function insertData(
  tableName: string,
  data: Record<string, any>,
  userId?: string
): Promise<any> {
  // Get table definition for validation
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  // Validate required fields
  for (const field of table.fields) {
    if (field.isRequired && (data[field.name] === undefined || data[field.name] === null)) {
      throw new Error(`Required field "${field.displayName}" is missing`);
    }
  }

  // Convert GeoJSON to PostGIS format
  const convertedData = convertFromGeoJSON(data, table.fields as any);

  // Build SQL with proper handling for geometry fields
  const { columns, values, placeholders } = buildGeometryInsertSQL(
    convertedData,
    table.fields as any
  );

  // Build SELECT columns for RETURNING to handle geometry
  const { columns: returnColumns } = buildGeometrySelectSQL(table.fields as any);
  const returningSQL = returnColumns.length > 0 ? returnColumns.join(', ') : '*';

  const sql = `
    INSERT INTO custom_${tableName} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING ${returningSQL};
  `;

  // Execute in transaction ideally, but for now sequential
  const result = await prisma.$queryRawUnsafe(sql, ...values);
  const row = Array.isArray(result) ? result[0] : result;

  // LOG HISTORY
  try {
    if (row && row.id) {
      await prisma.customDataHistory.create({
        data: {
          tableId: table.id,
          recordId: row.id,
          operation: 'INSERT',
          performedBy: userId || 'SYSTEM',
          changedFields: Object.keys(data), // For INSERT, all provided fields are "changed" or just empty? usually we might want to list them.
          previousData: {},
        },
      });
    }
  } catch (err) {
    console.error('Failed to log insert history', err);
    // Don't fail the main request
  }

  // Convert geometry columns back to GeoJSON for response
  return convertToGeoJSON(row, table.fields as any);
}

/**
 * Query data from custom table with filters and pagination
 */
export async function queryData(
  tableName: string,
  options: {
    filters?: Record<string, any>;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: any[]; total: number }> {
  // ... (unchanged implementation of queryData) ...
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  const { filters = {}, orderBy = 'id', orderDir = 'desc', limit = 50, offset = 0 } = options;

  const { columns: selectColumnList } = buildGeometrySelectSQL(table.fields as any);

  const selectColumns = new Set(selectColumnList);
  selectColumns.add('id');

  const selectClause = Array.from(selectColumns).join(', ');

  const whereClauses: string[] = ['deleted_at IS NULL'];
  const params: any[] = [];
  let paramIndex = 1;

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      whereClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  });

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const dataSql = `
    SELECT ${selectClause} FROM custom_${tableName}
    ${whereClause}
    ORDER BY ${orderBy} ${orderDir}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  const countSql = `
    SELECT COUNT(*) as count FROM custom_${tableName}
    ${whereClause};
  `;

  const [data, countResult] = await Promise.all([
    prisma.$queryRawUnsafe(dataSql, ...params, limit, offset),
    prisma.$queryRawUnsafe(countSql, ...params),
  ]);

  const total = Array.isArray(countResult) && countResult[0] ? Number(countResult[0].count) : 0;
  const rows = Array.isArray(data) ? data : [];

  const convertedRows = rows.map((row) => convertToGeoJSON(row, table.fields as any));

  return {
    data: convertedRows,
    total,
  };
}

/**
 * Get single record by ID
 */
export async function getDataById(tableName: string, id: string): Promise<any> {
  // ... (unchanged) ...
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  const { columns: selectColumnList } = buildGeometrySelectSQL(table.fields as any);
  const selectColumns = new Set(selectColumnList);
  selectColumns.add('id');
  const selectClause = Array.from(selectColumns).join(', ');

  const sql = `
    SELECT ${selectClause} FROM custom_${tableName}
    WHERE id = $1::uuid AND deleted_at IS NULL;
  `;

  const result = await prisma.$queryRawUnsafe(sql, id);
  const row = Array.isArray(result) && result.length > 0 ? result[0] : null;

  if (row) {
    return convertToGeoJSON(row, table.fields as any);
  }
  return null;
}

/**
 * Update data in custom table
 */
export async function updateData(
  tableName: string,
  id: string,
  data: Record<string, any>,
  userId?: string
): Promise<any> {
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  // Get previous data for history
  const previousData = await getDataById(tableName, id);

  // Build RETURNING clause for geometry
  const { columns: returnColumns } = buildGeometrySelectSQL(table.fields as any);
  const returningSQL = returnColumns.length > 0 ? returnColumns.join(', ') : '*';

  // Build SET clause
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns
    .map((col, i) => {
      const field = table.fields.find((f) => f.name === col);
      let cast = '';
      let transform = (val: string) => val; // Default transform

      if (field) {
        switch (field.dataType) {
          case 'GEOMETRY':
            // Transform input $N (jsonb) to Geometry
            // Use implicit jsonb cast or explicit if needed. Prisma usually sends objects as jsonb.
            // ST_GeomFromGeoJSON takes jsonb.
            return `${col} = ST_SetSRID(ST_GeomFromGeoJSON($${i + 1}::jsonb), ${
              (field as any).srid || 4326
            })`;
          case 'UUID':
            cast = '::uuid';
            break;
          case 'DATE':
            cast = '::date';
            break;
          case 'TIME':
            cast = '::time';
            break;
          case 'TIMESTAMP':
            cast = '::timestamp';
            break;
          case 'TIMESTAMPTZ':
            cast = '::timestamptz';
            break;
          case 'JSON':
          case 'JSONB':
          case 'IOT_SENSOR':
            cast = '::jsonb';
            break;
          case 'TAGS':
            cast = '::text[]';
            break;
          case 'INTEGER':
          case 'BIGINT':
            cast = '::integer';
            break;
          case 'BOOLEAN':
            cast = '::boolean';
            break;
        }
      }
      return `${col} = $${i + 1}${cast}`;
    })
    .join(', ');

  const sql = `
    UPDATE custom_${tableName}
    SET ${setClause}
    WHERE id = $${columns.length + 1}::uuid AND deleted_at IS NULL
    RETURNING ${returningSQL};
  `;

  const result = await prisma.$queryRawUnsafe(sql, ...values, id);
  const row = Array.isArray(result) && result.length > 0 ? result[0] : null;

  // LOG HISTORY
  if (row && previousData) {
    try {
      // Calculate changed fields with values
      const changedFields = columns
        .filter((col) => String(previousData[col]) !== String(data[col]))
        .map((col) => {
          const oldVal =
            previousData[col] === null || previousData[col] === undefined
              ? 'null'
              : String(previousData[col]);
          const newVal = data[col] === null || data[col] === undefined ? 'null' : String(data[col]);
          return `${col}: ${oldVal} -> ${newVal}`;
        });

      if (changedFields.length > 0) {
        await prisma.customDataHistory.create({
          data: {
            tableId: table.id,
            recordId: id,
            operation: 'UPDATE',
            performedBy: userId || 'SYSTEM',
            changedFields: changedFields,
            previousData: previousData as any,
          },
        });
      }
    } catch (err) {
      console.error('Failed to log update history', err);
    }
  }

  return row ? convertToGeoJSON(row, table.fields as any) : null;
}

/**
 * Soft delete data (sets deleted_at timestamp)
 */
export async function deleteData(tableName: string, id: string, userId?: string): Promise<void> {
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  // Get data before delete for history
  const previousData = await getDataById(tableName, id);

  const sql = `
    UPDATE custom_${tableName}
    SET deleted_at = NOW()
    WHERE id = $1::uuid AND deleted_at IS NULL;
  `;

  await prisma.$queryRawUnsafe(sql, id);

  // LOG HISTORY
  try {
    if (previousData) {
      await prisma.customDataHistory.create({
        data: {
          tableId: table.id,
          recordId: id,
          operation: 'DELETE',
          performedBy: userId || 'SYSTEM',
          changedFields: [],
          previousData: previousData as any,
        },
      });
    }
  } catch (err) {
    console.error('Failed to log delete history', err);
  }
}

/**
 * Hard delete data (permanently removes record)
 */
export async function hardDeleteData(tableName: string, id: string): Promise<void> {
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  const sql = `DELETE FROM custom_${tableName} WHERE id = $1::uuid;`;
  await prisma.$queryRawUnsafe(sql, id);
}

/**
 * Get history for a specific record
 */
export async function getRecordHistory(tableName: string, recordId: string): Promise<any[]> {
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  const sql = `
    SELECT * FROM custom_${tableName}_history
    WHERE record_id = $1
    ORDER BY changed_at DESC;
  `;

  const result = await prisma.$queryRawUnsafe(sql, recordId);
  return Array.isArray(result) ? result : [];
}

/**
 * Get record state at a specific point in time
 */
export async function getRecordAtTime(
  tableName: string,
  recordId: string,
  timestamp: Date
): Promise<any> {
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  const sql = `
    SELECT * FROM custom_${tableName}_history
    WHERE record_id = $1 AND changed_at <= $2
    ORDER BY changed_at DESC
    LIMIT 1;
  `;

  const result = await prisma.$queryRawUnsafe(sql, recordId, timestamp);
  return Array.isArray(result) && result.length > 0 ? result[0] : null;
}

/**
 * Get table statistics
 */
export async function getTableStats(tableName: string): Promise<{
  totalRecords: number;
  activeRecords: number;
  deletedRecords: number;
  lastUpdated: Date | null;
}> {
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  const sql = `
    SELECT
      COUNT(*) as total_records,
      COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_records,
      COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_records,
      MAX(updated_at) as last_updated
    FROM custom_${tableName};
  `;

  const result = await prisma.$queryRawUnsafe(sql);
  const stats = Array.isArray(result) && result.length > 0 ? result[0] : null;

  return {
    totalRecords: stats ? Number(stats.total_records) : 0,
    activeRecords: stats ? Number(stats.active_records) : 0,
    deletedRecords: stats ? Number(stats.deleted_records) : 0,
    lastUpdated: stats?.last_updated || null,
  };
}

/**
 * Query data as GeoJSON FeatureCollection
 */
export async function queryDataAsGeoJSON(
  tableName: string,
  geometryField: string,
  options: {
    filters?: Record<string, any>;
    properties?: string[];
  } = {}
): Promise<GeoJSON.FeatureCollection> {
  const { data } = await queryData(tableName, options);

  return rowsToFeatureCollection(data, geometryField, options.properties);
}

/**
 * Perform spatial query
 */
export async function spatialQuery(
  tableName: string,
  geometryColumn: string,
  queryType: 'within' | 'distance' | 'intersects',
  params: {
    geometry?: any;
    distance?: number;
    point?: any;
  }
): Promise<any[]> {
  const table = await getCustomTableByName(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" not found`);
  }

  // Build spatial query
  const { sql: spatialCondition, params: spatialParams } = buildSpatialQuery(
    `custom_${tableName}`, // Pass physical table name
    geometryColumn,
    queryType,
    params
  );

  // Build SELECT with geometry conversion
  const { columns: selectColumnList } = buildGeometrySelectSQL(table.fields as any);

  const selectColumns = new Set(selectColumnList);
  selectColumns.add('id');
  const selectClause = Array.from(selectColumns).join(', ');

  const sql = `
    SELECT ${selectClause} 
    FROM custom_${tableName}
    WHERE deleted_at IS NULL AND ${spatialCondition};
  `;

  const result = await prisma.$queryRawUnsafe(sql, ...spatialParams);
  const rows = Array.isArray(result) ? result : [];

  // Convert geometry columns to GeoJSON
  return rows.map((row) => convertToGeoJSON(row, table.fields as any));
}
