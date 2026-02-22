
-- Add payment_method and is_group_order columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_group_order boolean DEFAULT false;
