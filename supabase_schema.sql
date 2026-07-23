-- ════════════════════════════════════════════════════════════════════════════════
-- Nabo Flow — Complete Supabase PostgreSQL Production Database Schema
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

-- 7. Enable Row-Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

-- Default Permissive RLS Policies for Anon/Authenticated App Access
CREATE POLICY "Allow public read access to menu" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full access to orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow authenticated full access to profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow authenticated full access to raw materials" ON public.raw_materials FOR ALL USING (true);
