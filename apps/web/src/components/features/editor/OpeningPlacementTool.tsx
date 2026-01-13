import { useEditorStore } from '@/stores/editorStore';
import { useWallStore } from '@/stores/wallStore';
import * as turf from '@turf/turf';
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface OpeningPlacementToolProps {
  map: mapboxgl.Map;
}

interface SnapResult {
  wallId: string;
  position: [number, number]; // LngLat
  screenPos: { x: number; y: number };
  distFromStart: number;
  wallLength: number;
  wallAngle: number;
}

const SNAP_DISTANCE_PX = 30; // Mouse must be this close to a wall

export function OpeningPlacementTool({ map }: OpeningPlacementToolProps) {
  const { activeTool } = useEditorStore();
  const { walls, nodes, getNodeById, addOpening } = useWallStore();

  const isDoor = activeTool === 'door';
  const isWindow = activeTool === 'window';
  const isActive = isDoor || isWindow;

  const [snap, setSnap] = useState<SnapResult | null>(null);

  // Default dimensions
  const width = isDoor ? 1.0 : 1.5; // 1m door, 1.5m window
  const wallThickness = 0.2; // Visual thickness for preview

  // ---------------------------------------------------------------------------
  // Logic: Find closest wall and project point onto it
  // ---------------------------------------------------------------------------
  const handleMouseMove = useCallback(
    (e: mapboxgl.MapMouseEvent) => {
      if (!isActive) return;

      const mousePoint = turf.point([e.lngLat.lng, e.lngLat.lat]);
      let closest: SnapResult | null = null;
      let minDistance = Infinity;

      // Iterate all walls to find the closest one
      walls.forEach((wall) => {
        const startNode = getNodeById(wall.startNodeId);
        const endNode = getNodeById(wall.endNodeId);
        if (!startNode || !endNode) return;

        const line = turf.lineString([startNode.position, endNode.position]);

        // Get closest point on this wall segment
        const snapped = turf.nearestPointOnLine(line, mousePoint);
        const distToLine = turf.distance(mousePoint, snapped, { units: 'kilometers' });

        // Convert to pixels to check snap threshold
        const screenPoint = map.project(snapped.geometry.coordinates as [number, number]);
        const mouseScreen = e.point;
        const pixelDist = Math.sqrt(
          Math.pow(screenPoint.x - mouseScreen.x, 2) + Math.pow(screenPoint.y - mouseScreen.y, 2)
        );

        if (pixelDist < SNAP_DISTANCE_PX && distToLine < minDistance) {
          minDistance = distToLine;

          // Calculate distance from start of wall (for storage)
          const start = turf.point(startNode.position);
          const distFromStart = turf.distance(start, snapped, { units: 'meters' });
          const wallLength = turf.distance(start, turf.point(endNode.position), {
            units: 'meters',
          });

          // Calculate angle for rotation
          const bearing = turf.bearing(start, turf.point(endNode.position));

          closest = {
            wallId: wall.id,
            position: snapped.geometry.coordinates as [number, number],
            screenPos: screenPoint,
            distFromStart,
            wallLength,
            wallAngle: bearing + 90, // Adjust for SVG rotation
          };
        }
      });

      setSnap(closest);
    },
    [isActive, walls, getNodeById, map]
  );

  // ---------------------------------------------------------------------------
  // Logic: Place the opening
  // ---------------------------------------------------------------------------
  const handleClick = useCallback(
    (e: mapboxgl.MapMouseEvent) => {
      if (!isActive || !snap) return;

      // Prevent placing if too close to corners (optional safety)
      if (snap.distFromStart < width / 2 || snap.distFromStart > snap.wallLength - width / 2) {
        console.warn('Too close to corner');
        return;
      }

      addOpening({
        id: uuidv4(),
        wallId: snap.wallId,
        type: isDoor ? 'door' : 'window',
        distFromStart: snap.distFromStart,
        width: width,
        height: isDoor ? 2.2 : 1.5,
        sillHeight: isDoor ? 0 : 1.0,
      });
    },
    [isActive, snap, isDoor, width, addOpening]
  );

  // ---------------------------------------------------------------------------
  // Event Binding
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isActive) return;
    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);
    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
    };
  }, [isActive, handleMouseMove, handleClick, map]);

  // Sync SVG position on map move
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    const onMove = () => setTick((t) => t + 1);
    map.on('move', onMove);
    return () => map.off('move', onMove);
  }, [isActive, map]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      <svg className="w-full h-full">
        {snap && (
          <g
            transform={`translate(${snap.screenPos.x}, ${snap.screenPos.y}) rotate(${snap.wallAngle})`}
          >
            {/* 
               Visual Preview:
               We rotate the group so 0 is along the wall.
               We draw a rectangle centered on (0,0).
            */}

            {/* The Cutout (White/Hollow) */}
            <rect
              x={-20} // Approx width in pixels
              y={-5} // Approx thickness
              width={40}
              height={10}
              fill={isDoor ? '#ffffff' : '#bfdbfe'}
              stroke={isDoor ? '#ef4444' : '#3b82f6'}
              strokeWidth={2}
            />

            {/* Door Swing Arc (if door) */}
            {isDoor && (
              <path
                d="M -20 -5 Q -20 -25 0 -25 L 0 -5"
                fill="none"
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
            )}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {snap && (
        <div
          className="absolute px-2 py-1 bg-black/80 text-white text-xs rounded transform -translate-x-1/2 -translate-y-full"
          style={{ left: snap.screenPos.x, top: snap.screenPos.y - 20 }}
        >
          Click to place {isDoor ? 'Door' : 'Window'}
        </div>
      )}
    </div>
  );
}
