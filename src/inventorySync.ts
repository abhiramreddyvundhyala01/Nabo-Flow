import type { RawMaterial, BOMRecipe } from './types';
import { rawMaterials as defaultMaterials, bomRecipes as defaultBOMRecipes } from './data';
import { isSupabaseConfigured, dbSaveRawMaterial } from './supabase';

const SS_RAW_KEY = 'nabo_raw_materials';
const LS_BOM_KEY = 'nabo_bom_recipes';

export const INVENTORY_UPDATED_EVENT = 'nabo_inventory_updated';

// ─── Helpers to read & write raw materials ──────────────────────────────────────
export function getStoredRawMaterials(): RawMaterial[] {
  try {
    const ss = sessionStorage.getItem(SS_RAW_KEY);
    if (ss) {
      const parsed = JSON.parse(ss) as RawMaterial[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const ls = localStorage.getItem(SS_RAW_KEY);
    if (ls) {
      const parsed = JSON.parse(ls) as RawMaterial[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return defaultMaterials;
}

export function saveStoredRawMaterials(items: RawMaterial[]): void {
  try {
    const raw = JSON.stringify(items);
    sessionStorage.setItem(SS_RAW_KEY, raw);
    localStorage.setItem(SS_RAW_KEY, raw);
  } catch { /* ignore */ }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INVENTORY_UPDATED_EVENT, { detail: items }));
  }

  // If Supabase is configured, sync in background
  if (isSupabaseConfigured) {
    items.forEach(mat => {
      dbSaveRawMaterial({
        id: mat.id,
        name: mat.name,
        uom: mat.uom,
        category: mat.category,
        stock: mat.stock,
        reorder_level: mat.reorder,
        unit_cost: mat.unitCost,
      }).catch(() => { /* ignore */ });
    });
  }
}

export function getStoredBOMRecipes(): BOMRecipe[] {
  try {
    const raw = localStorage.getItem(LS_BOM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BOMRecipe[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return defaultBOMRecipes;
}

export function findBOMForLine(line: { name?: string; menuItemId?: string }): BOMRecipe | undefined {
  const recipes = getStoredBOMRecipes();
  if (line.menuItemId) {
    const found = recipes.find(r => r.menuItemId === line.menuItemId);
    if (found) return found;
  }
  if (line.name) {
    const qName = line.name.toLowerCase().trim();
    return recipes.find(r => r.menuItemName.toLowerCase().trim() === qName);
  }
  return undefined;
}

export interface OrderLineItem {
  name?: string;
  menuItemId?: string;
  qty: number;
}

/**
 * Automatically deducts ingredient raw materials from inventory based on BOM recipes
 * when an order is placed, completed, or items are added to an order.
 */
export function deductOrderStock(lines: OrderLineItem[]): RawMaterial[] {
  if (!lines || lines.length === 0) return getStoredRawMaterials();

  const materials = [...getStoredRawMaterials()];
  let updated = false;

  lines.forEach(line => {
    if (line.qty <= 0) return;
    const bom = findBOMForLine(line);
    if (!bom || !bom.components || bom.components.length === 0) return;

    bom.components.forEach(comp => {
      const idx = materials.findIndex(m => m.id === comp.materialId || m.name.toLowerCase() === comp.materialName.toLowerCase());
      if (idx !== -1) {
        const consumed = Number((comp.qty * line.qty).toFixed(4));
        materials[idx] = {
          ...materials[idx],
          stock: Math.max(0, Number((materials[idx].stock - consumed).toFixed(4))),
        };
        updated = true;
      }
    });
  });

  if (updated) {
    saveStoredRawMaterials(materials);
  }
  return materials;
}

/**
 * Automatically restores ingredient raw materials back to inventory based on BOM recipes
 * when an order is cancelled, rejected, or items are removed.
 */
export function restoreOrderStock(lines: OrderLineItem[]): RawMaterial[] {
  if (!lines || lines.length === 0) return getStoredRawMaterials();

  const materials = [...getStoredRawMaterials()];
  let updated = false;

  lines.forEach(line => {
    if (line.qty <= 0) return;
    const bom = findBOMForLine(line);
    if (!bom || !bom.components || bom.components.length === 0) return;

    bom.components.forEach(comp => {
      const idx = materials.findIndex(m => m.id === comp.materialId || m.name.toLowerCase() === comp.materialName.toLowerCase());
      if (idx !== -1) {
        const restored = Number((comp.qty * line.qty).toFixed(4));
        materials[idx] = {
          ...materials[idx],
          stock: Number((materials[idx].stock + restored).toFixed(4)),
        };
        updated = true;
      }
    });
  });

  if (updated) {
    saveStoredRawMaterials(materials);
  }
  return materials;
}
