import { useParams, Link } from "react-router-dom";
import { useEvent, useTicketTiers } from "@/hooks/useEvent";
import { EventBrandedHeader } from "@/components/event/EventBrandedHeader";
import { EventBrandingProvider } from "@/components/event/EventBrandingProvider";
import { EventHero } from "@/components/event/EventHero";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, MapPin, Ticket, ArrowRight, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";

export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = useEvent(slug ?? "");
  const { data: tiers = [] } = useTicketTiers(event?.id);

  if (isLoading) return <EventPageSkeleton />;
  if (error || !event) return <EventNotFound slug={slug} errorMessage={error?.message} />;

  const currency = event.currency ?? "EUR";
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;

  return (
    <EventBrandingProvider event={event}>
      <div
        className="min-h-screen"
        style={{
          backgroundColor: event.branding_secondary_color ?? undefined,
          color: event.branding_text_color ?? undefined,
        }}
      >
        <EventBrandedHeader event={event} />
        <EventHero event={event} />

        {/* Event Info */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-3xl space-y-10">
            {/* Date & Location */}
            <div className="flex flex-wrap gap-6 text-sm">
              {startDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-5 w-5 shrink-0" />
                  <span className="font-medium">
                    {format(startDate, "MMMM d, yyyy")}
                    {endDate && ` – ${format(endDate, "MMMM d, yyyy")}`}
                  </span>
                </div>
              )}
              {event.venue_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-5 w-5 shrink-0" />
                  <span className="font-medium">
                    {event.venue_name}
                    {event.location_city && `, ${event.location_city}`}
                    {event.location_country && `, ${event.location_country}`}
                  </span>
                </div>
              )}
            </div>

            {/* Ticket Tiers */}
            {tiers.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-foreground">
                  <Ticket className="h-6 w-6" />
                  Tickets
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {tiers.map((tier) => (
                    <Card key={tier.id} className="border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{tier.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {tier.description && (
                          <p className="mb-3 text-sm text-muted-foreground">{tier.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">
                            {tier.price === 0
                              ? "Free"
                              : `${tier.price.toFixed(2)} ${currency}`}
                          </span>
                          {tier.status && (
                            <Badge variant="secondary" className="text-xs">
                              {tier.status}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Register CTA */}
            <div className="text-center">
              <Button asChild size="lg" className="gap-2 text-lg px-10 py-6">
                <Link to={`/event/${slug}/register`}>
                  Register Now
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </EventBrandingProvider>
  );
}
