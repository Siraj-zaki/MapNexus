import { useEditorStore } from '@/stores/editorStore';
import { useObjectStore } from '@/stores/objectStore';
import * as turf from '@turf/turf';
import { useEffect, useState } from 'react';

interface ObjectDrawingToolProps {
  map: mapboxgl.Map;
  floorId: string;
}

export function ObjectDrawingTool({ map, floorId }: ObjectDrawingToolProps) {
  const { activeTool } = useEditorStore();
  const { addObject, selectObject } = useObjectStore();

  const isRectangle = activeTool === 'rectangle';
  const isCircle = activeTool === 'circle';
  const isCustom = activeTool === 'customObject';
  const isActive = isRectangle || isCircle || isCustom;

  // State for drawing
  const [startPoint, setStartPoint] = useState<{
    x: number;
    y: number;
    lngLat: [number, number];
  } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{
    x: number;
    y: number;
    lngLat: [number, number];
  } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<
    { x: number; y: number; lngLat: [number, number] }[]
  >([]);

  // Reset state when tool changes
  useEffect(() => {
    setStartPoint(null);
    setCurrentPoint(null);
    setPolygonPoints([]);
  }, [activeTool]);

  useEffect(() => {
    if (!isActive) return;

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      setCurrentPoint({ x: e.point.x, y: e.point.y, lngLat: [e.lngLat.lng, e.lngLat.lat] });
    };

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const point = {
        x: e.point.x,
        y: e.point.y,
        lngLat: [e.lngLat.lng, e.lngLat.lat] as [number, number],
      };

      if (isRectangle || isCircle) {
        if (!startPoint) {
          setStartPoint(point);
        } else {
          // Finish drawing
          finishShape(startPoint, point);
        }
      } else if (isCustom) {
        setPolygonPoints((prev) => [...prev, point]);
      }
    };

    const onDblClick = (e: mapboxgl.MapMouseEvent) => {
      if (isCustom) {
        e.preventDefault(); // Prevent zoom
        if (polygonPoints.length >= 3) {
          finishPolygon();
        }
      }
    };

    // Key handler for Enter to finish polygon
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isCustom && polygonPoints.length >= 3) {
        finishPolygon();
      }
      if (e.key === 'Escape') {
        setStartPoint(null);
        setPolygonPoints([]);
        setCurrentPoint(null);
      }
    };

    map.on('mousemove', onMouseMove);
    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isActive, isRectangle, isCircle, isCustom, startPoint, polygonPoints, map, floorId]);

  const finishShape = (start: any, end: any) => {
    if (isRectangle) {
      // Create 4 points based on SCREEN coordinates to preserve orientation
      const x1 = Math.min(start.x, end.x);
      const x2 = Math.max(start.x, end.x);
      const y1 = Math.min(start.y, end.y);
      const y2 = Math.max(start.y, end.y);

      // Unproject the 4 screen corners
      const points = [
        map.unproject([x1, y1]),
        map.unproject([x2, y1]),
        map.unproject([x2, y2]),
        map.unproject([x1, y2]),
      ].map((lngLat) => ({
        lngLat: [lngLat.lng, lngLat.lat] as [number, number],
        x: 0,
        y: 0, // Unused for storage
      }));

      addObject({
        floorId,
        type: 'rectangle',
        name: 'New Rectangle',
        color: '#fcdf03',
        opacity: 1, // FIX: Default to 1 (Solid)
        height: 2.5,
        baseHeight: 0,
        points: points,
        radius: 0,
      });

      setStartPoint(null);
      setTimeout(() => {
        const state = useObjectStore.getState();
        const latest = state.objects[state.objects.length - 1];
        if (latest) selectObject(latest.id);
      }, 50);
    } else if (isCircle) {
      const center = turf.point(start.lngLat);
      const edge = turf.point(end.lngLat);

      // Calculate distance strictly in meters
      const radiusMeters = turf.distance(center, edge, { units: 'meters' });

      addObject({
        floorId,
        type: 'circle',
        name: 'New Circle',
        color: '#fcdf03',
        opacity: 1, // FIX: Default to 1 (Solid)
        height: 1,
        baseHeight: 0,
        center: start,
        points: [],
        radius: radiusMeters,
      });

      setStartPoint(null);
      setTimeout(() => {
        const state = useObjectStore.getState();
        const latest = state.objects[state.objects.length - 1];
        if (latest) selectObject(latest.id);
      }, 50);
    }
  };

  const finishPolygon = () => {
    if (polygonPoints.length < 3) return;

    addObject({
      floorId,
      type: 'polygon',
      name: 'New Object',
      color: '#fcdf03',
      opacity: 1, // FIX: Default to 1 (Solid)
      height: 1,
      baseHeight: 0,
      points: polygonPoints,
    });

    setPolygonPoints([]);
    setTimeout(() => {
      const state = useObjectStore.getState();
      const latest = state.objects[state.objects.length - 1];
      if (latest) selectObject(latest.id);
    }, 50);
  };

  // Helper: Calculate screen radius from meter radius ensuring projection consistency
  const getScreenRadius = (centerLngLat: [number, number], radiusMeters: number) => {
    const centerPx = map.project(centerLngLat);
    // 1 degree lng ~= 111,320 meters * cos(lat)
    const metersPerDegree = 111320 * Math.cos((centerLngLat[1] * Math.PI) / 180);
    const deltaLng = radiusMeters / metersPerDegree;
    const edgePx = map.project([centerLngLat[0] + deltaLng, centerLngLat[1]]);
    return Math.hypot(edgePx.x - centerPx.x, edgePx.y - centerPx.y);
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
      <svg className="w-full h-full">
        {/* Rectangle Preview */}
        {isRectangle && startPoint && currentPoint && (
          <polygon
            points={[
              `${Math.min(startPoint.x, currentPoint.x)},${Math.min(startPoint.y, currentPoint.y)}`,
              `${Math.max(startPoint.x, currentPoint.x)},${Math.min(startPoint.y, currentPoint.y)}`,
              `${Math.max(startPoint.x, currentPoint.x)},${Math.max(startPoint.y, currentPoint.y)}`,
              `${Math.min(startPoint.x, currentPoint.x)},${Math.max(startPoint.y, currentPoint.y)}`,
            ].join(' ')}
            fill="#fcdf03"
            fillOpacity={0.3}
            stroke="#fcdf03"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        )}

        {/* Circle Preview */}
        {isCircle && startPoint && currentPoint && (
          <circle
            cx={startPoint.x}
            cy={startPoint.y}
            r={(() => {
              const rMeters = turf.distance(
                turf.point(startPoint.lngLat),
                turf.point(currentPoint.lngLat),
                { units: 'meters' }
              );
              return getScreenRadius(startPoint.lngLat, rMeters);
            })()}
            fill="#fcdf03"
            fillOpacity={0.3}
            stroke="#fcdf03"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        )}

        {/* Polygon Preview */}
        {isCustom && (
          <>
            <polyline
              points={
                polygonPoints.map((p) => `${p.x},${p.y}`).join(' ') +
                (currentPoint ? ` ${currentPoint.x},${currentPoint.y}` : '')
              }
              fill="none"
              stroke="#fcdf03"
              strokeWidth={2}
            />
            {currentPoint && polygonPoints.length > 0 && (
              <line
                x1={polygonPoints[polygonPoints.length - 1].x}
                y1={polygonPoints[polygonPoints.length - 1].y}
                x2={currentPoint.x}
                y2={currentPoint.y}
                stroke="#fcdf03"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}
            {currentPoint && polygonPoints.length >= 2 && (
              <line
                x1={currentPoint.x}
                y1={currentPoint.y}
                x2={polygonPoints[0].x}
                y2={polygonPoints[0].y}
                stroke="#fcdf03"
                strokeWidth={1}
                strokeOpacity={0.5}
                strokeDasharray="2 2"
              />
            )}
          </>
        )}

        {currentPoint && (
          <circle cx={currentPoint.x} cy={currentPoint.y} r={4} fill="white" stroke="black" />
        )}
      </svg>
    </div>
  );
}
