'use client';

// ===== Nabo Flow — POS Billing (Full Functional + localStorage) =====
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Plus, Minus, Trash2, Star, Clock, Wifi, WifiOff,
  ShoppingBag, UtensilsCrossed,
  CreditCard, Banknote, Wallet, Smartphone as Upi, SplitSquareHorizontal,
  Check, MapPin, Users, Receipt,
  X, Tag, Percent, ArrowRight, Printer, FileCheck,
  ArrowLeft, Settings2, Grid3x3, Circle, RectangleHorizontal,
  Trash, Save, Edit3, RotateCcw,
} from 'lucide-react';
import type { OrderType, CartLine, MenuItem, TableInfo, TableOrder, PaymentMode, TableStatus } from '../types';
import { categories, tables as initialTables, tableOrders as initialTableOrders } from '../data';
import { inr, uid } from '../format';
import { Badge } from '../ui';
import { useMenu } from '../MenuContext';

// localStorage helpers
const LS_TABLES    = 'nabo_pos_tables';
const LS_ORDERS    = 'nabo_pos_table_orders';
const LS_HISTORY   = 'nabo_pos_order_history';
const LS_FAVORITES = 'nabo_pos_favorites';

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

type CompletedOrder = {
  id: string; orderId: string; orderType: string; tableNo?: string;
  lines: { name: string; qty: number; price: number; veg: boolean }[];
  subtotal: number; tax: number; discount: number; total: number;
  paymentMode: string; completedAt: string;
};

const ORDER_TYPES: { key: OrderType; label: string; icon: typeof ShoppingBag; desc: string; color: string }[] = [
  { key: 'dine-in', label: 'Dine-In', icon: UtensilsCrossed, desc: 'Table service + KOT', color: 'info' },
  { key: 'takeaway', label: 'Takeaway', icon: ShoppingBag, desc: 'Pack & pay at counter', color: 'brand' },
];

const TAX_RATE = 0.05;
const TABLE_STATUS_COLORS: Record<TableStatus, string> = {
  vacant: 'bg-ink-50 border-ink-200 text-ink-500',
  occupied: 'bg-info-50 border-info-300 text-info-700',
  'kot-sent': 'bg-warn-50 border-warn-300 text-warn-700',
  'bill-printed': 'bg-brand-50 border-brand-300 text-brand-700',
};
const TABLE_STATUS_DOT: Record<TableStatus, string> = {
  vacant: 'bg-ink-300',
  occupied: 'bg-info-500',
  'kot-sent': 'bg-warn-500',
  'bill-printed': 'bg-brand-500',
};

type View = 'floor' | 'billing' | 'table-detail' | 'table-edit';

export function POSBilling() {
  // ── Live menu from context — always in sync with Menu Management ──
  const { menuItems } = useMenu();

  const [view, setView] = useState<View>('floor');
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [activeCat, setActiveCat] = useState('fav');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // ── localStorage-backed table state ─────────────────────────────────────────
  const [tableList, setTableListRaw] = useState<TableInfo[]>(() =>
    lsGet<TableInfo[]>(LS_TABLES, initialTables)
  );
  const setTableList = useCallback((updater: TableInfo[] | ((prev: TableInfo[]) => TableInfo[])) => {
    setTableListRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      lsSet(LS_TABLES, next);
      return next;
    });
  }, []);

  const [tableOrderMap, setTableOrderMapRaw] = useState<Record<string, TableOrder>>(() => {
    const stored = lsGet<Record<string, TableOrder> | null>(LS_ORDERS, null);
    if (stored) return stored;
    const map: Record<string, TableOrder> = {};
    initialTableOrders.forEach(o => { map[o.tableId] = o; });
    return map;
  });
  const setTableOrderMap = useCallback((updater: Record<string, TableOrder> | ((prev: Record<string, TableOrder>) => Record<string, TableOrder>)) => {
    setTableOrderMapRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      lsSet(LS_ORDERS, next);
      return next;
    });
  }, []);

  // Sync table statuses from persisted orders on mount
  useEffect(() => {
    setTableListRaw(prev => prev.map(t => {
      const order = tableOrderMap[t.id];
      if (order) return { ...t, status: order.status, orderAmount: order.total, guests: order.guests };
      return t;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showFloorDesigner, setShowFloorDesigner] = useState(false);
  const [favorites, setFavoritesRaw] = useState<Set<string>>(() => {
    const stored = lsGet<string[] | null>(LS_FAVORITES, null);
    if (stored) return new Set(stored);
    return new Set(menuItems.filter(m => m.popular).map(m => m.id));
  });
  const setFavorites = useCallback((updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setFavoritesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      lsSet(LS_FAVORITES, Array.from(next));
      return next;
    });
  }, []);

  const [orderHistory, setOrderHistory] = useState<CompletedOrder[]>(() =>
    lsGet<CompletedOrder[]>(LS_HISTORY, [])
  );
  const pushHistory = useCallback((record: CompletedOrder) => {
    setOrderHistory(prev => { const next = [record, ...prev].slice(0, 200); lsSet(LS_HISTORY, next); return next; });
  }, []);

  const [showPayment, setShowPayment] = useState(false);
  const [showKOT, setShowKOT] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [billPaymentMode, setBillPaymentMode] = useState<string>('Cash');
  const [kotNewLines, setKotNewLines] = useState<CartLine[]>([]);
  const [editLines, setEditLines] = useState<CartLine[]>([]);
  const [editCat, setEditCat] = useState('all');
  const [editSearch, setEditSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [completed, setCompleted] = useState(false);
  const [completedVia, setCompletedVia] = useState<'kot' | 'payment'>('kot');
  const [orderId, setOrderId] = useState(() => uid('ORD'));

  const filteredItems = useMemo(() => {
    // Only show available items in POS
    let items = menuItems.filter(m => m.available);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.shortCode.toLowerCase().includes(q));
    } else if (activeCat === 'fav') {
      items = items.filter(i => favorites.has(i.id));
    } else if (activeCat !== 'all') {
      items = items.filter(i => i.category === activeCat);
    }
    return items;
  }, [menuItems, activeCat, search, favorites]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.item.price * l.qty, 0), [lines]);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = Math.max(0, subtotal + tax - discount);
  const totalQty = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);

  const addToCart = useCallback((item: MenuItem) => {
    setLines(prev => {
      const ex = prev.find(l => l.item.id === item.id);
      if (ex) return prev.map(l => l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { item, qty: 1 }];
    });
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setLines(prev => prev
      .map(l => l.item.id === id ? { ...l, qty: l.qty + delta } : l)
      .filter(l => l.qty > 0));
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines(prev => prev.filter(l => l.item.id !== id));
  }, []);

  const toggleFavorite = useCallback((itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const sections = useMemo(() => [...new Set(tableList.map(t => t.section || 'Main'))], [tableList]);
  const occupiedCount = tableList.filter(t => t.status !== 'vacant').length;
  const totalTables = tableList.length;

  const handleTableClick = (table: TableInfo) => {
    if (table.status === 'vacant') {
      setSelectedTable(table.label);
      setView('billing');
    } else {
      setSelectedTable(table.label);
      setView('table-detail');
    }
  };

  const completeLabel = orderType === 'takeaway' ? 'Pay & Complete'
    : orderType === 'qr' ? 'Place Order'
    : 'Send KOT';

  const handleComplete = () => {
    if (orderType === 'takeaway') setShowPayment(true);
    else setShowKOT(true);
  };

  const handlePaymentDone = () => {
    pushHistory({
      id: uid('CHK'), orderId, orderType, tableNo: selectedTable ?? undefined,
      lines: lines.map(l => ({ name: l.item.name, qty: l.qty, price: l.item.price, veg: l.item.veg })),
      subtotal, tax, discount, total, paymentMode: billPaymentMode,
      completedAt: new Date().toLocaleString('en-IN'),
    });
    setShowPayment(false);
    setCompletedVia('payment');
    setCompleted(true);
    setTimeout(() => resetOrder(), 2500);
  };

  const handleKOTDone = () => {
    setShowKOT(false);
    if (selectedTable) {
      // Update table status to kot-sent
      setTableList(prev => prev.map(t => t.label === selectedTable ? { ...t, status: 'kot-sent', orderAmount: total, guests: totalQty } : t));
      // Save order to table
      setTableOrderMap(prev => ({
        ...prev,
        [tableList.find(t => t.label === selectedTable)?.id || '']: {
          tableId: tableList.find(t => t.label === selectedTable)?.id || '',
          orderId,
          status: 'kot-sent',
          guests: totalQty,
          startedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          lines: lines.map(l => ({ name: l.item.name, qty: l.qty, price: l.item.price, veg: l.item.veg })),
          subtotal, tax, total,
        },
      }));
    }
    setCompletedVia('kot');
    setCompleted(true);
    setTimeout(() => resetOrder(), 2500);
  };

  const resetOrder = () => {
    setView('floor');
    setOrderType('dine-in');
    setLines([]);
    setDiscount(0);
    setCouponCode('');
    setSelectedTable(null);
    setCompleted(false);
    setSearch('');
    setActiveCat('fav');
    setOrderId(uid('ORD'));
  };

  const currentTableOrder = selectedTable ? tableOrderMap[tableList.find(t => t.label === selectedTable)?.id || ''] : null;
  const currentTableId = selectedTable ? tableList.find(t => t.label === selectedTable)?.id || '' : '';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const persistTableOrder = (tableId: string, order: TableOrder) => {
    setTableOrderMap(prev => ({ ...prev, [tableId]: order }));
    setTableList(prev => prev.map(t => t.id === tableId ? {
      ...t,
      status: order.status,
      orderAmount: order.total,
      guests: order.guests,
    } : t));
  };

  const recompute = (lines: { name: string; qty: number; price: number; veg: boolean }[]) => {
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    return { subtotal, tax, total: subtotal + tax };
  };

  const filteredEditItems = useMemo(() => {
    let items = menuItems.filter(m => m.available);
    if (editSearch) {
      const q = editSearch.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.shortCode.toLowerCase().includes(q));
    } else if (editCat === 'fav') {
      items = items.filter(i => favorites.has(i.id));
    } else if (editCat !== 'all') {
      items = items.filter(i => i.category === editCat);
    }
    return items;
  }, [menuItems, editCat, editSearch, favorites]);

  const startEdit = () => {
    if (!currentTableOrder) return;
    const map = new Map<string, CartLine>();
    currentTableOrder.lines.forEach(l => {
      const item = menuItems.find(m => m.name === l.name);
      if (item) map.set(item.id, { item, qty: l.qty });
    });
    setEditLines(Array.from(map.values()));
    setEditCat('all');
    setEditSearch('');
    setView('table-edit');
  };

  const addEditLine = (item: MenuItem) => {
    setEditLines(prev => {
      const ex = prev.find(l => l.item.id === item.id);
      if (ex) return prev.map(l => l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { item, qty: 1 }];
    });
  };

  const changeEditQty = (id: string, delta: number) => {
    setEditLines(prev => prev
      .map(l => l.item.id === id ? { ...l, qty: l.qty + delta } : l)
      .filter(l => l.qty > 0));
  };

  const saveEdit = () => {
    if (!currentTableOrder) return;
    const newLines = editLines.map(l => ({ name: l.item.name, qty: l.qty, price: l.item.price, veg: l.item.veg }));
    const { subtotal, tax, total } = recompute(newLines);

    // Detect newly added items (items not present in the original order)
    const originalNames = new Set(currentTableOrder.lines.map(l => l.name));
    const addedItems: CartLine[] = editLines.filter(l => !originalNames.has(l.item.name));
    // Also detect items whose qty increased
    const increasedItems: CartLine[] = editLines.filter(l => {
      const orig = currentTableOrder.lines.find(ol => ol.name === l.item.name);
      return orig && l.qty > orig.qty
        ? true : false;
    }).map(l => {
      const orig = currentTableOrder.lines.find(ol => ol.name === l.item.name)!;
      return { item: l.item, qty: l.qty - orig.qty };
    });

    const newKotLines = [...addedItems, ...increasedItems];

    // Save order first
    persistTableOrder(currentTableId, {
      ...currentTableOrder,
      lines: newLines,
      guests: editLines.reduce((s, l) => s + l.qty, 0),
      subtotal, tax, total,
      status: newKotLines.length > 0 ? 'kot-sent' : currentTableOrder.status,
    });
    setView('table-detail');

    if (newKotLines.length > 0) {
      // Show KOT preview for newly added items only
      setKotNewLines(newKotLines);
      setShowKOT(true);
      showToast(`KOT sent — ${newKotLines.length} new item(s) to kitchen`);
    } else {
      showToast('Items updated');
    }
  };

  // Print Bill — shows bill preview ONLY (no payment)
  const handlePrintBill = () => {
    setShowBill(true);
    if (currentTableOrder) {
      persistTableOrder(currentTableId, { ...currentTableOrder, status: 'bill-printed' });
    }
  };

  // Settle Bill — opens payment screen, clears table on completion
  const handleSettleBill = () => {
    setShowPayment(true);
  };

  const handleTableSettled = (payMode: string) => {
    if (currentTableOrder) {
      pushHistory({
        id: uid('CHK'), orderId: currentTableOrder.orderId,
        orderType: 'dine-in', tableNo: selectedTable ?? undefined,
        lines: currentTableOrder.lines,
        subtotal: currentTableOrder.subtotal, tax: currentTableOrder.tax,
        discount: 0, total: currentTableOrder.total, paymentMode: payMode,
        completedAt: new Date().toLocaleString('en-IN'),
      });
      setTableOrderMap(prev => { const next = { ...prev }; delete next[currentTableId]; return next; });
      setTableList(prev => prev.map(t =>
        t.id === currentTableId ? { ...t, status: 'vacant', orderAmount: undefined, guests: undefined } : t
      ));
    }
    setShowPayment(false);
    showToast('Bill settled — Table cleared');
    setTimeout(() => setView('floor'), 1000);
  };

  const handleSendKOT = () => {
    if (!currentTableOrder) return;
    persistTableOrder(currentTableId, { ...currentTableOrder, status: 'kot-sent' });
    showToast(`KOT sent for Table ${selectedTable}`);
  };

  if (completed) {
    const isKOT = completedVia === 'kot';
    return (
      <div className="h-full flex items-center justify-center bg-ink-50">
        <div className="text-center animate-slide-up">
          <div className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isKOT ? 'bg-warn-100' : 'bg-brand-100'}`}>
            <Check className={`h-10 w-10 ${isKOT ? 'text-warn-600' : 'text-brand-600'}`} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-ink-900">{isKOT ? 'Order Sent to Kitchen' : 'Payment Complete'}</h2>
          <p className="text-ink-400 mt-1">{orderId} · {orderType}</p>
          <p className={`text-sm font-semibold mt-3 ${isKOT ? 'text-warn-600' : 'text-brand-600'}`}>
            {isKOT
              ? `${inr(total)} · KOT sent · Kitchen is preparing your order`
              : `${inr(total)} · Inventory deducted · Paid via ${billPaymentMode}`}
          </p>
          <button onClick={resetOrder} className="mt-6 text-sm text-ink-500 hover:text-ink-800 font-medium">Start new order →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-ink-50">
      <SyncBar status={syncStatus} onToggle={() => setSyncStatus(s => s === 'synced' ? 'offline' : 'synced')} />

      {/* Order Type Bar — persistent at top */}
      <div className="bg-white border-b border-ink-200/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {view !== 'floor' && (
            <button onClick={() => setView('floor')} className="h-9 w-9 rounded-lg bg-ink-100 hover:bg-ink-200 flex items-center justify-center shrink-0 transition-colors">
              <ArrowLeft className="h-4 w-4 text-ink-600" />
            </button>
          )}
          <span className="text-2xs font-semibold uppercase tracking-wide text-ink-400 shrink-0">Order Type:</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {ORDER_TYPES.map(({ key, label, icon: Icon, color }) => {
              const isActive = orderType === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setOrderType(key);
                    if (view === 'billing' && key !== 'dine-in') setSelectedTable(null);
                    if (view === 'floor' && key !== 'dine-in') { setSelectedTable(null); setView('billing'); }
                    if (view === 'floor' && key === 'dine-in') setView('floor');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all shrink-0
                    ${isActive ? `border-${color}-400 bg-${color}-50` : 'border-ink-200 bg-white hover:bg-ink-50'}`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? `text-${color}-600` : 'text-ink-400'}`} strokeWidth={2} />
                  <span className={`text-sm font-bold ${isActive ? `text-${color}-700` : 'text-ink-600'}`}>{label}</span>
                </button>
              );
            })}
          </div>
          {/* Floor designer toggle — only on floor view */}
          {view === 'floor' && (
            <button
              onClick={() => setShowFloorDesigner(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-ink-200 text-sm font-medium text-ink-600 hover:bg-ink-50 transition-colors shrink-0"
            >
              <Settings2 className="h-4 w-4" /> Design Floor
            </button>
          )}
        </div>
      </div>

      {/* Floor Plan View */}
      {view === 'floor' && (
        <div className="flex-1 overflow-auto p-5 animate-fade-in">
          {/* Floor summary */}
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-bold text-ink-900">Floor Plan</h2>
            <Badge tone="brand" size="sm">{occupiedCount} occupied</Badge>
            <Badge tone="neutral" size="sm">{totalTables - occupiedCount} vacant</Badge>
            <Badge tone="neutral" size="sm">{totalTables} total</Badge>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-5 text-xs">
            {[
              { label: 'Vacant', color: 'bg-ink-50 border-ink-200', dot: 'bg-ink-300' },
              { label: 'Occupied', color: 'bg-info-50 border-info-300', dot: 'bg-info-500' },
              { label: 'KOT Sent', color: 'bg-warn-50 border-warn-300', dot: 'bg-warn-500' },
              { label: 'Bill Printed', color: 'bg-brand-50 border-brand-300', dot: 'bg-brand-500' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded border-2 ${l.color} flex items-center justify-center`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${l.dot}`} />
                </span>
                <span className="text-ink-500 font-medium">{l.label}</span>
              </div>
            ))}
          </div>

          {/* Floor sections */}
          <div className="space-y-6">
            {sections.map(section => (
              <div key={section}>
                <div className="text-sm font-bold uppercase tracking-wide text-ink-400 mb-3">{section}</div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                  {tableList.filter(t => (t.section || 'Main') === section).map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTableClick(t)}
                      className={`relative p-4 rounded-2xl border-2 transition-all hover:shadow-card-md hover:-translate-y-0.5 ${TABLE_STATUS_COLORS[t.status]}`}
                      style={{ minHeight: '100px' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{t.label}</span>
                        <span className={`h-2 w-2 rounded-full ${TABLE_STATUS_DOT[t.status]} ${t.status !== 'vacant' ? 'animate-pulse' : ''}`} />
                      </div>
                      <div className="flex items-center justify-center gap-0.5 text-2xs text-ink-400 mb-1">
                        <Users className="h-2.5 w-2.5" />{t.seats} seats
                      </div>
                      {t.shape === 'round' && <Circle className="h-3 w-3 text-ink-300 mx-auto" />}
                      {t.shape === 'rect' && <RectangleHorizontal className="h-3 w-3 text-ink-300 mx-auto" />}
                      {t.shape === 'square' && <Grid3x3 className="h-3 w-3 text-ink-300 mx-auto" />}
                      {t.orderAmount && (
                        <div className="text-2xs tnum mt-1 font-bold">{inr(t.orderAmount)}</div>
                      )}
                      {t.guests && (
                        <div className="text-2xs text-ink-400 mt-0.5">{t.guests} guests</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-2xs text-ink-400">Click a vacant table to start a new order · Click an occupied table to view order & bill</p>
          </div>
        </div>
      )}

      {/* Table Detail View — shows ordered items + bill with back button */}
      {view === 'table-detail' && currentTableOrder && (
        <div className="flex-1 overflow-auto p-5 animate-slide-in-right">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Table header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('floor')} className="h-9 w-9 rounded-lg bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors">
                  <ArrowLeft className="h-4 w-4 text-ink-600" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-ink-900">Table {selectedTable}</h2>
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    <span>{currentTableOrder.orderId}</span>
                    <span>·</span>
                    <Badge tone={currentTableOrder.status === 'occupied' ? 'info' : currentTableOrder.status === 'kot-sent' ? 'warn' : 'brand'} size="xs" dot>{currentTableOrder.status}</Badge>
                    <span>·</span>
                    <span>Started {currentTableOrder.startedAt}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="neutral" size="sm"><Users className="h-3 w-3 inline mr-1" />{currentTableOrder.guests} guests</Badge>
              </div>
            </div>

            {/* Ordered items */}
            <div className="bg-white rounded-xl border border-ink-200/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-ink-100 bg-ink-50">
                <h3 className="font-bold text-ink-900 text-sm">Ordered Items</h3>
              </div>
              <div className="divide-y divide-ink-100">
                {currentTableOrder.lines.map((line, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className={`h-3 w-3 rounded-sm border-2 ${line.veg ? 'border-brand-500' : 'border-danger-500'} shrink-0`}>
                      <span className={`block h-1.5 w-1.5 rounded-full ${line.veg ? 'bg-brand-500' : 'bg-danger-500'} m-auto mt-px`} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink-800">{line.name}</div>
                      <div className="text-2xs text-ink-400 tnum">{inr(line.price)} each</div>
                    </div>
                    <span className="text-sm font-bold tnum w-8 text-center">{line.qty}x</span>
                    <span className="text-sm font-bold tnum text-ink-900 w-20 text-right">{inr(line.price * line.qty)}</span>
                  </div>
                ))}
              </div>
              {/* Bill summary */}
              <div className="px-4 py-3 border-t border-ink-100 bg-ink-50 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-500"><span>Subtotal</span><span className="tnum">{inr(currentTableOrder.subtotal)}</span></div>
                <div className="flex justify-between text-ink-500"><span>GST (5%)</span><span className="tnum">{inr(currentTableOrder.tax)}</span></div>
                <div className="h-px bg-ink-200 my-1" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-ink-900">Total Bill</span>
                  <span className="text-xl font-bold tnum text-ink-900">{inr(currentTableOrder.total)}</span>
                </div>
              </div>
            </div>

              {/* Actions — Send KOT + Print Bill + Add Items */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleSendKOT}
                className={`h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all
                  ${currentTableOrder.status === 'kot-sent'
                    ? 'bg-warn-100 text-warn-700 border border-warn-300'
                    : 'bg-warn-500 hover:bg-warn-600 text-white shadow-card-md'}`}
              >
                <FileCheck className="h-4 w-4" /> {currentTableOrder.status === 'kot-sent' ? 'KOT Sent ✓' : 'Send KOT'}
              </button>
              <button
                onClick={handlePrintBill}
                className="h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-card-md transition-all"
              >
                <Printer className="h-4 w-4" /> Print Bill
              </button>
              <button
                onClick={startEdit}
                className="h-12 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Edit View — add items + adjust qty with increment/decrement */}
      {view === 'table-edit' && currentTableOrder && (
        <div className="flex-1 flex min-h-0">
          {/* Category Rail + Search */}
          <div className="w-44 shrink-0 bg-white border-r border-ink-200/60 flex flex-col">
            <div className="p-3 border-b border-ink-100">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="info" dot>Edit · T{selectedTable}</Badge>
              </div>
            </div>
            <div className="flex-1 overflow-auto py-2">
              {categories.map(cat => {
                const isActive = editCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setEditCat(cat.id); setEditSearch(''); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors text-sm font-medium
                      ${isActive ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-500' : 'text-ink-600 hover:bg-ink-50'}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-brand-500' : 'bg-ink-300'}`} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Grid (tap to add) */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3 bg-white border-b border-ink-200/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  value={editSearch}
                  onChange={e => { setEditSearch(e.target.value); setEditCat('all'); }}
                  placeholder="Search items or short code..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {filteredEditItems.map(item => {
                  const inCart = editLines.find(l => l.item.id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addEditLine(item)}
                      disabled={!item.available}
                      className={`relative text-left rounded-xl border p-3 transition-all
                        ${item.available
                          ? 'bg-white border-ink-200 hover:border-brand-400 hover:shadow-card active:scale-[0.98]'
                          : 'bg-ink-50 border-ink-100 opacity-50 cursor-not-allowed'}`}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 h-5 min-w-5 px-1 rounded-full bg-brand-600 text-white text-2xs font-bold flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`h-3 w-3 rounded-sm border-2 ${item.veg ? 'border-brand-500' : 'border-danger-500'}`}>
                          <span className={`block h-1.5 w-1.5 rounded-full ${item.veg ? 'bg-brand-500' : 'bg-danger-500'} m-auto mt-px`} />
                        </span>
                        <span className="text-2xs text-ink-400 tnum">{item.shortCode}</span>
                      </div>
                      <div className="text-sm font-semibold text-ink-900 leading-tight">{item.name}</div>
                      <div className="text-xs font-bold tnum text-brand-700 mt-1">{inr(item.price)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cart sidebar with qty +/- */}
          <div className="w-80 shrink-0 bg-white border-l border-ink-200/60 flex flex-col">
            <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink-900 text-sm">Edit Order</h3>
                <p className="text-2xs text-ink-400">{currentTableOrder.orderId}</p>
              </div>
              <button onClick={() => setView('table-detail')} className="h-8 w-8 rounded-lg bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-ink-600" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {editLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-400 py-12">
                  <Plus className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Tap items to add</p>
                </div>
              ) : (
                <div className="divide-y divide-ink-100">
                  {editLines.map(line => (
                    <div key={line.item.id} className="flex items-center gap-2 px-4 py-3">
                      <span className={`h-3 w-3 rounded-sm border-2 ${line.item.veg ? 'border-brand-500' : 'border-danger-500'} shrink-0`}>
                        <span className={`block h-1.5 w-1.5 rounded-full ${line.item.veg ? 'bg-brand-500' : 'bg-danger-500'} m-auto mt-px`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink-800 truncate">{line.item.name}</div>
                        <div className="text-2xs text-ink-400 tnum">{inr(line.item.price)} each</div>
                      </div>
                      {/* Increment / Decrement */}
                      <div className="flex items-center gap-1 bg-ink-50 rounded-lg p-0.5">
                        <button
                          onClick={() => changeEditQty(line.item.id, -1)}
                          className="h-6 w-6 rounded-md bg-white hover:bg-ink-100 flex items-center justify-center transition-colors"
                        >
                          <Minus className="h-3 w-3 text-ink-600" />
                        </button>
                        <span className="text-sm font-bold tnum w-6 text-center">{line.qty}</span>
                        <button
                          onClick={() => changeEditQty(line.item.id, 1)}
                          className="h-6 w-6 rounded-md bg-white hover:bg-ink-100 flex items-center justify-center transition-colors"
                        >
                          <Plus className="h-3 w-3 text-ink-600" />
                        </button>
                      </div>
                      <span className="text-sm font-bold tnum text-ink-900 w-16 text-right">{inr(line.item.price * line.qty)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Summary + Save */}
            {editLines.length > 0 && (
              <div className="border-t border-ink-100 p-4 space-y-2">
                {(() => {
                  const sub = editLines.reduce((s, l) => s + l.item.price * l.qty, 0);
                  const tax = Math.round(sub * TAX_RATE);
                  return (
                    <>
                      <div className="flex justify-between text-xs text-ink-500"><span>Subtotal</span><span className="tnum">{inr(sub)}</span></div>
                      <div className="flex justify-between text-xs text-ink-500"><span>GST (5%)</span><span className="tnum">{inr(tax)}</span></div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="font-bold text-ink-900 text-sm">Total</span>
                        <span className="text-lg font-bold tnum text-ink-900">{inr(sub + tax)}</span>
                      </div>
                      <button
                        onClick={saveEdit}
                        className="w-full h-11 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-card-md transition-all mt-1"
                      >
                        <FileCheck className="h-4 w-4" /> Send KOT &amp; Save
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-slide-up">
          {toast}
        </div>
      )}

      {/* Bill preview modal */}
      {showBill && currentTableOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4" onClick={() => setShowBill(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-brand-600" />
                <h3 className="font-bold text-ink-900">Final Bill</h3>
              </div>
              <button type="button" onClick={() => setShowBill(false)} className="h-8 w-8 rounded-lg bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-ink-600" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-center">
                <div className="text-base font-bold text-ink-900">Nabo Flow</div>
                <div className="text-2xs text-ink-400">Outlet 1 · GSTIN 29ABCDE1234F1Z5</div>
                <div className="text-2xs text-ink-400 mt-0.5">Table {selectedTable} · {currentTableOrder.orderId}</div>
                <div className="text-2xs text-ink-400">{new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="h-px bg-ink-200" />
              <div className="space-y-1.5">
                {currentTableOrder.lines.map((l, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-ink-700">{l.name} ×{l.qty}</span>
                    <span className="tnum text-ink-900 font-medium">{inr(l.price * l.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-ink-200" />
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-ink-500"><span>Subtotal</span><span className="tnum">{inr(currentTableOrder.subtotal)}</span></div>
                <div className="flex justify-between text-ink-500"><span>GST (5%)</span><span className="tnum">{inr(currentTableOrder.tax)}</span></div>
                <div className="h-px bg-ink-100 my-1" />
                <div className="flex justify-between font-bold text-ink-900 text-sm"><span>Total</span><span className="tnum">{inr(currentTableOrder.total)}</span></div>
              </div>

              {/* ── Payment mode selector ── */}
              <div>
                <p className="text-2xs font-bold uppercase tracking-wide text-ink-400 mb-2">Payment Mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'Card', 'UPI'] as const).map(m => (
                    <div
                      key={m}
                      role="button"
                      tabIndex={0}
                      onClick={() => setBillPaymentMode(m)}
                      onKeyDown={e => e.key === 'Enter' && setBillPaymentMode(m)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 cursor-pointer transition-all select-none
                        ${billPaymentMode === m
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-ink-200 bg-white hover:border-brand-300'}`}
                    >
                      {m === 'Cash' && <Banknote  className={`h-5 w-5 ${billPaymentMode === m ? 'text-brand-600' : 'text-ink-400'}`} />}
                      {m === 'Card' && <CreditCard className={`h-5 w-5 ${billPaymentMode === m ? 'text-brand-600' : 'text-ink-400'}`} />}
                      {m === 'UPI'  && <Upi        className={`h-5 w-5 ${billPaymentMode === m ? 'text-brand-600' : 'text-ink-400'}`} />}
                      <span className={`text-xs font-bold ${billPaymentMode === m ? 'text-brand-700' : 'text-ink-500'}`}>{m}</span>
                      {billPaymentMode === m && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center text-2xs text-ink-400 pt-1">Thank you for dining with us! 🙏</div>
            </div>
            <div className="p-4 bg-ink-50 border-t border-ink-100 flex gap-2">
              <button type="button" onClick={() => setShowBill(false)} className="flex-1 h-10 rounded-lg border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-white transition-colors">Close</button>
              <button
                type="button"
                onClick={() => {
                  setShowBill(false);
                  // Settle the table — clear order, save history, set table vacant
                  handleTableSettled(billPaymentMode);
                }}
                className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Print & Settle
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Billing View — add items + cart */}
      {view === 'billing' && (
        <div className="flex-1 flex min-h-0">
          {/* Category Rail */}
          <div className="w-44 shrink-0 bg-white border-r border-ink-200/60 flex flex-col">
            <div className="p-3 border-b border-ink-100">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone={orderType === 'takeaway' ? 'brand' : orderType === 'dine-in' ? 'info' : 'accent'}>
                  {ORDER_TYPES.find(t => t.key === orderType)?.label}
                </Badge>
                {selectedTable && <Badge tone="neutral" dot>Table {selectedTable}</Badge>}
              </div>
            </div>
            <div className="flex-1 overflow-auto py-2">
              {categories.map(cat => {
                const isActive = activeCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCat(cat.id); setSearch(''); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors text-sm font-medium
                      ${isActive ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-500' : 'text-ink-600 hover:bg-ink-50'}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-brand-500' : 'bg-ink-300'}`} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-ink-100">
              <button onClick={resetOrder} className="w-full text-xs text-ink-400 hover:text-danger-600 font-medium flex items-center justify-center gap-1.5">
                <X className="h-3.5 w-3.5" /> Cancel Order
              </button>
            </div>
          </div>

          {/* Menu Grid */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3 bg-white border-b border-ink-200/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search items or type short code (e.g. CB01)..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-400">
                  <Search className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">{activeCat === 'fav' ? 'No favorites yet — tap the star on any item to pin it here' : 'No items found'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredItems.map(item => {
                    const inCart = lines.find(l => l.item.id === item.id);
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={item.available ? 0 : -1}
                        onClick={() => item.available && addToCart(item)}
                        onKeyDown={e => e.key === 'Enter' && item.available && addToCart(item)}
                        className={`relative text-left p-3 rounded-xl border transition-all duration-150 select-none
                          ${item.available ? 'bg-white border-ink-200 hover:border-brand-300 hover:shadow-card-md active:scale-[0.98] cursor-pointer' : 'bg-ink-50 border-ink-200 opacity-50 cursor-not-allowed'}`}
                      >
                        {inCart && (
                          <span className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-brand-500 flex items-center justify-center shadow text-white text-2xs font-bold">
                            {inCart.qty}
                          </span>
                        )}
                        <div className="flex items-start gap-2 mb-1.5">
                          <span className={`mt-0.5 h-3 w-3 rounded-sm border-2 ${item.veg ? 'border-brand-500' : 'border-danger-500'} flex items-center justify-center shrink-0`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${item.veg ? 'bg-brand-500' : 'bg-danger-500'}`} />
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-ink-900 leading-tight truncate">{item.name}</div>
                            <div className="text-2xs text-ink-400 mt-0.5">{item.shortCode}</div>
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-2xs text-ink-400 leading-snug mb-2 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-base font-bold text-ink-900 tnum">{inr(item.price)}</span>
                          {!item.available ? (
                            <Badge tone="danger" size="xs">86&apos;d</Badge>
                          ) : (
                            item.prepTime && (
                              <span className="flex items-center gap-0.5 text-2xs text-ink-400">
                                <Clock className="h-3 w-3" />{item.prepTime}m
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Live Cart */}
          <div className="w-80 shrink-0 bg-white border-l border-ink-200/60 flex flex-col">
            <div className="p-4 border-b border-ink-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-ink-900">Current Order</h3>
                <Badge tone="neutral" size="xs">{orderId}</Badge>
              </div>
              <div className="flex items-center gap-2 text-2xs text-ink-400">
                <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> {orderType}</span>
                {selectedTable && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Table {selectedTable}</span>}
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-300 p-6">
                  <ShoppingBag className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium text-ink-400">No items yet</p>
                  <p className="text-2xs text-ink-300 mt-1 text-center">Tap items from the grid to add them here</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {lines.map(line => (
                    <div key={line.item.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-ink-50 group">
                      <span className={`h-3 w-3 rounded-sm border-2 ${line.item.veg ? 'border-brand-500' : 'border-danger-500'} shrink-0`}>
                        <span className={`block h-1.5 w-1.5 rounded-full ${line.item.veg ? 'bg-brand-500' : 'bg-danger-500'} m-auto mt-0.5`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink-800 truncate">{line.item.name}</div>
                        <div className="text-2xs text-ink-400 tnum">{inr(line.item.price)} each</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => changeQty(line.item.id, -1)} className="h-7 w-7 rounded-md bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors">
                          <Minus className="h-3.5 w-3.5 text-ink-600" />
                        </button>
                        <span className="text-sm font-bold tnum w-6 text-center">{line.qty}</span>
                        <button onClick={() => changeQty(line.item.id, 1)} className="h-7 w-7 rounded-md bg-brand-100 hover:bg-brand-200 flex items-center justify-center transition-colors">
                          <Plus className="h-3.5 w-3.5 text-brand-700" />
                        </button>
                      </div>
                      <div className="w-16 text-right">
                        <div className="text-sm font-bold tnum text-ink-900">{inr(line.item.price * line.qty)}</div>
                      </div>
                      <button onClick={() => removeLine(line.item.id)} className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md hover:bg-danger-50 flex items-center justify-center transition-all">
                        <Trash2 className="h-3.5 w-3.5 text-danger-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {lines.length > 0 && (
              <div className="border-t border-ink-100 p-4 space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setShowCouponModal(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed text-xs font-medium transition-colors ${couponCode ? 'border-brand-400 text-brand-600 bg-brand-50' : 'border-ink-200 text-ink-500 hover:border-brand-300 hover:text-brand-600'}`}>
                    <Tag className="h-3.5 w-3.5" /> {couponCode ? couponCode : 'Coupon'}
                  </button>
                  <button onClick={() => setShowDiscountModal(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed text-xs font-medium transition-colors ${discount > 0 ? 'border-brand-400 text-brand-600 bg-brand-50' : 'border-ink-200 text-ink-500 hover:border-brand-300 hover:text-brand-600'}`}>
                    <Percent className="h-3.5 w-3.5" /> {discount > 0 ? `-${inr(discount)}` : 'Discount'}
                  </button>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-ink-500">
                    <span>Subtotal ({totalQty} items)</span>
                    <span className="tnum">{inr(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-ink-500">
                    <span>GST (5%)</span>
                    <span className="tnum">{inr(tax)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-brand-600 font-medium">
                      <span>Discount {couponCode ? `(${couponCode})` : ''}</span>
                      <span className="tnum">-{inr(discount)}</span>
                    </div>
                  )}

                  <div className="h-px bg-ink-100 my-1" />
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-ink-900">Total</span>
                    <span className="text-xl font-bold tnum text-ink-900">{inr(total)}</span>
                  </div>
                </div>
                <button
                  onClick={handleComplete}
                  className="w-full h-14 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-base flex items-center justify-center gap-2 shadow-card-md transition-all hover:shadow-card-lg active:scale-[0.99]"
                >
                  {completeLabel}
                  <ArrowRight className="h-5 w-5" />
                </button>
                <p className="text-center text-2xs text-ink-400">Saved to localStorage · Synced across tabs</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floor Designer Modal */}
      {showFloorDesigner && (
        <FloorDesigner
          tables={tableList}
          onSave={(newTables) => { setTableList(newTables); setShowFloorDesigner(false); showToast('Floor plan saved'); }}
          onClose={() => setShowFloorDesigner(false)}
        />
      )}

      {/* Payment Screen */}
      {showPayment && (
        <PaymentScreen
          total={currentTableOrder?.total ?? total}
          orderId={currentTableOrder?.orderId ?? orderId}
          onDone={(mode) => {
            setBillPaymentMode(mode);
            if (currentTableOrder) handleTableSettled(mode);
            else handlePaymentDone();
          }}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* KOT Preview */}
      {showKOT && (
        <KOTPreview
          lines={kotNewLines.length > 0 ? kotNewLines : lines}
          orderType={orderType}
          orderId={currentTableOrder?.orderId ?? orderId}
          tableNo={selectedTable || undefined}
          total={kotNewLines.length > 0 ? kotNewLines.reduce((s,l)=>s+l.item.price*l.qty,0) : total}
          onDone={() => {
            setShowKOT(false);
            setKotNewLines([]);
            if (kotNewLines.length === 0) handleKOTDone();
          }}
          onClose={() => { setShowKOT(false); setKotNewLines([]); }}
        />
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <DiscountModal
          subtotal={subtotal + tax}
          currentDiscount={discount}
          onApply={(d) => { setDiscount(d); setShowDiscountModal(false); showToast(`Discount ${inr(d)} applied`); }}
          onClose={() => setShowDiscountModal(false)}
        />
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <CouponModal
          subtotal={subtotal + tax}
          onApply={(code, amt) => {
            setCouponCode(code);
            setDiscount(prev => prev + amt);
            setShowCouponModal(false);
            showToast(`Coupon "${code}" — ${inr(amt)} off`);
          }}
          onClose={() => setShowCouponModal(false)}
        />
      )}

      {/* Order History Modal */}
      {showHistory && (
        <OrderHistoryModal history={orderHistory} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}

// --- Sync Status Bar ---
function SyncBar({ status, onToggle }: { status: 'synced' | 'syncing' | 'offline'; onToggle: () => void }) {
  const config = {
    synced: { icon: Wifi, text: 'All synced', tone: 'text-brand-600', bg: 'bg-brand-50' },
    syncing: { icon: Wifi, text: 'Syncing...', tone: 'text-warn-600', bg: 'bg-warn-50' },
    offline: { icon: WifiOff, text: 'Offline — will sync when reconnected', tone: 'text-danger-600', bg: 'bg-danger-50' },
  }[status];
  const Icon = config.icon;
  return (
    <div className={`h-8 ${config.bg} flex items-center justify-center gap-2 text-xs font-medium ${config.tone} cursor-pointer`} onClick={onToggle} title="Click to toggle sync status (demo)">
      <Icon className="h-3.5 w-3.5" />
      {config.text}
    </div>
  );
}

// --- Floor Designer ---
function FloorDesigner({
  tables, onSave, onClose,
}: {
  tables: TableInfo[];
  onSave: (tables: TableInfo[]) => void;
  onClose: () => void;
}) {
  const DEFAULT_FLOOR = 'Ground Floor';

  const initFloors = () => {
    const fl = [...new Set(tables.map(t => t.floor || DEFAULT_FLOOR))];
    return fl.length ? fl : [DEFAULT_FLOOR];
  };

  const [localTables, setLocalTables] = useState<TableInfo[]>(
    tables.map(t => ({ ...t, floor: t.floor || DEFAULT_FLOOR }))
  );
  const [floors, setFloors] = useState<string[]>(initFloors);
  const [activeFloor, setActiveFloor] = useState(initFloors()[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<{ floor: string; old: string } | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const sectionsOnFloor = useMemo(() => {
    const s = [...new Set(localTables.filter(t => (t.floor || DEFAULT_FLOOR) === activeFloor).map(t => t.section || 'Main'))];
    return s.length ? s : ['Main'];
  }, [localTables, activeFloor]);

  const tablesOnFloor = localTables.filter(t => (t.floor || DEFAULT_FLOOR) === activeFloor);

  // ── Inline input states (zero browser dialogs) ──
  const [addingFloor, setAddingFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [renamingFloor, setRenamingFloor] = useState<string | null>(null);
  const [renameFloorVal, setRenameFloorVal] = useState('');
  const [confirmDeleteFloor, setConfirmDeleteFloor] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<string | null>(null);

  // ── Floor actions ──
  const commitAddFloor = () => {
    const name = newFloorName.trim();
    if (name && !floors.includes(name)) {
      setFloors(prev => [...prev, name]);
      setActiveFloor(name);
    }
    setAddingFloor(false); setNewFloorName('');
  };

  const commitRenameFloor = () => {
    const name = renameFloorVal.trim();
    if (name && name !== renamingFloor && !floors.includes(name)) {
      setFloors(prev => prev.map(f => f === renamingFloor ? name : f));
      setLocalTables(prev => prev.map(t => t.floor === renamingFloor ? { ...t, floor: name } : t));
      if (activeFloor === renamingFloor) setActiveFloor(name);
    }
    setRenamingFloor(null);
  };

  const doDeleteFloor = (floor: string) => {
    const next = floors.find(x => x !== floor) || DEFAULT_FLOOR;
    setFloors(prev => prev.filter(f => f !== floor));
    setLocalTables(prev => prev.filter(t => (t.floor || DEFAULT_FLOOR) !== floor));
    setActiveFloor(a => a === floor ? next : a);
    setConfirmDeleteFloor(null);
  };

  // ── Section actions ──
  const commitAddSection = () => {
    const name = newSectionName.trim();
    if (name && !sectionsOnFloor.includes(name)) {
      const id = 't' + Date.now();
      setLocalTables(prev => [...prev, { id, label: 'T' + (prev.length + 1), seats: 4, shape: 'square', status: 'vacant', floor: activeFloor, section: name }]);
    }
    setAddingSection(false); setNewSectionName('');
  };

  const startRenameSection = (section: string) => {
    setEditingSection({ floor: activeFloor, old: section });
    setEditingSectionName(section);
  };

  const commitRenameSection = () => {
    if (!editingSection) return;
    const newName = editingSectionName.trim();
    if (newName && newName !== editingSection.old) {
      setLocalTables(prev => prev.map(t =>
        (t.floor || DEFAULT_FLOOR) === editingSection.floor && (t.section || 'Main') === editingSection.old
          ? { ...t, section: newName } : t
      ));
    }
    setEditingSection(null);
  };

  const doDeleteSection = (section: string) => {
    setLocalTables(prev => prev.filter(t =>
      !((t.floor || DEFAULT_FLOOR) === activeFloor && (t.section || 'Main') === section)
    ));
    setConfirmDeleteSection(null);
  };

  // ── Table actions ──
  const addTable = (section: string) => {
    const id = 't' + Date.now();
    setLocalTables(prev => [...prev, { id, label: 'T' + (prev.length + 1), seats: 4, shape: 'square', status: 'vacant', floor: activeFloor, section }]);
  };

  const removeTable = (id: string) => setLocalTables(prev => prev.filter(t => t.id !== id));
  const updateTable = (id: string, updates: Partial<TableInfo>) =>
    setLocalTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-100 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-bold text-ink-900 text-lg leading-tight">Floor Designer</h3>
              <p className="text-xs text-ink-400">{floors.length} floor{floors.length !== 1 ? 's' : ''} · {localTables.length} tables total</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center transition-colors">
            <X className="h-5 w-5 text-ink-500" />
          </button>
        </div>

        {/* Floor tabs */}
        <div className="px-6 pt-3 pb-0 border-b border-ink-100 flex items-center gap-1 overflow-x-auto">
          {floors.map(floor => (
            <div key={floor}
              className={`group relative flex items-center gap-1 border-b-2 text-sm font-semibold cursor-pointer transition-all select-none whitespace-nowrap rounded-t-xl
                ${activeFloor === floor ? 'border-brand-500 text-brand-700 bg-brand-50' : 'border-transparent text-ink-500 hover:text-ink-700 hover:bg-ink-50'}
                ${renamingFloor === floor ? 'px-2 py-1.5' : 'px-4 py-2.5'}`}
              onClick={() => { if (renamingFloor !== floor) setActiveFloor(floor); }}
            >
              {renamingFloor === floor ? (
                <input autoFocus value={renameFloorVal}
                  onChange={e => setRenameFloorVal(e.target.value)}
                  onBlur={commitRenameFloor}
                  onKeyDown={e => { if (e.key === 'Enter') commitRenameFloor(); if (e.key === 'Escape') setRenamingFloor(null); }}
                  onClick={e => e.stopPropagation()}
                  className="w-32 px-2 py-0.5 text-sm font-bold border-2 border-brand-400 rounded-lg outline-none bg-white text-ink-900"
                />
              ) : (
                <>
                  <span onDoubleClick={e => { e.stopPropagation(); setRenamingFloor(floor); setRenameFloorVal(floor); }}>{floor}</span>
                  <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                    <button type="button" onClick={e => { e.stopPropagation(); setRenamingFloor(floor); setRenameFloorVal(floor); }}
                      className="h-4 w-4 rounded hover:bg-ink-200 flex items-center justify-center" title="Rename">
                      <Edit3 className="h-2.5 w-2.5 text-ink-400" />
                    </button>
                    {floors.length > 1 && (
                      confirmDeleteFloor === floor ? (
                        <div className="flex items-center gap-0.5 ml-1" onClick={e => e.stopPropagation()}>
                          <button type="button" onClick={() => doDeleteFloor(floor)}
                            className="px-1.5 py-0.5 rounded bg-danger-500 text-white text-2xs font-bold hover:bg-danger-600">Yes</button>
                          <button type="button" onClick={() => setConfirmDeleteFloor(null)}
                            className="px-1.5 py-0.5 rounded bg-ink-200 text-ink-600 text-2xs font-bold">No</button>
                        </div>
                      ) : (
                        <button type="button" onClick={e => { e.stopPropagation(); setConfirmDeleteFloor(floor); }}
                          className="h-4 w-4 rounded hover:bg-danger-100 flex items-center justify-center" title="Delete floor">
                          <X className="h-2.5 w-2.5 text-danger-400" />
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Add floor inline input */}
          {addingFloor ? (
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b-2 border-transparent">
              <input autoFocus value={newFloorName}
                onChange={e => setNewFloorName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitAddFloor(); if (e.key === 'Escape') { setAddingFloor(false); setNewFloorName(''); } }}
                placeholder="Floor name..."
                className="w-32 px-2 py-1 text-xs border-2 border-brand-400 rounded-lg outline-none"
              />
              <button type="button" onClick={commitAddFloor}
                className="px-2 py-1 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700">Add</button>
              <button type="button" onClick={() => { setAddingFloor(false); setNewFloorName(''); }}
                className="px-2 py-1 rounded-lg border border-ink-200 text-xs text-ink-500 hover:bg-ink-50">✕</button>
            </div>
          ) : (
            <button type="button" onClick={() => setAddingFloor(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-semibold text-ink-500 hover:bg-brand-50 hover:text-brand-600 transition-colors whitespace-nowrap">
              <Plus className="h-3.5 w-3.5" /> Add Floor
            </button>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-ink-50/40">
          <div className="space-y-8">
            {sectionsOnFloor.map(section => {
              const sectionTables = tablesOnFloor.filter(t => (t.section || 'Main') === section);
              return (
                <div key={section}>
                  <div className="flex items-center gap-3 mb-4">
                    {editingSection?.floor === activeFloor && editingSection.old === section ? (
                      <input autoFocus value={editingSectionName}
                        onChange={e => setEditingSectionName(e.target.value)}
                        onBlur={commitRenameSection}
                        onKeyDown={e => { if (e.key === 'Enter') commitRenameSection(); if (e.key === 'Escape') setEditingSection(null); }}
                        className="px-2 py-1 text-sm font-bold border-2 border-brand-400 rounded-lg outline-none w-40"
                      />
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="text-sm font-bold uppercase tracking-widest text-ink-500">{section}</span>
                        <button type="button" onClick={() => startRenameSection(section)}
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded hover:bg-ink-200 flex items-center justify-center transition-opacity">
                          <Edit3 className="h-3 w-3 text-ink-400" />
                        </button>
                        {confirmDeleteSection === section ? (
                          <div className="flex items-center gap-1">
                            <span className="text-2xs text-danger-600 font-semibold">Delete?</span>
                            <button type="button" onClick={() => doDeleteSection(section)}
                              className="px-2 py-0.5 rounded bg-danger-500 text-white text-2xs font-bold hover:bg-danger-600">Yes</button>
                            <button type="button" onClick={() => setConfirmDeleteSection(null)}
                              className="px-2 py-0.5 rounded bg-ink-200 text-ink-600 text-2xs font-bold">No</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setConfirmDeleteSection(section)}
                            className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded hover:bg-danger-100 flex items-center justify-center transition-opacity">
                            <Trash className="h-3 w-3 text-danger-400" />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex-1 h-px bg-ink-200" />
                    <span className="text-2xs text-ink-400 font-medium">{sectionTables.length} table{sectionTables.length !== 1 ? 's' : ''}</span>
                    <button type="button" onClick={() => addTable(section)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors">
                      <Plus className="h-3.5 w-3.5" /> Add Table
                    </button>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                    {sectionTables.map(t => (
                      <div key={t.id}
                        className={`relative rounded-2xl border-2 transition-all cursor-pointer select-none
                          ${TABLE_STATUS_COLORS[t.status]}
                          ${editingId === t.id ? 'ring-2 ring-brand-400 ring-offset-1' : 'hover:shadow-md'}`}
                        style={{ minHeight: '110px' }}
                        onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                      >
                        {editingId === t.id ? (
                          <div className="p-2 space-y-1.5" onClick={e => e.stopPropagation()}>
                            <input type="text" value={t.label} autoFocus
                              onChange={e => updateTable(t.id, { label: e.target.value })}
                              className="w-full px-2 py-1 text-sm font-bold border border-ink-300 rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-brand-400"
                            />
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-ink-400 shrink-0" />
                              <input type="number" value={t.seats} min={1} max={20}
                                onChange={e => updateTable(t.id, { seats: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="w-full px-1 py-0.5 text-xs border border-ink-200 rounded tnum text-center"
                              />
                            </div>
                            <select value={t.section || 'Main'}
                              onChange={e => updateTable(t.id, { section: e.target.value })}
                              className="w-full text-xs border border-ink-200 rounded px-1 py-0.5 bg-white">
                              {sectionsOnFloor.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button type="button" onClick={() => { removeTable(t.id); setEditingId(null); }}
                              className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-danger-50 text-danger-600 text-2xs font-bold hover:bg-danger-100 transition-colors">
                              <Trash className="h-3 w-3" /> Remove
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 flex flex-col items-center justify-center h-full gap-1">
                            <span className="font-bold text-base leading-none">{t.label}</span>
                            <div className="flex items-center gap-0.5 text-2xs text-ink-500"><Users className="h-3 w-3" />{t.seats}</div>
                            <div className="text-2xs text-ink-400 mt-1 opacity-70"><Edit3 className="h-2.5 w-2.5 inline mr-0.5" />Edit</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Add section inline */}
            {addingSection ? (
              <div className="flex items-center gap-2 py-3 px-4 rounded-2xl border-2 border-brand-300 bg-brand-50">
                <Plus className="h-4 w-4 text-brand-500 shrink-0" />
                <input autoFocus value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitAddSection(); if (e.key === 'Escape') { setAddingSection(false); setNewSectionName(''); } }}
                  placeholder="Section name (e.g. Window, Patio, Bar)..."
                  className="flex-1 bg-transparent text-sm font-semibold outline-none text-ink-700 placeholder:text-ink-400"
                />
                <button type="button" onClick={commitAddSection}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700">Add</button>
                <button type="button" onClick={() => { setAddingSection(false); setNewSectionName(''); }}
                  className="px-3 py-1.5 rounded-lg border border-ink-200 text-xs text-ink-500 hover:bg-ink-100">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingSection(true)}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-ink-300 text-ink-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all text-sm font-semibold flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Add Section
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ink-100 bg-white">
          <div className="text-xs text-ink-400">
            <span className="font-semibold text-ink-600">{tablesOnFloor.length}</span> tables on <span className="font-semibold text-ink-600">{activeFloor}</span>
            &nbsp;·&nbsp;<span className="font-semibold text-ink-600">{localTables.length}</span> total across <span className="font-semibold text-ink-600">{floors.length}</span> floor{floors.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setLocalTables(tables.map(t => ({ ...t, floor: t.floor || DEFAULT_FLOOR }))); setFloors(initFloors()); setActiveFloor(initFloors()[0]); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-50 transition-colors">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button type="button" onClick={() => onSave(localTables)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors shadow-sm">
              <Save className="h-4 w-4" /> Save Floor Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Payment Screen ---
function PaymentScreen({ total, orderId, onDone, onClose }: { total: number; orderId: string; onDone: (mode: string) => void; onClose: () => void }) {
  const [mode, setMode] = useState<'cash' | 'card' | 'upi'>('cash');
  const [paid, setPaid] = useState(false);

  const modeLabel: Record<string, string> = { cash: 'Cash', card: 'Card', upi: 'UPI' };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-ink-100">
          <div><h3 className="font-bold text-ink-900 text-lg">Payment</h3><p className="text-xs text-ink-400">{orderId}</p></div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center"><X className="h-5 w-5 text-ink-500" /></button>
        </div>
        <div className="p-5">
          <div className="text-center mb-5">
            <div className="text-3xs text-ink-400 uppercase font-semibold tracking-wide">Amount Due</div>
            <div className="text-4xl font-bold tnum text-ink-900 mt-1">{inr(total)}</div>
          </div>

          {/* Payment mode selector */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Payment Mode</p>
            <div className="flex gap-3">
              {(['cash', 'card', 'upi'] as const).map(m => (
                <div
                  key={m}
                  role="button"
                  tabIndex={0}
                  onClick={() => setMode(m)}
                  onKeyDown={e => e.key === 'Enter' && setMode(m)}
                  className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 cursor-pointer transition-all select-none
                    ${ mode === m
                      ? 'border-brand-500 bg-brand-50 shadow-md'
                      : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/40'}`}
                >
                  {m === 'cash' && <Banknote className={`h-6 w-6 ${mode === m ? 'text-brand-600' : 'text-ink-400'}`} />}
                  {m === 'card' && <CreditCard className={`h-6 w-6 ${mode === m ? 'text-brand-600' : 'text-ink-400'}`} />}
                  {m === 'upi'  && <Upi        className={`h-6 w-6 ${mode === m ? 'text-brand-600' : 'text-ink-400'}`} />}
                  <span className={`text-sm font-bold ${mode === m ? 'text-brand-700' : 'text-ink-500'}`}>
                    {modeLabel[m]}
                  </span>
                  {mode === m && (
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mode-specific content */}
          {mode === 'cash' && (
            <div className="space-y-2 mb-4">
              <div className="text-xs text-ink-400 font-medium">Quick cash</div>
              <div className="grid grid-cols-4 gap-2">
                {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000].map((amt, i) => (
                  <div key={i} className="py-2 rounded-lg border border-ink-200 text-sm font-semibold tnum text-center hover:border-brand-300 hover:bg-brand-50 transition-colors cursor-pointer">{inr(amt)}</div>
                ))}
              </div>
            </div>
          )}
          {mode === 'upi' && (
            <div className="text-center py-3 mb-4">
              <div className="h-32 w-32 mx-auto rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-center mb-2"><Upi className="h-20 w-20 text-ink-300" /></div>
              <p className="text-xs text-ink-400">Scan QR to pay {inr(total)}</p>
            </div>
          )}
          {mode === 'card' && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-ink-50 border border-ink-200 mb-4">
              <CreditCard className="h-6 w-6 text-ink-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-ink-700">Card Payment</p>
                <p className="text-xs text-ink-400">Swipe or tap card on terminal</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setPaid(true); setTimeout(() => onDone(modeLabel[mode]), 800); }}
            className="w-full h-14 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-card-md transition-all"
          >
            {paid ? <><Check className="h-5 w-5" /> Payment Received</> : <><Check className="h-5 w-5" /> Complete Payment · {inr(total)}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- KOT Preview ---
function KOTPreview({ lines, orderType, orderId, tableNo, total, onDone, onClose }: {
  lines: CartLine[]; orderType: OrderType; orderId: string; tableNo?: string; total: number; onDone: () => void; onClose: () => void;
}) {
  const [note, setNote] = useState('');

  const stations = useMemo(() => {
    const groups: Record<string, CartLine[]> = {};
    lines.forEach(l => {
      const station = ['starters', 'tandoor'].includes(l.item.category) ? 'Tandoor Station'
        : ['biryani', 'curries', 'mains'].includes(l.item.category) ? 'Main Kitchen' : 'Beverage/Dessert';
      if (!groups[station]) groups[station] = [];
      groups[station].push(l);
    });
    return groups;
  }, [lines]);

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/40 flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop max-w-md w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-ink-100">
          <div className="flex items-center gap-2"><Receipt className="h-5 w-5 text-ink-700" /><div><h3 className="font-bold text-ink-900 text-lg">KOT Preview</h3><p className="text-xs text-ink-400">{orderId} · {orderType}{tableNo ? ` · Table ${tableNo}` : ''}</p></div></div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center"><X className="h-5 w-5 text-ink-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {Object.entries(stations).map(([station, items]) => (
            <div key={station}>
              <div className="flex items-center gap-2 mb-2"><div className="h-6 w-1 rounded-full bg-warn-400" /><span className="text-xs font-bold uppercase tracking-wide text-ink-500">{station}</span><Badge tone="warn" size="xs">{items.length} items</Badge></div>
              <div className="space-y-1 pl-3">
                {items.map(l => (
                  <div key={l.item.id} className="flex items-center justify-between py-1.5 border-b border-dashed border-ink-100">
                    <div className="flex items-center gap-2"><span className="text-sm font-bold tnum text-ink-900 w-6">{l.qty}x</span><span className="text-sm text-ink-700">{l.item.name}</span></div>
                    <span className="text-xs text-ink-400 tnum">{inr(l.item.price * l.qty)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Kitchen Note */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-ink-400 block mb-1.5">Kitchen Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Less spicy, no onion, extra gravy..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-ink-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-warn-400 focus:border-transparent placeholder:text-ink-300"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-ink-100"><span className="font-bold text-ink-900">Order Total</span><span className="text-lg font-bold tnum text-ink-900">{inr(total)}</span></div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-12 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-50 transition-colors flex items-center justify-center gap-1.5"><Printer className="h-4 w-4" /> Print KOT</button>
            <button onClick={onDone} className="flex-1 h-12 rounded-xl bg-warn-500 hover:bg-warn-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-card-md transition-all"><FileCheck className="h-4 w-4" /> Send to Kitchen</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Discount Modal ───────────────────────────────────────────────────────────
function DiscountModal({ subtotal, currentDiscount, onApply, onClose }: {
  subtotal: number; currentDiscount: number;
  onApply: (d: number) => void; onClose: () => void;
}) {
  const [mode, setMode] = useState<'flat' | 'pct'>('flat');
  const [value, setValue] = useState(currentDiscount > 0 ? String(currentDiscount) : '');

  const computed = (() => {
    const v = parseFloat(value) || 0;
    if (mode === 'pct') return Math.round(subtotal * Math.min(v, 100) / 100);
    return Math.min(v, subtotal);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h3 className="font-bold text-ink-900 flex items-center gap-2"><Percent className="h-4 w-4 text-brand-600" /> Apply Discount</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center"><X className="h-4 w-4 text-ink-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('flat')}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${mode === 'flat' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'}`}>
              Flat (₹)
            </button>
            <button onClick={() => setMode('pct')}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${mode === 'pct' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'}`}>
              Percent (%)
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">{mode === 'flat' ? 'Discount Amount (₹)' : 'Discount (%)'}</label>
            <input type="number" value={value} min={0} max={mode === 'pct' ? 100 : subtotal} step={mode === 'pct' ? 1 : 10}
              onChange={e => setValue(e.target.value)} autoFocus
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum" />
          </div>
          {computed > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-brand-50 border border-brand-100 text-sm font-medium">
              <span className="text-ink-600">Discount Applied</span>
              <span className="font-bold text-brand-700 tnum">-{inr(computed)}</span>
            </div>
          )}
          {[10, 20, 50, 100].map(v => (
            <button key={v} onClick={() => { setMode('flat'); setValue(String(v)); }}
              className="mr-2 mb-1 px-3 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 text-xs font-semibold text-ink-700 transition-colors">
              -{inr(v)}
            </button>
          ))}
          {[5, 10, 15, 20].map(v => (
            <button key={`pct${v}`} onClick={() => { setMode('pct'); setValue(String(v)); }}
              className="mr-2 mb-1 px-3 py-1.5 rounded-lg bg-ink-100 hover:bg-ink-200 text-xs font-semibold text-ink-700 transition-colors">
              {v}%
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-ink-100">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-50 transition-colors">Cancel</button>
          <button onClick={() => onApply(computed)} disabled={computed <= 0}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-bold transition-colors">
            Apply {computed > 0 ? `-${inr(computed)}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coupon Modal ─────────────────────────────────────────────────────────────
const DEMO_COUPONS: Record<string, number> = {
  NABO10: 10, WELCOME20: 20, FLAT50: 50, VIP100: 100, STAFF15: 15,
};

function CouponModal({ subtotal, onApply, onClose }: {
  subtotal: number; onApply: (code: string, amount: number) => void; onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const apply = () => {
    const upper = code.trim().toUpperCase();
    if (!upper) { setError('Enter a coupon code'); return; }
    const disc = DEMO_COUPONS[upper];
    if (!disc) { setError(`"${upper}" is not a valid coupon`); return; }
    onApply(upper, disc);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h3 className="font-bold text-ink-900 flex items-center gap-2"><Tag className="h-4 w-4 text-brand-600" /> Apply Coupon</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center"><X className="h-4 w-4 text-ink-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-xs text-danger-600 bg-danger-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Coupon Code</label>
            <input type="text" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && apply()} autoFocus placeholder="e.g. NABO10"
              className="w-full px-3 py-2.5 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 uppercase font-mono tracking-widest" />
          </div>
          <div>
            <p className="text-2xs text-ink-400 mb-2 font-semibold">Demo codes:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DEMO_COUPONS).map(([c, d]) => (
                <button key={c} onClick={() => setCode(c)}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors border ${code === c ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                  {c} <span className="text-brand-600">-₹{d}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-ink-100">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-50 transition-colors">Cancel</button>
          <button onClick={apply} className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors">Apply</button>
        </div>
      </div>
    </div>
  );
}

// ─── Order History Modal ──────────────────────────────────────────────────────
function OrderHistoryModal({ history, onClose }: { history: CompletedOrder[]; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = history.filter(o =>
    !search || o.orderId.toLowerCase().includes(search.toLowerCase()) ||
    (o.tableNo && o.tableNo.includes(search)) ||
    o.paymentMode.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = history.reduce((s, o) => s + o.total, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            <h3 className="font-bold text-ink-900 text-lg flex items-center gap-2"><Receipt className="h-5 w-5 text-brand-600" /> Order History</h3>
            <p className="text-xs text-ink-400">{history.length} orders · Total revenue: <span className="font-bold text-ink-700">{inr(totalRevenue)}</span></p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center"><X className="h-4 w-4 text-ink-500" /></button>
        </div>
        <div className="px-5 py-3 border-b border-ink-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by order ID, table, payment mode..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-ink-400 py-12">
              <Receipt className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{history.length === 0 ? 'No orders yet' : 'No matching orders'}</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {filtered.map(order => (
                <div key={order.id} className="px-5 py-4 hover:bg-ink-50/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-900">{order.orderId}</span>
                        <Badge tone={order.orderType === 'dine-in' ? 'info' : 'brand'} size="xs">{order.orderType}</Badge>
                        {order.tableNo && <Badge tone="neutral" size="xs">Table {order.tableNo}</Badge>}
                      </div>
                      <p className="text-2xs text-ink-400 mt-0.5">{order.completedAt}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-ink-900 tnum">{inr(order.total)}</div>
                      <div className="text-2xs text-ink-400">{order.paymentMode}</div>
                      {order.discount > 0 && <div className="text-2xs text-brand-600">-{inr(order.discount)} disc</div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {order.lines.slice(0, 4).map((l, i) => (
                      <span key={i} className="text-2xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 font-medium">
                        {l.qty}× {l.name}
                      </span>
                    ))}
                    {order.lines.length > 4 && (
                      <span className="text-2xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-400">+{order.lines.length - 4} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between text-xs text-ink-400">
          <span>Stored in localStorage · Persists across sessions</span>
          <button onClick={() => { localStorage.removeItem('nabo_pos_order_history'); onClose(); }}
            className="text-danger-500 hover:text-danger-700 font-semibold transition-colors">Clear History</button>
        </div>
      </div>
    </div>
  );
}
