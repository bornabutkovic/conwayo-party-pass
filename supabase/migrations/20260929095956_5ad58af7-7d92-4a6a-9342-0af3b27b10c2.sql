CREATE OR REPLACE FUNCTION public.check_order_item_tier_dependency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_req uuid; v_req_name text; v_email text;
BEGIN
  IF new.ticket_type_id IS NULL THEN RETURN NULL; END IF;
  SELECT requires_tier_id INTO v_req FROM public.ticket_tiers WHERE id = new.ticket_type_id;
  IF v_req IS NULL THEN RETURN NULL; END IF;
  SELECT lower(trim(email)) INTO v_email FROM public.attendees WHERE id = new.attendee_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.attendees a ON a.id = oi.attendee_id
    WHERE oi.order_id = new.order_id AND oi.ticket_type_id = v_req
      AND lower(trim(a.email)) = v_email
  ) THEN
    SELECT name INTO v_req_name FROM public.ticket_tiers WHERE id = v_req;
    RAISE EXCEPTION 'TIER_DEPENDENCY: ova ulaznica zahtijeva kupnju ulaznice "%"', trim(v_req_name)
      USING errcode = 'P0001';
  END IF;
  RETURN NULL;
END $function$;