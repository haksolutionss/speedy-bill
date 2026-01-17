-- Create users table for mobile/PIN authentication
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mobile TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Public access for POS system (no Supabase Auth for simple PIN login)
CREATE POLICY "Allow public read access on users" 
ON public.users FOR SELECT USING (true);

CREATE POLICY "Allow public insert on users" 
ON public.users FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on users" 
ON public.users FOR UPDATE USING (true);

-- Create user_preferences table for per-user settings
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on user_preferences" 
ON public.user_preferences FOR SELECT USING (true);

CREATE POLICY "Allow public insert on user_preferences" 
ON public.user_preferences FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on user_preferences" 
ON public.user_preferences FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on user_preferences" 
ON public.user_preferences FOR DELETE USING (true);

-- Create printers table for printer configuration
CREATE TABLE public.printers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT,
  port INTEGER DEFAULT 9100,
  type TEXT NOT NULL DEFAULT 'network',
  role TEXT NOT NULL DEFAULT 'counter',
  format TEXT NOT NULL DEFAULT '76mm',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on printers" 
ON public.printers FOR SELECT USING (true);

CREATE POLICY "Allow public insert on printers" 
ON public.printers FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on printers" 
ON public.printers FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on printers" 
ON public.printers FOR DELETE USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_printers_updated_at
  BEFORE UPDATE ON public.printers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();