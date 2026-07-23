'use client';

// ===== Nabo Flow — Menu Management (Fully Functional + localStorage) =====
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BookOpen, Plus, Search, Edit3, Copy, Trash2,
  UtensilsCrossed, CheckCircle2, XCircle, Zap, Link2,
  X, Save, AlertCircle, ChevronDown, Clock, Flame, Leaf,
  BadgeCheck, RefreshCw, Star, Filter, Download, Upload,
  ToggleLeft, ToggleRight, ArrowUpDown, ChevronUp, Wifi,
  WifiOff, Tag, Image as ImageIcon, DollarSign,
} from 'lucide-react';
import { menuItems as initialMenuItems, categories } from '../data';
import type { MenuItem } from '../types';
import { inr } from '../format';
import { Card, Badge, Button, StatCard, SectionHeader, Toggle } from '../ui';
import { useMenu } from '../MenuContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'items' | 'combos' | 'scheduling' | 'aggregator';
type SortField = 'name' | 'price' | 'category' | 'prepTime';
type SortDir = 'asc' | 'desc';

type Combo = {
  id: string;
  name: string;
  items: string[];
  price: number;
  cost: number;
  active: boolean;
  description?: string;
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_MENU_KEY = 'nabo_menu_items';
const LS_COMBO_KEY = 'nabo_combos';
const LS_SCHEDULE_KEY = 'nabo_schedule';
const LS_AGGREGATOR_KEY = 'nabo_aggregator';
const LS_MULTIPLIER_KEY = 'nabo_outlet_multipliers';

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}
function lsSet<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPICE_OPTIONS = ['none', 'mild', 'medium', 'hot'] as const;
const ALLERGEN_OPTIONS = ['dairy', 'gluten', 'nuts', 'fish', 'egg', 'soy'];
const CATEGORY_OPTIONS = categories.filter(c => c.id !== 'all' && c.id !== 'fav');
const DAY_PARTS = ['Breakfast', 'Lunch', 'Dinner', 'Late Night'];
const OUTLETS = ['Main Branch', 'Koramangala', 'Whitefield'];

const INITIAL_COMBOS: Combo[] = [
  { id: 'c1', name: 'Family Feast', items: ['Chicken Biryani', 'Butter Chicken', 'Butter Naan (4)', 'Sweet Lassi (2)'], price: 780, cost: 420, active: true, description: 'Perfect for 4 people' },
  { id: 'c2', name: 'Veg Delight', items: ['Paneer Butter Masala', 'Dal Makhani', 'Tandoori Roti (4)', 'Masala Chai (2)'], price: 560, cost: 280, active: true, description: 'Pure vegetarian combo' },
  { id: 'c3', name: 'Quick Lunch', items: ['Veg Biryani', 'Sweet Lassi'], price: 280, cost: 140, active: false, description: 'Light lunch option' },
];

const newId = () => 'm' + Date.now();
const newCode = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) +
  String(Math.floor(Math.random() * 90) + 10);

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 bg-ink-900 text-white px-4 py-3 rounded-xl shadow-2xl animate-slide-up max-w-sm">
      <BadgeCheck className="h-4 w-4 text-brand-400 shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="text-ink-400 hover:text-white ml-2"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════════
export function MenuManagement() {
  const [tab, setTab] = useState<Tab>('items');
  const [toast, setToast] = useState<string | null>(null);

  // ── Single source of truth: shared context (syncs with POS, Mobile, Online) ──
  const { menuItems: items, setMenuItems } = useMenu();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const vegCount = useMemo(() => items.filter(m => m.veg).length, [items]);
  const availableCount = useMemo(() => items.filter(m => m.available).length, [items]);
  const popularCount = useMemo(() => items.filter(m => m.popular).length, [items]);

  // ─── CRUD handlers — all go through context (auto-persisted to localStorage) ──
  const addItem = useCallback((item: MenuItem) => {
    setMenuItems([...items, item]);
    showToast(`"${item.name}" added to menu`);
  }, [items, setMenuItems, showToast]);

  const updateItem = useCallback((updated: MenuItem) => {
    setMenuItems(items.map(i => i.id === updated.id ? updated : i));
    showToast(`"${updated.name}" updated`);
  }, [items, setMenuItems, showToast]);

  const deleteItem = useCallback((id: string) => {
    const name = items.find(i => i.id === id)?.name ?? 'Item';
    setMenuItems(items.filter(i => i.id !== id));
    showToast(`"${name}" removed from menu`);
  }, [items, setMenuItems, showToast]);

  const duplicateItem = useCallback((item: MenuItem) => {
    const copy: MenuItem = {
      ...item,
      id: newId(),
      name: item.name + ' (Copy)',
      shortCode: newCode(item.name + 'C'),
    };
    setMenuItems([...items, copy]);
    showToast(`"${copy.name}" duplicated`);
  }, [items, setMenuItems, showToast]);

  const toggleAvailable = useCallback((id: string) => {
    setMenuItems(items.map(i => i.id === id ? { ...i, available: !i.available } : i));
  }, [items, setMenuItems]);

  const togglePopular = useCallback((id: string) => {
    setMenuItems(items.map(i => i.id === id ? { ...i, popular: !i.popular } : i));
  }, [items, setMenuItems]);

  const resetToDefaults = useCallback(() => {
    setMenuItems(initialMenuItems);
    showToast('Menu reset to defaults');
  }, [setMenuItems, showToast]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Items"     value={String(items.length)}    sub={`${vegCount} veg · ${items.length - vegCount} non-veg`} icon={<BookOpen className="h-5 w-5" />}      tone="info" />
        <StatCard label="Available"       value={String(availableCount)}  sub={`${items.length - availableCount} 86'd`}               icon={<CheckCircle2 className="h-5 w-5" />}  tone="brand" />
        <StatCard label="Popular"         value={String(popularCount)}    sub="Pinned to POS grid"                                    icon={<Zap className="h-5 w-5" />}            tone="accent" />
        <StatCard label="Aggregator Sync" value="2 / 2"                   sub="Zomato + Swiggy connected"                             icon={<Link2 className="h-5 w-5" />}          tone="info" />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-white rounded-xl border border-ink-200/60 p-1 w-fit">
          {([
            { key: 'items',       label: 'Item Master' },
            { key: 'combos',      label: 'Combo Builder' },
            { key: 'scheduling',  label: 'Day-part & Pricing' },
            { key: 'aggregator',  label: 'Aggregator Sync' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'items' && (
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RefreshCw className="h-3.5 w-3.5" /> Reset to Defaults
          </Button>
        )}
      </div>

      {tab === 'items' && (
        <ItemsTab
          items={items}
          onAdd={addItem}
          onUpdate={updateItem}
          onDelete={deleteItem}
          onDuplicate={duplicateItem}
          onToggleAvailable={toggleAvailable}
          onTogglePopular={togglePopular}
        />
      )}
      {tab === 'combos'     && <CombosTab onToast={showToast} />}
      {tab === 'scheduling' && <SchedulingTab items={items} onToast={showToast} />}
      {tab === 'aggregator' && <AggregatorTab items={items} onToast={showToast} />}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Item Master Tab
// ════════════════════════════════════════════════════════════════════════════════
function ItemsTab({
  items, onAdd, onUpdate, onDelete, onDuplicate, onToggleAvailable, onTogglePopular,
}: {
  items: MenuItem[];
  onAdd: (item: MenuItem) => void;
  onUpdate: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: MenuItem) => void;
  onToggleAvailable: (id: string) => void;
  onTogglePopular: (id: string) => void;
}) {
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [availFilter, setAvailFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir]     = useState<SortDir>('asc');
  const [editItem, setEditItem]   = useState<MenuItem | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = items.filter(m => {
      const q = search.toLowerCase();
      const matchQ = !q || m.name.toLowerCase().includes(q) || m.shortCode.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q);
      const matchCat = catFilter === 'all' || m.category === catFilter;
      const matchVeg = vegFilter === 'all' || (vegFilter === 'veg' ? m.veg : !m.veg);
      const matchAvail = availFilter === 'all' || (availFilter === 'available' ? m.available : !m.available);
      return matchQ && matchCat && matchVeg && matchAvail;
    });
    list = [...list].sort((a, b) => {
      let av: string | number = a[sortField] ?? '';
      let bv: string | number = b[sortField] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      const r = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? r : -r;
    });
    return list;
  }, [items, search, catFilter, vegFilter, availFilter, sortField, sortDir]);

  const handleSave = (item: MenuItem) => {
    if (editItem) onUpdate(item);
    else onAdd(item);
    setShowForm(false);
    setEditItem(null);
  };

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-0.5 hover:text-ink-800 transition-colors">
      {label}
      {sortField === field
        ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar row 1 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code, description..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <select value={vegFilter} onChange={e => setVegFilter(e.target.value as typeof vegFilter)}
          className="h-9 px-3 text-xs bg-white border border-ink-200 rounded-lg text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="all">Veg + Non-veg</option>
          <option value="veg">🟢 Veg only</option>
          <option value="nonveg">🔴 Non-veg only</option>
        </select>
        <select value={availFilter} onChange={e => setAvailFilter(e.target.value as typeof availFilter)}
          className="h-9 px-3 text-xs bg-white border border-ink-200 rounded-lg text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="all">All Status</option>
          <option value="available">✅ Available</option>
          <option value="unavailable">🚫 86'd</option>
        </select>
        <Button variant="primary" size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
      </div>

      {/* Category filter chips */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setCatFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${catFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-500 hover:bg-ink-50'}`}>
          All ({items.length})
        </button>
        {CATEGORY_OPTIONS.map(c => {
          const count = items.filter(i => i.category === c.id).length;
          return (
            <button key={c.id} onClick={() => setCatFilter(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${catFilter === c.id ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-500 hover:bg-ink-50'}`}>
              {c.name} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card pad={false}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
              <th className="text-left px-4 py-2.5">
                <SortBtn field="name" label="Item" />
              </th>
              <th className="text-left px-3 py-2.5">Code</th>
              <th className="text-left px-3 py-2.5">
                <SortBtn field="category" label="Category" />
              </th>
              <th className="text-right px-3 py-2.5">
                <SortBtn field="price" label="Price" />
              </th>
              <th className="text-center px-3 py-2.5">Veg</th>
              <th className="text-center px-2 py-2.5">
                <span title="Popular / Pin to POS"><Zap className="h-3.5 w-3.5 mx-auto" /></span>
              </th>
              <th className="text-center px-2 py-2.5">
                <span title="Available"><CheckCircle2 className="h-3.5 w-3.5 mx-auto" /></span>
              </th>
              <th className="text-center px-3 py-2.5">
                <SortBtn field="prepTime" label="Prep" />
              </th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-ink-400 text-sm">
                No items match. <button onClick={() => { setEditItem(null); setShowForm(true); }} className="text-brand-600 font-semibold hover:underline">Add one?</button>
              </td></tr>
            )}
            {filtered.map(item => (
              <tr key={item.id} className="border-t border-ink-100 hover:bg-ink-50/50 transition-colors group">
                <td className="px-4 py-3 max-w-xs">
                  <div className="font-semibold text-ink-800">{item.name}</div>
                  {item.description && <div className="text-2xs text-ink-400 truncate">{item.description}</div>}
                  {item.spice && item.spice !== 'none' && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: item.spice === 'mild' ? 1 : item.spice === 'medium' ? 2 : 3 }).map((_, i) =>
                        <Flame key={i} className="h-2.5 w-2.5 text-danger-400" />)}
                    </div>
                  )}
                  {(item.allergens ?? []).length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {item.allergens!.map(a => (
                        <span key={a} className="px-1 py-0.5 bg-warn-50 text-warn-700 text-2xs rounded-full border border-warn-200">{a}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-ink-400 font-mono text-xs">{item.shortCode}</td>
                <td className="px-3 py-3"><Badge tone="neutral" size="xs">{item.category}</Badge></td>
                <td className="px-3 py-3 text-right tnum font-bold text-ink-900">{inr(item.price)}</td>
                <td className="px-3 py-3 text-center">
                  {item.veg
                    ? <span className="inline-flex h-4 w-4 rounded-sm border-2 border-brand-500 items-center justify-center"><span className="h-2 w-2 rounded-full bg-brand-500" /></span>
                    : <span className="inline-flex h-4 w-4 rounded-sm border-2 border-danger-500 items-center justify-center"><span className="h-2 w-2 rounded-full bg-danger-500" /></span>}
                </td>
                <td className="px-2 py-3 text-center">
                  <button onClick={() => onTogglePopular(item.id)} title={item.popular ? 'Remove from popular' : 'Mark as popular'}
                    className={`p-1 rounded-lg transition-colors ${item.popular ? 'text-accent-500 bg-accent-50' : 'text-ink-300 hover:text-accent-400 hover:bg-accent-50'}`}>
                    <Zap className={`h-4 w-4 ${item.popular ? 'fill-current' : ''}`} />
                  </button>
                </td>
                <td className="px-2 py-3 text-center">
                  <button onClick={() => onToggleAvailable(item.id)} title={item.available ? '86 this item' : 'Make available'}
                    className={`p-1 rounded-lg transition-colors ${item.available ? 'text-brand-500 hover:bg-brand-50' : 'text-danger-400 hover:bg-danger-50'}`}>
                    {item.available ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </button>
                </td>
                <td className="px-3 py-3 text-center">
                  {item.prepTime
                    ? <span className="flex items-center gap-0.5 justify-center text-2xs text-ink-400 tnum"><Clock className="h-3 w-3" />{item.prepTime}m</span>
                    : <span className="text-ink-300">—</span>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditItem(item); setShowForm(true); }} title="Edit"
                      className="h-7 w-7 rounded-md hover:bg-brand-50 flex items-center justify-center transition-colors">
                      <Edit3 className="h-3.5 w-3.5 text-brand-500" />
                    </button>
                    <button onClick={() => onDuplicate(item)} title="Duplicate"
                      className="h-7 w-7 rounded-md hover:bg-ink-100 flex items-center justify-center transition-colors">
                      <Copy className="h-3.5 w-3.5 text-ink-500" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} title="Delete"
                      className="h-7 w-7 rounded-md hover:bg-danger-50 flex items-center justify-center transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-danger-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-between text-2xs text-ink-400">
        <span>{filtered.length} of {items.length} items shown</span>
        <span>All changes saved to local storage automatically</span>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <ItemFormModal
          item={editItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-danger-100 flex items-center justify-center"><Trash2 className="h-5 w-5 text-danger-600" /></div>
              <div>
                <h3 className="font-bold text-ink-900">Delete "{items.find(i => i.id === deleteId)?.name}"?</h3>
                <p className="text-xs text-ink-400">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="danger" block onClick={() => { onDelete(deleteId); setDeleteId(null); }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Add / Edit Item Modal
// ════════════════════════════════════════════════════════════════════════════════
function ItemFormModal({ item, onSave, onClose }: { item: MenuItem | null; onSave: (item: MenuItem) => void; onClose: () => void }) {
  const isEdit = !!item;
  const [form, setForm] = useState<MenuItem>(item ?? {
    id: newId(), name: '', price: 0, category: 'starters',
    shortCode: '', veg: true, available: true, popular: false,
    prepTime: 10, spice: 'none', allergens: [], description: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MenuItem, string>>>({});

  const set = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim())      e.name      = 'Name is required';
    if (form.price <= 0)        e.price     = 'Price must be > 0';
    if (!form.shortCode.trim()) e.shortCode = 'Short code is required';
    if (!form.category)         e.category  = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({ ...form, name: form.name.trim(), shortCode: form.shortCode.trim().toUpperCase() });
  };

  const toggleAllergen = (a: string) => {
    const cur = form.allergens ?? [];
    set('allergens', cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-100 flex items-center justify-center"><BookOpen className="h-4 w-4 text-brand-600" /></div>
            <h3 className="font-bold text-ink-900">{isEdit ? `Edit "${item!.name}"` : 'Add New Item'}</h3>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center">
            <X className="h-4 w-4 text-ink-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Item Name *</label>
              <input type="text" value={form.name}
                onChange={e => { set('name', e.target.value); if (!isEdit || !form.shortCode) set('shortCode', newCode(e.target.value)); }}
                placeholder="e.g. Paneer Tikka" autoFocus
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 ${errors.name ? 'border-danger-400' : 'border-ink-200'}`}
              />
              {errors.name && <p className="text-2xs text-danger-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Short Code * <span className="font-normal text-ink-400">(shown on POS)</span></label>
              <input type="text" value={form.shortCode} maxLength={6}
                onChange={e => set('shortCode', e.target.value.toUpperCase())}
                placeholder="e.g. PT01"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono ${errors.shortCode ? 'border-danger-400' : 'border-ink-200'}`}
              />
              {errors.shortCode && <p className="text-2xs text-danger-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.shortCode}</p>}
            </div>
          </div>

          {/* Category + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Category *</label>
              <div className="relative">
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className={`w-full appearance-none px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white ${errors.category ? 'border-danger-400' : 'border-ink-200'}`}>
                  {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Price (₹) *</label>
              <input type="number" value={form.price || ''} min={1}
                onChange={e => set('price', Number(e.target.value))}
                placeholder="0"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum ${errors.price ? 'border-danger-400' : 'border-ink-200'}`}
              />
              {errors.price && <p className="text-2xs text-danger-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.price}</p>}
            </div>
          </div>

          {/* Prep time + Spice */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Prep Time (mins)</label>
              <input type="number" value={form.prepTime ?? ''} min={1} max={120}
                onChange={e => set('prepTime', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Spice Level</label>
              <div className="relative">
                <select value={form.spice ?? 'none'} onChange={e => set('spice', e.target.value as MenuItem['spice'])}
                  className="w-full appearance-none px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white capitalize">
                  {SPICE_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Description <span className="font-normal text-ink-400">(shown on POS & online menus)</span></label>
            <textarea value={form.description ?? ''} rows={2}
              onChange={e => set('description', e.target.value)}
              placeholder="Short description..."
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: 'Veg', key: 'veg' as const,       desc: 'Green dot in POS', color: 'brand' },
              { label: 'Available', key: 'available' as const, desc: 'Show in POS & orders', color: 'brand' },
              { label: 'Popular', key: 'popular' as const,   desc: 'Pin to Favorites tab', color: 'accent' },
            ]).map(({ label, key, desc }) => (
              <div key={key}
                className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${form[key] ? 'border-brand-400 bg-brand-50' : 'border-ink-200 bg-ink-50'}`}
                onClick={() => set(key, !form[key])}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-700">{label}</span>
                  <Toggle checked={!!form[key]} onChange={v => set(key, v)} />
                </div>
                <p className="text-2xs text-ink-400">{desc}</p>
              </div>
            ))}
          </div>

          {/* Allergens */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-2">Allergens <span className="font-normal text-ink-400">(select all that apply)</span></label>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map(a => {
                const active = (form.allergens ?? []).includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAllergen(a)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-colors capitalize ${active ? 'border-warn-400 bg-warn-50 text-warn-700' : 'border-ink-200 text-ink-400 hover:border-ink-300'}`}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-ink-100 bg-ink-50/50 sticky bottom-0">
          <Button variant="secondary" block onClick={onClose}>Cancel</Button>
          <Button variant="primary" block onClick={handleSubmit}>
            <Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Combo Builder Tab (with localStorage)
// ════════════════════════════════════════════════════════════════════════════════
function CombosTab({ onToast }: { onToast: (msg: string) => void }) {
  const [combos, setCombos] = useState<Combo[]>(() =>
    lsGet<Combo[]>(LS_COMBO_KEY, INITIAL_COMBOS)
  );
  const [showForm, setShowForm] = useState(false);
  const [editCombo, setEditCombo] = useState<Combo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { lsSet(LS_COMBO_KEY, combos); }, [combos]);

  const toggleActive = (id: string) => {
    setCombos(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const deleteCombo = (id: string) => {
    const name = combos.find(c => c.id === id)?.name ?? 'Combo';
    setCombos(prev => prev.filter(c => c.id !== id));
    setDeleteId(null);
    onToast(`"${name}" deleted`);
  };

  const saveCombo = (combo: Combo) => {
    if (editCombo) {
      setCombos(prev => prev.map(c => c.id === combo.id ? combo : c));
      onToast(`"${combo.name}" updated`);
    } else {
      setCombos(prev => [...prev, combo]);
      onToast(`"${combo.name}" created`);
    }
    setShowForm(false);
    setEditCombo(null);
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Combo Builder" subtitle="Bundle items with component-level recipe linkage — saved to local storage"
        action={<Button variant="primary" size="sm" onClick={() => { setEditCombo(null); setShowForm(true); }}><Plus className="h-3.5 w-3.5" /> New Combo</Button>} />

      <div className="grid md:grid-cols-3 gap-3">
        {combos.map(c => (
          <Card key={c.id} className={c.active ? '' : 'opacity-70'}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-ink-900 text-sm">{c.name}</h3>
              <Badge tone={c.active ? 'brand' : 'neutral'} size="xs">{c.active ? 'Active' : 'Inactive'}</Badge>
            </div>
            {c.description && <p className="text-2xs text-ink-400 mb-2">{c.description}</p>}
            <div className="space-y-1 mb-3">
              {c.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-ink-600">
                  <UtensilsCrossed className="h-3 w-3 text-ink-400 shrink-0" />{item}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-ink-100 mb-3">
              <div>
                <span className="text-lg font-bold tnum text-ink-900">{inr(c.price)}</span>
                <span className="text-2xs text-ink-400 ml-1.5">cost {inr(c.cost)}</span>
              </div>
              <Badge tone="brand" size="xs">Margin {Math.round((1 - c.cost / c.price) * 100)}%</Badge>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(c.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${c.active ? 'border-warn-300 bg-warn-50 text-warn-700 hover:bg-warn-100' : 'border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100'}`}>
                {c.active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => { setEditCombo(c); setShowForm(true); }}
                className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center transition-colors">
                <Edit3 className="h-3.5 w-3.5 text-ink-500" />
              </button>
              <button onClick={() => setDeleteId(c.id)}
                className="h-8 w-8 rounded-lg hover:bg-danger-50 flex items-center justify-center transition-colors">
                <Trash2 className="h-3.5 w-3.5 text-danger-400" />
              </button>
            </div>
          </Card>
        ))}

        {/* Add card */}
        <button onClick={() => { setEditCombo(null); setShowForm(true); }}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-ink-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-ink-400 hover:text-brand-600 min-h-48">
          <Plus className="h-8 w-8" />
          <span className="text-sm font-semibold">New Combo</span>
        </button>
      </div>

      {showForm && (
        <ComboFormModal combo={editCombo} onSave={saveCombo} onClose={() => { setShowForm(false); setEditCombo(null); }} />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm p-6 animate-slide-up">
            <h3 className="font-bold text-ink-900 mb-2">Delete "{combos.find(c => c.id === deleteId)?.name}"?</h3>
            <p className="text-sm text-ink-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="danger" block onClick={() => deleteCombo(deleteId!)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComboFormModal({ combo, onSave, onClose }: { combo: Combo | null; onSave: (c: Combo) => void; onClose: () => void }) {
  const [name, setName] = useState(combo?.name ?? '');
  const [description, setDescription] = useState(combo?.description ?? '');
  const [price, setPrice] = useState(combo?.price ?? 0);
  const [cost, setCost] = useState(combo?.cost ?? 0);
  const [itemInput, setItemInput] = useState('');
  const [items, setItems] = useState<string[]>(combo?.items ?? []);
  const [error, setError] = useState('');

  const addItem = () => {
    if (!itemInput.trim()) return;
    setItems(prev => [...prev, itemInput.trim()]);
    setItemInput('');
  };

  const submit = () => {
    if (!name.trim())       { setError('Name is required'); return; }
    if (price <= 0)          { setError('Price must be > 0'); return; }
    if (items.length === 0)  { setError('Add at least one item'); return; }
    onSave({ id: combo?.id ?? ('c' + Date.now()), name: name.trim(), description, price, cost, items, active: combo?.active ?? true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 sticky top-0 bg-white">
          <h3 className="font-bold text-ink-900">{combo ? 'Edit Combo' : 'New Combo'}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center"><X className="h-4 w-4 text-ink-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="flex items-center gap-2 text-xs text-danger-700 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Combo Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Family Feast" autoFocus
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Description (optional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..."
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Selling Price (₹) *</label>
              <input type="number" value={price || ''} min={1} onChange={e => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1">Food Cost (₹)</label>
              <input type="number" value={cost || ''} min={0} onChange={e => setCost(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Items in Combo</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={itemInput} onChange={e => setItemInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="Type item name + Enter..."
                className="flex-1 px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <button onClick={addItem} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"><Plus className="h-4 w-4" /></button>
            </div>
            {items.length === 0
              ? <p className="text-xs text-ink-400">No items yet. Type above and press Enter.</p>
              : <div className="space-y-1">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-ink-50 rounded-lg">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                      <span className="flex-1 text-sm text-ink-700">{it}</span>
                      <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} className="text-ink-400 hover:text-danger-500"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>}
          </div>
          {price > 0 && cost > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-brand-50 text-sm">
              <span className="text-ink-600 font-medium">Profit Margin</span>
              <span className="font-bold text-brand-700">{Math.round((1 - cost / price) * 100)}% · {inr(price - cost)} per combo</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-ink-100 bg-ink-50/50 sticky bottom-0">
          <Button variant="secondary" block onClick={onClose}>Cancel</Button>
          <Button variant="primary" block onClick={submit}><Save className="h-4 w-4" />{combo ? 'Save Changes' : 'Create Combo'}</Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Day-part & Pricing Tab (with localStorage)
// ════════════════════════════════════════════════════════════════════════════════
function SchedulingTab({ items, onToast }: { items: MenuItem[]; onToast: (msg: string) => void }) {
  const [avail, setAvail] = useState<Record<string, Record<string, boolean>>>(() => {
    const stored = lsGet<Record<string, Record<string, boolean>> | null>(LS_SCHEDULE_KEY, null);
    if (stored) return stored;
    const init: Record<string, Record<string, boolean>> = {};
    items.forEach(item => {
      init[item.id] = {};
      DAY_PARTS.forEach(d => {
        init[item.id][d] = !((d === 'Breakfast' && item.category !== 'beverages') || (d === 'Late Night' && item.category === 'desserts'));
      });
    });
    return init;
  });

  const [multipliers, setMultipliers] = useState<Record<string, number>>(
    () => lsGet<Record<string, number>>(LS_MULTIPLIER_KEY, Object.fromEntries(OUTLETS.map(o => [o, 1.0])))
  );
  const [catFilter, setCatFilter] = useState('all');
  const [saved, setSaved] = useState(false);

  const toggle = (itemId: string, day: string) =>
    setAvail(prev => ({ ...prev, [itemId]: { ...prev[itemId], [day]: !(prev[itemId]?.[day] ?? true) } }));

  const setRowAll = (itemId: string, val: boolean) =>
    setAvail(prev => ({ ...prev, [itemId]: Object.fromEntries(DAY_PARTS.map(d => [d, val])) }));

  const setColAll = (day: string, val: boolean) =>
    setAvail(prev => {
      const next = { ...prev };
      filteredItems.forEach(item => { next[item.id] = { ...next[item.id], [day]: val }; });
      return next;
    });

  const save = () => {
    lsSet(LS_SCHEDULE_KEY, avail);
    lsSet(LS_MULTIPLIER_KEY, multipliers);
    setSaved(true);
    onToast('Day-part schedule & pricing saved');
    setTimeout(() => setSaved(false), 2000);
  };

  const filteredItems = catFilter === 'all' ? items : items.filter(i => i.category === catFilter);
  const displayItems = filteredItems.slice(0, 15);

  return (
    <div className="space-y-4">
      <SectionHeader title="Day-part Scheduling & Outlet Pricing" subtitle="Control availability and pricing by time slot and location"
        action={
          <Button variant="primary" size="sm" onClick={save}>
            <Save className="h-3.5 w-3.5" /> {saved ? 'Saved!' : 'Save All'}
          </Button>
        }
      />

      {/* Day-part table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-ink-900 text-sm">Day-part Availability</h3>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-ink-50 border border-ink-200 rounded-lg text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-2xs uppercase tracking-wide text-ink-400 font-semibold">
                <th className="text-left py-2 pr-4 min-w-48">Item</th>
                {DAY_PARTS.map(d => (
                  <th key={d} className="text-center py-2 px-3 min-w-28">
                    <div className="flex flex-col items-center gap-1">
                      <span>{d}</span>
                      <div className="flex gap-1">
                        <button onClick={() => setColAll(d, true)} className="px-1 py-0.5 text-2xs bg-brand-50 text-brand-600 rounded hover:bg-brand-100">All</button>
                        <button onClick={() => setColAll(d, false)} className="px-1 py-0.5 text-2xs bg-ink-100 text-ink-500 rounded hover:bg-ink-200">None</button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="text-center py-2 px-2">Quick</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map(item => (
                <tr key={item.id} className="border-t border-ink-100 hover:bg-ink-50/30">
                  <td className="py-2.5 pr-4">
                    <div className="font-medium text-ink-700 text-sm truncate max-w-44">{item.name}</div>
                    <div className="text-2xs text-ink-400">{item.category}</div>
                  </td>
                  {DAY_PARTS.map(d => (
                    <td key={d} className="text-center py-2.5 px-3">
                      <Toggle checked={avail[item.id]?.[d] ?? true} onChange={() => toggle(item.id, d)} />
                    </td>
                  ))}
                  <td className="text-center py-2 px-2">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => setRowAll(item.id, true)} className="px-1.5 py-0.5 text-2xs bg-brand-50 text-brand-600 rounded hover:bg-brand-100 whitespace-nowrap">On</button>
                      <button onClick={() => setRowAll(item.id, false)} className="px-1.5 py-0.5 text-2xs bg-ink-100 text-ink-500 rounded hover:bg-ink-200 whitespace-nowrap">Off</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length > 15 && (
            <p className="text-center text-xs text-ink-400 pt-3">Showing first 15 of {filteredItems.length} items. Use category filter to narrow down.</p>
          )}
        </div>
      </Card>

      {/* Outlet pricing */}
      <Card>
        <h3 className="font-bold text-ink-900 text-sm mb-1">Outlet Price Multiplier</h3>
        <p className="text-xs text-ink-400 mb-4">Applied to base price at checkout for each outlet</p>
        <div className="space-y-2">
          {OUTLETS.map(o => (
            <div key={o} className="flex items-center justify-between p-3 rounded-xl bg-ink-50 hover:bg-ink-100 transition-colors">
              <div>
                <span className="text-sm font-semibold text-ink-800">{o}</span>
                <span className="text-2xs text-ink-400 ml-2">
                  e.g. Biryani → {inr(Math.round(280 * multipliers[o]))}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min={0.5} max={2} step={0.05} value={multipliers[o]}
                  onChange={e => setMultipliers(prev => ({ ...prev, [o]: parseFloat(e.target.value) }))}
                  className="w-24 accent-brand-600" />
                <input type="number" value={multipliers[o]} step={0.05} min={0.5} max={3}
                  onChange={e => setMultipliers(prev => ({ ...prev, [o]: Number(e.target.value) }))}
                  className="w-20 px-2 py-1.5 text-sm text-right border border-ink-200 rounded-lg tnum focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
                <span className="text-xs font-bold text-ink-700 w-10">
                  {multipliers[o] === 1 ? '=' : multipliers[o] > 1 ? `+${Math.round((multipliers[o] - 1) * 100)}%` : `-${Math.round((1 - multipliers[o]) * 100)}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Aggregator Sync Tab (with localStorage)
// ════════════════════════════════════════════════════════════════════════════════
function AggregatorTab({ items, onToast }: { items: MenuItem[]; onToast: (msg: string) => void }) {
  const [sync, setSync] = useState<Record<string, { zomato: boolean; swiggy: boolean }>>(() =>
    lsGet(LS_AGGREGATOR_KEY,
      Object.fromEntries(items.map(i => [i.id, { zomato: i.available, swiggy: i.available }]))
    )
  );
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [catFilter, setCatFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'zomato' | 'swiggy'>('all');

  useEffect(() => { lsSet(LS_AGGREGATOR_KEY, sync); }, [sync]);

  const toggle = (id: string, platform: 'zomato' | 'swiggy') =>
    setSync(prev => ({ ...prev, [id]: { ...prev[id], [platform]: !prev[id]?.[platform] } }));

  const setAll = (platform: 'zomato' | 'swiggy', val: boolean) => {
    setSync(prev => {
      const next = { ...prev };
      displayItems.forEach(i => { next[i.id] = { ...next[i.id], [platform]: val }; });
      return next;
    });
  };

  const pushAll = async () => {
    setPushing(true);
    await new Promise(r => setTimeout(r, 1400));
    setPushing(false);
    setPushed(true);
    onToast('✓ All changes pushed to Zomato & Swiggy');
    setTimeout(() => setPushed(false), 4000);
  };

  const filteredItems = catFilter === 'all' ? items : items.filter(i => i.category === catFilter);
  const displayItems = filteredItems;

  const zomatoCount = Object.values(sync).filter(s => s.zomato).length;
  const swiggyCount = Object.values(sync).filter(s => s.swiggy).length;
  const bothCount = Object.values(sync).filter(s => s.zomato && s.swiggy).length;

  return (
    <div className="space-y-4">
      <SectionHeader title="Aggregator Sync Status" subtitle="Item-level availability toggle for Zomato & Swiggy — auto-saved"
        action={
          <Button variant="primary" size="sm" onClick={pushAll} disabled={pushing}>
            {pushing
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing...</>
              : pushed
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Pushed!</>
              : 'Push All Changes'}
          </Button>
        }
      />

      {/* Platform cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-danger-50 flex items-center justify-center text-danger-600 font-bold text-sm">Z</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-ink-900 text-sm">Zomato</div>
            <Badge tone="brand" size="xs" dot>Connected</Badge>
          </div>
          <span className="text-xs font-bold text-ink-700 tnum">{zomatoCount} live</span>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-info-50 flex items-center justify-center text-info-600 font-bold text-sm">S</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-ink-900 text-sm">Swiggy</div>
            <Badge tone="brand" size="xs" dot>Connected</Badge>
          </div>
          <span className="text-xs font-bold text-ink-700 tnum">{swiggyCount} live</span>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm">∑</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-ink-900 text-sm">Both Platforms</div>
            <div className="text-2xs text-ink-400">Live everywhere</div>
          </div>
          <span className="text-xs font-bold text-ink-700 tnum">{bothCount} items</span>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-ink-400" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-ink-200 rounded-lg text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="all">All Categories</option>
          {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(['all', 'zomato', 'swiggy'] as const).map(p => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${platformFilter === p ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
              {p === 'all' ? 'All Platforms' : p}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => setAll('zomato', true)} className="px-2 py-1.5 text-xs bg-danger-50 text-danger-700 rounded-lg hover:bg-danger-100 font-medium">Z: All On</button>
          <button onClick={() => setAll('zomato', false)} className="px-2 py-1.5 text-xs bg-ink-100 text-ink-600 rounded-lg hover:bg-ink-200 font-medium">Z: All Off</button>
          <button onClick={() => setAll('swiggy', true)} className="px-2 py-1.5 text-xs bg-info-50 text-info-700 rounded-lg hover:bg-info-100 font-medium">S: All On</button>
          <button onClick={() => setAll('swiggy', false)} className="px-2 py-1.5 text-xs bg-ink-100 text-ink-600 rounded-lg hover:bg-ink-200 font-medium">S: All Off</button>
        </div>
      </div>

      <Card pad={false}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
              <th className="text-left px-4 py-2.5">Item</th>
              <th className="text-left px-3 py-2.5">Category</th>
              <th className="text-right px-3 py-2.5">Price</th>
              {(platformFilter === 'all' || platformFilter === 'zomato') && <th className="text-center px-4 py-2.5">Zomato</th>}
              {(platformFilter === 'all' || platformFilter === 'swiggy') && <th className="text-center px-4 py-2.5">Swiggy</th>}
              <th className="text-center px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map(item => {
              const s = sync[item.id] ?? { zomato: false, swiggy: false };
              const synced = s.zomato || s.swiggy;
              const bothSynced = s.zomato && s.swiggy;
              return (
                <tr key={item.id} className="border-t border-ink-100 hover:bg-ink-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-700">{item.name}</div>
                    {!item.available && <Badge tone="danger" size="xs">86'd on POS</Badge>}
                  </td>
                  <td className="px-3 py-3"><Badge tone="neutral" size="xs">{item.category}</Badge></td>
                  <td className="px-3 py-3 text-right tnum font-semibold text-ink-800">{inr(item.price)}</td>
                  {(platformFilter === 'all' || platformFilter === 'zomato') && (
                    <td className="px-4 py-3 text-center">
                      <Toggle checked={s.zomato} onChange={() => toggle(item.id, 'zomato')} />
                    </td>
                  )}
                  {(platformFilter === 'all' || platformFilter === 'swiggy') && (
                    <td className="px-4 py-3 text-center">
                      <Toggle checked={s.swiggy} onChange={() => toggle(item.id, 'swiggy')} />
                    </td>
                  )}
                  <td className="px-3 py-3 text-center">
                    {bothSynced
                      ? <Badge tone="brand" size="xs" dot>Both Live</Badge>
                      : synced
                      ? <Badge tone="warn" size="xs" dot>Partial</Badge>
                      : <Badge tone="danger" size="xs" dot>Off</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
