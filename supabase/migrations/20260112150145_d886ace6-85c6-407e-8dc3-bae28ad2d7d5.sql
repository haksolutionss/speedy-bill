-- Add section_prices column to product_portions table
-- This will store prices based on section/location as a JSONB object
-- Format: {"section_id_1": price1, "section_id_2": price2, "default": base_price}
ALTER TABLE public.product_portions 
ADD COLUMN IF NOT EXISTS section_prices jsonb DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.product_portions.section_prices IS 'JSON object storing section-specific prices. Key is section_id, value is price. The "price" column serves as the default price.';

-- Create an index for better query performance on section_prices
CREATE INDEX IF NOT EXISTS idx_product_portions_section_prices ON public.product_portions USING gin(section_prices);