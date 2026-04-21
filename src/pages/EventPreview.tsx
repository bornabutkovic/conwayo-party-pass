import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, tr } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { EventBrandingProvider } from "@/components/event/EventBrandingProvider";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarDays,
  MapPin,
  Globe,
  Phone,
  Building2,
  Mail,
  ArrowRight,
  Ticket,
  Monitor,
  Users,
  ShieldCheck,
  MessageCircle,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { hr as hrLocale } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import type { Tables } from "@/integrations/supabase/types";

const ALLOWED_INSTITUTION_UUID = "aaaaaaaa-0000-0000-0000-000000000001";

function formatDateHr(dateStr: string | null) {
  if (!dateStr) return null;
  return format(new Date(dateStr), "d. MMMM yyyy.", { locale: hrLocale });
}

function formatDateEn(dateStr: string | null) {
  if (!dateStr) return null;
  return format(new Date(dateStr), "MMMM d, yyyy");
}

function formatTimeHr(dateStr: string | null) {
  if (!dateStr) return null;
  return format(new Date(dateStr), "HH:mm", { locale: hrLocale });
}

const EVENT_TYPE_LABELS: Record<string, { label: { hr: string; en: string }; icon: typeof Building2 }> = {
  face2face: { label: { hr: "Face2Face", en: "Face2Face" }, icon: Building2 },
  virtual: { label: { hr: "Virtual / Online", en: "Virtual / Online" }, icon: Monitor },
  hybrid: { label: { hr: "Hybrid", en: "Hybrid" }, icon: Users },
};

function useEventPreview(eventId: string) {
  return useQuery({
    queryKey: ["event_preview", eventId],
    queryFn: async () => {
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          *,
          institutions!events_institution_uuid_fkey(
            name, address, city, oib, invoice_email,
            website, phone, facebook_url, linkedin_url, instagram_url
          )
        `)
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      if (!event) return null;

      const { data: tiers } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", event.id)
        .eq("status", "active")
        .order("price", { ascending: true });

      const { data: services } = await supabase
        .from("event_services")
        .select("*")
        .eq("event_id", event.id)
        .eq("status", "active")
        .order("price", { ascending: true });

      return {
        ...event,
        ticket_tiers: (tiers ?? []) as Tables<"ticket_tiers">[],
        event_services: (services ?? []) as Tables<"event_services">[],
      };
    },
    enabled: !!eventId,
  });
}

function PlainNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
    </div>
  );
}

export default function EventPreview() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading, error } = useEventPreview(eventId ?? "");
  const { lang, t } = useLanguage();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [eventId]);

  if (isLoading) return <EventPageSkeleton />;
  if (error || !event) return <PlainNotFound />;
  if (event.institution_uuid !== ALLOWED_INSTITUTION_UUID) return <PlainNotFound />;

  const currency = event.currency ?? "EUR";
  const tiers = event.ticket_tiers ?? [];
  const services = event.event_services ?? [];
  const institution = (event as any).institutions;
  const primaryColor = event.branding_primary_color ?? "#6366f1";
  const bannerUrl = event.branding_banner_url;
  const eventTypeEntry = EVENT_TYPE_LABELS[event.event_type ?? "face2face"] ?? EVENT_TYPE_LABELS.face2face;
  const EventTypeIcon = eventTypeEntry.icon;

  const locationParts = [event.venue_name, event.location_address, event.location_city].filter(Boolean);
  const isVirtual = event.event_type === "virtual";

  const eventName = tr(event.translations as Record<string, any> | null, lang, "name", event.name);
  const eventDescription = tr(event.translations as Record<string, any> | null, lang, "description", event.description);
  const formatDate = lang === "hr" ? formatDateHr : formatDateEn;

  const previewMessage =
    lang === "hr"
      ? "Ovo je pregled. Registracija je onemogućena u načinu pregleda."
      : "This is a preview. Registration is disabled in preview mode.";
  const previewBadge = lang === "hr" ? "NAČIN PREGLEDA" : "PREVIEW MODE";

  return (
    <EventBrandingProvider event={event as any}>
      <div
        className="min-h-screen"
        style={{
          backgroundColor: event.branding_secondary_color ?? undefined,
          color: event.branding_text_color ?? undefined,
        }}
      >
        {/* PREVIEW BANNER */}
        <div
          className="sticky top-0 z-50 w-full border-b-2 border-yellow-600 bg-yellow-400 text-yellow-950"
          role="alert"
        >
          <div className="container mx-auto flex flex-col items-center justify-center gap-1 px-4 py-2 text-center sm:flex-row sm:gap-3">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
              <Eye className="h-4 w-4" />
              {previewBadge}
            </div>
            <span className="text-sm font-medium">{previewMessage}</span>
          </div>
        </div>

        <ConvwayoHeader showBackToEvents />

        {/* HERO */}
        <section className="relative overflow-hidden" style={{ height: 280 }}>
          {bannerUrl ? (
            <div className="absolute inset-0">
              <img src={bannerUrl} alt={`${eventName} banner`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/30" />
            </div>
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: primaryColor }}>
              <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10" />
              <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5" />
            </div>
          )}
        </section>

        {/* TITLE */}
        <section className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mx-auto max-w-4xl">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                {eventName}
              </h1>
            </div>
          </div>
        </section>

        {/* DETAILS */}
        <section className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {event.start_date && (
                <DetailItem
                  icon={<CalendarDays className="h-5 w-5 text-primary" />}
                  label={t("event.dateLabel")}
                  value={
                    <>
                      {formatDate(event.start_date)}
                      {formatTimeHr(event.start_date) && ` | ${formatTimeHr(event.start_date)}`}
                      {event.end_date && <> – {formatDate(event.end_date)}</>}
                    </>
                  }
                />
              )}

              {!isVirtual && locationParts.length > 0 && (
                <DetailItem
                  icon={<MapPin className="h-5 w-5 text-primary" />}
                  label={t("event.locationLabel")}
                  value={locationParts.join(", ")}
                />
              )}
              {isVirtual && (
                <DetailItem
                  icon={<Monitor className="h-5 w-5 text-primary" />}
                  label={t("event.locationLabel")}
                  value="Virtual Event – Online"
                />
              )}

              {event.website_url && (
                <DetailItem
                  icon={<Globe className="h-5 w-5 text-primary" />}
                  label={t("event.webLabel")}
                  value={
                    <span className="text-primary underline underline-offset-2">
                      {event.website_url.replace(/^https?:\/\//, "")}
                    </span>
                  }
                />
              )}
              {!event.website_url && event.support_phone && (
                <DetailItem
                  icon={<Phone className="h-5 w-5 text-primary" />}
                  label={t("event.phoneLabel")}
                  value={event.support_phone}
                />
              )}

              <DetailItem
                icon={<EventTypeIcon className="h-5 w-5 text-primary" />}
                label={t("event.typeLabel")}
                value={eventTypeEntry.label[lang]}
              />
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl space-y-12 py-10 md:py-14">
            {eventDescription && (
              <section>
                <h2 className="mb-4 text-2xl font-bold text-foreground">{t("event.aboutTitle")}</h2>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: eventDescription }}
                />
              </section>
            )}

            {/* TICKETS */}
            {tiers.length > 0 && (
              <section>
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold text-foreground">
                  <Ticket className="h-6 w-6" />
                  {t("event.ticketsTitle")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {tiers.map((tier) => {
                    const tierName = tr(tier.translations as Record<string, any> | null, lang, "name", tier.name);
                    const tierDesc = tr(tier.translations as Record<string, any> | null, lang, "description", tier.description);
                    return (
                      <Card key={tier.id} className="border-border opacity-90">
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold text-card-foreground">{tierName}</h3>
                          {tierDesc && <p className="mt-1 text-sm text-muted-foreground">{tierDesc}</p>}
                          <p className="mt-3 text-2xl font-bold text-primary">
                            {tier.price === 0
                              ? t("event.freeLabel")
                              : `${Number(tier.price).toFixed(2)} ${currency}`}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{t("event.priceIncludesVat")}</p>
                          {tier.capacity != null && tier.capacity > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {t("event.spotsLeft")}: {tier.capacity}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Registration options — equal weight (preview disabled) */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {/* Card 1 — Online registration (disabled) */}
                  <Card className="border-border opacity-70">
                    <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
                      <div className="space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Ticket className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{t("event.onlineTitle")}</h3>
                        <p className="text-sm text-muted-foreground">{t("event.onlineDesc")}</p>
                      </div>
                      <Button size="lg" className="w-full gap-2" disabled>
                        {t("event.registerNow")}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Card 2 — WhatsApp AI (disabled) */}
                  <Card className="border-border opacity-70">
                    <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
                      <div className="space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                          <MessageCircle className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{t("event.whatsappTitle")}</h3>
                        <p className="text-sm text-muted-foreground">{t("event.whatsappDesc")}</p>
                        <div className="flex justify-center pt-1">
                          <div className="rounded-lg border border-border bg-white p-2">
                            <QRCodeSVG value="preview-disabled" size={120} bgColor="#ffffff" fgColor="#a1a1aa" level="M" />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-muted px-5 py-3 text-sm font-medium text-muted-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("event.whatsappButton")}
                      </button>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {/* SERVICES */}
            {services.length > 0 && (
              <section>
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold text-foreground">
                  <ShieldCheck className="h-6 w-6" />
                  {t("event.servicesTitle")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {services.map((service) => {
                    const svcName = tr(service.translations as Record<string, any> | null, lang, "name", service.name);
                    const svcDesc = tr(service.translations as Record<string, any> | null, lang, "description", service.description);
                    return (
                      <Card key={service.id} className="border-border opacity-90">
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold text-card-foreground">{svcName}</h3>
                          {svcDesc && <p className="mt-1 text-sm text-muted-foreground">{svcDesc}</p>}
                          <p className="mt-3 text-2xl font-bold text-primary">
                            {service.price === 0
                              ? t("event.freeLabel")
                              : `${Number(service.price).toFixed(2)} ${currency}`}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{t("event.priceIncludesVat")}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <p className="mt-4 text-center text-sm text-muted-foreground">{t("event.servicesNote")}</p>
              </section>
            )}

            {/* ORGANIZER */}
            {institution && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-foreground">
                  <Building2 className="h-6 w-6" />
                  {t("event.organizerTitle")}
                </h2>
                <Card className="border-border">
                  <CardContent className="space-y-3 p-5 text-sm">
                    <div className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{institution.name}</span>
                    </div>
                    {(institution.address || institution.city) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{[institution.address, institution.city].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    {institution.oib && (
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>OIB/VAT: {institution.oib}</span>
                      </div>
                    )}
                    {institution.invoice_email && (
                      <div className="flex items-start gap-2">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-primary underline underline-offset-2">{institution.invoice_email}</span>
                      </div>
                    )}
                    {(institution.phone || event.support_phone) && (
                      <div className="flex items-start gap-2">
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{institution.phone || event.support_phone}</span>
                      </div>
                    )}
                    {institution.website && (
                      <div className="flex items-start gap-2">
                        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-primary underline underline-offset-2">
                          {institution.website.replace(/^https?:\/\//, "")}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        </div>
      </div>
    </EventBrandingProvider>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
