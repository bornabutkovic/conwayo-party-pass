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
  const d = new Date(dateStr);
  if (d.getHours() === 0 && d.getMinutes() === 0) return null;
  return format(d, "HH:mm", { locale: hrLocale });
}

const EVENT_TYPE_LABELS: Record<string, { label: { hr: string; en: string }; icon: typeof Building2 }> = {
  face2face: { label: { hr: "Face2Face", en: "Face2Face" }, icon: Building2 },
  virtual: { label: { hr: "Virtual / Online", en: "Virtual / Online" }, icon: Monitor },
  hybrid: { label: { hr: "Hybrid", en: "Hybrid" }, icon: Users },
};



export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEventFull(slug ?? "");
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
    const params = new URLSearchParams(location.search);
    const urlLang = params.get("lang");
    if (urlLang === "en" && supportsEnglish) {
      setLang("en");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const whatsappUrl = `https://wa.me/385912015954?text=Prijava%20za%3A%20${slug}`;

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

  console.log('DEBUG:', { displayLang, enTrans, eventDescription: eventDescription?.slice(0,50) });

  const formatDate = displayLang === "hr" ? formatDateHr : formatDateEn;

  return (
    <EventBrandingProvider event={event}>
      <div className="min-h-screen bg-background text-foreground">
        <ConvwayoHeader showBackToEvents />

        {/* SECTION 1 — HERO (clean, no text) */}
        {bannerUrl ? (
          <section className="relative w-full overflow-hidden">
            <img
              src={bannerUrl}
              alt={`${eventName} banner`}
              className="block w-full h-auto object-contain"
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
                    const tierTrans = ((tier.translations as Record<string, any>)?.['en'] as Record<string, any>) ?? {};
                    const tierName = displayLang === 'en' && tierTrans['name'] ? String(tierTrans['name']) : tier.name;
                    const tierDesc = displayLang === 'en' && tierTrans['description'] ? String(tierTrans['description']) : (tier.description ?? '');
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
                  <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold text-foreground">
                    <Building2 className="h-6 w-6" />
                    {t("event.organizerTitle")}
                  </h2>
                  <div className={`grid gap-4 ${gridCols}`}>
                    {/* Main organizer */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t("event.organizerLabel")}
                      </p>
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
                    </div>

                    {/* Co-organizers (from organizers_info JSONB only) */}
                    {coInfoList.map((org, idx) => (
                      <div key={`coorg-${idx}`} className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t("event.coOrganizerLabel")}
                        </p>
                        <OrganizerCard institution={org} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* SECTION 6 — CANCELLATION POLICY */}
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

            {/* SECTION 6b — TECHNICAL ORGANIZER */}
            {(() => {
              const techInfo = event.technicalOrganizerInfo;
              if (!techInfo || !techInfo.name) return null;
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
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("event.technicalOrganizerTitle")}
                    </p>
                    <OrganizerCard institution={techInstitution} />
                  </div>
                </section>
              );
            })()}
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
