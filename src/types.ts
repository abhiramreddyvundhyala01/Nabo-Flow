// ===== Nabo Flow — Shared Types =====

export type OrderType = 'takeaway' | 'dine-in' | 'delivery' | 'qr' | 'captain';

export type OrderState =
  | 'draft'
  | 'items-added'
  | 'kot-sent'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'payment-pending'
  | 'paid'
  | 'completed';

export type TableStatus = 'vacant' | 'occupied' | 'kot-sent' | 'bill-printed';

export type PaymentMode = 'cash' | 'card' | 'upi' | 'wallet' | 'split';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  shortCode: string;
  veg: boolean;
  available: boolean;
  popular?: boolean;
  prepTime?: number;
  allergens?: string[];
  spice?: 'none' | 'mild' | 'medium' | 'hot';
  image?: string;
  description?: string;
}

export interface CartLine {
  item: MenuItem;
  qty: number;
  note?: string;
}

export interface Cart {
  id: string;
  orderType: OrderType;
  tableNo?: string;
  customer?: string;
  lines: CartLine[];
  discount?: number;
  loyaltyPoints?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface TableInfo {
  id: string;
  label: string;
  seats: number;
  shape: 'square' | 'round' | 'rect';
  status: TableStatus;
  orderAmount?: number;
  guests?: number;
  section?: string;
  floor?: string;
}

export interface TableOrder {
  tableId: string;
  orderId: string;
  lines: { name: string; qty: number; price: number; veg: boolean }[];
  subtotal: number;
  tax: number;
  total: number;
  status: TableStatus;
  guests?: number;
  startedAt: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  uom: string;
  category: string;
  stock: number;
  reorder: number;
  unitCost: number;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  menuItemName: string;
  components: { materialId: string; materialName: string; qty: number; uom: string }[];
  yield: number;
  wastage: number;
  cost: number;
}

export interface BOMComponent {
  materialId: string;
  materialName: string;
  qty: number;
  uom: string;
  unitCost: number;
  totalCost: number;
}

export interface BOMRecipe {
  id: string;
  menuItemId: string;
  menuItemName: string;
  category?: string;
  outputQty: number; // e.g. 1 portion or 5 Liters base batch
  outputUom: string;
  components: BOMComponent[];
  yieldPct: number; // e.g. 95%
  wastagePct: number; // e.g. 5%
  totalCost: number; // calculated total ingredient cost
  costPerServing: number; // totalCost / outputQty
  suggestedPrice?: number; // retail price advice based on target food cost %
  marginPct?: number; // Gross margin %
  notes?: string;
  updatedAt?: string;
}

export interface BOQItem {
  menuItemId: string;
  menuItemName: string;
  targetQty: number;
  portionUom?: string;
}

export interface BOQMaterialRequirement {
  materialId: string;
  materialName: string;
  uom: string;
  category: string;
  requiredQty: number;
  currentStock: number;
  shortageQty: number;
  unitCost: number;
  totalCost: number;
}

export interface BOQPlan {
  id: string;
  title: string;
  date: string;
  eventOrType: 'daily_prep' | 'banquet' | 'weekly_forecast' | 'custom';
  items: BOQItem[];
  requirements: BOQMaterialRequirement[];
  totalEstimatedCost: number;
  status: 'draft' | 'approved' | 'po_generated' | 'issued_to_kitchen';
  notes?: string;
  createdAt?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  phone: string;
  category: string;
  rating: number;
  outstanding: number;
  items: number;
}

export interface PurchaseOrder {
  id: string;
  vendor: string;
  date: string;
  items: number;
  amount: number;
  status: 'draft' | 'sent' | 'received' | 'partial';
  channel: 'whatsapp' | 'email' | 'manual';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  visits: number;
  spend: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  points: number;
  lastVisit: string;
  birthday?: string;
  preferred?: string;
}

export interface Referral {
  id: string;
  referrer: string;
  referee: string;
  date: string;
  status: 'qualified' | 'pending' | 'rewarded' | 'flagged';
  reward: number;
  flagReason?: string;
}

export interface OnlineOrder {
  id: string;
  source: 'zomato' | 'swiggy' | 'direct';
  customer: string;
  items: number;
  amount: number;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'dispatched' | 'delivered';
  time: string;
  eta?: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  shift: string;
  sales: number;
  upsellRate: number;
  avgBill: number;
  attendance: number;
  status: 'active' | 'break' | 'off';
}

export interface ReportItem {
  id: string;
  name: string;
  category: string;
  metric: string;
  trend: 'up' | 'down' | 'flat';
  change: number;
}

export type ModuleKey =
  | 'pos'
  | 'inventory'
  | 'purchase'
  | 'menu'
  | 'loyalty'
  | 'referral'
  | 'online'
  | 'reports'
  | 'staff'
  | 'mobile';
