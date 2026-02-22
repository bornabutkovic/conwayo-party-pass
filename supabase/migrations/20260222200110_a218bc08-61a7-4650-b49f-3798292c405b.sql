
-- Allow public read of orders for guest checkout flow
CREATE POLICY "Allow public select for guest orders"
ON public.orders
FOR SELECT
USING (true);
