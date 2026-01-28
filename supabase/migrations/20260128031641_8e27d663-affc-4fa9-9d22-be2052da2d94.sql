-- Enable RLS on portion_sizes table
ALTER TABLE public.portion_sizes ENABLE ROW LEVEL SECURITY;

-- Create policies for portion_sizes
CREATE POLICY "Allow public read access on portion_sizes"
ON public.portion_sizes
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on portion_sizes"
ON public.portion_sizes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update on portion_sizes"
ON public.portion_sizes
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete on portion_sizes"
ON public.portion_sizes
FOR DELETE
USING (true);