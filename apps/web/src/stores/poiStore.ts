import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

export type PoiType =
  | 'generic'
  | 'fire-extinguisher'
  | 'first-aid'
  | 'exit'
  | 'camera'
  | 'elevator'
  | 'stairs'
  | 'restroom'
  | 'hazard';

export interface POI {
  id: string;
  floorId: string;
  type: PoiType;
  position: [number, number]; // [lng, lat]
  label: string;
  color?: string;
}

interface PoiState {
  pois: POI[];
  selectedPoiId: string | null;

  // Actions
  addPoi: (poi: Omit<POI, 'id'>) => void;
  updatePoi: (id: string, updates: Partial<POI>) => void;
  removePoi: (id: string) => void;
  selectPoi: (id: string | null) => void;
  getPoisByFloor: (floorId: string) => POI[];
  getPoiById: (id: string) => POI | undefined;
}

export const usePoiStore = create<PoiState>((set, get) => ({
  pois: [],
  selectedPoiId: null,

  addPoi: (poiData) => {
    const newPoi: POI = {
      ...poiData,
      id: uuidv4(),
    };
    set((state) => ({
      pois: [...state.pois, newPoi],
      selectedPoiId: newPoi.id, // Auto-select new POI
    }));
  },

  updatePoi: (id, updates) => {
    set((state) => ({
      pois: state.pois.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  removePoi: (id) => {
    set((state) => ({
      pois: state.pois.filter((p) => p.id !== id),
      selectedPoiId: state.selectedPoiId === id ? null : state.selectedPoiId,
    }));
  },

  selectPoi: (id) => set({ selectedPoiId: id }),

  getPoisByFloor: (floorId) => {
    return get().pois.filter((p) => p.floorId === floorId);
  },

  getPoiById: (id) => {
    return get().pois.find((p) => p.id === id);
  },
}));
