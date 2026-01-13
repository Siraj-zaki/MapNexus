/**
 * EditorCanvas Component
 *
 * Dark theme map for indoor map editing.
 * Displays floor plan overlay and handles wall drawing/rendering.
 */

import { useAuthStore } from '@/stores/authStore';
import { useEditorStore } from '@/stores/editorStore';
import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { WallDrawingTool } from './WallDrawingTool';
import { WallRenderer } from './WallRenderer';
import { ZoneDrawingTool } from './ZoneDrawingTool';
import { ZonePropertiesPanel } from './ZonePropertiesPanel';
import { ZoneRenderer } from './ZoneRenderer';

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
  const source = searchParams.get('type'); // 'upload', 'address', 'demo'

  const { token } = useAuthStore();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { setZoom, activeTool, isGridVisible, currentFloorId } = useEditorStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Get starting location from storage
    let center = DEFAULT_CENTER;
    let zoom = DEFAULT_ZOOM;
    let bearing = 0;

    // Load position from session storage
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

    // Fallback to location data
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
      pitch: 45, // Enable 3D perspective for wall extrusion
      bearing,
      antialias: true,
    });

    mapInstance = map.current;

    map.current.on('load', () => {
      setMapLoaded(true);

      // Load floor plan overlay if coming from upload flow
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

  // Load floor plan as image overlay
  const loadFloorPlanOverlay = async (mapInst: mapboxgl.Map) => {
    const positionData = sessionStorage.getItem('floorPlanPosition');
    const uploadedFloors = sessionStorage.getItem('uploadedFloors');

    if (!positionData || !uploadedFloors) {
      console.log('Missing position or floor data');
      return;
    }

    try {
      const position = JSON.parse(positionData);
      const floors = JSON.parse(uploadedFloors);

      if (!position.worldPosition || floors.length === 0) {
        console.log('Invalid position or empty floors');
        return;
      }

      const { center, width, height, bearing } = position.worldPosition;

      // Calculate the bounding box corners using Turf.js
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

      // Load the first floor's image
      const floor = floors[0];
      if (floor.imageUrl) {
        const imageUrl = `${BASE_URL}${floor.imageUrl}`;
        console.log('Loading floor plan from:', imageUrl);

        try {
          const response = await fetch(imageUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            console.log('Floor plan blob created:', blobUrl);

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

            // Fit map to the floor plan bounds
            const bbox = turf.bbox(polygon);
            mapInst.fitBounds(
              [
                [bbox[0], bbox[1]],
                [bbox[2], bbox[3]],
              ],
              { padding: 50, duration: 1000 }
            );

            console.log('Floor plan layer added successfully');
          } else {
            console.error('Failed to fetch floor plan:', response.status);
          }
        } catch (e) {
          console.error('Could not load floor plan image:', e);
        }
      }

      // Add boundary outline
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

  // Grid toggle
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    isGridVisible ? addGridLayer() : removeGridLayer();
  }, [isGridVisible, mapLoaded]);

  // Cursor based on tool
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

      {/* Wall Drawing Tool - Always render when map is loaded */}
      {mapLoaded && map.current && (
        <>
          <WallDrawingTool map={map.current} floorId={currentFloorId || 'floor-1'} />
          <WallRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
          <ZoneDrawingTool map={map.current} floorId={currentFloorId || 'floor-1'} />
          <ZoneRenderer map={map.current} floorId={currentFloorId || 'floor-1'} />
        </>
      )}

      {/* Zone Properties Panel */}
      {mapLoaded && <ZonePropertiesPanel />}

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

      {/* Wall tool hint */}
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
