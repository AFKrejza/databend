// Recipe JSON shared by the GUI (save/load) and the CLI (-r). See docs/cli.md#recipes-shared-with-the-gui.
import type { Rect, Selection, Settings } from './types';
import type { EffectInstance, Params } from './effects/types';
import { todo } from './todo';

export const RECIPE_VERSION = 1;

export interface RecipeStep {
  effect: string;
  params: Params;
  bypass?: boolean;
}

/** Fractions (0–1 of the base stream) let one recipe fit any image size. */
export interface RecipeRange {
  start: number;
  end: number;
  unit: 'fraction' | 'samples';
}

export interface RecipeSelection {
  rect: Rect | null;
  range: RecipeRange | null;
}

export interface Recipe {
  version: number;
  settings: Settings;
  selection: RecipeSelection;
  chain: RecipeStep[];
  seed: number;
}

/** Clip the rect to the image and turn a fractional range into sample indices. */
export function resolveSelection(sel: RecipeSelection, width: number, height: number, settings: Settings): Selection {
  return todo('resolveSelection');
}

export interface ParsedRecipe {
  recipe: Recipe;
  warnings: string[];
}

/** Validate unknown JSON. Fills defaults, clamps params (warning), and throws on unknown effects/params. */
export function parseRecipe(json: unknown): ParsedRecipe {
  return todo('parseRecipe');
}

export function serializeRecipe(recipe: Recipe): string {
  return JSON.stringify(recipe, null, 2);
}

/** Later fields win. Used for "recipe file + command-line flags". */
export function mergeRecipe(base: Recipe, overrides: Partial<Recipe>): Recipe {
  return todo('mergeRecipe');
}

export function recipeToChain(recipe: Recipe): EffectInstance[] {
  return todo('recipeToChain');
}

export function chainToRecipeSteps(chain: EffectInstance[]): RecipeStep[] {
  return todo('chainToRecipeSteps');
}

/** The equivalent `databend <input> -e ... -f "..."` command (GUI "Copy CLI command"). */
export function recipeToCliCommand(recipe: Recipe, inputName: string): string {
  return todo('recipeToCliCommand');
}
