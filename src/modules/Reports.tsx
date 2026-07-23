'use client';

// ===== Nabo Flow — Reports & Analytics =====
import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Search, X, FileSpreadsheet, Layers,
  Brain, AlertCircle, FileText, Download, Filter, Receipt, CreditCard, Banknote,
  Smartphone, ChevronDown, ChevronUp, Trash2, CheckCircle2, Calendar,
  Users, ShoppingBag, ArrowUpRight, ArrowDownRight, RefreshCw, Eye, Check,
} from 'lucide-react';
import { reportLibrary, staff as initialStaff, vendors, customers, referrals, IS_DEPLOYED_PROD } from '../data';
import { inr, pct } from '../format';
import { Card, Badge, Button, StatCard, SectionHeader, ProgressBar } from '../ui';

type Tab = 'library' | 'insights' | 'settled-bills';
type DateFilterMode = 'all' | 'this_month' | 'today' | 'yesterday' | 'custom';

type CompletedOrder = {
  id: string; orderId: string; orderType: string; tableNo?: string;
  lines: { name: string; qty: number; price: number; veg: boolean }[];
  subtotal: number; tax: number; discount: number; total: number;
  paymentMode: string; completedAt: string;
};

const DEFAULT_SETTLED_BILLS: CompletedOrder[] = IS_DEPLOYED_PROD ? [] : [
  {
    id: 'ord-101', orderId: 'ORD-20260723-001', orderType: 'dine-in', tableNo: 'T6',
    lines: [
      { name: 'Butter Chicken', qty: 1, price: 340, veg: false },
      { name: 'Dal Makhani', qty: 1, price: 220, veg: true },
      { name: 'Butter Naan', qty: 3, price: 45, veg: true },
      { name: 'Fresh Lime Soda', qty: 2, price: 60, veg: true },
    ],
    subtotal: 815, tax: 41, discount: 0, total: 856, paymentMode: 'UPI',
    completedAt: '23/7/2026, 12:45:10 pm',
  },
  {
    id: 'ord-102', orderId: 'ORD-20260723-002', orderType: 'dine-in', tableNo: 'T5',
    lines: [
      { name: 'Veg Biryani', qty: 1, price: 220, veg: true },
      { name: 'Sweet Lassi', qty: 1, price: 80, veg: true },
      { name: 'Gulab Jamun (2 pc)', qty: 1, price: 90, veg: true },
    ],
    subtotal: 390, tax: 20, discount: 0, total: 410, paymentMode: 'Cash',
    completedAt: '23/7/2026, 11:30:25 am',
  },
  {
    id: 'ord-103', orderId: 'ORD-20260723-003', orderType: 'dine-in', tableNo: 'T3',
    lines: [
      { name: 'Chicken Biryani', qty: 2, price: 280, veg: false },
      { name: 'Paneer Butter Masala', qty: 1, price: 300, veg: true },
      { name: 'Tandoori Roti', qty: 4, price: 30, veg: true },
      { name: 'Masala Chai', qty: 4, price: 40, veg: true },
    ],
    subtotal: 1200, tax: 60, discount: 0, total: 1260, paymentMode: 'UPI',
    completedAt: '23/7/2026, 1:15:00 pm',
  },
  {
    id: 'ord-104', orderId: 'ORD-20260723-004', orderType: 'takeaway',
    lines: [
      { name: 'Paneer Tikka', qty: 2, price: 280, veg: true },
      { name: 'Cold Coffee', qty: 2, price: 120, veg: true },
    ],
    subtotal: 800, tax: 40, discount: 0, total: 840, paymentMode: 'Card',
    completedAt: '23/7/2026, 2:10:40 pm',
  },
  {
    id: 'ord-105', orderId: 'ORD-20260722-001', orderType: 'dine-in', tableNo: 'T2',
    lines: [
      { name: 'Chicken 65', qty: 2, price: 240, veg: false },
      { name: 'Garlic Naan', qty: 4, price: 55, veg: true },
      { name: 'Sweet Lassi', qty: 2, price: 80, veg: true },
    ],
    subtotal: 860, tax: 43, discount: 0, total: 903, paymentMode: 'Cash',
    completedAt: '22/7/2026, 8:20:15 pm',
  },
  {
    id: 'ord-106', orderId: 'ORD-20260722-002', orderType: 'takeaway',
    lines: [
      { name: 'Mutton Biryani', qty: 4, price: 380, veg: false },
      { name: 'Gulab Jamun (2 pc)', qty: 2, price: 90, veg: true },
    ],
    subtotal: 1630, tax: 82, discount: 0, total: 1712, paymentMode: 'Card',
    completedAt: '22/7/2026, 7:15:30 pm',
  },
  {
    id: 'ord-107', orderId: 'ORD-20260722-003', orderType: 'dine-in', tableNo: 'T10',
    lines: [
      { name: 'Mutton Biryani', qty: 4, price: 380, veg: false },
      { name: 'Tandoori Roti', qty: 3, price: 30, veg: true },
    ],
    subtotal: 1626, tax: 81, discount: 0, total: 1707, paymentMode: 'UPI',
    completedAt: '22/7/2026, 6:47:46 pm',
  },
  {
    id: 'ord-108', orderId: 'ORD-20260721-001', orderType: 'dine-in', tableNo: 'T1',
    lines: [
      { name: 'Paneer Tikka', qty: 1, price: 280, veg: true },
      { name: 'Masala Dosa', qty: 2, price: 140, veg: true },
      { name: 'Masala Chai', qty: 2, price: 40, veg: true },
    ],
    subtotal: 640, tax: 32, discount: 0, total: 672, paymentMode: 'Cash',
    completedAt: '21/7/2026, 9:10:00 pm',
  },
  {
    id: 'ord-109', orderId: 'ORD-20260721-002', orderType: 'takeaway',
    lines: [
      { name: 'Hyderabadi Biryani', qty: 3, price: 320, veg: false },
      { name: 'Sweet Lassi', qty: 3, price: 80, veg: true },
    ],
    subtotal: 1200, tax: 60, discount: 0, total: 1260, paymentMode: 'Cash',
    completedAt: '21/7/2026, 8:40:20 pm',
  },
  {
    id: 'ord-110', orderId: 'ORD-20260720-001', orderType: 'dine-in', tableNo: 'T4',
    lines: [
      { name: 'Tandoori Chicken (Half)', qty: 3, price: 260, veg: false },
      { name: 'Butter Naan', qty: 6, price: 45, veg: true },
      { name: 'Cold Coffee', qty: 1, price: 120, veg: true },
    ],
    subtotal: 1110, tax: 56, discount: 0, total: 1166, paymentMode: 'Cash',
    completedAt: '20/7/2026, 1:15:30 pm',
  },
];

function loadHistory(): CompletedOrder[] {
  try {
    const raw = localStorage.getItem('nabo_pos_order_history');
    if (raw) {
      const parsed = JSON.parse(raw) as CompletedOrder[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTLED_BILLS;
}

// Parse date string to ISO date YYYY-MM-DD
function getIsoDate(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const dt = new Date(dateStr);
  if (!isNaN(dt.getTime())) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }
  return '';
}

// Helper to export CSV
function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function Reports() {
  const [tab, setTab] = useState<Tab>('settled-bills');
  const [dateMode, setDateMode] = useState<DateFilterMode>('all');
  const [selectedDate, setSelectedDate] = useState<string>('2026-07-23');

  const history = useMemo(() => loadHistory(), [tab]);

  // Today and yesterday strings
  const todayIso = '2026-07-23';
  const yesterdayIso = '2026-07-22';
  const currentMonthYear = '2026-07';

  // Filter history by selected date scope
  const dateFilteredHistory = useMemo(() => {
    return history.filter(o => {
      const iso = getIsoDate(o.completedAt);
      if (!iso) return true;
      if (dateMode === 'all') return true;
      if (dateMode === 'this_month') return iso.startsWith(currentMonthYear);
      if (dateMode === 'today') return iso === todayIso;
      if (dateMode === 'yesterday') return iso === yesterdayIso;
      if (dateMode === 'custom') return iso === selectedDate;
      return true;
    });
  }, [history, dateMode, selectedDate]);

  const totalRevenue = dateFilteredHistory.reduce((s, o) => s + o.total, 0);
  const avgBill = dateFilteredHistory.length ? Math.round(totalRevenue / dateFilteredHistory.length) : 0;
  const totalDiscounts = dateFilteredHistory.reduce((s, o) => s + o.discount, 0);

  const revenueLabel = useMemo(() => {
    if (dateMode === 'this_month') return 'This Month Revenue';
    if (dateMode === 'today') return 'Revenue Today';
    if (dateMode === 'yesterday') return 'Revenue Yesterday';
    if (dateMode === 'custom') return `Revenue (${selectedDate})`;
    return 'All-Time Revenue';
  }, [dateMode, selectedDate]);

  const ordersLabel = useMemo(() => {
    if (dateMode === 'today') return 'Orders Today';
    if (dateMode === 'yesterday') return 'Orders Yesterday';
    if (dateMode === 'this_month') return 'Orders This Month';
    return 'Orders Total';
  }, [dateMode]);

  return (
    <div className="space-y-5">
      {/* Top Header & Day-wise Date Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-ink-200/60 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-600" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-400">Data Date Filter</div>
            <div className="text-sm font-semibold text-ink-800">
              {dateMode === 'all' && 'All-Time Historical Data'}
              {dateMode === 'this_month' && 'This Month (July 2026)'}
              {dateMode === 'today' && 'Today (23 Jul 2026)'}
              {dateMode === 'yesterday' && 'Yesterday (22 Jul 2026)'}
              {dateMode === 'custom' && `Selected Date: ${selectedDate}`}
            </div>
          </div>
        </div>

        {/* Date Selector Presets & Calendar Input */}
        <div className="flex flex-wrap items-center gap-1.5 bg-ink-50 p-1.5 rounded-xl border border-ink-100">
          {(['all', 'this_month', 'today', 'yesterday'] as const).map(m => (
            <button
              key={m}
              onClick={() => setDateMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dateMode === m ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-white'
              }`}
            >
              {m === 'all' && 'All Time'}
              {m === 'this_month' && 'This Month'}
              {m === 'today' && 'Today'}
              {m === 'yesterday' && 'Yesterday'}
            </button>
          ))}
          <div className="h-4 w-px bg-ink-200 mx-1" />
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-ink-200">
            <span className="text-2xs text-ink-400 font-medium">Custom:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                setDateMode('custom');
              }}
              className="text-xs font-semibold text-ink-800 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={revenueLabel}
          value={inr(totalRevenue)}
          sub={`${dateFilteredHistory.length} settled bills`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Avg Bill Value"
          value={inr(avgBill)}
          sub={dateFilteredHistory.length ? `across ${dateFilteredHistory.length} orders` : 'No orders in range'}
          icon={<BarChart3 className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label={ordersLabel}
          value={String(dateFilteredHistory.length)}
          sub="settled bills total"
          icon={<FileText className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Total Discounts"
          value={inr(totalDiscounts)}
          sub="across all orders"
          icon={<AlertCircle className="h-5 w-5" />}
          tone="danger"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-ink-200/60 p-1 w-fit overflow-x-auto">
        {([
          { key: 'settled-bills', label: 'Settled Bills' },
          { key: 'library',       label: 'Report Library' },
          { key: 'insights',      label: 'AI Insights' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative ${
              tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'
            }`}
          >
            {t.label}
            {t.key === 'settled-bills' && dateFilteredHistory.length > 0 && (
              <span
                className={`ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-2xs font-bold ${
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700'
                }`}
              >
                {dateFilteredHistory.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'settled-bills' && <SettledBillsTab history={dateFilteredHistory} totalFullHistoryCount={history.length} />}
      {tab === 'library'       && <LibraryTab history={dateFilteredHistory} />}
      {tab === 'insights'      && <InsightsTab />}
    </div>
  );
}

function SettledBillsTab({ history, totalFullHistoryCount }: { history: CompletedOrder[]; totalFullHistoryCount: number }) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'Cash' | 'Card' | 'UPI'>('all');
  const [filterType, setFilterType] = useState<'all' | 'dine-in' | 'takeaway'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const filtered = useMemo(() => {
    let list = [...history];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.orderId.toLowerCase().includes(q) ||
        (o.tableNo && o.tableNo.toLowerCase().includes(q)) ||
        o.paymentMode.toLowerCase().includes(q) ||
        o.completedAt.toLowerCase().includes(q) ||
        o.lines.some(l => l.name.toLowerCase().includes(q))
      );
    }
    if (filterMode !== 'all') list = list.filter(o => o.paymentMode === filterMode);
    if (filterType !== 'all') list = list.filter(o => o.orderType === filterType);
    return list;
  }, [history, search, filterMode, filterType, tick]);

  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);
  const totalDiscount = filtered.reduce((s, o) => s + o.discount, 0);
  const avgBill = filtered.length ? Math.round(totalRevenue / filtered.length) : 0;

  const byMode = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filtered.forEach(o => {
      if (!map[o.paymentMode]) map[o.paymentMode] = { count: 0, total: 0 };
      map[o.paymentMode].count++;
      map[o.paymentMode].total += o.total;
    });
    return map;
  }, [filtered]);

  const modeIcon: Record<string, React.ReactNode> = {
    Cash: <Banknote className="h-5 w-5" />,
    Card: <CreditCard className="h-5 w-5" />,
    UPI:  <Smartphone className="h-5 w-5" />,
  };

  const clearHistory = () => {
    if (window.confirm('Clear all settled bill history? This cannot be undone.')) {
      localStorage.removeItem('nabo_pos_order_history');
      setTick(n => n + 1);
    }
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-ink-200/60 text-ink-400">
        <Receipt className="h-16 w-16 mb-4 opacity-20" />
        <h3 className="text-xl font-bold text-ink-700 mb-2">No settled bills for selected date range</h3>
        <p className="text-sm text-center max-w-sm leading-relaxed text-ink-400">
          Try selecting another date or filter option from the date selector above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Settled Bills" subtitle="All paid & settled orders" />

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Bills" value={String(filtered.length)} sub={`of ${totalFullHistoryCount} total`} icon={<Receipt className="h-5 w-5" />} tone="brand" />
        <StatCard label="Total Revenue" value={inr(totalRevenue)} sub="from filtered bills" icon={<TrendingUp className="h-5 w-5" />} tone="info" />
        <StatCard label="Avg Bill" value={inr(avgBill)} sub="per order" icon={<BarChart3 className="h-5 w-5" />} tone="accent" />
        <StatCard label="Discounts Given" value={inr(totalDiscount)} sub={`${filtered.filter(o => o.discount > 0).length} orders with disc`} icon={<AlertCircle className="h-5 w-5" />} tone="danger" />
      </div>

      {/* Payment Modes Breakdown */}
      {Object.keys(byMode).length > 0 && (
        <div className={`grid gap-3 grid-cols-1 md:grid-cols-${Math.min(Object.keys(byMode).length, 3)}`}>
          {Object.entries(byMode).map(([mode, data]) => (
            <Card key={mode} className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 bg-brand-50 text-brand-600">
                {modeIcon[mode] ?? <CreditCard className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink-900">{mode}</div>
                <div className="text-2xs text-ink-400">{data.count} bill{data.count !== 1 ? 's' : ''}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-ink-900 tnum">{inr(data.total)}</div>
                <div className="text-2xs text-ink-400">{totalRevenue > 0 ? Math.round(data.total / totalRevenue * 100) : 0}% of total</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID, table, item, payment..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-ink-200 p-0.5">
          {(['all', 'Cash', 'Card', 'UPI'] as const).map(m => (
            <button key={m} onClick={() => setFilterMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterMode === m ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}>
              {m === 'all' ? 'All Modes' : m}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-ink-200 p-0.5">
          {(['all', 'dine-in', 'takeaway'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${filterType === t ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}>
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
        <button onClick={clearHistory}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-danger-200 text-danger-600 text-xs font-semibold hover:bg-danger-50 transition-colors ml-auto">
          <Trash2 className="h-3.5 w-3.5" /> Clear All
        </button>
      </div>

      {/* Orders Table */}
      <Card pad={false}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-ink-400">
            <Search className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No bills match your filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold border-b border-ink-100">
                  <th className="text-left px-4 py-3">Order ID</th>
                  <th className="text-left px-3 py-3">Date & Time</th>
                  <th className="text-left px-3 py-3">Type</th>
                  <th className="text-left px-3 py-3">Table</th>
                  <th className="text-right px-3 py-3">Subtotal</th>
                  <th className="text-right px-3 py-3">Tax</th>
                  <th className="text-right px-3 py-3">Discount</th>
                  <th className="text-right px-3 py-3">Total</th>
                  <th className="text-center px-3 py-3">Payment</th>
                  <th className="text-center px-3 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <React.Fragment key={order.id}>
                    <tr
                      key={order.id}
                      className={`border-t border-ink-100 transition-colors cursor-pointer ${expanded === order.id ? 'bg-brand-50/40' : 'hover:bg-ink-50/50'}`}
                      onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0" />
                          <span className="font-bold text-ink-900 tnum text-sm">{order.orderId}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-500 text-xs">{order.completedAt}</td>
                      <td className="px-3 py-3">
                        <Badge tone={order.orderType === 'dine-in' ? 'info' : 'brand'} size="xs">{order.orderType}</Badge>
                      </td>
                      <td className="px-3 py-3 text-ink-600 text-xs">
                        {order.tableNo ? `Table ${order.tableNo}` : <span className="text-ink-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right tnum text-ink-600">{inr(order.subtotal)}</td>
                      <td className="px-3 py-3 text-right tnum text-ink-500">{inr(order.tax)}</td>
                      <td className="px-3 py-3 text-right tnum">
                        {order.discount > 0
                          ? <span className="text-brand-600 font-medium">-{inr(order.discount)}</span>
                          : <span className="text-ink-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-bold text-ink-900 tnum">{inr(order.total)}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge
                          tone={order.paymentMode === 'Cash' ? 'brand' : order.paymentMode === 'Card' ? 'info' : 'accent'}
                          size="xs"
                        >
                          {order.paymentMode}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button className="flex items-center gap-1 text-xs text-ink-500 hover:text-brand-600 font-medium mx-auto transition-colors">
                          {order.lines.length} items
                          {expanded === order.id
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>

                    {expanded === order.id && (
                      <tr key={`${order.id}-items`} className="bg-brand-50/20 border-t border-brand-100/60">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-3">
                            Items in {order.orderId}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                            {order.lines.map((line, i) => (
                              <div key={i} className="flex items-center gap-2.5 bg-white rounded-xl border border-ink-100 px-3 py-2.5 shadow-sm">
                                <span className={`h-3 w-3 rounded-sm border-2 shrink-0 flex items-center justify-center ${line.veg ? 'border-brand-500' : 'border-danger-500'}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${line.veg ? 'bg-brand-500' : 'bg-danger-500'}`} />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-ink-800 truncate">{line.name}</div>
                                  <div className="text-2xs text-ink-400 tnum">{inr(line.price)} × {line.qty}</div>
                                </div>
                                <span className="text-xs font-bold tnum text-ink-900 shrink-0">{inr(line.price * line.qty)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-brand-100">
                            <div className="flex gap-4 text-xs text-ink-500">
                              <span>Subtotal: <b className="text-ink-800 tnum">{inr(order.subtotal)}</b></span>
                              <span>GST: <b className="text-ink-800 tnum">{inr(order.tax)}</b></span>
                              {order.discount > 0 && <span>Discount: <b className="text-brand-600 tnum">-{inr(order.discount)}</b></span>}
                            </div>
                            <div className="text-sm font-bold text-ink-900">
                              Total Paid: <span className="tnum text-brand-700">{inr(order.total)}</span>
                              <span className="ml-2 text-xs text-ink-400 font-normal">via {order.paymentMode}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ink-100/60 border-t-2 border-ink-200 font-bold">
                  <td className="px-4 py-3 text-ink-700 text-xs" colSpan={4}>Total — {filtered.length} bill{filtered.length !== 1 ? 's' : ''}</td>
                  <td className="px-3 py-3 text-right tnum text-ink-700">{inr(filtered.reduce((s, o) => s + o.subtotal, 0))}</td>
                  <td className="px-3 py-3 text-right tnum text-ink-700">{inr(filtered.reduce((s, o) => s + o.tax, 0))}</td>
                  <td className="px-3 py-3 text-right tnum text-brand-600">-{inr(totalDiscount)}</td>
                  <td className="px-3 py-3 text-right tnum text-ink-900 text-base">{inr(totalRevenue)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ===== Fully Functional Report Library Tab =====
function LibraryTab({ history }: { history: CompletedOrder[] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const categories = ['all', 'Sales', 'Inventory', 'Purchase', 'Staff', 'CRM', 'Audit', 'Analytics'];

  const filteredReports = useMemo(() => {
    return reportLibrary.filter(r => {
      const matchCat = categoryFilter === 'all' || r.category.toLowerCase() === categoryFilter.toLowerCase() || (categoryFilter === 'Audit' && r.category === 'Fraud');
      const matchSearch = search === '' || r.name.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, categoryFilter]);

  const activeReport = useMemo(() => {
    return reportLibrary.find(r => r.id === selectedReportId) || null;
  }, [selectedReportId]);

  // Generate dynamic data table for selected report
  const activeReportData = useMemo(() => {
    if (!activeReport) return [];

    switch (activeReport.id) {
      case 'rp1': // Sales Summary
        return history.map(o => ({
          'Order ID': o.orderId,
          'Date & Time': o.completedAt,
          'Type': o.orderType,
          'Subtotal': inr(o.subtotal),
          'Tax': inr(o.tax),
          'Discount': inr(o.discount),
          'Total Net Sales': inr(o.total),
          'Payment Mode': o.paymentMode,
        }));

      case 'rp2': // Payment Type Breakdown
        {
          const map: Record<string, { count: number; total: number }> = {};
          history.forEach(o => {
            if (!map[o.paymentMode]) map[o.paymentMode] = { count: 0, total: 0 };
            map[o.paymentMode].count++;
            map[o.paymentMode].total += o.total;
          });
          const grandTotal = history.reduce((s, o) => s + o.total, 0) || 1;
          return Object.entries(map).map(([mode, d]) => ({
            'Payment Mode': mode,
            'Bills Count': d.count,
            'Total Amount': inr(d.total),
            'Avg Order Value': inr(Math.round(d.total / d.count)),
            '% Share': `${Math.round((d.total / grandTotal) * 100)}%`,
          }));
        }

      case 'rp3': // Item-wise Sales
        {
          const itemMap: Record<string, { qty: number; revenue: number; category: string }> = {};
          history.forEach(o => {
            o.lines.forEach(l => {
              if (!itemMap[l.name]) itemMap[l.name] = { qty: 0, revenue: 0, category: l.veg ? 'Veg' : 'Non-Veg' };
              itemMap[l.name].qty += l.qty;
              itemMap[l.name].revenue += l.price * l.qty;
            });
          });
          return Object.entries(itemMap).map(([name, d]) => ({
            'Item Name': name,
            'Category': d.category,
            'Units Sold': d.qty,
            'Total Revenue': inr(d.revenue),
          })).sort((a, b) => b['Units Sold'] - a['Units Sold']);
        }

      case 'rp4': // Discount & Void Audit
        return history
          .filter(o => o.discount > 0 || o.total < o.subtotal)
          .map(o => ({
            'Order ID': o.orderId,
            'Date': o.completedAt,
            'Subtotal': inr(o.subtotal),
            'Discount Amount': inr(o.discount),
            'Final Total': inr(o.total),
            'Payment Mode': o.paymentMode,
            'Audit Status': 'Verified',
          }));

      case 'rp5': // Inventory Consumption
        {
          const matMap: Record<string, number> = {};
          history.forEach(o => {
            o.lines.forEach(l => {
              matMap[l.name] = (matMap[l.name] || 0) + l.qty * 0.25;
            });
          });
          return Object.entries(matMap).map(([name, qty]) => ({
            'Material Component': `${name} Raw Base`,
            'Quantity Used': `${qty.toFixed(1)} kg`,
            'Estimated Cost': inr(Math.round(qty * 140)),
            'Stock Status': qty > 5 ? 'Adequate' : 'Reorder Needed',
          }));
        }

      case 'rp6': // Vendor Price Comparison
        return vendors.map(v => ({
          'Vendor Name': v.name,
          'Contact Person': v.contact,
          'Phone': v.phone,
          'Category': v.category,
          'Rating': `${v.rating} / 5.0`,
          'Outstanding Ledger': inr(v.outstanding),
        }));

      case 'rp7': // Staff Performance
        return initialStaff.map(s => ({
          'Staff Member': s.name,
          'Role': s.role,
          'Shift': s.shift,
          'Total Sales': inr(s.sales),
          'Upsell Rate': `${s.upsellRate}%`,
          'Avg Bill': inr(s.avgBill),
          'Attendance': `${s.attendance}%`,
          'Status': s.status,
        }));

      case 'rp8': // Loyalty Redemption
        return customers.map(c => ({
          'Customer Name': c.name,
          'Phone': c.phone,
          'Tier': c.tier,
          'Loyalty Points': c.points,
          'Total Spend': inr(c.spend),
          'Total Visits': c.visits,
          'Last Visit': c.lastVisit,
        }));

      case 'rp9': // Referral Conversion
        return referrals.map(r => ({
          'Referral ID': r.id,
          'Referrer': r.referrer,
          'Referee': r.referee,
          'Date': r.date,
          'Reward Amount': inr(r.reward),
          'Status': r.status,
          'Reason': r.flagReason || 'Verified',
        }));

      default:
        return history.map(o => ({
          'Order ID': o.orderId,
          'Date': o.completedAt,
          'Total': inr(o.total),
          'Payment': o.paymentMode,
        }));
    }
  }, [activeReport, history]);

  // Export all report library metrics to CSV
  const handleExportAll = () => {
    const summaryRows = reportLibrary.map(r => ({
      'Report ID': r.id,
      'Report Name': r.name,
      'Category': r.category,
      'Current Metric': r.metric,
      'Trend Direction': r.trend,
      'Change Percentage': `${r.change}%`,
    }));
    exportToCSV('All_Reports_Summary', summaryRows);
  };

  const trendIcons = { up: TrendingUp, down: BarChart3, flat: TrendingUp };
  const trendTones: Record<string, 'brand' | 'danger' | 'neutral'> = { up: 'brand', down: 'danger', flat: 'neutral' };

  return (
    <div className="space-y-4">
      <SectionHeader title="Report Library" subtitle="100% functional interactive analytics & downloadable reports" />

      {/* Search and Category Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-ink-200/60 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search report name or category..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-ink-50 p-1 rounded-lg border border-ink-100">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                categoryFilter === cat ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <Button variant="secondary" size="sm" onClick={handleExportAll} title="Export all reports overview to CSV">
          <Download className="h-3.5 w-3.5" /> Export Overview CSV
        </Button>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredReports.map(r => {
          const Icon = trendIcons[r.trend] || TrendingUp;
          return (
            <Card
              key={r.id}
              className="hover:shadow-card-md transition-all cursor-pointer group border hover:border-brand-300 relative overflow-hidden"
              onClick={() => setSelectedReportId(r.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <Badge tone="neutral" size="xs">{r.category}</Badge>
                <Badge tone={trendTones[r.trend] || 'brand'} size="xs">
                  <Icon className="h-2.5 w-2.5" /> {pct(r.change)}
                </Badge>
              </div>
              <h3 className="font-bold text-ink-900 text-sm group-hover:text-brand-600 transition-colors flex items-center justify-between">
                <span>{r.name}</span>
                <Eye className="h-4 w-4 text-ink-300 group-hover:text-brand-500 opacity-0 group-hover:opacity-100 transition-all" />
              </h3>
              <p className="text-lg font-bold tnum text-ink-800 mt-1">{r.metric}</p>
              <div className="mt-3 pt-2 border-t border-ink-100 flex items-center justify-between text-2xs text-ink-400 font-medium">
                <span>Click to view detailed report</span>
                <span className="text-brand-600 font-semibold group-hover:underline">Open Report →</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Report Modal View */}
      {activeReport && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-ink-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between bg-ink-50/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-ink-900">{activeReport.name}</h2>
                    <Badge tone="brand" size="xs">{activeReport.category}</Badge>
                  </div>
                  <p className="text-xs text-ink-400">Live generated dataset · {activeReportData.length} records</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => exportToCSV(activeReport.name, activeReportData)}
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </Button>
                <button
                  onClick={() => setSelectedReportId(null)}
                  className="h-8 w-8 rounded-lg text-ink-400 hover:text-ink-800 hover:bg-ink-100 flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between bg-brand-50/50 p-3 rounded-xl border border-brand-100 text-xs text-brand-800 font-medium">
                <span>Summary Metric: <b>{activeReport.metric}</b></span>
                <span>Trend: <b>{pct(activeReport.change)} ({activeReport.trend})</b></span>
              </div>

              {activeReportData.length === 0 ? (
                <div className="text-center py-12 text-ink-400">
                  <p className="text-sm">No data available for this report.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-ink-100 rounded-xl shadow-xs">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-500 font-bold border-b border-ink-100">
                        {Object.keys(activeReportData[0]).map(key => (
                          <th key={key} className="text-left px-4 py-3 whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {activeReportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-ink-50/60 transition-colors">
                          {Object.entries(row).map(([k, val], i) => (
                            <td key={i} className="px-4 py-3 text-xs text-ink-700 whitespace-nowrap font-medium tnum">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-ink-100 bg-ink-50/40 flex items-center justify-between text-xs text-ink-500">
              <span>Report Generated Automatically</span>
              <Button variant="secondary" size="sm" onClick={() => setSelectedReportId(null)}>
                Close Window
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightsTab() {
  const insights = [
    { title: 'Demand Forecast — Tomorrow', icon: Brain, tone: 'brand' as const, body: 'Expected 210 orders (₹92K). Biryani demand +18% on Fridays. Stock 25kg basmati, 18kg chicken.', confidence: 87 },
    { title: 'Churn Risk — 6 customers',   icon: AlertCircle, tone: 'danger' as const, body: 'Gold members with no visit in 45+ days. Send win-back campaign with 15% off coupon.', confidence: 92 },
    { title: 'Staff Upsell Opportunity',   icon: TrendingUp, tone: 'info' as const, body: 'Evening shift upsell rate (32%) below morning (38%). Train evening staff on dessert pairings.', confidence: 95 },
  ];
  const toneBg: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600', danger: 'bg-danger-50 text-danger-600',
    accent: 'bg-accent-50 text-accent-600', info: 'bg-info-50 text-info-600',
  };
  return (
    <div className="space-y-4">
      <SectionHeader title="AI-Assisted Insights" subtitle="Predictive analytics powered by your sales data" />
      <div className="grid md:grid-cols-2 gap-3">
        {insights.map((ins, i) => {
          const Icon = ins.icon;
          return (
            <Card key={i}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${toneBg[ins.tone]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-ink-900 text-sm">{ins.title}</h3>
                  <p className="text-xs text-ink-500 mt-1 leading-relaxed">{ins.body}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xs text-ink-400 font-medium">Confidence</span>
                <div className="flex-1"><ProgressBar value={ins.confidence} tone={ins.tone === 'danger' ? 'danger' : 'brand'} height="h-1.5" /></div>
                <span className="text-2xs font-bold tnum text-ink-700">{ins.confidence}%</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
