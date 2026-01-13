/**
 * WallRenderer Component
 *
 * Renders walls as SOLID 3D extruded blocks using Mapbox fill-extrusion layer.
 * Like Mappedin reference - thick gray walls with proper height.
 */

import { useDoorStore } from '@/stores/doorStore';
import { useEditorStore } from '@/stores/editorStore';
import { useWallStore } from '@/stores/wallStore';
import * as turf from '@turf/turf';
import { useCallback, useEffect, useRef } from 'react';

// ============================================
// Constants - Make walls VISIBLE and SOLID
// ============================================
const WALLS_SOURCE_ID = 'walls-3d-solid-source';
const WALLS_FILL_LAYER_ID = 'walls-3d-solid-layer';
const WALL_OUTLINE_LAYER_ID = 'walls-3d-solid-layer-outline'; // Added constant for clean cleanup

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
  const { doors } = useDoorStore();
  const layersAdded = useRef(false);

  // Get walls for this floor
  const floorWalls = walls.filter((w) => w.floorId === floorId);

  // Generate GeoJSON for 3D extrusion
  const generateGeoJSON = useCallback((): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];

    // Get doors for this floor
    const floorDoors = doors.filter((d) => d.floorId === floorId);

    for (const wall of floorWalls) {
      const startNode = getNodeById(wall.startNodeId);
      const endNode = getNodeById(wall.endNodeId);

      if (!startNode || !endNode) {
        continue;
      }

      try {
        const wallStart = startNode.position;
        const wallEnd = endNode.position;
        const wallLine = turf.lineString([wallStart, wallEnd]);
        const wallLength = turf.length(wallLine, { units: 'meters' });

        // Find doors on this wall
        const myDoors = floorDoors.filter((d) => d.wallId === wall.id);

        if (myDoors.length === 0) {
          // No doors, render full wall
          const thickness = WALL_THICKNESS_METERS / 1000;
          const polygon = turf.buffer(wallLine, thickness / 2, {
            units: 'kilometers',
            steps: 1,
          });

          if (polygon?.geometry) {
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
        } else {
          // Wall has doors, calculate segments
          // 1. Calculate cutouts (intervals along the wall [start, end] in meters)
          const cutouts: { min: number; max: number }[] = [];

          for (const door of myDoors) {
            // Project door position onto the wall line to get exact distance
            const snapped = turf.nearestPointOnLine(wallLine, door.position.lngLat, {
              units: 'meters',
            });
            const dist = snapped.properties?.location ?? 0;
            const halfWidth = door.width / 2;

            cutouts.push({
              min: Math.max(0, dist - halfWidth),
              max: Math.min(wallLength, dist + halfWidth),
            });
          }

          // 2. Sort and merge overlapping cutouts
          cutouts.sort((a, b) => a.min - b.min);

          const mergedCutouts: { min: number; max: number }[] = [];
          if (cutouts.length > 0) {
            let current = cutouts[0];
            for (let i = 1; i < cutouts.length; i++) {
              const next = cutouts[i];
              if (next.min < current.max) {
                // Overlap or adjacent, merge
                current.max = Math.max(current.max, next.max);
              } else {
                mergedCutouts.push(current);
                current = next;
              }
            }
            mergedCutouts.push(current);
          }

          // 3. Generate solid segments
          const segments: { start: number; end: number }[] = [];
          let currentPos = 0;

          for (const cutout of mergedCutouts) {
            if (cutout.min > currentPos + 0.01) {
              // 1cm tolerance to avoid tiny slivers
              segments.push({ start: currentPos, end: cutout.min });
            }
            currentPos = Math.max(currentPos, cutout.max);
          }

          if (currentPos < wallLength - 0.01) {
            segments.push({ start: currentPos, end: wallLength });
          }

          // 4. Create geometry for each segment
          for (const segment of segments) {
            const segStartPt = turf.along(wallLine, segment.start, { units: 'meters' });
            const segEndPt = turf.along(wallLine, segment.end, { units: 'meters' });
            const segLine = turf.lineString([
              segStartPt.geometry.coordinates,
              segEndPt.geometry.coordinates,
            ]);

            // Create solid wall segment (no door header for now, or maybe add a header later?)
            // User asked for "cut off", so full gap is appropriate for now.
            const thickness = WALL_THICKNESS_METERS / 1000;
            const polygon = turf.buffer(segLine, thickness / 2, {
              units: 'kilometers',
              steps: 1,
            });

            if (polygon?.geometry) {
              const selected = isWallSelected(wall.id);
              features.push({
                type: 'Feature',
                properties: {
                  id: wall.id, // Keep same ID for selection
                  color: selected ? WALL_SELECTED_COLOR : WALL_COLOR,
                  height: WALL_HEIGHT_METERS,
                },
                geometry: polygon.geometry,
              });
            }
          }
        }
      } catch (err) {
        console.error('WallRenderer: Error creating wall geometry', err);
      }
    }

    console.log(`WallRenderer: Generated ${features.length} wall polygons`);
    return { type: 'FeatureCollection', features };
  }, [floorWalls, getNodeById, isWallSelected, doors, floorId]);

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
        if (map.getLayer(WALL_OUTLINE_LAYER_ID)) map.removeLayer(WALL_OUTLINE_LAYER_ID);
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
