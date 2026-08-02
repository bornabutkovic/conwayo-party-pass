import { useEffect, useMemo, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useEventFull, type EventService } from "@/hooks/useEvent";
import { useLanguage, tr } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { EventBrandingProvider } from "@/components/event/EventBrandingProvider";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrganizerCard } from "@/components/event/OrganizerCard";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Clock,
  Headphones,
  Smartphone,
  Eye,
} from "lucide-react";

interface SupportContact {
  name?: string;
  email?: string;
  phone_mobile?: string;
  phone_landline?: string;
  working_hours?: string;
  website?: string;
}
import { format } from "date-fns";
import { hr as hrLocale } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

const VOICE_AGENT_ENABLED = true;

function localiseWorkingHours(value: string, lang: string): string {
  if (lang !== "hr") return value;
  const map: Record<string, string> = {
    Monday: "Pon",
    Tuesday: "Uto",
    Wednesday: "Sri",
    Thursday: "Čet",
    Friday: "Pet",
    Saturday: "Sub",
    Sunday: "Ned",
  };
  let result = value;
  for (const [en, hr] of Object.entries(map)) {
    result = result.replace(new RegExp(en, "g"), hr);
  }
  return result;
}

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
  const d = new Date(dateStr);
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return format(d, "HH:mm", { locale: hrLocale });
}

const EVENT_TYPE_LABELS: Record<string, { label: { hr: string; en: string }; icon: typeof Building2 }> = {
  face2face: { label: { hr: "Face2Face", en: "Face2Face" }, icon: Building2 },
  virtual: { label: { hr: "Virtual / Online", en: "Virtual / Online" }, icon: Monitor },
  hybrid: { label: { hr: "Hybrid", en: "Hybrid" }, icon: Users },
};



interface EventLandingProps {
  previewEvent?: any;
  isPreview?: boolean;
}

function stripUnsafeHtml(html: string): string {
  const ALLOWED_TAGS = ['p','br','strong','b','em','i','u','ul','ol','li','h1','h2','h3','h4','a','span','div'];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  function clean(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode();
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.includes(tag)) return null;
    const safe = document.createElement(tag);
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) safe.setAttribute('href', href);
      safe.setAttribute('target', '_blank');
      safe.setAttribute('rel', 'noopener noreferrer');
    }
    el.childNodes.forEach(child => {
      const cleaned = clean(child);
      if (cleaned) safe.appendChild(cleaned);
    });
    return safe;
  }
  const out = document.createElement('div');
  doc.body.childNodes.forEach(child => {
    const cleaned = clean(child);
    if (cleaned) out.appendChild(cleaned);
  });
  return out.innerHTML;
}

export default function EventLanding({ previewEvent, isPreview = false }: EventLandingProps = {}) {

  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: fetchedEvent, isLoading, error } = useEventFull(previewEvent ? "" : (slug ?? ""));
  const event = previewEvent ?? fetchedEvent;
  const { lang, setLang, t } = useLanguage();
  

  const supportsEnglish = useMemo(() => {
    return Array.isArray(event?.supported_languages) && event!.supported_languages!.includes("en");
  }, [event?.supported_languages]);

  const displayLang = useMemo<"hr" | "en">(() => {
    if (!supportsEnglish) return "hr";
    return lang === "en" ? "en" : "hr";
  }, [lang, supportsEnglish]);

  const switchLang = useCallback((next: "hr" | "en") => {
    setLang(next);
    const params = new URLSearchParams(location.search);
    if (next === "en") params.set("lang", "en");
    else params.delete("lang");
    const qs = params.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : "" }, { replace: true });
  }, [location.pathname, location.search, navigate, setLang]);

  useEffect(() => {
    if (!supportsEnglish) return;
    const params = new URLSearchParams(location.search);
    const urlLang = params.get("lang");
    if (urlLang === "en") {
      setLang("en");
    }
  }, [supportsEnglish]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  useEffect(() => {
    if (!event) return;

    const stripHtml = (html: string) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    const displayLangForMeta = supportsEnglish ? (lang === 'en' ? 'en' : 'hr') : 'hr';
    const enTransMeta = (event.translations as any)?.en ?? {};
    const metaEventName = displayLangForMeta === 'en' && enTransMeta.name
      ? String(enTransMeta.name)
      : event.name ?? '';
    const metaEventDescription = displayLangForMeta === 'en' && enTransMeta.description
      ? String(enTransMeta.description)
      : event.description ?? '';
    const metaBannerUrl = event.branding_banner_url;

    const plainDescription = metaEventDescription ? stripHtml(metaEventDescription).slice(0, 160) : '';
    const description = plainDescription || `Registrirajte se na ${metaEventName} putem Conwayo platforme.`;
    const canonicalUrl = `https://conwayo.io/event/${slug}`;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        const [attrName, attrValue] = selector.replace('meta[', '').replace(']', '').split('="');
        el.setAttribute(attrName as string, (attrValue as string).replace('"', ''));
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    document.title = `${metaEventName} — Conwayo`;

    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', `${metaEventName} — Conwayo`);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:type"]', 'content', 'event');
    if (metaBannerUrl) {
      setMeta('meta[property="og:image"]', 'content', metaBannerUrl);
    }
    setMeta('meta[name="twitter:title"]', 'content', `${metaEventName} — Conwayo`);
    setMeta('meta[name="twitter:description"]', 'content', description);
    if (metaBannerUrl) {
      setMeta('meta[name="twitter:image"]', 'content', metaBannerUrl);
    }

    return () => {
      document.title = 'CONWAYO — AI-Powered Congress Registration';
    };
  }, [event, lang, supportsEnglish, slug]);

  const { data: availabilityMap } = useQuery({
    queryKey: ['tier-availability', event?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ticket_tier_availability', { p_event_id: event!.id });
      if (error) throw error;
      return new Map((data || []).map((r: any) => [r.tier_id, r]));
    },
    enabled: !!event?.id,
    refetchInterval: 60000,
  });

  if (!previewEvent && isLoading) return <EventPageSkeleton />;
  if (!event) return <EventNotFound slug={slug} errorMessage={error?.message} />;
  if (!previewEvent && error) return <EventNotFound slug={slug} errorMessage={error?.message} />;

  if (!isPreview && event.status !== "active") {
    return (
      <div className="min-h-screen flex flex-col">
        <ConvwayoHeader showBackToEvents />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-foreground">{t("event.notAvailable")}</h1>
            <p className="text-muted-foreground">{t("event.notAvailableDesc")}</p>
          </div>
        </div>
      </div>
    );
  }

  const currency = event.currency ?? "EUR";
  const tiers = event.ticket_tiers ?? [];
  const services = event.event_services ?? [];
  const institution = event.institutions;
  const primaryColor = event.branding_primary_color ?? "#6366f1";
  const bannerUrl = event.branding_banner_url;
  const eventTypeEntry = EVENT_TYPE_LABELS[event.event_type ?? "face2face"] ?? EVENT_TYPE_LABELS.face2face;
  const EventTypeIcon = eventTypeEntry.icon;

  const locationParts = [event.venue_name, event.location_address, event.location_city].filter(Boolean);
  const isVirtual = event.event_type === "virtual";

  const whatsappMessage = displayLang === "en"
    ? `Sign up for: ${slug}`
    : `Prijava za: ${slug}`;
  const whatsappUrl = `https://wa.me/385912015954?text=${encodeURIComponent(whatsappMessage)}`;

  const enTrans = (event.translations as any)?.en ?? {};

  const eventName = displayLang === 'en' && enTrans.name
    ? String(enTrans.name)
    : event.name ?? '';

  const eventDescription = displayLang === 'en' && enTrans.description
    ? String(enTrans.description)
    : event.description ?? '';

  const cancellationPolicy = displayLang === 'en' && enTrans.cancellation_policy
    ? String(enTrans.cancellation_policy)
    : event.cancellation_policy ?? '';




  const formatDate = displayLang === "hr" ? formatDateHr : formatDateEn;

  return (
    <EventBrandingProvider event={event}>
      <div className="min-h-screen bg-background text-foreground">
        {event && (
          <script type="application/ld+json">
            {(() => {
              const plainDesc = eventDescription
                ? ((html: string) => {
                    const tmp = document.createElement('div');
                    tmp.innerHTML = html;
                    return (tmp.textContent || tmp.innerText || '').slice(0, 160);
                  })(eventDescription)
                : '';
              return JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Event',
                'name': eventName,
                'startDate': event.start_date,
                'endDate': event.end_date,
                'location': {
                  '@type': 'Place',
                  'name': event.venue_name,
                  'address': event.location_city,
                },
                'url': `https://conwayo.io/event/${slug}`,
                'description': plainDesc,
                ...(event.branding_banner_url ? { 'image': event.branding_banner_url } : {}),
              });
            })()}
          </script>
        )}
        {isPreview && (
          <div
            className="sticky top-0 z-50 w-full border-b-2 border-yellow-600 bg-yellow-400 text-yellow-950"
            role="alert"
          >
            <div className="container mx-auto flex flex-col items-center justify-center gap-1 px-4 py-2 text-center sm:flex-row sm:gap-3">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                <Eye className="h-4 w-4" />
                {displayLang === "hr" ? "NAČIN PREGLEDA" : "PREVIEW MODE"}
              </div>
              <span className="text-sm font-medium">
                {displayLang === "hr"
                  ? "Ovo je pregled. Registracija je onemogućena u načinu pregleda."
                  : "This is a preview. Registration is disabled in preview mode."}
              </span>
            </div>
          </div>
        )}

        <ConvwayoHeader showBackToEvents />

        {/* SECTION 1 — HERO (clean, no text) */}
        {bannerUrl ? (
          <section className="relative w-full overflow-hidden">
            <img
              src={bannerUrl}
              alt={`${eventName} banner`}
              className="block w-full object-contain"
              style={{
                maxHeight: event.branding_banner_height
                  ? `${event.branding_banner_height}px`
                  : undefined,
              }}
            />
          </section>
        ) : (
          <section
            className="relative w-full overflow-hidden"
            style={{ height: 200, backgroundColor: primaryColor }}
          >
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5" />
          </section>
        )}

        {/* SECTION 1b — EVENT TITLE */}
        <section className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mx-auto max-w-4xl">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                {eventName}
              </h1>
            </div>
          </div>
        </section>

        {/* SECTION 2 — EVENT DETAILS */}
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
                      {event.end_date && (
                        <>
                          {" – "}
                          {formatDate(event.end_date)}
                          {formatTimeHr(event.end_date) && ` | ${formatTimeHr(event.end_date)}`}
                        </>
                      )}
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
                    <a
                      href={event.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:opacity-80"
                    >
                      {event.website_url.replace(/^https?:\/\//, "")}
                    </a>
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
                value={eventTypeEntry.label[displayLang]}
              />
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl space-y-12 py-10 md:py-14">
            {/* SECTION 3 — ABOUT */}
            {eventDescription && (
              <section>
                <h2 className="mb-4 text-2xl font-bold text-foreground">
                  {t("event.aboutTitle")}
                </h2>
                <div
                  className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary"
                  dangerouslySetInnerHTML={{ __html: stripUnsafeHtml(eventDescription || '') }}
                />
              </section>
            )}

            {/* SECTION 4 — TICKETS */}
            {tiers.length > 0 && (
              <section>
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold text-foreground">
                  <Ticket className="h-6 w-6" />
                  {t("event.ticketsTitle")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {tiers.map((tier) => {
                    const tierTrans = ((tier.translations as Record<string, any>)?.['en'] as Record<string, any>) ?? {};
                    const tierName = displayLang === 'en' && tierTrans['name'] ? String(tierTrans['name']) : tier.name;
                    const tierDesc = displayLang === 'en' && tierTrans['description'] ? String(tierTrans['description']) : (tier.description ?? '');

                    const now = new Date();
                    const start = tier.sales_start ? new Date(tier.sales_start) : null;
                    const end = tier.sales_end ? new Date(tier.sales_end) : null;
                    let status: "active" | "upcoming" | "expired" = "active";
                    if (start && now < start) status = "upcoming";
                    else if (end && now > end) status = "expired";

                    const localeStr = displayLang === "hr" ? "hr-HR" : "en-GB";
                    const fmtTierDate = (d: Date) =>
                      d.toLocaleDateString(localeStr, { day: "numeric", month: "short", year: "numeric" });

                    const dimmed = status !== "active";
                    const avail = availabilityMap?.get(tier.id);

                    return (
                      <Card key={tier.id} className={`border-border ${dimmed ? "opacity-40 pointer-events-none" : ""}`}>
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold text-card-foreground">
                            {tierName}
                          </h3>
                          {tierDesc && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {tierDesc}
                            </p>
                          )}

                          <p className="mt-3 text-2xl font-bold text-primary">
                            {tier.price === 0
                              ? t("event.freeLabel")
                              : `${Number(tier.price).toFixed(2)} ${currency}`}
                          </p>

                          {status === "active" && end && (
                            <p className="mt-2 text-xs font-medium text-muted-foreground">
                              {displayLang === "hr"
                                ? `Do ${fmtTierDate(end)}`
                                : `Until ${fmtTierDate(end)}`}
                            </p>
                          )}

                          {status === "upcoming" && start && (
                            <p className="mt-2 text-xs font-medium text-muted-foreground">
                              {displayLang === "hr"
                                ? `Dostupno od ${fmtTierDate(start)}`
                                : `Available from ${fmtTierDate(start)}`}
                            </p>
                          )}

                          {status === "expired" && (
                            <p className="mt-2 text-sm font-medium text-muted-foreground">
                              {displayLang === "hr" ? "Prodaja završena" : "Sales ended"}
                            </p>
                          )}

                          {avail && avail.capacity != null && status === "active" && avail.is_sold_out && (
                            <p className="mt-2 text-sm font-medium text-destructive">
                              {displayLang === 'hr' ? 'Rasprodano' : 'Sold out'}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {(() => {
                  const enNotes = (event as any)?.translations?.en?.ticket_notes;
                  const notes =
                    displayLang === 'en' && typeof enNotes === 'string' && enNotes.trim() !== ''
                      ? enNotes
                      : (event as any)?.ticket_notes;
                  return notes ? (
                    <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line">
                      {notes}
                    </p>
                  ) : null;
                })()}
              </section>
            )}

            {/* Registration options — equal weight */}
            <section>
              <div id="registration-options">
                <h2 className="text-2xl font-bold text-foreground mb-6 mt-10">{t("event.chooseRegistration")}</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {/* Card 1 — Online registration */}
                  <Card className="border-border">
                    <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
                      <div className="space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Ticket className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{t("event.onlineTitle")}</h3>
                        <p className="text-sm text-muted-foreground">{t("event.onlineDesc")}</p>
                      </div>
                      <Button asChild size="lg" className={`w-full gap-2 ${isPreview ? "pointer-events-none opacity-50" : ""}`}>
                        <Link to={`/event/${slug}/register`} aria-disabled={isPreview} tabIndex={isPreview ? -1 : undefined}>
                          {t("event.registerNow")}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Card 2 — WhatsApp AI registration */}
                  <Card className="border-border">
                    <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
                      <div className="space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(37, 211, 102, 0.12)" }}>
                          <MessageCircle className="h-6 w-6" style={{ color: "#25D366" }} />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{t("event.whatsappTitle")}</h3>
                        <p className="text-sm text-muted-foreground">{t("event.whatsappDesc")}</p>
                        <div className="flex justify-center pt-1">
                          <div className="rounded-lg border border-border bg-white p-2">
                            <QRCodeSVG
                              value={whatsappUrl}
                              size={120}
                              bgColor="#ffffff"
                              fgColor="#18181b"
                              level="M"
                            />
                          </div>
                        </div>
                      </div>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#25D366" }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("event.whatsappButton")}
                      </a>
                    </CardContent>
                  </Card>

                  <div className="h-full flex flex-col">
                    {/* Card 3 — Voice Agent */}
                    {VOICE_AGENT_ENABLED && (
                      <Card className="border-border h-full flex flex-col">
                        <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
                          <div className="space-y-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0891b2]/10">
                              <Headphones className="h-6 w-6 text-[#0891b2]" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">{t("event.voiceTitle")}</h3>
                            <p className="text-sm text-muted-foreground">
                              {displayLang === 'en'
                                ? 'Register by voice call in under 2 minutes.'
                                : 'Registriraj se glasovnim pozivom za manje od 2 minute.'}
                            </p>
                          </div>
                          <div>
                          <Button
                            size="lg"
                            className={`w-full gap-2 bg-[#0891b2] text-white hover:bg-[#0e7490] ${isPreview ? 'pointer-events-none opacity-50' : ''}`}
                            disabled={isPreview}
                            onClick={() => window.location.href = `/event/${slug}/voice`}
                          >
                              <Headphones className="h-4 w-4" />
                              {displayLang === 'en' ? 'Start voice registration' : 'Pokreni glasovnu registraciju'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4b — ADDITIONAL SERVICES */}
            {services.length > 0 && (
              <section>
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold text-foreground">
                  <ShieldCheck className="h-6 w-6" />
                  {t("event.servicesTitle")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {services.map((service) => {
                    const svcTrans = ((service.translations as Record<string, any>)?.['en'] as Record<string, any>) ?? {};
                    const svcName = displayLang === 'en' && svcTrans['name'] ? String(svcTrans['name']) : service.name;
                    const svcDesc = displayLang === 'en' && svcTrans['description'] ? String(svcTrans['description']) : (service.description ?? '');
                    return (
                      <Card key={service.id} className="border-border">
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold text-card-foreground">
                            {svcName}
                          </h3>
                          {svcDesc && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {svcDesc}
                            </p>
                          )}
                          <p className="mt-3 text-2xl font-bold text-primary">
                            {service.price === 0
                              ? t("event.freeLabel")
                              : `${Number(service.price).toFixed(2)} ${currency}`}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <p className="mt-4 text-sm text-muted-foreground text-center">
                  {t("event.servicesNote")}
                </p>
              </section>
            )}

            {/* SECTION 5 — ORGANIZERS (main + co-organizers from organizers_info JSONB) */}
            {(() => {
              const coInfoList = (event.coOrganizersInfo ?? []).map((org) => ({
                name: org.name,
                address: org.address ?? null,
                city: org.city ?? null,
                website: org.website ?? org.website_url ?? null,
                phone: org.phone ?? null,
                oib: org.oib ?? null,
                invoice_email: org.email ?? null,
                facebook_url: null,
                linkedin_url: null,
                instagram_url: null,
              }));

              const hasCoOrganizers = coInfoList.length > 0;
              const gridCols = hasCoOrganizers
                ? coInfoList.length >= 2
                  ? "sm:grid-cols-2 lg:grid-cols-3"
                  : "sm:grid-cols-2"
                : "";

              return (
                <section>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="organizers" className="border-border">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2 text-2xl font-bold text-foreground">
                          <Building2 className="h-6 w-6" />
                          {t("event.organizerTitle")}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className={`grid gap-4 ${gridCols}`}>
                          {/* Main organizer */}
                          {institution ? (
                            <OrganizerCard institution={institution} />
                          ) : (
                            <Card className="border-border">
                              <CardContent className="p-5 space-y-3 text-sm">
                                {event.notification_sender_name && (
                                  <div className="flex items-start gap-2">
                                    <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="font-medium">{event.notification_sender_name}</span>
                                  </div>
                                )}
                                {event.notification_sender_email && (
                                  <div className="flex items-start gap-2">
                                    <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                                    <a
                                      href={`mailto:${event.notification_sender_email}`}
                                      className="text-primary underline underline-offset-2"
                                    >
                                      {event.notification_sender_email}
                                    </a>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {/* Co-organizers (from organizers_info JSONB only) */}
                          {coInfoList.map((org, idx) => (
                            <OrganizerCard key={`coorg-${idx}`} institution={org} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </section>
              );
            })()}

            {/* SECTION 6b — TECHNICAL ORGANIZER */}
            {(() => {
              const techInfo = event.technicalOrganizerInfo;
              if (!techInfo || !techInfo.name) return null;
              if (techInfo.same_as_organizer === true) return null;
              const techPhone =
                techInfo.phone && techInfo.phone.trim().length > 0
                  ? techInfo.phone
                  : event.support_phone ?? null;
              const techInstitution = {
                name: techInfo.name,
                address: techInfo.address ?? null,
                city: techInfo.city ?? null,
                oib: techInfo.oib ?? null,
                invoice_email: techInfo.email ?? null,
                website: techInfo.website ?? techInfo.website_url ?? null,
                phone: techPhone,
                facebook_url: null,
                linkedin_url: null,
                instagram_url: null,
              };
              return (
                <section>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="technical-organizer" className="border-border">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2 text-2xl font-bold text-foreground">
                          <Building2 className="h-6 w-6" />
                          {t("event.technicalOrganizerTitle")}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <OrganizerCard institution={techInstitution} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </section>
              );
            })()}

            {/* SECTION 6c — SUPPORT CONTACT */}
            {(() => {
              const supportContact = (event.organizers_info as any)?.support_contact as SupportContact | null | undefined;
              const hasSupportContact =
                supportContact && Object.values(supportContact).some((v) => v && String(v).trim().length > 0);
              if (!hasSupportContact || !supportContact) return null;
              return (
                <section>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="support-contact" className="border-border">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2 text-2xl font-bold text-foreground">
                          <Headphones className="h-6 w-6 text-primary" />
                          {t("event.supportTitle")}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Card>
                          <CardContent className="p-6 space-y-3">
                            {supportContact.name && supportContact.name.trim().length > 0 && (
                              <div className="flex items-start gap-3">
                                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <p className="text-sm font-medium text-foreground">{supportContact.name}</p>
                              </div>
                            )}
                            {supportContact.email && supportContact.email.trim().length > 0 && (
                              <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <a
                                  href={`mailto:${supportContact.email}`}
                                  className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
                                >
                                  {supportContact.email}
                                </a>
                              </div>
                            )}
                            {supportContact.phone_mobile && supportContact.phone_mobile.trim().length > 0 && (
                              <div className="flex items-start gap-3">
                                <Smartphone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-foreground">
                                  <span className="text-muted-foreground mr-1">Mob:</span>
                                  {supportContact.phone_mobile}
                                </p>
                              </div>
                            )}
                            {supportContact.phone_landline && supportContact.phone_landline.trim().length > 0 && (
                              <div className="flex items-start gap-3">
                                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-foreground">
                                  <span className="text-muted-foreground mr-1">Tel:</span>
                                  {supportContact.phone_landline}
                                </p>
                              </div>
                            )}
                            {supportContact.working_hours && supportContact.working_hours.trim().length > 0 && (
                              <div className="flex items-start gap-3">
                                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-foreground">{localiseWorkingHours(supportContact.working_hours, displayLang)}</p>
                              </div>
                            )}
                            {supportContact.website && supportContact.website.trim().length > 0 && (
                              <div className="flex items-start gap-3">
                                <Globe className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <a
                                  href={supportContact.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
                                >
                                  {supportContact.website}
                                </a>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </section>
              );
            })()}

            {/* SECTION 6d — CANCELLATION POLICY */}
            {cancellationPolicy && cancellationPolicy.trim().length > 0 && (
              <section>
                <Accordion type="single" collapsible>
                  <AccordionItem value="cancellation" className="border-border">
                    <AccordionTrigger className="text-base font-semibold">
                      {t("event.cancellationTitle")}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
                        {cancellationPolicy}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            )}
          </div>
        </div>

        {/* SECTION 7 — PLATFORM FOOTER */}
        <footer className="border-t border-border bg-muted/50 py-6">
          <div className="container mx-auto px-4 text-center text-xs text-muted-foreground leading-relaxed space-y-1">
            <p>{t("footer.poweredBy")}</p>
            <p>{t("footer.owner")}</p>
            <p>
              OIB: 31375495391 |{" "}
              <a href="mailto:info@penta-zagreb.hr" className="underline underline-offset-2">
                info@penta-zagreb.hr
              </a>
            </p>
            <p>
              <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                Pravila privatnosti / Privacy Policy
              </Link>
              {" · "}
              <Link to="/data-retention" className="underline underline-offset-2 hover:text-foreground transition-colors">
                Pravila o čuvanju osobnih podataka / Data Retention Policy
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </EventBrandingProvider>
  );
}

/* ---------- Helper components ---------- */

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
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SocialLinks({
  facebook,
  linkedin,
  instagram,
}: {
  facebook?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
}) {
  const links = [
    { url: facebook, label: "Facebook" },
    { url: linkedin, label: "LinkedIn" },
    { url: instagram, label: "Instagram" },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-3 pt-1">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline underline-offset-2 hover:opacity-80"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}
