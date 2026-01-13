-- Create cart_items table for pre-bill cart storage
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_code TEXT NOT NULL,
  portion TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  gst_rate NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  sent_to_kitchen BOOLEAN NOT NULL DEFAULT false,
  kot_printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (no auth required for POS system)
CREATE POLICY "Allow full access to cart_items" 
ON public.cart_items 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster lookups by table_id
CREATE INDEX idx_cart_items_table_id ON public.cart_items(table_id);

-- Create trigger for updated_at
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for cart_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;