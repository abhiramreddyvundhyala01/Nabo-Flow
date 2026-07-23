// ===== Nabo Flow — Mock Data =====
import type {
  MenuItem, Category, TableInfo, TableOrder, RawMaterial, Recipe, Vendor,
  PurchaseOrder, Customer, Referral, OnlineOrder, Staff, ReportItem,
} from './types';

export const IS_DEPLOYED_PROD = typeof window !== 'undefined' && (
  window.location.hostname.includes('vercel.app') ||
  window.location.hostname.includes('amplifyapp.com') ||
  process.env.NEXT_PUBLIC_APP_ENV === 'production'
);

export const categories: Category[] = [
  { id: 'all', name: 'All', icon: 'Grid' },
  { id: 'fav', name: 'Favorites', icon: 'Star' },
  { id: 'starters', name: 'Starters', icon: 'Flame' },
  { id: 'mains', name: 'Mains', icon: 'UtensilsCrossed' },
  { id: 'biryani', name: 'Biryani', icon: 'Soup' },
  { id: 'tandoor', name: 'Tandoor', icon: 'Flame' },
  { id: 'curries', name: 'Curries', icon: 'Soup' },
  { id: 'breads', name: 'Breads', icon: 'Sandwich' },
  { id: 'beverages', name: 'Beverages', icon: 'CupSoda' },
  { id: 'desserts', name: 'Desserts', icon: 'CakeSlice' },
];

export const menuItems: MenuItem[] = [
  { id: 'm1', name: 'Paneer Tikka', price: 280, category: 'starters', shortCode: 'PT01', veg: true, available: true, popular: true, prepTime: 15, spice: 'medium', allergens: ['dairy'], description: 'Char-grilled cottage cheese with mint chutney' },
  { id: 'm2', name: 'Chicken 65', price: 240, category: 'starters', shortCode: 'C65', veg: false, available: true, popular: true, prepTime: 12, spice: 'hot', allergens: [], description: 'Spicy fried chicken with curry leaves' },
  { id: 'm3', name: 'Veg Spring Roll', price: 180, category: 'starters', shortCode: 'VSR', veg: true, available: true, prepTime: 8, spice: 'mild', allergens: ['gluten'], description: 'Crispy rolls with vegetable filling' },
  { id: 'm4', name: 'Fish Amritsari', price: 320, category: 'starters', shortCode: 'FA01', veg: false, available: false, popular: false, prepTime: 18, spice: 'medium', allergens: ['fish'] },
  { id: 'm5', name: 'Butter Chicken', price: 340, category: 'mains', shortCode: 'BC01', veg: false, available: true, popular: true, prepTime: 20, spice: 'medium', allergens: ['dairy'], description: 'Creamy tomato gravy with tender chicken' },
  { id: 'm6', name: 'Paneer Butter Masala', price: 300, category: 'mains', shortCode: 'PBM', veg: true, available: true, popular: true, prepTime: 18, spice: 'mild', allergens: ['dairy'], description: 'Rich makhani gravy with paneer cubes' },
  { id: 'm7', name: 'Dal Makhani', price: 220, category: 'mains', shortCode: 'DM01', veg: true, available: true, popular: false, prepTime: 25, spice: 'mild', allergens: ['dairy'] },
  { id: 'm8', name: 'Mutton Rogan Josh', price: 420, category: 'mains', shortCode: 'MRJ', veg: false, available: true, popular: false, prepTime: 30, spice: 'hot', allergens: [] },
  { id: 'm9', name: 'Chicken Biryani', price: 280, category: 'biryani', shortCode: 'CB01', veg: false, available: true, popular: true, prepTime: 25, spice: 'medium', allergens: [], description: 'Dum-cooked basmati with marinated chicken' },
  { id: 'm10', name: 'Veg Biryani', price: 220, category: 'biryani', shortCode: 'VB01', veg: true, available: true, popular: false, prepTime: 22, spice: 'mild', allergens: [] },
  { id: 'm11', name: 'Mutton Biryani', price: 380, category: 'biryani', shortCode: 'MB01', veg: false, available: true, popular: true, prepTime: 30, spice: 'medium', allergens: [] },
  { id: 'm12', name: 'Hyderabadi Biryani', price: 320, category: 'biryani', shortCode: 'HB01', veg: false, available: true, popular: false, prepTime: 28, spice: 'hot', allergens: [] },
  { id: 'm13', name: 'Tandoori Chicken (Half)', price: 260, category: 'tandoor', shortCode: 'TC01', veg: false, available: true, popular: true, prepTime: 22, spice: 'medium', allergens: [] },
  { id: 'm14', name: 'Seekh Kebab', price: 240, category: 'tandoor', shortCode: 'SK01', veg: false, available: true, popular: false, prepTime: 15, spice: 'medium', allergens: [] },
  { id: 'm15', name: 'Tandoori Roti', price: 30, category: 'breads', shortCode: 'TR01', veg: true, available: true, popular: true, prepTime: 5, spice: 'none', allergens: ['gluten'] },
  { id: 'm16', name: 'Butter Naan', price: 45, category: 'breads', shortCode: 'BN01', veg: true, available: true, popular: true, prepTime: 6, spice: 'none', allergens: ['gluten', 'dairy'] },
  { id: 'm17', name: 'Garlic Naan', price: 55, category: 'breads', shortCode: 'GN01', veg: true, available: true, popular: false, prepTime: 6, spice: 'none', allergens: ['gluten', 'dairy'] },
  { id: 'm18', name: 'Masala Dosa', price: 140, category: 'mains', shortCode: 'MD01', veg: true, available: true, popular: true, prepTime: 10, spice: 'mild', allergens: ['gluten'] },
  { id: 'm19', name: 'Sweet Lassi', price: 80, category: 'beverages', shortCode: 'SL01', veg: true, available: true, popular: true, prepTime: 3, spice: 'none', allergens: ['dairy'] },
  { id: 'm20', name: 'Fresh Lime Soda', price: 60, category: 'beverages', shortCode: 'FLS', veg: true, available: true, popular: false, prepTime: 2, spice: 'none', allergens: [] },
  { id: 'm21', name: 'Masala Chai', price: 40, category: 'beverages', shortCode: 'MC01', veg: true, available: true, popular: true, prepTime: 4, spice: 'none', allergens: ['dairy'] },
  { id: 'm22', name: 'Cold Coffee', price: 120, category: 'beverages', shortCode: 'CC01', veg: true, available: true, popular: false, prepTime: 4, spice: 'none', allergens: ['dairy'] },
  { id: 'm23', name: 'Gulab Jamun (2 pc)', price: 90, category: 'desserts', shortCode: 'GJ01', veg: true, available: true, popular: true, prepTime: 2, spice: 'none', allergens: ['dairy'] },
  { id: 'm24', name: 'Rasmalai (2 pc)', price: 100, category: 'desserts', shortCode: 'RM01', veg: true, available: true, popular: false, prepTime: 2, spice: 'none', allergens: ['dairy'] },
  { id: 'm25', name: 'Gajar Halwa', price: 110, category: 'desserts', shortCode: 'GH01', veg: true, available: true, popular: false, prepTime: 3, spice: 'none', allergens: ['dairy'] },
];

const CLEAN_PROD_TABLES: TableInfo[] = [
  { id: 't1', label: 'T1', seats: 2, shape: 'round', status: 'vacant', section: 'Window' },
  { id: 't2', label: 'T2', seats: 4, shape: 'square', status: 'vacant', section: 'Window' },
  { id: 't3', label: 'T3', seats: 4, shape: 'square', status: 'vacant', section: 'Window' },
  { id: 't4', label: 'T4', seats: 6, shape: 'rect', status: 'vacant', section: 'Window' },
  { id: 't5', label: 'T5', seats: 2, shape: 'round', status: 'vacant', section: 'Center' },
  { id: 't6', label: 'T6', seats: 4, shape: 'square', status: 'vacant', section: 'Center' },
  { id: 't7', label: 'T7', seats: 4, shape: 'square', status: 'vacant', section: 'Center' },
  { id: 't8', label: 'T8', seats: 8, shape: 'rect', status: 'vacant', section: 'Center' },
  { id: 't9', label: 'T9', seats: 2, shape: 'round', status: 'vacant', section: 'Patio' },
  { id: 't10', label: 'T10', seats: 4, shape: 'square', status: 'vacant', section: 'Patio' },
  { id: 't11', label: 'T11', seats: 4, shape: 'square', status: 'vacant', section: 'Patio' },
  { id: 't12', label: 'T12', seats: 6, shape: 'rect', status: 'vacant', section: 'Patio' },
];

export const tables: TableInfo[] = IS_DEPLOYED_PROD ? CLEAN_PROD_TABLES : [
  { id: 't1', label: 'T1', seats: 2, shape: 'round', status: 'vacant', section: 'Window' },
  { id: 't2', label: 'T2', seats: 4, shape: 'square', status: 'occupied', orderAmount: 840, guests: 3, section: 'Window' },
  { id: 't3', label: 'T3', seats: 4, shape: 'square', status: 'kot-sent', orderAmount: 1260, guests: 4, section: 'Window' },
  { id: 't4', label: 'T4', seats: 6, shape: 'rect', status: 'vacant', section: 'Window' },
  { id: 't5', label: 'T5', seats: 2, shape: 'round', status: 'bill-printed', orderAmount: 560, guests: 2, section: 'Center' },
  { id: 't6', label: 'T6', seats: 4, shape: 'square', status: 'occupied', orderAmount: 1120, guests: 4, section: 'Center' },
  { id: 't7', label: 'T7', seats: 4, shape: 'square', status: 'vacant', section: 'Center' },
  { id: 't8', label: 'T8', seats: 8, shape: 'rect', status: 'kot-sent', orderAmount: 3200, guests: 7, section: 'Center' },
  { id: 't9', label: 'T9', seats: 2, shape: 'round', status: 'vacant', section: 'Patio' },
  { id: 't10', label: 'T10', seats: 4, shape: 'square', status: 'occupied', orderAmount: 680, guests: 2, section: 'Patio' },
  { id: 't11', label: 'T11', seats: 4, shape: 'square', status: 'vacant', section: 'Patio' },
  { id: 't12', label: 'T12', seats: 6, shape: 'rect', status: 'bill-printed', orderAmount: 2100, guests: 5, section: 'Patio' },
];

export const tableOrders: TableOrder[] = IS_DEPLOYED_PROD ? [] : [
  {
    tableId: 't2', orderId: 'ORD-20260723-001', status: 'occupied', guests: 3, startedAt: '12:15 PM',
    lines: [
      { name: 'Paneer Tikka', qty: 1, price: 280, veg: true },
      { name: 'Butter Naan', qty: 2, price: 45, veg: true },
      { name: 'Sweet Lassi', qty: 1, price: 80, veg: true },
    ],
    subtotal: 450, tax: 23, total: 473,
  },
  {
    tableId: 't3', orderId: 'ORD-20260723-002', status: 'kot-sent', guests: 4, startedAt: '12:30 PM',
    lines: [
      { name: 'Chicken Biryani', qty: 2, price: 280, veg: false },
      { name: 'Paneer Butter Masala', qty: 1, price: 300, veg: true },
      { name: 'Tandoori Roti', qty: 4, price: 30, veg: true },
      { name: 'Masala Chai', qty: 2, price: 40, veg: true },
    ],
    subtotal: 1200, tax: 60, total: 1260,
  },
  {
    tableId: 't5', orderId: 'ORD-20260723-003', status: 'bill-printed', guests: 2, startedAt: '11:45 AM',
    lines: [
      { name: 'Veg Biryani', qty: 1, price: 220, veg: true },
      { name: 'Sweet Lassi', qty: 1, price: 80, veg: true },
      { name: 'Gulab Jamun (2 pc)', qty: 1, price: 90, veg: true },
    ],
    subtotal: 390, tax: 20, total: 410,
  },
  {
    tableId: 't6', orderId: 'ORD-20260723-004', status: 'occupied', guests: 4, startedAt: '12:05 PM',
    lines: [
      { name: 'Butter Chicken', qty: 1, price: 340, veg: false },
      { name: 'Dal Makhani', qty: 1, price: 220, veg: true },
      { name: 'Butter Naan', qty: 3, price: 45, veg: true },
      { name: 'Fresh Lime Soda', qty: 2, price: 60, veg: true },
    ],
    subtotal: 815, tax: 41, total: 856,
  },
  {
    tableId: 't8', orderId: 'ORD-20260723-005', status: 'kot-sent', guests: 7, startedAt: '12:20 PM',
    lines: [
      { name: 'Mutton Biryani', qty: 3, price: 380, veg: false },
      { name: 'Chicken 65', qty: 2, price: 240, veg: false },
      { name: 'Paneer Butter Masala', qty: 2, price: 300, veg: true },
      { name: 'Garlic Naan', qty: 5, price: 55, veg: true },
      { name: 'Rasmalai (2 pc)', qty: 2, price: 100, veg: true },
    ],
    subtotal: 3050, tax: 153, total: 3203,
  },
  {
    tableId: 't10', orderId: 'ORD-20260723-006', status: 'occupied', guests: 2, startedAt: '12:40 PM',
    lines: [
      { name: 'Masala Dosa', qty: 1, price: 140, veg: true },
      { name: 'Masala Chai', qty: 2, price: 40, veg: true },
    ],
    subtotal: 220, tax: 11, total: 231,
  },
  {
    tableId: 't12', orderId: 'ORD-20260723-007', status: 'bill-printed', guests: 5, startedAt: '11:30 AM',
    lines: [
      { name: 'Chicken Biryani', qty: 3, price: 280, veg: false },
      { name: 'Mutton Rogan Josh', qty: 1, price: 420, veg: false },
      { name: 'Tandoori Roti', qty: 5, price: 30, veg: true },
      { name: 'Cold Coffee', qty: 3, price: 120, veg: true },
    ],
    subtotal: 1980, tax: 99, total: 2079,
  },
];

export const rawMaterials: RawMaterial[] = IS_DEPLOYED_PROD ? [] : [
  { id: 'r1', name: 'Basmati Rice', uom: 'kg', category: 'Grains', stock: 42, reorder: 20, unitCost: 85 },
  { id: 'r2', name: 'Chicken (boneless)', uom: 'kg', category: 'Meat', stock: 8, reorder: 15, unitCost: 240 },
  { id: 'r3', name: 'Paneer', uom: 'kg', category: 'Dairy', stock: 6, reorder: 5, unitCost: 280 },
  { id: 'r4', name: 'Tomatoes', uom: 'kg', category: 'Vegetables', stock: 28, reorder: 15, unitCost: 40 },
  { id: 'r5', name: 'Onions', uom: 'kg', category: 'Vegetables', stock: 52, reorder: 20, unitCost: 32 },
  { id: 'r6', name: 'Ginger-Garlic Paste', uom: 'kg', category: 'Spices', stock: 3, reorder: 4, unitCost: 120 },
  { id: 'r7', name: 'Fresh Cream', uom: 'L', category: 'Dairy', stock: 9, reorder: 6, unitCost: 180 },
  { id: 'r8', name: 'Maida (Refined Flour)', uom: 'kg', category: 'Grains', stock: 18, reorder: 10, unitCost: 45 },
  { id: 'r9', name: 'Cooking Oil', uom: 'L', category: 'Oils', stock: 35, reorder: 15, unitCost: 140 },
  { id: 'r10', name: 'Ghee', uom: 'kg', category: 'Dairy', stock: 4, reorder: 3, unitCost: 520 },
  { id: 'r11', name: 'Mutton', uom: 'kg', category: 'Meat', stock: 5, reorder: 8, unitCost: 680 },
  { id: 'r12', name: 'Green Chilli', uom: 'kg', category: 'Vegetables', stock: 2, reorder: 2, unitCost: 80 },
];

export const recipes: Recipe[] = [
  {
    id: 'rc1', menuItemId: 'm9', menuItemName: 'Chicken Biryani', yield: 92, wastage: 8, cost: 96,
    components: [
      { materialId: 'r1', materialName: 'Basmati Rice', qty: 0.18, uom: 'kg' },
      { materialId: 'r2', materialName: 'Chicken (boneless)', qty: 0.2, uom: 'kg' },
      { materialId: 'r5', materialName: 'Onions', qty: 0.08, uom: 'kg' },
      { materialId: 'r9', materialName: 'Cooking Oil', qty: 0.03, uom: 'L' },
    ],
  },
  {
    id: 'rc2', menuItemId: 'm5', menuItemName: 'Butter Chicken', yield: 95, wastage: 5, cost: 128,
    components: [
      { materialId: 'r2', materialName: 'Chicken (boneless)', qty: 0.18, uom: 'kg' },
      { materialId: 'r4', materialName: 'Tomatoes', qty: 0.15, uom: 'kg' },
      { materialId: 'r7', materialName: 'Fresh Cream', qty: 0.05, uom: 'L' },
      { materialId: 'r10', materialName: 'Ghee', qty: 0.02, uom: 'kg' },
    ],
  },
  {
    id: 'rc3', menuItemId: 'm6', menuItemName: 'Paneer Butter Masala', yield: 94, wastage: 6, cost: 84,
    components: [
      { materialId: 'r3', materialName: 'Paneer', qty: 0.15, uom: 'kg' },
      { materialId: 'r4', materialName: 'Tomatoes', qty: 0.12, uom: 'kg' },
      { materialId: 'r7', materialName: 'Fresh Cream', qty: 0.04, uom: 'L' },
    ],
  },
];

export const vendors: Vendor[] = IS_DEPLOYED_PROD ? [] : [
  { id: 'v1', name: 'Sai Fresh Farm', contact: 'Ramesh', phone: '+91 98765 43210', category: 'Vegetables', rating: 4.6, outstanding: 12400, items: 18 },
  { id: 'v2', name: 'Annapurna Rice Mills', contact: 'Suresh', phone: '+91 98220 11223', category: 'Grains', rating: 4.8, outstanding: 0, items: 6 },
  { id: 'v3', name: 'Fresh Chicken Co.', contact: 'Imran', phone: '+91 99300 44556', category: 'Meat', rating: 4.3, outstanding: 8600, items: 4 },
  { id: 'v4', name: 'Amul Distributor', contact: 'Priya', phone: '+91 98111 22334', category: 'Dairy', rating: 4.9, outstanding: 0, items: 12 },
  { id: 'v5', name: 'Spice Garden', contact: 'Mohan', phone: '+91 90909 80808', category: 'Spices', rating: 4.5, outstanding: 3200, items: 24 },
];

export const purchaseOrders: PurchaseOrder[] = IS_DEPLOYED_PROD ? [] : [
  { id: 'PO-ORD-20260714-001', vendor: 'Sai Fresh Farm', date: '2026-07-14', items: 8, amount: 4200, status: 'sent', channel: 'whatsapp' },
  { id: 'PO-ORD-20260714-002', vendor: 'Fresh Chicken Co.', date: '2026-07-14', items: 3, amount: 8600, status: 'partial', channel: 'whatsapp' },
  { id: 'PO-ORD-20260713-001', vendor: 'Annapurna Rice Mills', date: '2026-07-13', items: 2, amount: 6800, status: 'received', channel: 'whatsapp' },
  { id: 'PO-ORD-20260712-001', vendor: 'Amul Distributor', date: '2026-07-12', items: 5, amount: 12400, status: 'received', channel: 'email' },
  { id: 'PO-ORD-20260711-001', vendor: 'Spice Garden', date: '2026-07-11', items: 6, amount: 3200, status: 'draft', channel: 'manual' },
];

export const customers: Customer[] = [
  { id: 'c1', name: 'Aarav Mehta', phone: '+91 98765 43210', visits: 42, spend: 28400, tier: 'Platinum', points: 2840, lastVisit: '2026-07-12', birthday: '1990-08-15', preferred: 'Butter Chicken' },
  { id: 'c2', name: 'Diya Sharma', phone: '+91 98220 33445', visits: 28, spend: 16800, tier: 'Gold', points: 1680, lastVisit: '2026-07-10', preferred: 'Paneer Tikka' },
  { id: 'c3', name: 'Kabir Singh', phone: '+91 99300 22118', visits: 35, spend: 31200, tier: 'Platinum', points: 3120, lastVisit: '2026-07-13', birthday: '1995-03-22', preferred: 'Mutton Biryani' },
  { id: 'c4', name: 'Ananya Iyer', phone: '+91 98111 55667', visits: 12, spend: 6400, tier: 'Silver', points: 640, lastVisit: '2026-07-08', preferred: 'Masala Dosa' },
  { id: 'c5', name: 'Vivaan Gupta', phone: '+91 90909 11223', visits: 19, spend: 11200, tier: 'Gold', points: 1120, lastVisit: '2026-07-11', preferred: 'Chicken Biryani' },
  { id: 'c6', name: 'Ishita Reddy', phone: '+91 98765 99887', visits: 7, spend: 3800, tier: 'Silver', points: 380, lastVisit: '2026-07-05', preferred: 'Sweet Lassi' },
];

export const referrals: Referral[] = [
  { id: 'rf1', referrer: 'Aarav Mehta', referee: 'Riya Kapoor', date: '2026-07-13', status: 'qualified', reward: 150 },
  { id: 'rf2', referrer: 'Kabir Singh', referee: 'Arjun Nair', date: '2026-07-12', status: 'rewarded', reward: 150 },
  { id: 'rf3', referrer: 'Diya Sharma', referee: 'Sneha Patel', date: '2026-07-12', status: 'pending', reward: 0 },
  { id: 'rf4', referrer: 'Vivaan Gupta', referee: 'Vivaan Gupta', date: '2026-07-11', status: 'flagged', reward: 0, flagReason: 'Self-referral detected (same phone)' },
  { id: 'rf5', referrer: 'Ananya Iyer', referee: 'Karthik Rao', date: '2026-07-10', status: 'qualified', reward: 150 },
  { id: 'rf6', referrer: 'Kabir Singh', referee: 'Meera Joshi', date: '2026-07-09', status: 'flagged', reward: 0, flagReason: 'Same device fingerprint as referrer' },
  { id: 'rf7', referrer: 'Aarav Mehta', referee: 'Tanvi Bhat', date: '2026-07-08', status: 'rewarded', reward: 150 },
  { id: 'rf8', referrer: 'Diya Sharma', referee: 'Rohan Das', date: '2026-07-06', status: 'qualified', reward: 150 },
];

export const onlineOrders: OnlineOrder[] = [
  { id: 'ZM-8842', source: 'zomato', customer: 'Neha Verma', items: 3, amount: 680, status: 'new', time: '2 min ago', eta: 32 },
  { id: 'SG-5521', source: 'swiggy', customer: 'Aditya Roy', items: 2, amount: 420, status: 'new', time: '4 min ago', eta: 28 },
  { id: 'DR-1193', source: 'direct', customer: 'Sara Khan', items: 4, amount: 1240, status: 'accepted', time: '8 min ago', eta: 45 },
  { id: 'ZM-8841', source: 'zomato', customer: 'Manav Shah', items: 1, amount: 280, status: 'preparing', time: '12 min ago', eta: 18 },
  { id: 'SG-5520', source: 'swiggy', customer: 'Pooja Nair', items: 5, amount: 1860, status: 'ready', time: '20 min ago', eta: 5 },
  { id: 'DR-1192', source: 'direct', customer: 'Rahul Jain', items: 2, amount: 560, status: 'dispatched', time: '35 min ago', eta: 12 },
  { id: 'ZM-8840', source: 'zomato', customer: 'Zara Ali', items: 3, amount: 920, status: 'delivered', time: '1 hr ago', eta: 0 },
];

export const staff: Staff[] = IS_DEPLOYED_PROD ? [
  { id: 's1', name: 'Super Admin', role: 'Manager', shift: 'Full', sales: 0, upsellRate: 0, avgBill: 0, attendance: 100, status: 'active' }
] : [
  { id: 's1', name: 'Sunita Rao', role: 'Cashier', shift: 'Morning', sales: 18400, upsellRate: 32, avgBill: 420, attendance: 96, status: 'active' },
  { id: 's2', name: 'Mohan Das', role: 'Captain', shift: 'Evening', sales: 24200, upsellRate: 41, avgBill: 580, attendance: 92, status: 'active' },
  { id: 's3', name: 'Fatima Sheikh', role: 'Cashier', shift: 'Evening', sales: 15800, upsellRate: 28, avgBill: 380, attendance: 98, status: 'break' },
  { id: 's4', name: 'Arjun Pillai', role: 'Server', shift: 'Morning', sales: 9600, upsellRate: 22, avgBill: 310, attendance: 88, status: 'active' },
  { id: 's5', name: 'Lakshmi Menon', role: 'Manager', shift: 'Full', sales: 0, upsellRate: 0, avgBill: 0, attendance: 99, status: 'active' },
  { id: 's6', name: 'Rajesh Kumar', role: 'Server', shift: 'Evening', sales: 11200, upsellRate: 35, avgBill: 340, attendance: 91, status: 'off' },
];

export const reportLibrary: ReportItem[] = [
  { id: 'rp1', name: 'Sales Summary', category: 'Sales', metric: '₹ 84,200', trend: 'up', change: 12.4 },
  { id: 'rp2', name: 'Payment Type Breakdown', category: 'Sales', metric: '5 modes', trend: 'flat', change: 0 },
  { id: 'rp3', name: 'Item-wise Sales', category: 'Sales', metric: '24 items', trend: 'up', change: 8.2 },
  { id: 'rp4', name: 'Discount & Void Audit', category: 'Fraud', metric: '3 flags', trend: 'down', change: -4.1 },
  { id: 'rp5', name: 'Inventory Consumption', category: 'Inventory', metric: '12 items', trend: 'up', change: 6.8 },
  { id: 'rp6', name: 'Vendor Price Comparison', category: 'Purchase', metric: '5 vendors', trend: 'flat', change: 0.3 },
  { id: 'rp7', name: 'Staff Performance', category: 'Staff', metric: '6 staff', trend: 'up', change: 5.5 },
  { id: 'rp8', name: 'Loyalty Redemption', category: 'CRM', metric: '₹ 4,200', trend: 'up', change: 18.0 },
  { id: 'rp9', name: 'Referral Conversion', category: 'CRM', metric: '68%', trend: 'up', change: 22.0 },
  { id: 'rp10', name: 'Menu Engineering Matrix', category: 'Analytics', metric: '4 quadrants', trend: 'up', change: 3.2 },
];

// Menu engineering quadrant data
export const menuEngineering = [
  { name: 'Chicken Biryani', revenue: 92, popularity: 88, margin: 62, category: 'Star' },
  { name: 'Butter Chicken', revenue: 78, popularity: 82, margin: 55, category: 'Star' },
  { name: 'Paneer Tikka', revenue: 68, popularity: 90, margin: 48, category: 'Plow-horse' },
  { name: 'Dal Makhani', revenue: 42, popularity: 65, margin: 38, category: 'Plow-horse' },
  { name: 'Mutton Rogan Josh', revenue: 58, popularity: 38, margin: 68, category: 'Puzzle' },
  { name: 'Hyderabadi Biryani', revenue: 48, popularity: 42, margin: 52, category: 'Puzzle' },
  { name: 'Fish Amritsari', revenue: 22, popularity: 28, margin: 30, category: 'Dog' },
  { name: 'Veg Spring Roll', revenue: 28, popularity: 35, margin: 32, category: 'Dog' },
];

export const referralLeaderboard = [
  { rank: 1, name: 'Kabir Singh', referrals: 14, rewards: 2100, tier: 'Platinum' },
  { rank: 2, name: 'Aarav Mehta', referrals: 11, rewards: 1650, tier: 'Platinum' },
  { rank: 3, name: 'Diya Sharma', referrals: 8, rewards: 1200, tier: 'Gold' },
  { rank: 4, name: 'Vivaan Gupta', referrals: 5, rewards: 750, tier: 'Gold' },
  { rank: 5, name: 'Ananya Iyer', referrals: 4, rewards: 600, tier: 'Silver' },
  { rank: 6, name: 'Ishita Reddy', referrals: 2, rewards: 300, tier: 'Silver' },
];

export const loyaltyTiers = [
  { name: 'Silver', min: 0, members: 1240, multiplier: 1, perk: 'Birthday dessert', color: 'ink' },
  { name: 'Gold', min: 10000, members: 420, multiplier: 1.5, perk: 'Free welcome drink + priority seating', color: 'accent' },
  { name: 'Platinum', min: 25000, members: 86, multiplier: 2, perk: 'Complimentary main course monthly + valet', color: 'brand' },
];
