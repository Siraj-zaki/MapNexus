/**
 * Report Query Builder Service
 * Generates SQL queries for report widgets based on configuration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// TYPES
// ============================================================================

export type AggregationFn = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'between'
  | 'in'
  | 'isNull';
export type TimeInterval = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface Aggregation {
  function: AggregationFn;
  field: string;
  alias?: string;
}

export interface TimeGrouping {
  field: string;
  interval: TimeInterval;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryConfig {
  filters?: QueryFilter[];
  geofence?: GeoJSON.Polygon;
  aggregations?: Aggregation[];
  timeGroup?: TimeGrouping;
  groupBy?: string[];
  columns?: string[];
  orderBy?: SortConfig[];
  limit?: number;
  offset?: number;
}

export interface ChartConfig {
  chartType: 'LINE' | 'BAR' | 'PIE' | 'AREA' | 'SCATTER' | 'DONUT';
  xAxis: { field: string; interval?: TimeInterval };
  yAxis: Aggregation[];
  groupBy?: string;
}

export interface MapConfig {
  geometryField: string;
  labelField?: string;
  colorField?: string;
  filters?: QueryFilter[];
  geofence?: GeoJSON.Polygon;
}

export interface TableColumnConfig {
  field: string;
  header?: string;
  format?: string;
}

export interface KpiConfig {
  aggregation: Aggregation;
  filters?: QueryFilter[];
  format?: string;
  comparison?: {
    type: 'previous_period' | 'target';
    value?: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function escapeIdentifier(name: string): string {
  // Prevent SQL injection by only allowing alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `"${name}"`;
}

function buildWhereClause(
  filters: QueryFilter[],
  geofence?: GeoJSON.Polygon,
  geometryField?: string
): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const filter of filters) {
    const field = escapeIdentifier(filter.field);

    switch (filter.operator) {
      case 'eq':
        if (field === '"id"') {
          conditions.push(`${field} = $${paramIndex++}::uuid`);
        } else {
          conditions.push(`${field} = $${paramIndex++}`);
        }
        values.push(filter.value);
        break;
      case 'neq':
        conditions.push(`${field} != $${paramIndex++}`);
        values.push(filter.value);
        break;
      case 'gt':
        conditions.push(`${field} > $${paramIndex++}`);
        values.push(filter.value);
        break;
      case 'gte':
        conditions.push(`${field} >= $${paramIndex++}`);
        values.push(filter.value);
        break;
      case 'lt':
        conditions.push(`${field} < $${paramIndex++}`);
        values.push(filter.value);
        break;
      case 'lte':
        conditions.push(`${field} <= $${paramIndex++}`);
        values.push(filter.value);
        break;
      case 'contains':
        conditions.push(`${field} ILIKE $${paramIndex++}`);
        values.push(`%${filter.value}%`);
        break;
      case 'between':
        conditions.push(`${field} BETWEEN $${paramIndex++} AND $${paramIndex++}`);
        values.push(filter.value[0], filter.value[1]);
        break;
      case 'in':
        const placeholders = filter.value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${field} IN (${placeholders})`);
        values.push(...filter.value);
        break;
      case 'isNull':
        conditions.push(filter.value ? `${field} IS NULL` : `${field} IS NOT NULL`);
        break;
    }
  }

  // Geofence spatial filter
  if (geofence && geometryField) {
    const geofenceJson = JSON.stringify(geofence);
    conditions.push(
      `ST_Within(${escapeIdentifier(geometryField)}, ST_GeomFromGeoJSON($${paramIndex++}))`
    );
    values.push(geofenceJson);
  }

  // Always exclude soft-deleted records
  conditions.push(`"deleted_at" IS NULL`);

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

function buildAggregationSelect(aggregations: Aggregation[]): string {
  return aggregations
    .map((agg) => {
      const field = agg.field === '*' ? '*' : escapeIdentifier(agg.field);
      const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
      return `${agg.function}(${field}) AS "${alias}"`;
    })
    .join(', ');
}

function getTimeIntervalSQL(interval: TimeInterval): string {
  const mapping: Record<TimeInterval, string> = {
    minute: 'minute',
    hour: 'hour',
    day: 'day',
    week: 'week',
    month: 'month',
    quarter: 'quarter',
    year: 'year',
  };
  return mapping[interval];
}

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Build query for Chart widget (time-series or categorical)
 */
export async function buildChartQuery(
  tableName: string,
  config: ChartConfig,
  filters: QueryFilter[] = []
): Promise<{ data: any[] }> {
  const fullTableName = tableName.startsWith('custom_') ? tableName : `custom_${tableName}`;
  const { xAxis, yAxis, groupBy } = config;

  // Build SELECT clause
  let selectDbField = '';
  let groupByDbField = '';

  // Determine X-Axis (Dimension)
  if (xAxis.interval) {
    // Time-series
    selectDbField = `date_trunc('${getTimeIntervalSQL(xAxis.interval)}', ${escapeIdentifier(
      xAxis.field
    )}) AS time_bucket`;
    groupByDbField = 'time_bucket';
  } else {
    // Categorical
    selectDbField = `${escapeIdentifier(xAxis.field)} AS category`;
    groupByDbField = 'category';
  }

  const aggSelect = buildAggregationSelect(yAxis);

  let selectClause = `${selectDbField}, ${aggSelect}`;
  let groupByClause = `GROUP BY ${groupByDbField}`;
  let orderByClause = `ORDER BY ${groupByDbField} ASC`;

  // Secondary Grouping (Series)
  if (groupBy) {
    selectClause += `, ${escapeIdentifier(groupBy)} AS series`;
    groupByClause += `, ${escapeIdentifier(groupBy)}`;
  }

  // Build WHERE clause
  const where = buildWhereClause(filters);

  const sql = `
    SELECT ${selectClause}
    FROM ${escapeIdentifier(fullTableName)}
    ${where.sql}
    ${groupByClause}
    ${orderByClause}
  `;

  try {
    const data = await prisma.$queryRawUnsafe(sql, ...where.values);

    // Normalize data structure for frontend (convert BigInt to Number if needed)
    return {
      data: (data as any[]).map((row) => {
        const newRow: any = { ...row };
        // Convert aggregations to numbers
        yAxis.forEach((agg) => {
          const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
          if (newRow[alias] !== undefined) newRow[alias] = Number(newRow[alias]);
        });
        return newRow;
      }),
    };
  } catch (err: any) {
    console.error('SQL Error in buildChartQuery:', err, sql);
    throw err;
  }
}

/**
 * Build query for Map widget (GeoJSON FeatureCollection)
 */
export async function buildMapQuery(
  tableName: string,
  config: MapConfig & { timeField?: string },
  filters: QueryFilter[] = []
): Promise<{ type: string; features: any[] }> {
  const fullTableName = tableName.startsWith('custom_') ? tableName : `custom_${tableName}`;
  const { geometryField, labelField, colorField, timeField, geofence } = config;

  // Build WHERE clause with geofence
  const allFilters = [...filters, ...(config.filters || [])];
  const where = buildWhereClause(allFilters, geofence, geometryField);

  // Select properties for the feature
  const properties = ['id'];
  if (labelField) properties.push(labelField);
  if (colorField) properties.push(colorField);
  if (timeField) properties.push(timeField);

  const propertiesSelect = properties.map((p) => `'${p}', ${escapeIdentifier(p)}`).join(', ');

  const sql = `
    SELECT json_build_object(
      'type', 'Feature',
      'id', id,
      'geometry', ST_AsGeoJSON(${escapeIdentifier(geometryField)})::json,
      'properties', json_build_object(${propertiesSelect})
    ) AS feature
    FROM ${escapeIdentifier(fullTableName)}
    ${where.sql}
  `;

  const result = await prisma.$queryRawUnsafe(sql, ...where.values);
  const features = (result as any[]).map((row) => row.feature);

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Build query for Table widget (paginated data with columns)
 */
export async function buildTableQuery(
  tableName: string,
  config: QueryConfig
): Promise<{ data: any[]; total: number }> {
  const fullTableName = tableName.startsWith('custom_') ? tableName : `custom_${tableName}`;
  const { columns, filters = [], orderBy, limit = 100, offset = 0 } = config;

  // Build SELECT clause
  let selectFields = columns && columns.length > 0 ? [...columns] : [];

  // Ensure 'id' is always included for data manipulation/identification
  if (selectFields.length > 0 && !selectFields.includes('id')) {
    selectFields = ['id', ...selectFields];
  }

  const selectClause =
    selectFields.length > 0 ? selectFields.map(escapeIdentifier).join(', ') : '*';

  // Build WHERE clause
  const where = buildWhereClause(filters);

  // Build ORDER BY clause
  let orderByClause = '';
  if (orderBy && orderBy.length > 0) {
    const orderParts = orderBy.map(
      (o) => `${escapeIdentifier(o.field)} ${o.direction.toUpperCase()}`
    );
    orderByClause = `ORDER BY ${orderParts.join(', ')}`;
  }

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM ${escapeIdentifier(fullTableName)} ${where.sql}`;
  const countResult = await prisma.$queryRawUnsafe(countSql, ...where.values);
  const total = Number((countResult as any[])[0]?.total) || 0;

  // Get data
  const sql = `
    SELECT ${selectClause}
    FROM ${escapeIdentifier(fullTableName)}
    ${where.sql}
    ${orderByClause}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const data = await prisma.$queryRawUnsafe(sql, ...where.values);

  return { data: data as any[], total };
}

/**
 * Build query for KPI widget (single aggregation value)
 */
export async function buildKpiQuery(
  tableName: string,
  config: KpiConfig
): Promise<{
  value: number;
  comparison?: { value: number; change: number; changePercent: number };
}> {
  const fullTableName = tableName.startsWith('custom_') ? tableName : `custom_${tableName}`;
  const { aggregation, filters = [] } = config;

  // Build WHERE clause
  const where = buildWhereClause(filters);

  // Build aggregation
  const aggSelect = buildAggregationSelect([aggregation]);

  const sql = `
    SELECT ${aggSelect}
    FROM ${escapeIdentifier(fullTableName)}
    ${where.sql}
  `;

  const result = await prisma.$queryRawUnsafe(sql, ...where.values);
  const value =
    Number(
      (result as any[])[0]?.[
        aggregation.alias || `${aggregation.function.toLowerCase()}_${aggregation.field}`
      ]
    ) || 0;

  // Handle comparison if configured
  let comparison;
  if (config.comparison?.type === 'target' && config.comparison.value !== undefined) {
    const target = config.comparison.value;
    comparison = {
      value: target,
      change: value - target,
      changePercent: target !== 0 ? ((value - target) / target) * 100 : 0,
    };
  }

  return { value, comparison };
}

/**
 * Build query for History Log (Audit Trail)
 */
export async function buildHistoryQuery(
  tableName: string,
  config: QueryConfig
): Promise<{ data: any[]; total: number }> {
  // 1. Get Table ID
  const table = await prisma.customTable.findUnique({
    where: { name: tableName },
    select: { id: true },
  });

  if (!table) {
    throw new Error(`Table ${tableName} not found`);
  }

  const { limit = 100, offset = 0, filters = [] } = config;

  // 2. Build WHERE clause
  // We can reuse buildWhereClause if we map filters, but history has specific fields
  // For now, simpler manual construction or reuse if compatible.
  // The generic buildWhereClause targets the custom table itself, not the history table.
  // So we build a specific simple one here or just support basic filtering.

  const where: any = { tableId: table.id };

  // 3. Get total count
  const total = await prisma.customDataHistory.count({ where });

  // 4. Fetch History
  const history = await prisma.customDataHistory.findMany({
    where,
    orderBy: { performedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return { data: history, total };
}

/**
 * Get widget data based on type and configuration
 */
export async function getWidgetData(widget: {
  type: string;
  dataSource: string | null;
  queryConfig: any;
  chartConfig?: any;
  mapConfig?: any;
  tableConfig?: any;
  kpiConfig?: any;
  historicalConfig?: any; // Added for widget support if needed
}): Promise<any> {
  if (!widget.dataSource) {
    return null; // TEXT or IMAGE widgets don't need data
  }

  const queryConfig = widget.queryConfig || {};
  const filters = queryConfig.filters || [];

  switch (widget.type) {
    case 'CHART':
      return buildChartQuery(widget.dataSource, widget.chartConfig, filters);

    case 'MAP':
      return buildMapQuery(widget.dataSource, widget.mapConfig, filters);

    case 'TABLE':
      return buildTableQuery(widget.dataSource, {
        ...queryConfig,
        columns: widget.tableConfig?.columns,
      });

    case 'KPI_CARD':
      return buildKpiQuery(widget.dataSource, {
        ...widget.kpiConfig,
        filters,
      });

    case 'HISTORICAL': // Support widget type too if needed
      return buildHistoryQuery(widget.dataSource, queryConfig);

    default:
      return null;
  }
}

/**
 * Get data for all widgets in a report template
 */
/**
 * Get data for all widgets in a report template
 */
export async function getReportData(
  templateId: string,
  overrideConfig?: any
): Promise<Map<string, any>> {
  const template = await prisma.reportTemplate.findUnique({
    where: { id: templateId },
    include: { widgets: true },
  });

  if (!template) {
    throw new Error(`Report template ${templateId} not found`);
  }

  // Handle Config-based reports (Simple/Custom Flow)
  if (template.config && template.type !== 'WIDGET') {
    // Merge database config with override config (e.g. for pagination/filtering)
    const baseConfig = template.config as any;
    const config = overrideConfig ? { ...baseConfig, ...overrideConfig } : baseConfig;

    const results = new Map<string, any>();

    try {
      let data;
      switch (template.type) {
        case 'DETAIL':
        case 'EDITABLE': // Editable acts like table for reading
          data = await buildTableQuery(config.dataSource, {
            filters: config.filters || [],
            columns: config.columns || [],
            orderBy: config.sortBy || [],
            limit: config.pageSize || 100,
            offset: config.offset || 0,
          });
          break;

        case 'MAP':
          // Support multiple layers (Modern Config)
          if (config.layers && Array.isArray(config.layers)) {
            const allFeatures: any[] = [];
            for (const layer of config.layers) {
              const layerData = await buildMapQuery(layer.dataSource, {
                geometryField: layer.geometryField,
                labelField: layer.titleField, // Map titleField to labelField logic
                colorField: layer.colorField, // Potentially unused if simple marker color, but kept for data
                filters: layer.filters,
              });
              // Enhance features with layer-specific properties if needed (e.g. style info)
              const layerFeatures = layerData.features.map((f: any) => ({
                ...f,
                properties: {
                  ...f.properties,
                  _layerId: layer.id,
                  _markerColor: layer.markerColor,
                  _markerStyle: layer.markerStyle,
                  _markerIcon: layer.markerIcon,
                },
              }));
              allFeatures.push(...layerFeatures);
            }
            data = {
              type: 'FeatureCollection',
              features: allFeatures,
            };
          } else {
            // Legacy single-source config
            data = await buildMapQuery(config.dataSource, {
              geometryField: config.geometryField,
              labelField: config.labelField,
              colorField: config.colorField,
              filters: config.filters,
            });
          }
          break;

        case 'HISTORICAL':
          // Fetch history log instead of chart data
          data = await buildHistoryQuery(config.dataSource, {
            limit: config.pageSize || 100,
            offset: config.offset || 0,
            filters: config.filters,
          });
          break;

        case 'SUMMARY':
          // Determine grouping
          const summaryGroupBy = config.groupBy?.[0]; // Primary group
          const xAxisConfig = summaryGroupBy
            ? { field: summaryGroupBy } // Categorical
            : { field: 'id' }; // Fallback

          data = await buildChartQuery(config.dataSource, {
            chartType: config.chartType || 'BAR',
            xAxis: xAxisConfig,
            // Map aggregations to yAxis format
            yAxis: config.aggregations.map((agg: any) => ({
              function: agg.function,
              field: agg.field,
              alias: agg.label,
            })),
          });
          break;

        case 'SCRIPT':
          // Execute raw SQL script
          // SECURITY WARNING: This allows executing arbitrary SQL.
          // In production, this should be strictly restricted to READ-ONLY users or sandboxed.
          // For this MVP, we execute as provided.
          if (!config.query) throw new Error('No query provided for script report');

          // Simple protection against destructive commands logic could go here
          // e.g. if (!config.query.trim().toLowerCase().startsWith('select')) ...

          const scriptData = await prisma.$queryRawUnsafe(config.query);
          // Return simple array or wrapped object
          data = {
            data: scriptData,
            rowCount: Array.isArray(scriptData) ? scriptData.length : 0,
          };
          break;

        default:
          data = { message: `Report type ${template.type} runner not implemented` };
      }

      results.set('main', { success: true, data });
      return results;
    } catch (error: any) {
      console.error(`Error executing report ${template.type}:`, error);
      results.set('error', { success: false, error: error.message });
      return results;
    }
  }

  // Fallback to Widget-based reports
  const results = new Map<string, any>();

  for (const widget of template.widgets) {
    try {
      const data = await getWidgetData({
        type: widget.type,
        dataSource: widget.dataSource,
        queryConfig: widget.queryConfig,
        chartConfig: widget.chartConfig as any,
        mapConfig: widget.mapConfig as any,
        tableConfig: widget.tableConfig as any,
        kpiConfig: widget.kpiConfig as any,
        historicalConfig: widget.type === 'HISTORICAL' ? {} : undefined,
      });
      results.set(widget.id, { success: true, data });
    } catch (error: any) {
      results.set(widget.id, { success: false, error: error.message });
    }
  }

  return results;
}

export default {
  buildChartQuery,
  buildMapQuery,
  buildTableQuery,
  buildKpiQuery,
  buildHistoryQuery,
  getWidgetData,
  getReportData,
};
