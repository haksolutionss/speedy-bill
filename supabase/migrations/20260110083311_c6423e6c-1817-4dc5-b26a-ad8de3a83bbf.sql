-- =====================================================
-- RESTAURANT BILLING SYSTEM DATABASE SCHEMA
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE SECTIONS (Areas like Main Hall, Garden, etc.)
-- =====================================================
CREATE TABLE public.table_sections (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.table_sections ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth for now - single location setup)
CREATE POLICY "Allow public read access on table_sections" 
ON public.table_sections FOR SELECT USING (true);

CREATE POLICY "Allow public insert on table_sections" 
ON public.table_sections FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on table_sections" 
ON public.table_sections FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on table_sections" 
ON public.table_sections FOR DELETE USING (true);

-- =====================================================
-- TABLES (Individual restaurant tables)
-- =====================================================
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.table_sections(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  current_bill_id UUID,
  current_amount NUMERIC(10, 2),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on tables" 
ON public.tables FOR SELECT USING (true);

CREATE POLICY "Allow public insert on tables" 
ON public.tables FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on tables" 
ON public.tables FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on tables" 
ON public.tables FOR DELETE USING (true);

CREATE INDEX idx_tables_section_id ON public.tables(section_id);
CREATE INDEX idx_tables_status ON public.tables(status);

-- =====================================================
-- PRODUCT CATEGORIES
-- =====================================================
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on categories" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Allow public insert on categories" 
ON public.categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on categories" 
ON public.categories FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on categories" 
ON public.categories FOR DELETE USING (true);

-- =====================================================
-- PRODUCTS (Menu items)
-- =====================================================
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  description TEXT,
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on products" 
ON public.products FOR SELECT USING (true);

CREATE POLICY "Allow public insert on products" 
ON public.products FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on products" 
ON public.products FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on products" 
ON public.products FOR DELETE USING (true);

CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_code ON public.products(code);
CREATE INDEX idx_products_is_active ON public.products(is_active);

-- =====================================================
-- PRODUCT PORTIONS (Full, Half, Quarter, Single)
-- =====================================================
CREATE TABLE public.product_portions (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT NOT NULL CHECK (size IN ('full', 'half', 'quarter', 'single')),
  price NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, size)
);

ALTER TABLE public.product_portions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on product_portions" 
ON public.product_portions FOR SELECT USING (true);

CREATE POLICY "Allow public insert on product_portions" 
ON public.product_portions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on product_portions" 
ON public.product_portions FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on product_portions" 
ON public.product_portions FOR DELETE USING (true);

CREATE INDEX idx_product_portions_product_id ON public.product_portions(product_id);

-- =====================================================
-- CUSTOMERS
-- =====================================================
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on customers" 
ON public.customers FOR SELECT USING (true);

CREATE POLICY "Allow public insert on customers" 
ON public.customers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on customers" 
ON public.customers FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on customers" 
ON public.customers FOR DELETE USING (true);

CREATE INDEX idx_customers_phone ON public.customers(phone);

-- =====================================================
-- BILLS (Orders/Invoices)
-- =====================================================
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  bill_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('table', 'parcel')),
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  table_number TEXT,
  token_number INTEGER,
  sub_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2),
  discount_reason TEXT,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cover_count INTEGER DEFAULT 1,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled', 'unsettled', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'split')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  settled_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on bills" 
ON public.bills FOR SELECT USING (true);

CREATE POLICY "Allow public insert on bills" 
ON public.bills FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on bills" 
ON public.bills FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on bills" 
ON public.bills FOR DELETE USING (true);

CREATE INDEX idx_bills_table_id ON public.bills(table_id);
CREATE INDEX idx_bills_status ON public.bills(status);
CREATE INDEX idx_bills_created_at ON public.bills(created_at DESC);
CREATE INDEX idx_bills_bill_number ON public.bills(bill_number);

-- =====================================================
-- BILL ITEMS (Cart items for each bill)
-- =====================================================
CREATE TABLE public.bill_items (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_code TEXT NOT NULL,
  portion TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  gst_rate NUMERIC(5, 2) NOT NULL,
  notes TEXT,
  sent_to_kitchen BOOLEAN NOT NULL DEFAULT false,
  kot_printed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on bill_items" 
ON public.bill_items FOR SELECT USING (true);

CREATE POLICY "Allow public insert on bill_items" 
ON public.bill_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on bill_items" 
ON public.bill_items FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on bill_items" 
ON public.bill_items FOR DELETE USING (true);

CREATE INDEX idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX idx_bill_items_product_id ON public.bill_items(product_id);

-- =====================================================
-- PAYMENT DETAILS (For split payments)
-- =====================================================
CREATE TABLE public.payment_details (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'upi')),
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on payment_details" 
ON public.payment_details FOR SELECT USING (true);

CREATE POLICY "Allow public insert on payment_details" 
ON public.payment_details FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on payment_details" 
ON public.payment_details FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on payment_details" 
ON public.payment_details FOR DELETE USING (true);

CREATE INDEX idx_payment_details_bill_id ON public.payment_details(bill_id);


-- =====================================================
-- SETTINGS (App configuration)
-- =====================================================
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on settings" 
ON public.settings FOR SELECT USING (true);

CREATE POLICY "Allow public insert on settings" 
ON public.settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on settings" 
ON public.settings FOR UPDATE USING (true);

-- =====================================================
-- SEQUENCES FOR AUTO-INCREMENT NUMBERS
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS token_number_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS kot_number_seq START WITH 1;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate bill number
CREATE OR REPLACE FUNCTION public.generate_bill_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'BILL-' || LPAD(nextval('bill_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate token number (resets daily via app logic)
CREATE OR REPLACE FUNCTION public.generate_token_number()
RETURNS INTEGER AS $$
BEGIN
  RETURN nextval('token_number_seq');
END;
$$ LANGUAGE plpgsql;

-- Generate KOT number
CREATE OR REPLACE FUNCTION public.generate_kot_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'KOT-' || LPAD(nextval('kot_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR updated_at
-- =====================================================
CREATE TRIGGER update_table_sections_updated_at
BEFORE UPDATE ON public.table_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_portions_updated_at
BEFORE UPDATE ON public.product_portions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
BEFORE UPDATE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bill_items_updated_at
BEFORE UPDATE ON public.bill_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ENABLE REALTIME FOR KEY TABLES
-- =====================================================
ALTER TABLE public.tables REPLICA IDENTITY FULL;
ALTER TABLE public.bills REPLICA IDENTITY FULL;
ALTER TABLE public.bill_items REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_items;