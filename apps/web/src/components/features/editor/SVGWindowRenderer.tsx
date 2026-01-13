import { useEditorStore } from '@/stores/editorStore';
import { useWallStore } from '@/stores/wallStore';
import { useWindowStore } from '@/stores/windowStore';
import { useEffect, useState } from 'react';

interface SVGWindowRendererProps {
  map: mapboxgl.Map;
  floorId: string;
}

export function SVGWindowRenderer({ map, floorId }: SVGWindowRendererProps) {
  const { getWindowsByFloor, selectWindow, selectedWindowId } = useWindowStore();
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

  const floorWindows = getWindowsByFloor(floorId);
  const isInteracting = activeTool === 'select' || activeTool === 'window';

  return (
    <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
      <svg className="w-full h-full">
        {floorWindows.map((win) => {
          const wall = walls.find((w) => w.id === win.wallId);
          if (!wall) return null;

          const startNode = getNodeById(wall.startNodeId);
          const endNode = getNodeById(wall.endNodeId);
          if (!startNode || !endNode) return null;

          const screenPos = map.project(win.position.lngLat);
          const s = map.project(startNode.position);
          const e = map.project(endNode.position);
          const rotation = Math.atan2(e.y - s.y, e.x - s.x) * (180 / Math.PI);

          // Accurate Sizing
          const centerLngLat = win.position.lngLat;
          const widthMeters = win.width;
          const metersPerDegreeLng = 111320 * Math.cos((centerLngLat[1] * Math.PI) / 180);
          const deltaLng = widthMeters / metersPerDegreeLng;
          const point1 = map.project([centerLngLat[0], centerLngLat[1]]);
          const point2 = map.project([centerLngLat[0] + deltaLng, centerLngLat[1]]);

          const dx = point2.x - point1.x;
          const dy = point2.y - point1.y;
          const widthPx = Math.sqrt(dx * dx + dy * dy);

          const heightPx = 8;
          const isSelected = win.id === selectedWindowId;
          // Blue-ish color for windows
          const strokeColor = isSelected ? '#3b82f6' : '#0ea5e9'; // Blue-500 : Sky-500
          const fillColor = '#e0f2fe'; // Sky-100
          const strokeWidth = isSelected ? 3 : 2;

          return (
            <g
              key={win.id}
              transform={`translate(${screenPos.x}, ${screenPos.y}) rotate(${rotation})`}
              className={isInteracting ? 'pointer-events-auto cursor-pointer' : ''}
              onClick={(e) => {
                e.stopPropagation();
                if (isInteracting) {
                  selectWindow(win.id);
                }
              }}
            >
              {/* Window Frame */}
              <rect
                x={-widthPx / 2}
                y={-heightPx / 2}
                width={widthPx}
                height={heightPx}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                rx={0} // Sharp corners for windows maybe?
              />
              {/* Window Panes/Glass Line */}
              <line
                x1={-widthPx / 2}
                y1={0}
                x2={widthPx / 2}
                y2={0}
                stroke={strokeColor}
                strokeWidth={1}
              />

              {win.type === 'casement' && (
                <path
                  d={`M ${-widthPx / 2} ${-heightPx / 2} L 0 ${heightPx / 2} L ${widthPx / 2} ${
                    -heightPx / 2
                  }`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={0.5}
                  opacity={0.5}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
