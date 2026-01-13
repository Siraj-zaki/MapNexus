import { useWallStore } from '@/stores/wallStore';
import { useEffect, useState } from 'react';

interface SVGWallRendererProps {
  map: mapboxgl.Map;
  floorId: string;
}

// Mappedin-like colors
const COLORS = {
  wall: '#8b5cf6', // Purple
  node: '#ffffff', // White
  nodeBorder: '#8b5cf6', // Purple
};

import { useEditorStore } from '@/stores/editorStore';

export function SVGWallRenderer({ map, floorId }: SVGWallRendererProps) {
  const { walls, nodes, getNodeById, selectWall, selectedWallId } = useWallStore();
  const { activeTool } = useEditorStore();
  const [_, setTick] = useState(0);

  // Force re-render on map move
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

  // Filter walls for current floor
  const floorWalls = walls.filter((w) => w.floorId === floorId);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      <svg className="w-full h-full">
        {/* Render Lines (Walls) */}
        {floorWalls.map((wall) => {
          const startNode = getNodeById(wall.startNodeId);
          const endNode = getNodeById(wall.endNodeId);

          if (!startNode || !endNode) return null;

          const start = map.project(startNode.position);
          const end = map.project(endNode.position);

          const isSelected = wall.id === selectedWallId;
          const isInteracting = activeTool === 'select';
          const strokeColor = isSelected ? '#3b82f6' : COLORS.wall;

          return (
            <g
              key={wall.id}
              onClick={(e) => {
                if (isInteracting) {
                  e.stopPropagation();
                  selectWall(wall.id);
                }
              }}
              className={isInteracting ? 'pointer-events-auto cursor-pointer' : ''}
            >
              {/* Hit Area (Invisible, thicker) */}
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="transparent"
                strokeWidth={15}
                strokeLinecap="round"
              />
              {/* Visible Wall */}
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={strokeColor}
                strokeWidth={isSelected ? 6 : 4}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Render Nodes (Joints) - Only those involved in current floor walls to avoid clutter? 
            Or all nodes? Let's just render nodes used by floorWalls for cleanliness.
         */}
        {nodes
          .filter((node) =>
            floorWalls.some((w) => w.startNodeId === node.id || w.endNodeId === node.id)
          )
          .map((node) => {
            const p = map.project(node.position);
            return (
              <circle
                key={node.id}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={COLORS.node}
                stroke={COLORS.nodeBorder}
                strokeWidth={2}
              />
            );
          })}
      </svg>
    </div>
  );
}
