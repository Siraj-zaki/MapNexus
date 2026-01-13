import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useZoneStore } from '@/stores/zoneStore';
import { Trash2, X } from 'lucide-react';

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#1f2937', // gray-800
  '#4b5563', // gray-600
  '#9ca3af', // gray-400
  '#ffffff', // white
];

const FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
];

export function ZonePropertiesPanel() {
  const { selectedZoneId, getZoneById, updateZone, selectZone, deleteZone } = useZoneStore();

  const selectedZone = selectedZoneId ? getZoneById(selectedZoneId) : null;

  if (!selectedZone) return null;

  return (
    <div className="absolute top-16 right-4 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <h3 className="font-semibold text-white">Zone Properties</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
            onClick={() => {
              if (confirm('Are you sure you want to delete this zone?')) {
                deleteZone(selectedZone.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400"
            onClick={() => selectZone(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Helper text if needed */}
        {/* <p className="text-xs text-neutral-500">Edit properties for the selected zone.</p> */}

        {/* Name */}
        <div className="space-y-3">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Zone Name
          </Label>
          <Input
            value={selectedZone.name}
            onChange={(e) => updateZone(selectedZone.id, { name: e.target.value })}
            className="bg-neutral-800 border-neutral-700 focus:border-blue-500"
            placeholder="Enter zone name"
          />
        </div>

        {/* Fill Settings */}
        <div className="space-y-3">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Fill Color
          </Label>
          <div className="grid grid-cols-8 gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateZone(selectedZone.id, { fillColor: color })}
                className={`w-6 h-6 rounded-md border transition-all ${
                  selectedZone.fillColor === color
                    ? 'border-white scale-110 shadow-lg ring-2 ring-blue-500/50'
                    : 'border-transparent hover:border-white/50'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="pt-2">
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-neutral-400">Fill Opacity</Label>
              <span className="text-xs text-neutral-400">
                {Math.round(selectedZone.fillOpacity * 100)}%
              </span>
            </div>
            <Slider
              value={[selectedZone.fillOpacity]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([val]) => updateZone(selectedZone.id, { fillOpacity: val })}
              className="py-2"
            />
          </div>
        </div>

        {/* Border Settings */}
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Border
          </Label>

          <div className="space-y-3">
            <Label className="text-xs text-neutral-400">Border Color</Label>
            <div className="grid grid-cols-8 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateZone(selectedZone.id, { borderColor: color })}
                  className={`w-6 h-6 rounded-md border transition-all ${
                    selectedZone.borderColor === color
                      ? 'border-white scale-110 shadow-lg ring-2 ring-blue-500/50'
                      : 'border-transparent hover:border-white/50'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-neutral-400">Border Style</Label>
              <div className="flex bg-neutral-800 p-1 rounded-lg border border-neutral-700">
                <button
                  onClick={() => updateZone(selectedZone.id, { borderStyle: 'solid' })}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
                    selectedZone.borderStyle === 'solid'
                      ? 'bg-neutral-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Solid
                </button>
                <button
                  onClick={() => updateZone(selectedZone.id, { borderStyle: 'dashed' })}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
                    selectedZone.borderStyle === 'dashed'
                      ? 'bg-neutral-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Dashed
                </button>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-neutral-400">Border Width</Label>
              <span className="text-xs text-neutral-400">{selectedZone.borderWidth}px</span>
            </div>
            <Slider
              value={[selectedZone.borderWidth]}
              min={1}
              max={10}
              step={1}
              onValueChange={([val]) => updateZone(selectedZone.id, { borderWidth: val })}
              className="py-2"
            />
          </div>
        </div>

        {/* Label Settings */}
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
              Label
            </Label>
            <Switch
              checked={selectedZone.showLabel}
              onCheckedChange={(checked) => updateZone(selectedZone.id, { showLabel: checked })}
            />
          </div>

          {selectedZone.showLabel && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-3">
                <Label className="text-xs text-neutral-400">Label Color</Label>
                <div className="grid grid-cols-8 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateZone(selectedZone.id, { labelColor: color })}
                      className={`w-6 h-6 rounded-md border transition-all ${
                        selectedZone.labelColor === color
                          ? 'border-white scale-110 shadow-lg ring-2 ring-blue-500/50'
                          : 'border-transparent hover:border-white/50'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-neutral-400">Font Family</Label>
                <Select
                  value={selectedZone.labelFontFamily}
                  onValueChange={(val: any) =>
                    updateZone(selectedZone.id, { labelFontFamily: val })
                  }
                >
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((font) => (
                      <SelectItem key={font.value} value={font.value} className="text-xs">
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-1">
                <div className="flex justify-between mb-2">
                  <Label className="text-xs text-neutral-400">Font Size</Label>
                  <span className="text-xs text-neutral-400">{selectedZone.labelFontSize}px</span>
                </div>
                <Slider
                  value={[selectedZone.labelFontSize]}
                  min={8}
                  max={32}
                  step={1}
                  onValueChange={([val]) => updateZone(selectedZone.id, { labelFontSize: val })}
                  className="py-2"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-neutral-400">Font Weight</Label>
                <div className="flex bg-neutral-800 p-1 rounded-lg border border-neutral-700">
                  <button
                    onClick={() => updateZone(selectedZone.id, { labelFontWeight: 'normal' })}
                    className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
                      selectedZone.labelFontWeight === 'normal'
                        ? 'bg-neutral-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => updateZone(selectedZone.id, { labelFontWeight: 'bold' })}
                    className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-all ${
                      selectedZone.labelFontWeight === 'bold'
                        ? 'bg-neutral-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Bold
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
