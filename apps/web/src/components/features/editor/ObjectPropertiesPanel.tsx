import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useObjectStore } from '@/stores/objectStore';
import { Trash2, X } from 'lucide-react';

const COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#fcdf03',
  '#1f2937',
  '#ffffff',
];

export function ObjectPropertiesPanel() {
  const { selectedObjectId, getObjectById, updateObject, selectObject, deleteObject } =
    useObjectStore();

  const selectedObject = selectedObjectId ? getObjectById(selectedObjectId) : null;

  if (!selectedObject) return null;

  return (
    <div className="absolute top-16 right-4 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <h3 className="font-semibold text-white">Object Properties</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
            onClick={() => {
              if (confirm('Are you sure you want to delete this object?')) {
                deleteObject(selectedObject.id);
                selectObject(null);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400"
            onClick={() => selectObject(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Name */}
        <div className="space-y-3">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Name
          </Label>
          <Input
            value={selectedObject.name}
            onChange={(e) => updateObject(selectedObject.id, { name: e.target.value })}
            className="bg-neutral-800 border-neutral-700 focus:border-blue-500 text-white"
          />
        </div>

        {/* Color */}
        <div className="space-y-3">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Fill Color
          </Label>
          <div className="grid grid-cols-7 gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateObject(selectedObject.id, { color })}
                className={`w-6 h-6 rounded-md border transition-all ${
                  selectedObject.color === color
                    ? 'border-white scale-110 shadow-lg ring-2 ring-blue-500/50'
                    : 'border-transparent hover:border-white/50'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-3">
          <div className="flex justify-between mb-2">
            <Label className="text-xs text-neutral-400 uppercase">Opacity</Label>
            <span className="text-xs text-neutral-400">
              {(selectedObject.opacity * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[selectedObject.opacity]}
            min={0}
            max={1}
            step={0.1}
            onValueChange={([val]) => updateObject(selectedObject.id, { opacity: val })}
            className="py-2"
          />
        </div>

        {/* 3D Properties */}
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            3D Dimensions
          </Label>

          {/* Height (Extrusion) */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-neutral-400">Height (Extrusion)</Label>
              <span className="text-xs text-neutral-400">{selectedObject.height}m</span>
            </div>
            <Slider
              value={[selectedObject.height]}
              min={0.1}
              max={20}
              step={0.1}
              onValueChange={([val]) => updateObject(selectedObject.id, { height: val })}
              className="py-2"
            />
          </div>

          {/* Base Height (Elevation) */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-neutral-400">Distance from Surface</Label>
              <span className="text-xs text-neutral-400">{selectedObject.baseHeight}m</span>
            </div>
            <Slider
              value={[selectedObject.baseHeight]}
              min={0}
              max={10}
              step={0.1}
              onValueChange={([val]) => updateObject(selectedObject.id, { baseHeight: val })}
              className="py-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
