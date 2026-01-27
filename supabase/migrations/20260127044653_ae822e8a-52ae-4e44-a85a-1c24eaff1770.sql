-- Create portion_templates table for global portion size definitions
CREATE TABLE public.portion_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g., "100gm", "250gm", "Half", "Full"
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on portion_templates
ALTER TABLE public.portion_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for portion_templates (public access like other config tables)
CREATE POLICY "Allow public read access on portion_templates" 
ON public.portion_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on portion_templates" 
ON public.portion_templates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update on portion_templates" 
ON public.portion_templates 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete on portion_templates" 
ON public.portion_templates 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_portion_templates_updated_at
BEFORE UPDATE ON public.portion_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default portion templates
INSERT INTO public.portion_templates (name, display_order) VALUES
  ('Full', 0),
  ('Half', 1),
  ('Quarter', 2),
  ('100gm', 3),
  ('250gm', 4),
  ('500gm', 5),
  ('1kg', 6);

-- Alter product_portions table to reference portion_template
-- Adding template_id column (nullable for backward compatibility)
ALTER TABLE public.product_portions 
ADD COLUMN template_id UUID REFERENCES public.portion_templates(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_product_portions_template_id ON public.product_portions(template_id);
CREATE INDEX idx_portion_templates_display_order ON public.portion_templates(display_order);