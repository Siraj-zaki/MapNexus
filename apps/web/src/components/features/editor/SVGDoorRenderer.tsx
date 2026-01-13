import { useDoorStore } from '@/stores/doorStore';
import { useEditorStore } from '@/stores/editorStore';
import { useWallStore } from '@/stores/wallStore';
import { useEffect, useState } from 'react';

interface SVGDoorRendererProps {
  map: mapboxgl.Map;
  floorId: string;
}

export function SVGDoorRenderer({ map, floorId }: SVGDoorRendererProps) {
  const { getDoorsByFloor, selectDoor, selectedDoorId } = useDoorStore();
  const { walls, getNodeById } = useWallStore();
  const { activeTool } = useEditorStore();

  const [_, setTick] = useState(0);
  useEffect(() => {
    const handleMove = () => setTick((t) => t + 1);
    map.on('move', handleMove);
    map.on('moveend', handleMove);
    map.on('zoom', handleMove);
    return () => {
      map.off('move', handleMove);
      map.off('moveend', handleMove);
      map.off('zoom', handleMove);
    };
  }, [map]);

  const floorDoors = getDoorsByFloor(floorId);
  const isInteracting = activeTool === 'select' || activeTool === 'door';

  return (
    <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
      <svg className="w-full h-full">
        {floorDoors.map((door) => {
          const wall = walls.find((w) => w.id === door.wallId);
          if (!wall) return null;

          const startNode = getNodeById(wall.startNodeId);
          const endNode = getNodeById(wall.endNodeId);
          if (!startNode || !endNode) return null;

          const screenPos = map.project(door.position.lngLat);
          const s = map.project(startNode.position);
          const e = map.project(endNode.position);
          const rotation = Math.atan2(e.y - s.y, e.x - s.x) * (180 / Math.PI);

          // Accurate Sizing
          const centerLngLat = door.position.lngLat;
          const widthMeters = door.width;
          const metersPerDegreeLng = 111320 * Math.cos((centerLngLat[1] * Math.PI) / 180);
          const deltaLng = widthMeters / metersPerDegreeLng;
          const point1 = map.project([centerLngLat[0], centerLngLat[1]]);
          const point2 = map.project([centerLngLat[0] + deltaLng, centerLngLat[1]]);
          // Use Euclidean distance to handle map rotation
          const dx = point2.x - point1.x;
          const dy = point2.y - point1.y;
          const widthPx = Math.sqrt(dx * dx + dy * dy);

          const heightPx = 10;
          const isSelected = door.id === selectedDoorId;
          // Red if normal, Blue if selected? Or stick to user request "red ones" but highlight selected
          const strokeColor = isSelected ? '#3b82f6' : '#ef4444';
          const strokeWidth = isSelected ? 3 : 2;

          return (
            <g
              key={door.id}
              transform={`translate(${screenPos.x}, ${screenPos.y}) rotate(${rotation})`}
              className={isInteracting ? 'pointer-events-auto cursor-pointer' : ''}
              onClick={(e) => {
                e.stopPropagation();
                if (isInteracting) {
                  selectDoor(door.id);
                }
              }}
            >
              <rect
                x={-widthPx / 2}
                y={-heightPx / 2}
                width={widthPx}
                height={heightPx}
                fill="white"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                rx={1}
              />
              {/* Type Indicators */}
              {door.type === 'double' && (
                <line
                  x1={0}
                  y1={-heightPx / 2}
                  x2={0}
                  y2={heightPx / 2}
                  stroke={strokeColor}
                  strokeWidth={1}
                />
              )}
              {door.type === 'sliding' && (
                <path
                  d={`M ${-widthPx / 4} 0 L ${widthPx / 4} 0`}
                  stroke={strokeColor}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
