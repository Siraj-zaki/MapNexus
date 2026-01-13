/**
 * AddressSearch Page
 * Full-screen map with address search and "Antigravity" camera flow
 */

import { SearchBar } from '@/components/features/address-search';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ============================================
// Map Configuration Constants
// ============================================
const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

const MAP_CONFIG = {
  style: 'mapbox://styles/mapbox/dark-v11',
  initialView: {
    center: [0, 20] as [number, number],
    zoom: 2,
    pitch: 0,
    bearing: 0,
  },
  // "Antigravity" destination view - tilted 3D perspective
  destinationView: {
    zoom: 17,
    pitch: 60, // Tilted view for 3D depth effect
    bearing: -20, // Slight rotation for dynamic feel
  },
  // Animation timing
  animation: {
    duration: 3500, // 3.5 seconds for cinematic effect
    curve: 1.5, // Easing curve (higher = slower start/end)
  },
};

interface SelectedLocation {
  name: string;
  center: [number, number];
}

export default function AddressSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source'); // 'upload' or null

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [isFlying, setIsFlying] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_CONFIG.style,
      center: MAP_CONFIG.initialView.center,
      zoom: MAP_CONFIG.initialView.zoom,
      pitch: MAP_CONFIG.initialView.pitch,
      bearing: MAP_CONFIG.initialView.bearing,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Handle location selection with "Antigravity" camera flow
  const handleLocationSelect = (location: SelectedLocation) => {
    setSelectedLocation(location);
    setIsFlying(true);

    if (map.current) {
      // ============================================
      // "Antigravity" Cinematic Camera Animation
      // Google Earth style: Global → Destination with 3D tilt
      // ============================================
      map.current.flyTo({
        center: location.center,
        zoom: MAP_CONFIG.destinationView.zoom,
        pitch: MAP_CONFIG.destinationView.pitch,
        bearing: MAP_CONFIG.destinationView.bearing,
        duration: MAP_CONFIG.animation.duration,
        curve: MAP_CONFIG.animation.curve,
        essential: true,
      });

      // Add marker after animation starts
      setTimeout(() => {
        if (map.current) {
          if (marker.current) {
            marker.current.setLngLat(location.center);
          } else {
            marker.current = new mapboxgl.Marker({
              color: '#3b82f6',
            })
              .setLngLat(location.center)
              .addTo(map.current);
          }
        }
      }, MAP_CONFIG.animation.duration * 0.6); // Add marker 60% through flight

      // Reset flying state when animation completes
      map.current.once('moveend', () => {
        setIsFlying(false);
      });
    }
  };

  // Handle continue to define area
  const handleContinue = () => {
    if (selectedLocation) {
      // Save location for use in define-area and editor
      sessionStorage.setItem('addressSearchLocation', JSON.stringify(selectedLocation));
      sessionStorage.setItem('mapLocation', JSON.stringify(selectedLocation));

      // Always go to define-area to position the floor plan/capture area
      navigate(`/define-area?source=${source || 'address'}`);
    }
  };

  // Handle back
  const handleBack = () => {
    if (source === 'upload') {
      navigate('/upload');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading State */}
      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">{t('common.loading')}</p>
          </div>
        </div>
      )}

      {/* Back Button - Floating with proper icon */}
      <div className="absolute top-4 start-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-10 w-10 bg-neutral-800/90 backdrop-blur-sm shadow-lg hover:bg-neutral-700 border border-neutral-700 rounded-full text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Header */}
      <div className="absolute top-4 start-1/2 -translate-x-1/2 z-40 text-center">
        <h1 className="text-2xl font-bold text-white bg-neutral-900/80 backdrop-blur-sm px-6 py-2 rounded-xl shadow-lg border border-neutral-800/50">
          {t('addressSearch.title')}
        </h1>
      </div>

      {/* Search Bar */}
      <div className="absolute top-20 start-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4">
        <SearchBar onLocationSelect={handleLocationSelect} />
      </div>

      {/* Flying Indicator */}
      {isFlying && (
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
          <div className="bg-neutral-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl flex items-center gap-3 border border-neutral-800 shadow-2xl">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="font-medium">Flying to location...</span>
          </div>
        </div>
      )}

      {/* Selected Location Info & Continue - Bottom Card */}
      {selectedLocation && !isFlying && (
        <div className="absolute bottom-8 start-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4">
          <div className="bg-neutral-800 rounded-xl shadow-2xl p-4 border border-neutral-700">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-400">{t('addressSearch.selectedLocation')}</p>
                <p className="font-medium text-white truncate">{selectedLocation.name}</p>
              </div>
              <Button
                onClick={handleContinue}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
              >
                {t('addressSearch.continue')}
                <ArrowRight className="h-4 w-4 ms-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hint when no location selected */}
      {!selectedLocation && mapLoaded && (
        <div className="absolute bottom-8 start-1/2 -translate-x-1/2 z-40">
          <div className="bg-neutral-900/90 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg border border-neutral-800">
            <p className="text-neutral-400">{t('addressSearch.selectAddress')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
