'use client';

// ===== Nabo Flow — Menu Context (Single Source of Truth) =====
// All modules that display or use menu items read from here.
// MenuManagement writes here. Changes instantly propagate across POS, Mobile, Online, etc.

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { menuItems as defaultMenuItems } from './data';
import type { MenuItem } from './types';
import { isSupabaseConfigured, dbFetchMenuItems, dbSaveMenuItem } from './supabase';

// ─── localStorage key (same key used in MenuManagement) ───────────────────────
export const MENU_LS_KEY = 'nabo_menu_items';

function loadFromStorage(): MenuItem[] {
  try {
    const raw = localStorage.getItem(MENU_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MenuItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return defaultMenuItems;
}

function saveToStorage(items: MenuItem[]) {
  try { localStorage.setItem(MENU_LS_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

// ─── Context shape ────────────────────────────────────────────────────────────
interface MenuContextValue {
  /** Current live menu items — same list everywhere in the app */
  menuItems: MenuItem[];
  /** Replace / refresh items (called by MenuManagement after any CRUD) */
  setMenuItems: (items: MenuItem[]) => void;
  /** Convenience: get a single item by ID */
  getItem: (id: string) => MenuItem | undefined;
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItemsState] = useState<MenuItem[]>(() => loadFromStorage());

  // Fetch live menu items from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      dbFetchMenuItems().then(res => {
        if (res && Array.isArray(res) && res.length > 0) {
          const mapped: MenuItem[] = res.map((m: any) => ({
            id: m.id,
            name: m.name,
            price: Number(m.price),
            category: m.category_id || 'starters',
            shortCode: m.id,
            veg: Boolean(m.is_veg),
            available: Boolean(m.available),
            popular: false,
            prepTime: Number(m.prep_time_mins || 15),
            spice: 'medium',
            allergens: [],
            description: m.description,
          }));
          setMenuItemsState(mapped);
          saveToStorage(mapped);
        }
      });
    }
  }, []);

  // Persist to localStorage whenever items change
  useEffect(() => { saveToStorage(menuItems); }, [menuItems]);

  // Listen to storage events from other tabs (optional — good hygiene)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MENU_LS_KEY && e.newValue) {
        try {
          const next = JSON.parse(e.newValue) as MenuItem[];
          if (Array.isArray(next)) setMenuItemsState(next);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setMenuItems = useCallback((items: MenuItem[]) => {
    setMenuItemsState(items);
  }, []);

  const getItem = useCallback((id: string) =>
    menuItems.find(i => i.id === id),
  [menuItems]);

  return (
    <MenuContext.Provider value={{ menuItems, setMenuItems, getItem }}>
      {children}
    </MenuContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used inside <MenuProvider>');
  return ctx;
}
