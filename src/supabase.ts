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

export async function dbFetchMenuItems() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('menu_items').select('*').order('name');
  if (error) { console.error('Supabase fetch menu items error:', error); return null; }
  return data;
}

export async function dbSaveMenuItem(item: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('menu_items').upsert({
    id: item.id,
    name: item.name,
    category_id: item.category,
    description: item.description,
    price: item.price,
    is_veg: item.veg ?? true,
    available: item.available ?? true,
    prep_time_mins: item.prepTime || 15,
  }).select();
  if (error) console.error('Supabase save menu item error:', error);
  return data;
}

export async function dbDeleteMenuItem(id: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) console.error('Supabase delete menu item error:', error);
  return data;
}

export async function dbFetchCategories() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) { console.error('Supabase fetch categories error:', error); return null; }
  return data;
}

export async function dbSaveCategory(cat: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('categories').upsert({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    sort_order: cat.sort_order || 0,
  }).select();
  if (error) console.error('Supabase save category error:', error);
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

export async function dbFetchVendors() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('vendors').select('*').order('name', { ascending: true });
  if (error) { console.error('Supabase fetch vendors error:', error); return null; }
  return data;
}

export async function dbSaveVendor(v: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('vendors').upsert({
    id: v.id,
    name: v.name,
    category: v.category || 'General',
    contact_person: v.contactPerson || v.contact_person || '',
    phone: v.phone || '',
    email: v.email || '',
    gstin: v.gstin || '',
    payment_terms: v.paymentTerms || v.payment_terms || 'Net 30',
    outstanding: v.outstanding || 0,
    rating: v.rating || 4.5,
    items_supplied: v.itemsSupplied || v.items || 0,
  }).select();
  if (error) console.error('Supabase save vendor error:', error);
  return data;
}

export async function dbDeleteVendor(id: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) console.error('Supabase delete vendor error:', error);
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
    items_count: po.items || po.items_count || (Array.isArray(po.lines) ? po.lines.length : 1),
    amount: po.amount,
    status: po.status,
    channel: po.channel || 'manual',
  }).select();
  if (error) console.error('Supabase save PO error:', error);
  return data;
}

export async function dbDeletePurchaseOrder(id: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('purchase_orders').delete().eq('id', id);
  if (error) console.error('Supabase delete PO error:', error);
  return data;
}

// ─── BOM & BOQ Helpers ────────────────────────────────────────────────────────
export async function dbFetchBOMRecipes() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('bom_recipes').select('*, bom_components(*)');
  if (error) { console.error('Supabase fetch BOM error:', error); return null; }
  return data;
}

export async function dbSaveBOMRecipe(bom: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('bom_recipes').upsert({
    id: bom.id,
    menu_item_id: bom.menuItemId,
    menu_item_name: bom.menuItemName,
    output_qty: bom.outputQty || 1,
    output_uom: bom.outputUom || 'portion',
    yield_pct: bom.yieldPct || 100,
    wastage_pct: bom.wastagePct || 0,
    total_cost: bom.totalCost || 0,
    cost_per_serving: bom.costPerServing || 0,
    suggested_price: bom.suggestedPrice || 0,
    margin_pct: bom.marginPct || 0,
    notes: bom.notes || null,
  }).select();

  if (error) { console.error('Supabase save BOM error:', error); return null; }

  if (Array.isArray(bom.components)) {
    // Refresh components
    await supabase.from('bom_components').delete().eq('recipe_id', bom.id);
    const comps = bom.components.map((c: any) => ({
      recipe_id: bom.id,
      material_id: c.materialId,
      material_name: c.materialName,
      qty: c.qty,
      uom: c.uom,
      unit_cost: c.unitCost,
      total_cost: c.totalCost,
    }));
    if (comps.length > 0) {
      await supabase.from('bom_components').insert(comps);
    }
  }

  return data;
}

export async function dbDeleteBOMRecipe(id: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('bom_recipes').delete().eq('id', id);
  if (error) console.error('Supabase delete BOM error:', error);
  return data;
}

export async function dbFetchBOQPlans() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('boq_plans').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Supabase fetch BOQ error:', error); return null; }
  return data;
}

export async function dbSaveBOQPlan(plan: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('boq_plans').upsert({
    id: plan.id,
    title: plan.title,
    date: plan.date,
    event_or_type: plan.eventOrType || 'daily_prep',
    items: plan.items || [],
    requirements: plan.requirements || [],
    total_estimated_cost: plan.totalEstimatedCost || 0,
    status: plan.status || 'draft',
    notes: plan.notes || null,
  }).select();
  if (error) console.error('Supabase save BOQ error:', error);
  return data;
}
