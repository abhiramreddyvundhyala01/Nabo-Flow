'use client';

// ===== Nabo Flow — Inventory Management (Full CRUD + sessionStorage) =====
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Package, AlertTriangle, TrendingDown, Boxes,
  ArrowDownToLine, ArrowUpFromLine, Search, Plus, Edit3,
  Trash2, X, Save, AlertCircle, ChevronDown, BarChart3,
  BadgeCheck, RefreshCw, ArrowUp, ArrowDown, Filter,
} from 'lucide-react';
import { rawMaterials as defaultMaterials } from '../data';
import type { RawMaterial } from '../types';
import { inr } from '../format';
import { Card, Badge, Button, StatCard, ProgressBar, SectionHeader } from '../ui';

// ─── sessionStorage helpers ────────────────────────────────────────────────────
const SS_KEY = 'nabo_raw_materials';

function ssLoad(): RawMaterial[] {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RawMaterial[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return defaultMaterials;
}

function ssSave(items: RawMaterial[]) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const newId = () => 'r' + Date.now();
const CATEGORIES = ['Grains', 'Meat', 'Dairy', 'Vegetables', 'Spices', 'Oils', 'Beverages', 'Other'];
const UOM_OPTIONS = ['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'box', 'packet'];

type Tab = 'materials' | 'reconciliation';
type SortField = 'name' | 'category' | 'stock' | 'unitCost';
type SortDir = 'asc' | 'desc';

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
// Main Inventory Component
// ════════════════════════════════════════════════════════════════════════════════
export function Inventory() {
  const [tab, setTab] = useState<Tab>('materials');
  const [materials, setMaterials] = useState<RawMaterial[]>(() => ssLoad());
  const [toast, setToast] = useState<string | null>(null);

  // Persist to sessionStorage on every change
  useEffect(() => { ssSave(materials); }, [materials]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const lowStock = useMemo(() => materials.filter(r => r.stock <= r.reorder), [materials]);
  const totalValue = useMemo(() => materials.reduce((s, r) => s + r.stock * r.unitCost, 0), [materials]);
  const stockHealth = useMemo(() =>
    materials.length > 0
      ? Math.round(((materials.length - lowStock.length) / materials.length) * 100)
      : 100,
  [materials, lowStock]);

  // ─── CRUD ────────────────────────────────────────────────────────────────────
  const addMaterial = useCallback((m: RawMaterial) => {
    setMaterials(prev => [...prev, m]);
    showToast(`"${m.name}" added to inventory`);
  }, [showToast]);

  const updateMaterial = useCallback((m: RawMaterial) => {
    setMaterials(prev => prev.map(r => r.id === m.id ? m : r));
    showToast(`"${m.name}" updated`);
  }, [showToast]);

  const deleteMaterial = useCallback((id: string) => {
    const name = materials.find(r => r.id === id)?.name ?? 'Item';
    setMaterials(prev => prev.filter(r => r.id !== id));
    showToast(`"${name}" removed`);
  }, [materials, showToast]);

  const adjustStock = useCallback((id: string, delta: number) => {
    const name = materials.find(r => r.id === id)?.name ?? 'Item';
    setMaterials(prev => prev.map(r => r.id === id
      ? { ...r, stock: Math.max(0, +(r.stock + delta).toFixed(2)) }
      : r));
    showToast(`${name}: stock ${delta > 0 ? '+' : ''}${delta}`);
  }, [materials, showToast]);

  const resetToDefaults = useCallback(() => {
    setMaterials(defaultMaterials);
    ssSave(defaultMaterials);
    showToast('Inventory reset to defaults');
  }, [showToast]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total SKUs"    value={String(materials.length)} sub="Raw materials tracked"     icon={<Boxes className="h-5 w-5" />}         tone="info" />
        <StatCard label="Stock Value"   value={inr(totalValue)}          sub="Current valuation"          icon={<Package className="h-5 w-5" />}        tone="brand" />
        <StatCard label="Low Stock"     value={String(lowStock.length)}  sub="At or below reorder level"  icon={<AlertTriangle className="h-5 w-5" />}  tone="danger" />
        <StatCard label="Stock Health"  value={`${stockHealth}%`}        sub="Items above reorder"         icon={<BarChart3 className="h-5 w-5" />}      tone="accent" />
      </div>

      {/* Tabs + actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-white rounded-xl border border-ink-200/60 p-1 w-fit">
          {([
            { key: 'materials',      label: 'Raw Materials' },
            { key: 'reconciliation', label: 'Reconciliation' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'materials' && (
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      {tab === 'materials' && (
        <MaterialsTab
          materials={materials}
          onAdd={addMaterial}
          onUpdate={updateMaterial}
          onDelete={deleteMaterial}
          onAdjust={adjustStock}
        />
      )}
      {tab === 'reconciliation' && <ReconciliationTab materials={materials} />}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Materials Tab — full CRUD table
// ════════════════════════════════════════════════════════════════════════════════
function MaterialsTab({
  materials, onAdd, onUpdate, onDelete, onAdjust,
}: {
  materials: RawMaterial[];
  onAdd: (m: RawMaterial) => void;
  onUpdate: (m: RawMaterial) => void;
  onDelete: (id: string) => void;
  onAdjust: (id: string, delta: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'ok'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editItem, setEditItem] = useState<RawMaterial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [adjustId, setAdjustId] = useState<string | null>(null);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = materials.filter(r => {
      const q = search.toLowerCase();
      const matchQ = !q || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
      const matchCat = catFilter === 'all' || r.category === catFilter;
      const isLow = r.stock <= r.reorder;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'low' ? isLow : !isLow);
      return matchQ && matchCat && matchStatus;
    });
    list = [...list].sort((a, b) => {
      let av: string | number = a[sortField];
      let bv: string | number = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      const r = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? r : -r;
    });
    return list;
  }, [materials, search, catFilter, statusFilter, sortField, sortDir]);

  const categories = useMemo(() => [...new Set(materials.map(m => m.category))].sort(), [materials]);

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-0.5 hover:text-ink-800 transition-colors">
      {label}
      {sortField === field
        ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
        : <span className="h-3 w-3 opacity-0">↕</span>}
    </button>
  );

  const handleSave = (m: RawMaterial) => {
    if (editItem) onUpdate(m);
    else onAdd(m);
    setShowForm(false);
    setEditItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or category..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="h-9 px-3 text-xs bg-white border border-ink-200 rounded-lg text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-9 px-3 text-xs bg-white border border-ink-200 rounded-lg text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="all">All Status</option>
          <option value="low">🔴 Low Stock</option>
          <option value="ok">🟢 Adequate</option>
        </select>
        <Button variant="primary" size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Material
        </Button>
      </div>

      {/* Low stock alert bar */}
      {materials.filter(r => r.stock <= r.reorder).length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{materials.filter(r => r.stock <= r.reorder).length} items</span>
          <span className="text-danger-600">are at or below reorder level —</span>
          <span className="font-semibold">{materials.filter(r => r.stock <= r.reorder).map(r => r.name).join(', ')}</span>
        </div>
      )}

      {/* Table */}
      <Card pad={false}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
              <th className="text-left px-4 py-2.5"><SortBtn field="name" label="Material" /></th>
              <th className="text-left px-3 py-2.5"><SortBtn field="category" label="Category" /></th>
              <th className="text-right px-3 py-2.5"><SortBtn field="stock" label="Stock" /></th>
              <th className="text-right px-3 py-2.5">Reorder</th>
              <th className="text-right px-3 py-2.5"><SortBtn field="unitCost" label="Unit Cost" /></th>
              <th className="text-right px-3 py-2.5">Value</th>
              <th className="text-center px-3 py-2.5">Status</th>
              <th className="text-center px-3 py-2.5">Adjust</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-ink-400 text-sm">
                No materials found.{' '}
                <button onClick={() => { setEditItem(null); setShowForm(true); }} className="text-brand-600 font-semibold hover:underline">Add one?</button>
              </td></tr>
            )}
            {filtered.map(r => {
              const isLow = r.stock <= r.reorder;
              const stockPct = r.reorder > 0 ? Math.min(100, (r.stock / (r.reorder * 2)) * 100) : 100;
              return (
                <tr key={r.id} className={`border-t border-ink-100 transition-colors group ${isLow ? 'bg-danger-50/30 hover:bg-danger-50/60' : 'hover:bg-ink-50/50'}`}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink-800">{r.name}</div>
                    <div className="mt-1 w-28">
                      <ProgressBar value={stockPct} tone={stockPct < 30 ? 'danger' : stockPct < 60 ? 'warn' : 'brand'} />
                    </div>
                  </td>
                  <td className="px-3 py-3"><Badge tone="neutral" size="xs">{r.category}</Badge></td>
                  <td className="px-3 py-3 text-right">
                    <span className={`tnum font-bold ${isLow ? 'text-danger-600' : 'text-ink-800'}`}>{r.stock}</span>
                    <span className="text-ink-400 text-2xs ml-1">{r.uom}</span>
                  </td>
                  <td className="px-3 py-3 text-right tnum text-ink-400 text-sm">
                    {r.reorder} <span className="text-2xs">{r.uom}</span>
                  </td>
                  <td className="px-3 py-3 text-right tnum text-ink-600">{inr(r.unitCost)}</td>
                  <td className="px-3 py-3 text-right tnum font-semibold text-ink-800">{inr(+(r.stock * r.unitCost).toFixed(0))}</td>
                  <td className="px-3 py-3 text-center">
                    {isLow
                      ? <Badge tone="danger" size="xs" dot>Low</Badge>
                      : <Badge tone="brand" size="xs" dot>OK</Badge>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {/* Quick adjust buttons */}
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onAdjust(r.id, -1)} title={`Remove 1 ${r.uom}`}
                        className="h-6 w-6 rounded-md bg-danger-50 hover:bg-danger-100 flex items-center justify-center text-danger-600 transition-colors text-xs font-bold">−</button>
                      <button onClick={() => setAdjustId(r.id)} title="Custom adjust"
                        className="h-6 px-1.5 rounded-md bg-ink-100 hover:bg-ink-200 flex items-center justify-center text-ink-600 transition-colors text-2xs font-semibold">±</button>
                      <button onClick={() => onAdjust(r.id, 1)} title={`Add 1 ${r.uom}`}
                        className="h-6 w-6 rounded-md bg-brand-50 hover:bg-brand-100 flex items-center justify-center text-brand-600 transition-colors text-xs font-bold">+</button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditItem(r); setShowForm(true); }} title="Edit"
                        className="h-7 w-7 rounded-md hover:bg-brand-50 flex items-center justify-center transition-colors">
                        <Edit3 className="h-3.5 w-3.5 text-brand-500" />
                      </button>
                      <button onClick={() => setDeleteId(r.id)} title="Delete"
                        className="h-7 w-7 rounded-md hover:bg-danger-50 flex items-center justify-center transition-colors">
                        <Trash2 className="h-3.5 w-3.5 text-danger-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Footer totals */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-ink-200 bg-ink-50/80">
                <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-ink-500">
                  {filtered.length} of {materials.length} items shown
                </td>
                <td className="px-3 py-2.5 text-right tnum font-bold text-ink-800 text-sm">
                  {inr(filtered.reduce((s, r) => s + +(r.stock * r.unitCost).toFixed(0), 0))}
                </td>
                <td colSpan={3} className="px-3 py-2.5 text-2xs text-ink-400 text-right">
                  Saved to session storage
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      {/* Add/Edit Modal */}
      {showForm && (
        <MaterialFormModal
          item={editItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}

      {/* Custom adjust modal */}
      {adjustId && (
        <AdjustModal
          material={materials.find(r => r.id === adjustId)!}
          onAdjust={(id, delta) => { onAdjust(id, delta); setAdjustId(null); }}
          onClose={() => setAdjustId(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-danger-100 flex items-center justify-center"><Trash2 className="h-5 w-5 text-danger-600" /></div>
              <div>
                <h3 className="font-bold text-ink-900">Delete "{materials.find(r => r.id === deleteId)?.name}"?</h3>
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

// Helper Field Component
function ModalField({
  label, err, children,
}: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-600 mb-1">{label}</label>
      {children}
      {err && <p className="text-2xs text-danger-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{err}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Add / Edit Material Modal
// ════════════════════════════════════════════════════════════════════════════════
function MaterialFormModal({
  item, onSave, onClose,
}: { item: RawMaterial | null; onSave: (m: RawMaterial) => void; onClose: () => void }) {
  const isEdit = !!item;
  const [form, setForm] = useState<RawMaterial>(item ?? {
    id: newId(), name: '', uom: 'kg', category: 'Grains',
    stock: 0, reorder: 5, unitCost: 0,
  });
  const [stockInput, setStockInput] = useState<string>(item ? String(item.stock) : '');
  const [reorderInput, setReorderInput] = useState<string>(item ? String(item.reorder) : '5');
  const [unitCostInput, setUnitCostInput] = useState<string>(item ? String(item.unitCost) : '');

  const [errors, setErrors] = useState<Partial<Record<keyof RawMaterial, string>>>({});

  const set = <K extends keyof RawMaterial>(k: K, v: RawMaterial[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim())  e.name     = 'Name is required';
    if (!form.uom.trim())   e.uom      = 'Unit of measure is required';
    if (!form.category)     e.category = 'Category is required';
    const cost = parseFloat(unitCostInput) || 0;
    const stk = parseFloat(stockInput) || 0;
    const reord = parseFloat(reorderInput) || 0;
    if (cost < 0)  e.unitCost = 'Cost cannot be negative';
    if (stk < 0)     e.stock    = 'Stock cannot be negative';
    if (reord < 0)   e.reorder  = 'Reorder level cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      stock: parseFloat(stockInput) || 0,
      reorder: parseFloat(reorderInput) || 0,
      unitCost: parseFloat(unitCostInput) || 0,
    });
  };

  const currentStock = parseFloat(stockInput) || 0;
  const currentCost = parseFloat(unitCostInput) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <Package className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="font-bold text-ink-900">{isEdit ? `Edit "${item!.name}"` : 'Add Raw Material'}</h3>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center">
            <X className="h-4 w-4 text-ink-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <ModalField label="Material Name *" err={errors.name}>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Basmati Rice"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 ${errors.name ? 'border-danger-400' : 'border-ink-200'}`} />
          </ModalField>

          {/* Category + UOM */}
          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Category *" err={errors.category}>
              <div className="relative">
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="w-full appearance-none px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
              </div>
            </ModalField>
            <ModalField label="Unit of Measure *" err={errors.uom}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select value={UOM_OPTIONS.includes(form.uom) ? form.uom : 'custom'} onChange={e => e.target.value !== 'custom' && set('uom', e.target.value)}
                    className="w-full appearance-none px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                    {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    <option value="custom">Custom…</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
                </div>
                {!UOM_OPTIONS.includes(form.uom) && (
                  <input type="text" value={form.uom} onChange={e => set('uom', e.target.value)}
                    placeholder="e.g. L" className="w-20 px-2 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                )}
              </div>
            </ModalField>
          </div>

          {/* Stock + Reorder */}
          <div className="grid grid-cols-2 gap-4">
            <ModalField label={`Opening Stock (${form.uom})`} err={errors.stock}>
              <input type="number" value={stockInput} min={0} step={0.1}
                onChange={e => setStockInput(e.target.value)}
                placeholder="0"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum ${errors.stock ? 'border-danger-400' : 'border-ink-200'}`} />
            </ModalField>
            <ModalField label={`Reorder Level (${form.uom})`} err={errors.reorder}>
              <input type="number" value={reorderInput} min={0} step={0.1}
                onChange={e => setReorderInput(e.target.value)}
                placeholder="5"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum ${errors.reorder ? 'border-danger-400' : 'border-ink-200'}`} />
            </ModalField>
          </div>

          {/* Unit cost */}
          <ModalField label="Unit Cost (₹ per UOM) *" err={errors.unitCost}>
            <input type="number" value={unitCostInput} min={0} step={0.5}
              onChange={e => setUnitCostInput(e.target.value)}
              placeholder="0.00"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum ${errors.unitCost ? 'border-danger-400' : 'border-ink-200'}`} />
          </ModalField>

          {/* Summary card */}
          {currentStock > 0 && currentCost > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-brand-50 border border-brand-100 text-sm">
              <span className="text-ink-600 font-medium">Total Stock Value</span>
              <span className="font-bold text-brand-700 tnum">
                {inr(+(currentStock * currentCost).toFixed(0))}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-ink-100 bg-ink-50/50 sticky bottom-0">
          <Button variant="secondary" block onClick={onClose}>Cancel</Button>
          <Button variant="primary" block onClick={handleSubmit}>
            <Save className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Add Material'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Custom Stock Adjust Modal
// ════════════════════════════════════════════════════════════════════════════════
function AdjustModal({
  material, onAdjust, onClose,
}: { material: RawMaterial; onAdjust: (id: string, delta: number) => void; onClose: () => void }) {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [qty, setQty] = useState<number>(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const preview = mode === 'add'
    ? material.stock + qty
    : Math.max(0, material.stock - qty);

  const submit = () => {
    if (qty <= 0) { setError('Quantity must be greater than 0'); return; }
    if (mode === 'remove' && qty > material.stock) { setError(`Cannot remove more than current stock (${material.stock} ${material.uom})`); return; }
    onAdjust(material.id, mode === 'add' ? qty : -qty);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <div>
            <h3 className="font-bold text-ink-900">Adjust Stock</h3>
            <p className="text-xs text-ink-400">{material.name} · Current: <span className="font-semibold text-ink-700">{material.stock} {material.uom}</span></p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center"><X className="h-4 w-4 text-ink-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-xs text-danger-700 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          {/* Add / Remove toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('add')}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-1.5 ${mode === 'add' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500 hover:bg-ink-50'}`}>
              <ArrowUpFromLine className="h-4 w-4" /> Inward (Add)
            </button>
            <button onClick={() => setMode('remove')}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-1.5 ${mode === 'remove' ? 'border-danger-500 bg-danger-50 text-danger-700' : 'border-ink-200 text-ink-500 hover:bg-ink-50'}`}>
              <ArrowDownToLine className="h-4 w-4" /> Outward (Remove)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Quantity ({material.uom}) *</label>
            <input type="number" value={qty || ''} min={0} step={0.1} autoFocus
              onChange={e => { setQty(parseFloat(e.target.value) || 0); setError(''); }}
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. GRN#12, Wastage, Physical count..."
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          {/* Preview */}
          {qty > 0 && (
            <div className={`flex items-center justify-between p-3 rounded-xl text-sm font-medium ${mode === 'add' ? 'bg-brand-50 text-brand-700' : 'bg-danger-50 text-danger-700'}`}>
              <span>New stock after adjustment</span>
              <span className="font-bold tnum">{preview.toFixed(2)} {material.uom}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-ink-100">
          <Button variant="secondary" block onClick={onClose}>Cancel</Button>
          <Button variant={mode === 'add' ? 'primary' : 'danger'} block onClick={submit}>
            {mode === 'add' ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
            {mode === 'add' ? 'Add Stock' : 'Remove Stock'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Reconciliation Tab
// ════════════════════════════════════════════════════════════════════════════════
function ReconciliationTab({ materials }: { materials: RawMaterial[] }) {
  const outlets = ['Main Branch', 'Koramangala', 'Whitefield'];
  const [selected, setSelected] = useState(outlets[0]);

  const totalValue   = materials.reduce((s, r) => s + +(r.stock * r.unitCost).toFixed(0), 0);
  const openingStock = Math.round(totalValue * 1.28);
  const outward      = Math.round(totalValue * 0.31);
  const inward       = Math.round(totalValue * 0.2);
  const variance     = openingStock - outward + inward - totalValue;

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader
          title="Opening / Closing Stock Reconciliation"
          subtitle="Live stock value auto-computed from current inventory"
          action={
            <select value={selected} onChange={e => setSelected(e.target.value)}
              className="text-sm border border-ink-200 rounded-lg px-3 py-1.5 bg-white font-medium text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
              {outlets.map(o => <option key={o}>{o}</option>)}
            </select>
          }
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Opening Stock',  value: inr(openingStock), color: 'bg-ink-50',     textColor: 'text-ink-800' },
            { label: 'Outward (Sales)',value: `-${inr(outward)}`, color: 'bg-danger-50', textColor: 'text-danger-700' },
            { label: 'Inward (GRN)',   value: `+${inr(inward)}`, color: 'bg-brand-50',  textColor: 'text-brand-700' },
            { label: 'Closing Stock',  value: inr(totalValue),   color: 'bg-info-50',    textColor: 'text-info-700' },
          ].map(s => (
            <div key={s.label} className={`p-3 rounded-xl ${s.color}`}>
              <div className="text-2xs uppercase text-ink-400 font-semibold mb-1">{s.label}</div>
              <div className={`text-lg font-bold tnum ${s.textColor}`}>{s.value}</div>
            </div>
          ))}
        </div>
        {variance !== 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-warn-50 border border-warn-200 rounded-lg text-warn-700 text-xs font-medium mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Variance detected: {inr(Math.abs(variance))} ({(Math.abs(variance) / openingStock * 100).toFixed(1)}%)
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm"><ArrowDownToLine className="h-3.5 w-3.5" /> Opening Entry</Button>
          <Button variant="secondary" size="sm"><ArrowUpFromLine className="h-3.5 w-3.5" /> Outward Entry</Button>
          <Button variant="primary"   size="sm">Close Day</Button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Multi-Outlet Stock Dashboard" subtitle="Live stock comparison across outlets" />
        <div className="space-y-3">
          {outlets.map((o, i) => {
            const seed = [68, 42, 85][i] ?? 50;
            return (
              <div key={o} className="flex items-center gap-3">
                <span className="text-sm font-medium text-ink-700 w-48 truncate">{o}</span>
                <div className="flex-1"><ProgressBar value={seed} tone={seed < 30 ? 'danger' : seed < 60 ? 'warn' : 'brand'} /></div>
                <span className="text-sm tnum font-semibold text-ink-700 w-16 text-right">{seed}%</span>
                <Badge tone={seed < 30 ? 'danger' : seed < 60 ? 'warn' : 'brand'} size="xs">
                  {seed < 30 ? 'Critical' : seed < 60 ? 'Low' : 'Good'}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Low stock summary */}
      {materials.filter(r => r.stock <= r.reorder).length > 0 && (
        <Card>
          <SectionHeader title="Reorder Alerts" subtitle="Items at or below reorder level" />
          <div className="space-y-2">
            {materials.filter(r => r.stock <= r.reorder).map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-danger-50 border border-danger-100">
                <AlertTriangle className="h-4 w-4 text-danger-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-800 text-sm">{r.name}</div>
                  <div className="text-2xs text-ink-500">Stock: <span className="font-bold text-danger-600">{r.stock} {r.uom}</span> · Reorder at: {r.reorder} {r.uom}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xs text-ink-400">Est. cost</div>
                  <div className="text-sm font-bold text-ink-800 tnum">{inr((r.reorder * 2 - r.stock) * r.unitCost)}</div>
                </div>
                <Badge tone="danger" size="xs">Reorder Now</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
