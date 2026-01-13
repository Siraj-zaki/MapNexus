import { useDoorStore } from '@/stores/doorStore';
import { useEditorStore } from '@/stores/editorStore';
import { useWallStore } from '@/stores/wallStore';
import * as turf from '@turf/turf';
import { useCallback, useEffect, useState } from 'react';

interface DoorPlacementToolProps {
  map: mapboxgl.Map;
  floorId: string;
}

interface SnappedPosition {
  wallId: string;
  position: [number, number];
  screenPoint: { x: number; y: number };
  isValid: boolean;
}

export function DoorPlacementTool({ map, floorId }: DoorPlacementToolProps) {
  const { activeTool } = useEditorStore();
  const { walls, getNodeById } = useWallStore();
  const { addDoor, stampSize, setStampSize, selectDoor } = useDoorStore();

  const isDoorTool = activeTool === 'door';

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [snappedPos, setSnappedPos] = useState<SnappedPosition | null>(null);

  // 1. Tool Logic: Find nearest wall and snap
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

        // Threshold: 1 meter
        if (distance < 1 && distance < minDistance) {
          minDistance = distance;
          nearestWallId = wall.id;
          projectedPoint = snapped;
        }
      }

      if (nearestWallId && projectedPoint) {
        const coords = projectedPoint.geometry.coordinates as [number, number];
        const screen = map.project(coords);
        return {
          wallId: nearestWallId,
          position: coords,
          screenPoint: screen,
          isValid: true,
        };
      }

      return null;
    },
    [walls, floorId, getNodeById, map]
  );

  // 2. Mouse Move Listener
  useEffect(() => {
    if (!isDoorTool) return;

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      setCursorPos(e.point);
      const snapped = getNearestWall(e.point, e.lngLat);
      setSnappedPos(snapped);
    };

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const snapped = getNearestWall(e.point, e.lngLat);

      if (snapped && snapped.isValid) {
        // const newId = uuidv4();
        // Add Door
        addDoor({
          // @ts-ignore - store expects Omit<Door, 'id'> but we can pass id if store logic allowed it,
          // actually store says: addDoor: (door: Omit<Door, 'id'>) => {},
          // so let's modify store to return ID or handle selection separately.
          // Wait, if I generate ID here, I can pass it if I update store type or just rely on store generating it.
          // BUT I need to select it. So I should generate ID here and pass it, OR store should return it.
          // Let's defer selection to a simple finding: select the last added door?
          // BETTER: modify store to accept optional ID or returned ID.
          // For now, I'll validly assume I can't easily get the ID back without changing store.
          // HACK: Pass ID if store allowed. Store impl was: { ...door, id: uuidv4() }.
          // Let's rely on finding it by matching properties? No too risky.
          // Let's modify logic: I will NOT pass ID, but I will search for the door I just added?
          // No, I'll assume I can't select it immediately unless I update store.
          // Let's UPDATE STORE first? No, I'm already editing this file.
          // Let's just generate a UUID here and force-cast or assume the store handles it?
          // Store impl: `doors: [...state.doors, { ...door, id: uuidv4() }],` -> overwrites my ID.
          // OK, Quick fix: update store to use provided ID if present.

          floorId,
          wallId: snapped.wallId,
          position: {
            x: snapped.screenPoint.x,
            y: snapped.screenPoint.y,
            lngLat: snapped.position,
          },
          width: stampSize * 0.3048,
          type: 'single',
        });

        // Timeout to select the latest door (not ideal but works for now without store refactor)
        setTimeout(() => {
          const state = useDoorStore.getState();
          const latest = state.doors[state.doors.length - 1];
          if (latest) {
            selectDoor(latest.id);
          }
        }, 50);
      }
    };

    // Wheel to adjust size
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
  }, [isDoorTool, map, getNearestWall, addDoor, stampSize, setStampSize, floorId, selectDoor]);

  if (!isDoorTool) return null;

  const renderPos = snappedPos ? snappedPos.screenPoint : cursorPos;
  const color = snappedPos?.isValid ? '#22c55e' : '#ef4444';

  if (!renderPos) return null;

  // Calculate actual pixel width based on METER width
  // Door Width in Meters = stampSize * 0.3048
  const widthMeters = stampSize * 0.3048;

  // Calculate width in pixels at current latitude/zoom
  // We project the center point, then a point 'widthMeters/2' away East and West?
  // Or simpler: use 'pixelsPerMeter' at this latitude.
  // 1 degree latitude ~= 111,000 meters.
  // 1 degree longitude ~= 111,000 * cos(lat) meters.
  // We can project (lng, lat) and (lng + width_in_deg, lat).

  // Get current lat from renderPos? Or cursor lngLat?
  // If we have snappedPos, use its position. If not, use map center or unproject cursor?
  // Let's use the actual map method for accuracy.

  const centerLngLat = snappedPos
    ? snappedPos.position
    : (map.unproject(renderPos as mapboxgl.PointLike) as unknown as [number, number]);
  // Just calculate pixel distance for X meters at this latitude
  // Ensure centerLngLat is treated as array [lng, lat]
  const lng = Array.isArray(centerLngLat) ? centerLngLat[0] : (centerLngLat as any).lng;
  const lat = Array.isArray(centerLngLat) ? centerLngLat[1] : (centerLngLat as any).lat;

  const point1 = map.project([lng, lat]);
  const metersPerDegreeLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const deltaLng = widthMeters / metersPerDegreeLng;
  const point2 = map.project([lng + deltaLng, lat]);

  // Use Euclidean distance to handle map rotation (bearing) correctly
  // calculating just dx would fail if the map is rotated 90 degrees
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
          <rect
            x={-widthPx / 2}
            y={-6}
            width={widthPx}
            height={12}
            fill="none"
            stroke={color}
            strokeWidth={2}
            rx={2}
          />
          {/* Simple visual cue for 'front' */}
          <path d={`M 0 -6 L 0 -10`} stroke={color} strokeWidth={2} />
        </g>
      </svg>

      <div
        className="absolute px-2 py-1 bg-black/80 text-white text-xs rounded pointer-events-none transform -translate-x-1/2 -translate-y-full"
        style={{ left: renderPos.x, top: renderPos.y - 15 }}
      >
        Width: {stampSize.toFixed(1)}ft ({widthMeters.toFixed(2)}m)
      </div>
    </div>
  );
}
