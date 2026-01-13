import { useEditorStore } from '@/stores/editorStore';
import { useWallStore } from '@/stores/wallStore';
import * as turf from '@turf/turf';
import { useCallback, useEffect, useRef, useState } from 'react';

interface WallDrawingToolProps {
  map: mapboxgl.Map;
  floorId: string;
}

interface Point {
  x: number;
  y: number;
  lngLat: [number, number];
}

// Mappedin-like colors
const COLORS = {
  active: '#8b5cf6', // Purple (like video)
  snap: '#22c55e', // Green
  guide: '#cbd5e1', // Light gray
};

const SNAP_THRESHOLD_PX = 5; // Distance to snap to existing nodes

export function WallDrawingTool({ map, floorId }: WallDrawingToolProps) {
  const { activeTool } = useEditorStore();
  const {
    drawing,
    nodes,
    startDrawing,
    confirmSegment,
    finishDrawing,
    cancelDrawing,
    getNodeById,
  } = useWallStore();

  const isWallTool = activeTool === 'wall';

  // Local state for rendering the SVG overlay
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [wallLength, setWallLength] = useState<number>(0);
  const [isOrtho, setIsOrtho] = useState(false); // Is the line currently snapped straight?

  // Refs for event handling to avoid closure staleness
  const drawingRef = useRef(drawing);
  const nodesRef = useRef(nodes);

  // Sync refs
  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Reset drawing when switching tools
  useEffect(() => {
    if (!isWallTool && drawing.isActive) {
      cancelDrawing();
    }
  }, [isWallTool, drawing.isActive, cancelDrawing]);

  // ---------------------------------------------------------------------------
  // Helper: Calculate Snap & Ortho Logic
  // ---------------------------------------------------------------------------
  const getSnappedPoint = useCallback(
    (e: mapboxgl.MapMouseEvent): Point => {
      const screenPoint = e.point;
      const lngLat = e.lngLat;

      let result: Point = {
        x: screenPoint.x,
        y: screenPoint.y,
        lngLat: [lngLat.lng, lngLat.lat],
      };

      let snappedToNode = false;

      // 1. Snap to existing nodes (Magnetic snap)
      for (const node of nodesRef.current) {
        const nodeScreen = map.project(node.position);
        const dist = Math.sqrt(
          Math.pow(nodeScreen.x - screenPoint.x, 2) + Math.pow(nodeScreen.y - screenPoint.y, 2)
        );

        if (dist < SNAP_THRESHOLD_PX) {
          result = {
            x: nodeScreen.x,
            y: nodeScreen.y,
            lngLat: node.position,
          };
          snappedToNode = true;
          break;
        }
      }

      // 2. Orthogonal Snapping (Straight Lines) - Only if drawing is active & not snapped to a node
      if (drawingRef.current.isActive && drawingRef.current.startNodeId && !snappedToNode) {
        const startNode = getNodeById(drawingRef.current.startNodeId);
        if (startNode) {
          const startScreen = map.project(startNode.position);
          const dx = Math.abs(screenPoint.x - startScreen.x);
          const dy = Math.abs(screenPoint.y - startScreen.y);

          // If moving mostly horizontal or vertical, snap to axis
          if (dx < 20 || dy < 20) {
            // Threshold to trigger straight line
            setIsOrtho(true);
            if (dx < dy) {
              // Snap Vertical (Keep X same as start)
              const newLngLat = map.unproject([startScreen.x, screenPoint.y]);
              result = {
                x: startScreen.x,
                y: screenPoint.y,
                lngLat: [newLngLat.lng, newLngLat.lat],
              };
            } else {
              // Snap Horizontal (Keep Y same as start)
              const newLngLat = map.unproject([screenPoint.x, startScreen.y]);
              result = {
                x: screenPoint.x,
                y: startScreen.y,
                lngLat: [newLngLat.lng, newLngLat.lat],
              };
            }
          } else {
            setIsOrtho(false);
          }
        }
      } else {
        setIsOrtho(false);
      }

      return result;
    },
    [map, getNodeById]
  );

  // ---------------------------------------------------------------------------
  // Mapbox Event Listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isWallTool) return;

    // Disable double click zoom so we can use double click to finish wall
    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = 'crosshair';

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const point = getSnappedPoint(e);
      setCursorPos(point);

      // Update start point visual if drawing
      if (drawingRef.current.isActive && drawingRef.current.startNodeId) {
        const startNode = getNodeById(drawingRef.current.startNodeId);
        if (startNode) {
          const startScreen = map.project(startNode.position);
          setStartPoint({
            x: startScreen.x,
            y: startScreen.y,
            lngLat: startNode.position,
          });

          // Calculate length
          const from = turf.point(startNode.position);
          const to = turf.point(point.lngLat);
          setWallLength(turf.distance(from, to, { units: 'meters' }));
        }
      } else {
        setStartPoint(null);
        setWallLength(0);
      }
    };

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      // Mapbox 'click' only fires if it wasn't a drag/pan,
      // so this naturally handles the "Pan vs Click" distinction.

      const point = getSnappedPoint(e);

      if (!drawingRef.current.isActive) {
        startDrawing(floorId, point.lngLat);
      } else {
        confirmSegment(floorId, point.lngLat);
      }
    };

    const onDblClick = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault(); // Stop zoom
      if (drawingRef.current.isActive) {
        finishDrawing();
        setStartPoint(null);
        setWallLength(0);
      }
    };

    // Bind events
    map.on('mousemove', onMouseMove);
    map.on('click', onClick);
    map.on('dblclick', onDblClick);

    // Cleanup
    return () => {
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
      map.off('mousemove', onMouseMove);
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
    };
  }, [
    isWallTool,
    map,
    floorId,
    getSnappedPoint,
    startDrawing,
    confirmSegment,
    finishDrawing,
    getNodeById,
  ]);

  // ---------------------------------------------------------------------------
  // Sync SVG overlay during Map Pan/Zoom
  // ---------------------------------------------------------------------------
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isWallTool) return;
    const handleMapMove = () => {
      // Force re-render of SVG overlay when map moves
      setTick((t) => t + 1);

      // Update start point position if we are mid-drawing
      if (drawingRef.current.isActive && drawingRef.current.startNodeId) {
        const startNode = getNodeById(drawingRef.current.startNodeId);
        if (startNode) {
          const s = map.project(startNode.position);
          setStartPoint({ x: s.x, y: s.y, lngLat: startNode.position });
        }
      }

      // Note: We don't update cursorPos here because mousemove handles that,
      // and if we are just panning, the cursor stays relative to screen anyway.
    };

    map.on('move', handleMapMove);
    return () => {
      map.off('move', handleMapMove);
    };
  }, [map, isWallTool, getNodeById]);

  if (!isWallTool) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <svg className="w-full h-full">
        {/* 1. The "Ghost" Wall (Current Segment) */}
        {drawing.isActive && startPoint && cursorPos && (
          <>
            {/* Thick semi-transparent fill */}
            <line
              x1={startPoint.x}
              y1={startPoint.y}
              x2={cursorPos.x}
              y2={cursorPos.y}
              stroke={COLORS.active}
              strokeWidth={10}
              strokeOpacity={0.3}
              strokeLinecap="square"
            />
            {/* Thin solid guide line */}
            <line
              x1={startPoint.x}
              y1={startPoint.y}
              x2={cursorPos.x}
              y2={cursorPos.y}
              stroke={COLORS.active}
              strokeWidth={2}
              strokeDasharray={isOrtho ? '0' : '5,5'} // Solid if straight, dashed if freeform
            />
          </>
        )}

        {/* 2. Cursor Indicator */}
        {cursorPos && (
          <g transform={`translate(${cursorPos.x}, ${cursorPos.y})`}>
            {/* Outer Ring */}
            <circle
              r={8}
              fill="none"
              stroke={drawing.isActive ? COLORS.active : COLORS.guide}
              strokeWidth={2}
            />
            {/* Inner Dot */}
            <circle r={3} fill={drawing.isActive ? COLORS.active : COLORS.guide} />
          </g>
        )}

        {/* 3. Start Point Indicator */}
        {startPoint && (
          <circle
            cx={startPoint.x}
            cy={startPoint.y}
            r={5}
            fill="white"
            stroke={COLORS.active}
            strokeWidth={2}
          />
        )}
      </svg>

      {/* 4. Length Tooltip (Mappedin Style) */}
      {drawing.isActive && cursorPos && wallLength > 0 && (
        <div
          className="absolute px-2 py-1 bg-neutral-900 text-white text-xs font-bold rounded shadow-lg transform -translate-x-1/2 -translate-y-full"
          style={{
            left: cursorPos.x,
            top: cursorPos.y - 15,
          }}
        >
          {wallLength.toFixed(2)}m
        </div>
      )}

      {/* 5. Helper Text */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-gray-200 text-sm text-gray-600">
        {drawing.isActive
          ? 'Click to add corner • Double-click to finish'
          : 'Click anywhere to start drawing'}
      </div>
    </div>
  );
}
