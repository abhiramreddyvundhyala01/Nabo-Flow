import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ─── Realtime Subscription Helper for KDS & POS ─────────────────────────────
export function subscribeToOrders(onOrderChange: (payload: any) => void) {
  if (!supabase) return null;
  return supabase
    .channel('public:orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => onOrderChange(payload)
    )
    .subscribe();
}

// ─── Table Query Helpers ──────────────────────────────────────────────────────
export async function dbFetchOrders() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
  if (error) { console.error('Supabase fetch orders error:', error); return null; }
  return data;
}

export async function dbSaveOrder(order: any) {
  if (!supabase) return null;

  const rawType = (order.orderType || order.type || order.order_type || 'dine_in').toLowerCase().replace('-', '_');
  const validTypes = ['dine_in', 'takeaway', 'delivery', 'online'];
  const safeType = validTypes.includes(rawType) ? rawType : 'dine_in';

  const rawPayMode = (order.paymentMode || order.payment_mode || 'cash').toLowerCase();
  const validModes = ['cash', 'upi', 'card', 'due'];
  const safePayMode = validModes.includes(rawPayMode) ? rawPayMode : 'cash';

  const orderId = order.orderId || order.id || `ORD-${Date.now()}`;

  const { data, error } = await supabase.from('orders').upsert({
    id: orderId,
    table_no: order.tableNo || order.table_no || null,
    customer_name: order.customerName || order.customer_name || 'Walk-in Customer',
    customer_phone: order.customerPhone || order.customer_phone || null,
    order_type: safeType,
    status: 'completed',
    payment_status: 'paid',
    payment_mode: safePayMode,
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    discount: order.discount || 0,
    total: order.total || 0,
    server_name: order.serverName || order.server_name || null,
    notes: order.notes || null,
  }).select();

  if (error) {
    console.error('Supabase save order error:', error);
    return null;
  }

  // Insert line items into order_items table if present
  if (Array.isArray(order.lines) && order.lines.length > 0) {
    const lineItems = order.lines.map((l: any) => ({
      order_id: orderId,
      item_name: l.name || l.item_name || 'Item',
      price: Number(l.price || 0),
      quantity: Number(l.qty || l.quantity || 1),
    }));
    await supabase.from('order_items').insert(lineItems);
  }

  return data;
}

export async function dbFetchRawMaterials() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('raw_materials').select('*').order('name');
  if (error) { console.error('Supabase fetch materials error:', error); return null; }
  return data;
}

export async function dbSaveRawMaterial(material: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('raw_materials').upsert({
    id: material.id,
    name: material.name,
    uom: material.uom,
    category: material.category,
    stock: material.stock,
    reorder_level: material.reorder || material.reorder_level,
    unit_cost: material.unitCost || material.unit_cost,
  }).select();
  if (error) console.error('Supabase save raw material error:', error);
  return data;
}

export async function dbFetchPurchaseOrders() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Supabase fetch POs error:', error); return null; }
  return data;
}

export async function dbSavePurchaseOrder(po: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('purchase_orders').upsert({
    id: po.id,
    vendor: po.vendor,
    date: po.date,
    items_count: po.items || po.items_count || 1,
    amount: po.amount,
    status: po.status,
    channel: po.channel,
  }).select();
  if (error) console.error('Supabase save PO error:', error);
  return data;
}
