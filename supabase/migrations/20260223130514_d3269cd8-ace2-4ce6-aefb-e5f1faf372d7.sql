-- Add public read access for events table (guests need to see event details)
CREATE POLICY "Public can view events"
ON public.events FOR SELECT
TO anon, authenticated
USING (true);