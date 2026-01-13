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
import { useDoorStore } from '@/stores/doorStore';
import { Trash2, X } from 'lucide-react';

const DOOR_TYPES = [
  { value: 'single', label: 'Single Door' },
  { value: 'double', label: 'Double Door' },
  { value: 'sliding', label: 'Sliding Door' },
  { value: 'emergency', label: 'Emergency Exit' },
];

export function DoorPropertiesPanel() {
  const { selectedDoorId, getDoorById, updateDoor, selectDoor, deleteDoor } = useDoorStore();

  const selectedDoor = selectedDoorId ? getDoorById(selectedDoorId) : null;

  if (!selectedDoor) return null;

  return (
    <div className="absolute top-16 right-4 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-20 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <h3 className="font-semibold text-white">Door Properties</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
            onClick={() => {
              if (confirm('Are you sure you want to delete this door?')) {
                deleteDoor(selectedDoor.id);
                selectDoor(null);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-800 text-neutral-400"
            onClick={() => selectDoor(null)}
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
            Door Name / Label
          </Label>
          <Input
            value={selectedDoor.name || ''}
            onChange={(e) => updateDoor(selectedDoor.id, { name: e.target.value })}
            className="bg-neutral-800 border-neutral-700 focus:border-blue-500"
            placeholder="e.g. Main Entrance"
          />
        </div>

        {/* Type settings */}
        <div className="space-y-2">
          <Label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
            Door Type
          </Label>
          <Select
            value={selectedDoor.type}
            onValueChange={(val: any) => updateDoor(selectedDoor.id, { type: val })}
          >
            <SelectTrigger className="bg-neutral-800 border-neutral-700 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOOR_TYPES.map((t) => (
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
            <span className="text-xs text-neutral-400">{selectedDoor.width.toFixed(2)}m</span>
          </div>
          <Slider
            value={[selectedDoor.width]}
            min={0.5}
            max={5}
            step={0.1}
            onValueChange={([val]) => updateDoor(selectedDoor.id, { width: val })}
            className="py-2"
          />
          <p className="text-xs text-neutral-500">
            Approx {(selectedDoor.width * 3.28084).toFixed(1)} ft
          </p>
        </div>
      </div>
    </div>
  );
}
