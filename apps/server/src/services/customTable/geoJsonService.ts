/**
 * GeoJSON Service
 * Handles GeoJSON transformations and spatial operations
 */

import { GEOMETRY_TYPE_MAP, isGeometryType } from './dataTypes.js';
import { CustomFieldDefinition } from './types.js';
import { validateGeoJSON } from './validators.js';

/**
 * Convert a database row to include GeoJSON geometries
 */
export function convertToGeoJSON(row: any, fields: CustomFieldDefinition[]): any {
  const converted = { ...row };

  fields.forEach((field) => {
    if (isGeometryType(field.dataType) && row[field.name]) {
      // The geometry should already be converted to GeoJSON by ST_AsGeoJSON in the query
      // If it's a string, parse it
      if (typeof row[field.name] === 'string') {
        try {
          converted[field.name] = JSON.parse(row[field.name]);
        } catch (e) {
          // If parsing fails, keep as-is
          converted[field.name] = row[field.name];
        }
      }
    }
  });

  return converted;
}

/**
 * Convert GeoJSON from frontend format to PostGIS insert format
 */
export function convertFromGeoJSON(data: any, fields: CustomFieldDefinition[]): any {
  const converted = { ...data };

  fields.forEach((field) => {
    if (isGeometryType(field.dataType) && data[field.name]) {
      const geojson = data[field.name];
      const geometryType = GEOMETRY_TYPE_MAP[field.dataType];

      // Validate GeoJSON
      const errors = validateGeoJSON(geojson, geometryType || undefined);
      if (errors.length > 0) {
        throw new Error(`Invalid GeoJSON for field "${field.name}": ${errors.join(', ')}`);
      }

      // Convert to JSON string for ST_GeomFromGeoJSON
      converted[field.name] = JSON.stringify(geojson);
    }
  });

  return converted;
}

/**
 * Build SQL fragment to convert geometry columns to GeoJSON in SELECT
 */
export function buildGeometrySelectSQL(fields: CustomFieldDefinition[]): {
  columns: string[];
  geometryFields: string[];
} {
  const columns: string[] = [];
  const geometryFields: string[] = [];

  fields.forEach((field) => {
    if (isGeometryType(field.dataType)) {
      // Use ST_AsGeoJSON to convert geometry to GeoJSON
      columns.push(`ST_AsGeoJSON(${field.name})::json as ${field.name}`);
      geometryFields.push(field.name);
    } else {
      columns.push(field.name);
    }
  });

  return { columns, geometryFields };
}

/**
 * Build SQL fragment to convert GeoJSON to geometry in INSERT/UPDATE
 */
export function buildGeometryInsertSQL(
  data: Record<string, any>,
  fields: CustomFieldDefinition[]
): {
  columns: string[];
  values: any[];
  placeholders: string[];
} {
  const columns: string[] = [];
  const values: any[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    const field = fields.find((f) => f.name === key);

    if (field && isGeometryType(field.dataType)) {
      // Use ST_GeomFromGeoJSON to convert GeoJSON string to geometry
      columns.push(key);
      values.push(value); // value is already JSON string from convertFromGeoJSON
      placeholders.push(`ST_GeomFromGeoJSON($${paramIndex}::text)`);
      paramIndex++;
    } else {
      columns.push(key);
      values.push(value);

      let cast = '';
      if (field) {
        switch (field.dataType) {
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

      placeholders.push(`$${paramIndex}${cast}`);
      paramIndex++;
    }
  });

  return { columns, values, placeholders };
}

/**
 * Build a spatial query SQL fragment
 */
export function buildSpatialQuery(
  tableName: string,
  geometryColumn: string,
  queryType: 'within' | 'distance' | 'intersects',
  params: {
    geometry?: any; // GeoJSON
    distance?: number; // in meters
    point?: any; // GeoJSON Point
  }
): { sql: string; params: any[] } {
  switch (queryType) {
    case 'within':
      // Find features within a polygon
      if (!params.geometry) {
        throw new Error('Geometry parameter required for within query');
      }
      return {
        sql: `ST_Within(${geometryColumn}, ST_GeomFromGeoJSON($1::text))`,
        params: [JSON.stringify(params.geometry)],
      };

    case 'distance':
      // Find features within distance of a point
      if (!params.point || params.distance === undefined) {
        throw new Error('Point and distance parameters required for distance query');
      }
      return {
        sql: `ST_DWithin(
          ${geometryColumn}::geography,
          ST_GeomFromGeoJSON($1::text)::geography,
          $2
        )`,
        params: [JSON.stringify(params.point), params.distance],
      };

    case 'intersects':
      // Find features that intersect with geometry
      if (!params.geometry) {
        throw new Error('Geometry parameter required for intersects query');
      }
      return {
        sql: `ST_Intersects(${geometryColumn}, ST_GeomFromGeoJSON($1::text))`,
        params: [JSON.stringify(params.geometry)],
      };

    default:
      throw new Error(`Unsupported query type: ${queryType}`);
  }
}

/**
 * Convert a set of rows to a GeoJSON FeatureCollection
 */
export function rowsToFeatureCollection(
  rows: any[],
  geometryField: string,
  properties?: string[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = rows.map((row) => {
    const geometry = row[geometryField];

    // Collect properties
    const featureProperties: any = {};
    if (properties) {
      properties.forEach((prop) => {
        if (row[prop] !== undefined) {
          featureProperties[prop] = row[prop];
        }
      });
    } else {
      // Include all properties except the geometry field
      Object.entries(row).forEach(([key, value]) => {
        if (key !== geometryField) {
          featureProperties[key] = value;
        }
      });
    }

    return {
      type: 'Feature',
      geometry: geometry,
      properties: featureProperties,
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * TypeScript GeoJSON type definitions (subset)
 */
export namespace GeoJSON {
  export interface Point {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  }

  export interface Polygon {
    type: 'Polygon';
    coordinates: [number, number][][]; // Array of linear rings
  }

  export interface LineString {
    type: 'LineString';
    coordinates: [number, number][]; // Array of points
  }

  export type Geometry = Point | Polygon | LineString;

  export interface Feature {
    type: 'Feature';
    geometry: Geometry;
    properties: Record<string, any>;
  }

  export interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }
}
