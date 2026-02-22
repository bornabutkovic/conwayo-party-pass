
-- Allow public read of attendees for guest checkout flow (PostgREST needs SELECT to return inserted rows)
CREATE POLICY "Allow public select for guest registration"
ON public.attendees
FOR SELECT
USING (true);
