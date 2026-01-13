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
import { PoiType, usePoiStore } from '@/stores/poiStore';
import { Trash2, X } from 'lucide-react';

const POI_TYPES: { value: PoiType; label: string; color: string }[] = [
  { value: 'generic', label: 'Generic Point', color: '#3b82f6' },
  { value: 'fire-extinguisher', label: 'Fire Extinguisher', color: '#ef4444' },
  { value: 'first-aid', label: 'First Aid Kit', color: '#22c55e' },
  { value: 'exit', label: 'Emergency Exit', color: '#10b981' },
  { value: 'camera', label: 'Security Camera', color: '#6366f1' },
  { value: 'elevator', label: 'Elevator', color: '#f59e0b' },
  { value: 'stairs', label: 'Stairs', color: '#8b5cf6' },
  { value: 'hazard', label: 'Hazard', color: '#f97316' },
];

export function PoiPropertiesPanel() {
  const { selectedPoiId, getPoiById, updatePoi, removePoi, selectPoi } = usePoiStore();
  const selectedPoi = selectedPoiId ? getPoiById(selectedPoiId) : null;

  if (!selectedPoi) return null;

  return (
    <div className="absolute top-16 right-4 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <h3 className="font-semibold text-white">Point Properties</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
            onClick={() => {
              removePoi(selectedPoi.id);
              selectPoi(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400"
            onClick={() => selectPoi(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Label */}
        <div className="space-y-3">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Label
          </Label>
          <Input
            value={selectedPoi.label}
            onChange={(e) => updatePoi(selectedPoi.id, { label: e.target.value })}
            className="bg-neutral-800 border-neutral-700 focus:border-blue-500 text-white"
          />
        </div>

        {/* Type Selector */}
        <div className="space-y-3">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Type
          </Label>
          <Select
            value={selectedPoi.type}
            onValueChange={(val: PoiType) => {
              const typeDef = POI_TYPES.find((t) => t.value === val);
              updatePoi(selectedPoi.id, {
                type: val,
                color: typeDef?.color, // Auto-update color based on type
              });
            }}
          >
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
              {POI_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color Picker (Optional Override) */}
        <div className="space-y-3">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Color
          </Label>
          <div className="flex gap-2 flex-wrap">
            {POI_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => updatePoi(selectedPoi.id, { color: t.color })}
                className={`w-6 h-6 rounded-full border transition-all ${
                  selectedPoi.color === t.color
                    ? 'border-white scale-110 shadow-lg ring-2 ring-blue-500/50'
                    : 'border-transparent hover:border-white/50'
                }`}
                style={{ backgroundColor: t.color }}
                title={t.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
