/**
 * EditorCanvas Component
 *
 * Dark theme map for indoor map editing.
 * Displays floor plan overlay and handles wall drawing/rendering.
 */

import { useAuthStore } from '@/stores/authStore';
import { useDoorStore } from '@/stores/doorStore';
import { useEditorStore } from '@/stores/editorStore';
import { useObjectStore } from '@/stores/objectStore';
import { usePoiStore } from '@/stores/poiStore';
import { useWallStore } from '@/stores/wallStore';
import { useWindowStore } from '@/stores/windowStore';
import { useZoneStore } from '@/stores/zoneStore';
import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { DoorPlacementTool } from './DoorPlacementTool';
import { DoorPropertiesPanel } from './DoorPropertiesPanel';
import { ObjectDrawingTool } from './ObjectDrawingTool';
import { ObjectPropertiesPanel } from './ObjectPropertiesPanel';
import { ObjectRenderer } from './ObjectRenderer';
import { SVGDoorRenderer } from './SVGDoorRenderer';
import { SVGObjectRenderer } from './SVGObjectRenderer';
import { SVGWallRenderer } from './SVGWallRenderer';
import { SVGWindowRenderer } from './SVGWindowRenderer';
import { WallDrawingTool } from './WallDrawingTool';
import { WallRenderer } from './WallRenderer';
import { WindowPlacementTool } from './WindowPlacementTool';
import { WindowPropertiesPanel } from './WindowPropertiesPanel';
import { ZoneDrawingTool } from './ZoneDrawingTool';
import { ZonePropertiesPanel } from './ZonePropertiesPanel';
import { ZoneRenderer } from './ZoneRenderer';

// --- NEW IMPORTS ---
import { PoiPlacementTool } from './PoiPlacementTool';
import { PoiPropertiesPanel } from './PoiPropertiesPanel';
import { PoiRenderer } from './PoiRenderer';
// -------------------

// ============================================
// Constants
// ============================================
const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const BASE_URL = API_URL.replace(/\/api$/, '');

const DEFAULT_CENTER: [number, number] = [-74.006, 40.7128];
const DEFAULT_ZOOM = 18;

let mapInstance: mapboxgl.Map | null = null;
export function getMapInstance() {
  return mapInstance;
}

export function EditorCanvas() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('type');

  const { token } = useAuthStore();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { setZoom, activeTool, isGridVisible, currentFloorId, isPublished } = useEditorStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    let center = DEFAULT_CENTER;
    let zoom = DEFAULT_ZOOM;
    let bearing = 0;

    const positionData = sessionStorage.getItem('floorPlanPosition');
    if (positionData) {
      try {
        const data = JSON.parse(positionData);
        if (data.worldPosition?.center) {
          center = data.worldPosition.center;
          bearing = data.worldPosition.bearing || 0;
        }
      } catch (e) {
        console.warn('Could not parse position data');
      }
    }

    const locationData = sessionStorage.getItem('mapLocation');
    if (!positionData && locationData) {
      try {
        const data = JSON.parse(locationData);
        if (data.center) {
          center = data.center;
        }
      } catch (e) {
        console.warn('Could not parse location data');
      }
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom,
      pitch: 0,
      bearing,
      antialias: true,
    });

    mapInstance = map.current;

    map.current.on('load', () => {
      setMapLoaded(true);

      if (source === 'upload') {
        loadFloorPlanOverlay(map.current!);
      }

      if (map.current && isGridVisible) {
        addGridLayer();
      }
    });

    map.current.on('zoom', () => {
      if (map.current) {
        setZoom(Math.round(map.current.getZoom() * 10));
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
      mapInstance = null;
    };
  }, []);

  // Global Delete Handler
  const { selectedWallId, deleteWall, selectWall } = useWallStore();
  const { selectedDoorId, deleteDoor, selectDoor } = useDoorStore();
  const { selectedWindowId, deleteWindow, selectWindow } = useWindowStore();
  const { selectedZoneId, deleteZone, selectZone } = useZoneStore();
  const { selectedObjectId, deleteObject, selectObject } = useObjectStore();
  const { selectedPoiId, removePoi, selectPoi } = usePoiStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWallId) {
          deleteWall(selectedWallId);
          selectWall(null);
        }
        if (selectedDoorId) {
          deleteDoor(selectedDoorId);
          selectDoor(null);
        }
        if (selectedWindowId) {
          deleteWindow(selectedWindowId);
          selectWindow(null);
        }
        if (selectedZoneId) {
          deleteZone(selectedZoneId);
          selectZone(null);
        }
        if (selectedObjectId) {
          deleteObject(selectedObjectId);
          selectObject(null);
        }
        if (selectedPoiId) {
          removePoi(selectedPoiId);
          selectPoi(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedWallId,
    deleteWall,
    selectWall,
    selectedDoorId,
    deleteDoor,
    selectDoor,
    selectedWindowId,
    deleteWindow,
    selectWindow,
    selectedZoneId,
    deleteZone,
    selectZone,
    selectedObjectId,
    deleteObject,
    selectObject,
    selectedPoiId,
    removePoi,
    selectPoi,
  ]);

  const loadFloorPlanOverlay = async (mapInst: mapboxgl.Map) => {
    const positionData = sessionStorage.getItem('floorPlanPosition');
    const uploadedFloors = sessionStorage.getItem('uploadedFloors');

    if (!positionData || !uploadedFloors) return;

    try {
      const position = JSON.parse(positionData);
      const floors = JSON.parse(uploadedFloors);

      if (!position.worldPosition || floors.length === 0) return;

      const { center, width, height, bearing } = position.worldPosition;

      const halfWidthKm = width / 2 / 1000;
      const halfHeightKm = height / 2 / 1000;
      const centerPoint = turf.point(center);

      const north = turf.destination(centerPoint, halfHeightKm, 0);
      const south = turf.destination(centerPoint, halfHeightKm, 180);
      const nwPoint = turf.destination(north, halfWidthKm, -90);
      const nePoint = turf.destination(north, halfWidthKm, 90);
      const sePoint = turf.destination(south, halfWidthKm, 90);
      const swPoint = turf.destination(south, halfWidthKm, -90);

      let polygon = turf.polygon([
        [
          nwPoint.geometry.coordinates as [number, number],
          nePoint.geometry.coordinates as [number, number],
          sePoint.geometry.coordinates as [number, number],
          swPoint.geometry.coordinates as [number, number],
          nwPoint.geometry.coordinates as [number, number],
        ],
      ]);

      if (bearing !== 0) {
        polygon = turf.transformRotate(polygon, bearing, { pivot: center });
      }

      const coords = polygon.geometry.coordinates[0];
      const imageCoords: [[number, number], [number, number], [number, number], [number, number]] =
        [
          coords[0] as [number, number],
          coords[1] as [number, number],
          coords[2] as [number, number],
          coords[3] as [number, number],
        ];

      const floor = floors[0];
      if (floor.imageUrl) {
        const imageUrl = `${BASE_URL}${floor.imageUrl}`;
        try {
          const response = await fetch(imageUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            mapInst.addSource('floor-plan', {
              type: 'image',
              url: blobUrl,
              coordinates: imageCoords,
            });

            mapInst.addLayer({
              id: 'floor-plan-layer',
              type: 'raster',
              source: 'floor-plan',
              paint: {
                'raster-opacity': position.opacity || 0.85,
                'raster-fade-duration': 0,
              },
            });

            const bbox = turf.bbox(polygon);
            mapInst.fitBounds(
              [
                [bbox[0], bbox[1]],
                [bbox[2], bbox[3]],
              ],
              { padding: 50, duration: 1000 }
            );
          }
        } catch (e) {
          console.error('Could not load floor plan image:', e);
        }
      }

      mapInst.addSource('floor-boundary', {
        type: 'geojson',
        data: polygon,
      });

      mapInst.addLayer({
        id: 'floor-boundary-outline',
        type: 'line',
        source: 'floor-boundary',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [4, 4],
        },
      });
    } catch (e) {
      console.error('Could not load floor plan overlay:', e);
    }
  };

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    isGridVisible ? addGridLayer() : removeGridLayer();
  }, [isGridVisible, mapLoaded]);

  // Toggle Floor Plan visibility based on Publish Mode
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const visibility = isPublished ? 'none' : 'visible';

    if (map.current.getLayer('floor-plan-layer')) {
      map.current.setLayoutProperty('floor-plan-layer', 'visibility', visibility);
    }
    if (map.current.getLayer('floor-boundary-outline')) {
      map.current.setLayoutProperty('floor-boundary-outline', 'visibility', visibility);
    }
  }, [isPublished, mapLoaded]);

  useEffect(() => {
    if (!mapContainer.current) return;
    const cursors: Record<string, string> = {
      select: 'default',
      pan: 'grab',
      zone: 'crosshair',
      wall: 'crosshair',
      door: 'crosshair',
      window: 'crosshair',
      poi: 'crosshair',
      safety: 'crosshair',
      stairway: 'crosshair',
      elevator: 'crosshair',
      rectangle: 'crosshair',
      circle: 'crosshair',
      customObject: 'crosshair',
      path: 'crosshair',
      measure: 'crosshair',
      aiMapping: 'default',
    };
    mapContainer.current.style.cursor = cursors[activeTool] || 'default';
  }, [activeTool]);

  const addGridLayer = () => {
    if (!map.current) return;
    removeGridLayer();
    map.current.addLayer({
      id: 'grid-layer',
      type: 'background',
      paint: { 'background-color': 'transparent', 'background-opacity': 0.1 },
    });
  };

  const removeGridLayer = () => {
    if (map.current?.getLayer('grid-layer')) {
      map.current.removeLayer('grid-layer');
    }
  };

  return (
    <div className="absolute inset-0">
      <div
        ref={mapContainer}
        className="absolute inset-0"
        style={{ cursor: activeTool === 'pan' ? 'grab' : 'crosshair' }}
      />

      {mapLoaded && map.current && (
        <>
          <WallDrawingTool map={map.current} floorId={currentFloorId || 'floor-1'} />

          {/* --- NEW TOOLS & RENDERERS --- */}
          <PoiPlacementTool map={map.current} floorId={currentFloorId || 'floor-1'} />
          <PoiRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
          {/* ----------------------------- */}

          {isPublished ? (
            <>
              <ObjectRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
              <WallRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
            </>
          ) : (
            <>
              <SVGObjectRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
              <SVGWallRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
              <SVGDoorRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
              <SVGWindowRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
            </>
          )}
          <DoorPlacementTool map={map.current} floorId={currentFloorId || 'floor-1'} />
          <WindowPlacementTool map={map.current} floorId={currentFloorId || 'floor-1'} />
          <ObjectDrawingTool map={map.current} floorId={currentFloorId || 'floor-1'} />
          <ZoneDrawingTool map={map.current} floorId={currentFloorId || 'floor-1'} />
          <ZoneRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
        </>
      )}

      {mapLoaded && <ZonePropertiesPanel />}
      {mapLoaded && <DoorPropertiesPanel />}
      {mapLoaded && <WindowPropertiesPanel />}
      {mapLoaded && <ObjectPropertiesPanel />}

      {/* --- NEW PANEL --- */}
      {mapLoaded && <PoiPropertiesPanel />}
      {/* ----------------- */}

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">{t('common.loading')}</p>
          </div>
        </div>
      )}

      <div className="absolute top-16 start-3 z-10 px-3 py-1.5 rounded-lg bg-neutral-800/80 backdrop-blur-sm border border-neutral-700">
        <p className="text-xs text-neutral-400">
          {t('editor.activeTool')}:{' '}
          <span className="text-white">{t(`editor.tools.${activeTool}`)}</span>
        </p>
      </div>

      {activeTool === 'wall' && mapLoaded && (
        <div className="absolute bottom-24 start-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg bg-neutral-800/90 backdrop-blur-sm border border-neutral-700">
          <p className="text-sm text-neutral-300">
            <span className="text-blue-400 font-medium">Click and drag</span> to draw a wall •
            <span className="text-neutral-400 ml-2">Press Esc to cancel</span>
          </p>
        </div>
      )}
    </div>
  );
}
