import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Door {
  id: string;
  floorId: string;
  wallId: string;
  position: { x: number; y: number; lngLat: [number, number] }; // Exact position on the wall
  width: number; // in meters (if we use meters as source of truth)
  name?: string;
  type: 'single' | 'double' | 'sliding' | 'emergency';
}

interface DoorState {
  doors: Door[];
  selectedDoorId: string | null;
  stampSize: number; // Current stamp size for new doors
  setStampSize: (size: number) => void;
  selectDoor: (id: string | null) => void;
  addDoor: (door: Omit<Door, 'id'>) => void;
  updateDoor: (id: string, updates: Partial<Door>) => void;
  deleteDoor: (id: string) => void;
  getDoorsByFloor: (floorId: string) => Door[];
  getDoorById: (id: string) => Door | undefined;
}

export const useDoorStore = create<DoorState>()(
  persist(
    (set, get) => ({
      doors: [],
      selectedDoorId: null,
      stampSize: 3, // Default 3 (from Toolbar)

      setStampSize: (size) => set({ stampSize: size }),

      selectDoor: (id) => set({ selectedDoorId: id }),

      addDoor: (door) => {
        set((state) => ({
          doors: [...state.doors, { ...door, id: uuidv4() }],
        }));
      },

      updateDoor: (id, updates) => {
        set((state) => ({
          doors: state.doors.map((door) => (door.id === id ? { ...door, ...updates } : door)),
        }));
      },

      deleteDoor: (id) => {
        set((state) => ({
          doors: state.doors.filter((door) => door.id !== id),
        }));
      },

      getDoorsByFloor: (floorId) => {
        return get().doors.filter((door) => door.floorId === floorId);
      },

      getDoorById: (id) => {
        return get().doors.find((door) => door.id === id);
      },
    }),
    {
      name: 'door-storage',
    }
  )
);
