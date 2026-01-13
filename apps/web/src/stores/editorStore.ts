/**
 * Editor Store
 * Zustand store for map editor state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tool types
export type EditorTool =
  | 'select'
  | 'pan'
  | 'zone'
  | 'wall'
  | 'door'
  | 'window'
  | 'poi'
  | 'safety'
  | 'stairway'
  | 'elevator'
  | 'rectangle'
  | 'circle'
  | 'customObject'
  | 'path'
  | 'measure'
  | 'aiMapping';

// Floor type
export interface Floor {
  id: string;
  name: string;
  level: number;
  floorPlanUrl?: string;
}

// Map type
export interface EditorMap {
  id: string;
  name: string;
  floors: Floor[];
  createdAt: string;
  updatedAt: string;
}

interface EditorState {
  // Current map data
  map: EditorMap | null;
  currentFloorId: string | null;

  // Editor state
  activeTool: EditorTool;
  zoom: number;
  isGridVisible: boolean;
  isSnapEnabled: boolean;

  // UI state
  isSidebarOpen: boolean;
  isPropertiesOpen: boolean;

  // History for undo/redo
  canUndo: boolean;
  canRedo: boolean;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  setMap: (map: EditorMap | null) => void;
  setCurrentFloor: (floorId: string | null) => void;
  setActiveTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleSidebar: () => void;
  toggleProperties: () => void;
  undo: () => void;
  redo: () => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  reset: () => void;
}

const initialState = {
  map: null,
  currentFloorId: null,
  activeTool: 'select' as EditorTool,
  zoom: 100,
  isGridVisible: true,
  isSnapEnabled: true,
  isSidebarOpen: false,
  isPropertiesOpen: false,
  canUndo: false,
  canRedo: false,
  isLoading: false,
  isSaving: false,
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setMap: (map) =>
        set({
          map,
          currentFloorId: map?.floors[0]?.id || null,
        }),

      setCurrentFloor: (floorId) => set({ currentFloorId: floorId }),

      setActiveTool: (tool) =>
        set({
          activeTool: tool,
          isSidebarOpen: [
            'zone',
            'wall',
            'door',
            'window',
            'poi',
            'safety',
            'stairway',
            'elevator',
            'rectangle',
            'circle',
            'customObject',
            'path',
            'measure',
            'aiMapping',
          ].includes(tool),
        }),

      setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 25), 400) }),

      zoomIn: () => {
        const { zoom } = get();
        set({ zoom: Math.min(zoom + 25, 400) });
      },

      zoomOut: () => {
        const { zoom } = get();
        set({ zoom: Math.max(zoom - 25, 25) });
      },

      resetZoom: () => set({ zoom: 100 }),

      toggleGrid: () => set((state) => ({ isGridVisible: !state.isGridVisible })),

      toggleSnap: () => set((state) => ({ isSnapEnabled: !state.isSnapEnabled })),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      toggleProperties: () => set((state) => ({ isPropertiesOpen: !state.isPropertiesOpen })),

      undo: () => {
        // Import and call wallStore undo
        import('@/stores/wallStore').then(({ useWallStore }) => {
          useWallStore.getState().undo();
        });
      },

      redo: () => {
        // Import and call wallStore redo
        import('@/stores/wallStore').then(({ useWallStore }) => {
          useWallStore.getState().redo();
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setSaving: (isSaving) => set({ isSaving }),

      reset: () => set(initialState),
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({
        isGridVisible: state.isGridVisible,
        isSnapEnabled: state.isSnapEnabled,
      }),
    }
  )
);
