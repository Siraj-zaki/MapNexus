/**
 * EditorActions Component with i18n
 * Contains zoom controls that actually control the Mapbox map
 */

import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editorStore';
import { Minus, Plus } from 'lucide-react';
import { getMapInstance } from './EditorCanvas';

export function EditorActions() {
  const { zoom } = useEditorStore();

  const handleZoomIn = () => {
    const map = getMapInstance();
    if (map) {
      map.zoomIn();
    }
  };

  const handleZoomOut = () => {
    const map = getMapInstance();
    if (map) {
      map.zoomOut();
    }
  };

  const handleResetZoom = () => {
    const map = getMapInstance();
    if (map) {
      map.setZoom(16); // Reset to default zoom
    }
  };

  return (
    <>
      {/* Right Side - Zoom Controls (positioned above bottom toolbar) */}
      <div className="absolute bottom-20 end-4 z-30 flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-neutral-800/90 border border-neutral-700 backdrop-blur-sm">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleZoomIn}
          className="h-9 w-9 text-white hover:bg-neutral-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleResetZoom}
          className="h-7 px-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {zoom}%
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleZoomOut}
          className="h-9 w-9 text-white hover:bg-neutral-700"
        >
          <Minus className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
}
