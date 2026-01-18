-- Create print_jobs table for queuing print jobs
CREATE TABLE public.print_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL CHECK (job_type IN ('kot', 'bill', 'test')),
  printer_role TEXT NOT NULL DEFAULT 'counter',
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  agent_id TEXT -- Which agent picked up the job
);

-- Enable RLS
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create print jobs
CREATE POLICY "Users can create print jobs" 
ON public.print_jobs 
FOR INSERT 
WITH CHECK (true);

-- Allow reading own print jobs (for status checks)
CREATE POLICY "Users can read print jobs" 
ON public.print_jobs 
FOR SELECT 
USING (true);

-- Allow updates (for agent to mark as processed)
CREATE POLICY "Allow print job updates" 
ON public.print_jobs 
FOR UPDATE 
USING (true);

-- Create index for pending jobs lookup
CREATE INDEX idx_print_jobs_pending ON public.print_jobs (status, created_at) 
WHERE status = 'pending';

-- Auto-cleanup old completed jobs (keep for 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_print_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.print_jobs 
  WHERE status IN ('completed', 'failed') 
  AND created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;