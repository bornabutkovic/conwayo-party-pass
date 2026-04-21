import { useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useEventFull, type EventService } from "@/hooks/useEvent";
import { useLanguage, tr } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { EventBrandingProvider } from "@/components/event/EventBrandingProvider";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";
import { hr as hrLocale } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

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

const DEFAULT_CANCELLATION_POLICY = `Otkazivanje kotizacije moguće je najkasnije 14 dana prije početka događaja uz povrat 50% uplaćenog iznosa. Nakon tog roka povrat nije moguć, ali kotizacija može biti prenesena na drugu osobu uz prethodnu pisanu obavijest organizatoru.

Cancellations are accepted up to 14 days before the event with a 50% refund. After that date, no refund is available, but the registration may be transferred to another person with prior written notice to the organizer.`;

export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEventFull(slug ?? "");
  const { lang, t } = useLanguage();

  const supportsEnglish = useMemo(() => {
    return Array.isArray(event?.supported_languages) && event!.supported_languages!.includes("en");
  }, [event?.supported_languages]);

  // Detect English preference: ?lang=en in URL OR browser language starts with 'en'.
  // Only honor English if the event explicitly supports it via supported_languages.
  const displayLang = useMemo<"hr" | "en">(() => {
    if (!supportsEnglish) return "hr";
    const params = new URLSearchParams(location.search);
    const urlLang = params.get("lang");
    if (urlLang === "en") return "en";
    if (urlLang === "hr") return "hr";
    if (lang === "en") return "en";
    if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("en")) {
      return "en";
    }
    return "hr";
  }, [location.search, lang, supportsEnglish]);

  const switchLang = useCallback((next: "hr" | "en") => {
    const params = new URLSearchParams(location.search);
    if (next === "en") params.set("lang", "en");
    else params.delete("lang");
    const qs = params.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : "" }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  if (isLoading) return <EventPageSkeleton />;
  if (error || !event) return <EventNotFound slug={slug} errorMessage={error?.message} />;

  if (event.status !== "active") {
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

  const whatsappNumber = event.support_phone?.replace(/\D/g, "") || "385912015954";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Prijava%20za%3A%20${slug}`;

  const eventName = tr(event.translations as Record<string, any> | null, displayLang, "name", event.name);
  const eventDescription = tr(event.translations as Record<string, any> | null, displayLang, "description", event.description);
  const cancellationPolicy = tr(
    event.translations as Record<string, any> | null,
    displayLang,
    "cancellation_policy",
    event.cancellation_policy,
  ) || DEFAULT_CANCELLATION_POLICY;
  const formatDate = displayLang === "hr" ? formatDateHr : formatDateEn;

  return (
    <EventBrandingProvider event={event}>
      <div className="min-h-screen bg-background text-foreground">
        <ConvwayoHeader showBackToEvents />

        {/* Language switcher (only when event supports EN) */}
        {supportsEnglish && (
          <div className="container mx-auto px-4 pt-3">
            <div className="mx-auto flex max-w-4xl justify-end">
              <div className="inline-flex overflow-hidden rounded-md border border-border bg-card text-xs">
                <button
                  type="button"
                  onClick={() => switchLang("hr")}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    displayLang === "hr"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                  aria-pressed={displayLang === "hr"}
                >
                  HR
                </button>
                <button
                  type="button"
                  onClick={() => switchLang("en")}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    displayLang === "en"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                  aria-pressed={displayLang === "en"}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1 — HERO (clean, no text) */}
        <section className="relative overflow-hidden" style={{ height: 280 }}>
          {bannerUrl ? (
            <div className="absolute inset-0">
              <img
                src={bannerUrl}
                alt={`${eventName} banner`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
            </div>
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: primaryColor }}>
              <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10" />
              <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5" />
            </div>
          )}
        </section>

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
                        <> – {formatDate(event.end_date)}</>
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
                value={eventTypeEntry.label[lang]}
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
                  dangerouslySetInnerHTML={{ __html: eventDescription }}
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
                    const tierName = tr(tier.translations as Record<string, any> | null, lang, "name", tier.name);
                    const tierDesc = tr(tier.translations as Record<string, any> | null, lang, "description", tier.description);
                    return (
                      <Card key={tier.id} className="border-border">
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
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("event.priceIncludesVat")}
                          </p>
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

                {/* Registration options — equal weight */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                      <Button asChild size="lg" className="w-full gap-2">
                        <Link to={`/event/${slug}/register`}>
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
                </div>
              </section>
            )}

            {/* SECTION 4b — ADDITIONAL SERVICES */}
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
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("event.priceIncludesVat")}
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

            {/* SECTION 5 — ORGANIZER */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-foreground">
                <Building2 className="h-6 w-6" />
                {t("event.organizerTitle")}
              </h2>
              <Card className="border-border">
                <CardContent className="p-5 space-y-3 text-sm">
                  {institution ? (
                    <>
                      <div className="flex items-start gap-2">
                        <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{institution.name}</span>
                      </div>
                      {(institution.address || institution.city) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                          <span>
                            {[institution.address, institution.city].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      {institution.oib && (
                        <div className="flex items-start gap-2">
                          <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                          <span>OIB/VAT: {institution.oib}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                        <a
                          href={`mailto:${institution.invoice_email}`}
                          className="text-primary underline underline-offset-2"
                        >
                          {institution.invoice_email}
                        </a>
                      </div>
                      {(institution.phone || event.support_phone) && (
                        <div className="flex items-start gap-2">
                          <Phone className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{institution.phone || event.support_phone}</span>
                        </div>
                      )}
                      {institution.website && (
                        <div className="flex items-start gap-2">
                          <Globe className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                          <a
                            href={institution.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2"
                          >
                            {institution.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                      <SocialLinks
                        facebook={institution.facebook_url}
                        linkedin={institution.linkedin_url}
                        instagram={institution.instagram_url}
                      />
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* SECTION 6 — CANCELLATION POLICY */}
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
          </div>
        </div>

        {/* SECTION 7 — PLATFORM FOOTER */}
        <footer className="border-t border-border bg-muted/50 py-6">
          <div className="container mx-auto px-4 text-center text-xs text-muted-foreground leading-relaxed">
            <p>{t("footer.poweredBy")}</p>
            <p>{t("footer.owner")}</p>
            <p>
              OIB: 31375495391 |{" "}
              <a href="mailto:info@penta-zagreb.hr" className="underline underline-offset-2">
                info@penta-zagreb.hr
              </a>
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
