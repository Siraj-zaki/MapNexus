/**
 * ZoneDrawingTool Component
 *
 * Handles polygon drawing for zones when Zone tool is active.
 * Click to add points, double-click to finish the polygon.
 * Supports panning/zooming while drawing by using Mapbox native events.
 */

import { useEditorStore } from '@/stores/editorStore';
import { useZoneStore } from '@/stores/zoneStore';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ZoneDrawingToolProps {
  map: mapboxgl.Map;
  floorId: string;
}

interface Point {
  x: number;
  y: number;
  lngLat: [number, number];
}

const SNAP_THRESHOLD_PX = 10;

export function ZoneDrawingTool({ map, floorId }: ZoneDrawingToolProps) {
  const { activeTool } = useEditorStore();
  const {
    drawing,
    selectedZoneId,
    startDrawing,
    addPoint,
    updateTempPoint,
    finishDrawing,
    cancelDrawing,
    selectZone,
  } = useZoneStore();

  const isZoneTool = activeTool === 'zone';
  const isSelectTool = activeTool === 'select';
  const lastClickTime = useRef<number>(0);
  const isDragging = useRef(false);

  // Current mouse position for preview
  const [mousePos, setMousePos] = useState<Point | null>(null);

  // Force re-render on map move to update SVG overlay
  const [, setMapMoveCounter] = useState(0);

  useEffect(() => {
    const handleMove = () => setMapMoveCounter((c) => c + 1);
    map.on('move', handleMove);
    return () => {
      map.off('move', handleMove);
    };
  }, [map]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawing.isActive) {
          cancelDrawing();
        }
        selectZone(null);
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedZoneId) {
        e.preventDefault();
        useZoneStore.getState().deleteZone(selectedZoneId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawing.isActive, cancelDrawing, selectedZoneId, selectZone]);

  // Check if near first point (for closing polygon)
  const isNearFirstPoint = useCallback(
    (x: number, y: number): boolean => {
      const state = useZoneStore.getState();
      if (state.drawing.points.length < 3) return false;
      const firstPoint = state.drawing.points[0];
      const screenPos = map.project(firstPoint);
      const dist = Math.sqrt((screenPos.x - x) ** 2 + (screenPos.y - y) ** 2);
      return dist < SNAP_THRESHOLD_PX;
    },
    [map]
  );

  // Map Event Listeners
  useEffect(() => {
    if (!isZoneTool) return;

    // Disable default double-click zoom to handle double-click for finishing drawing
    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = 'crosshair';

    const onMouseDown = () => {
      isDragging.current = false;
    };

    const onMoveStart = () => {
      isDragging.current = true;
    };

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      if (isDragging.current) return;

      const position: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const { x, y } = e.point;
      const state = useZoneStore.getState();

      const now = Date.now();
      const isDoubleClick = now - lastClickTime.current < 300;
      lastClickTime.current = now;

      if (!state.drawing.isActive) {
        startDrawing();
        addPoint(position);
      } else {
        // Check for double-click or closing polygon
        if (isDoubleClick || isNearFirstPoint(x, y)) {
          finishDrawing(floorId);
        } else {
          addPoint(position);
        }
      }
    };

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const state = useZoneStore.getState();
      if (state.drawing.isActive) {
        updateTempPoint([e.lngLat.lng, e.lngLat.lat]);
      }
      setMousePos({
        x: e.point.x,
        y: e.point.y,
        lngLat: [e.lngLat.lng, e.lngLat.lat],
      });
    };

    const onDblClick = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault();
      const state = useZoneStore.getState();
      if (state.drawing.isActive) {
        finishDrawing(floorId);
      }
    };

    map.on('mousedown', onMouseDown);
    map.on('movestart', onMoveStart); // Better than 'drag' as it captures all moves
    map.on('click', onClick);
    map.on('mousemove', onMouseMove);
    map.on('dblclick', onDblClick);

    return () => {
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
      map.off('mousedown', onMouseDown);
      map.off('movestart', onMoveStart);
      map.off('click', onClick);
      map.off('mousemove', onMouseMove);
      map.off('dblclick', onDblClick);
    };
  }, [
    isZoneTool,
    map,
    floorId,
    startDrawing,
    addPoint,
    updateTempPoint,
    finishDrawing,
    isNearFirstPoint,
  ]);

  // Convert geo coords to screen coords
  const toScreen = useCallback(
    (coords: [number, number]): Point => {
      const screen = map.project(coords);
      return { x: screen.x, y: screen.y, lngLat: coords };
    },
    [map]
  );

  // Don't render if not zone or select tool
  if (!isZoneTool && !isSelectTool) return null;

  const screenPoints = drawing.points.map(toScreen);
  const showClosingIndicator = mousePos && isNearFirstPoint(mousePos.x, mousePos.y);

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none' }} // Allow events to pass through to map
    >
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        style={{ pointerEvents: 'none' }}
      >
        {/* Drawing preview polygon */}
        {isZoneTool && drawing.isActive && screenPoints.length > 0 && (
          <>
            {/* Filled preview polygon */}
            {screenPoints.length >= 2 && mousePos && (
              <polygon
                points={[...screenPoints, mousePos].map((p) => `${p.x},${p.y}`).join(' ')}
                fill="#3b82f6"
                fillOpacity={0.2}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="6,4"
              />
            )}

            {/* Lines between points */}
            {screenPoints.map((point, i) => {
              const nextPoint = screenPoints[i + 1];
              if (!nextPoint) return null;
              return (
                <line
                  key={i}
                  x1={point.x}
                  y1={point.y}
                  x2={nextPoint.x}
                  y2={nextPoint.y}
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              );
            })}

            {/* Line to cursor */}
            {mousePos && screenPoints.length > 0 && (
              <line
                x1={screenPoints[screenPoints.length - 1].x}
                y1={screenPoints[screenPoints.length - 1].y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="6,4"
              />
            )}

            {/* Point markers */}
            {screenPoints.map((point, i) => (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={i === 0 ? 8 : 6}
                fill={i === 0 ? '#22c55e' : '#3b82f6'}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}

            {/* Closing indicator */}
            {showClosingIndicator && (
              <circle
                cx={screenPoints[0].x}
                cy={screenPoints[0].y}
                r={15}
                fill="transparent"
                stroke="#22c55e"
                strokeWidth={3}
                strokeDasharray="4,2"
              />
            )}
          </>
        )}
      </svg>

      {/* Instructions */}
      {isZoneTool && !drawing.isActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-neutral-900/90 text-neutral-300 text-sm px-4 py-2 rounded-lg border border-neutral-700">
            Click to start drawing zone • Drag to pan • Double-click to finish
          </div>
        </div>
      )}

      {isZoneTool && drawing.isActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-neutral-900/90 text-neutral-300 text-sm px-4 py-2 rounded-lg border border-neutral-700">
            {drawing.points.length < 3
              ? `Add ${3 - drawing.points.length} more point${
                  3 - drawing.points.length > 1 ? 's' : ''
                } to create zone`
              : 'Click first point or double-click to finish • Drag to pan • ESC to cancel'}
          </div>
        </div>
      )}
    </div>
  );
}
