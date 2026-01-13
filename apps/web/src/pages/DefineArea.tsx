/**
 * DefineArea Page
 *
 * Allows user to position their floor plan on the map with overlay preview.
 * Shows the uploaded floor plan inside the bounding box.
 */

import {
  BoundingBoxSelector,
  getBoundingBoxGeoJSON,
  type BoundingBoxState,
} from '@/components/features/address-search';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useEditorStore } from '@/stores/editorStore';
import * as turf from '@turf/turf';
import { ArrowLeft, Check, ImageIcon, Maximize2, Move, RotateCw } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ============================================
// Constants
// ============================================
const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const BASE_URL = API_URL.replace(/\/api$/, '');

const MAP_CONFIG = {
  style: 'mapbox://styles/mapbox/dark-v11',
  zoom: 18,
  pitch: 0,
  bearing: 0,
};

interface SelectedLocation {
  name: string;
  center: [number, number];
}

interface FloorData {
  name: string;
  level: number;
  imageUrl: string;
}

export default function DefineArea() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source'); // 'upload' or 'address'
  const { token } = useAuthStore();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [boundingBox, setBoundingBox] = useState<BoundingBoxState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [floorPlanBlobUrl, setFloorPlanBlobUrl] = useState<string | null>(null);
  const [uploadedFloors, setUploadedFloors] = useState<FloorData[] | null>(null);

  const [opacity, setOpacity] = useState(0.7);

  const { setMap: setEditorMap } = useEditorStore();

  // ... (keeping existing effects)

  // Update opacity only
  useEffect(() => {
    if (!mapInstance || !mapInstance.getLayer('floor-plan-preview')) return;
    mapInstance.setPaintProperty('floor-plan-preview', 'raster-opacity', opacity);
  }, [opacity, mapInstance]);

  // Update floor plan overlay position safely
  const updateFloorPlanOverlay = () => {
    if (!mapInstance || !floorPlanBlobUrl || !boundingBox) return;

    // Calculate corners from bounding box state
    const { center, width, height, bearing } = boundingBox;
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
    const imageCoords: [[number, number], [number, number], [number, number], [number, number]] = [
      coords[0] as [number, number], // NW
      coords[1] as [number, number], // NE
      coords[2] as [number, number], // SE
      coords[3] as [number, number], // SW
    ];

    const source = mapInstance.getSource('floor-plan-preview') as mapboxgl.ImageSource;

    if (source) {
      // Just update coordinates to avoid flickering
      source.setCoordinates(imageCoords);
    } else {
      // Create fresh if not exists
      mapInstance.addSource('floor-plan-preview', {
        type: 'image',
        url: floorPlanBlobUrl,
        coordinates: imageCoords,
      });

      mapInstance.addLayer({
        id: 'floor-plan-preview',
        type: 'raster',
        source: 'floor-plan-preview',
        paint: {
          'raster-opacity': opacity,
          'raster-fade-duration': 0,
        },
      });
    }
  };

  // Load location and floor data from session
  useEffect(() => {
    const stored = sessionStorage.getItem('addressSearchLocation');
    if (stored) {
      try {
        setLocation(JSON.parse(stored));
      } catch {
        navigate(`/address-search?source=${source || 'address'}`);
      }
    } else {
      navigate(`/address-search?source=${source || 'address'}`);
    }

    // Load uploaded floors
    const floorsData = sessionStorage.getItem('uploadedFloors');
    if (floorsData) {
      try {
        const floors = JSON.parse(floorsData);
        setUploadedFloors(floors);

        // Fetch the first floor's image for preview
        if (floors.length > 0 && floors[0].imageUrl) {
          fetchFloorPlanImage(floors[0].imageUrl);
        }
      } catch (e) {
        console.warn('Could not load floor data');
      }
    }
  }, [navigate, source]);

  // Fetch floor plan image and create blob URL
  const fetchFloorPlanImage = async (imageUrl: string) => {
    try {
      const fullUrl = `${BASE_URL}${imageUrl}`;
      const response = await fetch(fullUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setFloorPlanBlobUrl(blobUrl);
      }
    } catch (e) {
      console.warn('Could not fetch floor plan image:', e);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !location) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_CONFIG.style,
      center: location.center,
      zoom: MAP_CONFIG.zoom,
      pitch: MAP_CONFIG.pitch,
      bearing: MAP_CONFIG.bearing,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      setMapInstance(map.current);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [location]);

  // Update floor plan overlay when bounding box changes
  useEffect(() => {
    if (!mapInstance || !mapLoaded || !floorPlanBlobUrl || !boundingBox) return;

    updateFloorPlanOverlay();
  }, [mapInstance, mapLoaded, floorPlanBlobUrl, boundingBox]);

  // Handle complete - save position and navigate to editor
  const handleComplete = async () => {
    if (!boundingBox || !location) return;

    setIsLoading(true);

    try {
      const boundary = getBoundingBoxGeoJSON(boundingBox);

      const positionData = {
        boundary,
        worldPosition: {
          center: boundingBox.center,
          width: boundingBox.width,
          height: boundingBox.height,
          bearing: boundingBox.bearing,
        },
        locationName: location.name,
        source,
        opacity,
      };

      sessionStorage.setItem('floorPlanPosition', JSON.stringify(positionData));
      sessionStorage.setItem('mapLocation', JSON.stringify(location));

      const newMapId = `map-${Date.now()}`;

      let floors = [{ id: 'floor-1', name: '1F', level: 1 }];

      if (uploadedFloors && uploadedFloors.length > 0) {
        floors = uploadedFloors.map((f, i) => ({
          id: `floor-${i + 1}`,
          name: f.name || `Floor ${i + 1}`,
          level: f.level || i + 1,
          floorPlanUrl: f.imageUrl,
        }));
      }

      setEditorMap({
        id: newMapId,
        name: location.name.split(',')[0] || 'Untitled Map',
        floors,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      navigate(`/editor/${newMapId}?type=${source || 'address'}`);
    } catch (error) {
      console.error('Error completing setup:', error);
      navigate('/editor/new?type=upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/address-search?source=${source || 'address'}`);
  };

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (floorPlanBlobUrl) {
        URL.revokeObjectURL(floorPlanBlobUrl);
      }
    };
  }, [floorPlanBlobUrl]);

  if (!location) return null;

  const isUploadFlow = source === 'upload';
  const panelTitle = isUploadFlow ? 'Position Floor Plan' : t('addressSearch.defineArea');
  const panelDescription = isUploadFlow
    ? 'Align the box with your building location'
    : t('addressSearch.instructions');

  return (
    <div className="h-screen w-screen relative overflow-visible">
      <div ref={mapContainer} className="absolute inset-0" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">{t('common.loading')}</p>
          </div>
        </div>
      )}

      {mapLoaded && mapInstance && location && (
        <BoundingBoxSelector
          map={mapInstance}
          initialCenter={location.center}
          onChange={setBoundingBox}
        />
      )}

      {mapLoaded && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 50, minWidth: 320 }}>
          <div className="bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700">
            <div className="p-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-neutral-800/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                {panelTitle}
              </h2>
              <p className="text-sm text-neutral-400 mt-1">{panelDescription}</p>
            </div>

            {/* Opacity Slider */}
            {isUploadFlow && (
              <div className="px-4 py-3 border-b border-neutral-700 bg-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-neutral-400">
                    {t('editor.opacity')}
                  </label>
                  <span className="text-xs text-neutral-500">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            )}

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Move className="h-4 w-4 text-blue-500" />
                </div>
                <span>{t('addressSearch.instructionPan')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Maximize2 className="h-4 w-4 text-blue-500" />
                </div>
                <span>{t('addressSearch.instructionResize')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <RotateCw className="h-4 w-4 text-blue-500" />
                </div>
                <span>{t('addressSearch.instructionRotate')}</span>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-700 bg-neutral-800/50 flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 me-2" />
                {t('addressSearch.back')}
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <>
                    <Check className="h-4 w-4 me-2" />
                    {t('addressSearch.complete')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 50 }}>
        <div className="bg-neutral-800/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg max-w-xs border border-neutral-700">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Location</p>
          <p className="font-medium text-white truncate mt-0.5">{location.name}</p>
        </div>
      </div>
    </div>
  );
}
