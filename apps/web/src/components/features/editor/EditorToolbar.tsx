/**
 * EditorToolbar Component with i18n
 * Bottom toolbar with tools, dropdowns, help, and layer controls
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useEditorStore, type EditorTool } from '@/stores/editorStore';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Circle,
  DoorOpen,
  Globe,
  Globe2,
  Grid3X3,
  Hand,
  HelpCircle,
  Hexagon,
  ImageIcon,
  Layers,
  Lightbulb,
  Link2,
  MapPin,
  MousePointer2,
  PenTool,
  Redo,
  Ruler,
  Shield,
  Sparkles,
  Square,
  Star,
  Tag,
  Undo,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ToolButtonProps {
  tool?: EditorTool;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: boolean;
}

function ToolButton({
  tool,
  icon,
  label,
  shortcut,
  isActive: isActiveProp,
  onClick,
  badge,
}: ToolButtonProps) {
  const { activeTool, setActiveTool } = useEditorStore();
  const isActive = isActiveProp ?? (tool ? activeTool === tool : false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (tool) {
      setActiveTool(tool);
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClick}
            className={cn(
              'h-9 w-9 text-white hover:bg-neutral-700 relative',
              isActive && 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            {icon}
            {badge && (
              <span className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-neutral-800" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-neutral-800 border-neutral-700 text-white">
          <p>
            {label}
            {shortcut && <span className="ms-2 text-neutral-400">{shortcut}</span>}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Tool Popover for detailed tips
interface ToolPopoverProps {
  title: string;
  icon: React.ReactNode;
  shortcut: string;
  tips: { key: string; text: string }[];
  tool: EditorTool;
  children: React.ReactNode;
}

function ToolPopover({ title, icon, shortcut, tips, tool, children }: ToolPopoverProps) {
  const { activeTool, setActiveTool } = useEditorStore();
  const isActive = activeTool === tool;

  // Click directly selects the tool - no dropdown blocking
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTool(tool);
  };

  return (
    <div className="relative group">
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          'h-9 w-9 text-white hover:bg-neutral-700',
          isActive && 'bg-blue-600 hover:bg-blue-700 text-white'
        )}
        onClick={handleClick}
      >
        {children}
      </Button>
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="w-64 bg-neutral-800 border border-neutral-700 p-3 rounded-lg shadow-xl">
          <div className="text-xs text-neutral-400 mb-2">{title}</div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-neutral-700 rounded">{icon}</div>
            <span className="text-white font-medium flex-1">{title}</span>
            <span className="text-neutral-400 text-sm">{shortcut}</span>
          </div>
          <div className="space-y-1.5">
            {tips.map((tip, i) => (
              <p key={i} className="text-xs text-neutral-300">
                <span className="text-yellow-400 me-1">◆</span>
                {tip.text.split(tip.key).map((part, j, arr) =>
                  j < arr.length - 1 ? (
                    <span key={j}>
                      {part}
                      <span className="text-blue-400">{tip.key}</span>
                    </span>
                  ) : (
                    part
                  )
                )}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditorToolbar() {
  const { t } = useTranslation();
  const { activeTool, setActiveTool, canUndo, canRedo, undo, redo, isGridVisible, toggleGrid } =
    useEditorStore();
  const [stampSize, setStampSize] = useState(3);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showTipsPanel, setShowTipsPanel] = useState(false);
  const [activeMapLayer, setActiveMapLayer] = useState<'street' | 'satellite'>('street');
  const [floorPlanOpacity, setFloorPlanOpacity] = useState(35);
  const [layerToggles, setLayerToggles] = useState({
    floorPlan: true,
    locationLabels: false,
    measurements: false,
    geometry: false,
  });
  const [completedTips, setCompletedTips] = useState<number[]>([]);

  // Check if a group of tools is active
  const isWallGroupActive = activeTool === 'wall';
  const isFeaturesActive = activeTool === 'door' || activeTool === 'window';
  const isConnectionsActive = activeTool === 'stairway' || activeTool === 'elevator';
  const isObjectsActive =
    activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'customObject';

  const toggleLayerOption = (key: keyof typeof layerToggles) => {
    setLayerToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTipComplete = (index: number) => {
    setCompletedTips((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const tipsList = [
    {
      title: t('editor.tips.aiMapping'),
      description: t('editor.tips.aiMappingDesc'),
    },
    {
      title: t('editor.tips.wallsRooms'),
      description: t('editor.tips.wallsRoomsDesc'),
    },
    {
      title: t('editor.tips.addDoors'),
      description: t('editor.tips.addDoorsDesc'),
    },
    {
      title: t('editor.tips.attachLocations'),
      description: t('editor.tips.attachLocationsDesc'),
    },
    {
      title: t('editor.tips.helpMenu'),
      description: t('editor.tips.helpMenuDesc'),
    },
  ];

  const completionPercent = Math.round((completedTips.length / tipsList.length) * 100);

  return (
    <>
      {/* Left Side - Layer Panel Toggle */}
      <div className="absolute bottom-4 start-4 z-30">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={cn(
            'h-10 w-10 bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700',
            showLayerPanel && 'bg-neutral-700'
          )}
        >
          <Layers className="h-5 w-5" />
        </Button>
      </div>

      {/* Left Side - Vertical Layer Panel */}
      {showLayerPanel && (
        <div className="absolute bottom-16 start-4 z-30 flex flex-col gap-1 p-2 rounded-xl bg-neutral-800 border border-neutral-700">
          {/* Map Type Buttons */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setActiveMapLayer('street')}
                  className={cn(
                    'h-10 w-10 text-white hover:bg-neutral-700',
                    activeMapLayer === 'street' && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  <Globe className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-neutral-800 border-neutral-700 text-white flex items-center gap-2"
              >
                {t('editor.layers.streetMap')} <span className="text-neutral-400">⌘+S</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setActiveMapLayer('satellite')}
                  className={cn(
                    'h-10 w-10 text-white hover:bg-neutral-700',
                    activeMapLayer === 'satellite' && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  <Globe2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-neutral-800 border-neutral-700 text-white flex items-center gap-2"
              >
                {t('editor.layers.satelliteMap')} <span className="text-neutral-400">⌘+E</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Layer Options */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleLayerOption('floorPlan')}
                  className={cn(
                    'h-10 w-10 text-white hover:bg-neutral-700',
                    layerToggles.floorPlan && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-neutral-800 border-neutral-700 text-white p-3 w-48"
              >
                <div className="flex items-center justify-between mb-2">
                  <span>{t('editor.layers.floorPlan')}</span>
                  <span className="text-neutral-400">⌘+B</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={floorPlanOpacity}
                    onChange={(e) => setFloorPlanOpacity(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="text-sm w-10">{floorPlanOpacity}%</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleLayerOption('locationLabels')}
                  className={cn(
                    'h-10 w-10 text-white hover:bg-neutral-700',
                    layerToggles.locationLabels && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  <Tag className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-neutral-800 border-neutral-700 text-white flex items-center gap-2"
              >
                {t('editor.layers.locationLabels')} <span className="text-neutral-400">⌘+L</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleLayerOption('measurements')}
                  className={cn(
                    'h-10 w-10 text-white hover:bg-neutral-700',
                    layerToggles.measurements && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  <Ruler className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-neutral-800 border-neutral-700 text-white flex items-center gap-2"
              >
                {t('editor.layers.measurements')} <span className="text-neutral-400">⌘+M</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleLayerOption('geometry')}
                  className={cn(
                    'h-10 w-10 text-white hover:bg-neutral-700',
                    layerToggles.geometry && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  <Hexagon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-neutral-800 border-neutral-700 text-white flex items-center gap-2"
              >
                {t('editor.layers.geometry')} <span className="text-neutral-400">Hold G, ⌘+G</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-full h-px bg-neutral-700 my-1" />

          {/* Close Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowLayerPanel(false)}
            className="h-10 w-10 text-white hover:bg-neutral-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Left Side - Useful Tips Button */}
      <div className="absolute bottom-4 start-16 z-30">
        <Button
          variant="ghost"
          onClick={() => setShowTipsPanel(!showTipsPanel)}
          className={cn(
            'h-10 bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700 gap-2 px-3',
            showTipsPanel && 'bg-neutral-700'
          )}
        >
          <Lightbulb className="h-4 w-4" />
          <span className="text-sm">{t('editor.toolbar.usefulTips')}</span>
          <span className="h-5 w-5 rounded-full bg-blue-600 text-xs flex items-center justify-center">
            {5 - completedTips.length}
          </span>
        </Button>
      </div>

      {/* Important Tips Panel */}
      {showTipsPanel && (
        <div className="absolute bottom-16 start-16 z-40 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <span className="font-semibold text-gray-900">{t('editor.tips.title')}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowTipsPanel(false)}
                className="h-6 w-6 text-gray-400 hover:text-gray-600"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500">{completionPercent}%</span>
              </div>
            </div>

            {/* Tips List */}
            <div className="space-y-3">
              {tipsList.map((tip, index) => (
                <div
                  key={index}
                  className="flex gap-3 cursor-pointer"
                  onClick={() => toggleTipComplete(index)}
                >
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                      completedTips.includes(index)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    )}
                  >
                    {completedTips.includes(index) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p
                      className={cn(
                        'font-medium text-sm',
                        completedTips.includes(index)
                          ? 'text-gray-400 line-through'
                          : 'text-gray-900'
                      )}
                    >
                      {tip.title}
                    </p>
                    <p className="text-xs text-gray-500">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dismiss Link */}
            <button
              onClick={() => setShowTipsPanel(false)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              {t('editor.tips.dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Center Main Toolbar */}
      <div className="absolute bottom-4 start-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-1 p-1.5 rounded-xl bg-neutral-800 border border-neutral-700">
          {/* Select Tool with Popover */}
          <ToolPopover
            title={t('editor.tools.select')}
            icon={<MousePointer2 className="h-4 w-4 text-white" />}
            shortcut="V"
            tool="select"
            tips={[
              { key: 'Shift+Click', text: 'Shift+Click to multi select geometry' },
              {
                key: 'Shift+Double Click',
                text: 'Shift+Double Click to select all similar geometry',
              },
              { key: 'Double Click', text: 'Double Click to select overlapping geometry' },
              { key: '⌘+Click', text: '⌘+Click to square/straighten wall corners' },
            ]}
          >
            <MousePointer2 className="h-4 w-4" />
          </ToolPopover>

          {/* Pan Tool */}
          <ToolButton
            tool="pan"
            icon={<Hand className="h-4 w-4" />}
            label={t('editor.tools.pan')}
            shortcut="Hold Space, H"
          />

          {/* Zone Tool */}
          <ToolButton
            tool="zone"
            icon={<Grid3X3 className="h-4 w-4" />}
            label={t('editor.tools.zone')}
            shortcut="Z"
          />

          {/* Wall Tool with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'h-9 w-9 text-white hover:bg-neutral-700',
                  isWallGroupActive && 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                <PenTool className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              side="top"
              sideOffset={12}
              className="w-64 bg-neutral-800 border-neutral-700 p-3"
            >
              <div className="text-xs text-neutral-400 mb-2">{t('editor.tools.wall')}</div>
              <DropdownMenuItem
                onClick={() => setActiveTool('wall')}
                className={cn(
                  'text-white hover:bg-neutral-700 gap-3',
                  activeTool === 'wall' && 'bg-neutral-700'
                )}
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="flex-1">{t('editor.tools.wall')}</span>
                <span className="text-neutral-400">W</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-700 my-2" />
              <div className="space-y-1.5 px-2">
                <p className="text-xs text-neutral-300">
                  <span className="text-yellow-400 me-1">◆</span>
                  Hold <span className="text-blue-400">Shift</span> to draw straight walls
                </p>
                <p className="text-xs text-neutral-300">
                  <span className="text-yellow-400 me-1">◆</span>
                  Hold <span className="text-blue-400">X</span> to disable snapping
                </p>
                <p className="text-xs text-neutral-300">
                  <span className="text-yellow-400 me-1">◆</span>
                  Change <span className="text-blue-400">Space type</span> to control appearances
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Wall Features (Door/Window) Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'h-9 w-9 text-white hover:bg-neutral-700',
                  isFeaturesActive && 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                <DoorOpen className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              side="top"
              sideOffset={12}
              className="w-64 bg-neutral-800 border-neutral-700 p-3"
            >
              <div className="text-xs text-neutral-400 mb-2">
                {t('editor.toolbar.wallFeatures')}
              </div>
              <DropdownMenuItem
                onClick={() => setActiveTool('door')}
                className={cn(
                  'text-white hover:bg-neutral-700 gap-3',
                  activeTool === 'door' && 'bg-neutral-700'
                )}
              >
                <DoorOpen className="h-4 w-4" />
                <span className="flex-1">{t('editor.tools.door')}</span>
                <span className="text-neutral-400">D</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTool('window')}
                className={cn(
                  'text-white hover:bg-neutral-700 gap-3',
                  activeTool === 'window' && 'bg-neutral-700'
                )}
              >
                <Square className="h-4 w-4" />
                <span className="flex-1">{t('editor.tools.window')}</span>
                <span className="text-neutral-400">I</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-700 my-2" />
              <div className="px-2">
                <div className="text-xs text-neutral-400 mb-2">{t('editor.toolbar.stampSize')}</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    value={stampSize}
                    onChange={(e) => setStampSize(Number(e.target.value))}
                    min={1}
                    max={10}
                    step={0.5}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="text-white text-sm w-16">{stampSize.toFixed(3)} ft</span>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-neutral-700 my-2" />
              <div className="space-y-1.5 px-2">
                <p className="text-xs text-neutral-300">
                  <span className="text-yellow-400 me-1">◆</span>
                  Use <span className="text-blue-400">⌘+Scroll</span> to change the stamp size
                </p>
                <p className="text-xs text-neutral-300">
                  <span className="text-yellow-400 me-1">◆</span>
                  Place <span className="text-blue-400">overlapping</span> doors to connect
                  buildings
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Rectangle/Shape Tool */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'h-9 w-9 text-white hover:bg-neutral-700',
                  isObjectsActive && 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                <Square className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              side="top"
              sideOffset={12}
              className="w-64 bg-neutral-800 border-neutral-700 p-3"
            >
              <div className="text-xs text-neutral-400 mb-2">{t('editor.toolbar.objects')}</div>
              <DropdownMenuItem
                onClick={() => setActiveTool('rectangle')}
                className={cn(
                  'text-white hover:bg-neutral-700 gap-3',
                  activeTool === 'rectangle' && 'bg-neutral-700'
                )}
              >
                <Square className="h-4 w-4" />
                <span className="flex-1">{t('editor.toolbar.rectangle')}</span>
                <span className="text-neutral-400">O</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTool('circle')}
                className={cn(
                  'text-white hover:bg-neutral-700 gap-3',
                  activeTool === 'circle' && 'bg-neutral-700'
                )}
              >
                <Circle className="h-4 w-4" />
                <span className="flex-1">{t('editor.toolbar.circle')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTool('customObject')}
                className={cn(
                  'text-white hover:bg-neutral-700 gap-3',
                  activeTool === 'customObject' && 'bg-neutral-700'
                )}
              >
                <PenTool className="h-4 w-4" />
                <span className="flex-1">{t('editor.toolbar.customObject')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-700 my-2" />
              <div className="space-y-1.5 px-2">
                <p className="text-xs text-neutral-300">
                  <span className="text-yellow-400 me-1">◆</span>
                  Hold <span className="text-blue-400">X</span> to disable snapping
                </p>
                <p className="text-xs text-neutral-300">
                  <span className="text-yellow-400 me-1">◆</span>
                  Use <span className="text-blue-400">⌘+C / ⌘+V</span> to duplicate objects
                </p>
                <p className="text-xs text-neutral-300">
                  <span className="text-yellow-400 me-1">◆</span>
                  Use <span className="text-blue-400">Enter</span> to toggle custom object editing
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* POI Tool */}
          <ToolButton
            tool="poi"
            icon={<MapPin className="h-4 w-4" />}
            label={t('editor.tools.poi')}
            shortcut="P"
          />

          {/* Safety Annotations Tool */}
          <ToolButton
            tool="safety"
            icon={<Shield className="h-4 w-4" />}
            label={t('editor.toolbar.safetyAnnotations')}
            shortcut="Shift+S"
          />

          {/* Connections Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'h-9 w-9 text-white hover:bg-neutral-700',
                  isConnectionsActive && 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              side="top"
              sideOffset={12}
              className="w-64 bg-neutral-800 border-neutral-700 p-3"
            >
              <div className="text-xs text-neutral-400 mb-2">{t('editor.toolbar.connections')}</div>
              <DropdownMenuItem
                onClick={() => setActiveTool('stairway')}
                className={cn(
                  'text-white hover:bg-neutral-700 gap-3',
                  activeTool === 'stairway' && 'bg-neutral-700'
                )}
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="flex-1">{t('editor.toolbar.stairway')}</span>
                <span className="text-neutral-400">S</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTool('elevator')}
                className={cn(
                  'text-white hover:bg-neutral-700 gap-3',
                  activeTool === 'elevator' && 'bg-neutral-700'
                )}
              >
                <Square className="h-4 w-4" />
                <span className="flex-1">{t('editor.toolbar.elevator')}</span>
                <span className="text-neutral-400">E</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-700 my-2" />
              <div className="px-2">
                <p className="text-xs text-neutral-300">
                  <span className="text-yellow-400 me-1">◆</span>
                  Set <span className="text-blue-400">Floor span</span> to connect different floors
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* AI Mapping Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'h-9 w-9 text-white hover:bg-neutral-700 relative',
                  activeTool === 'aiMapping' && 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                <Sparkles className="h-4 w-4" />
                <span className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-neutral-800" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              side="top"
              sideOffset={12}
              className="w-72 bg-neutral-800 border-neutral-700 p-3"
            >
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white mb-2 gap-2"
                onClick={() => setActiveTool('aiMapping')}
              >
                <Sparkles className="h-4 w-4" />
                {t('editor.toolbar.runAiMapping')}
              </Button>
              <Button
                variant="outline"
                className="w-full bg-neutral-700 border-neutral-600 text-white hover:bg-neutral-600 mb-3"
              >
                {t('editor.toolbar.deleteAiResults')}
              </Button>

              <DropdownMenuLabel className="text-neutral-400 text-xs font-normal">
                {t('editor.toolbar.autoCreateWhileMapping')}
              </DropdownMenuLabel>

              <div className="space-y-2 mt-2">
                {[
                  { key: 'doors', label: t('editor.toolbar.aiDoors'), on: true },
                  { key: 'windows', label: t('editor.toolbar.aiWindows'), on: true },
                  { key: 'connections', label: t('editor.toolbar.aiConnections'), premium: true },
                  { key: 'safety', label: t('editor.toolbar.aiSafety'), premium: true, beta: true },
                  {
                    key: 'locationsPOIs',
                    label: t('editor.toolbar.aiLocationsPOIs'),
                    premium: true,
                  },
                  {
                    key: 'locationsRooms',
                    label: t('editor.toolbar.aiLocationsRooms'),
                    premium: true,
                  },
                  {
                    key: 'locationsObjects',
                    label: t('editor.toolbar.aiLocationsObjects'),
                    premium: true,
                  },
                  {
                    key: 'locationsConnections',
                    label: t('editor.toolbar.aiLocationsConnections'),
                    premium: true,
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <button
                        className={cn(
                          'w-8 h-4 rounded-full transition-colors relative',
                          item.on ? 'bg-blue-600' : 'bg-neutral-600'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform',
                            item.on ? 'end-0.5' : 'start-0.5'
                          )}
                        />
                      </button>
                      <span className="text-white text-sm">{item.label}</span>
                      {item.beta && (
                        <span className="text-xs bg-orange-600 text-white px-1.5 rounded">
                          BETA
                        </span>
                      )}
                    </div>
                    {item.premium && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />}
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-neutral-700 mx-1" />

          {/* Grid Toggle */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleGrid}
                  className={cn(
                    'h-9 w-9 text-white hover:bg-neutral-700',
                    isGridVisible && 'bg-neutral-600'
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 border-neutral-700 text-white">
                {t('editor.grid.toggle')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-px h-6 bg-neutral-700 mx-1" />

          {/* Undo */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={undo}
                  disabled={!canUndo}
                  className="h-9 w-9 text-white hover:bg-neutral-700 disabled:opacity-30 disabled:text-neutral-500"
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 border-neutral-700 text-white">
                {t('editor.history.undo')} (⌘Z)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Redo */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={redo}
                  disabled={!canRedo}
                  className="h-9 w-9 text-white hover:bg-neutral-700 disabled:opacity-30 disabled:text-neutral-500"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 border-neutral-700 text-white">
                {t('editor.history.redo')} (⌘⇧Z)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Right Side - Help Button */}
      <div className="absolute bottom-4 end-4 z-30">
        <Button
          variant="ghost"
          className="h-10 bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700 gap-2 px-3"
        >
          <span className="text-sm">{t('editor.actions.help')}</span>
          <HelpCircle className="h-4 w-4" />
          <span className="h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center">
            1
          </span>
        </Button>
      </div>
    </>
  );
}
