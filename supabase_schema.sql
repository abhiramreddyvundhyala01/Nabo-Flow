-- ════════════════════════════════════════════════════════════════════════════════
-- Nabo Flow — Idempotent Supabase PostgreSQL Production Database Schema & Initial Seed
-- Safe to re-run multiple times in your Supabase Dashboard -> SQL Editor
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. Profiles & Staff Management (RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'server', 'inventory')),
  outlet TEXT NOT NULL DEFAULT 'Main Branch',
  active BOOLEAN NOT NULL DEFAULT true,
  pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Default Super Admin Account
INSERT INTO public.profiles (email, full_name, role, outlet, active, pin_hash)
VALUES ('abhiram@naboflow.com', 'abhiram', 'admin', 'Main Branch', true, '1234')
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, pin_hash = EXCLUDED.pin_hash;

-- 2. Menu Categories & Menu Items
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  cost NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 5,
  is_veg BOOLEAN DEFAULT true,
  available BOOLEAN DEFAULT true,
  image_url TEXT,
  prep_time_mins INT DEFAULT 15,
  spicy_level INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Initial Categories
INSERT INTO public.categories (id, name, icon, sort_order) VALUES
('starters', 'Starters', 'Flame', 1),
('mains', 'Mains', 'UtensilsCrossed', 2),
('biryani', 'Biryani', 'Soup', 3),
('tandoor', 'Tandoor', 'Flame', 4),
('curries', 'Curries', 'Soup', 5),
('breads', 'Breads', 'Sandwich', 6),
('beverages', 'Beverages', 'CupSoda', 7),
('desserts', 'Desserts', 'CakeSlice', 8)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- Seed Initial Menu Items
INSERT INTO public.menu_items (id, category_id, name, price, is_veg, available, prep_time_mins, description) VALUES
('m1', 'starters', 'Paneer Tikka', 280, true, true, 15, 'Char-grilled cottage cheese with mint chutney'),
('m2', 'starters', 'Chicken 65', 240, false, true, 12, 'Spicy fried chicken with curry leaves'),
('m3', 'starters', 'Veg Spring Roll', 180, true, true, 8, 'Crispy rolls with vegetable filling'),
('m4', 'starters', 'Fish Amritsari', 320, false, true, 18, 'Crispy batter-fried fish fillets'),
('m5', 'mains', 'Butter Chicken', 340, false, true, 20, 'Creamy tomato gravy with tender chicken'),
('m6', 'mains', 'Paneer Butter Masala', 300, true, true, 18, 'Rich makhani gravy with paneer cubes'),
('m7', 'mains', 'Dal Makhani', 220, true, true, 25, 'Slow-cooked black lentils with cream'),
('m8', 'mains', 'Mutton Rogan Josh', 420, false, true, 30, 'Kashmiri style tender mutton curry'),
('m9', 'biryani', 'Chicken Biryani', 280, false, true, 25, 'Dum-cooked basmati with marinated chicken'),
('m10', 'biryani', 'Veg Biryani', 220, true, true, 22, 'Aromatic basmati rice with mixed vegetables'),
('m11', 'biryani', 'Mutton Biryani', 380, false, true, 30, 'Rich aromatic mutton dum biryani'),
('m12', 'biryani', 'Hyderabadi Biryani', 320, false, true, 28, 'Spicy Hyderabadi style chicken biryani'),
('m13', 'tandoor', 'Tandoori Chicken (Half)', 260, false, true, 22, 'Classic clay-oven roasted chicken'),
('m14', 'tandoor', 'Seekh Kebab', 240, false, true, 15, 'Minced spiced meat skewers'),
('m15', 'breads', 'Tandoori Roti', 30, true, true, 5, 'Whole wheat clay oven bread'),
('m16', 'breads', 'Butter Naan', 45, true, true, 6, 'Soft refined flour bread with butter'),
('m17', 'breads', 'Garlic Naan', 55, true, true, 6, 'Naan topped with minced garlic & butter'),
('m18', 'mains', 'Masala Dosa', 140, true, true, 10, 'Crispy rice crepe filled with spiced potato'),
('m19', 'beverages', 'Sweet Lassi', 80, true, true, 3, 'Chilled churned yogurt drink'),
('m20', 'beverages', 'Fresh Lime Soda', 60, true, true, 2, 'Refreshing fizzy lime drink'),
('m21', 'beverages', 'Masala Chai', 40, true, true, 4, 'Spiced Indian milk tea'),
('m22', 'beverages', 'Cold Coffee', 120, true, true, 4, 'Creamy blended cold coffee'),
('m23', 'desserts', 'Gulab Jamun (2 pc)', 90, true, true, 2, 'Warm fried dough balls in rose syrup'),
('m24', 'desserts', 'Rasmalai (2 pc)', 100, true, true, 2, 'Soft cottage cheese patties in saffron milk'),
('m25', 'desserts', 'Gajar Halwa', 110, true, true, 3, 'Rich carrot pudding with nuts & ghee')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description;

-- 3. Orders & Line Items (Realtime Enabled)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY, -- ORD-YYYYMMDD-XXX
  table_no TEXT,
  customer_name TEXT DEFAULT 'Walk-in Customer',
  customer_phone TEXT,
  order_type TEXT CHECK (order_type IN ('dine_in', 'takeaway', 'delivery', 'online')) DEFAULT 'dine_in',
  status TEXT CHECK (status IN ('pending', 'cooking', 'ready', 'served', 'completed', 'cancelled')) DEFAULT 'pending',
  payment_status TEXT CHECK (payment_status IN ('unpaid', 'paid', 'refunded')) DEFAULT 'unpaid',
  payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'card', 'due')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  server_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id TEXT,
  item_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT
);

-- 4. Inventory Raw Materials & Purchase Orders
CREATE TABLE IF NOT EXISTS public.raw_materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  uom TEXT NOT NULL DEFAULT 'kg',
  category TEXT NOT NULL DEFAULT 'Grains',
  stock NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC NOT NULL DEFAULT 5,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Raw Materials Master (r1 - r27)
INSERT INTO public.raw_materials (id, name, uom, category, stock, reorder_level, unit_cost) VALUES
('r1', 'Basmati Rice', 'kg', 'Grains', 42, 20, 85),
('r2', 'Chicken (boneless)', 'kg', 'Meat', 8, 15, 240),
('r3', 'Paneer', 'kg', 'Dairy', 6, 5, 280),
('r4', 'Tomatoes', 'kg', 'Vegetables', 28, 15, 40),
('r5', 'Onions', 'kg', 'Vegetables', 52, 20, 32),
('r6', 'Ginger-Garlic Paste', 'kg', 'Spices', 3, 4, 120),
('r7', 'Fresh Cream', 'L', 'Dairy', 9, 6, 180),
('r8', 'Maida (Refined Flour)', 'kg', 'Grains', 18, 10, 45),
('r9', 'Cooking Oil', 'L', 'Oils', 35, 15, 140),
('r10', 'Ghee', 'kg', 'Dairy', 4, 3, 520),
('r11', 'Mutton', 'kg', 'Meat', 5, 8, 680),
('r12', 'Green Chilli', 'kg', 'Vegetables', 2, 2, 80),
('r13', 'Fish Fillet', 'kg', 'Meat', 10, 8, 420),
('r14', 'Black Lentils (Urad Dal)', 'kg', 'Grains', 25, 10, 110),
('r15', 'Mixed Vegetables', 'kg', 'Vegetables', 20, 10, 50),
('r16', 'Whole Wheat Flour (Atta)', 'kg', 'Grains', 30, 15, 40),
('r17', 'Garlic', 'kg', 'Vegetables', 5, 3, 160),
('r18', 'Potato', 'kg', 'Vegetables', 40, 15, 25),
('r19', 'Milk & Curd', 'L', 'Dairy', 30, 15, 60),
('r20', 'Sugar', 'kg', 'Other', 25, 10, 42),
('r21', 'Lemon & Mint', 'kg', 'Vegetables', 5, 3, 90),
('r22', 'Soda / Carbonated Water', 'L', 'Beverages', 40, 15, 25),
('r23', 'Tea Leaves & Spices', 'kg', 'Spices', 4, 2, 380),
('r24', 'Coffee Powder', 'kg', 'Beverages', 3, 2, 650),
('r25', 'Khoya / Mawa', 'kg', 'Dairy', 8, 4, 340),
('r26', 'Carrot (Red)', 'kg', 'Vegetables', 15, 5, 45),
('r27', 'Nuts & Saffron', 'kg', 'Spices', 2, 1, 1400)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, unit_cost = EXCLUDED.unit_cost, uom = EXCLUDED.uom;

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY, -- PO-ORD-YYYYMMDD-XXX
  vendor TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  items_count INT NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled')) DEFAULT 'sent',
  channel TEXT CHECK (channel IN ('whatsapp', 'email', 'manual')) DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Staff Attendance & Shifts
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'half-day', 'leave', 'active', 'break', 'off')) DEFAULT 'present',
  clock_in TEXT,
  clock_out TEXT,
  hours_worked NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Bill of Materials (BOM Recipes & Ingredients)
CREATE TABLE IF NOT EXISTS public.bom_recipes (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT REFERENCES public.menu_items(id) ON DELETE CASCADE,
  menu_item_name TEXT NOT NULL,
  output_qty NUMERIC NOT NULL DEFAULT 1,
  output_uom TEXT NOT NULL DEFAULT 'portion',
  yield_pct NUMERIC NOT NULL DEFAULT 100,
  wastage_pct NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  cost_per_serving NUMERIC NOT NULL DEFAULT 0,
  suggested_price NUMERIC DEFAULT 0,
  margin_pct NUMERIC DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bom_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id TEXT REFERENCES public.bom_recipes(id) ON DELETE CASCADE,
  material_id TEXT REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0,
  uom TEXT NOT NULL DEFAULT 'kg',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0
);

-- Seed BOM Recipes for All 25 Menu Items (m1 - m25)
INSERT INTO public.bom_recipes (id, menu_item_id, menu_item_name, output_qty, output_uom, yield_pct, wastage_pct, total_cost, cost_per_serving, suggested_price, margin_pct, notes) VALUES
('bom-m1', 'm1', 'Paneer Tikka', 1, 'portion', 96, 4, 69.2, 69.2, 230, 75.3, 'Char-grilled cottage cheese in spiced marinade'),
('bom-m2', 'm2', 'Chicken 65', 1, 'portion', 94, 6, 65.8, 65.8, 220, 72.6, 'Spicy fried chicken starter'),
('bom-m3', 'm3', 'Veg Spring Roll', 1, 'portion', 95, 5, 19.4, 19.4, 65, 89.2, 'Crispy rolls with vegetable filling'),
('bom-m4', 'm4', 'Fish Amritsari', 1, 'portion', 93, 7, 102.2, 102.2, 340, 68.1, 'Crispy batter-fried fish fillets'),
('bom-m5', 'm5', 'Butter Chicken', 1, 'portion', 95, 5, 88.0, 88.0, 295, 74.1, 'Creamy tomato gravy with tender chicken'),
('bom-m6', 'm6', 'Paneer Butter Masala', 1, 'portion', 94, 6, 75.2, 75.2, 250, 74.9, 'Rich makhani gravy with cottage cheese'),
('bom-m7', 'm7', 'Dal Makhani', 1, 'portion', 95, 5, 39.9, 39.9, 135, 81.9, 'Slow-cooked black lentils with butter and cream'),
('bom-m8', 'm8', 'Mutton Rogan Josh', 1, 'portion', 90, 10, 191.6, 191.6, 640, 54.4, 'Kashmiri style tender mutton curry'),
('bom-m9', 'm9', 'Chicken Biryani', 1, 'portion', 92, 8, 77.66, 77.66, 260, 72.3, 'Dum-cooked basmati with marinated chicken'),
('bom-m10', 'm10', 'Veg Biryani', 1, 'portion', 94, 6, 48.76, 48.76, 165, 77.8, 'Aromatic basmati rice with mixed vegetables'),
('bom-m11', 'm11', 'Mutton Biryani', 1, 'portion', 90, 10, 180.1, 180.1, 600, 52.6, 'Rich aromatic mutton dum biryani'),
('bom-m12', 'm12', 'Hyderabadi Biryani', 1, 'portion', 92, 8, 85.0, 85.0, 285, 73.4, 'Spicy Hyderabadi style chicken biryani'),
('bom-m13', 'm13', 'Tandoori Chicken (Half)', 1, 'portion', 92, 8, 96.0, 96.0, 320, 63.1, 'Classic clay-oven roasted chicken'),
('bom-m14', 'm14', 'Seekh Kebab', 1, 'portion', 94, 6, 57.4, 57.4, 190, 76.1, 'Minced spiced meat skewers'),
('bom-m15', 'm15', 'Tandoori Roti', 1, 'portion', 98, 2, 5.8, 5.8, 20, 80.7, 'Whole wheat clay oven bread'),
('bom-m16', 'm16', 'Butter Naan', 1, 'portion', 97, 3, 13.05, 13.05, 45, 71.0, 'Soft refined flour bread topped with butter'),
('bom-m17', 'm17', 'Garlic Naan', 1, 'portion', 97, 3, 15.05, 15.05, 50, 72.6, 'Naan topped with minced garlic & butter'),
('bom-m18', 'm18', 'Masala Dosa', 1, 'portion', 96, 4, 19.25, 19.25, 65, 86.2, 'Crispy rice crepe filled with spiced potato'),
('bom-m19', 'm19', 'Sweet Lassi', 1, 'portion', 98, 2, 19.06, 19.06, 65, 76.2, 'Chilled churned yogurt drink with dry fruits'),
('bom-m20', 'm20', 'Fresh Lime Soda', 1, 'portion', 99, 1, 9.79, 9.79, 35, 83.7, 'Refreshing fizzy lime drink'),
('bom-m21', 'm21', 'Masala Chai', 1, 'portion', 98, 2, 10.43, 10.43, 35, 73.9, 'Spiced Indian milk tea'),
('bom-m22', 'm22', 'Cold Coffee', 1, 'portion', 98, 2, 26.4, 26.4, 90, 78.0, 'Creamy blended cold coffee'),
('bom-m23', 'm23', 'Gulab Jamun (2 pc)', 1, 'portion', 96, 4, 33.36, 33.36, 110, 62.9, 'Warm fried dough balls in rose syrup'),
('bom-m24', 'm24', 'Rasmalai (2 pc)', 1, 'portion', 96, 4, 40.28, 40.28, 135, 59.7, 'Soft cottage cheese patties in saffron milk'),
('bom-m25', 'm25', 'Gajar Halwa', 1, 'portion', 95, 5, 35.13, 35.13, 115, 68.1, 'Rich carrot pudding with nuts & ghee')
ON CONFLICT (id) DO UPDATE SET total_cost = EXCLUDED.total_cost, cost_per_serving = EXCLUDED.cost_per_serving;

-- Seed BOM Recipe Component Ingredients (m1 - m25)
INSERT INTO public.bom_components (recipe_id, material_id, material_name, qty, uom, unit_cost, total_cost) VALUES
('bom-m1', 'r3', 'Paneer', 0.2, 'kg', 280, 56.0),
('bom-m1', 'r5', 'Onions', 0.1, 'kg', 32, 3.2),
('bom-m1', 'r9', 'Cooking Oil', 0.02, 'L', 140, 2.8),
('bom-m1', 'r6', 'Ginger-Garlic Paste', 0.01, 'kg', 120, 1.2),
('bom-m1', 'r12', 'Green Chilli', 0.01, 'kg', 80, 0.8),
('bom-m1', 'r10', 'Ghee', 0.01, 'kg', 520, 5.2),

('bom-m2', 'r2', 'Chicken (boneless)', 0.22, 'kg', 240, 52.8),
('bom-m2', 'r9', 'Cooking Oil', 0.04, 'L', 140, 5.6),
('bom-m2', 'r6', 'Ginger-Garlic Paste', 0.02, 'kg', 120, 2.4),
('bom-m2', 'r12', 'Green Chilli', 0.015, 'kg', 80, 1.2),
('bom-m2', 'r23', 'Tea Leaves & Spices', 0.01, 'kg', 380, 3.8),

('bom-m3', 'r15', 'Mixed Vegetables', 0.2, 'kg', 50, 10.0),
('bom-m3', 'r8', 'Maida (Refined Flour)', 0.08, 'kg', 45, 3.6),
('bom-m3', 'r9', 'Cooking Oil', 0.03, 'L', 140, 4.2),
('bom-m3', 'r5', 'Onions', 0.05, 'kg', 32, 1.6),

('bom-m4', 'r13', 'Fish Fillet', 0.22, 'kg', 420, 92.4),
('bom-m4', 'r8', 'Maida (Refined Flour)', 0.04, 'kg', 45, 1.8),
('bom-m4', 'r6', 'Ginger-Garlic Paste', 0.02, 'kg', 120, 2.4),
('bom-m4', 'r9', 'Cooking Oil', 0.04, 'L', 140, 5.6),

('bom-m5', 'r2', 'Chicken (boneless)', 0.2, 'kg', 240, 48.0),
('bom-m5', 'r4', 'Tomatoes', 0.25, 'kg', 40, 10.0),
('bom-m5', 'r7', 'Fresh Cream', 0.08, 'L', 180, 14.4),
('bom-m5', 'r10', 'Ghee', 0.03, 'kg', 520, 15.6),

('bom-m6', 'r3', 'Paneer', 0.18, 'kg', 280, 50.4),
('bom-m6', 'r4', 'Tomatoes', 0.2, 'kg', 40, 8.0),
('bom-m6', 'r7', 'Fresh Cream', 0.05, 'L', 180, 9.0),
('bom-m6', 'r10', 'Ghee', 0.015, 'kg', 520, 7.8),

('bom-m7', 'r14', 'Black Lentils (Urad Dal)', 0.15, 'kg', 110, 16.5),
('bom-m7', 'r7', 'Fresh Cream', 0.05, 'L', 180, 9.0),
('bom-m7', 'r10', 'Ghee', 0.02, 'kg', 520, 10.4),
('bom-m7', 'r4', 'Tomatoes', 0.1, 'kg', 40, 4.0),

('bom-m8', 'r11', 'Mutton', 0.25, 'kg', 680, 170.0),
('bom-m8', 'r5', 'Onions', 0.15, 'kg', 32, 4.8),
('bom-m8', 'r4', 'Tomatoes', 0.1, 'kg', 40, 4.0),
('bom-m8', 'r10', 'Ghee', 0.02, 'kg', 520, 10.4),
('bom-m8', 'r6', 'Ginger-Garlic Paste', 0.02, 'kg', 120, 2.4),

('bom-m9', 'r1', 'Basmati Rice', 0.18, 'kg', 85, 15.3),
('bom-m9', 'r2', 'Chicken (boneless)', 0.2, 'kg', 240, 48.0),
('bom-m9', 'r5', 'Onions', 0.08, 'kg', 32, 2.56),
('bom-m9', 'r6', 'Ginger-Garlic Paste', 0.02, 'kg', 120, 2.4),
('bom-m9', 'r9', 'Cooking Oil', 0.03, 'L', 140, 4.2),
('bom-m9', 'r10', 'Ghee', 0.01, 'kg', 520, 5.2),

('bom-m10', 'r1', 'Basmati Rice', 0.18, 'kg', 85, 15.3),
('bom-m10', 'r15', 'Mixed Vegetables', 0.15, 'kg', 50, 7.5),
('bom-m10', 'r3', 'Paneer', 0.05, 'kg', 280, 14.0),
('bom-m10', 'r5', 'Onions', 0.08, 'kg', 32, 2.56),
('bom-m10', 'r9', 'Cooking Oil', 0.03, 'L', 140, 4.2),
('bom-m10', 'r10', 'Ghee', 0.01, 'kg', 520, 5.2),

('bom-m11', 'r1', 'Basmati Rice', 0.18, 'kg', 85, 15.3),
('bom-m11', 'r11', 'Mutton', 0.22, 'kg', 680, 149.6),
('bom-m11', 'r5', 'Onions', 0.1, 'kg', 32, 3.2),
('bom-m11', 'r9', 'Cooking Oil', 0.03, 'L', 140, 4.2),
('bom-m11', 'r10', 'Ghee', 0.015, 'kg', 520, 7.8),

('bom-m12', 'r1', 'Basmati Rice', 0.2, 'kg', 85, 17.0),
('bom-m12', 'r2', 'Chicken (boneless)', 0.22, 'kg', 240, 52.8),
('bom-m12', 'r5', 'Onions', 0.1, 'kg', 32, 3.2),
('bom-m12', 'r10', 'Ghee', 0.02, 'kg', 520, 10.4),
('bom-m12', 'r12', 'Green Chilli', 0.02, 'kg', 80, 1.6),

('bom-m13', 'r2', 'Chicken (boneless)', 0.35, 'kg', 240, 84.0),
('bom-m13', 'r6', 'Ginger-Garlic Paste', 0.02, 'kg', 120, 2.4),
('bom-m13', 'r21', 'Lemon & Mint', 0.02, 'kg', 90, 1.8),
('bom-m13', 'r10', 'Ghee', 0.015, 'kg', 520, 7.8),

('bom-m14', 'r2', 'Chicken (boneless)', 0.2, 'kg', 240, 48.0),
('bom-m14', 'r5', 'Onions', 0.05, 'kg', 32, 1.6),
('bom-m14', 'r6', 'Ginger-Garlic Paste', 0.015, 'kg', 120, 1.8),
('bom-m14', 'r12', 'Green Chilli', 0.01, 'kg', 80, 0.8),
('bom-m14', 'r10', 'Ghee', 0.01, 'kg', 520, 5.2),

('bom-m15', 'r16', 'Whole Wheat Flour (Atta)', 0.08, 'kg', 40, 3.2),
('bom-m15', 'r10', 'Ghee', 0.005, 'kg', 520, 2.6),

('bom-m16', 'r8', 'Maida (Refined Flour)', 0.09, 'kg', 45, 4.05),
('bom-m16', 'r19', 'Milk & Curd', 0.02, 'L', 60, 1.2),
('bom-m16', 'r10', 'Ghee', 0.015, 'kg', 520, 7.8),

('bom-m17', 'r8', 'Maida (Refined Flour)', 0.09, 'kg', 45, 4.05),
('bom-m17', 'r17', 'Garlic', 0.02, 'kg', 160, 3.2),
('bom-m17', 'r10', 'Ghee', 0.015, 'kg', 520, 7.8),

('bom-m18', 'r1', 'Basmati Rice', 0.1, 'kg', 85, 8.5),
('bom-m18', 'r18', 'Potato', 0.15, 'kg', 25, 3.75),
('bom-m18', 'r5', 'Onions', 0.05, 'kg', 32, 1.6),
('bom-m18', 'r9', 'Cooking Oil', 0.02, 'L', 140, 2.8),
('bom-m18', 'r10', 'Ghee', 0.005, 'kg', 520, 2.6),

('bom-m19', 'r19', 'Milk & Curd', 0.25, 'L', 60, 15.0),
('bom-m19', 'r20', 'Sugar', 0.03, 'kg', 42, 1.26),
('bom-m19', 'r27', 'Nuts & Saffron', 0.002, 'kg', 1400, 2.8),

('bom-m20', 'r22', 'Soda / Carbonated Water', 0.25, 'L', 25, 6.25),
('bom-m20', 'r21', 'Lemon & Mint', 0.03, 'kg', 90, 2.7),
('bom-m20', 'r20', 'Sugar', 0.02, 'kg', 42, 0.84),

('bom-m21', 'r19', 'Milk & Curd', 0.1, 'L', 60, 6.0),
('bom-m21', 'r23', 'Tea Leaves & Spices', 0.01, 'kg', 380, 3.8),
('bom-m21', 'r20', 'Sugar', 0.015, 'kg', 42, 0.63),

('bom-m22', 'r19', 'Milk & Curd', 0.2, 'L', 60, 12.0),
('bom-m22', 'r24', 'Coffee Powder', 0.015, 'kg', 650, 9.75),
('bom-m22', 'r20', 'Sugar', 0.025, 'kg', 42, 1.05),
('bom-m22', 'r7', 'Fresh Cream', 0.02, 'L', 180, 3.6),

('bom-m23', 'r25', 'Khoya / Mawa', 0.08, 'kg', 340, 27.2),
('bom-m23', 'r20', 'Sugar', 0.08, 'kg', 42, 3.36),
('bom-m23', 'r9', 'Cooking Oil', 0.02, 'L', 140, 2.8),

('bom-m24', 'r3', 'Paneer', 0.08, 'kg', 280, 22.4),
('bom-m24', 'r19', 'Milk & Curd', 0.2, 'L', 60, 12.0),
('bom-m24', 'r20', 'Sugar', 0.04, 'kg', 42, 1.68),
('bom-m24', 'r27', 'Nuts & Saffron', 0.003, 'kg', 1400, 4.2),

('bom-m25', 'r26', 'Carrot (Red)', 0.25, 'kg', 45, 11.25),
('bom-m25', 'r19', 'Milk & Curd', 0.15, 'L', 60, 9.0),
('bom-m25', 'r20', 'Sugar', 0.04, 'kg', 42, 1.68),
('bom-m25', 'r10', 'Ghee', 0.02, 'kg', 520, 10.4),
('bom-m25', 'r27', 'Nuts & Saffron', 0.002, 'kg', 1400, 2.8);

-- 7. Bill of Quantities (BOQ Production Plans & Calculations)
CREATE TABLE IF NOT EXISTS public.boq_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_or_type TEXT CHECK (event_or_type IN ('daily_prep', 'banquet', 'weekly_forecast', 'custom')) DEFAULT 'daily_prep',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_estimated_cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'approved', 'po_generated', 'issued_to_kitchen')) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Enable Realtime Change Data Capture (CDC) Safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;
END $$;

-- 9. Enable Row-Level Security (RLS) & Permissive Public Access Safely
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Public Read Write Menu" ON public.menu_items;
DROP POLICY IF EXISTS "Public Read Write Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Read Write Order Items" ON public.order_items;
DROP POLICY IF EXISTS "Public Read Write Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Write Raw Materials" ON public.raw_materials;
DROP POLICY IF EXISTS "Public Read Write Purchase Orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Public Read Write Attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Public Read Write BOM Recipes" ON public.bom_recipes;
DROP POLICY IF EXISTS "Public Read Write BOM Components" ON public.bom_components;
DROP POLICY IF EXISTS "Public Read Write BOQ Plans" ON public.boq_plans;

-- Permissive RLS Policies for Anon / Authenticated Access
CREATE POLICY "Public Read Categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Public Read Write Menu" ON public.menu_items FOR ALL USING (true);
CREATE POLICY "Public Read Write Orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Public Read Write Order Items" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Public Read Write Profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public Read Write Raw Materials" ON public.raw_materials FOR ALL USING (true);
CREATE POLICY "Public Read Write Purchase Orders" ON public.purchase_orders FOR ALL USING (true);
CREATE POLICY "Public Read Write Attendance" ON public.attendance_records FOR ALL USING (true);
CREATE POLICY "Public Read Write BOM Recipes" ON public.bom_recipes FOR ALL USING (true);
CREATE POLICY "Public Read Write BOM Components" ON public.bom_components FOR ALL USING (true);
CREATE POLICY "Public Read Write BOQ Plans" ON public.boq_plans FOR ALL USING (true);
