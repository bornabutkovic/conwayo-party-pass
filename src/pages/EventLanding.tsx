import { useParams, Link } from "react-router-dom";
import { useEventFull, type EventService } from "@/hooks/useEvent";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { EventBrandingProvider } from "@/components/event/EventBrandingProvider";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";
import { hr } from "date-fns/locale";

function formatDateHr(dateStr: string | null) {
  if (!dateStr) return null;
  return format(new Date(dateStr), "d. MMMM yyyy.", { locale: hr });
}

function formatTimeHr(dateStr: string | null) {
  if (!dateStr) return null;
  return format(new Date(dateStr), "HH:mm", { locale: hr });
}

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: typeof Building2 }> = {
  face2face: { label: "Face2Face", icon: Building2 },
  virtual: { label: "Virtual / Online", icon: Monitor },
  hybrid: { label: "Hybrid", icon: Users },
};

const DEFAULT_CANCELLATION_POLICY = `Otkazivanje kotizacije moguće je najkasnije 14 dana prije početka događaja uz povrat 50% uplaćenog iznosa. Nakon tog roka povrat nije moguć, ali kotizacija može biti prenesena na drugu osobu uz prethodnu pisanu obavijest organizatoru.

Cancellations are accepted up to 14 days before the event with a 50% refund. After that date, no refund is available, but the registration may be transferred to another person with prior written notice to the organizer.`;

export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = useEventFull(slug ?? "");

  if (isLoading) return <EventPageSkeleton />;
  if (error || !event) return <EventNotFound slug={slug} errorMessage={error?.message} />;

  if (event.status !== "active") {
    return (
      <div className="min-h-screen flex flex-col">
        <ConvwayoHeader showBackToEvents />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-foreground">This event is not currently available</h1>
            <p className="text-muted-foreground">The event may have ended or registration is not open yet.</p>
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
  const eventType = EVENT_TYPE_LABELS[event.event_type ?? "face2face"] ?? EVENT_TYPE_LABELS.face2face;
  const EventTypeIcon = eventType.icon;

  const locationParts = [event.venue_name, event.location_address, event.location_city].filter(Boolean);
  const isVirtual = event.event_type === "virtual";

  return (
    <EventBrandingProvider event={event}>
      <div
        className="min-h-screen"
        style={{
          backgroundColor: event.branding_secondary_color ?? undefined,
          color: event.branding_text_color ?? undefined,
        }}
      >
        <ConvwayoHeader showBackToEvents />

        {/* SECTION 1 — HERO */}
        <section className="relative overflow-hidden text-white" style={{ height: 320 }}>
          {bannerUrl ? (
            <div className="absolute inset-0">
              <img
                src={bannerUrl}
                alt={`${event.name} banner`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/45" />
            </div>
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: primaryColor }}>
              <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10" />
              <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5" />
            </div>
          )}
          <div className="container relative mx-auto flex h-full flex-col justify-end px-4 pb-8">
            <div className="max-w-3xl">
              {event.status === "active" && (
                <Badge variant="secondary" className="mb-3 text-sm font-medium">
                  Registration Open
                </Badge>
              )}
              <h1 className="mb-4 text-3xl font-bold tracking-tight drop-shadow-lg md:text-5xl">
                {event.name}
              </h1>
              <div className="flex flex-wrap gap-5 text-white/90 text-sm">
                {event.start_date && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {formatDateHr(event.start_date)}
                      {event.end_date && ` – ${formatDateHr(event.end_date)}`}
                    </span>
                  </div>
                )}
                {!isVirtual && locationParts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{locationParts.join(", ")}</span>
                  </div>
                )}
                {isVirtual && (
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>Virtual Event – Online</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — EVENT DETAILS */}
        <section className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Date */}
              {event.start_date && (
                <DetailItem
                  icon={<CalendarDays className="h-5 w-5 text-primary" />}
                  label="Datum / Date"
                  value={
                    <>
                      {formatDateHr(event.start_date)}
                      {formatTimeHr(event.start_date) && ` | ${formatTimeHr(event.start_date)}`}
                      {event.end_date && (
                        <> – {formatDateHr(event.end_date)}</>
                      )}
                    </>
                  }
                />
              )}

              {/* Event Type */}
              <DetailItem
                icon={<EventTypeIcon className="h-5 w-5 text-primary" />}
                label="Tip / Event Type"
                value={eventType.label}
              />

              {/* Location */}
              {!isVirtual && locationParts.length > 0 && (
                <DetailItem
                  icon={<MapPin className="h-5 w-5 text-primary" />}
                  label="Lokacija / Location"
                  value={locationParts.join(", ")}
                />
              )}
              {isVirtual && (
                <DetailItem
                  icon={<Monitor className="h-5 w-5 text-primary" />}
                  label="Lokacija / Location"
                  value="Virtual Event – Online"
                />
              )}

              {/* Website or Phone */}
              {event.website_url && (
                <DetailItem
                  icon={<Globe className="h-5 w-5 text-primary" />}
                  label="Web"
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
                  label="Telefon / Phone"
                  value={event.support_phone}
                />
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl space-y-12 py-10 md:py-14">
            {/* SECTION 3 — ABOUT */}
            {event.description && (
              <section>
                <h2 className="mb-4 text-2xl font-bold text-foreground">
                  O eventu / About the Event
                </h2>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </section>
            )}

            {/* SECTION 4 — TICKETS */}
            {tiers.length > 0 && (
              <section>
                <h2 className="mb-5 flex items-center gap-2 text-2xl font-bold text-foreground">
                  <Ticket className="h-6 w-6" />
                  Ulaznice / Tickets
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {tiers.map((tier) => (
                    <Card key={tier.id} className="border-border">
                      <CardContent className="p-5">
                        <h3 className="text-lg font-semibold text-card-foreground">
                          {tier.name}
                        </h3>
                        {tier.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {tier.description}
                          </p>
                        )}
                        <p className="mt-3 text-2xl font-bold text-primary">
                          {tier.price === 0
                            ? "Besplatno / Free"
                            : `${Number(tier.price).toFixed(2)} ${currency}`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cijena uključuje PDV / Price includes VAT
                        </p>
                        {tier.capacity != null && tier.capacity > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Preostalo mjesta: {tier.capacity}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Button asChild size="lg" className="gap-2 px-10 py-6 text-lg">
                    <Link to={`/event/${slug}/register`}>
                      Register Now
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </section>
            )}

            {/* SECTION 5 — ORGANIZER */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-foreground">
                <Building2 className="h-6 w-6" />
                Organizator / Event Organizer
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
                      {/* Social links */}
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
                    Politika povrata / Cancellation Policy
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
                      {event.cancellation_policy || DEFAULT_CANCELLATION_POLICY}
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
            <p>
              Prodaja ulaznica omogućena putem platforme Conwayo.
            </p>
            <p>
              Vlasnik platforme: Penta d.o.o., Izidora Kršnjavoga 25, 10000 Zagreb
            </p>
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
