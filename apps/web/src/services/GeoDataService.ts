/**
 * GeoDataService
 *
 * The "Magic" Layer - Fetches real-world building data from OpenStreetMap
 * and converts it to editor-compatible geometry.
 *
 * Uses Overpass API to query building footprints within a bounding box,
 * then extracts wall segments for the indoor map editor.
 */

import type { BoundingBoxState } from '@/components/features/address-search/BoundingBoxSelector';
import * as turf from '@turf/turf';

// ============================================
// Types
// ============================================
export interface Wall {
  id: string;
  type: 'wall';
  start: [number, number]; // [lng, lat]
  end: [number, number]; // [lng, lat]
  properties: {
    sourceId?: string;
    buildingName?: string;
  };
}

export interface EditorPayload {
  walls: Wall[];
  buildings: GeoJSON.FeatureCollection;
  boundary: GeoJSON.Feature;
  metadata: {
    center: [number, number];
    bearing: number;
    fetchedAt: string;
    buildingCount: number;
    wallCount: number;
  };
}

// ============================================
// Constants
// ============================================
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const OVERPASS_TIMEOUT = 30;

// ============================================
// Helper: Create rotated bbox polygon
// ============================================
function createBBoxPolygon(state: BoundingBoxState): GeoJSON.Feature<GeoJSON.Polygon> {
  const { center, width, height, bearing } = state;
  const halfW = width / 2 / 1000;
  const halfH = height / 2 / 1000;
  const pt = turf.point(center);

  const n = turf.destination(pt, halfH, 0);
  const s = turf.destination(pt, halfH, 180);
  const nw = turf.destination(n, halfW, -90);
  const ne = turf.destination(n, halfW, 90);
  const se = turf.destination(s, halfW, 90);
  const sw = turf.destination(s, halfW, -90);

  const polygon = turf.polygon([
    [
      nw.geometry.coordinates as [number, number],
      ne.geometry.coordinates as [number, number],
      se.geometry.coordinates as [number, number],
      sw.geometry.coordinates as [number, number],
      nw.geometry.coordinates as [number, number],
    ],
  ]);

  return bearing !== 0 ? turf.transformRotate(polygon, bearing, { pivot: center }) : polygon;
}

// ============================================
// Helper: Build Overpass QL query
// ============================================
function buildOverpassQuery(bbox: { s: number; w: number; n: number; e: number }): string {
  return `
[out:json][timeout:${OVERPASS_TIMEOUT}];
(
  way["building"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
  relation["building"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
);
out body;
>;
out skel qt;
  `.trim();
}

// ============================================
// Helper: Parse Overpass response to GeoJSON
// ============================================
function parseOverpassToGeoJSON(data: any): GeoJSON.FeatureCollection {
  const nodes = new Map<number, [number, number]>();
  const ways: any[] = [];

  for (const el of data.elements || []) {
    if (el.type === 'node') {
      nodes.set(el.id, [el.lon, el.lat]);
    } else if (el.type === 'way') {
      ways.push(el);
    }
  }

  const features: GeoJSON.Feature[] = [];

  for (const way of ways) {
    if (!way.nodes || way.nodes.length < 4) continue;

    const coords: [number, number][] = [];
    for (const nodeId of way.nodes) {
      const coord = nodes.get(nodeId);
      if (coord) coords.push(coord);
    }

    if (coords.length < 4) continue;

    // Ensure closed
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push(first);
    }

    features.push({
      type: 'Feature',
      id: `building-${way.id}`,
      geometry: { type: 'Polygon', coordinates: [coords] },
      properties: {
        id: way.id,
        name: way.tags?.name || null,
        building: way.tags?.building || 'yes',
        levels: way.tags?.['building:levels'] ? parseInt(way.tags['building:levels']) : null,
        height: way.tags?.height ? parseFloat(way.tags.height) : null,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

// ============================================
// Core: Extract walls from building polygons
// ============================================
export function extractWallsFromBuildings(buildings: GeoJSON.FeatureCollection): Wall[] {
  const walls: Wall[] = [];
  let wallId = 0;

  for (const feature of buildings.features) {
    if (feature.geometry.type !== 'Polygon') continue;

    const coords = feature.geometry.coordinates[0] as [number, number][];
    const buildingId = String(feature.id || `building-${wallId}`);
    const buildingName = feature.properties?.name || undefined;

    // Each consecutive pair of coordinates forms a wall segment
    for (let i = 0; i < coords.length - 1; i++) {
      walls.push({
        id: `wall-${wallId++}`,
        type: 'wall',
        start: coords[i],
        end: coords[i + 1],
        properties: {
          sourceId: buildingId,
          buildingName,
        },
      });
    }
  }

  return walls;
}

// ============================================
// Main: Fetch building data and convert to editor payload
// ============================================
export async function fetchGeoData(boundingBox: BoundingBoxState): Promise<EditorPayload> {
  // Create the rotated boundary polygon
  const boundaryPolygon = createBBoxPolygon(boundingBox);

  // Get axis-aligned bbox for Overpass query
  const bbox = turf.bbox(boundaryPolygon);
  const overpassBBox = {
    s: bbox[1],
    w: bbox[0],
    n: bbox[3],
    e: bbox[2],
  };

  // Fetch from Overpass API
  const query = buildOverpassQuery(overpassBBox);
  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  const allBuildings = parseOverpassToGeoJSON(data);

  // Filter to only buildings that intersect the rotated boundary
  const filteredFeatures = allBuildings.features.filter((feature) => {
    try {
      return turf.booleanIntersects(feature as GeoJSON.Feature, boundaryPolygon as GeoJSON.Feature);
    } catch {
      return false;
    }
  });

  const buildings: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: filteredFeatures,
  };

  // Extract walls from buildings
  const walls = extractWallsFromBuildings(buildings);

  // Create boundary feature with metadata
  const boundary: GeoJSON.Feature = {
    type: 'Feature',
    geometry: boundaryPolygon.geometry,
    properties: {
      center: boundingBox.center,
      width: boundingBox.width,
      height: boundingBox.height,
      bearing: boundingBox.bearing,
    },
  };

  return {
    walls,
    buildings,
    boundary,
    metadata: {
      center: boundingBox.center,
      bearing: boundingBox.bearing,
      fetchedAt: new Date().toISOString(),
      buildingCount: buildings.features.length,
      wallCount: walls.length,
    },
  };
}

// ============================================
// Export: Convert GeoJSON to Editor Elements
// ============================================
export interface EditorElement {
  id: string;
  type: 'wall' | 'room' | 'door' | 'poi';
  geometry: {
    type: 'LineString' | 'Polygon' | 'Point';
    coordinates: any;
  };
  properties: Record<string, any>;
}

export function convertGeoJSONToEditorElements(payload: EditorPayload): EditorElement[] {
  const elements: EditorElement[] = [];

  // Convert walls to LineString elements
  for (const wall of payload.walls) {
    elements.push({
      id: wall.id,
      type: 'wall',
      geometry: {
        type: 'LineString',
        coordinates: [wall.start, wall.end],
      },
      properties: wall.properties,
    });
  }

  // Also add building polygons as room outlines (optional)
  for (const building of payload.buildings.features) {
    if (building.geometry.type === 'Polygon') {
      elements.push({
        id: `room-${building.id}`,
        type: 'room',
        geometry: {
          type: 'Polygon',
          coordinates: building.geometry.coordinates,
        },
        properties: {
          name: building.properties?.name || 'Building',
          building: building.properties?.building,
        },
      });
    }
  }

  return elements;
}

// ============================================
// Storage Keys
// ============================================
export const STORAGE_KEYS = {
  BOUNDARY: 'newMapBoundary',
  EDITOR_PAYLOAD: 'editorPayload',
} as const;
