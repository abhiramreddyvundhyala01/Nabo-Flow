-- ════════════════════════════════════════════════════════════════════════════════
-- Nabo Flow — Complete Supabase PostgreSQL Production Database Schema & Initial Seed
-- Paste this entire script into your Supabase Dashboard -> SQL Editor and click "Run"
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
VALUES ('admin@naboflow.com', 'Super Admin', 'admin', 'Main Branch', true, '1234')
ON CONFLICT (email) DO NOTHING;

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

-- 6. Enable Realtime Change Data Capture (CDC) for Kitchen & POS syncing
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- 7. Enable Row-Level Security (RLS) & Permissive Public Access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for Anon / Authenticated Access
CREATE POLICY "Public Read Categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Public Read Write Menu" ON public.menu_items FOR ALL USING (true);
CREATE POLICY "Public Read Write Orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Public Read Write Order Items" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Public Read Write Profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public Read Write Raw Materials" ON public.raw_materials FOR ALL USING (true);
CREATE POLICY "Public Read Write Purchase Orders" ON public.purchase_orders FOR ALL USING (true);
CREATE POLICY "Public Read Write Attendance" ON public.attendance_records FOR ALL USING (true);
