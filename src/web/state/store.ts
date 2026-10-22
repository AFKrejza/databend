// App state (zustand). See docs/architecture.md#web-state-shape-sketch-webstate.
import { create } from 'zustand';
import {
  DEFAULT_SETTINGS, EMPTY_SELECTION,
  type RasterImage, type Selection, type Settings,
} from '../../core/types';
import type { EffectInstance, Params } from '../../core/effects/types';
import { createInstance } from '../../core/effects/registry';
import { render, type RenderRequest } from '../../core/engine/render';
import { baseStreamLength, scaleSelection } from '../../core/stream';
import {
  RECIPE_VERSION, chainToRecipeSteps, parseRecipe, recipeToChain, recipeToCliCommand, resolveSelection,
  serializeRecipe, type Recipe,
} from '../../core/recipe';
import { webPlatform } from '../platform';
import { bentName, decodeFile, downloadBlob, encodePng, makeProxy } from '../imageIO';
import { createPreviewScheduler } from './preview';
import { computeWaveData, type WaveData } from './waveData';
import * as hist from './history';

export type Tool = 'rect' | 'range' | 'pan';

export interface LoadedImage {
  name: string;
  base: RasterImage;
  proxy: RasterImage | null;
  proxyScale: number;
}

export interface RenderState {
  /** 'refining' = showing the proxy preview while the full-res render runs. */
  status: 'idle' | 'rendering' | 'refining' | 'error';
  output: RasterImage | null;
  /** The image `output` was rendered from (base or proxy); "before" shows this. */
  source: RasterImage | null;
  wave: WaveData | null;
  ms: number;
  errors: Record<string, string>;
}

export interface ViewState {
  showBefore: boolean;
  zoom: number;
  tool: Tool;
  fullResPreview: boolean;
  waveStacked: boolean;
  /** Full-res pixel under the cursor (image or waveform hover), for the linked cursor. */
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
  history: hist.History;
  /** State as of the last history commit; pushed onto `past` by the next commit. */
  committed: hist.Snapshot | null;
  notice: string | null;

  // image
  importFile(file: File): Promise<void>;
  exportPng(): Promise<void>;
  // settings & selection
  setSettings(patch: Partial<Settings>): void;
  /** Live update during a drag; call commitHistory() when the drag ends. */
  setSelection(selection: Selection): void;
  clearSelection(): void;
  // chain
  addEffect(effectId: string): void;
  /** Live update during a drag; call commitHistory() when the drag ends. */
  updateParams(uid: string, patch: Params): void;
  removeEffect(uid: string): void;
  moveEffect(uid: string, toIndex: number): void;
  toggleBypass(uid: string): void;
  // bake & history
  bake(): Promise<void>;
  undo(): void;
  redo(): void;
  commitHistory(): void;
  // recipes
  saveRecipe(): void;
  loadRecipe(file: File): Promise<void>;
  copyCliCommand(): Promise<void>;
  // view
  setView(patch: Partial<ViewState>): void;
  setNotice(notice: string | null): void;
  requestPreview(): void;
}

const INITIAL_RENDER: RenderState = { status: 'idle', output: null, source: null, wave: null, ms: 0, errors: {} };

/** Full-res base-stream length for each in-flight request, so results can map ranges back. */
const fullLengths = new WeakMap<RenderRequest, number>();

/**
 * How long the state must be unchanged before the proxy preview is replaced by a full-res render.
 * Needed because databending is chaotic: the proxy's averaged pixels can bend quite differently.
 */
const REFINE_DELAY_MS = 500;

export const useStore = create<AppState>()((set, get) => {
  /** The newest request; a full-res refine that finishes after a newer request is stale. */
  let latest: RenderRequest | null = null;
  let refineTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduler = createPreviewScheduler(
    webPlatform,
    (result, req) => {
      const isRefine = req.scale === 1 && get().image?.proxy && !get().view.fullResPreview;
      if (isRefine && req !== latest) return;
      const { selection, settings } = req;
      const wave = computeWaveData(req.source, result.image, req.scale, selection.rect, settings, fullLengths.get(req) ?? 0);
      const needsRefine = req.scale < 1 && req === latest;
      set({
        render: {
          status: needsRefine ? 'refining' : 'idle',
          output: result.image, source: req.source, wave, ms: result.ms, errors: result.errors,
        },
      });
      if (needsRefine) {
        clearTimeout(refineTimer);
        refineTimer = setTimeout(() => {
          const full = buildRequest(true);
          if (full) {
            latest = full;
            scheduler.request(full);
          }
        }, REFINE_DELAY_MS);
      }
    },
    (err) => {
      set({ render: { ...get().render, status: 'error' }, notice: `Render failed: ${errorMessage(err)}` });
    },
  );

  function snapshot(): hist.Snapshot | null {
    const { image, chain, settings, selection } = get();
    return image && { base: image.base, proxy: image.proxy, chain, settings, selection };
  }

  /** Request for the current state, at preview (proxy) or full resolution. */
  function buildRequest(fullRes: boolean): RenderRequest | null {
    const { image, settings, selection, chain, seed, view } = get();
    if (!image) return null;
    const useProxy = !fullRes && image.proxy !== null && !view.fullResPreview;
    const source = useProxy ? image.proxy! : image.base;
    const scale = useProxy ? image.proxyScale : 1;
    const fullLength = baseStreamLength(image.base.width, image.base.height, selection.rect, settings);
    const scaledRect = scaleSelection({ rect: selection.rect, range: null }, scale, 1, 1).rect;
    const renderLength = baseStreamLength(source.width, source.height, scaledRect, settings);
    const req: RenderRequest = {
      source, scale, settings, chain, seed,
      selection: scaleSelection(selection, scale, fullLength, renderLength),
    };
    fullLengths.set(req, fullLength);
    return req;
  }

  function applySnapshot(s: hist.Snapshot): void {
    const { image } = get();
    if (!image) return;
    set({
      image: { ...image, base: s.base, proxy: s.proxy },
      chain: s.chain, settings: s.settings, selection: s.selection, committed: s,
    });
    get().requestPreview();
  }

  /** Apply a discrete change, record it in history and re-render. */
  function change(patch: Partial<AppState>): void {
    set(patch);
    get().commitHistory();
    get().requestPreview();
  }

  return {
    image: null,
    settings: DEFAULT_SETTINGS,
    selection: EMPTY_SELECTION,
    chain: [],
    seed: 1,
    render: INITIAL_RENDER,
    view: { showBefore: false, zoom: 1, tool: 'rect', fullResPreview: false, waveStacked: false, hoverPixel: null },
    history: hist.EMPTY_HISTORY,
    committed: null,
    notice: null,

    async importFile(file) {
      try {
        const base = await decodeFile(file);
        const p = makeProxy(base);
        scheduler.cancel();
        set({
          image: { name: file.name, base, proxy: p?.proxy ?? null, proxyScale: p?.scale ?? 1 },
          selection: EMPTY_SELECTION,
          render: { ...INITIAL_RENDER, status: 'rendering' },
          history: hist.EMPTY_HISTORY,
          view: { ...get().view, zoom: 1, hoverPixel: null },
          notice: null,
        });
        set({ committed: snapshot() });
        get().requestPreview();
      } catch (err) {
        set({ notice: `Couldn't open ${file.name}: ${errorMessage(err)}` });
      }
    },

    async exportPng() {
      const req = buildRequest(true);
      const { image } = get();
      if (!req || !image) return;
      set({ notice: 'Exporting…' });
      try {
        // Reuse the on-screen render if it's already the finished full-res one.
        const shown = get().render;
        // Any change since sets status back to 'rendering', so 'idle' + base source means current.
        const upToDate = shown.status === 'idle' && shown.source === image.base && shown.output;
        const output = upToDate ? shown.output! : (await render(req, webPlatform)).image;
        downloadBlob(await encodePng(output), bentName(image.name));
        set({ notice: `Exported ${bentName(image.name)}` });
      } catch (err) {
        set({ notice: `Export failed: ${errorMessage(err)}` });
      }
    },

    setSettings: (patch) => change({ settings: { ...get().settings, ...patch } }),

    setSelection(selection) {
      set({ selection });
      get().requestPreview();
    },
    clearSelection: () => change({ selection: EMPTY_SELECTION }),

    addEffect(effectId) {
      change({ chain: [...get().chain, createInstance(effectId)] });
    },
    updateParams(uid, patch) {
      set({ chain: get().chain.map((e) => (e.uid === uid ? { ...e, params: { ...e.params, ...patch } } : e)) });
      get().requestPreview();
    },
    removeEffect: (uid) => change({ chain: get().chain.filter((e) => e.uid !== uid) }),
    moveEffect(uid, toIndex) {
      const chain = [...get().chain];
      const from = chain.findIndex((e) => e.uid === uid);
      const to = Math.max(0, Math.min(chain.length - 1, toIndex));
      if (from < 0 || from === to) return;
      chain.splice(to, 0, chain.splice(from, 1)[0]);
      change({ chain });
    },
    toggleBypass: (uid) => change({ chain: get().chain.map((e) => (e.uid === uid ? { ...e, bypass: !e.bypass } : e)) }),

    async bake() {
      const req = buildRequest(true);
      const { image, chain } = get();
      if (!req || !image || chain.length === 0) return;
      set({ notice: 'Baking…', render: { ...get().render, status: 'rendering' } });
      try {
        const result = await render(req, webPlatform);
        const p = makeProxy(result.image);
        change({
          image: { ...image, base: result.image, proxy: p?.proxy ?? null, proxyScale: p?.scale ?? 1 },
          chain: [],
          notice: 'Baked',
        });
      } catch (err) {
        set({ notice: `Bake failed: ${errorMessage(err)}` });
      }
    },

    undo() {
      const current = snapshot();
      if (!current) return;
      const r = hist.undo(get().history, current);
      if (!r) return;
      set({ history: r.history });
      applySnapshot(r.snapshot);
    },
    redo() {
      const current = snapshot();
      if (!current) return;
      const r = hist.redo(get().history, current);
      if (!r) return;
      set({ history: r.history });
      applySnapshot(r.snapshot);
    },
    commitHistory() {
      const current = snapshot();
      const { committed, history } = get();
      if (!current) return;
      if (committed && !hist.sameSnapshot(committed, current)) {
        set({ history: hist.pushSnapshot(history, committed) });
      }
      set({ committed: current });
    },

    saveRecipe() {
      const { image } = get();
      const recipe = currentRecipe(get());
      const name = image ? image.name.replace(/\.[^.]+$/, '') : 'databend';
      downloadBlob(new Blob([serializeRecipe(recipe)], { type: 'application/json' }), `${name}.recipe.json`);
    },
    async loadRecipe(file) {
      try {
        const { recipe, warnings } = parseRecipe(JSON.parse(await file.text()));
        const { image } = get();
        const selection = image
          ? resolveSelection(recipe.selection, image.base.width, image.base.height, recipe.settings)
          : { rect: recipe.selection.rect, range: null };
        change({
          settings: recipe.settings, selection, chain: recipeToChain(recipe), seed: recipe.seed,
          notice: warnings.length ? `Loaded with warnings: ${warnings.join('; ')}` : `Loaded ${file.name}`,
        });
      } catch (err) {
        set({ notice: `Couldn't load recipe: ${errorMessage(err)}` });
      }
    },
    async copyCliCommand() {
      const { image } = get();
      const cmd = recipeToCliCommand(currentRecipe(get()), image?.name ?? 'image.png');
      try {
        await navigator.clipboard.writeText(cmd);
        set({ notice: 'CLI command copied' });
      } catch {
        set({ notice: cmd });
      }
    },

    setView: (patch) => {
      const fullResChanged = patch.fullResPreview !== undefined && patch.fullResPreview !== get().view.fullResPreview;
      set({ view: { ...get().view, ...patch } });
      if (fullResChanged) get().requestPreview();
    },
    setNotice: (notice) => set({ notice }),

    requestPreview() {
      const req = buildRequest(false);
      if (!req) return;
      clearTimeout(refineTimer);
      latest = req;
      if (get().render.status !== 'rendering') set({ render: { ...get().render, status: 'rendering' } });
      scheduler.request(req);
    },
  };
});

/** The current settings as a recipe. A range is saved as fractions so it fits any image size. */
function currentRecipe(state: AppState): Recipe {
  const { image, settings, selection, chain, seed } = state;
  let range: Recipe['selection']['range'] = null;
  if (selection.range && image) {
    const n = baseStreamLength(image.base.width, image.base.height, selection.rect, settings);
    range = { start: selection.range.start / n, end: selection.range.end / n, unit: 'fraction' };
  }
  return {
    version: RECIPE_VERSION, settings, seed,
    selection: { rect: selection.rect, range },
    chain: chainToRecipeSteps(chain),
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
