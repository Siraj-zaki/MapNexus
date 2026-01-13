import { useEditorStore } from '@/stores/editorStore';
import { useObjectStore } from '@/stores/objectStore';
import * as turf from '@turf/turf';
import { useCallback, useEffect, useRef } from 'react';

// Constants
const OBJECTS_SOURCE_ID = 'objects-source';
const OBJECTS_LAYER_ID = 'objects-extrusion';

// Helper: Convert Hex + Opacity to RGBA string for Mapbox
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${1})`;
};

interface ObjectRendererProps {
  map: mapboxgl.Map;
  floorId: string;
}

export function ObjectRenderer({ map, floorId }: ObjectRendererProps) {
  // 1. Debug Mount Lifecycle
  useEffect(() => {
    console.log(`[ObjectRenderer] Mounted for floor: ${floorId}`);
    return () => console.log(`[ObjectRenderer] Unmounted for floor: ${floorId}`);
  }, [floorId]);

  const { getObjectsByFloor, selectedObjectId, selectObject } = useObjectStore();
  const { activeTool } = useEditorStore();

  const layersAdded = useRef(false);
  const objects = getObjectsByFloor(floorId);

  // 2. Debug Data Availability
  useEffect(() => {
    console.log(`[ObjectRenderer] Objects found for floor ${floorId}:`, objects.length);
  }, [objects.length, floorId]);

  // 3. Generate GeoJSON (Memoized)
  const generateGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    const features = objects
      .map((obj) => {
        let geometry: any;

        try {
          if (obj.type === 'circle' && obj.center && obj.radius) {
            // Create circle polygon
            const circle = turf.circle(obj.center.lngLat, obj.radius, {
              steps: 64,
              units: 'meters',
            });
            geometry = circle.geometry;
          } else if (obj.points.length > 0) {
            // Rectangle or Polygon
            const coords = obj.points.map((p) => p.lngLat);

            // Ensure closed loop
            if (
              coords.length > 0 &&
              (coords[0][0] !== coords[coords.length - 1][0] ||
                coords[0][1] !== coords[coords.length - 1][1])
            ) {
              coords.push(coords[0]);
            }

            geometry = {
              type: 'Polygon',
              coordinates: [coords],
            };
          }

          if (!geometry) return null;

          // FIX: Ensure opacity defaults to 1 (Solid) if undefined
          const opacity = obj.opacity !== undefined ? obj.opacity : 1;
          const rgbaColor = hexToRgba(obj.color, opacity);

          return {
            type: 'Feature',
            properties: {
              id: obj.id,
              color: rgbaColor,
              height: Number(obj.height) || 1,
              base_height: Number(obj.baseHeight) || 0,
              selected: obj.id === selectedObjectId,
            },
            geometry,
          };
        } catch (err) {
          console.error('[ObjectRenderer] Error generating geometry for object:', obj.id, err);
          return null;
        }
      })
      .filter(Boolean) as GeoJSON.Feature[];

    return {
      type: 'FeatureCollection',
      features,
    } as GeoJSON.FeatureCollection;
  }, [objects, selectedObjectId]);

  // 4. Handle Layer Initialization
  useEffect(() => {
    const addLayersIfNeeded = () => {
      if (!map) {
        console.error('[ObjectRenderer] Map prop is missing!');
        return;
      }

      if (!map.getStyle()) {
        console.log('[ObjectRenderer] Map style not ready yet.');
        return;
      }

      // If we think we added them, but they are gone (e.g. style reload), reset
      if (layersAdded.current && !map.getLayer(OBJECTS_LAYER_ID)) {
        console.warn('[ObjectRenderer] Layer missing but marked added. Resetting.');
        layersAdded.current = false;
      }

      if (layersAdded.current) return;

      console.log('[ObjectRenderer] Initializing 3D layers...');

      try {
        // Clean up potential leftovers
        if (map.getLayer(OBJECTS_LAYER_ID)) map.removeLayer(OBJECTS_LAYER_ID);
        if (map.getSource(OBJECTS_SOURCE_ID)) map.removeSource(OBJECTS_SOURCE_ID);

        // Add Source
        const data = generateGeoJSON();
        map.addSource(OBJECTS_SOURCE_ID, {
          type: 'geojson',
          data: data,
        });

        // Find label layer to place objects below text
        const layers = map.getStyle().layers;
        let labelLayerId;
        for (const layer of layers || []) {
          if (layer.type === 'symbol' && layer.layout?.['text-field']) {
            labelLayerId = layer.id;
            break;
          }
        }

        // Add Layer
        map.addLayer(
          {
            id: OBJECTS_LAYER_ID,
            type: 'fill-extrusion',
            source: OBJECTS_SOURCE_ID,
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'base_height'],
              // FIX: Explicitly set layer opacity to 1 (Solid)
              'fill-extrusion-opacity': 1,
              'fill-extrusion-vertical-gradient': true,
            },
          },
          labelLayerId
        );

        layersAdded.current = true;
        console.log('[ObjectRenderer] Successfully added 3D layer and source.');
      } catch (err) {
        console.error('[ObjectRenderer] Failed to add layers:', err);
      }
    };

    // Attempt to add immediately
    if (map.loaded()) {
      addLayersIfNeeded();
    } else {
      console.log('[ObjectRenderer] Waiting for map load event...');
      map.once('load', addLayersIfNeeded);
    }

    // Re-add if style changes (e.g. floor switch or style update)
    const onStyleLoad = () => {
      console.log('[ObjectRenderer] Style loaded/changed. Re-initializing layers.');
      layersAdded.current = false;
      addLayersIfNeeded();
    };

    map.on('style.load', onStyleLoad);

    return () => {
      map.off('style.load', onStyleLoad);
      layersAdded.current = false;
    };
  }, [map]);

  // 5. Handle Data Updates
  useEffect(() => {
    if (!layersAdded.current) return;

    const source = map.getSource(OBJECTS_SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(generateGeoJSON());
    }
  }, [objects, selectedObjectId, generateGeoJSON, map]);

  // 6. Handle Interactions
  useEffect(() => {
    if (!layersAdded.current) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (activeTool !== 'select') return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [OBJECTS_LAYER_ID],
      });

      if (features.length > 0 && features[0].properties?.id) {
        e.preventDefault();
        console.log('[ObjectRenderer] Clicked object:', features[0].properties.id);
        selectObject(features[0].properties.id);
      }
    };

    const handleMouseEnter = () => {
      if (activeTool === 'select') map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      if (activeTool === 'select') map.getCanvas().style.cursor = '';
    };

    // Safely bind events
    if (map.getLayer(OBJECTS_LAYER_ID)) {
      map.on('click', OBJECTS_LAYER_ID, handleClick);
      map.on('mouseenter', OBJECTS_LAYER_ID, handleMouseEnter);
      map.on('mouseleave', OBJECTS_LAYER_ID, handleMouseLeave);
    }

    return () => {
      if (map.getLayer(OBJECTS_LAYER_ID)) {
        map.off('click', OBJECTS_LAYER_ID, handleClick);
        map.off('mouseenter', OBJECTS_LAYER_ID, handleMouseEnter);
        map.off('mouseleave', OBJECTS_LAYER_ID, handleMouseLeave);
      }
    };
  }, [map, activeTool, selectObject, layersAdded.current]);

  return null;
}
