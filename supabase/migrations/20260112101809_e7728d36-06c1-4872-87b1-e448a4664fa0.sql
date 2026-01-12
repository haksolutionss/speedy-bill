-- First, delete the duplicate table entry (keeping the oldest one)
DELETE FROM public.tables WHERE id = '345b384e-e0aa-4674-b561-b703ca97ae92';

-- Add unique constraint for section name (only for active records)
CREATE UNIQUE INDEX table_sections_name_unique ON public.table_sections (name) WHERE is_active = true;

-- Add unique constraint for table number within a section (only for active records)
CREATE UNIQUE INDEX tables_number_section_unique ON public.tables (number, section_id) WHERE is_active = true;

-- Add unique constraint for category name (only for active records)
CREATE UNIQUE INDEX categories_name_unique ON public.categories (name) WHERE is_active = true;

-- Add unique constraint for product code (only for active records)
CREATE UNIQUE INDEX products_code_unique ON public.products (code) WHERE is_active = true;

-- Add unique constraint for product name (only for active records)
CREATE UNIQUE INDEX products_name_unique ON public.products (name) WHERE is_active = true;