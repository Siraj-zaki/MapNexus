import { useEditorStore } from '@/stores/editorStore';
import { PoiType, usePoiStore } from '@/stores/poiStore';
import { useEffect } from 'react';

interface PoiPlacementToolProps {
  map: mapboxgl.Map;
  floorId: string;
}

export function PoiPlacementTool({ map, floorId }: PoiPlacementToolProps) {
  const { activeTool, setTool } = useEditorStore();
  const { addPoi } = usePoiStore();

  useEffect(() => {
    // Only active for 'poi' (generic) or 'safety' (specific icons)
    if (activeTool !== 'poi' && activeTool !== 'safety') return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // Determine default type based on tool
      let type: PoiType = 'generic';
      let label = 'New Point';
      let color = '#3b82f6'; // Blue for generic

      if (activeTool === 'safety') {
        type = 'fire-extinguisher'; // Default safety icon
        label = 'Safety Equipment';
        color = '#ef4444'; // Red for safety
      }

      addPoi({
        floorId,
        position: lngLat,
        type,
        label,
        color,
      });

      // Optional: Switch back to select mode after placement
      // setTool('select');
    };

    // Change cursor
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', onClick);

    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
    };
  }, [activeTool, map, floorId, addPoi, setTool]);

  return null;
}
