import { useDoorStore } from '@/stores/doorStore';
import { useEditorStore } from '@/stores/editorStore';
import { useWallStore } from '@/stores/wallStore';
import { useWindowStore } from '@/stores/windowStore';
import * as turf from '@turf/turf';
import { useCallback, useEffect, useState } from 'react';

interface WindowPlacementToolProps {
  map: mapboxgl.Map;
  floorId: string;
}

interface SnappedPosition {
  wallId: string;
  position: [number, number];
  screenPoint: { x: number; y: number };
  isValid: boolean;
  error?: string;
}

export function WindowPlacementTool({ map, floorId }: WindowPlacementToolProps) {
  const { activeTool } = useEditorStore();
  const { walls, getNodeById } = useWallStore();
  const { addWindow, stampSize, setStampSize, selectWindow, windows } = useWindowStore();
  const { doors } = useDoorStore();

  const isWindowTool = activeTool === 'window';

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [snappedPos, setSnappedPos] = useState<SnappedPosition | null>(null);

  // 1. Tool Logic: Find nearest wall and snap, checking for overlaps
  const getNearestWall = useCallback(
    (_: mapboxgl.Point, lngLat: mapboxgl.LngLat) => {
      const floorWalls = walls.filter((w) => w.floorId === floorId);
      const cursorPoint = turf.point([lngLat.lng, lngLat.lat]);

      let nearestWallId: string | null = null;
      let minDistance = Infinity;
      let projectedPoint: any = null;

      for (const wall of floorWalls) {
        const startNode = getNodeById(wall.startNodeId);
        const endNode = getNodeById(wall.endNodeId);
        if (!startNode || !endNode) continue;

        const line = turf.lineString([startNode.position, endNode.position]);
        const snapped = turf.nearestPointOnLine(line, cursorPoint);
        const distance = turf.distance(cursorPoint, snapped, { units: 'meters' });

        if (distance < 1 && distance < minDistance) {
          minDistance = distance;
          nearestWallId = wall.id;
          projectedPoint = snapped;
        }
      }

      if (nearestWallId && projectedPoint) {
        const coords = projectedPoint.geometry.coordinates as [number, number];
        const screen = map.project(coords);
        const widthMeters = stampSize * 0.3048;

        // Check Overlap
        // We define the new window as a line segment along the wall
        // Center: coords
        // Width: widthMeters
        // We need to check if this segment intersects with any door or window on the same wall.

        let hasOverlap = false;

        // Helper to get start/end distance of a feature on the wall
        const checkOverlapAgainst = (
          features: { position: { lngLat: [number, number] }; width: number; wallId: string }[]
        ) => {
          for (const f of features) {
            if (f.wallId !== nearestWallId) continue;

            const p1 = turf.point(coords);
            const p2 = turf.point(f.position.lngLat);
            const dist = turf.distance(p1, p2, { units: 'meters' });

            // If distance between centers is less than sum of half-widths, they overlap.
            // Assuming linear placement on the line.
            const minSeparation = widthMeters / 2 + f.width / 2;
            if (dist < minSeparation) {
              return true;
            }
          }
          return false;
        };

        if (checkOverlapAgainst(doors)) hasOverlap = true;
        if (checkOverlapAgainst(windows)) hasOverlap = true;

        return {
          wallId: nearestWallId,
          position: coords,
          screenPoint: screen,
          isValid: !hasOverlap,
          error: hasOverlap ? 'Overlap detected' : undefined,
        };
      }

      return null;
    },
    [walls, floorId, getNodeById, map, doors, windows, stampSize]
  );

  useEffect(() => {
    if (!isWindowTool) return;

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      setCursorPos(e.point);
      const snapped = getNearestWall(e.point, e.lngLat);
      setSnappedPos(snapped);
    };

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const snapped = getNearestWall(e.point, e.lngLat);

      if (snapped && snapped.isValid) {
        addWindow({
          floorId,
          wallId: snapped.wallId,
          position: {
            x: snapped.screenPoint.x,
            y: snapped.screenPoint.y,
            lngLat: snapped.position,
          },
          width: stampSize * 0.3048,
          type: 'fixed',
        });

        // Auto-select
        setTimeout(() => {
          const state = useWindowStore.getState();
          const latest = state.windows[state.windows.length - 1];
          if (latest) {
            selectWindow(latest.id);
          }
        }, 50);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.5 : 0.5;
        const newSize = Math.max(1, Math.min(10, stampSize + delta));
        setStampSize(newSize);
      }
    };

    map.on('mousemove', onMouseMove);
    map.on('click', onClick);
    map.getCanvas().addEventListener('wheel', onWheel);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('click', onClick);
      map.getCanvas().removeEventListener('wheel', onWheel);
      setCursorPos(null);
      setSnappedPos(null);
    };
  }, [
    isWindowTool,
    map,
    getNearestWall,
    addWindow,
    stampSize,
    setStampSize,
    floorId,
    selectWindow,
  ]);

  if (!isWindowTool) return null;

  const renderPos = snappedPos ? snappedPos.screenPoint : cursorPos;
  // Feedback color: Green if valid, Red if invalid (but overlapping is invalid?),
  // Maybe Blue for window, Red for overlap?
  const color = snappedPos?.isValid ? '#0ea5e9' : '#ef4444'; // Sky blue or Red

  if (!renderPos) return null;

  const widthMeters = stampSize * 0.3048;
  const centerLngLat = snappedPos
    ? snappedPos.position
    : (map.unproject(renderPos as mapboxgl.PointLike) as unknown as [number, number]);

  const lng = Array.isArray(centerLngLat) ? centerLngLat[0] : (centerLngLat as any).lng;
  const lat = Array.isArray(centerLngLat) ? centerLngLat[1] : (centerLngLat as any).lat;

  const point1 = map.project([lng, lat]);
  const metersPerDegreeLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const deltaLng = widthMeters / metersPerDegreeLng;
  const point2 = map.project([lng + deltaLng, lat]);

  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const widthPx = Math.sqrt(dx * dx + dy * dy);

  let rotation = 0;
  if (snappedPos && snappedPos.wallId) {
    const wall = walls.find((w) => w.id === snappedPos.wallId);
    if (wall) {
      const start = getNodeById(wall.startNodeId);
      const end = getNodeById(wall.endNodeId);
      if (start && end) {
        const s = map.project(start.position);
        const e = map.project(end.position);
        rotation = Math.atan2(e.y - s.y, e.x - s.x) * (180 / Math.PI);
      }
    }
  }

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <svg className="w-full h-full">
        <g transform={`translate(${renderPos.x}, ${renderPos.y}) rotate(${rotation})`}>
          {/* Window Stamp Style - Hollow Blue Rect */}
          <rect
            x={-widthPx / 2}
            y={-4}
            width={widthPx}
            height={8}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
          {/* Center line for window glass/frame */}
          <line x1={-widthPx / 2} y1={0} x2={widthPx / 2} y2={0} stroke={color} strokeWidth={1} />
        </g>
      </svg>

      <div
        className="absolute px-2 py-1 bg-black/80 text-white text-xs rounded pointer-events-none transform -translate-x-1/2 -translate-y-full"
        style={{ left: renderPos.x, top: renderPos.y - 15 }}
      >
        {snappedPos?.error ? snappedPos.error : `Window: ${stampSize.toFixed(1)}ft`}
      </div>
    </div>
  );
}
