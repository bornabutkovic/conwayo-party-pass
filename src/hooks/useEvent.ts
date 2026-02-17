import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Event = Tables<"events">;
export type TicketTier = Tables<"ticket_tiers">;

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      console.log("Current Slug:", slug);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) {
        console.error("Supabase event query error:", error);
        throw error;
      }
      if (!data) {
        console.warn("No event found for slug:", slug);
        throw new Error("Event not found");
      }
      console.log("Event loaded:", data.name, data.id);
      return data as Event;
    },
    enabled: !!slug,
  });
}

export function useAvailableEvents() {
  return useQuery({
    queryKey: ["available_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("slug, name, status, start_date, venue_name")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTicketTiers(eventId: string | undefined) {
  return useQuery({
    queryKey: ["ticket_tiers", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", eventId!)
        .eq("status", "active")
        .order("price", { ascending: true });
      if (error) throw error;
      return data as TicketTier[];
    },
    enabled: !!eventId,
  });
}
