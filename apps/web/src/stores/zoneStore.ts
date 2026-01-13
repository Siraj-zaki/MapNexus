/**
 * Zone Store
 * Zustand store for zone (polygon) entities with undo/redo support
 */

import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// Types
// ============================================
export type BorderStyle = 'solid' | 'dashed';
export type FontFamily = 'Inter' | 'Roboto' | 'Arial' | 'Georgia' | 'Courier New';

export interface Zone {
  id: string;
  floorId: string;
  name: string;
  // Polygon coordinates - array of [lng, lat] points
  coordinates: [number, number][];
  // Styling
  fillColor: string;
  fillOpacity: number;
  borderColor: string;
  borderStyle: BorderStyle;
  borderWidth: number;
  // Label
  showLabel: boolean;
  labelColor: string;
  labelFontFamily: FontFamily;
  labelFontSize: number;
  labelFontWeight: 'normal' | 'bold';
}

interface DrawingState {
  isActive: boolean;
  points: [number, number][];
  tempPoint: [number, number] | null;
}

interface ZoneState {
  // Data
  zones: Zone[];

  // Drawing state
  drawing: DrawingState;

  // Selection
  selectedZoneId: string | null;

  // Default styling
  defaults: {
    fillColor: string;
    fillOpacity: number;
    borderColor: string;
    borderStyle: BorderStyle;
    borderWidth: number;
    showLabel: boolean;
    labelColor: string;
    labelFontFamily: FontFamily;
    labelFontSize: number;
    labelFontWeight: 'normal' | 'bold';
  };

  // Drawing actions
  startDrawing: () => void;
  addPoint: (position: [number, number]) => void;
  updateTempPoint: (position: [number, number] | null) => void;
  finishDrawing: (floorId: string, name?: string) => string | null;
  cancelDrawing: () => void;

  // CRUD actions
  addZone: (zone: Omit<Zone, 'id'>) => string;
  updateZone: (id: string, updates: Partial<Zone>) => void;
  deleteZone: (id: string) => void;
  selectZone: (id: string | null) => void;

  // Bulk operations
  getZonesByFloor: (floorId: string) => Zone[];
  getZoneById: (id: string) => Zone | undefined;
  clearZones: (floorId?: string) => void;

  // Settings
  setDefaults: (defaults: Partial<ZoneState['defaults']>) => void;
}

// ============================================
// Default values
// ============================================
const DEFAULT_FILL_COLOR = '#3b82f6';
const DEFAULT_FILL_OPACITY = 0.3;
const DEFAULT_BORDER_COLOR = '#1d4ed8';
const DEFAULT_BORDER_STYLE: BorderStyle = 'solid';
const DEFAULT_BORDER_WIDTH = 2;
const DEFAULT_LABEL_COLOR = '#1f2937';
const DEFAULT_FONT_FAMILY: FontFamily = 'Inter';
const DEFAULT_FONT_SIZE = 14;

// ============================================
// Store
// ============================================
export const useZoneStore = create<ZoneState>()(
  persist(
    (set, get) => ({
      zones: [],
      drawing: {
        isActive: false,
        points: [],
        tempPoint: null,
      },
      selectedZoneId: null,
      defaults: {
        fillColor: DEFAULT_FILL_COLOR,
        fillOpacity: DEFAULT_FILL_OPACITY,
        borderColor: DEFAULT_BORDER_COLOR,
        borderStyle: DEFAULT_BORDER_STYLE,
        borderWidth: DEFAULT_BORDER_WIDTH,
        showLabel: true,
        labelColor: DEFAULT_LABEL_COLOR,
        labelFontFamily: DEFAULT_FONT_FAMILY,
        labelFontSize: DEFAULT_FONT_SIZE,
        labelFontWeight: 'normal',
      },

      // ========== Drawing Actions ==========
      startDrawing: () => {
        set({
          drawing: {
            isActive: true,
            points: [],
            tempPoint: null,
          },
          selectedZoneId: null,
        });
      },

      addPoint: (position) => {
        const { drawing } = get();
        if (!drawing.isActive) return;

        set({
          drawing: {
            ...drawing,
            points: [...drawing.points, position],
          },
        });
      },

      updateTempPoint: (position) => {
        const { drawing } = get();
        if (!drawing.isActive) return;

        set({
          drawing: {
            ...drawing,
            tempPoint: position,
          },
        });
      },

      finishDrawing: (floorId, name) => {
        const { drawing, zones, defaults } = get();
        if (!drawing.isActive || drawing.points.length < 3) {
          set({
            drawing: {
              isActive: false,
              points: [],
              tempPoint: null,
            },
          });
          return null;
        }

        const newZone: Zone = {
          id: uuidv4(),
          floorId,
          name: name || `Zone ${zones.length + 1}`,
          coordinates: [...drawing.points],
          fillColor: defaults.fillColor,
          fillOpacity: defaults.fillOpacity,
          borderColor: defaults.borderColor,
          borderStyle: defaults.borderStyle,
          borderWidth: defaults.borderWidth,
          showLabel: defaults.showLabel,
          labelColor: defaults.labelColor,
          labelFontFamily: defaults.labelFontFamily,
          labelFontSize: defaults.labelFontSize,
          labelFontWeight: defaults.labelFontWeight,
        };

        set({
          zones: [...zones, newZone],
          drawing: {
            isActive: false,
            points: [],
            tempPoint: null,
          },
          selectedZoneId: newZone.id, // Auto-select new zone
        });

        return newZone.id;
      },

      cancelDrawing: () => {
        set({
          drawing: {
            isActive: false,
            points: [],
            tempPoint: null,
          },
        });
      },

      // ========== CRUD Actions ==========
      addZone: (zoneData) => {
        const id = uuidv4();
        const newZone: Zone = { ...zoneData, id };
        set((state) => ({ zones: [...state.zones, newZone] }));
        return id;
      },

      updateZone: (id, updates) => {
        set((state) => ({
          zones: state.zones.map((zone) => (zone.id === id ? { ...zone, ...updates } : zone)),
        }));
      },

      deleteZone: (id) => {
        set((state) => ({
          zones: state.zones.filter((zone) => zone.id !== id),
          selectedZoneId: state.selectedZoneId === id ? null : state.selectedZoneId,
        }));
      },

      selectZone: (id) => {
        set({ selectedZoneId: id });
      },

      // ========== Bulk Operations ==========
      getZonesByFloor: (floorId) => {
        return get().zones.filter((zone) => zone.floorId === floorId);
      },

      getZoneById: (id) => {
        return get().zones.find((zone) => zone.id === id);
      },

      clearZones: (floorId) => {
        if (floorId) {
          set((state) => ({
            zones: state.zones.filter((zone) => zone.floorId !== floorId),
          }));
        } else {
          set({ zones: [] });
        }
      },

      // ========== Settings ==========
      setDefaults: (newDefaults) => {
        set((state) => ({
          defaults: { ...state.defaults, ...newDefaults },
        }));
      },
    }),
    {
      name: 'zone-storage',
      partialize: (state) => ({
        zones: state.zones,
        defaults: state.defaults,
      }),
    }
  )
);
