-- Fix realtime subscriptions by enabling FULL replica identity
-- This allows filtering on non-PK columns in realtime subscriptions
ALTER TABLE public.cart_items REPLICA IDENTITY FULL;
ALTER TABLE public.bill_items REPLICA IDENTITY FULL;
ALTER TABLE public.tables REPLICA IDENTITY FULL;