-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff');

-- Create user_roles table for proper RBAC
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create staff_permissions table for module-level access
CREATE TABLE public.staff_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    can_access_billing BOOLEAN NOT NULL DEFAULT true,
    can_access_products BOOLEAN NOT NULL DEFAULT false,
    can_access_tables BOOLEAN NOT NULL DEFAULT false,
    can_access_reports BOOLEAN NOT NULL DEFAULT false,
    can_access_history BOOLEAN NOT NULL DEFAULT false,
    can_access_settings BOOLEAN NOT NULL DEFAULT false,
    can_access_customers BOOLEAN NOT NULL DEFAULT false,
    can_access_staff BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on staff_permissions
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view roles"
ON public.user_roles
FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for staff_permissions
CREATE POLICY "Anyone can view permissions"
ON public.staff_permissions
FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify permissions"
ON public.staff_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add session_expires_at to users table for 1-month session management
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP WITH TIME ZONE;

-- Add loyalty_settings and billing_defaults to settings keys
-- These will be stored as JSON in the settings table

-- Create trigger for staff_permissions updated_at
CREATE TRIGGER update_staff_permissions_updated_at
BEFORE UPDATE ON public.staff_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();