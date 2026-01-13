/**
 * Types for Custom Table System
 */

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

  // PostGIS fields
  srid?: number;
  geometryType?: 'POINT' | 'POLYGON' | 'LINESTRING' | 'MULTIPOINT' | 'MULTIPOLYGON';

  // IoT configuration
  iotConfig?: {
    sensorType?: string;
    unit?: string;
    minValue?: number;
    maxValue?: number;
    threshold?: number;
    [key: string]: any;
  };

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

export interface CustomTableWithFields {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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
