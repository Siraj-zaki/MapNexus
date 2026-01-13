/**
 * Custom Table Type Definitions
 * Centralized types for the dynamic table system
 */

// Data type constants matching backend
export const DATA_TYPES = {
  // String types
  TEXT: 'TEXT',
  VARCHAR: 'VARCHAR',

  // Numeric types
  INTEGER: 'INTEGER',
  BIGINT: 'BIGINT',
  DECIMAL: 'DECIMAL',
  FLOAT: 'FLOAT',

  // Boolean
  BOOLEAN: 'BOOLEAN',

  // Date/Time
  DATE: 'DATE',
  TIMESTAMP: 'TIMESTAMP',
  TIMESTAMPTZ: 'TIMESTAMPTZ',

  // JSON
  JSONB: 'JSONB',

  // UUID
  UUID: 'UUID',

  // PostGIS Geometry
  GEOMETRY_POINT: 'GEOMETRY_POINT',
  GEOMETRY_POLYGON: 'GEOMETRY_POLYGON',
  GEOMETRY_LINESTRING: 'GEOMETRY_LINESTRING',
  GEOMETRY_MULTIPOINT: 'GEOMETRY_MULTIPOINT',
  GEOMETRY_MULTIPOLYGON: 'GEOMETRY_MULTIPOLYGON',

  // IoT
  IOT_SENSOR: 'IOT_SENSOR',

  // Other
  TAGS: 'TAGS',
} as const;

export type DataType = (typeof DATA_TYPES)[keyof typeof DATA_TYPES];

// Geometry types for PostGIS
export type GeometryType = 'POINT' | 'POLYGON' | 'LINESTRING' | 'MULTIPOINT' | 'MULTIPOLYGON';

// IoT sensor configuration
export interface IoTConfig {
  sensorType?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  threshold?: number;
  [key: string]: any;
}

// Custom field definition
export interface CustomFieldDefinition {
  name: string;
  displayName: string;
  description?: string;
  dataType: DataType;
  isRequired?: boolean;
  isUnique?: boolean;
  isTimeseries?: boolean;
  defaultValue?: string;

  // For VARCHAR, CHAR
  maxLength?: number;

  // For DECIMAL, NUMERIC
  precision?: number;
  scale?: number;

  // PostGIS fields
  srid?: number;
  geometryType?: GeometryType;

  // IoT configuration
  iotConfig?: IoTConfig;

  // Relations
  relationTable?: string;
  relationField?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  // Validation
  validation?: Record<string, any>;

  // Display
  order?: number;
  isVisible?: boolean;
}

// Custom field (from database)
export interface CustomField extends CustomFieldDefinition {
  id: string;
  tableId: string;
  createdAt: string;
  updatedAt: string;
}

// Custom table definition
export interface CustomTableDefinition {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  fields: CustomFieldDefinition[];
}

// Custom table (from database)
export interface CustomTable {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  fields: CustomField[];
}

// GeoJSON types
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // Array of linear rings
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][]; // Array of points
}

export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSONLineString;

export interface GeoJSONFeature<T = any> {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: T;
}

export interface GeoJSONFeatureCollection<T = any> {
  type: 'FeatureCollection';
  features: GeoJSONFeature<T>[];
}

// Custom table data record
export interface CustomTableRecord {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  [key: string]: any; // Dynamic fields
}

// Query options
export interface QueryOptions {
  filters?: Record<string, any>;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Query result
export interface QueryResult<T = CustomTableRecord> {
  data: T[];
  total: number;
}

// Spatial query types
export type SpatialQueryType = 'within' | 'distance' | 'intersects';

export interface SpatialQueryParams {
  geometryColumn: string;
  queryType: SpatialQueryType;
  geometry?: GeoJSONGeometry;
  distance?: number; // in meters
  point?: GeoJSONPoint;
}

// History record
export interface HistoryRecord {
  history_id: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string;
  changed_at: string;
  [key: string]: any; // Snapshot of data
}

// Table statistics
export interface TableStats {
  total_records: number;
  active_records: number;
  deleted_records: number;
  last_updated: string;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
