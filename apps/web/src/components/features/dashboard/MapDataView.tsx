/**
 * MapDataView Component
 * Displays records with geometry on an interactive map
 */

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChevronRight, Layers, MapPin, RefreshCw, Search, X } from 'lucide-react';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}

interface MapRecord {
  id: string;
  [key: string]: any;
}

interface MapDataViewProps {
  tableName: string;
  records: MapRecord[];
  geometryField: string;
  labelField?: string;
  onRecordClick?: (record: MapRecord) => void;
  onSpatialQuery?: (bounds: mapboxgl.LngLatBounds) => void;
  className?: string;
  height?: number;
}

const LAYER_COLORS = {
  point: '#3b82f6',
  polygon: '#22c55e',
  line: '#f59e0b',
};

export function MapDataView({
  tableName,
  records,
  geometryField,
  labelField,
  onRecordClick,
  onSpatialQuery,
  className,
  height = 500,
}: MapDataViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MapRecord | null>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    new Set(['points', 'polygons', 'lines'])
  );

  // Convert records to GeoJSON FeatureCollection
  const toFeatureCollection = useCallback(() => {
    const features = records
      .filter((record) => record[geometryField])
      .map((record, index) => ({
        type: 'Feature' as const,
        id: index,
        properties: {
          id: record.id,
          label: labelField ? record[labelField] : record.id,
          ...record,
        },
        geometry: record[geometryField] as GeoJSONGeometry,
      }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [records, geometryField, labelField]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-73.9857, 40.7484],
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    popup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
    });

    map.current.on('load', () => {
      setIsMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add data sources and layers when map loads or records change
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;

    const geojson = toFeatureCollection();

    // Remove existing sources/layers
    ['points', 'polygons', 'lines', 'polygon-fills'].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    if (map.current.getSource('data')) map.current.removeSource('data');

    // Add source
    map.current.addSource('data', {
      type: 'geojson',
      data: geojson,
    });

    // Add polygon fill layer
    map.current.addLayer({
      id: 'polygon-fills',
      type: 'fill',
      source: 'data',
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': LAYER_COLORS.polygon,
        'fill-opacity': 0.3,
      },
    });

    // Add polygon outline layer
    map.current.addLayer({
      id: 'polygons',
      type: 'line',
      source: 'data',
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'line-color': LAYER_COLORS.polygon,
        'line-width': 2,
      },
    });

    // Add line layer
    map.current.addLayer({
      id: 'lines',
      type: 'line',
      source: 'data',
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': LAYER_COLORS.line,
        'line-width': 3,
      },
    });

    // Add point layer
    map.current.addLayer({
      id: 'points',
      type: 'circle',
      source: 'data',
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 8,
        'circle-color': LAYER_COLORS.point,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Add click handlers
    ['points', 'polygons', 'lines'].forEach((layer) => {
      map.current?.on('click', layer, (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties;
        const record = records.find((r) => r.id === props?.id);

        if (record) {
          setSelectedRecord(record);
          onRecordClick?.(record);

          // Show popup
          const coordinates =
            feature.geometry.type === 'Point'
              ? (feature.geometry as any).coordinates.slice()
              : e.lngLat.toArray();

          popup.current
            ?.setLngLat(coordinates)
            .setHTML(
              `<div class="p-2">
                <div class="font-semibold text-sm">${props?.label || 'Record'}</div>
                <div class="text-xs text-gray-500 mt-1">ID: ${props?.id}</div>
              </div>`
            )
            .addTo(map.current!);
        }
      });

      map.current?.on('mouseenter', layer, () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current?.on('mouseleave', layer, () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    // Fit bounds to data
    if (geojson.features.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();

      geojson.features.forEach((feature) => {
        const geom = feature.geometry;
        if (geom.type === 'Point') {
          bounds.extend(geom.coordinates as [number, number]);
        } else if (geom.type === 'Polygon') {
          (geom.coordinates as number[][][])[0].forEach((coord) => {
            bounds.extend(coord as [number, number]);
          });
        } else if (geom.type === 'LineString') {
          (geom.coordinates as number[][]).forEach((coord) => {
            bounds.extend(coord as [number, number]);
          });
        }
      });

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    }
  }, [isMapLoaded, records, geometryField, toFeatureCollection, onRecordClick]);

  // Toggle layer visibility
  const toggleLayer = (layerId: string) => {
    const newVisible = new Set(visibleLayers);
    if (newVisible.has(layerId)) {
      newVisible.delete(layerId);
      map.current?.setLayoutProperty(layerId, 'visibility', 'none');
      if (layerId === 'polygons') {
        map.current?.setLayoutProperty('polygon-fills', 'visibility', 'none');
      }
    } else {
      newVisible.add(layerId);
      map.current?.setLayoutProperty(layerId, 'visibility', 'visible');
      if (layerId === 'polygons') {
        map.current?.setLayoutProperty('polygon-fills', 'visibility', 'visible');
      }
    }
    setVisibleLayers(newVisible);
  };

  // Refresh/recenter map
  const handleRefresh = () => {
    if (!map.current) return;
    const geojson = toFeatureCollection();

    if (geojson.features.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      geojson.features.forEach((feature) => {
        const geom = feature.geometry;
        if (geom.type === 'Point') {
          bounds.extend(geom.coordinates as [number, number]);
        } else if (geom.type === 'Polygon') {
          (geom.coordinates as number[][][])[0].forEach((coord) => {
            bounds.extend(coord as [number, number]);
          });
        } else if (geom.type === 'LineString') {
          (geom.coordinates as number[][]).forEach((coord) => {
            bounds.extend(coord as [number, number]);
          });
        }
      });

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    }
  };

  // Filter records by search
  const filteredRecords = records.filter((record) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return Object.values(record).some(
      (value) => value && String(value).toLowerCase().includes(searchLower)
    );
  });

  // Get geometry stats
  const stats = {
    points: records.filter((r) => r[geometryField]?.type === 'Point').length,
    polygons: records.filter((r) => r[geometryField]?.type === 'Polygon').length,
    lines: records.filter((r) => r[geometryField]?.type === 'LineString').length,
  };

  return (
    <Card className={cn('bg-neutral-900 border-neutral-700 overflow-hidden flex', className)}>
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainer} style={{ height }} className="w-full" />

        {/* Map Controls Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowLayers(!showLayers)}
            className="bg-neutral-800/90 hover:bg-neutral-700 backdrop-blur-sm"
          >
            <Layers className="w-4 h-4 mr-1" />
            Layers
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            className="bg-neutral-800/90 hover:bg-neutral-700 backdrop-blur-sm"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Fit All
          </Button>
        </div>

        {/* Layer toggle panel */}
        {showLayers && (
          <div className="absolute top-14 left-3 bg-neutral-800/95 backdrop-blur-sm rounded-lg p-3 min-w-[160px]">
            <div className="text-xs font-medium text-neutral-400 mb-2">Layers</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="layer-points"
                  checked={visibleLayers.has('points')}
                  onCheckedChange={() => toggleLayer('points')}
                />
                <label
                  htmlFor="layer-points"
                  className="text-sm flex items-center gap-2 cursor-pointer"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: LAYER_COLORS.point }}
                  />
                  Points ({stats.points})
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="layer-polygons"
                  checked={visibleLayers.has('polygons')}
                  onCheckedChange={() => toggleLayer('polygons')}
                />
                <label
                  htmlFor="layer-polygons"
                  className="text-sm flex items-center gap-2 cursor-pointer"
                >
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: LAYER_COLORS.polygon }}
                  />
                  Polygons ({stats.polygons})
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="layer-lines"
                  checked={visibleLayers.has('lines')}
                  onCheckedChange={() => toggleLayer('lines')}
                />
                <label
                  htmlFor="layer-lines"
                  className="text-sm flex items-center gap-2 cursor-pointer"
                >
                  <span
                    className="w-3 h-1 rounded"
                    style={{ backgroundColor: LAYER_COLORS.line }}
                  />
                  Lines ({stats.lines})
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Stats Badge */}
        <div className="absolute bottom-3 left-3 bg-neutral-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <span className="text-xs text-neutral-400">
            {records.length} records • {stats.points + stats.polygons + stats.lines} with geometry
          </span>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 border-l border-neutral-700 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-neutral-700">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 bg-neutral-800 border-neutral-600 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Records List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-sm">No records found</div>
            ) : (
              filteredRecords.map((record) => {
                const geometry = record[geometryField];
                const isSelected = selectedRecord?.id === record.id;

                return (
                  <button
                    key={record.id}
                    onClick={() => {
                      setSelectedRecord(record);
                      onRecordClick?.(record);

                      // Fly to geometry
                      if (map.current && geometry) {
                        if (geometry.type === 'Point') {
                          map.current.flyTo({
                            center: geometry.coordinates as [number, number],
                            zoom: 15,
                          });
                        }
                      }
                    }}
                    className={cn(
                      'w-full text-left p-2 rounded-lg mb-1 transition-colors',
                      isSelected
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'hover:bg-neutral-800 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin
                        className={cn(
                          'w-4 h-4 flex-shrink-0',
                          geometry ? 'text-blue-400' : 'text-neutral-600'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {labelField ? record[labelField] : record.id}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {geometry ? geometry.type : 'No geometry'}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Selected Record Details */}
        {selectedRecord && (
          <div className="border-t border-neutral-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Selected Record</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRecord(null)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs space-y-1 text-neutral-400">
              <div>
                <span className="text-neutral-500">ID:</span> {selectedRecord.id}
              </div>
              {labelField && (
                <div>
                  <span className="text-neutral-500">{labelField}:</span>{' '}
                  {selectedRecord[labelField]}
                </div>
              )}
              {selectedRecord[geometryField] && (
                <div>
                  <span className="text-neutral-500">Geometry:</span>{' '}
                  {selectedRecord[geometryField].type}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default MapDataView;
