import { format } from "date-fns";
import { CalendarDays, MapPin, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/hooks/useEvent";

interface EventHeroProps {
  event: Event;
}

export function EventHero({ event }: EventHeroProps) {
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground">
      {/* Abstract shapes */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary-foreground/20" />
      </div>

      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl">
          {event.status && (
            <Badge variant="secondary" className="mb-4 text-sm font-medium">
              {event.status === "active" ? "Registration Open" : event.status}
            </Badge>
          )}

          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            {event.name}
          </h1>

          <div className="flex flex-wrap gap-6 text-primary-foreground/90">
            {startDate && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                <span>
                  {format(startDate, "MMM d, yyyy")}
                  {endDate && ` – ${format(endDate, "MMM d, yyyy")}`}
                </span>
              </div>
            )}

            {event.venue_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <span>{event.venue_name}</span>
              </div>
            )}

            {(event.location_city || event.location_country) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>
                  {[event.location_city, event.location_country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
