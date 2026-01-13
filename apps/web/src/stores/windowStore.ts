import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Window {
  id: string;
  floorId: string;
  wallId: string;
  position: { x: number; y: number; lngLat: [number, number] }; // Exact position on the wall
  width: number; // in meters
  name?: string;
  type: 'fixed' | 'sliding' | 'casement' | 'awkning';
}

interface WindowState {
  windows: Window[];
  selectedWindowId: string | null;
  stampSize: number; // Current stamp size for new windows
  setStampSize: (size: number) => void;
  selectWindow: (id: string | null) => void;
  addWindow: (window: Omit<Window, 'id'>) => void;
  updateWindow: (id: string, updates: Partial<Window>) => void;
  deleteWindow: (id: string) => void;
  getWindowsByFloor: (floorId: string) => Window[];
  getWindowById: (id: string) => Window | undefined;
}

export const useWindowStore = create<WindowState>()(
  persist(
    (set, get) => ({
      windows: [],
      selectedWindowId: null,
      stampSize: 3, // Default 3ft

      setStampSize: (size) => set({ stampSize: size }),

      selectWindow: (id) => set({ selectedWindowId: id }),

      addWindow: (window) => {
        set((state) => ({
          windows: [...state.windows, { ...window, id: uuidv4() }],
        }));
      },

      updateWindow: (id, updates) => {
        set((state) => ({
          windows: state.windows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }));
      },

      deleteWindow: (id) => {
        set((state) => ({
          windows: state.windows.filter((w) => w.id !== id),
        }));
      },

      getWindowsByFloor: (floorId) => {
        return get().windows.filter((w) => w.floorId === floorId);
      },

      getWindowById: (id) => {
        return get().windows.find((w) => w.id === id);
      },
    }),
    {
      name: 'window-storage',
    }
  )
);
