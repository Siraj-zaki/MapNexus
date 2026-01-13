/**
 * EditorSidebar Component with i18n
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEditorStore, type EditorTool } from '@/stores/editorStore';
import { MapPin, PenTool, Route, Ruler, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarToolProps {
  tool: EditorTool;
  icon: React.ReactNode;
  labelKey: string;
}

function SidebarTool({ tool, icon, labelKey }: SidebarToolProps) {
  const { t } = useTranslation();
  const { activeTool, setActiveTool } = useEditorStore();
  const isActive = activeTool === tool;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setActiveTool(tool)}
      className={cn(
        'h-10 w-10 rounded-lg text-white hover:bg-neutral-700',
        isActive && 'bg-neutral-600'
      )}
      title={t(labelKey)}
    >
      {icon}
    </Button>
  );
}

export function EditorSidebar() {
  const { t } = useTranslation();
  const { isSidebarOpen, toggleSidebar, activeTool } = useEditorStore();

  const tools: SidebarToolProps[] = [
    {
      tool: 'measure',
      icon: <Ruler className="h-5 w-5" />,
      labelKey: 'editor.sidebar.measurements',
    },
    { tool: 'zone', icon: <Square className="h-5 w-5" />, labelKey: 'editor.sidebar.zones' },
    { tool: 'wall', icon: <PenTool className="h-5 w-5" />, labelKey: 'editor.sidebar.walls' },
    { tool: 'poi', icon: <MapPin className="h-5 w-5" />, labelKey: 'editor.sidebar.pois' },
    { tool: 'path', icon: <Route className="h-5 w-5" />, labelKey: 'editor.sidebar.paths' },
  ];

  const getToolContent = () => {
    switch (activeTool) {
      case 'measure':
        return (
          <div className="p-4">
            <h3 className="font-medium text-white mb-2">{t('editor.sidebar.measurements')}</h3>
            <p className="text-sm text-neutral-400">{t('editor.sidebar.measurementsDesc')}</p>
          </div>
        );
      case 'zone':
        return (
          <div className="p-4">
            <h3 className="font-medium text-white mb-2">{t('editor.sidebar.zones')}</h3>
            <p className="text-sm text-neutral-400">{t('editor.sidebar.zonesDesc')}</p>
          </div>
        );
      case 'wall':
        return (
          <div className="p-4">
            <h3 className="font-medium text-white mb-2">{t('editor.sidebar.walls')}</h3>
            <p className="text-sm text-neutral-400 mb-3">{t('editor.sidebar.wallsDesc')}</p>
            <div className="space-y-2 text-xs text-neutral-400">
              <p>• {t('editor.sidebar.shiftTip')}</p>
              <p>• {t('editor.sidebar.xTip')}</p>
              <p>• {t('editor.sidebar.spaceTip')}</p>
            </div>
          </div>
        );
      case 'poi':
        return (
          <div className="p-4">
            <h3 className="font-medium text-white mb-2">{t('editor.sidebar.pois')}</h3>
            <p className="text-sm text-neutral-400">{t('editor.sidebar.poisDesc')}</p>
          </div>
        );
      case 'path':
        return (
          <div className="p-4">
            <h3 className="font-medium text-white mb-2">{t('editor.sidebar.paths')}</h3>
            <p className="text-sm text-neutral-400">{t('editor.sidebar.pathsDesc')}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute start-4 top-1/2 -translate-y-1/2 z-30 flex items-start gap-2">
      <div className="flex flex-col gap-1 p-1.5 rounded-xl bg-neutral-800 border border-neutral-700">
        {tools.map((tool) => (
          <SidebarTool key={tool.tool} {...tool} />
        ))}

        <div className="w-full h-px bg-neutral-700 my-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-10 w-10 rounded-lg text-white hover:bg-neutral-700"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {isSidebarOpen && (
        <div className="w-56 rounded-xl bg-neutral-800 border border-neutral-700">
          {getToolContent()}
        </div>
      )}
    </div>
  );
}
