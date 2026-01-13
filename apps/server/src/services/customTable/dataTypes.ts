/**
 * Data Type Constants and Mappings
 * Centralized definitions for all supported data types in custom tables
 */

// Standard SQL Data Types
export const SQL_DATA_TYPES = {
  // String types
  TEXT: 'TEXT',
  VARCHAR: 'VARCHAR',
  CHAR: 'CHAR',

  // Numeric types
  INTEGER: 'INTEGER',
  BIGINT: 'BIGINT',
  DECIMAL: 'DECIMAL',
  NUMERIC: 'NUMERIC',
  FLOAT: 'FLOAT',
  DOUBLE_PRECISION: 'DOUBLE PRECISION',

  // Boolean
  BOOLEAN: 'BOOLEAN',

  // Date/Time types
  DATE: 'DATE',
  TIME: 'TIME',
  TIMESTAMP: 'TIMESTAMP',
  TIMESTAMPTZ: 'TIMESTAMPTZ',

  // JSON types
  JSON: 'JSON',
  JSONB: 'JSONB',

  // UUID
  UUID: 'UUID',
} as const;

// PostGIS Geometry Types
export const GEOMETRY_DATA_TYPES = {
  GEOMETRY_POINT: 'GEOMETRY_POINT',
  GEOMETRY_POLYGON: 'GEOMETRY_POLYGON',
  GEOMETRY_LINESTRING: 'GEOMETRY_LINESTRING',
  GEOMETRY_MULTIPOINT: 'GEOMETRY_MULTIPOINT',
  GEOMETRY_MULTIPOLYGON: 'GEOMETRY_MULTIPOLYGON',
  GEOMETRY: 'GEOMETRY', // Generic geometry type
} as const;

// IoT and Special Types
export const SPECIAL_DATA_TYPES = {
  IOT_SENSOR: 'IOT_SENSOR',
  TAGS: 'TAGS',
} as const;

// All data types combined
export const ALL_DATA_TYPES = {
  ...SQL_DATA_TYPES,
  ...GEOMETRY_DATA_TYPES,
  ...SPECIAL_DATA_TYPES,
} as const;

// Geometry type mapping (for PostGIS)
export const GEOMETRY_TYPE_MAP: Record<string, string> = {
  GEOMETRY_POINT: 'POINT',
  GEOMETRY_POLYGON: 'POLYGON',
  GEOMETRY_LINESTRING: 'LINESTRING',
  GEOMETRY_MULTIPOINT: 'MULTIPOINT',
  GEOMETRY_MULTIPOLYGON: 'MULTIPOLYGON',
  GEOMETRY: 'GEOMETRY',
};

// Supported SRID (Spatial Reference System Identifiers)
export const SUPPORTED_SRID = {
  WGS84: 4326, // Standard GPS coordinates
  WEB_MERCATOR: 3857, // Web map projection
} as const;

// Data type categories for UI grouping
export const DATA_TYPE_CATEGORIES = {
  STRING: 'String',
  NUMBER: 'Number',
  BOOLEAN: 'Boolean',
  DATE_TIME: 'Date/Time',
  JSON: 'JSON',
  GIS: 'GIS',
  IOT: 'IoT',
  OTHER: 'Other',
} as const;

/**
 * Check if a data type is a geometry type
 */
export function isGeometryType(dataType: string): boolean {
  return Object.keys(GEOMETRY_DATA_TYPES).includes(dataType);
}

/**
 * Check if a data type is an IoT sensor type
 */
export function isIoTType(dataType: string): boolean {
  return dataType === SPECIAL_DATA_TYPES.IOT_SENSOR;
}

/**
 * Check if a data type requires maxLength parameter
 */
export function requiresMaxLength(dataType: string): boolean {
  return dataType === SQL_DATA_TYPES.VARCHAR || dataType === SQL_DATA_TYPES.CHAR;
}

/**
 * Check if a data type requires precision parameter
 */
export function requiresPrecision(dataType: string): boolean {
  return dataType === SQL_DATA_TYPES.DECIMAL || dataType === SQL_DATA_TYPES.NUMERIC;
}

/**
 * Get the PostgreSQL type string from a custom field data type
 */
export function getPostgreSQLType(
  dataType: string,
  options?: {
    maxLength?: number;
    precision?: number;
    scale?: number;
  }
): string {
  // Handle geometry types - these are not created in CREATE TABLE
  if (isGeometryType(dataType)) {
    return 'GEOMETRY'; // Placeholder, actual creation uses AddGeometryColumn
  }

  // Handle IoT sensor type as JSONB
  if (dataType === SPECIAL_DATA_TYPES.IOT_SENSOR) {
    return 'JSONB';
  }

  // Handle TAGS as TEXT array
  if (dataType === SPECIAL_DATA_TYPES.TAGS) {
    return 'TEXT[]';
  }

  // Handle types that need parameters
  switch (dataType) {
    case SQL_DATA_TYPES.VARCHAR:
      return `VARCHAR(${options?.maxLength || 255})`;
    case SQL_DATA_TYPES.CHAR:
      return `CHAR(${options?.maxLength || 1})`;
    case SQL_DATA_TYPES.DECIMAL:
    case SQL_DATA_TYPES.NUMERIC:
      return `DECIMAL(${options?.precision || 10},${options?.scale || 2})`;
    default:
      // Return the type as-is for standard types
      return dataType;
  }
}

/**
 * Get the geometry type for PostGIS AddGeometryColumn
 */
export function getGeometryType(dataType: string): string | null {
  return GEOMETRY_TYPE_MAP[dataType] || null;
}

/**
 * Validate SRID value
 */
export function isValidSRID(srid: number): boolean {
  return (Object.values(SUPPORTED_SRID) as number[]).includes(srid) || (srid > 0 && srid < 999999);
}

/**
 * Get data type category for UI grouping
 */
export function getDataTypeCategory(dataType: string): string {
  if (isGeometryType(dataType)) return DATA_TYPE_CATEGORIES.GIS;
  if (isIoTType(dataType)) return DATA_TYPE_CATEGORIES.IOT;

  if (dataType === SPECIAL_DATA_TYPES.TAGS) return DATA_TYPE_CATEGORIES.OTHER;

  const textTypes: string[] = [SQL_DATA_TYPES.TEXT, SQL_DATA_TYPES.VARCHAR, SQL_DATA_TYPES.CHAR];
  if (textTypes.includes(dataType)) {
    return DATA_TYPE_CATEGORIES.STRING;
  }

  const numberTypes: string[] = [
    SQL_DATA_TYPES.INTEGER,
    SQL_DATA_TYPES.BIGINT,
    SQL_DATA_TYPES.DECIMAL,
    SQL_DATA_TYPES.NUMERIC,
    SQL_DATA_TYPES.FLOAT,
    SQL_DATA_TYPES.DOUBLE_PRECISION,
  ];
  if (numberTypes.includes(dataType)) {
    return DATA_TYPE_CATEGORIES.NUMBER;
  }

  if (dataType === SQL_DATA_TYPES.BOOLEAN) return DATA_TYPE_CATEGORIES.BOOLEAN;

  const dateTypes: string[] = [
    SQL_DATA_TYPES.DATE,
    SQL_DATA_TYPES.TIME,
    SQL_DATA_TYPES.TIMESTAMP,
    SQL_DATA_TYPES.TIMESTAMPTZ,
  ];
  if (dateTypes.includes(dataType)) {
    return DATA_TYPE_CATEGORIES.DATE_TIME;
  }

  const jsonTypes: string[] = [SQL_DATA_TYPES.JSON, SQL_DATA_TYPES.JSONB];
  if (jsonTypes.includes(dataType)) {
    return DATA_TYPE_CATEGORIES.JSON;
  }

  return DATA_TYPE_CATEGORIES.OTHER;
}

/**
 * Data type definitions for UI display
 */
export interface DataTypeDefinition {
  value: string;
  label: string;
  category: string;
  requiresLength?: boolean;
  requiresPrecision?: boolean;
  requiresGeometry?: boolean;
  requiresIoTConfig?: boolean;
  description?: string;
}

export const DATA_TYPE_DEFINITIONS: DataTypeDefinition[] = [
  // String types
  {
    value: SQL_DATA_TYPES.TEXT,
    label: 'Text',
    category: DATA_TYPE_CATEGORIES.STRING,
    description: 'Variable length text',
  },
  {
    value: SQL_DATA_TYPES.VARCHAR,
    label: 'Variable Char',
    category: DATA_TYPE_CATEGORIES.STRING,
    requiresLength: true,
    description: 'Text with max length',
  },

  // Numeric types
  {
    value: SQL_DATA_TYPES.INTEGER,
    label: 'Integer',
    category: DATA_TYPE_CATEGORIES.NUMBER,
    description: 'Whole numbers',
  },
  {
    value: SQL_DATA_TYPES.BIGINT,
    label: 'Big Integer',
    category: DATA_TYPE_CATEGORIES.NUMBER,
    description: 'Large whole numbers',
  },
  {
    value: SQL_DATA_TYPES.DECIMAL,
    label: 'Decimal',
    category: DATA_TYPE_CATEGORIES.NUMBER,
    requiresPrecision: true,
    description: 'Precise decimal numbers',
  },
  {
    value: SQL_DATA_TYPES.FLOAT,
    label: 'Float',
    category: DATA_TYPE_CATEGORIES.NUMBER,
    description: 'Floating point numbers',
  },

  // Boolean
  {
    value: SQL_DATA_TYPES.BOOLEAN,
    label: 'Boolean',
    category: DATA_TYPE_CATEGORIES.BOOLEAN,
    description: 'True/False values',
  },

  // Date/Time
  {
    value: SQL_DATA_TYPES.DATE,
    label: 'Date',
    category: DATA_TYPE_CATEGORIES.DATE_TIME,
    description: 'Date without time',
  },
  {
    value: SQL_DATA_TYPES.TIMESTAMP,
    label: 'Timestamp',
    category: DATA_TYPE_CATEGORIES.DATE_TIME,
    description: 'Date and time',
  },
  {
    value: SQL_DATA_TYPES.TIMESTAMPTZ,
    label: 'Timestamp with Timezone',
    category: DATA_TYPE_CATEGORIES.DATE_TIME,
    description: 'Date, time, and timezone',
  },

  // JSON
  {
    value: SQL_DATA_TYPES.JSONB,
    label: 'JSONB (Binary)',
    category: DATA_TYPE_CATEGORIES.JSON,
    description: 'Binary JSON data',
  },

  // UUID
  {
    value: SQL_DATA_TYPES.UUID,
    label: 'UUID',
    category: DATA_TYPE_CATEGORIES.OTHER,
    description: 'Unique identifier',
  },

  // PostGIS Geometry
  {
    value: GEOMETRY_DATA_TYPES.GEOMETRY_POINT,
    label: 'Location (Point)',
    category: DATA_TYPE_CATEGORIES.GIS,
    requiresGeometry: true,
    description: 'Geographic point (lat/long)',
  },
  {
    value: GEOMETRY_DATA_TYPES.GEOMETRY_POLYGON,
    label: 'Zone (Polygon)',
    category: DATA_TYPE_CATEGORIES.GIS,
    requiresGeometry: true,
    description: 'Geographic area/boundary',
  },
  {
    value: GEOMETRY_DATA_TYPES.GEOMETRY_LINESTRING,
    label: 'Path (LineString)',
    category: DATA_TYPE_CATEGORIES.GIS,
    requiresGeometry: true,
    description: 'Geographic path/route',
  },

  // IoT
  {
    value: SPECIAL_DATA_TYPES.IOT_SENSOR,
    label: 'IoT Sensor Data',
    category: DATA_TYPE_CATEGORIES.IOT,
    requiresIoTConfig: true,
    description: 'IoT sensor readings',
  },

  // Other
  {
    value: SPECIAL_DATA_TYPES.TAGS,
    label: 'Tags (Array)',
    category: DATA_TYPE_CATEGORIES.OTHER,
    description: 'Array of text tags',
  },
];
