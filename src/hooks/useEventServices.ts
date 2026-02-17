import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type EventService = Tables<"event_services">;

export function useEventServices(eventId: string | undefined | null) {
  return useQuery({
    queryKey: ["event_services", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_services")
        .select("*")
        .eq("event_id", eventId!)
        .order("price", { ascending: true });
      if (error) throw error;
      return data as EventService[];
    },
    enabled: !!eventId,
  });
}
