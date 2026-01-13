/**
 * WallRenderer Component
 *
 * Renders walls as SOLID 3D extruded blocks using Mapbox fill-extrusion layer.
 * Like Mappedin reference - thick gray walls with proper height.
 */

import { useEditorStore } from '@/stores/editorStore';
import { useWallStore } from '@/stores/wallStore';
import * as turf from '@turf/turf';
import { useCallback, useEffect, useRef } from 'react';

// ============================================
// Constants - Make walls VISIBLE and SOLID
// ============================================
const WALLS_SOURCE_ID = 'walls-3d-solid-source';
const WALLS_FILL_LAYER_ID = 'walls-3d-solid-layer';

// Wall appearance settings - matching Mapbox 3D buildings style
const WALL_HEIGHT_METERS = 3; // 3 meters tall
const WALL_THICKNESS_METERS = 0.15; // 15cm thick walls
const WALL_COLOR = '#e5e5e5'; // Off-white/cream like Mapbox buildings
const WALL_SELECTED_COLOR = '#ef4444'; // Red when selected

interface WallRendererProps {
  map: mapboxgl.Map;
  floorId: string;
}

export function WallRenderer({ map, floorId }: WallRendererProps) {
  const { walls, getNodeById, isWallSelected } = useWallStore();
  const layersAdded = useRef(false);

  // Get walls for this floor
  const floorWalls = walls.filter((w) => w.floorId === floorId);

  // Generate GeoJSON for 3D extrusion
  const generateGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];

    for (const wall of floorWalls) {
      const startNode = getNodeById(wall.startNodeId);
      const endNode = getNodeById(wall.endNodeId);

      if (!startNode || !endNode) {
        console.warn('WallRenderer: Missing node for wall', wall.id);
        continue;
      }

      try {
        // Create line between start and end
        const line = turf.lineString([startNode.position, endNode.position]);

        // Buffer to create thickness - use steps:1 for SHARP corners
        const thickness = WALL_THICKNESS_METERS / 1000; // Convert to km
        const polygon = turf.buffer(line, thickness / 2, {
          units: 'kilometers',
          steps: 1, // Sharp corners, not rounded
        });

        if (polygon && polygon.geometry) {
          const selected = isWallSelected(wall.id);
          features.push({
            type: 'Feature',
            properties: {
              id: wall.id,
              color: selected ? WALL_SELECTED_COLOR : WALL_COLOR,
              height: WALL_HEIGHT_METERS,
            },
            geometry: polygon.geometry,
          });
        }
      } catch (err) {
        console.error('WallRenderer: Error creating wall geometry', err);
      }
    }

    console.log(`WallRenderer: Generated ${features.length} wall polygons`);
    return { type: 'FeatureCollection', features };
  }, [floorWalls, getNodeById, isWallSelected]);

  // Add source and layer
  useEffect(() => {
    const addLayersIfNeeded = () => {
      if (layersAdded.current) return;
      if (!map.isStyleLoaded()) return;

      console.log('WallRenderer: Adding 3D source and layer with lighting...');

      try {
        // Configure 3D lighting for realistic shadows (Mapbox GL JS v3+)
        try {
          // @ts-ignore - setLights is available in mapbox-gl v3+
          map.setLights([
            {
              id: 'ambient-light',
              type: 'ambient',
              properties: {
                color: '#ffffff',
                intensity: 0.4,
              },
            },
            {
              id: 'directional-light',
              type: 'directional',
              properties: {
                color: '#ffffff',
                intensity: 0.8,
                direction: [200, 40], // Azimuth and polar angle for sun position
                'cast-shadows': true,
                'shadow-intensity': 0.3,
              },
            },
          ]);
          console.log('WallRenderer: 3D lighting with shadows configured');
        } catch (lightErr) {
          console.warn('WallRenderer: Could not set lights (may need v3+)', lightErr);
        }

        // Remove old if exists
        if (map.getLayer(WALLS_FILL_LAYER_ID + '-outline')) {
          map.removeLayer(WALLS_FILL_LAYER_ID + '-outline');
        }
        if (map.getLayer(WALLS_FILL_LAYER_ID)) {
          map.removeLayer(WALLS_FILL_LAYER_ID);
        }
        if (map.getSource(WALLS_SOURCE_ID)) {
          map.removeSource(WALLS_SOURCE_ID);
        }

        // Add fresh source
        map.addSource(WALLS_SOURCE_ID, {
          type: 'geojson',
          data: generateGeoJSON(),
        });

        // Add 3D fill-extrusion layer with shadows
        map.addLayer({
          id: WALLS_FILL_LAYER_ID,
          type: 'fill-extrusion',
          source: WALLS_SOURCE_ID,
          paint: {
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 1, // Fully solid
            'fill-extrusion-vertical-gradient': true, // Shading for 3D depth
            // @ts-ignore - cast-shadows available in v3.7+
            'fill-extrusion-cast-shadows': true,
          },
        });

        // No 2D outline - only pure 3D extrusion

        layersAdded.current = true;
        console.log('WallRenderer: 3D layers successfully added!');
      } catch (err) {
        console.error('WallRenderer: Failed to add layers', err);
      }
    };

    // Try immediately
    addLayersIfNeeded();

    // Also try on load events
    map.on('load', addLayersIfNeeded);
    map.on('style.load', addLayersIfNeeded);
    map.on('idle', addLayersIfNeeded);

    return () => {
      map.off('load', addLayersIfNeeded);
      map.off('style.load', addLayersIfNeeded);
      map.off('idle', addLayersIfNeeded);
    };
  }, [map, generateGeoJSON]);

  // Update data when walls change
  useEffect(() => {
    if (!layersAdded.current) return;

    try {
      const source = map.getSource(WALLS_SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        const data = generateGeoJSON();
        source.setData(data);
        console.log('WallRenderer: Updated with', data.features.length, 'walls');
      }
    } catch (err) {
      console.error('WallRenderer: Failed to update data', err);
    }
  }, [walls, floorId, map, generateGeoJSON]);

  // Click-to-select on 3D walls
  useEffect(() => {
    if (!layersAdded.current) return;

    const { selectWall, isWallSelected: checkSelected } = useWallStore.getState();

    const handleClick = (
      e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }
    ) => {
      // Check if we're in select mode
      const { activeTool } = useEditorStore.getState();
      if (activeTool !== 'select') return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [WALLS_FILL_LAYER_ID],
      });

      if (features.length > 0 && features[0].properties?.id) {
        const wallId = features[0].properties.id as string;
        // Toggle selection
        if (checkSelected(wallId)) {
          selectWall(null);
        } else {
          selectWall(wallId);
        }
      }
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    // Add event listeners
    if (map.getLayer(WALLS_FILL_LAYER_ID)) {
      map.on('click', WALLS_FILL_LAYER_ID, handleClick);
      map.on('mouseenter', WALLS_FILL_LAYER_ID, handleMouseEnter);
      map.on('mouseleave', WALLS_FILL_LAYER_ID, handleMouseLeave);
    }

    return () => {
      if (map.getLayer(WALLS_FILL_LAYER_ID)) {
        map.off('click', WALLS_FILL_LAYER_ID, handleClick);
        map.off('mouseenter', WALLS_FILL_LAYER_ID, handleMouseEnter);
        map.off('mouseleave', WALLS_FILL_LAYER_ID, handleMouseLeave);
      }
    };
  }, [map, layersAdded.current]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (map.getLayer(WALLS_FILL_LAYER_ID + '-outline'))
          map.removeLayer(WALLS_FILL_LAYER_ID + '-outline');
        if (map.getLayer(WALLS_FILL_LAYER_ID)) map.removeLayer(WALLS_FILL_LAYER_ID);
        if (map.getSource(WALLS_SOURCE_ID)) map.removeSource(WALLS_SOURCE_ID);
      } catch (e) {
        // Ignore
      }
      layersAdded.current = false;
    };
  }, [map]);

  return null;
}
