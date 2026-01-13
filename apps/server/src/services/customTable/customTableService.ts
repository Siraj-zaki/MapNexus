/**
 * Custom Table Service
 * Handles creation and management of dynamic custom tables
 */

import { PrismaClient } from '@prisma/client';
import { getPostgreSQLType, isGeometryType } from './dataTypes.js';
import { generateGeometryColumnsSQL, generateSpatialIndexesSQL } from './postgisHelpers.js';
import { CustomFieldDefinition, CustomTableDefinition, CustomTableWithFields } from './types.js';
import { validateGeometryField, validateIoTField } from './validators.js';

const prisma = new PrismaClient();

/**
 * Validates table definition
 */
export function validateTableDefinition(definition: CustomTableDefinition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate table name
  if (!definition.name || !/^[a-z][a-z0-9_]*$/.test(definition.name)) {
    errors.push(
      'Table name must start with a letter and contain only lowercase letters, numbers, and underscores'
    );
  }

  // Validate display name
  if (!definition.displayName || definition.displayName.trim().length === 0) {
    errors.push('Display name is required');
  }

  // Validate fields
  if (!definition.fields || definition.fields.length === 0) {
    errors.push('At least one field is required');
  }

  // Always add id field
  const hasIdField = definition.fields.some((f) => f.name === 'id');

  // Validate each field
  definition.fields.forEach((field, index) => {
    if (!field.name || !/^[a-z][a-z0-9_]*$/.test(field.name)) {
      errors.push(
        `Field ${
          index + 1
        }: name must start with a letter and contain only lowercase letters, numbers, and underscores`
      );
    }

    if (!field.displayName || field.displayName.trim().length === 0) {
      errors.push(`Field ${index + 1}: display name is required`);
    }

    if (!field.dataType) {
      errors.push(`Field ${index + 1}: data type is required`);
    }

    // Validate VARCHAR/CHAR requires maxLength
    if (['VARCHAR', 'CHAR'].includes(field.dataType.toUpperCase()) && !field.maxLength) {
      errors.push(`Field ${field.name}: ${field.dataType} requires maxLength`);
    }

    // Validate DECIMAL requires precision
    if (['DECIMAL', 'NUMERIC'].includes(field.dataType.toUpperCase()) && !field.precision) {
      errors.push(`Field ${field.name}: ${field.dataType} requires precision`);
    }

    // Validate relations have required fields
    if (field.relationTable && !field.relationField) {
      errors.push(`Field ${field.name}: relation requires relationField`);
    }

    // Validate PostGIS geometry fields
    const geometryErrors = validateGeometryField(field);
    errors.push(...geometryErrors);

    // Validate IoT fields
    const iotErrors = validateIoTField(field);
    errors.push(...iotErrors);

    // Validate SELECT fields
    if (field.dataType === 'SELECT') {
      if (
        !field.validation?.options ||
        !Array.isArray(field.validation.options) ||
        field.validation.options.length === 0
      ) {
        errors.push(`Field ${field.name}: SELECT requires validation.options`);
      }
    }

    // Validate RELATION fields
    if (field.dataType === 'RELATION') {
      if (!field.relationTable) {
        errors.push(`Field ${field.name}: RELATION requires relationTable`);
      }
      // relationField is usually 'id' implicitly if not set, but let's enforce or default it?
      // The Type definition says relationField is optional, but for clarity let's check it if needed.
    }
  });

  // Check for duplicate field names
  const fieldNames = definition.fields.map((f) => f.name);
  const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate field names: ${duplicates.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates SQL data type from field definition
 */
function generateSQLDataType(field: CustomFieldDefinition): string {
  return getPostgreSQLType(field.dataType, {
    maxLength: field.maxLength,
    precision: field.precision,
    scale: field.scale,
  });
}

/**
 * Generates CREATE TABLE SQL statement
 */
export function generateCreateTableSQL(definition: CustomTableDefinition): string {
  const columns: string[] = [];

  // Always add id as primary key
  columns.push('id UUID PRIMARY KEY DEFAULT uuid_generate_v4()');

  // Add custom fields (excluding geometry fields - they are added via AddGeometryColumn)
  definition.fields.forEach((field) => {
    // Skip geometry fields - they will be added separately using PostGIS AddGeometryColumn
    if (isGeometryType(field.dataType)) {
      return;
    }

    let columnDef = `${field.name} ${generateSQLDataType(field)}`;

    if (field.isRequired) {
      columnDef += ' NOT NULL';
    }

    if (field.isUnique) {
      columnDef += ' UNIQUE';
    }

    if (field.defaultValue) {
      const isNumericOrBoolean = [
        'INTEGER',
        'DECIMAL',
        'NUMERIC',
        'FLOAT',
        'DOUBLE',
        'BOOLEAN',
      ].some((t) => field.dataType.toUpperCase().includes(t));

      if (isNumericOrBoolean) {
        columnDef += ` DEFAULT ${field.defaultValue}`;
      } else {
        // Wrap in quotes if not already quoted
        const val = field.defaultValue.toString();
        const quoted = val.startsWith("'") && val.endsWith("'") ? val : `'${val}'`;
        columnDef += ` DEFAULT ${quoted}`;
      }
    }

    // Add foreign key constraint if relation
    if (field.relationTable && field.relationField) {
      columnDef += ` REFERENCES ${field.relationTable}(${field.relationField})`;
      if (field.onDelete) {
        columnDef += ` ON DELETE ${field.onDelete}`;
      }
    }

    columns.push(columnDef);
  });

  // Add audit fields
  columns.push('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  columns.push('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  columns.push('deleted_at TIMESTAMPTZ');

  // Enforce custom_ prefix for physical tables
  const physicalTableName = `custom_${definition.name}`;
  const sql = `CREATE TABLE IF NOT EXISTS ${physicalTableName} (\n  ${columns.join(',\n  ')}\n);`;

  return sql;
}

/**
 * Generates CREATE TABLE SQL for history table
 */
export function generateHistoryTableSQL(
  tableName: string,
  definition: CustomTableDefinition
): string {
  const columns: string[] = [];

  columns.push('history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4()');
  columns.push('record_id UUID NOT NULL');
  columns.push('operation VARCHAR(10) NOT NULL'); // INSERT, UPDATE, DELETE

  // Add all fields from main table (excluding geometry - handled separately)
  columns.push('id UUID');
  definition.fields.forEach((field) => {
    // Skip geometry fields in history table CREATE - will be added via AddGeometryColumn
    if (!isGeometryType(field.dataType)) {
      columns.push(`${field.name} ${generateSQLDataType(field)}`);
    }
  });

  columns.push('created_at TIMESTAMPTZ');
  columns.push('updated_at TIMESTAMPTZ');
  columns.push('deleted_at TIMESTAMPTZ');

  // Audit fields
  columns.push('changed_by VARCHAR(255)');
  columns.push('changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');

  // Enforce custom_ prefix
  const physicalTableName = `custom_${tableName}`;
  const sql = `CREATE TABLE IF NOT EXISTS ${physicalTableName}_history (\n  ${columns.join(
    ',\n  '
  )}\n);`;

  return sql;
}

/**
 * Generates trigger function for automatic history tracking
 */
export function generateHistoryTriggerSQL(
  tableName: string,
  fields: CustomFieldDefinition[]
): string[] {
  // Build the list of all columns to copy
  const allColumns = ['id', ...fields.map((f) => f.name), 'created_at', 'updated_at', 'deleted_at'];
  const columnsList = allColumns.join(', ');

  const physicalTableName = `custom_${tableName}`;

  const functionSQL = `
CREATE OR REPLACE FUNCTION ${physicalTableName}_history_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO ${physicalTableName}_history (record_id, operation, ${columnsList}, changed_by)
    SELECT OLD.id, 'DELETE', ${allColumns.map((c) => `OLD.${c}`).join(', ')}, current_user;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO ${physicalTableName}_history (record_id, operation, ${columnsList}, changed_by)
    SELECT NEW.id, 'UPDATE', ${allColumns.map((c) => `NEW.${c}`).join(', ')}, current_user;
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO ${physicalTableName}_history (record_id, operation, ${columnsList}, changed_by)
    SELECT NEW.id, 'INSERT', ${allColumns.map((c) => `NEW.${c}`).join(', ')}, current_user;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
`;

  const triggerSQL = `
CREATE TRIGGER ${physicalTableName}_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON ${physicalTableName}
FOR EACH ROW EXECUTE FUNCTION ${physicalTableName}_history_trigger();
`;

  return [functionSQL, triggerSQL];
}

/**
 * Generate indexes for timeseries fields
 */
export function generateIndexesSQL(tableName: string, fields: CustomFieldDefinition[]): string {
  const indexes: string[] = [];
  const physicalTableName = `custom_${tableName}`;

  fields.forEach((field) => {
    if (field.isTimeseries) {
      indexes.push(
        `CREATE INDEX IF NOT EXISTS idx_${physicalTableName}_${field.name} ON ${physicalTableName}(${field.name} DESC);`
      );
    }
  });

  return indexes.join('\n');
}

/**
 * Creates a custom table with history tracking
 */
export async function createCustomTable(
  definition: CustomTableDefinition,
  userId: string
): Promise<CustomTableWithFields> {
  // Validate definition
  const validation = validateTableDefinition(definition);
  if (!validation.valid) {
    throw new Error(`Invalid table definition: ${validation.errors.join(', ')}`);
  }

  // Check if table already exists
  const existing = await prisma.customTable.findUnique({
    where: { name: definition.name },
  });

  if (existing) {
    throw new Error(`Table with name "${definition.name}" already exists`);
  }

  // Generate SQL statements
  const createTableSQL = generateCreateTableSQL(definition);
  const historyTableSQL = generateHistoryTableSQL(definition.name, definition);
  const historyTriggerSQLs = generateHistoryTriggerSQL(definition.name, definition.fields);
  const indexesSQL = generateIndexesSQL(definition.name, definition.fields);

  // Generate PostGIS-specific SQL
  const physicalTableName = `custom_${definition.name}`;
  const geometryColumnsSQL = generateGeometryColumnsSQL(physicalTableName, definition.fields);
  const spatialIndexesSQL = generateSpatialIndexesSQL(physicalTableName, definition.fields);
  const historyGeometryColumnsSQL = generateGeometryColumnsSQL(
    `${physicalTableName}_history`,
    definition.fields
  );

  try {
    // Execute SQL to create main table
    await prisma.$executeRawUnsafe(createTableSQL);

    // Add PostGIS geometry columns to main table
    for (const sql of geometryColumnsSQL) {
      await prisma.$executeRawUnsafe(sql);
    }

    // Create history table
    await prisma.$executeRawUnsafe(historyTableSQL);

    // Add PostGIS geometry columns to history table
    for (const sql of historyGeometryColumnsSQL) {
      await prisma.$executeRawUnsafe(sql);
    }

    // Create history trigger
    for (const sql of historyTriggerSQLs) {
      await prisma.$executeRawUnsafe(sql);
    }

    // Create timeseries indexes
    if (indexesSQL) {
      await prisma.$executeRawUnsafe(indexesSQL);
    }

    // Create spatial indexes
    for (const sql of spatialIndexesSQL) {
      await prisma.$executeRawUnsafe(sql);
    }

    // Create metadata records
    const customTable = await prisma.customTable.create({
      data: {
        name: definition.name,
        displayName: definition.displayName,
        description: definition.description,
        icon: definition.icon,
        createdBy: userId,
        fields: {
          create: definition.fields.map((field, index) => ({
            name: field.name,
            displayName: field.displayName,
            description: field.description,
            dataType: field.dataType,
            isRequired: field.isRequired || false,
            isUnique: field.isUnique || false,
            isTimeseries: field.isTimeseries || false,
            defaultValue: field.defaultValue,
            maxLength: field.maxLength,
            precision: field.precision,
            scale: field.scale,
            srid: field.srid,
            geometryType: field.geometryType,
            iotConfig: field.iotConfig as any,
            relationTable: field.relationTable,
            relationField: field.relationField,
            onDelete: field.onDelete,
            validation: field.validation as any,
            order: field.order || index,
          })),
        },
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return customTable as CustomTableWithFields;
  } catch (error) {
    // Rollback: try to drop tables if metadata creation failed
    try {
      const physicalTableName = `custom_${definition.name}`;
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${physicalTableName}_history CASCADE;`);
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${physicalTableName} CASCADE;`);
    } catch (rollbackError) {
      // Ignore rollback errors
    }

    throw error;
  }
}

/**
 * Get all custom tables
 */
export async function getCustomTables(): Promise<CustomTableWithFields[]> {
  const tables = await prisma.customTable.findMany({
    where: { isActive: true },
    include: {
      fields: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tables as CustomTableWithFields[];
}

/**
 * Get custom table by ID
 */
export async function getCustomTableById(id: string): Promise<CustomTableWithFields | null> {
  const table = await prisma.customTable.findUnique({
    where: { id },
    include: {
      fields: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return table as CustomTableWithFields | null;
}

/**
 * Get custom table by name
 */
export async function getCustomTableByName(name: string): Promise<CustomTableWithFields | null> {
  const table = await prisma.customTable.findUnique({
    where: { name },
    include: {
      fields: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return table as CustomTableWithFields | null;
}

/**
 * Delete custom table
 */
export async function deleteCustomTable(id: string): Promise<void> {
  const table = await prisma.customTable.findUnique({
    where: { id },
  });

  if (!table) {
    throw new Error('Table not found');
  }

  try {
    // Drop database tables
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${table.name}_history CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${table.name} CASCADE;`);

    // Delete metadata
    await prisma.customTable.delete({
      where: { id },
    });
  } catch (error) {
    throw new Error(
      `Failed to delete table: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Add field to existing table
 */
export async function addFieldToTable(
  tableId: string,
  field: CustomFieldDefinition
): Promise<void> {
  const table = await prisma.customTable.findUnique({
    where: { id: tableId },
    include: { fields: true },
  });

  if (!table) {
    throw new Error('Table not found');
  }

  // Validate field name is unique
  if (table.fields.some((f) => f.name === field.name)) {
    throw new Error(`Field "${field.name}" already exists in table`);
  }

  const columnDef = `${field.name} ${generateSQLDataType(field)}`;
  const alterSQL = `ALTER TABLE ${table.name} ADD COLUMN ${columnDef};`;

  try {
    // Add column to main table
    await prisma.$executeRawUnsafe(alterSQL);

    // Add column to history table
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table.name}_history ADD COLUMN ${columnDef};`);

    // Create field metadata
    const maxOrder = Math.max(...table.fields.map((f) => f.order), 0);
    await prisma.customField.create({
      data: {
        tableId,
        name: field.name,
        displayName: field.displayName,
        description: field.description,
        dataType: field.dataType,
        isRequired: field.isRequired || false,
        isUnique: field.isUnique || false,
        isTimeseries: field.isTimeseries || false,
        defaultValue: field.defaultValue,
        maxLength: field.maxLength,
        precision: field.precision,
        scale: field.scale,
        relationTable: field.relationTable,
        relationField: field.relationField,
        onDelete: field.onDelete,
        validation: field.validation as any,
        order: field.order || maxOrder + 1,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to add field: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
