'use client';

// ===== Nabo Flow — Purchase & Vendor Management (Fully Functional) =====
import { useState, useMemo, useEffect } from 'react';
import {
  Truck, Send, FileCheck, AlertTriangle, Star, Phone,
  Plus, Search, MessageCircle, FileText, TrendingUp,
  X, Check, Loader2, Edit2, Trash2, ChevronDown,
  IndianRupee, Package, Calendar, ShoppingCart,
  ArrowDownCircle, BadgeCheck, Zap, Receipt, CreditCard,
  Filter, Eye, MoreVertical, AlertCircle, Inbox,
} from 'lucide-react';
import { vendors as initialVendors, purchaseOrders as initialPOs, rawMaterials } from '../data';
import { inr, generatePurchaseOrderId } from '../format';
import { Card, Badge, Button, StatCard, SectionHeader, Avatar } from '../ui';
import type { Vendor, PurchaseOrder } from '../types';
import {
  isSupabaseConfigured, dbFetchPurchaseOrders, dbSavePurchaseOrder,
  dbFetchVendors, dbSaveVendor, dbDeleteVendor,
} from '../supabase';
import { addMaterialStock } from '../inventorySync';

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'vendors' | 'orders' | 'ledger';

interface POLine {
  material: string;
  qty: number;
  unit: string;
  unitCost: number;
}

interface GRNLine {
  material: string;
  ordered: number;
  received: number;
  unit: string;
}

interface Payment {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  date: string;
  mode: 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'UPI' | 'Bank Transfer' | 'Cash';
  note: string;
}

interface LocalPO extends PurchaseOrder {
  lines: POLine[];
  notes?: string;
}

interface LocalVendor extends Vendor {
  contactPerson?: string;
  email?: string;
  address?: string;
  gst?: string;
  paymentTerms?: string;
}

// ─── Initial State ────────────────────────────────────────────────────────────
const VENDOR_CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Meat', 'Seafood', 'Spices', 'Oils', 'Beverages', 'Other'];
const PAYMENT_MODES = ['cash', 'bank_transfer', 'cheque', 'upi'] as const;

const initialLocalVendors: LocalVendor[] = initialVendors.map(v => ({
  ...v, email: '', address: '', gst: '', paymentTerms: 'Net 30',
}));

const initialLocalPOs: LocalPO[] = initialPOs.map(po => ({
  ...po,
  lines: [
    { material: 'Basmati Rice', qty: 50, unit: 'kg', unitCost: 85 },
    { material: 'Cooking Oil', qty: 20, unit: 'L', unitCost: 140 },
  ],
}));

const ledgerPayments: Payment[] = [
  { id: 'pay1', vendorId: 'v1', vendorName: 'FreshFarm Supplies', date: '2026-07-20', amount: 15000, mode: 'UPI', note: 'Partial payment' },
  { id: 'pay2', vendorId: 'v2', vendorName: 'Royal Meat & Poultry', date: '2026-07-18', amount: 25000, mode: 'Bank Transfer', note: 'Full settlement' },
  { id: 'pay3', vendorId: 'v3', vendorName: 'Metro Dairy Products', date: '2026-07-15', amount: 8000, mode: 'Cash', note: 'Advance' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 bg-ink-900 text-white px-4 py-3 rounded-xl shadow-2xl animate-slide-up max-w-xs">
      <BadgeCheck className="h-4 w-4 text-brand-400 shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="text-ink-400 hover:text-white"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

const loadLocalVendors = (): LocalVendor[] => {
  try {
    const raw = localStorage.getItem('nabo_vendors');
    if (raw) {
      const parsed = JSON.parse(raw) as LocalVendor[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return initialLocalVendors;
};

const saveLocalVendors = (items: LocalVendor[]) => {
  try { localStorage.setItem('nabo_vendors', JSON.stringify(items)); } catch { /* ignore */ }
};

const loadLocalPOs = (): LocalPO[] => {
  try {
    const raw = localStorage.getItem('nabo_purchase_orders');
    if (raw) {
      const parsed = JSON.parse(raw) as LocalPO[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return initialLocalPOs;
};

const saveLocalPOs = (items: LocalPO[]) => {
  try { localStorage.setItem('nabo_purchase_orders', JSON.stringify(items)); } catch { /* ignore */ }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function Purchase() {
  const [tab, setTab] = useState<Tab>('vendors');
  const [vendors, setVendors] = useState<LocalVendor[]>(loadLocalVendors);
  const [orders, setOrders] = useState<LocalPO[]>(loadLocalPOs);
  const [payments, setPayments] = useState<Payment[]>(ledgerPayments);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editVendor, setEditVendor] = useState<LocalVendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<LocalVendor | null>(null);
  const [newPOVendor, setNewPOVendor] = useState<LocalVendor | null>(null);
  const [grnPO, setGrnPO] = useState<LocalPO | null>(null);
  const [viewPO, setViewPO] = useState<LocalPO | null>(null);
  const [paymentVendor, setPaymentVendor] = useState<LocalVendor | null>(null);

  // Sync purchase orders from localStorage (e.g. BOQ generated orders)
  useEffect(() => {
    const syncPOs = () => {
      try {
        const raw = localStorage.getItem('nabo_purchase_orders');
        if (raw) {
          const parsed = JSON.parse(raw) as LocalPO[];
          if (Array.isArray(parsed) && parsed.length > 0) setOrders(parsed);
        }
      } catch { /* ignore */ }
    };
    syncPOs();
    window.addEventListener('storage', syncPOs);
    return () => window.removeEventListener('storage', syncPOs);
  }, []);

  // Fetch live Vendors & POs from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      dbFetchVendors().then(res => {
        if (res && Array.isArray(res) && res.length > 0) {
          const mapped: LocalVendor[] = res.map((v: any) => ({
            id: v.id,
            name: v.name,
            contact: v.contact_person || v.contactPerson || v.contact || v.name || '',
            category: v.category || 'General',
            contactPerson: v.contact_person || v.contactPerson || '',
            phone: v.phone || '',
            email: v.email || '',
            gstin: v.gstin || '',
            paymentTerms: v.payment_terms || v.paymentTerms || 'Net 30',
            outstanding: Number(v.outstanding || 0),
            rating: Number(v.rating || 4.5),
            items: Number(v.items_supplied || v.items || 0),
          }));
          setVendors(mapped);
          saveLocalVendors(mapped);
        }
      });

      dbFetchPurchaseOrders().then(res => {
        if (res && Array.isArray(res) && res.length > 0) {
          const mapped: LocalPO[] = res.map((p: any) => ({
            id: p.id,
            vendor: p.vendor,
            date: p.date,
            items: p.items_count || p.items || 1,
            amount: Number(p.amount),
            status: p.status,
            channel: p.channel || 'whatsapp',
            lines: [],
          }));
          setOrders(mapped);
          saveLocalPOs(mapped);
        }
      });
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const totalOutstanding = vendors.reduce((s, v) => s + v.outstanding, 0);
  const pendingPOs = orders.filter(p => p.status === 'sent' || p.status === 'partial').length;
  const thisMonthTotal = orders
    .filter(o => o.date.startsWith('2026-07') && o.status !== 'draft')
    .reduce((s, o) => s + o.amount, 0);

  const handleAddVendor = (v: LocalVendor) => {
    const newVendor: LocalVendor = { ...v, id: `v${Date.now()}`, outstanding: 0, items: 0, rating: 4.5 };
    setVendors(prev => {
      const next = [...prev, newVendor];
      saveLocalVendors(next);
      return next;
    });
    dbSaveVendor(newVendor);
    setShowAddVendor(false);
    showToast(`Vendor "${v.name}" added successfully`);
  };

  const handleEditVendor = (v: LocalVendor) => {
    setVendors(prev => {
      const next = prev.map(x => x.id === v.id ? v : x);
      saveLocalVendors(next);
      return next;
    });
    dbSaveVendor(v);
    setEditVendor(null);
    showToast(`Vendor "${v.name}" updated`);
  };

  const handleDeleteVendor = (v: LocalVendor) => {
    setVendors(prev => {
      const next = prev.filter(x => x.id !== v.id);
      saveLocalVendors(next);
      return next;
    });
    dbDeleteVendor(v.id);
    setDeleteVendor(null);
    showToast(`Vendor "${v.name}" removed`);
  };

  const handleCreatePO = (po: LocalPO) => {
    setOrders(prev => {
      const next = [po, ...prev];
      saveLocalPOs(next);
      return next;
    });
    dbSavePurchaseOrder(po);
    // Update vendor outstanding if PO is sent
    if (po.status === 'sent') {
      setVendors(prev => {
        const next = prev.map(v => v.name === po.vendor ? { ...v, outstanding: v.outstanding + po.amount } : v);
        saveLocalVendors(next);
        return next;
      });
    }
    setNewPOVendor(null);
    showToast(po.status === 'sent' ? `PO ${po.id} sent via ${po.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}` : `PO ${po.id} saved as draft`);
  };

  const handleGRN = (po: LocalPO, lines: GRNLine[]) => {
    const allReceived = lines.every(l => l.received >= l.ordered);
    const newStatus: PurchaseOrder['status'] = allReceived ? 'received' : 'partial';

    // Replenish inventory stock for received materials
    const receivedMaterials = lines.filter(l => l.received > 0).map(l => ({ name: l.material, qty: l.received }));
    if (receivedMaterials.length > 0) {
      addMaterialStock(receivedMaterials);
    }

    const updatedPO: LocalPO = {
      ...po,
      status: newStatus,
      lines: po.lines.map((l, i) => ({ ...l, qty: lines[i]?.received ?? l.qty })),
    };

    setOrders(prev => {
      const next = prev.map(o => o.id === po.id ? updatedPO : o);
      saveLocalPOs(next);
      return next;
    });
    dbSavePurchaseOrder(updatedPO);

    // Clear outstanding if fully received
    if (allReceived) {
      setVendors(prev => {
        const next = prev.map(v => v.name === po.vendor ? { ...v, outstanding: Math.max(0, v.outstanding - po.amount) } : v);
        saveLocalVendors(next);
        return next;
      });
    }
    setGrnPO(null);
    showToast(`GRN recorded — PO ${po.id} marked as ${newStatus}`);
  };

  const handleAutoPOs = () => {
    const lowStock = rawMaterials.filter(r => r.stock <= r.reorder);
    if (lowStock.length === 0) { showToast('No items below reorder level'); return; }
    const newPOs: LocalPO[] = lowStock.map((r, i) => ({
      id: `PO-AUTO-${Date.now() + i}`,
      vendor: initialVendors[i % initialVendors.length].name,
      date: new Date().toISOString().split('T')[0],
      items: 1,
      amount: r.reorder * r.unitCost,
      status: 'draft',
      channel: 'whatsapp',
      lines: [{ material: r.name, qty: r.reorder - r.stock + 5, unit: r.uom, unitCost: r.unitCost }],
      notes: 'Auto-generated from low stock alert',
    }));
    setOrders(prev => [...newPOs, ...prev]);
    showToast(`${newPOs.length} auto-POs generated for low-stock materials`);
  };

  const handleRecordPayment = (p: Payment) => {
    setPayments(prev => [...prev, p]);
    setVendors(prev => prev.map(v => v.id === p.vendorId ? { ...v, outstanding: Math.max(0, v.outstanding - p.amount) } : v));
    setPaymentVendor(null);
    showToast(`Payment of ${inr(p.amount)} recorded for ${p.vendorName}`);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Vendors" value={String(vendors.length)} sub={`${VENDOR_CATEGORIES.length - 5} categories`} icon={<Truck className="h-5 w-5" />} tone="info" />
        <StatCard label="Outstanding" value={inr(totalOutstanding)} sub="Payable to vendors" icon={<AlertTriangle className="h-5 w-5" />} tone="danger" />
        <StatCard label="Pending POs" value={String(pendingPOs)} sub="Awaiting delivery" icon={<FileText className="h-5 w-5" />} tone="warn" />
        <StatCard label="This Month" value={inr(thisMonthTotal)} sub="Total purchases" icon={<TrendingUp className="h-5 w-5" />} tone="brand" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-ink-200/60 p-1 w-fit">
        {([
          { key: 'vendors', label: 'Vendors' },
          { key: 'orders', label: 'Purchase Orders' },
          { key: 'ledger', label: 'Ledger & Pricing' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'vendors' && (
        <VendorsTab
          vendors={vendors}
          onAdd={() => setShowAddVendor(true)}
          onEdit={setEditVendor}
          onDelete={setDeleteVendor}
          onNewPO={setNewPOVendor}
          onWhatsApp={(v) => showToast(`Opening WhatsApp for ${v.name} (${v.phone})…`)}
        />
      )}
      {tab === 'orders' && (
        <OrdersTab
          orders={orders}
          vendors={vendors}
          onCreatePO={() => setNewPOVendor(vendors[0])}
          onGRN={setGrnPO}
          onView={setViewPO}
          onAutoPOs={handleAutoPOs}
          onSendPO={(po) => {
            setOrders(prev => prev.map(o => o.id === po.id ? { ...o, status: 'sent' } : o));
            showToast(`PO ${po.id} sent via WhatsApp to ${po.vendor}`);
          }}
        />
      )}
      {tab === 'ledger' && (
        <LedgerTab
          vendors={vendors}
          payments={payments}
          onRecordPayment={setPaymentVendor}
        />
      )}

      {/* Modals */}
      {showAddVendor && <VendorModal onClose={() => setShowAddVendor(false)} onSave={handleAddVendor} />}
      {editVendor && <VendorModal vendor={editVendor} onClose={() => setEditVendor(null)} onSave={handleEditVendor} />}
      {deleteVendor && (
        <ConfirmModal
          title="Delete Vendor"
          message={`Remove "${deleteVendor.name}" from your vendor list? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDeleteVendor(deleteVendor)}
          onClose={() => setDeleteVendor(null)}
        />
      )}
      {newPOVendor && (
        <CreatePOModal
          vendor={newPOVendor}
          vendors={vendors}
          onClose={() => setNewPOVendor(null)}
          onSave={handleCreatePO}
        />
      )}
      {grnPO && (
        <GRNModal
          po={grnPO}
          onClose={() => setGrnPO(null)}
          onSave={(lines) => handleGRN(grnPO, lines)}
        />
      )}
      {viewPO && (
        <ViewPOModal po={viewPO} onClose={() => setViewPO(null)} />
      )}
      {paymentVendor && (
        <RecordPaymentModal
          vendor={paymentVendor}
          onClose={() => setPaymentVendor(null)}
          onSave={handleRecordPayment}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Vendors Tab ──────────────────────────────────────────────────────────────
function VendorsTab({
  vendors, onAdd, onEdit, onDelete, onNewPO, onWhatsApp,
}: {
  vendors: LocalVendor[];
  onAdd: () => void;
  onEdit: (v: LocalVendor) => void;
  onDelete: (v: LocalVendor) => void;
  onNewPO: (v: LocalVendor) => void;
  onWhatsApp: (v: LocalVendor) => void;
}) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(vendors.map(v => v.category)))];
  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.name.toLowerCase().includes(q) || v.contact.toLowerCase().includes(q) || v.category.toLowerCase().includes(q);
    const matchCat = catFilter === 'All' || v.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${catFilter === cat ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
              {cat}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={onAdd}><Plus className="h-3.5 w-3.5" /> Add Vendor</Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-ink-400">
            <Inbox className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No vendors found</p>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(v => (
            <Card key={v.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar name={v.name} size="md" />
                  <div>
                    <h3 className="font-bold text-ink-900">{v.name}</h3>
                    <p className="text-xs text-ink-400">{v.contact} · {v.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-accent-400 fill-accent-400" />
                    <span className="text-sm font-semibold text-ink-700">{v.rating}</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === v.id ? null : v.id)}
                      className="p-1 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-700 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === v.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 z-20 mt-1 w-36 bg-white rounded-lg shadow-xl border border-ink-200 py-1">
                          <button onClick={() => { onEdit(v); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-700 hover:bg-ink-50">
                            <Edit2 className="h-3.5 w-3.5" /> Edit Details
                          </button>
                          <button onClick={() => { onDelete(v); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger-600 hover:bg-danger-50">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-ink-500 mb-3">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{v.phone}</span>
                <span className="flex items-center gap-1"><Package className="h-3 w-3" />{v.items} items supplied</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xs uppercase text-ink-400 font-semibold">Outstanding</div>
                  <div className={`text-sm font-bold tnum ${v.outstanding > 0 ? 'text-danger-600' : 'text-brand-600'}`}>{inr(v.outstanding)}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onWhatsApp(v)}>
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => onNewPO(v)}>
                    <FileText className="h-3.5 w-3.5" /> New PO
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab({
  orders, vendors, onCreatePO, onGRN, onView, onAutoPOs, onSendPO,
}: {
  orders: LocalPO[];
  vendors: LocalVendor[];
  onCreatePO: () => void;
  onGRN: (po: LocalPO) => void;
  onView: (po: LocalPO) => void;
  onAutoPOs: () => void;
  onSendPO: (po: LocalPO) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  const statusTones: Record<string, 'neutral' | 'warn' | 'brand' | 'info'> = {
    draft: 'neutral', sent: 'warn', received: 'brand', partial: 'info',
  };

  const lowStockCount = rawMaterials.filter(r => r.stock <= r.reorder).length;

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchVendor = vendorFilter === 'all' || o.vendor === vendorFilter;
    return matchStatus && matchVendor;
  });

  const vendorNames = Array.from(new Set(orders.map(o => o.vendor)));

  return (
    <div className="space-y-4">
      <SectionHeader title="Purchase Orders" subtitle="Create, dispatch via WhatsApp, and receive goods" action={
        <Button variant="primary" size="sm" onClick={onCreatePO}><Plus className="h-3.5 w-3.5" /> Create PO</Button>
      } />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-ink-400" />
        <div className="flex gap-1">
          {['all', 'draft', 'sent', 'partial', 'received'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-ink-200 rounded-lg text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="all">All Vendors</option>
          {vendorNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <Card pad={false}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
              <th className="text-left px-4 py-2.5">PO #</th>
              <th className="text-left px-3 py-2.5">Vendor</th>
              <th className="text-left px-3 py-2.5">Date</th>
              <th className="text-right px-3 py-2.5">Items</th>
              <th className="text-right px-3 py-2.5">Amount</th>
              <th className="text-center px-3 py-2.5">Channel</th>
              <th className="text-center px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-400 text-sm">No purchase orders found</td></tr>
            ) : filtered.map(po => (
              <tr key={po.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                <td className="px-4 py-3 font-semibold text-ink-800">{po.id}</td>
                <td className="px-3 py-3 text-ink-700">{po.vendor}</td>
                <td className="px-3 py-3 text-ink-400">{po.date}</td>
                <td className="px-3 py-3 text-right tnum">{po.items}</td>
                <td className="px-3 py-3 text-right tnum font-semibold">{inr(po.amount)}</td>
                <td className="px-3 py-3 text-center">
                  {po.channel === 'whatsapp'
                    ? <MessageCircle className="h-4 w-4 text-brand-500 mx-auto" />
                    : po.channel === 'email'
                    ? <Send className="h-4 w-4 text-info-500 mx-auto" />
                    : <FileText className="h-4 w-4 text-ink-400 mx-auto" />}
                </td>
                <td className="px-3 py-3 text-center">
                  <Badge tone={statusTones[po.status]} size="xs" dot>{po.status}</Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" className="text-2xs" onClick={() => onView(po)}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    {po.status === 'draft' && (
                      <Button size="sm" variant="primary" className="text-2xs" onClick={() => onSendPO(po)}>
                        <Send className="h-3 w-3" /> Send
                      </Button>
                    )}
                    {(po.status === 'sent' || po.status === 'partial') && (
                      <Button size="sm" variant="accent" className="text-2xs" onClick={() => onGRN(po)}>
                        <FileCheck className="h-3 w-3" /> GRN
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Low-stock Auto-PO suggestion */}
      {lowStockCount > 0 && (
        <Card className="border-warn-200 bg-warn-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warn-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-warn-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-ink-900 text-sm">Auto-PO Suggestion</h3>
              <p className="text-xs text-ink-500">{lowStockCount} material{lowStockCount > 1 ? 's' : ''} at or below reorder level. Generate POs automatically?</p>
            </div>
            <Button variant="accent" size="sm" onClick={onAutoPOs}>
              <Plus className="h-3.5 w-3.5" /> Generate POs
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Ledger Tab ───────────────────────────────────────────────────────────────
function LedgerTab({
  vendors, payments, onRecordPayment,
}: {
  vendors: LocalVendor[];
  payments: Payment[];
  onRecordPayment: (v: LocalVendor) => void;
}) {
  const [activeVendor, setActiveVendor] = useState<string | null>(null);

  const priceComparison = [
    { material: 'Basmati Rice', vendors: [{ name: 'Annapurna Rice Mills', price: 85 }, { name: 'Sai Fresh Farm', price: 92 }, { name: 'Spice Garden', price: 88 }] },
    { material: 'Chicken (boneless)', vendors: [{ name: 'Fresh Chicken Co.', price: 240 }, { name: 'Sai Fresh Farm', price: 260 }] },
    { material: 'Cooking Oil', vendors: [{ name: 'Sai Fresh Farm', price: 140 }, { name: 'Spice Garden', price: 135 }] },
    { material: 'Paneer', vendors: [{ name: 'Amul Distributor', price: 280 }, { name: 'Sai Fresh Farm', price: 300 }] },
  ];

  const getVendorPayments = (vendorId: string) => payments.filter(p => p.vendorId === vendorId);

  const paymentModeBadge: Record<string, 'brand' | 'info' | 'neutral' | 'accent'> = {
    cash: 'brand', bank_transfer: 'info', cheque: 'neutral', upi: 'accent',
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Vendor Ledger & Price Comparison" subtitle="Track payables and compare vendor pricing" />

      {/* Outstanding per vendor */}
      <Card pad={false}>
        <div className="px-4 py-3 border-b border-ink-100">
          <h3 className="font-bold text-ink-800 text-sm">Vendor Payables</h3>
          <p className="text-2xs text-ink-400 mt-0.5">Click a vendor to see payment history</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
              <th className="text-left px-4 py-2.5">Vendor</th>
              <th className="text-left px-3 py-2.5">Category</th>
              <th className="text-right px-3 py-2.5">Outstanding</th>
              <th className="text-right px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map(v => (
              <>
                <tr
                  key={v.id}
                  className="border-t border-ink-100 hover:bg-ink-50/50 cursor-pointer"
                  onClick={() => setActiveVendor(activeVendor === v.id ? null : v.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={v.name} size="sm" />
                      <div>
                        <div className="font-semibold text-ink-800">{v.name}</div>
                        <div className="text-2xs text-ink-400">{v.contact}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><Badge tone="neutral" size="xs">{v.category}</Badge></td>
                  <td className="px-3 py-3 text-right">
                    <span className={`font-bold tnum text-sm ${v.outstanding > 0 ? 'text-danger-600' : 'text-brand-600'}`}>
                      {inr(v.outstanding)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {v.outstanding > 0 ? (
                      <Button
                        size="sm" variant="primary"
                        onClick={e => { e.stopPropagation(); onRecordPayment(v); }}
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Pay
                      </Button>
                    ) : (
                      <Badge tone="brand" size="xs"><Check className="h-3 w-3" /> Settled</Badge>
                    )}
                  </td>
                </tr>
                {activeVendor === v.id && (
                  <tr key={`${v.id}-history`} className="border-t border-ink-100 bg-ink-50/30">
                    <td colSpan={4} className="px-4 py-3">
                      <div className="text-2xs font-semibold uppercase text-ink-400 mb-2">Payment History</div>
                      {getVendorPayments(v.id).length === 0 ? (
                        <p className="text-xs text-ink-400 italic">No payments recorded yet</p>
                      ) : (
                        <div className="space-y-1.5">
                          {getVendorPayments(v.id).map(p => (
                            <div key={p.id} className="flex items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-ink-100">
                              <Calendar className="h-3.5 w-3.5 text-ink-400" />
                              <span className="text-ink-500">{p.date}</span>
                              <Badge tone={paymentModeBadge[p.mode]} size="xs">{p.mode.replace('_', ' ')}</Badge>
                              <span className="font-bold text-ink-800 tnum ml-auto">{inr(p.amount)}</span>
                              {p.note && <span className="text-ink-400 italic">{p.note}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Price comparison */}
      <Card>
        <h3 className="font-bold text-ink-900 text-sm mb-4">Price Comparison by Material</h3>
        <div className="space-y-4">
          {priceComparison.map(item => {
            const minPrice = Math.min(...item.vendors.map(v => v.price));
            return (
              <div key={item.material}>
                <div className="text-xs font-semibold text-ink-500 mb-2">{item.material}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {item.vendors.map(v => (
                    <div key={v.name} className={`p-2.5 rounded-lg border ${v.price === minPrice ? 'border-brand-300 bg-brand-50' : 'border-ink-200 bg-ink-50'}`}>
                      <div className="text-xs text-ink-500 truncate">{v.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-bold tnum text-ink-800">{inr(v.price)}<span className="text-2xs font-normal text-ink-400">/kg</span></span>
                        {v.price === minPrice && <Badge tone="brand" size="xs">Best</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Vendor Modal ─────────────────────────────────────────────────────────────
function VendorModal({
  vendor, onClose, onSave,
}: {
  vendor?: LocalVendor;
  onClose: () => void;
  onSave: (v: LocalVendor) => void;
}) {
  const isEdit = !!vendor;
  const [form, setForm] = useState<Partial<LocalVendor>>(vendor ?? {
    name: '', contact: '', phone: '', category: 'Vegetables', rating: 4.5,
    outstanding: 0, items: 0, email: '', address: '', gst: '', paymentTerms: 'Net 30',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof LocalVendor, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name?.trim()) { setError('Vendor name is required'); return; }
    if (!form.contact?.trim()) { setError('Contact person is required'); return; }
    if (!form.phone?.trim()) { setError('Phone number is required'); return; }
    setBusy(true);
    await new Promise(r => setTimeout(r, 400));
    setBusy(false);
    onSave(form as LocalVendor);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
            <Truck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-ink-900">{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</h3>
            <p className="text-2xs text-ink-400">Vendor details and contact information</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-2xs font-semibold uppercase text-ink-400">Vendor Name *</label>
              <input type="text" value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Sai Fresh Farm"
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">Contact Person *</label>
              <input type="text" value={form.contact ?? ''} onChange={e => set('contact', e.target.value)} placeholder="Ramesh"
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">Phone *</label>
              <input type="text" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210"
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">Category</label>
              <select value={form.category ?? 'Vegetables'} onChange={e => set('category', e.target.value)}
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                {VENDOR_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">Payment Terms</label>
              <select value={form.paymentTerms ?? 'Net 30'} onChange={e => set('paymentTerms', e.target.value)}
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                {['Immediate', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">Email (optional)</label>
              <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="vendor@email.com"
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">GST Number (optional)</label>
              <input type="text" value={form.gst ?? ''} onChange={e => set('gst', e.target.value)} placeholder="27AABCU9603R1ZX"
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div className="col-span-2">
              <label className="text-2xs font-semibold uppercase text-ink-400">Address (optional)</label>
              <textarea value={form.address ?? ''} onChange={e => set('address', e.target.value)} rows={2} placeholder="Full address"
                className="w-full mt-1 px-3 py-2 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" block onClick={onClose}>Cancel</Button>
            <Button variant="primary" block onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <><Check className="h-4 w-4" /> Save Changes</> : <><Plus className="h-4 w-4" /> Add Vendor</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create PO Modal ──────────────────────────────────────────────────────────
function CreatePOModal({
  vendor, vendors, onClose, onSave,
}: {
  vendor: LocalVendor;
  vendors: LocalVendor[];
  onClose: () => void;
  onSave: (po: LocalPO) => void;
}) {
  const [selectedVendor, setSelectedVendor] = useState(vendor);
  const [lines, setLines] = useState<POLine[]>([{ material: '', qty: 1, unit: 'kg', unitCost: 0 }]);
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'manual'>('whatsapp');
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'box', 'bag', 'dozen'];

  // Load live raw materials from sessionStorage if available
  const MATERIAL_SUGGESTIONS = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('nabo_raw_materials');
      if (raw) {
        const parsed = JSON.parse(raw) as { name: string }[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return Array.from(new Set([...parsed.map(r => r.name), ...rawMaterials.map(r => r.name)]));
        }
      }
    } catch { /* ignore */ }
    return rawMaterials.map(r => r.name);
  }, []);

  const total = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

  const addLine = () => setLines(prev => [...prev, { material: '', qty: 1, unit: 'kg', unitCost: 0 }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, key: keyof POLine, val: string | number) => {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [key]: val };
      if (key === 'material' && typeof val === 'string') {
        try {
          const raw = sessionStorage.getItem('nabo_raw_materials');
          const list = raw ? JSON.parse(raw) : rawMaterials;
          const matched = list.find((m: any) => m.name && m.name.toLowerCase() === val.toLowerCase());
          if (matched) {
            if (matched.uom) updated.unit = matched.uom;
            if (matched.unitCost) updated.unitCost = matched.unitCost;
          }
        } catch { /* ignore */ }
      }
      return updated;
    }));
  };

  const submit = async () => {
    if (lines.some(l => !l.material.trim())) { setError('All line items must have a material name'); return; }
    if (lines.some(l => l.qty <= 0)) { setError('Quantity must be greater than 0'); return; }
    if (lines.some(l => l.unitCost <= 0)) { setError('Unit cost must be greater than 0'); return; }
    setBusy(true);
    await new Promise(r => setTimeout(r, 500));
    const po: LocalPO = {
      id: generatePurchaseOrderId(),
      vendor: selectedVendor.name,
      date: new Date().toISOString().split('T')[0],
      items: lines.length,
      amount: Math.round(total),
      status: saveAsDraft ? 'draft' : 'sent',
      channel,
      lines,
      notes,
    };
    setBusy(false);
    onSave(po);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-ink-900">Create Purchase Order</h3>
            <p className="text-2xs text-ink-400">Add items and send to vendor</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          {/* Vendor select */}
          <div>
            <label className="text-2xs font-semibold uppercase text-ink-400">Vendor</label>
            <select
              value={selectedVendor.id}
              onChange={e => setSelectedVendor(vendors.find(v => v.id === e.target.value) ?? vendors[0])}
              className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name} — {v.category}</option>)}
            </select>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-2xs font-semibold uppercase text-ink-400">Line Items</label>
              <Button size="sm" variant="ghost" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add Item</Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-ink-50 rounded-lg p-2">
                  <div className="col-span-4">
                    <input
                      type="text"
                      list="materials-list"
                      value={line.material}
                      onChange={e => updateLine(i, 'material', e.target.value)}
                      placeholder="Material name"
                      className="w-full h-9 px-3 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                    <datalist id="materials-list">
                      {MATERIAL_SUGGESTIONS.map(m => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={line.qty}
                      onChange={e => updateLine(i, 'qty', parseFloat(e.target.value) || 0)}
                      placeholder="Qty"
                      className="w-full h-9 px-3 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <select value={line.unit} onChange={e => updateLine(i, 'unit', e.target.value)}
                      className="w-full h-9 px-2 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 text-xs">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={line.unitCost}
                        onChange={e => updateLine(i, 'unitCost', parseFloat(e.target.value) || 0)}
                        placeholder="Unit cost"
                        className="w-full h-9 pl-6 pr-2 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="text-danger-500 hover:text-danger-700 p-1">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-2xs font-semibold uppercase text-ink-400">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Delivery instructions, special requirements..."
              className="w-full mt-1 px-3 py-2 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
          </div>

          {/* Channel + Summary */}
          <div className="flex items-center gap-4 bg-ink-50 rounded-xl p-3">
            <div className="flex-1">
              <label className="text-2xs font-semibold uppercase text-ink-400 block mb-1">Send Via</label>
              <div className="flex gap-2">
                {(['whatsapp', 'email', 'manual'] as const).map(ch => (
                  <button key={ch} onClick={() => setChannel(ch)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${channel === ch ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600'}`}>
                    {ch === 'whatsapp' ? <MessageCircle className="h-3.5 w-3.5" /> : ch === 'email' ? <Send className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xs text-ink-400">Total Amount</div>
              <div className="text-xl font-bold text-ink-900 tnum">{inr(Math.round(total))}</div>
              <div className="text-2xs text-ink-400">{lines.length} item{lines.length > 1 ? 's' : ''}</div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" block onClick={() => { setSaveAsDraft(true); setTimeout(submit, 0); }} disabled={busy}>
              Save as Draft
            </Button>
            <Button variant="primary" block onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> {channel === 'whatsapp' ? 'Send via WhatsApp' : channel === 'email' ? 'Send via Email' : 'Create PO'}</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GRN Modal ────────────────────────────────────────────────────────────────
function GRNModal({
  po, onClose, onSave,
}: {
  po: LocalPO;
  onClose: () => void;
  onSave: (lines: GRNLine[]) => void;
}) {
  const [lines, setLines] = useState<GRNLine[]>(
    po.lines.map(l => ({ material: l.material, ordered: l.qty, received: l.qty, unit: l.unit }))
  );
  const [busy, setBusy] = useState(false);

  const allReceived = lines.every(l => l.received >= l.ordered);

  const submit = async () => {
    setBusy(true);
    await new Promise(r => setTimeout(r, 500));
    setBusy(false);
    onSave(lines);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center">
            <ArrowDownCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-ink-900">Goods Receipt Note (GRN)</h3>
            <p className="text-2xs text-ink-400">PO {po.id} · {po.vendor}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-2xs font-semibold uppercase text-ink-400 px-1">
            <span>Material</span>
            <span className="text-center">Ordered</span>
            <span className="text-center">Received</span>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 items-center bg-ink-50 rounded-lg p-3">
              <div>
                <div className="text-sm font-semibold text-ink-800">{line.material}</div>
                <div className="text-2xs text-ink-400">{line.unit}</div>
              </div>
              <div className="text-center text-sm font-bold tnum text-ink-600">{line.ordered}</div>
              <div>
                <input
                  type="number"
                  min={0}
                  max={line.ordered}
                  step={0.1}
                  value={line.received}
                  onChange={e => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, received: parseFloat(e.target.value) || 0 } : l))}
                  className={`w-full h-9 px-3 text-sm text-center font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 ${line.received < line.ordered ? 'border-warn-400 bg-warn-50 text-warn-700' : 'border-brand-300 bg-brand-50 text-brand-700'}`}
                />
              </div>
            </div>
          ))}

          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${allReceived ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-warn-50 text-warn-700 border border-warn-200'}`}>
            {allReceived ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {allReceived ? 'All items fully received — PO will be marked as Received' : 'Partial delivery — PO will be marked as Partial'}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" block onClick={onClose}>Cancel</Button>
            <Button variant="accent" block onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileCheck className="h-4 w-4" /> Confirm Receipt</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View PO Modal ────────────────────────────────────────────────────────────
function ViewPOModal({ po, onClose }: { po: LocalPO; onClose: () => void }) {
  const statusTones: Record<string, 'neutral' | 'warn' | 'brand' | 'info'> = {
    draft: 'neutral', sent: 'warn', received: 'brand', partial: 'info',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-ink-900">PO Details — {po.id}</h3>
            <p className="text-2xs text-ink-400">{po.vendor} · {po.date}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={statusTones[po.status]} size="xs" dot>{po.status}</Badge>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {po.lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between bg-ink-50 rounded-lg px-3 py-2.5">
              <div>
                <div className="text-sm font-semibold text-ink-800">{l.material}</div>
                <div className="text-2xs text-ink-400">{l.qty} {l.unit} × {inr(l.unitCost)}</div>
              </div>
              <span className="font-bold tnum text-ink-800 text-sm">{inr(l.qty * l.unitCost)}</span>
            </div>
          ))}
        </div>

        {po.notes && (
          <div className="bg-ink-50 rounded-lg px-3 py-2.5 mb-4">
            <div className="text-2xs font-semibold uppercase text-ink-400 mb-1">Notes</div>
            <p className="text-sm text-ink-600">{po.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-ink-100 pt-4">
          <span className="text-sm font-semibold text-ink-700">Total Amount</span>
          <span className="text-xl font-bold tnum text-ink-900">{inr(po.amount)}</span>
        </div>

        <Button variant="secondary" block onClick={onClose} className="mt-4">Close</Button>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────
function RecordPaymentModal({
  vendor, onClose, onSave,
}: {
  vendor: LocalVendor;
  onClose: () => void;
  onSave: (p: Payment) => void;
}) {
  const [amount, setAmount] = useState(vendor.outstanding);
  const [mode, setMode] = useState<Payment['mode']>('upi');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!amount || amount <= 0) { setError('Enter a valid amount'); return; }
    if (amount > vendor.outstanding) { setError(`Amount cannot exceed outstanding ${inr(vendor.outstanding)}`); return; }
    setBusy(true);
    await new Promise(r => setTimeout(r, 500));
    const p: Payment = {
      id: `pay-${Date.now()}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      amount,
      date: new Date().toISOString().split('T')[0],
      mode,
      note,
    };
    setBusy(false);
    onSave(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-ink-900">Record Payment</h3>
            <p className="text-2xs text-ink-400">{vendor.name} · Outstanding: {inr(vendor.outstanding)}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-2xs font-semibold uppercase text-ink-400">Amount (₹)</label>
            <div className="relative mt-1">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input type="number" min={1} value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full h-11 pl-9 pr-3 text-lg font-bold bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum" />
            </div>
            <button onClick={() => setAmount(vendor.outstanding)} className="mt-1 text-2xs text-brand-600 hover:underline">
              Pay full outstanding ({inr(vendor.outstanding)})
            </button>
          </div>
          <div>
            <label className="text-2xs font-semibold uppercase text-ink-400">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {PAYMENT_MODES.map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium capitalize border transition-colors ${mode === m ? 'bg-brand-600 text-white border-brand-600' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-2xs font-semibold uppercase text-ink-400">Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Reference number, remarks..."
              className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" block onClick={onClose}>Cancel</Button>
            <Button variant="primary" block onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Record Payment</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    await new Promise(r => setTimeout(r, 300));
    setBusy(false);
    onConfirm();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm p-6 animate-slide-up">
        <h3 className="text-base font-bold text-ink-900 mb-2">{title}</h3>
        <p className="text-sm text-ink-500 mb-5">{message}</p>
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} block onClick={confirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
