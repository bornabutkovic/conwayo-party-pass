import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Event = Tables<"events">;
export type TicketTier = Tables<"ticket_tiers">;
export type EventService = Tables<"event_services">;
export type Institution = Tables<"institutions">;

export interface OrganizerEntry {
  role: "co_organizer" | "technical_organizer" | string;
  display_order: number;
  institutions: Pick<
    Institution,
    | "name"
    | "address"
    | "city"
    | "oib"
    | "invoice_email"
    | "website"
    | "phone"
    | "facebook_url"
    | "linkedin_url"
    | "instagram_url"
  > | null;
}

export interface OrganizerInfo {
  name: string;
  website_url?: string | null;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  website?: string | null;
  phone?: string | null;
}

export interface EventWithRelations extends Event {
  institutions: Tables<"institutions"> | null;
  ticket_tiers: TicketTier[];
  event_services: EventService[];
  coOrganizers: OrganizerEntry[];
  technicalOrganizer: OrganizerEntry | null;
  coOrganizersInfo: OrganizerInfo[];
  technicalOrganizerInfo: OrganizerInfo | null;
  translations: Record<string, any> | null;
  supported_languages: string[] | null;
}

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

export function useEventFull(slug: string) {
  return useQuery({
    queryKey: ["event_full", slug],
    queryFn: async () => {
      // First get the event with institution
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          id, name, slug, short_name, description, cancellation_policy,
          translations, organizers_info, supported_languages,
          status, start_date, end_date, venue_name, location_address,
          location_city, location_country, location_postal_code,
          website_url, support_phone, event_type, currency, vat_rate,
          payment_due_days, branding_primary_color, branding_secondary_color,
          branding_text_color, branding_logo_url, branding_banner_url,
          branding_favicon_url, notification_sender_name, notification_sender_email,
          institutions!events_institution_uuid_fkey(
            name, address, city, oib, invoice_email,
            website, phone, facebook_url, linkedin_url, instagram_url
          )
        `)
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error("Supabase event query error:", error);
        throw error;
      }
      if (!event) throw new Error("Event not found");

      const { data: rawTranslations } = await supabase
        .rpc('get_event_translations', { p_event_id: event.id });

      console.log('RAW TRANSLATIONS VIA RPC:', rawTranslations);

      const { data: rawOrganizersInfo } = await supabase
        .rpc('get_event_organizers_info', { p_event_id: event.id });

      // Workaround: force-fetch supported_languages separately
      const { data: eventExtra } = await supabase
        .from('events')
        .select('supported_languages')
        .eq('id', event.id)
        .maybeSingle();
      const supported_languages = eventExtra?.supported_languages ?? ['hr'];

      // Fetch active ticket tiers within their sales window
      const now = new Date().toISOString();
      const { data: tiers } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", event.id)
        .eq("status", "active")
        .or(`sales_start.is.null,sales_start.lte.${now}`)
        .or(`sales_end.is.null,sales_end.gte.${now}`)
        .order("price", { ascending: true });

      // Fetch active services
      const { data: services } = await supabase
        .from("event_services")
        .select("*")
        .eq("event_id", event.id)
        .eq("status", "active")
        .order("price", { ascending: true });

      // Fetch co-organizers and technical organizer
      const { data: organizers } = await supabase
        .from("event_organizers")
        .select(
          "role, display_order, institutions(name, address, city, oib, invoice_email, website, phone, facebook_url, linkedin_url, instagram_url)"
        )
        .eq("event_id", event.id)
        .order("display_order", { ascending: true });

      const orgList = (organizers ?? []) as unknown as OrganizerEntry[];
      const coOrganizers = orgList.filter((o) => o.role === "co_organizer");
      const technicalOrganizer = orgList.find((o) => o.role === "technical_organizer") ?? null;

      const info = (rawOrganizersInfo ?? {}) as {
        co_organizers?: OrganizerInfo[];
        technical_organizer?: OrganizerInfo | null;
      };
      const coOrganizersInfo = Array.isArray(info.co_organizers)
        ? info.co_organizers.filter((o): o is OrganizerInfo => !!o && typeof o.name === "string" && o.name.trim() !== "")
        : [];
      const technicalOrganizerInfo =
        info.technical_organizer && typeof info.technical_organizer.name === "string" && info.technical_organizer.name.trim() !== ""
          ? info.technical_organizer
          : null;

      return {
        ...event,
        translations: rawTranslations as Record<string, any> | null,
        supported_languages,
        ticket_tiers: (tiers ?? []) as TicketTier[],
        event_services: (services ?? []) as EventService[],
        coOrganizers,
        technicalOrganizer,
        coOrganizersInfo,
        technicalOrganizerInfo,
      } as EventWithRelations;
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
        .select("slug, name, status, start_date, end_date, venue_name")
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
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", eventId!)
        .eq("status", "active")
        .or(`sales_start.is.null,sales_start.lte.${now}`)
        .or(`sales_end.is.null,sales_end.gte.${now}`)
        .order("price", { ascending: true });
      if (error) throw error;
      return data as TicketTier[];
    },
    enabled: !!eventId,
  });
}
