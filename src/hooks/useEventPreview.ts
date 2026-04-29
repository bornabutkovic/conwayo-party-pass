import { useQuery } from "@tanstack/react-query";

export function useEventPreview(eventId: string) {
  return useQuery({
    queryKey: ["event_preview", eventId],
    queryFn: async () => {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/get-event-preview?eventId=${eventId}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) return null;

      const data = await res.json();
      if (data.error) return null;
      return data;
    },
    enabled: !!eventId,
  });
}
