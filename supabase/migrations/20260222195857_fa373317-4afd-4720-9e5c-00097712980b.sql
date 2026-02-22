
-- Allow anonymous/public inserts on attendees for guest checkout
CREATE POLICY "Allow public insert for guest registration"
ON public.attendees
FOR INSERT
WITH CHECK (true);

-- Allow anonymous/public inserts on orders for guest checkout
CREATE POLICY "Allow public insert for guest orders"
ON public.orders
FOR INSERT
WITH CHECK (true);
