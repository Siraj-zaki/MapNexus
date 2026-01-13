/**
 * Wall Store
 * Zustand store for wall entities with undo/redo support
 */

import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// Types
// ============================================
export interface WallNode {
  id: string;
  position: [number, number]; // [lng, lat]
}

export interface Wall {
  id: string;
  floorId: string;
  startNodeId: string;
  endNodeId: string;
  thickness: number;
  height: number;
  color: string;
}

interface DrawingState {
  isActive: boolean;
  startNodeId: string | null;
  tempEndPoint: [number, number] | null;
}

// History entry for undo/redo
interface HistoryEntry {
  nodes: WallNode[];
  walls: Wall[];
}

interface WallState {
  // Data
  nodes: WallNode[];
  walls: Wall[];

  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // Drawing state
  drawing: DrawingState;

  // Selection (supports multi-select)
  selectedWallId: string | null; // Single selection (backward compat)
  selectedWallIds: string[]; // Multi-selection

  // Defaults
  defaultThickness: number;
  defaultHeight: number;
  defaultColor: string;

  // History actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Drawing actions
  startDrawing: (floorId: string, position: [number, number]) => void;
  updatePreview: (position: [number, number]) => void;
  confirmSegment: (floorId: string, position: [number, number]) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;

  // Node helpers
  findNodeAtPosition: (position: [number, number], threshold?: number) => WallNode | null;
  getOrCreateNode: (position: [number, number]) => WallNode;

  // CRUD actions
  deleteWall: (id: string) => void;
  deleteSelectedWall: () => void;
  deleteSelectedWalls: () => void; // Multi-delete
  selectWall: (id: string | null) => void;
  selectWalls: (ids: string[]) => void; // Multi-select
  clearSelection: () => void;

  // Bulk operations
  clearWalls: (floorId?: string) => void;
  getWallsByFloor: (floorId: string) => Wall[];
  getNodeById: (id: string) => WallNode | undefined;
  isWallSelected: (id: string) => boolean;

  // Settings
  setDefaultThickness: (thickness: number) => void;
  setDefaultHeight: (height: number) => void;
  setDefaultColor: (color: string) => void;
}

// ============================================
// Default values
// ============================================
const DEFAULT_THICKNESS = 0.2;
const DEFAULT_HEIGHT = 3;
const DEFAULT_COLOR = '#6b7280';
// Very strict - only connect nodes at virtually the exact same position
const NODE_SNAP_THRESHOLD = 0.0000001; // ~1cm precision
const MAX_HISTORY_SIZE = 50;

// ============================================
// Store
// ============================================
export const useWallStore = create<WallState>()(
  persist(
    (set, get) => ({
      nodes: [],
      walls: [],
      history: [],
      historyIndex: -1,
      maxHistorySize: MAX_HISTORY_SIZE,
      drawing: {
        isActive: false,
        startNodeId: null,
        tempEndPoint: null,
      },
      selectedWallId: null,
      selectedWallIds: [],
      defaultThickness: DEFAULT_THICKNESS,
      defaultHeight: DEFAULT_HEIGHT,
      defaultColor: DEFAULT_COLOR,

      // Push current state to history
      pushHistory: () => {
        const { nodes, walls, history, historyIndex, maxHistorySize } = get();

        // Remove any future history if we're not at the end
        const newHistory = history.slice(0, historyIndex + 1);

        // Add current state
        newHistory.push({
          nodes: JSON.parse(JSON.stringify(nodes)),
          walls: JSON.parse(JSON.stringify(walls)),
        });

        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      // Undo
      undo: () => {
        const { history, historyIndex, nodes, walls } = get();

        if (historyIndex < 0) return;

        // If at the latest state, save current first
        if (historyIndex === history.length - 1) {
          const newHistory = [...history];
          newHistory.push({
            nodes: JSON.parse(JSON.stringify(nodes)),
            walls: JSON.parse(JSON.stringify(walls)),
          });
          set({ history: newHistory });
        }

        const prevState = history[historyIndex];
        if (prevState) {
          set({
            nodes: JSON.parse(JSON.stringify(prevState.nodes)),
            walls: JSON.parse(JSON.stringify(prevState.walls)),
            historyIndex: historyIndex - 1,
            selectedWallId: null,
          });
        }
      },

      // Redo
      redo: () => {
        const { history, historyIndex } = get();

        if (historyIndex >= history.length - 1) return;

        const nextState = history[historyIndex + 2] || history[historyIndex + 1];
        if (nextState) {
          set({
            nodes: JSON.parse(JSON.stringify(nextState.nodes)),
            walls: JSON.parse(JSON.stringify(nextState.walls)),
            historyIndex: historyIndex + 1,
            selectedWallId: null,
          });
        }
      },

      canUndo: () => {
        const { historyIndex } = get();
        return historyIndex >= 0;
      },

      canRedo: () => {
        const { history, historyIndex } = get();
        return historyIndex < history.length - 1;
      },

      findNodeAtPosition: (position, threshold = NODE_SNAP_THRESHOLD) => {
        const { nodes } = get();
        for (const node of nodes) {
          const dx = Math.abs(node.position[0] - position[0]);
          const dy = Math.abs(node.position[1] - position[1]);
          if (dx < threshold && dy < threshold) {
            return node;
          }
        }
        return null;
      },

      getOrCreateNode: (position) => {
        const { nodes, findNodeAtPosition } = get();
        const existing = findNodeAtPosition(position);
        if (existing) return existing;

        const newNode: WallNode = {
          id: uuidv4(),
          position,
        };
        set({ nodes: [...nodes, newNode] });
        return newNode;
      },

      startDrawing: (_floorId, position) => {
        const { getOrCreateNode, pushHistory } = get();
        pushHistory(); // Save state before starting
        const node = getOrCreateNode(position);

        set({
          drawing: {
            isActive: true,
            startNodeId: node.id,
            tempEndPoint: position,
          },
          selectedWallId: null,
        });
      },

      updatePreview: (position) => {
        const { drawing } = get();
        if (!drawing.isActive) return;

        set({
          drawing: {
            ...drawing,
            tempEndPoint: position,
          },
        });
      },

      confirmSegment: (floorId, position) => {
        const { drawing, walls, getOrCreateNode, defaultThickness, defaultHeight, defaultColor } =
          get();
        if (!drawing.isActive || !drawing.startNodeId) return;

        const endNode = getOrCreateNode(position);

        if (endNode.id === drawing.startNodeId) return;

        const newWall: Wall = {
          id: uuidv4(),
          floorId,
          startNodeId: drawing.startNodeId,
          endNodeId: endNode.id,
          thickness: defaultThickness,
          height: defaultHeight,
          color: defaultColor,
        };

        set({
          walls: [...walls, newWall],
          drawing: {
            isActive: true,
            startNodeId: endNode.id,
            tempEndPoint: position,
          },
        });
      },

      finishDrawing: () => {
        set({
          drawing: {
            isActive: false,
            startNodeId: null,
            tempEndPoint: null,
          },
        });
      },

      cancelDrawing: () => {
        set({
          drawing: {
            isActive: false,
            startNodeId: null,
            tempEndPoint: null,
          },
        });
      },

      deleteWall: (id) => {
        const { pushHistory } = get();
        pushHistory(); // Save state before deleting

        set((state) => ({
          walls: state.walls.filter((wall) => wall.id !== id),
          selectedWallId: state.selectedWallId === id ? null : state.selectedWallId,
        }));
      },

      deleteSelectedWall: () => {
        const { selectedWallId, deleteWall } = get();
        if (selectedWallId) {
          deleteWall(selectedWallId);
        }
      },

      selectWall: (id) => {
        set({ selectedWallId: id, selectedWallIds: id ? [id] : [] });
      },

      selectWalls: (ids) => {
        set({
          selectedWallIds: ids,
          selectedWallId: ids.length === 1 ? ids[0] : null,
        });
      },

      clearSelection: () => {
        set({ selectedWallId: null, selectedWallIds: [] });
      },

      isWallSelected: (id) => {
        const { selectedWallIds, selectedWallId } = get();
        return selectedWallIds.includes(id) || selectedWallId === id;
      },

      deleteSelectedWalls: () => {
        const { selectedWallIds, pushHistory } = get();
        if (selectedWallIds.length === 0) return;

        pushHistory();
        set((state) => ({
          walls: state.walls.filter((wall) => !selectedWallIds.includes(wall.id)),
          selectedWallId: null,
          selectedWallIds: [],
        }));
      },

      clearWalls: (floorId) => {
        const { pushHistory } = get();
        pushHistory();

        if (floorId) {
          set((state) => ({
            walls: state.walls.filter((wall) => wall.floorId !== floorId),
          }));
        } else {
          set({ walls: [], nodes: [] });
        }
      },

      getWallsByFloor: (floorId) => {
        return get().walls.filter((wall) => wall.floorId === floorId);
      },

      getNodeById: (id) => {
        return get().nodes.find((node) => node.id === id);
      },

      setDefaultThickness: (thickness) => {
        set({ defaultThickness: Math.max(0.05, Math.min(thickness, 2)) });
      },

      setDefaultHeight: (height) => {
        set({ defaultHeight: Math.max(0.5, Math.min(height, 20)) });
      },

      setDefaultColor: (color) => {
        set({ defaultColor: color });
      },
    }),
    {
      name: 'wall-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        walls: state.walls,
        defaultThickness: state.defaultThickness,
        defaultHeight: state.defaultHeight,
        defaultColor: state.defaultColor,
      }),
    }
  )
);
