import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ObjectType = 'rectangle' | 'circle' | 'polygon';

export interface MapObject {
  id: string;
  floorId: string;
  type: ObjectType;

  // Geometry
  points: { x: number; y: number; lngLat: [number, number] }[]; // For Polygon/Rectangle
  center?: { x: number; y: number; lngLat: [number, number] }; // For Circle
  radius?: number; // For Circle (meters)

  // Properties
  name: string;
  color: string;
  opacity: number;
  height: number; // Extrusion height in meters
  baseHeight: number; // Elevation from floor in meters
}

interface ObjectState {
  objects: MapObject[];
  selectedObjectId: string | null;

  selectObject: (id: string | null) => void;
  addObject: (obj: Omit<MapObject, 'id'>) => void;
  updateObject: (id: string, updates: Partial<MapObject>) => void;
  deleteObject: (id: string) => void;
  getObjectsByFloor: (floorId: string) => MapObject[];
  getObjectById: (id: string) => MapObject | undefined;
}

export const useObjectStore = create<ObjectState>()(
  persist(
    (set, get) => ({
      objects: [],
      selectedObjectId: null,

      selectObject: (id) => set({ selectedObjectId: id }),

      addObject: (obj) => {
        set((state) => ({
          objects: [...state.objects, { ...obj, id: uuidv4() }],
        }));
      },

      updateObject: (id, updates) => {
        set((state) => ({
          objects: state.objects.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj)),
        }));
      },

      deleteObject: (id) => {
        set((state) => ({
          objects: state.objects.filter((obj) => obj.id !== id),
        }));
      },

      getObjectsByFloor: (floorId) => {
        return get().objects.filter((obj) => obj.floorId === floorId);
      },

      getObjectById: (id) => {
        return get().objects.find((obj) => obj.id === id);
      },
    }),
    {
      name: 'object-storage',
    }
  )
);
