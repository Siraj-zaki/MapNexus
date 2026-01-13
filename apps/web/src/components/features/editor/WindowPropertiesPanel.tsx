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
import { useWindowStore } from '@/stores/windowStore';
import { Trash2, X } from 'lucide-react';

const WINDOW_TYPES = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'sliding', label: 'Sliding' },
  { value: 'casement', label: 'Casement' },
  { value: 'awkning', label: 'Awning' },
];

export function WindowPropertiesPanel() {
  const { selectedWindowId, getWindowById, updateWindow, selectWindow, deleteWindow } =
    useWindowStore();

  const selectedWindow = selectedWindowId ? getWindowById(selectedWindowId) : null;

  if (!selectedWindow) return null;

  return (
    <div className="absolute top-16 right-4 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <h3 className="font-semibold text-white">Window Properties</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
            onClick={() => {
              if (confirm('Are you sure you want to delete this window?')) {
                deleteWindow(selectedWindow.id);
                selectWindow(null);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400"
            onClick={() => selectWindow(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Name */}
        <div className="space-y-3">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Window Name / Label
          </Label>
          <Input
            value={selectedWindow.name || ''}
            onChange={(e) => updateWindow(selectedWindow.id, { name: e.target.value })}
            className="bg-neutral-800 border-neutral-700 focus:border-blue-500"
            placeholder="e.g. Office Window"
          />
        </div>

        {/* Type settings */}
        <div className="space-y-2">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Window Type
          </Label>
          <Select
            value={selectedWindow.type}
            onValueChange={(val: any) => updateWindow(selectedWindow.id, { type: val })}
          >
            <SelectTrigger className="bg-neutral-800 border-neutral-700 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Width Settings */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between mb-2">
            <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
              Width (meters)
            </Label>
            <span className="text-xs text-neutral-400">{selectedWindow.width.toFixed(2)}m</span>
          </div>
          <Slider
            value={[selectedWindow.width]}
            min={0.5}
            max={5}
            step={0.1}
            onValueChange={([val]) => updateWindow(selectedWindow.id, { width: val })}
            className="py-2"
          />
          <p className="text-xs text-neutral-500">
            Approx {(selectedWindow.width * 3.28084).toFixed(1)} ft
          </p>
        </div>
      </div>
    </div>
  );
}
