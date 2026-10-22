// App state (zustand). See docs/architecture.md#web-state-shape-sketch-webstate.
import { create } from 'zustand';
import {
  DEFAULT_SETTINGS, EMPTY_SELECTION,
  type RasterImage, type Selection, type Settings,
} from '../../core/types';
import type { EffectInstance, Params } from '../../core/effects/types';
import { EMPTY_HISTORY, type History } from './history';
import { todo } from '../../core/todo';

export type Tool = 'rect' | 'range' | 'pan';

export interface LoadedImage {
  name: string;
  base: RasterImage;
  proxy: RasterImage | null;
  proxyScale: number;
}

export interface RenderState {
  status: 'idle' | 'rendering' | 'error';
  output: RasterImage | null;
  before: Float32Array | null;
  after: Float32Array | null;
  offsets: Uint32Array | null;
  ms: number;
  errors: Record<string, string>;
}

export interface ViewState {
  showBefore: boolean;
  zoom: number;
  tool: Tool;
  fullResPreview: boolean;
  /** Pixel under the cursor (image or waveform hover), for the linked cursor. */
  hoverPixel: { x: number; y: number } | null;
}

export interface AppState {
  image: LoadedImage | null;
  settings: Settings;
  selection: Selection;
  chain: EffectInstance[];
  seed: number;
  render: RenderState;
  view: ViewState;
  history: History;

  // image
  importFile(file: File): Promise<void>;
  exportPng(): Promise<void>;
  // settings & selection
  setSettings(patch: Partial<Settings>): void;
  setSelection(selection: Selection): void;
  clearSelection(): void;
  // chain
  addEffect(effectId: string): void;
  updateParams(uid: string, patch: Params): void;
  removeEffect(uid: string): void;
  moveEffect(uid: string, toIndex: number): void;
  toggleBypass(uid: string): void;
  // bake & history
  bake(): Promise<void>;
  undo(): void;
  redo(): void;
  /** Called on slider pointer-up so a drag becomes one undo step. */
  commitHistory(): void;
  // recipes
  saveRecipe(): void;
  loadRecipe(file: File): Promise<void>;
  copyCliCommand(): Promise<void>;
  // view
  setView(patch: Partial<ViewState>): void;
  /** Kick off a debounced preview render from the current state. */
  requestPreview(): void;
}

const INITIAL_RENDER: RenderState = {
  status: 'idle', output: null, before: null, after: null, offsets: null, ms: 0, errors: {},
};

export const useStore = create<AppState>()((set, get) => ({
  image: null,
  settings: DEFAULT_SETTINGS,
  selection: EMPTY_SELECTION,
  chain: [],
  seed: 1,
  render: INITIAL_RENDER,
  view: { showBefore: false, zoom: 1, tool: 'rect', fullResPreview: false, hoverPixel: null },
  history: EMPTY_HISTORY,

  importFile: async () => todo('importFile'),
  exportPng: async () => todo('exportPng'),

  setSettings: (patch) => {
    set({ settings: { ...get().settings, ...patch } });
    get().requestPreview();
  },
  setSelection: (selection) => {
    set({ selection });
    get().requestPreview();
  },
  clearSelection: () => get().setSelection(EMPTY_SELECTION),

  addEffect: () => todo('addEffect'),
  updateParams: () => todo('updateParams'),
  removeEffect: () => todo('removeEffect'),
  moveEffect: () => todo('moveEffect'),
  toggleBypass: () => todo('toggleBypass'),

  bake: async () => todo('bake'),
  undo: () => todo('undo'),
  redo: () => todo('redo'),
  commitHistory: () => todo('commitHistory'),

  saveRecipe: () => todo('saveRecipe'),
  loadRecipe: async () => todo('loadRecipe'),
  copyCliCommand: async () => todo('copyCliCommand'),

  setView: (patch) => set({ view: { ...get().view, ...patch } }),
  requestPreview: () => {
    // TODO: build a RenderRequest (proxy + scaled selection) and hand it to the PreviewScheduler.
  },
}));
