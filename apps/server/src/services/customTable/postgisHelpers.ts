/**
 * PostGIS Helper Functions
 * Utilities for creating and managing PostGIS geometry columns
 */

import { getGeometryType, isGeometryType } from './dataTypes.js';
import { CustomFieldDefinition } from './types.js';

/**
 * Generate SQL statements to add PostGIS geometry columns using AddGeometryColumn
 */
export function generateGeometryColumnsSQL(
  tableName: string,
  fields: CustomFieldDefinition[]
): string[] {
  const statements: string[] = [];

  fields.forEach((field) => {
    if (isGeometryType(field.dataType)) {
      const geometryType = getGeometryType(field.dataType);
      const srid = field.srid || 4326;

      if (!geometryType) {
        throw new Error(`Invalid geometry type for field ${field.name}`);
      }

      // Use PostGIS's AddGeometryColumn function
      // Syntax: AddGeometryColumn(schema, table, column, srid, type, dimension)
      statements.push(`
        SELECT AddGeometryColumn('public', '${tableName}', '${field.name}', ${srid}, '${geometryType}', 2);
      `);

      // If field is required, add NOT NULL constraint after creating the column
      if (field.isRequired) {
        statements.push(`
          ALTER TABLE "${tableName}" ALTER COLUMN "${field.name}" SET NOT NULL;
        `);
      }
    }
  });

  return statements;
}

/**
 * Generate SQL statements to create spatial indexes (GIST indexes)
 */
export function generateSpatialIndexesSQL(
  tableName: string,
  fields: CustomFieldDefinition[]
): string[] {
  const statements: string[] = [];

  fields.forEach((field) => {
    if (isGeometryType(field.dataType)) {
      statements.push(`
        CREATE INDEX idx_${tableName}_${field.name}_gist 
        ON "${tableName}" USING GIST ("${field.name}");
      `);
    }
  });

  return statements;
}
