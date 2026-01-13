/**
 * Validation utilities for custom table fields
 */

import { GEOMETRY_TYPE_MAP, isGeometryType, isIoTType, isValidSRID } from './dataTypes.js';
import { CustomFieldDefinition } from './types.js';

/**
 * Validate a geometry field definition
 */
export function validateGeometryField(field: CustomFieldDefinition): string[] {
  const errors: string[] = [];

  if (!isGeometryType(field.dataType)) {
    return errors; // Not a geometry field, skip validation
  }

  // Check if geometry type is provided
  if (!field.geometryType) {
    errors.push(`Geometry field "${field.name}" must have a geometryType specified`);
  } else if (!GEOMETRY_TYPE_MAP[field.dataType]) {
    errors.push(`Invalid geometry type "${field.geometryType}" for field "${field.name}"`);
  }

  // Validate SRID
  if (field.srid !== undefined && !isValidSRID(field.srid)) {
    errors.push(`Invalid SRID "${field.srid}" for geometry field "${field.name}"`);
  }

  return errors;
}

/**
 * Validate an IoT field definition
 */
export function validateIoTField(field: CustomFieldDefinition): string[] {
  const errors: string[] = [];

  if (!isIoTType(field.dataType)) {
    return errors; // Not an IoT field, skip validation
  }

  // IoT fields should have JSONB as the underlying type
  // Configuration is optional but if provided, validate it
  if (field.iotConfig) {
    if (field.iotConfig.minValue !== undefined && field.iotConfig.maxValue !== undefined) {
      if (field.iotConfig.minValue >= field.iotConfig.maxValue) {
        errors.push(`IoT field "${field.name}": minValue must be less than maxValue`);
      }
    }
  }

  return errors;
}

/**
 * Validate a field value against its definition
 */
export function validateFieldValue(value: any, field: CustomFieldDefinition): string[] {
  const errors: string[] = [];

  // Check required fields
  if (field.isRequired && (value === undefined || value === null || value === '')) {
    errors.push(`Field "${field.displayName}" is required`);
    return errors;
  }

  // Skip validation if value is null/undefined and field is not required
  if (value === undefined || value === null) {
    return errors;
  }

  // Validate based on data type
  switch (field.dataType) {
    case 'INTEGER':
    case 'BIGINT':
      if (!Number.isInteger(Number(value))) {
        errors.push(`Field "${field.displayName}" must be an integer`);
      }
      break;

    case 'DECIMAL':
    case 'NUMERIC':
    case 'FLOAT':
    case 'DOUBLE PRECISION':
      if (isNaN(Number(value))) {
        errors.push(`Field "${field.displayName}" must be a number`);
      }
      break;

    case 'BOOLEAN':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        errors.push(`Field "${field.displayName}" must be a boolean`);
      }
      break;

    case 'UUID':
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(value))) {
        errors.push(`Field "${field.displayName}" must be a valid UUID`);
      }
      break;
  }

  // Validate custom validation rules
  if (field.validation) {
    if (field.validation.min !== undefined && Number(value) < field.validation.min) {
      errors.push(`Field "${field.displayName}" must be at least ${field.validation.min}`);
    }
    if (field.validation.max !== undefined && Number(value) > field.validation.max) {
      errors.push(`Field "${field.displayName}" must be at most ${field.validation.max}`);
    }
    if (field.validation.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(String(value))) {
        errors.push(`Field "${field.displayName}" does not match the required pattern`);
      }
    }
  }

  return errors;
}

/**
 * Sanitize table name to prevent SQL injection
 * Adds tenant prefix and ensures safe characters
 */
export function sanitizeTableName(name: string, tenantId?: string): string {
  // Remove any dangerous characters
  let sanitized = name.replace(/[^a-z0-9_]/gi, '');

  // Ensure it starts with a letter
  if (!/^[a-z]/i.test(sanitized)) {
    sanitized = 't_' + sanitized;
  }

  // Add tenant prefix if provided
  if (tenantId) {
    const safeTenantId = tenantId.replace(/[^a-z0-9]/gi, '');
    sanitized = `t_${safeTenantId}_${sanitized}`;
  }

  // Convert to lowercase
  return sanitized.toLowerCase();
}

/**
 * Sanitize column name to prevent SQL injection
 */
export function sanitizeColumnName(name: string): string {
  // Remove any dangerous characters
  let sanitized = name.replace(/[^a-z0-9_]/gi, '');

  // Ensure it starts with a letter
  if (!/^[a-z]/i.test(sanitized)) {
    sanitized = 'c_' + sanitized;
  }

  return sanitized.toLowerCase();
}

/**
 * Validate GeoJSON structure
 */
export function validateGeoJSON(geojson: any, expectedType?: string): string[] {
  const errors: string[] = [];

  if (!geojson || typeof geojson !== 'object') {
    errors.push('Invalid GeoJSON: must be an object');
    return errors;
  }

  if (!geojson.type) {
    errors.push('Invalid GeoJSON: missing type property');
  }

  if (!geojson.coordinates) {
    errors.push('Invalid GeoJSON: missing coordinates property');
  }

  if (expectedType && geojson.type.toLowerCase() !== expectedType.toLowerCase()) {
    errors.push(`Invalid GeoJSON: expected type ${expectedType}, got ${geojson.type}`);
  }

  // Validate coordinates based on type
  if (geojson.type === 'Point') {
    if (!Array.isArray(geojson.coordinates) || geojson.coordinates.length !== 2) {
      errors.push('Invalid Point GeoJSON: coordinates must be [longitude, latitude]');
    }
  } else if (geojson.type === 'Polygon') {
    if (!Array.isArray(geojson.coordinates) || geojson.coordinates.length === 0) {
      errors.push('Invalid Polygon GeoJSON: coordinates must be an array of linear rings');
    } else {
      // Check if first and last coordinates are the same (closed ring)
      const firstRing = geojson.coordinates[0];
      if (Array.isArray(firstRing) && firstRing.length > 0) {
        const first = firstRing[0];
        const last = firstRing[firstRing.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          errors.push(
            'Invalid Polygon GeoJSON: linear ring must be closed (first and last coordinates must match)'
          );
        }
      }
    }
  } else if (geojson.type === 'LineString') {
    if (!Array.isArray(geojson.coordinates) || geojson.coordinates.length < 2) {
      errors.push('Invalid LineString GeoJSON: must have at least 2 coordinates');
    }
  }

  return errors;
}

/**
 * Check if a string is safe for SQL execution (basic check)
 */
export function isSafeSQLIdentifier(identifier: string): boolean {
  // Only allow alphanumeric and underscore
  return /^[a-z][a-z0-9_]*$/i.test(identifier);
}

/**
 * Validate SQL value to prevent injection
 * Returns escaped value or throws error
 */
export function validateSQLValue(value: any): boolean {
  // This is a basic check - Prisma's parameterized queries provide the real protection
  if (typeof value === 'string') {
    // Check for potential SQL injection patterns
    const dangerousPatterns = [
      /;.*--/,
      /union.*select/i,
      /drop.*table/i,
      /insert.*into/i,
      /delete.*from/i,
      /update.*set/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(value));
  }

  return true;
}
