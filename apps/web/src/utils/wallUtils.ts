/**
 * Wall Utilities
 * Helper functions for wall geometry calculations and conversions
 */

import type { Wall, WallNode } from '@/stores/wallStore';
import * as turf from '@turf/turf';

// ============================================
// Types
// ============================================
export interface WallWithCoords extends Wall {
  start: [number, number];
  end: [number, number];
}

// ============================================
// Geometry Functions
// ============================================

/**
 * Convert a wall (line with thickness) to a polygon
 * Uses Turf.js buffer to create a polygon around the center line
 */
export function wallToPolygon(
  wall: Wall,
  start: [number, number],
  end: [number, number]
): GeoJSON.Feature<GeoJSON.Polygon> {
  const { thickness } = wall;

  // Create a line from start to end
  const line = turf.lineString([start, end]);

  // Buffer the line by half the thickness on each side
  // Buffer in kilometers, so convert meters to km
  const buffered = turf.buffer(line, thickness / 2 / 1000, {
    units: 'kilometers',
    steps: 1, // Use 1 step for flat ends (rectangular walls)
  });

  if (!buffered) {
    // Fallback: create a simple rectangle if buffer fails
    return createRectanglePolygon(start, end, thickness, wall);
  }

  return {
    type: 'Feature',
    properties: {
      id: wall.id,
      height: wall.height,
      color: wall.color,
      thickness: wall.thickness,
    },
    geometry: buffered.geometry as GeoJSON.Polygon,
  };
}

/**
 * Create a rectangle polygon manually (fallback for buffer)
 */
function createRectanglePolygon(
  start: [number, number],
  end: [number, number],
  thickness: number,
  wall: Wall
): GeoJSON.Feature<GeoJSON.Polygon> {
  // Calculate perpendicular offset
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    // Degenerate case: start and end are the same
    return {
      type: 'Feature',
      properties: { id: wall.id, height: wall.height, color: wall.color },
      geometry: { type: 'Polygon', coordinates: [[start, start, start, start, start]] },
    };
  }

  // Perpendicular unit vector
  const perpX = -dy / length;
  const perpY = dx / length;

  // Convert thickness to degrees (approximate)
  const halfThicknessDeg = thickness / 2 / 111000; // rough meters to degrees
  const offsetX = perpX * halfThicknessDeg;
  const offsetY = perpY * halfThicknessDeg;

  const coords: [number, number][] = [
    [start[0] - offsetX, start[1] - offsetY],
    [start[0] + offsetX, start[1] + offsetY],
    [end[0] + offsetX, end[1] + offsetY],
    [end[0] - offsetX, end[1] - offsetY],
    [start[0] - offsetX, start[1] - offsetY], // Close the polygon
  ];

  return {
    type: 'Feature',
    properties: {
      id: wall.id,
      height: wall.height,
      color: wall.color,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

/**
 * Convert an array of walls to a GeoJSON FeatureCollection
 * for rendering as fill-extrusion layer
 */
export function wallsToGeoJSON(
  walls: Wall[],
  getNodeById: (id: string) => WallNode | undefined
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  for (const wall of walls) {
    const startNode = getNodeById(wall.startNodeId);
    const endNode = getNodeById(wall.endNodeId);

    if (startNode && endNode) {
      features.push(wallToPolygon(wall, startNode.position, endNode.position));
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Get the center line of a wall as a GeoJSON line
 * Useful for preview/outline rendering
 */
export function wallToLine(
  wall: Wall,
  start: [number, number],
  end: [number, number]
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {
      id: wall.id,
      color: wall.color,
    },
    geometry: {
      type: 'LineString',
      coordinates: [start, end],
    },
  };
}

// ============================================
// Measurement Functions
// ============================================

/**
 * Calculate the length of a wall in meters
 */
export function getWallLength(wall: { start: [number, number]; end: [number, number] }): number {
  const from = turf.point(wall.start);
  const to = turf.point(wall.end);
  return turf.distance(from, to, { units: 'meters' });
}

/**
 * Calculate the angle of a wall in degrees (0-360)
 */
export function getWallAngle(start: [number, number], end: [number, number]): number {
  const bearing = turf.bearing(turf.point(start), turf.point(end));
  // Convert from -180..180 to 0..360
  return (bearing + 360) % 360;
}

// ============================================
// Snapping Functions
// ============================================

/**
 * Snap a point to the nearest grid intersection
 */
export function snapToGrid(
  point: [number, number],
  gridSizeMeters: number,
  mapCenter: [number, number]
): [number, number] {
  const latDegPerMeter = 1 / 111000;
  const lonDegPerMeter = 1 / (111000 * Math.cos((mapCenter[1] * Math.PI) / 180));

  const gridLat = gridSizeMeters * latDegPerMeter;
  const gridLon = gridSizeMeters * lonDegPerMeter;

  return [Math.round(point[0] / gridLon) * gridLon, Math.round(point[1] / gridLat) * gridLat];
}

/**
 * Snap to orthogonal angles (0°, 90°, 180°, 270°)
 */
export function snapToOrtho(
  point: [number, number],
  anchor: [number, number],
  threshold: number = 15
): [number, number] {
  const dx = point[0] - anchor[0];
  const dy = point[1] - anchor[1];
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const normalizedAngle = ((angle % 360) + 360) % 360;

  const snapAngles = [0, 90, 180, 270, 360];
  let nearestAngle = 0;
  let minDiff = Infinity;

  for (const snapAngle of snapAngles) {
    const diff = Math.abs(normalizedAngle - snapAngle);
    if (diff < minDiff) {
      minDiff = diff;
      nearestAngle = snapAngle;
    }
  }

  if (minDiff > threshold) return point;

  const distance = Math.sqrt(dx * dx + dy * dy);
  const snapRad = (nearestAngle * Math.PI) / 180;

  return [anchor[0] + Math.cos(snapRad) * distance, anchor[1] + Math.sin(snapRad) * distance];
}

/**
 * Snap a point to the nearest existing node
 */
export function snapToNode(
  point: [number, number],
  nodes: WallNode[],
  thresholdMeters: number = 0.5
): [number, number] {
  const targetPoint = turf.point(point);
  const thresholdKm = thresholdMeters / 1000;

  let nearestPoint = point;
  let minDistance = Infinity;

  for (const node of nodes) {
    const nodePoint = turf.point(node.position);
    const dist = turf.distance(targetPoint, nodePoint, { units: 'kilometers' });

    if (dist < thresholdKm && dist < minDistance) {
      minDistance = dist;
      nearestPoint = node.position;
    }
  }

  return nearestPoint;
}
