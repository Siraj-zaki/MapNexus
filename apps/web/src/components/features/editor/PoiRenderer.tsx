import { useEditorStore } from '@/stores/editorStore';
import { usePoiStore } from '@/stores/poiStore';
import {
  AlertTriangle,
  ArrowUpDown,
  DoorOpen,
  FireExtinguisher,
  LogOut,
  MapPin,
  Stethoscope,
  Video,
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// Icon Mapping
const getIconComponent = (type: string) => {
  switch (type) {
    case 'fire-extinguisher':
      return <FireExtinguisher size={20} />;
    case 'first-aid':
      return <Stethoscope size={20} />;
    case 'exit':
      return <LogOut size={20} />;
    case 'camera':
      return <Video size={20} />;
    case 'elevator':
      return <ArrowUpDown size={20} />;
    case 'stairs':
      return <DoorOpen size={20} />; // Placeholder for stairs
    case 'hazard':
      return <AlertTriangle size={20} />;
    case 'generic':
    default:
      return <MapPin size={20} />;
  }
};

interface PoiRendererProps {
  map: mapboxgl.Map;
  floorId: string;
}

export function PoiRenderer({ map, floorId }: PoiRendererProps) {
  const { getPoisByFloor, selectPoi, selectedPoiId, updatePoi } = usePoiStore();
  const { activeTool, isPublished } = useEditorStore();

  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
  const pois = getPoisByFloor(floorId);

  // Sync Markers with Store
  useEffect(() => {
    const currentIds = new Set(pois.map((p) => p.id));

    // 1. Remove markers that no longer exist or changed floor
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // 2. Add or Update markers
    pois.forEach((poi) => {
      const isSelected = poi.id === selectedPoiId;

      // If marker exists, just update...
      if (markersRef.current[poi.id]) {
        const marker = markersRef.current[poi.id];
        marker.setLngLat(poi.position);

        const el = marker.getElement();

        // Update Inner Style
        const inner = el.querySelector('.poi-inner') as HTMLElement;
        if (inner) {
          inner.style.borderColor = isSelected ? '#fff' : 'transparent';
          inner.style.boxShadow = isSelected ? '0 0 0 2px #3b82f6' : 'none';
          inner.style.backgroundColor = poi.color || '#3b82f6';
        }

        // Update Label
        let labelEl = el.querySelector('.poi-label') as HTMLElement;
        if (!labelEl) {
          labelEl = document.createElement('div');
          labelEl.className = 'poi-label';
          labelEl.style.position = 'absolute';
          labelEl.style.top = '100%';
          labelEl.style.left = '50%';
          labelEl.style.transform = 'translate(-50%, 4px)';
          labelEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
          labelEl.style.color = 'white';
          labelEl.style.padding = '2px 6px';
          labelEl.style.borderRadius = '4px';
          labelEl.style.fontSize = '12px';
          labelEl.style.whiteSpace = 'nowrap';
          labelEl.style.pointerEvents = 'none';
          el.appendChild(labelEl);
        }

        // Show label if published AND label text exists
        labelEl.textContent = poi.label;
        labelEl.style.display = isPublished && poi.label ? 'block' : 'none';

        // Update draggable state
        marker.setDraggable(activeTool === 'select' && isSelected);
        return;
      }

      // Create New Marker DOM Element
      const el = document.createElement('div');
      el.className = 'poi-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.cursor = 'pointer';
      el.style.position = 'relative'; // For absolute label positioning

      // Inner container for styling
      const inner = document.createElement('div');
      inner.className = 'poi-inner';
      inner.style.width = '100%';
      inner.style.height = '100%';
      inner.style.borderRadius = '50%';
      inner.style.backgroundColor = poi.color || '#3b82f6';
      inner.style.display = 'flex';
      inner.style.alignItems = 'center';
      inner.style.justifyContent = 'center';
      inner.style.color = 'white';
      inner.style.transition = 'all 0.2s ease';
      inner.style.border = '2px solid transparent';

      if (isSelected) {
        inner.style.borderColor = '#fff';
        inner.style.boxShadow = '0 0 0 2px #3b82f6';
      }

      el.appendChild(inner);

      // Label Element
      const labelEl = document.createElement('div');
      labelEl.className = 'poi-label';
      labelEl.textContent = poi.label;
      labelEl.style.position = 'absolute';
      labelEl.style.top = '100%';
      labelEl.style.left = '50%';
      labelEl.style.transform = 'translate(-50%, 4px)';
      labelEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
      labelEl.style.color = 'white';
      labelEl.style.padding = '2px 6px';
      labelEl.style.borderRadius = '4px';
      labelEl.style.fontSize = '12px';
      labelEl.style.whiteSpace = 'nowrap';
      labelEl.style.pointerEvents = 'none';
      labelEl.style.display = isPublished && poi.label ? 'block' : 'none'; // Initial visibility
      el.appendChild(labelEl);

      // Render React Icon into DOM
      const root = createRoot(inner);
      root.render(getIconComponent(poi.type));

      // Create Mapbox Marker
      const marker = new mapboxgl.Marker({
        element: el,
        draggable: activeTool === 'select',
      })
        .setLngLat(poi.position)
        .addTo(map);

      // Events
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent map click
        selectPoi(poi.id);
      });

      marker.on('dragend', () => {
        const newPos = marker.getLngLat();
        updatePoi(poi.id, { position: [newPos.lng, newPos.lat] });
      });

      markersRef.current[poi.id] = marker;
    });
  }, [pois, selectedPoiId, activeTool, map, selectPoi, updatePoi, isPublished]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
    };
  }, []);

  return null;
}
