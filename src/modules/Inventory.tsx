'use client';

// ===== Nabo Flow — Inventory Management (Full CRUD + BOM & BOQ Extensions) =====
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Package, AlertTriangle, TrendingDown, Boxes,
  ArrowDownToLine, ArrowUpFromLine, Search, Plus, Edit3,
  Trash2, X, Save, AlertCircle, ChevronDown, BarChart3,
  BadgeCheck, RefreshCw, ArrowUp, ArrowDown, Filter,
  BookOpen, Calculator, ShoppingCart, CheckCircle2, ArrowRight, Layers, FileText, Sparkles, Check, ChevronRight, PieChart,
} from 'lucide-react';
import { rawMaterials as defaultMaterials, bomRecipes as defaultBOMRecipes, boqPlans as defaultBOQPlans } from '../data';
import type { RawMaterial, BOMRecipe, BOMComponent, BOQPlan, BOQItem, BOQMaterialRequirement } from '../types';
import { inr } from '../format';
import { Card, Badge, Button, StatCard, ProgressBar, SectionHeader } from '../ui';
import { useMenu } from '../MenuContext';
import {
  isSupabaseConfigured, dbFetchRawMaterials, dbSaveRawMaterial,
  dbFetchBOMRecipes, dbSaveBOMRecipe, dbDeleteBOMRecipe,
  dbFetchBOQPlans, dbSaveBOQPlan, dbSavePurchaseOrder,
} from '../supabase';

// ─── LocalStorage / SessionStorage helpers ─────────────────────────────────────
const SS_KEY = 'nabo_raw_materials';
const LS_BOM_KEY = 'nabo_bom_recipes';
const LS_BOQ_KEY = 'nabo_boq_plans';

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

function loadBOMRecipes(): BOMRecipe[] {
  try {
    const raw = localStorage.getItem(LS_BOM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BOMRecipe[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return defaultBOMRecipes;
}

function saveBOMRecipes(items: BOMRecipe[]) {
  try { localStorage.setItem(LS_BOM_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

function loadBOQPlans(): BOQPlan[] {
  try {
    const raw = localStorage.getItem(LS_BOQ_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BOQPlan[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return defaultBOQPlans;
}

function saveBOQPlans(items: BOQPlan[]) {
  try { localStorage.setItem(LS_BOQ_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const newId = () => 'r' + Date.now();
const CATEGORIES = ['Grains', 'Meat', 'Dairy', 'Vegetables', 'Spices', 'Oils', 'Beverages', 'Other'];
const UOM_OPTIONS = ['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'box', 'packet'];

type Tab = 'materials' | 'bom' | 'boq' | 'reconciliation';
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
  const [bomList, setBOMList] = useState<BOMRecipe[]>(() => loadBOMRecipes());
  const [boqList, setBOQList] = useState<BOQPlan[]>(() => loadBOQPlans());
  const [toast, setToast] = useState<string | null>(null);

  // Fetch live materials from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      dbFetchRawMaterials().then(res => {
        if (res && Array.isArray(res)) {
          const mapped: RawMaterial[] = res.map((r: any) => ({
            id: r.id,
            name: r.name,
            uom: r.uom,
            category: r.category,
            stock: Number(r.stock),
            reorder: Number(r.reorder_level || r.reorder || 5),
            unitCost: Number(r.unit_cost || r.unitCost || 0),
          }));
          setMaterials(mapped);
          ssSave(mapped);
        }
      });

      dbFetchBOMRecipes().then(res => {
        if (res && Array.isArray(res) && res.length > 0) {
          const mapped: BOMRecipe[] = res.map((b: any) => ({
            id: b.id,
            menuItemId: b.menu_item_id,
            menuItemName: b.menu_item_name,
            outputQty: Number(b.output_qty || 1),
            outputUom: b.output_uom || 'portion',
            yieldPct: Number(b.yield_pct || 100),
            wastagePct: Number(b.wastage_pct || 0),
            totalCost: Number(b.total_cost || 0),
            costPerServing: Number(b.cost_per_serving || 0),
            suggestedPrice: Number(b.suggested_price || 0),
            marginPct: Number(b.margin_pct || 0),
            notes: b.notes || '',
            components: Array.isArray(b.bom_components) ? b.bom_components.map((c: any) => ({
              materialId: c.material_id,
              materialName: c.material_name,
              qty: Number(c.qty),
              uom: c.uom,
              unitCost: Number(c.unit_cost),
              totalCost: Number(c.total_cost),
            })) : [],
          }));
          setBOMList(mapped);
          saveBOMRecipes(mapped);
        }
      });

      dbFetchBOQPlans().then(res => {
        if (res && Array.isArray(res) && res.length > 0) {
          const mapped: BOQPlan[] = res.map((p: any) => ({
            id: p.id,
            title: p.title,
            date: p.date,
            eventOrType: p.event_or_type || 'daily_prep',
            items: p.items || [],
            requirements: p.requirements || [],
            totalEstimatedCost: Number(p.total_estimated_cost || 0),
            status: p.status || 'draft',
            notes: p.notes || '',
          }));
          setBOQList(mapped);
          saveBOQPlans(mapped);
        }
      });
    }
  }, []);

  // Persist to storage on every change
  useEffect(() => { ssSave(materials); }, [materials]);
  useEffect(() => { saveBOMRecipes(bomList); }, [bomList]);
  useEffect(() => { saveBOQPlans(boqList); }, [boqList]);

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

  // ─── CRUD Materials ──────────────────────────────────────────────────────────
  const addMaterial = useCallback((m: RawMaterial) => {
    setMaterials(prev => [...prev, m]);
    dbSaveRawMaterial(m);
    showToast(`"${m.name}" added to inventory`);
  }, [showToast]);

  const updateMaterial = useCallback((m: RawMaterial) => {
    setMaterials(prev => prev.map(r => r.id === m.id ? m : r));
    dbSaveRawMaterial(m);
    showToast(`"${m.name}" updated`);
  }, [showToast]);

  const deleteMaterial = useCallback((id: string) => {
    const name = materials.find(r => r.id === id)?.name ?? 'Item';
    setMaterials(prev => prev.filter(r => r.id !== id));
    showToast(`"${name}" removed`);
  }, [materials, showToast]);

  const adjustStock = useCallback((id: string, delta: number) => {
    const name = materials.find(r => r.id === id)?.name ?? 'Item';
    setMaterials(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, stock: Math.max(0, +(r.stock + delta).toFixed(2)) };
      dbSaveRawMaterial(updated);
      return updated;
    }));
    showToast(`${name}: stock ${delta > 0 ? '+' : ''}${delta}`);
  }, [materials, showToast]);

  const resetToDefaults = useCallback(() => {
    setMaterials(defaultMaterials);
    ssSave(defaultMaterials);
    showToast('Inventory reset to defaults');
  }, [showToast]);

  // ─── BOM CRUD Handlers ─────────────────────────────────────────────────────
  const saveBOM = useCallback((bom: BOMRecipe) => {
    setBOMList(prev => {
      const idx = prev.findIndex(b => b.id === bom.id || b.menuItemId === bom.menuItemId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = bom;
        return next;
      }
      return [...prev, bom];
    });
    dbSaveBOMRecipe(bom);
    showToast(`Recipe BOM for "${bom.menuItemName}" saved`);
  }, [showToast]);

  const deleteBOM = useCallback((id: string) => {
    setBOMList(prev => prev.filter(b => b.id !== id));
    dbDeleteBOMRecipe(id);
    showToast('Recipe BOM deleted');
  }, [showToast]);

  // ─── BOQ CRUD Handlers ─────────────────────────────────────────────────────
  const saveBOQ = useCallback((plan: BOQPlan) => {
    setBOQList(prev => {
      const idx = prev.findIndex(p => p.id === plan.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = plan;
        return next;
      }
      return [plan, ...prev];
    });
    dbSaveBOQPlan(plan);
    showToast(`BOQ Plan "${plan.title}" saved`);
  }, [showToast]);

  const issueBOQStockToKitchen = useCallback((plan: BOQPlan) => {
    // Deduct stock for all requirements
    setMaterials(prev => {
      const updatedList = prev.map(mat => {
        const req = plan.requirements.find(r => r.materialId === mat.id);
        if (req && req.requiredQty > 0) {
          const nextStock = Math.max(0, +(mat.stock - req.requiredQty).toFixed(2));
          const updated = { ...mat, stock: nextStock };
          dbSaveRawMaterial(updated);
          return updated;
        }
        return mat;
      });
      return updatedList;
    });

    const updatedPlan: BOQPlan = { ...plan, status: 'issued_to_kitchen' };
    saveBOQ(updatedPlan);
    showToast(`Batch materials for "${plan.title}" issued to kitchen & deducted from stock!`);
  }, [saveBOQ, showToast]);

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
            { key: 'bom',            label: 'Bill of Materials (BOM)' },
            { key: 'boq',            label: 'Production Calculator (BOQ)' },
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

      {tab === 'bom' && (
        <BOMTab
          materials={materials}
          bomList={bomList}
          onSave={saveBOM}
          onDelete={deleteBOM}
        />
      )}

      {tab === 'boq' && (
        <BOQTab
          materials={materials}
          bomList={bomList}
          boqList={boqList}
          onSavePlan={saveBOQ}
          onIssueStock={issueBOQStockToKitchen}
          showToast={showToast}
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

// ════════════════════════════════════════════════════════════════════════════════
// Bill of Materials (BOM / Recipe Costing) Tab
// ════════════════════════════════════════════════════════════════════════════════
function BOMTab({
  materials, bomList, onSave, onDelete,
}: {
  materials: RawMaterial[];
  bomList: BOMRecipe[];
  onSave: (bom: BOMRecipe) => void;
  onDelete: (id: string) => void;
}) {
  const { menuItems } = useMenu();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'configured' | 'unconfigured'>('all');
  const [editingItem, setEditingItem] = useState<{ menuItemId: string; menuItemName: string; price: number } | null>(null);

  const categories = useMemo(() => ['all', ...new Set(menuItems.map(m => m.category))], [menuItems]);

  const itemRows = useMemo(() => {
    return menuItems.filter(item => {
      const q = search.toLowerCase();
      const matchQ = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const bom = bomList.find(b => b.menuItemId === item.id);
      const matchStatus = statusFilter === 'all' || (statusFilter === 'configured' ? Boolean(bom) : !bom);
      return matchQ && matchCat && matchStatus;
    });
  }, [menuItems, bomList, search, categoryFilter, statusFilter]);

  const totalConfigured = useMemo(() => bomList.length, [bomList]);
  const avgFoodCostPct = useMemo(() => {
    if (bomList.length === 0) return 0;
    const totalFC = bomList.reduce((acc, b) => {
      const menu = menuItems.find(m => m.id === b.menuItemId);
      const price = menu?.price || b.suggestedPrice || 1;
      return acc + (b.totalCost / price) * 100;
    }, 0);
    return (totalFC / bomList.length).toFixed(1);
  }, [bomList, menuItems]);

  return (
    <div className="space-y-4">
      {/* BOM Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Configured Recipes" value={`${totalConfigured} / ${menuItems.length}`} sub="Menu items with BOM" icon={<BookOpen className="h-5 w-5" />} tone="brand" />
        <StatCard label="Avg Food Cost %" value={`${avgFoodCostPct}%`} sub="Target: 28% - 32%" icon={<PieChart className="h-5 w-5" />} tone={Number(avgFoodCostPct) > 35 ? 'warn' : 'accent'} />
        <StatCard label="Raw Materials" value={String(materials.length)} sub="Available ingredients" icon={<Boxes className="h-5 w-5" />} tone="info" />
        <StatCard label="Unconfigured" value={String(menuItems.length - totalConfigured)} sub="Needs recipe definition" icon={<AlertCircle className="h-5 w-5" />} tone="warn" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-ink-200/60 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recipe or menu item..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-sm border border-ink-200 rounded-xl px-3 py-1.5 bg-white font-medium text-ink-700 capitalize focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {categories.map(c => <option key={c} value={c} className="capitalize">{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-sm border border-ink-200 rounded-xl px-3 py-1.5 bg-white font-medium text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="all">All Recipes</option>
            <option value="configured">Configured Only</option>
            <option value="unconfigured">Unconfigured Only</option>
          </select>
        </div>
      </div>

      {/* Menu Item BOM Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {itemRows.map(item => {
          const bom = bomList.find(b => b.menuItemId === item.id);
          const foodCostPct = bom ? Math.round((bom.totalCost / item.price) * 100) : 0;
          const grossMarginPct = bom ? 100 - foodCostPct : 0;

          return (
            <Card key={item.id} className="hover:border-brand-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-ink-900 text-sm">{item.name}</h3>
                    <div className="text-2xs text-ink-400 capitalize">{item.category} · Retail Price: <span className="font-semibold text-ink-800">{inr(item.price)}</span></div>
                  </div>
                  {bom ? (
                    <Badge tone={foodCostPct <= 32 ? 'brand' : foodCostPct <= 40 ? 'warn' : 'danger'} size="xs">
                      {foodCostPct}% Food Cost
                    </Badge>
                  ) : (
                    <Badge tone="neutral" size="xs">No Recipe BOM</Badge>
                  )}
                </div>

                {bom ? (
                  <div className="space-y-2 mt-3 pt-3 border-t border-ink-100">
                    <div className="grid grid-cols-3 gap-2 text-center p-2 rounded-xl bg-ink-50">
                      <div>
                        <div className="text-2xs text-ink-400 font-medium">BOM Cost</div>
                        <div className="text-xs font-bold text-ink-900 tnum">{inr(bom.totalCost)}</div>
                      </div>
                      <div>
                        <div className="text-2xs text-ink-400 font-medium">Food Cost</div>
                        <div className="text-xs font-bold text-brand-600 tnum">{foodCostPct}%</div>
                      </div>
                      <div>
                        <div className="text-2xs text-ink-400 font-medium">Gross Margin</div>
                        <div className="text-xs font-bold text-success-600 tnum">{grossMarginPct}%</div>
                      </div>
                    </div>

                    <div className="text-2xs text-ink-500 font-medium">
                      Ingredients ({bom.components.length}): {bom.components.map(c => `${c.materialName} (${c.qty}${c.uom})`).join(', ')}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded-xl bg-ink-50 text-center text-xs text-ink-400 italic">
                    Recipe BOM not configured yet. Click below to add raw material components.
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between gap-2">
                {bom ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setEditingItem({ menuItemId: item.id, menuItemName: item.name, price: item.price })}>
                      <Edit3 className="h-3.5 w-3.5" /> Edit Recipe
                    </Button>
                    <button onClick={() => onDelete(bom.id)} className="p-1.5 text-ink-400 hover:text-danger-500 rounded-lg hover:bg-danger-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" block onClick={() => setEditingItem({ menuItemId: item.id, menuItemName: item.name, price: item.price })}>
                    <Plus className="h-3.5 w-3.5" /> Create Recipe BOM
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* BOM Builder Modal */}
      {editingItem && (
        <BOMBuilderModal
          menuItem={editingItem}
          existingBOM={bomList.find(b => b.menuItemId === editingItem.menuItemId)}
          materials={materials}
          onSave={(bom) => {
            onSave(bom);
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

// ─── BOM Builder Modal Component ─────────────────────────────────────────────
function BOMBuilderModal({
  menuItem, existingBOM, materials, onSave, onClose,
}: {
  menuItem: { menuItemId: string; menuItemName: string; price: number };
  existingBOM?: BOMRecipe;
  materials: RawMaterial[];
  onSave: (bom: BOMRecipe) => void;
  onClose: () => void;
}) {
  const [outputQty, setOutputQty] = useState(existingBOM?.outputQty || 1);
  const [outputUom, setOutputUom] = useState(existingBOM?.outputUom || 'portion');
  const [yieldPct, setYieldPct] = useState(existingBOM?.yieldPct || 95);
  const [wastagePct, setWastagePct] = useState(existingBOM?.wastagePct || 5);
  const [notes, setNotes] = useState(existingBOM?.notes || '');
  const [components, setComponents] = useState<BOMComponent[]>(existingBOM?.components || []);

  // Ingredient calculation
  const totalCost = useMemo(() => components.reduce((s, c) => s + (c.qty * c.unitCost), 0), [components]);
  const costPerServing = useMemo(() => (outputQty > 0 ? +(totalCost / outputQty).toFixed(2) : totalCost), [totalCost, outputQty]);
  const foodCostPct = useMemo(() => menuItem.price > 0 ? Math.round((costPerServing / menuItem.price) * 100) : 0, [costPerServing, menuItem.price]);
  const marginPct = useMemo(() => 100 - foodCostPct, [foodCostPct]);
  const suggestedPrice = useMemo(() => Math.round(costPerServing / 0.30), [costPerServing]);

  const addComponentRow = () => {
    const firstMat = materials[0];
    if (!firstMat) return;
    setComponents(prev => [
      ...prev,
      {
        materialId: firstMat.id,
        materialName: firstMat.name,
        qty: 0.1,
        uom: firstMat.uom,
        unitCost: firstMat.unitCost,
        totalCost: 0.1 * firstMat.unitCost,
      },
    ]);
  };

  const updateComponent = (index: number, matId: string, qty: number) => {
    const mat = materials.find(m => m.id === matId);
    if (!mat) return;
    setComponents(prev => {
      const next = [...prev];
      const safeQty = Math.max(0, qty);
      next[index] = {
        materialId: mat.id,
        materialName: mat.name,
        qty: safeQty,
        uom: mat.uom,
        unitCost: mat.unitCost,
        totalCost: +(safeQty * mat.unitCost).toFixed(2),
      };
      return next;
    });
  };

  const removeComponent = (index: number) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const bomRecipe: BOMRecipe = {
      id: existingBOM?.id || `bom-${menuItem.menuItemId}`,
      menuItemId: menuItem.menuItemId,
      menuItemName: menuItem.menuItemName,
      outputQty,
      outputUom,
      yieldPct,
      wastagePct,
      totalCost,
      costPerServing,
      suggestedPrice,
      marginPct,
      notes,
      components,
      updatedAt: new Date().toISOString(),
    };
    onSave(bomRecipe);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-ink-50">
          <div>
            <h2 className="text-base font-bold text-ink-900">BOM Recipe Costing Builder</h2>
            <p className="text-2xs text-ink-400">Configure ingredient quantities & yield for <span className="font-semibold text-brand-600">{menuItem.menuItemName}</span></p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Menu & Retail Price overview */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-brand-50/60 border border-brand-100">
            <div>
              <div className="text-2xs text-brand-700 font-medium">Menu Retail Price</div>
              <div className="text-sm font-bold text-brand-900">{inr(menuItem.price)}</div>
            </div>
            <div>
              <div className="text-2xs text-brand-700 font-medium">Total BOM Cost</div>
              <div className="text-sm font-bold text-brand-900">{inr(totalCost)}</div>
            </div>
            <div>
              <div className="text-2xs text-brand-700 font-medium">Food Cost %</div>
              <div className={`text-sm font-bold ${foodCostPct > 35 ? 'text-danger-600' : 'text-success-600'}`}>{foodCostPct}%</div>
            </div>
          </div>

          {/* Recipe Settings */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-2xs font-semibold text-ink-600 mb-1">Batch Output Qty</label>
              <input type="number" value={outputQty} min={1} onChange={e => setOutputQty(parseFloat(e.target.value) || 1)} className="w-full px-3 py-1.5 text-sm border border-ink-200 rounded-lg focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-ink-600 mb-1">Yield %</label>
              <input type="number" value={yieldPct} min={1} max={100} onChange={e => setYieldPct(parseFloat(e.target.value) || 100)} className="w-full px-3 py-1.5 text-sm border border-ink-200 rounded-lg focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-ink-600 mb-1">Wastage %</label>
              <input type="number" value={wastagePct} min={0} max={50} onChange={e => setWastagePct(parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 text-sm border border-ink-200 rounded-lg focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>

          {/* Component rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-ink-800">Recipe Raw Materials</label>
              <Button variant="secondary" size="sm" onClick={addComponentRow}>
                <Plus className="h-3.5 w-3.5" /> Add Raw Material
              </Button>
            </div>

            {components.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-400 border border-dashed border-ink-200 rounded-xl">
                No raw materials added yet. Click "+ Add Raw Material" above.
              </div>
            ) : (
              <div className="space-y-2">
                {components.map((comp, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-ink-200 bg-white">
                    <select
                      value={comp.materialId}
                      onChange={e => updateComponent(idx, e.target.value, comp.qty)}
                      className="flex-1 text-sm border border-ink-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({inr(m.unitCost)} / {m.uom})</option>
                      ))}
                    </select>

                    <div className="w-24">
                      <input
                        type="number"
                        step={0.01}
                        min={0.001}
                        value={comp.qty}
                        onChange={e => updateComponent(idx, comp.materialId, parseFloat(e.target.value) || 0)}
                        className="w-full text-sm border border-ink-200 rounded-lg px-2 py-1.5 text-right font-medium tnum focus:ring-2 focus:ring-brand-400"
                      />
                    </div>
                    <span className="text-xs text-ink-500 font-medium w-8">{comp.uom}</span>

                    <div className="w-20 text-right text-xs font-bold text-ink-800 tnum">
                      {inr(comp.totalCost)}
                    </div>

                    <button onClick={() => removeComponent(idx)} className="p-1 text-ink-400 hover:text-danger-500 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ink-100 bg-ink-50">
          <div className="text-2xs text-ink-500">
            Suggested Price for 30% Food Cost: <span className="font-bold text-ink-900">{inr(suggestedPrice)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save Recipe BOM</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Bill of Quantities (BOQ / Production Calculator) Tab
// ════════════════════════════════════════════════════════════════════════════════
function BOQTab({
  materials, bomList, boqList, onSavePlan, onIssueStock, showToast,
}: {
  materials: RawMaterial[];
  bomList: BOMRecipe[];
  boqList: BOQPlan[];
  onSavePlan: (plan: BOQPlan) => void;
  onIssueStock: (plan: BOQPlan) => void;
  showToast: (msg: string) => void;
}) {
  const { menuItems } = useMenu();
  const [showBuilder, setShowBuilder] = useState(false);
  const [activePlan, setActivePlan] = useState<BOQPlan | null>(null);

  // Generate PO for shortage items
  const generatePOFromBOQ = (plan: BOQPlan) => {
    const shortageItems = plan.requirements.filter(r => r.shortageQty > 0);
    if (shortageItems.length === 0) {
      showToast('No stock shortages detected in this plan!');
      return;
    }

    const poId = `PO-BOQ-${Date.now().toString().slice(-6)}`;
    const newPO = {
      id: poId,
      vendor: 'Sai Fresh Farm', // Default assigned vendor
      date: new Date().toISOString().split('T')[0],
      items: shortageItems.length,
      amount: shortageItems.reduce((s, r) => s + r.shortageQty * r.unitCost, 0),
      status: 'draft' as const,
      channel: 'whatsapp' as const,
      lines: shortageItems.map(r => ({
        material: r.materialName,
        qty: r.shortageQty,
        unit: r.uom,
        unitCost: r.unitCost,
      })),
      notes: `Generated automatically from BOQ Plan: "${plan.title}"`,
    };

    // Save to localStorage so Purchase module receives it
    try {
      const existingPOs = JSON.parse(localStorage.getItem('nabo_purchase_orders') || '[]');
      localStorage.setItem('nabo_purchase_orders', JSON.stringify([newPO, ...existingPOs]));
    } catch { /* ignore */ }

    dbSavePurchaseOrder(newPO);

    // Update plan status
    const updatedPlan: BOQPlan = { ...plan, status: 'po_generated' };
    onSavePlan(updatedPlan);
    showToast(`Purchase Order ${poId} generated for ${shortageItems.length} shortage materials!`);
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="bg-gradient-to-r font-sans">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-ink-900">Production Demand & BOQ Calculator</h2>
            <p className="text-xs text-ink-500">Calculate exact raw material requirements & stock deficits for daily kitchen prep & banquet events.</p>
          </div>
          <Button variant="primary" onClick={() => setShowBuilder(true)}>
            <Plus className="h-4 w-4" /> Create New BOQ Plan
          </Button>
        </div>
      </Card>

      {/* BOQ Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {boqList.map(plan => {
          const shortageCount = plan.requirements.filter(r => r.shortageQty > 0).length;
          return (
            <Card key={plan.id} className="hover:border-brand-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-ink-900 text-sm">{plan.title}</h3>
                    <div className="text-2xs text-ink-400 capitalize">{plan.date} · Type: {plan.eventOrType.replace('_', ' ')}</div>
                  </div>
                  <Badge tone={plan.status === 'issued_to_kitchen' ? 'brand' : plan.status === 'po_generated' ? 'info' : 'warn'} size="xs">
                    {plan.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2 mt-3 pt-3 border-t border-ink-100">
                  <div className="flex items-center justify-between text-xs text-ink-600">
                    <span>Target Items ({plan.items.length}):</span>
                    <span className="font-semibold text-ink-900">{plan.items.map(i => `${i.targetQty}x ${i.menuItemName}`).join(', ')}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-600">
                    <span>Estimated Procurement Cost:</span>
                    <span className="font-bold text-brand-600 tnum">{inr(plan.totalEstimatedCost)}</span>
                  </div>

                  {shortageCount > 0 ? (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-danger-50 text-danger-700 text-xs font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{shortageCount} ingredients short in stock</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-success-50 text-success-700 text-xs font-medium">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>All ingredients fully in stock</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-ink-100 flex flex-wrap gap-2 items-center justify-between">
                <Button variant="secondary" size="sm" onClick={() => setActivePlan(plan)}>
                  <FileText className="h-3.5 w-3.5" /> View Explosion Matrix
                </Button>

                <div className="flex gap-2">
                  {shortageCount > 0 && plan.status !== 'po_generated' && (
                    <Button variant="secondary" size="sm" onClick={() => generatePOFromBOQ(plan)}>
                      <ShoppingCart className="h-3.5 w-3.5 text-brand-600" /> Generate PO
                    </Button>
                  )}

                  {plan.status !== 'issued_to_kitchen' && (
                    <Button variant="primary" size="sm" onClick={() => onIssueStock(plan)}>
                      <Check className="h-3.5 w-3.5" /> Issue to Kitchen
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal / Panel for Creating New BOQ Plan */}
      {showBuilder && (
        <BOQBuilderModal
          materials={materials}
          bomList={bomList}
          menuItems={menuItems}
          onSave={(plan) => {
            onSavePlan(plan);
            setShowBuilder(false);
          }}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {/* Modal for viewing details of an existing BOQ Plan */}
      {activePlan && (
        <BOQDetailsModal
          plan={activePlan}
          onClose={() => setActivePlan(null)}
          onGeneratePO={() => {
            generatePOFromBOQ(activePlan);
            setActivePlan(null);
          }}
          onIssueStock={() => {
            onIssueStock(activePlan);
            setActivePlan(null);
          }}
        />
      )}
    </div>
  );
}

// ─── BOQ Builder Modal Component ─────────────────────────────────────────────
function BOQBuilderModal({
  materials, bomList, menuItems, onSave, onClose,
}: {
  materials: RawMaterial[];
  bomList: BOMRecipe[];
  menuItems: any[];
  onSave: (plan: BOQPlan) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventOrType, setEventOrType] = useState<'daily_prep' | 'banquet' | 'weekly_forecast' | 'custom'>('daily_prep');
  const [targetItems, setTargetItems] = useState<BOQItem[]>([]);

  const addTargetItem = () => {
    const firstItem = menuItems[0];
    if (!firstItem) return;
    setTargetItems(prev => [...prev, { menuItemId: firstItem.id, menuItemName: firstItem.name, targetQty: 20 }]);
  };

  const updateTargetItem = (index: number, itemId: string, targetQty: number) => {
    const menu = menuItems.find(m => m.id === itemId);
    if (!menu) return;
    setTargetItems(prev => {
      const next = [...prev];
      next[index] = { menuItemId: menu.id, menuItemName: menu.name, targetQty: Math.max(1, targetQty) };
      return next;
    });
  };

  const removeTargetItem = (index: number) => {
    setTargetItems(prev => prev.filter((_, i) => i !== index));
  };

  // Live Explosion Engine: calculates raw material requirements across target menu items
  const requirements = useMemo(() => {
    const reqMap = new Map<string, BOQMaterialRequirement>();

    targetItems.forEach(item => {
      const bom = bomList.find(b => b.menuItemId === item.menuItemId);
      if (!bom) return;

      bom.components.forEach(comp => {
        const mat = materials.find(m => m.id === comp.materialId);
        const uom = comp.uom || mat?.uom || 'kg';
        const unitCost = comp.unitCost || mat?.unitCost || 0;
        const currentStock = mat?.stock || 0;
        const reqQty = +(comp.qty * item.targetQty * (1 + (bom.wastagePct || 0) / 100)).toFixed(2);

        if (reqMap.has(comp.materialId)) {
          const existing = reqMap.get(comp.materialId)!;
          const nextReq = +(existing.requiredQty + reqQty).toFixed(2);
          const shortage = Math.max(0, +(nextReq - existing.currentStock).toFixed(2));
          reqMap.set(comp.materialId, {
            ...existing,
            requiredQty: nextReq,
            shortageQty: shortage,
            totalCost: +(nextReq * unitCost).toFixed(2),
          });
        } else {
          const shortage = Math.max(0, +(reqQty - currentStock).toFixed(2));
          reqMap.set(comp.materialId, {
            materialId: comp.materialId,
            materialName: comp.materialName,
            uom,
            category: mat?.category || 'General',
            requiredQty: reqQty,
            currentStock,
            shortageQty: shortage,
            unitCost,
            totalCost: +(reqQty * unitCost).toFixed(2),
          });
        }
      });
    });

    return Array.from(reqMap.values());
  }, [targetItems, bomList, materials]);

  const totalEstimatedCost = useMemo(() => requirements.reduce((s, r) => s + r.totalCost, 0), [requirements]);

  const handleSave = () => {
    if (!title.trim()) return;
    const plan: BOQPlan = {
      id: `boq-${Date.now()}`,
      title: title.trim(),
      date,
      eventOrType,
      items: targetItems,
      requirements,
      totalEstimatedCost,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    onSave(plan);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-ink-50">
          <div>
            <h2 className="text-base font-bold text-ink-900">New BOQ Production Plan</h2>
            <p className="text-2xs text-ink-400">Calculate ingredient requirements & stock shortages</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* General info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-2xs font-semibold text-ink-600 mb-1">Plan Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Saturday Banquet Prep" className="w-full px-3 py-1.5 text-sm border border-ink-200 rounded-lg focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-ink-600 mb-1">Target Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-ink-200 rounded-lg focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-ink-600 mb-1">Plan Type</label>
              <select value={eventOrType} onChange={e => setEventOrType(e.target.value as any)} className="w-full px-3 py-1.5 text-sm border border-ink-200 rounded-lg focus:ring-2 focus:ring-brand-400">
                <option value="daily_prep">Daily Kitchen Prep</option>
                <option value="banquet">Banquet Event</option>
                <option value="weekly_forecast">Weekly Forecast</option>
                <option value="custom">Custom Plan</option>
              </select>
            </div>
          </div>

          {/* Target menu items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-ink-800">Target Menu Items & Quantities</label>
              <Button variant="secondary" size="sm" onClick={addTargetItem}>
                <Plus className="h-3.5 w-3.5" /> Add Target Item
              </Button>
            </div>

            <div className="space-y-2">
              {targetItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-ink-200 bg-white">
                  <select
                    value={item.menuItemId}
                    onChange={e => updateTargetItem(idx, e.target.value, item.targetQty)}
                    className="flex-1 text-sm border border-ink-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-400"
                  >
                    {menuItems.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({inr(m.price)})</option>
                    ))}
                  </select>
                  <div className="w-28 flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      value={item.targetQty}
                      onChange={e => updateTargetItem(idx, item.menuItemId, parseInt(e.target.value) || 1)}
                      className="w-full text-sm border border-ink-200 rounded-lg px-2 py-1.5 text-right font-bold tnum focus:ring-2 focus:ring-brand-400"
                    />
                    <span className="text-2xs text-ink-500">servings</span>
                  </div>
                  <button onClick={() => removeTargetItem(idx)} className="p-1 text-ink-400 hover:text-danger-500 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Live Explosion Matrix */}
          {requirements.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-ink-800 mb-2">Exploded Ingredients & Stock Deficit Matrix</h3>
              <div className="border border-ink-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-ink-50 border-b border-ink-200 font-semibold text-ink-600">
                    <tr>
                      <th className="p-2.5">Material Name</th>
                      <th className="p-2.5 text-right">Required</th>
                      <th className="p-2.5 text-right">Current Stock</th>
                      <th className="p-2.5 text-right">Deficit</th>
                      <th className="p-2.5 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {requirements.map(req => (
                      <tr key={req.materialId} className={req.shortageQty > 0 ? 'bg-danger-50/40' : ''}>
                        <td className="p-2.5 font-medium text-ink-900">{req.materialName}</td>
                        <td className="p-2.5 text-right font-bold tnum">{req.requiredQty} {req.uom}</td>
                        <td className="p-2.5 text-right tnum">{req.currentStock} {req.uom}</td>
                        <td className="p-2.5 text-right font-bold tnum">
                          {req.shortageQty > 0 ? (
                            <span className="text-danger-600">{req.shortageQty} {req.uom}</span>
                          ) : (
                            <span className="text-success-600">OK</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-bold tnum">{inr(req.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ink-100 bg-ink-50">
          <div className="text-xs font-bold text-ink-900">
            Est. Material Cost: <span className="text-brand-600 tnum">{inr(totalEstimatedCost)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!title.trim() || targetItems.length === 0}>
              Save BOQ Plan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BOQ Details Modal ────────────────────────────────────────────────────────
function BOQDetailsModal({
  plan, onClose, onGeneratePO, onIssueStock,
}: {
  plan: BOQPlan;
  onClose: () => void;
  onGeneratePO: () => void;
  onIssueStock: () => void;
}) {
  const shortageCount = plan.requirements.filter(r => r.shortageQty > 0).length;

  return (
    <div className="fixed inset-0 z-[150] bg-ink-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-ink-50">
          <div>
            <h2 className="text-base font-bold text-ink-900">{plan.title}</h2>
            <p className="text-2xs text-ink-400">BOQ Production & Stock Deficit Explosion Matrix</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="border border-ink-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-ink-50 border-b border-ink-200 font-semibold text-ink-600">
                <tr>
                  <th className="p-2.5">Material</th>
                  <th className="p-2.5 text-right">Required</th>
                  <th className="p-2.5 text-right">Current Stock</th>
                  <th className="p-2.5 text-right">Shortage</th>
                  <th className="p-2.5 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {plan.requirements.map(req => (
                  <tr key={req.materialId} className={req.shortageQty > 0 ? 'bg-danger-50/50' : ''}>
                    <td className="p-2.5 font-semibold text-ink-900">{req.materialName}</td>
                    <td className="p-2.5 text-right font-bold tnum">{req.requiredQty} {req.uom}</td>
                    <td className="p-2.5 text-right tnum">{req.currentStock} {req.uom}</td>
                    <td className="p-2.5 text-right font-bold tnum">
                      {req.shortageQty > 0 ? (
                        <span className="text-danger-600">+{req.shortageQty} {req.uom}</span>
                      ) : (
                        <span className="text-success-600">0</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-bold tnum">{inr(req.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-ink-100 bg-ink-50">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <div className="flex gap-2">
            {shortageCount > 0 && plan.status !== 'po_generated' && (
              <Button variant="secondary" onClick={onGeneratePO}>
                <ShoppingCart className="h-4 w-4 text-brand-600" /> Generate PO for Shortage
              </Button>
            )}
            {plan.status !== 'issued_to_kitchen' && (
              <Button variant="primary" onClick={onIssueStock}>
                <Check className="h-4 w-4" /> Issue Stock to Kitchen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
