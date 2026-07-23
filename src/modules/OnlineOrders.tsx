'use client';

// ===== Nabo Flow — Online Orders =====
import { useState } from 'react';
import {
  ShoppingBag, Clock, Check, X, AlertTriangle, Bike,
  Store, Smartphone, ChevronRight, Timer,
} from 'lucide-react';
import { onlineOrders } from '../data';
import { inr } from '../format';
import { Card, Badge, Button, StatCard, SectionHeader } from '../ui';
import type { OnlineOrder } from '../types';

const sourceConfig: Record<string, { label: string; icon: typeof Store; color: string; bg: string }> = {
  zomato: { label: 'Zomato', icon: Store, color: 'text-danger-600', bg: 'bg-danger-50' },
  swiggy: { label: 'Swiggy', icon: ShoppingBag, color: 'text-info-600', bg: 'bg-info-50' },
  direct: { label: 'Direct App', icon: Smartphone, color: 'text-brand-600', bg: 'bg-brand-50' },
};

const statusFlow: OnlineOrder['status'][] = ['new', 'accepted', 'preparing', 'ready', 'dispatched', 'delivered'];
const statusTone: Record<string, 'neutral' | 'warn' | 'info' | 'brand' | 'accent'> = {
  new: 'warn', accepted: 'info', preparing: 'info', ready: 'brand', dispatched: 'accent', delivered: 'neutral',
};

export function OnlineOrders() {
  const [orders, setOrders] = useState(onlineOrders);
  const newCount = orders.filter(o => o.status === 'new').length;
  const activeCount = orders.filter(o => ['accepted', 'preparing', 'ready', 'dispatched'].includes(o.status)).length;
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.amount, 0);

  const accept = (id: string) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'accepted' } : o));
  const reject = (id: string) => setOrders(prev => prev.filter(o => o.id !== id));
  const advance = (id: string) => setOrders(prev => prev.map(o => {
    if (o.id !== id) return o;
    const idx = statusFlow.indexOf(o.status);
    return { ...o, status: statusFlow[Math.min(idx + 1, statusFlow.length - 1)] };
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="New Orders" value={String(newCount)} sub="Awaiting accept" icon={<Clock className="h-5 w-5" />} tone="warn" />
        <StatCard label="In Progress" value={String(activeCount)} sub="Being prepared" icon={<Bike className="h-5 w-5" />} tone="info" />
        <StatCard label="Delivered Today" value={String(orders.filter(o => o.status === 'delivered').length)} sub="Completed" icon={<Check className="h-5 w-5" />} tone="brand" />
        <StatCard label="Revenue" value={inr(totalRevenue)} sub="From delivered" icon={<ShoppingBag className="h-5 w-5" />} tone="accent" />
      </div>

      {/* Shared inventory oversell warning */}
      <Card className="border-warn-200 bg-warn-50/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warn-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-warn-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-ink-900 text-sm">Shared Inventory Warning</h3>
            <p className="text-xs text-ink-500">Fish Amritsari is 86'd in POS but still visible on Zomato. Syncing now to prevent oversell.</p>
          </div>
          <Button variant="accent" size="sm">Sync Now</Button>
        </div>
      </Card>

      <SectionHeader title="Unified Order Queue" subtitle="All channels in one operational dashboard" />

      <div className="space-y-3">
        {orders.map(order => {
          const src = sourceConfig[order.source];
          const Icon = src.icon;
          const statusIdx = statusFlow.indexOf(order.status);
          return (
            <Card key={order.id} className="hover:shadow-card-md transition-shadow">
              <div className="flex items-center gap-4">
                {/* Source icon */}
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${src.bg}`}>
                  <Icon className={`h-6 w-6 ${src.color}`} />
                </div>

                {/* Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-ink-900">{order.id}</span>
                    <Badge tone="neutral" size="xs">{src.label}</Badge>
                    <Badge tone={statusTone[order.status]} size="xs" dot>{order.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-ink-500">
                    <span>{order.customer}</span>
                    <span>{order.items} items</span>
                    <span className="font-semibold tnum text-ink-700">{inr(order.amount)}</span>
                    <span className="flex items-center gap-1 text-ink-400"><Clock className="h-3 w-3" />{order.time}</span>
                    {order.eta !== undefined && order.status !== 'delivered' && (
                      <span className="flex items-center gap-1 text-warn-600"><Timer className="h-3 w-3" />{order.eta} min ETA</span>
                    )}
                  </div>
                </div>

                {/* Status progress */}
                <div className="hidden lg:flex items-center gap-1">
                  {statusFlow.map((s, i) => (
                    <div key={s} className="flex items-center">
                      <div className={`h-2 w-2 rounded-full ${i <= statusIdx ? 'bg-brand-500' : 'bg-ink-200'}`} />
                      {i < statusFlow.length - 1 && <div className={`w-6 h-0.5 ${i < statusIdx ? 'bg-brand-500' : 'bg-ink-200'}`} />}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {order.status === 'new' && (
                    <>
                      <Button size="sm" variant="danger" onClick={() => reject(order.id)}><X className="h-3.5 w-3.5" /> Reject</Button>
                      <Button size="sm" variant="primary" onClick={() => accept(order.id)}><Check className="h-3.5 w-3.5" /> Accept</Button>
                    </>
                  )}
                  {['accepted', 'preparing', 'ready', 'dispatched'].includes(order.status) && (
                    <Button size="sm" variant="secondary" onClick={() => advance(order.id)}>
                      {order.status === 'accepted' ? 'Start Prep' : order.status === 'preparing' ? 'Mark Ready' : order.status === 'ready' ? 'Dispatch' : 'Mark Delivered'}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {order.status === 'delivered' && <Badge tone="brand" size="sm" dot>Done</Badge>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
