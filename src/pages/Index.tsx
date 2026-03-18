import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { useAvailableEvents } from "@/hooks/useEvent";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function EventCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>
  );
}

export default function Index() {
  const { data: events, isLoading } = useAvailableEvents();

  // Filter out draft events for public view
  const publicEvents = events?.filter((e) => e.status !== "draft") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-accent" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary-foreground/20" />
        </div>
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl animate-fade-in-up">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              Upcoming Events
            </h1>
            <p className="text-lg text-primary-foreground/80">
              Browse our events, pick your ticket, and register in seconds — no account needed.
            </p>
          </div>
        </div>
      </section>

      {/* Event Grid */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : publicEvents.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="mb-2 text-2xl font-bold text-foreground">No Events Available</h2>
            <p className="text-muted-foreground">Check back soon for upcoming events.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publicEvents.map((event) => {
              const startDate = event.start_date ? new Date(event.start_date) : null;
              return (
                <Link
                  key={event.slug}
                  to={`/event/${event.slug}`}
                  className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="mb-4">
                    <Badge variant="secondary" className="mb-3 text-xs">
                      {event.status === "active" ? "Open" : event.status ?? "Upcoming"}
                    </Badge>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {event.name}
                    </h3>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-6">
                    {startDate && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0" />
                        <span>{format(startDate, "MMMM d, yyyy")}</span>
                      </div>
                    )}
                    {event.venue_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{event.venue_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-lg font-bold text-primary">
                      Register
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Convwayo. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
