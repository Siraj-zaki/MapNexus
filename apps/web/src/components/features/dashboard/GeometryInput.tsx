/**
 * GeometryInput Component
 * Map-based input for Point, Polygon, and LineString geometry types
 */

import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check, Copy, Locate, MapPin, PenTool, Trash2 } from 'lucide-react';

// Set Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export type GeometryType = 'Point' | 'Polygon' | 'LineString';

export interface GeoJSONGeometry {
  type: GeometryType;
  coordinates: number[] | number[][] | number[][][];
}

interface GeometryInputProps {
  value?: GeoJSONGeometry | null;
  onChange: (geometry: GeoJSONGeometry | null) => void;
  geometryType: GeometryType;
  className?: string;
  height?: number;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  disabled?: boolean;
}

export function GeometryInput({
  value,
  onChange,
  geometryType,
  className,
  height = 300,
  defaultCenter = [-73.9857, 40.7484], // NYC
  defaultZoom = 12,
  disabled = false,
}: GeometryInputProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentGeometry, setCurrentGeometry] = useState<GeoJSONGeometry | null>(value || null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: defaultCenter,
      zoom: defaultZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Initialize drawing tools for Polygon/LineString
    if (geometryType !== 'Point') {
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: geometryType === 'Polygon',
          line_string: geometryType === 'LineString',
          trash: true,
        },
        defaultMode: 'simple_select',
        styles: [
          {
            id: 'gl-draw-polygon-fill',
            type: 'fill',
            filter: ['all', ['==', '$type', 'Polygon']],
            paint: {
              'fill-color': '#3b82f6',
              'fill-opacity': 0.3,
            },
          },
          {
            id: 'gl-draw-polygon-stroke',
            type: 'line',
            filter: ['all', ['==', '$type', 'Polygon']],
            paint: {
              'line-color': '#3b82f6',
              'line-width': 2,
            },
          },
          {
            id: 'gl-draw-line',
            type: 'line',
            filter: ['all', ['==', '$type', 'LineString']],
            paint: {
              'line-color': '#22c55e',
              'line-width': 3,
            },
          },
          {
            id: 'gl-draw-point',
            type: 'circle',
            filter: ['all', ['==', '$type', 'Point']],
            paint: {
              'circle-radius': 6,
              'circle-color': '#f59e0b',
            },
          },
        ],
      });

      map.current.addControl(draw.current);

      map.current.on('draw.create', updateGeometryFromDraw);
      map.current.on('draw.update', updateGeometryFromDraw);
      map.current.on('draw.delete', () => {
        setCurrentGeometry(null);
        onChange(null);
      });
    }

    map.current.on('load', () => {
      setIsMapLoaded(true);
    });

    // For Point type, handle clicks directly
    if (geometryType === 'Point') {
      map.current.on('click', handleMapClick);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [geometryType]);

  // Update geometry from draw tools
  const updateGeometryFromDraw = useCallback(() => {
    if (!draw.current) return;

    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const feature = data.features[data.features.length - 1];
      const geom = feature.geometry as GeoJSONGeometry;
      setCurrentGeometry(geom);
      onChange(geom);
    }
  }, [onChange]);

  // Handle map click for Point geometry
  const handleMapClick = useCallback(
    (e: mapboxgl.MapMouseEvent) => {
      if (disabled || geometryType !== 'Point') return;

      const { lng, lat } = e.lngLat;
      const geometry: GeoJSONGeometry = {
        type: 'Point',
        coordinates: [lng, lat],
      };

      setCurrentGeometry(geometry);
      onChange(geometry);

      // Update marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else if (map.current) {
        marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([lng, lat])
          .addTo(map.current);
      }

      // Update manual inputs
      setManualLat(lat.toFixed(6));
      setManualLng(lng.toFixed(6));
    },
    [disabled, geometryType, onChange]
  );

  // Load existing geometry
  useEffect(() => {
    if (!isMapLoaded || !value) return;

    if (geometryType === 'Point' && value.type === 'Point') {
      const [lng, lat] = value.coordinates as number[];
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else if (map.current) {
        marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([lng, lat])
          .addTo(map.current);
      }
      map.current?.flyTo({ center: [lng, lat], zoom: 15 });
      setManualLat(lat.toFixed(6));
      setManualLng(lng.toFixed(6));
    } else if (draw.current && (value.type === 'Polygon' || value.type === 'LineString')) {
      draw.current.deleteAll();
      draw.current.add({
        type: 'Feature',
        properties: {},
        geometry: value,
      });

      // Fit bounds to geometry
      if (map.current) {
        const coords =
          value.type === 'Polygon'
            ? (value.coordinates as number[][][])[0]
            : (value.coordinates as number[][]);

        if (coords && coords.length > 0) {
          const bounds = coords.reduce(
            (bounds, coord) => bounds.extend(coord as [number, number]),
            new mapboxgl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])
          );
          map.current.fitBounds(bounds, { padding: 50 });
        }
      }
    }

    setCurrentGeometry(value);
  }, [isMapLoaded, value, geometryType]);

  // Handle manual coordinate input for Point
  const handleManualInput = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    const geometry: GeoJSONGeometry = {
      type: 'Point',
      coordinates: [lng, lat],
    };

    setCurrentGeometry(geometry);
    onChange(geometry);

    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else if (map.current) {
      marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([lng, lat])
        .addTo(map.current);
    }

    map.current?.flyTo({ center: [lng, lat], zoom: 15 });
  };

  // Clear geometry
  const handleClear = () => {
    setCurrentGeometry(null);
    onChange(null);
    setManualLat('');
    setManualLng('');

    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }

    if (draw.current) {
      draw.current.deleteAll();
    }
  };

  // Get user's current location
  const handleLocate = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (geometryType === 'Point') {
          const geometry: GeoJSONGeometry = {
            type: 'Point',
            coordinates: [longitude, latitude],
          };
          setCurrentGeometry(geometry);
          onChange(geometry);
          setManualLat(latitude.toFixed(6));
          setManualLng(longitude.toFixed(6));

          if (marker.current) {
            marker.current.setLngLat([longitude, latitude]);
          } else if (map.current) {
            marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
              .setLngLat([longitude, latitude])
              .addTo(map.current);
          }
        }

        map.current?.flyTo({ center: [longitude, latitude], zoom: 15 });
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
  };

  // Copy GeoJSON to clipboard
  const handleCopy = () => {
    if (!currentGeometry) return;
    navigator.clipboard.writeText(JSON.stringify(currentGeometry, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get display text for current geometry
  const getGeometryLabel = () => {
    if (!currentGeometry) return 'No geometry set';

    switch (currentGeometry.type) {
      case 'Point':
        const [lng, lat] = currentGeometry.coordinates as number[];
        return `Point: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      case 'Polygon':
        const vertices = ((currentGeometry.coordinates as number[][][])[0] || []).length;
        return `Polygon: ${vertices} vertices`;
      case 'LineString':
        const points = (currentGeometry.coordinates as number[][]).length;
        return `LineString: ${points} points`;
      default:
        return currentGeometry.type;
    }
  };

  return (
    <Card className={cn('bg-neutral-900 border-neutral-700 overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700 bg-neutral-800/50">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-neutral-300">{getGeometryLabel()}</span>
        </div>
        <div className="flex items-center gap-1">
          {geometryType === 'Point' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLocate}
              disabled={disabled}
              className="h-7 px-2"
              title="Use current location"
            >
              <Locate className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!currentGeometry}
            className="h-7 px-2"
            title="Copy GeoJSON"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled || !currentGeometry}
            className="h-7 px-2 text-red-400 hover:text-red-300"
            title="Clear geometry"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapContainer}
        style={{ height }}
        className={cn('w-full', disabled && 'pointer-events-none opacity-60')}
      />

      {/* Manual coordinate input for Point */}
      {geometryType === 'Point' && (
        <div className="px-3 py-2 border-t border-neutral-700 bg-neutral-800/50">
          <Label className="text-xs text-neutral-400 mb-2 block">Manual Coordinates</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Latitude"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                disabled={disabled}
                className="h-8 text-xs bg-neutral-800 border-neutral-600"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Longitude"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                disabled={disabled}
                className="h-8 text-xs bg-neutral-800 border-neutral-600"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualInput}
              disabled={disabled || !manualLat || !manualLng}
              className="h-8 px-3"
            >
              Set
            </Button>
          </div>
        </div>
      )}

      {/* Drawing instructions */}
      {geometryType !== 'Point' && (
        <div className="px-3 py-2 border-t border-neutral-700 bg-neutral-800/50 flex items-center gap-2 text-xs text-neutral-400">
          <PenTool className="w-3 h-3" />
          {geometryType === 'Polygon'
            ? 'Click points to draw polygon, double-click to finish'
            : 'Click points to draw line, double-click to finish'}
        </div>
      )}
    </Card>
  );
}

export default GeometryInput;
