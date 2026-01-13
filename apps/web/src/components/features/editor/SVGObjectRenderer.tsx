import { useEditorStore } from '@/stores/editorStore';
import { useObjectStore } from '@/stores/objectStore';
import { useEffect, useState } from 'react';

interface SVGObjectRendererProps {
  map: mapboxgl.Map;
  floorId: string;
}

export function SVGObjectRenderer({ map, floorId }: SVGObjectRendererProps) {
  const { getObjectsByFloor, selectObject, selectedObjectId } = useObjectStore();
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

  const floorObjects = getObjectsByFloor(floorId);
  const isInteracting = activeTool === 'select';

  // Helper to project radius (meters) to pixels using Mapbox projection
  // This ensures the SVG circle matches the map scale exactly
  const getScreenRadius = (centerLngLat: [number, number], radiusMeters: number) => {
    const centerPx = map.project(centerLngLat);
    // 1 degree lng ~= 111,320 meters * cos(lat)
    const metersPerDegree = 111320 * Math.cos((centerLngLat[1] * Math.PI) / 180);
    const deltaLng = radiusMeters / metersPerDegree;
    const edgePx = map.project([centerLngLat[0] + deltaLng, centerLngLat[1]]);
    return Math.hypot(edgePx.x - centerPx.x, edgePx.y - centerPx.y);
  };

  return (
    <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
      <svg className="w-full h-full">
        {floorObjects.map((obj) => {
          const isSelected = obj.id === selectedObjectId;
          const strokeColor = isSelected ? '#3b82f6' : obj.color;
          const strokeWidth = isSelected ? 3 : 1;
          const fillOpacity = Math.max(0.1, obj.opacity);

          if (obj.type === 'circle' && obj.center && obj.radius) {
            const screenCenter = map.project(obj.center.lngLat);
            const pxRadius = getScreenRadius(obj.center.lngLat, obj.radius);

            return (
              <circle
                key={obj.id}
                cx={screenCenter.x}
                cy={screenCenter.y}
                r={pxRadius}
                fill={obj.color}
                fillOpacity={fillOpacity}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className={
                  isInteracting
                    ? 'pointer-events-auto cursor-pointer'
                    : 'pointer-events-auto cursor-pointer'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  selectObject(obj.id);
                }}
              />
            );
          } else if (
            (obj.type === 'rectangle' || obj.type === 'polygon') &&
            obj.points.length > 0
          ) {
            const screenPoints = obj.points.map((p) => map.project(p.lngLat));
            const pointsStr = screenPoints.map((p) => `${p.x},${p.y}`).join(' ');

            return (
              <polygon
                key={obj.id}
                points={pointsStr}
                fill={obj.color}
                fillOpacity={fillOpacity}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className={
                  isInteracting
                    ? 'pointer-events-auto cursor-pointer'
                    : 'pointer-events-auto cursor-pointer'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  selectObject(obj.id);
                }}
              />
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}
