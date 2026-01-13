/**
 * Editor Page
 * Full-screen map editor with all components
 */

import {
  EditorActions,
  EditorCanvas,
  EditorHeader,
  EditorSidebar,
  EditorToolbar,
} from '@/components/features/editor';
import { useEditorStore } from '@/stores/editorStore';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function Editor() {
  const { mapId } = useParams<{ mapId?: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type'); // upload, address, demo

  const { setMap, setLoading, isLoading, reset } = useEditorStore();

  // Initialize editor based on route
  useEffect(() => {
    const initializeEditor = async () => {
      setLoading(true);

      if (mapId && mapId !== 'new') {
        // Load existing map
        console.log('Loading map:', mapId);
        setMap({
          id: mapId,
          name: 'My Map',
          floors: [
            { id: '1', name: '1F', level: 1 },
            { id: '2', name: '2F', level: 2 },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new map based on type
        console.log('Creating new map, type:', type);

        // Get map name from session storage if available
        let mapName = 'Untitled Map';
        const locationData = sessionStorage.getItem('mapLocation');
        if (locationData) {
          try {
            const data = JSON.parse(locationData);
            if (data.name) {
              mapName = data.name.split(',')[0];
            }
          } catch (e) {
            // Use default name
          }
        }

        setMap({
          id: 'new',
          name: mapName,
          floors: [{ id: '1', name: '1F', level: 1 }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setLoading(false);
    };

    initializeEditor();

    return () => {
      reset();
    };
  }, [mapId, type]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-neutral-900">
      {/* Canvas (base layer) */}
      <EditorCanvas />

      {/* Header (top left) */}
      <EditorHeader />

      {/* Sidebar (left) */}
      <EditorSidebar />

      {/* Toolbar (bottom center) */}
      <EditorToolbar />

      {/* Actions (right side) */}
      <EditorActions />
    </div>
  );
}
