/**
 * Custom Tables API Client
 */

import apiClient from '@/lib/api';

export interface CustomFieldDefinition {
  name: string;
  displayName: string;
  description?: string;
  dataType: string;
  isRequired?: boolean;
  isUnique?: boolean;
  isTimeseries?: boolean;
  defaultValue?: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  relationTable?: string;
  relationField?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  validation?: Record<string, any>;
  order?: number;
}

export interface CustomTableDefinition {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  fields: CustomFieldDefinition[];
}

export interface CustomTable {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  fields: {
    id: string;
    name: string;
    displayName: string;
    dataType: string;
    isRequired: boolean;
    isUnique: boolean;
    isTimeseries: boolean;
    defaultValue?: string;
    maxLength?: number;
    precision?: number;
    scale?: number;
    relationTable?: string;
    relationField?: string;
    onDelete?: string;
    validation?: Record<string, any>;
    order: number;
  }[];
}

export interface TableStats {
  totalRecords: number;
  activeRecords: number;
  deletedRecords: number;
  lastUpdated: string | null;
}

/**
 * Get all custom tables
 */
export const getCustomTables = async (): Promise<CustomTable[]> => {
  const response = await apiClient.get('/custom-tables');
  return response.data.data;
};

/**
 * Get custom table by ID
 */
export const getCustomTable = async (id: string): Promise<CustomTable> => {
  const response = await apiClient.get(`/custom-tables/${id}`);
  return response.data.data;
};

/**
 * Create custom table
 */
export const createCustomTable = async (
  definition: CustomTableDefinition
): Promise<CustomTable> => {
  const response = await apiClient.post('/custom-tables', definition);
  return response.data.data;
};

/**
 * Delete custom table
 */
export const deleteCustomTable = async (id: string): Promise<void> => {
  await apiClient.delete(`/custom-tables/${id}`);
};

/**
 * Add field to table
 */
export const addTableField = async (
  tableId: string,
  field: CustomFieldDefinition
): Promise<CustomTable> => {
  const response = await apiClient.post(`/custom-tables/${tableId}/fields`, field);
  return response.data.data;
};

/**
 * Get table statistics
 */
export const getTableStats = async (tableName: string): Promise<TableStats> => {
  const response = await apiClient.get(`/custom-data/${tableName}/stats`);
  return response.data.data;
};

/**
 * Query table data
 */
export const queryTableData = async (
  tableName: string,
  options: {
    filters?: Record<string, any>;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: any[]; total: number }> => {
  const params = new URLSearchParams();

  if (options.orderBy) params.append('orderBy', options.orderBy);
  if (options.orderDir) params.append('orderDir', options.orderDir);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());

  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }

  const response = await apiClient.get(`/custom-data/${tableName}?${params.toString()}`);
  return { data: response.data.data, total: response.data.total };
};

/**
 * Get single record
 */
export const getTableRecord = async (tableName: string, id: string): Promise<any> => {
  const response = await apiClient.get(`/custom-data/${tableName}/${id}`);
  return response.data.data;
};

/**
 * Insert record
 */
export const insertTableRecord = async (
  tableName: string,
  data: Record<string, any>
): Promise<any> => {
  const response = await apiClient.post(`/custom-data/${tableName}`, data);
  return response.data.data;
};

/**
 * Update record
 */
export const updateTableRecord = async (
  tableName: string,
  id: string,
  data: Record<string, any>
): Promise<any> => {
  const response = await apiClient.put(`/custom-data/${tableName}/${id}`, data);
  return response.data.data;
};

/**
 * Delete record
 */
export const deleteTableRecord = async (tableName: string, id: string): Promise<void> => {
  await apiClient.delete(`/custom-data/${tableName}/${id}`);
};

/**
 * Get record history
 */
export const getRecordHistory = async (tableName: string, recordId: string): Promise<any[]> => {
  const response = await apiClient.get(`/custom-data/${tableName}/${recordId}/history`);
  return response.data.data;
};

/**
 * Export table data as GeoJSON FeatureCollection
 */
export const exportTableAsGeoJSON = async (
  tableName: string,
  geometryField: string,
  properties?: string[],
  filters?: Record<string, any>
): Promise<any> => {
  const params = new URLSearchParams();
  params.append('geometryField', geometryField);

  if (properties && properties.length > 0) {
    params.append('properties', properties.join(','));
  }

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }

  const response = await apiClient.get(`/custom-data/${tableName}/geojson?${params.toString()}`);
  return response.data;
};

/**
 * Perform spatial query
 */
export const spatialQuery = async (
  tableName: string,
  params: {
    geometryColumn: string;
    queryType: 'within' | 'distance' | 'intersects';
    geometry?: any;
    distance?: number;
    point?: any;
  }
): Promise<any[]> => {
  const response = await apiClient.post(`/custom-data/${tableName}/spatial-query`, params);
  return response.data.data;
};

/**
 * Find records within distance of a point
 */
export const findNearby = async (
  tableName: string,
  geometryColumn: string,
  point: { type: 'Point'; coordinates: [number, number] },
  distanceInMeters: number
): Promise<any[]> => {
  return spatialQuery(tableName, {
    geometryColumn,
    queryType: 'distance',
    point,
    distance: distanceInMeters,
  });
};

/**
 * Find records within a polygon
 */
export const findWithinPolygon = async (
  tableName: string,
  geometryColumn: string,
  polygon: { type: 'Polygon'; coordinates: [number, number][][] }
): Promise<any[]> => {
  return spatialQuery(tableName, {
    geometryColumn,
    queryType: 'within',
    geometry: polygon,
  });
};

/**
 * Find records that intersect with a geometry
 */
export const findIntersecting = async (
  tableName: string,
  geometryColumn: string,
  geometry: any
): Promise<any[]> => {
  return spatialQuery(tableName, {
    geometryColumn,
    queryType: 'intersects',
    geometry,
  });
};
