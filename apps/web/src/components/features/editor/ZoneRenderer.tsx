/**
 * ZoneRenderer Component
 *
 * Renders zones as polygons on the map using Mapbox layers.
 * Handles fill, border, and label rendering for each zone.
 */

import { useEditorStore } from '@/stores/editorStore';
import { useZoneStore } from '@/stores/zoneStore';
import { useCallback, useEffect, useRef } from 'react';

// ============================================
// Constants
// ============================================
const ZONES_SOURCE_ID = 'zones-source';
const ZONES_FILL_LAYER_ID = 'zones-fill-layer';
const ZONES_BORDER_LAYER_ID = 'zones-border-layer';
const ZONES_LABEL_LAYER_ID = 'zones-label-layer';

// Zone height for 3D occlusion - very thin so it sits on the ground
const ZONE_HEIGHT_METERS = 0.05;

// Helper: Convert hex color + opacity to rgba string
function hexToRgba(hex: string, opacity: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

interface ZoneRendererProps {
  map: mapboxgl.Map;
  floorId: string;
}

export function ZoneRenderer({ map, floorId }: ZoneRendererProps) {
  const { zones, selectedZoneId, selectZone } = useZoneStore();
  const { activeTool } = useEditorStore();
  const layersAdded = useRef(false);

  // Generate GeoJSON for zones
  const generateGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];
    const floorZones = zones.filter((z) => z.floorId === floorId);

    for (const zone of floorZones) {
      if (zone.coordinates.length < 3) continue;

      // Close the polygon if not already closed
      const coords = [...zone.coordinates];
      if (
        coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1]
      ) {
        coords.push(coords[0]);
      }

      // Calculate centroid for label
      const centroid = calculateCentroid(zone.coordinates);

      const isSelected = zone.id === selectedZoneId;

      // Use rgba color with embedded opacity for per-zone opacity support
      const fillColorWithOpacity = isSelected
        ? hexToRgba('#ef4444', 0.8)
        : hexToRgba(zone.fillColor, zone.fillOpacity);

      features.push({
        type: 'Feature',
        properties: {
          id: zone.id,
          name: zone.name,
          fillColor: fillColorWithOpacity,
          fillOpacity: zone.fillOpacity,
          borderColor: isSelected ? '#dc2626' : zone.borderColor,
          borderStyle: zone.borderStyle,
          borderWidth: isSelected ? zone.borderWidth + 1 : zone.borderWidth,
          showLabel: zone.showLabel,
          labelColor: zone.labelColor,
          labelFontFamily: zone.labelFontFamily,
          labelFontSize: zone.labelFontSize,
          labelFontWeight: zone.labelFontWeight,
          centroidLng: centroid[0],
          centroidLat: centroid[1],
          height: ZONE_HEIGHT_METERS, // For 3D occlusion
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
      });
    }

    return { type: 'FeatureCollection', features };
  }, [zones, floorId, selectedZoneId]); // Use zones directly for proper reactivity

  // Generate GeoJSON for labels (point features at centroids)
  const generateLabelGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];
    const floorZones = zones.filter((z) => z.floorId === floorId);

    for (const zone of floorZones) {
      if (!zone.showLabel || zone.coordinates.length < 3) continue;

      const centroid = calculateCentroid(zone.coordinates);

      features.push({
        type: 'Feature',
        properties: {
          id: zone.id,
          name: zone.name,
          labelColor: zone.labelColor,
          labelFontSize: zone.labelFontSize,
          labelFontFamily: zone.labelFontFamily,
          labelFontWeight: zone.labelFontWeight,
        },
        geometry: {
          type: 'Point',
          coordinates: centroid,
        },
      });
    }

    return { type: 'FeatureCollection', features };
  }, [zones, floorId]); // Use zones directly for proper reactivity

  // Add source and layers
  useEffect(() => {
    const addLayersIfNeeded = () => {
      if (layersAdded.current) return;
      if (!map.isStyleLoaded()) return;

      console.log('ZoneRenderer: Adding zone layers...');

      try {
        // Remove old layers if exist
        [ZONES_LABEL_LAYER_ID, ZONES_BORDER_LAYER_ID, ZONES_FILL_LAYER_ID].forEach((layerId) => {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        });
        if (map.getSource(ZONES_SOURCE_ID)) map.removeSource(ZONES_SOURCE_ID);
        if (map.getSource(ZONES_SOURCE_ID + '-labels'))
          map.removeSource(ZONES_SOURCE_ID + '-labels');

        // Add polygon source
        map.addSource(ZONES_SOURCE_ID, {
          type: 'geojson',
          data: generateGeoJSON(),
        });

        // Add label source
        map.addSource(ZONES_SOURCE_ID + '-labels', {
          type: 'geojson',
          data: generateLabelGeoJSON(),
        });

        // Add 3D fill-extrusion layer for proper occlusion by walls
        map.addLayer({
          id: ZONES_FILL_LAYER_ID,
          type: 'fill-extrusion',
          source: ZONES_SOURCE_ID,
          paint: {
            'fill-extrusion-color': ['get', 'fillColor'],
            'fill-extrusion-opacity': 1, // Per-zone opacity is embedded in the rgba color
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': 0,
          },
        });

        // Add border layer
        map.addLayer({
          id: ZONES_BORDER_LAYER_ID,
          type: 'line',
          source: ZONES_SOURCE_ID,
          paint: {
            'line-color': ['get', 'borderColor'],
            'line-width': ['get', 'borderWidth'],
            'line-dasharray': [
              'case',
              ['==', ['get', 'borderStyle'], 'dashed'],
              ['literal', [4, 4]],
              ['literal', [1, 0]],
            ],
          },
        });

        // Add label layer
        map.addLayer({
          id: ZONES_LABEL_LAYER_ID,
          type: 'symbol',
          source: ZONES_SOURCE_ID + '-labels',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': ['get', 'labelFontSize'],
            'text-font': [
              'case',
              ['==', ['get', 'labelFontWeight'], 'bold'],
              ['literal', ['Open Sans Bold', 'Arial Unicode MS Bold']],
              ['literal', ['Open Sans Regular', 'Arial Unicode MS Regular']],
            ],
            'text-anchor': 'center',
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': ['get', 'labelColor'],
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        });

        layersAdded.current = true;
        console.log('ZoneRenderer: Zone layers added successfully!');
      } catch (err) {
        console.error('ZoneRenderer: Failed to add layers', err);
      }
    };

    addLayersIfNeeded();
    map.on('load', addLayersIfNeeded);
    map.on('style.load', addLayersIfNeeded);
    map.on('idle', addLayersIfNeeded);

    return () => {
      map.off('load', addLayersIfNeeded);
      map.off('style.load', addLayersIfNeeded);
      map.off('idle', addLayersIfNeeded);
    };
  }, [map, generateGeoJSON, generateLabelGeoJSON]);

  // Update data when zones change
  useEffect(() => {
    if (!layersAdded.current) return;

    try {
      const source = map.getSource(ZONES_SOURCE_ID) as mapboxgl.GeoJSONSource;
      const labelSource = map.getSource(ZONES_SOURCE_ID + '-labels') as mapboxgl.GeoJSONSource;

      if (source) {
        source.setData(generateGeoJSON());
      }
      if (labelSource) {
        labelSource.setData(generateLabelGeoJSON());
      }
    } catch (err) {
      console.error('ZoneRenderer: Failed to update data', err);
    }
  }, [zones, selectedZoneId, floorId, map, generateGeoJSON, generateLabelGeoJSON]);

  // Click-to-select zones
  useEffect(() => {
    // Wait for layer to be added
    const setupClickHandler = () => {
      if (!map.getLayer(ZONES_FILL_LAYER_ID)) return;

      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        console.log('ZoneRenderer: Click detected, activeTool:', activeTool);
        if (activeTool !== 'select') return;

        const features = map.queryRenderedFeatures(e.point, {
          layers: [ZONES_FILL_LAYER_ID],
        });

        console.log('ZoneRenderer: Found features:', features.length);

        if (features.length > 0 && features[0].properties?.id) {
          const zoneId = features[0].properties.id as string;
          console.log('ZoneRenderer: Selecting zone:', zoneId);
          selectZone(zoneId);
        }
      };

      const handleMouseEnter = () => {
        if (activeTool === 'select') {
          map.getCanvas().style.cursor = 'pointer';
        }
      };

      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = '';
      };

      // Remove any existing listeners first
      map.off('click', ZONES_FILL_LAYER_ID, handleClick);
      map.off('mouseenter', ZONES_FILL_LAYER_ID, handleMouseEnter);
      map.off('mouseleave', ZONES_FILL_LAYER_ID, handleMouseLeave);

      // Add fresh listeners
      map.on('click', ZONES_FILL_LAYER_ID, handleClick);
      map.on('mouseenter', ZONES_FILL_LAYER_ID, handleMouseEnter);
      map.on('mouseleave', ZONES_FILL_LAYER_ID, handleMouseLeave);

      return () => {
        if (map.getLayer(ZONES_FILL_LAYER_ID)) {
          map.off('click', ZONES_FILL_LAYER_ID, handleClick);
          map.off('mouseenter', ZONES_FILL_LAYER_ID, handleMouseEnter);
          map.off('mouseleave', ZONES_FILL_LAYER_ID, handleMouseLeave);
        }
      };
    };

    // Try immediately
    const cleanup = setupClickHandler();

    // Also try on idle in case layer wasn't ready
    const handleIdle = () => {
      setupClickHandler();
    };
    map.on('idle', handleIdle);

    return () => {
      cleanup?.();
      map.off('idle', handleIdle);
    };
  }, [map, activeTool, selectZone, zones]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        // Remove all zone layers
        [ZONES_LABEL_LAYER_ID, ZONES_BORDER_LAYER_ID, ZONES_FILL_LAYER_ID].forEach((layerId) => {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        });
        if (map.getSource(ZONES_SOURCE_ID)) map.removeSource(ZONES_SOURCE_ID);
        if (map.getSource(ZONES_SOURCE_ID + '-labels')) {
          map.removeSource(ZONES_SOURCE_ID + '-labels');
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      layersAdded.current = false;
    };
  }, [map]);

  return null;
}

// Helper: Calculate polygon centroid
function calculateCentroid(coords: [number, number][]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;

  for (const coord of coords) {
    sumLng += coord[0];
    sumLat += coord[1];
  }

  return [sumLng / coords.length, sumLat / coords.length];
}
