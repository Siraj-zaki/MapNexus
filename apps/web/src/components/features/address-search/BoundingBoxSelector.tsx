/**
 * BoundingBoxSelector - Stable Selection Component
 *
 * Uses Turf.js mathematics (not CSS rotation) for stable box manipulation.
 * Renders as Mapbox GL GeoJSON Source + Fill Layer.
 */

import * as turf from '@turf/turf';
import { RotateCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================
// Types
// ============================================
export interface BoundingBoxState {
  center: [number, number]; // [lng, lat]
  width: number; // meters
  height: number; // meters
  bearing: number; // degrees
}

interface BoundingBoxSelectorProps {
  map: mapboxgl.Map | null;
  initialCenter: [number, number];
  onChange?: (state: BoundingBoxState) => void;
}

type InteractionMode = 'idle' | 'drag' | 'rotate' | 'resize';

// ============================================
// Constants
// ============================================
const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 80;
const MIN_SIZE = 10;
const HANDLE_RADIUS = 8;
const ROTATE_HANDLE_OFFSET = 50;

// ============================================
// Create rotated polygon from state using Turf.js
// ============================================
function createPolygonFromState(state: BoundingBoxState): GeoJSON.Feature<GeoJSON.Polygon> {
  const { center, width, height, bearing } = state;
  const halfWidthKm = width / 2 / 1000;
  const halfHeightKm = height / 2 / 1000;
  const centerPoint = turf.point(center);

  // Calculate 4 corners
  const north = turf.destination(centerPoint, halfHeightKm, 0);
  const south = turf.destination(centerPoint, halfHeightKm, 180);
  const nwPoint = turf.destination(north, halfWidthKm, -90);
  const nePoint = turf.destination(north, halfWidthKm, 90);
  const sePoint = turf.destination(south, halfWidthKm, 90);
  const swPoint = turf.destination(south, halfWidthKm, -90);

  const polygon = turf.polygon([
    [
      nwPoint.geometry.coordinates as [number, number],
      nePoint.geometry.coordinates as [number, number],
      sePoint.geometry.coordinates as [number, number],
      swPoint.geometry.coordinates as [number, number],
      nwPoint.geometry.coordinates as [number, number],
    ],
  ]);

  // Apply rotation using turf.transformRotate
  if (bearing !== 0) {
    return turf.transformRotate(polygon, bearing, {
      pivot: center,
    }) as GeoJSON.Feature<GeoJSON.Polygon>;
  }

  return polygon as GeoJSON.Feature<GeoJSON.Polygon>;
}

// Export for persistence
export function getBoundingBoxGeoJSON(state: BoundingBoxState): GeoJSON.Feature {
  const polygon = createPolygonFromState(state);
  return {
    type: 'Feature',
    geometry: polygon.geometry,
    properties: {
      center: state.center,
      width: state.width,
      height: state.height,
      bearing: state.bearing,
    },
  };
}

// ============================================
// Component
// ============================================
export function BoundingBoxSelector({ map, initialCenter, onChange }: BoundingBoxSelectorProps) {
  const [state, setState] = useState<BoundingBoxState>({
    center: initialCenter,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    bearing: 0,
  });

  const [mode, setMode] = useState<InteractionMode>('idle');
  const interactionStart = useRef<{
    mouseX: number;
    mouseY: number;
    state: BoundingBoxState;
    angle?: number;
    distance?: number;
  } | null>(null);

  const [screenData, setScreenData] = useState<{
    corners: { x: number; y: number }[];
    center: { x: number; y: number };
    rotateHandle: { x: number; y: number };
  } | null>(null);

  // Update screen coordinates
  const updateScreenCoords = useCallback(() => {
    if (!map) return;

    const polygon = createPolygonFromState(state);
    const coords = polygon.geometry.coordinates[0];

    const corners = coords.slice(0, 4).map((coord: number[]) => {
      const pt = map.project([coord[0], coord[1]]);
      return { x: pt.x, y: pt.y };
    });

    const centerScreen = map.project(state.center);
    const topMidX = (corners[0].x + corners[1].x) / 2;
    const topMidY = (corners[0].y + corners[1].y) / 2;
    const dx = topMidX - centerScreen.x;
    const dy = topMidY - centerScreen.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const rotateHandle = {
      x: centerScreen.x + (dx / dist) * (dist + ROTATE_HANDLE_OFFSET),
      y: centerScreen.y + (dy / dist) * (dist + ROTATE_HANDLE_OFFSET),
    };

    setScreenData({ corners, center: centerScreen, rotateHandle });
  }, [map, state]);

  useEffect(() => {
    if (!map) return;
    updateScreenCoords();
    const handleUpdate = () => updateScreenCoords();
    map.on('move', handleUpdate);
    map.on('zoom', handleUpdate);
    return () => {
      map.off('move', handleUpdate);
      map.off('zoom', handleUpdate);
    };
  }, [map, updateScreenCoords]);

  useEffect(() => {
    onChange?.(state);
  }, [state, onChange]);

  // Interaction handlers
  const startInteraction = (e: React.MouseEvent, newMode: InteractionMode) => {
    e.preventDefault();
    e.stopPropagation();
    if (!screenData) return;

    let angle: number | undefined;
    let distance: number | undefined;

    if (newMode === 'rotate') {
      const dx = e.clientX - screenData.center.x;
      const dy = e.clientY - screenData.center.y;
      angle = Math.atan2(dy, dx) * (180 / Math.PI);
    }

    if (newMode === 'resize') {
      const dx = e.clientX - screenData.center.x;
      const dy = e.clientY - screenData.center.y;
      distance = Math.sqrt(dx * dx + dy * dy);
    }

    setMode(newMode);
    interactionStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      state: { ...state },
      angle,
      distance,
    };
  };

  useEffect(() => {
    if (!map || mode === 'idle') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactionStart.current || !screenData) return;
      const start = interactionStart.current;

      if (mode === 'drag') {
        const newCenter = map.unproject([e.clientX, e.clientY]);
        setState((prev) => ({ ...prev, center: [newCenter.lng, newCenter.lat] }));
      }

      if (mode === 'rotate' && start.angle !== undefined) {
        const dx = e.clientX - screenData.center.x;
        const dy = e.clientY - screenData.center.y;
        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const deltaAngle = currentAngle - start.angle;
        setState((prev) => ({ ...prev, bearing: start.state.bearing + deltaAngle }));
      }

      if (mode === 'resize' && start.distance !== undefined) {
        const dx = e.clientX - screenData.center.x;
        const dy = e.clientY - screenData.center.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const scale = currentDistance / start.distance;
        setState((prev) => ({
          ...prev,
          width: Math.max(MIN_SIZE, start.state.width * scale),
          height: Math.max(MIN_SIZE, start.state.height * scale),
        }));
      }
    };

    const handleMouseUp = () => {
      setMode('idle');
      interactionStart.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [map, mode, screenData]);

  if (!screenData) return null;

  const { corners, center, rotateHandle } = screenData;
  const pathD = corners.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  const topMidX = (corners[0].x + corners[1].x) / 2;
  const topMidY = (corners[0].y + corners[1].y) / 2;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <path
          d={pathD}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#3b82f6"
          strokeWidth="2"
          className="pointer-events-auto cursor-move"
          onMouseDown={(e) => startInteraction(e, 'drag')}
        />
        <line
          x1={topMidX}
          y1={topMidY}
          x2={rotateHandle.x}
          y2={rotateHandle.y}
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
      </svg>

      {/* Corner Handles */}
      {corners.map((corner, i) => (
        <div
          key={i}
          className="absolute pointer-events-auto cursor-nwse-resize"
          style={{
            left: corner.x - HANDLE_RADIUS,
            top: corner.y - HANDLE_RADIUS,
            width: HANDLE_RADIUS * 2,
            height: HANDLE_RADIUS * 2,
          }}
          onMouseDown={(e) => startInteraction(e, 'resize')}
        >
          <div className="w-full h-full bg-white border-2 border-blue-500 rounded-full shadow-lg" />
        </div>
      ))}

      {/* Rotate Handle */}
      <div
        className="absolute pointer-events-auto cursor-grab"
        style={{ left: rotateHandle.x - 14, top: rotateHandle.y - 14 }}
        onMouseDown={(e) => startInteraction(e, 'rotate')}
      >
        <div className="w-7 h-7 bg-white border-2 border-blue-500 rounded-full shadow-lg flex items-center justify-center">
          <RotateCw className="h-3.5 w-3.5 text-blue-500" />
        </div>
      </div>

      {/* Dimensions */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: center.x,
          top: Math.max(corners[2].y, corners[3].y) + 20,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="bg-gray-900/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
          {Math.round(state.width)}m × {Math.round(state.height)}m
        </div>
      </div>
    </div>
  );
}
