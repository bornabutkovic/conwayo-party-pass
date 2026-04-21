import { Link } from "react-router-dom";
import { format } from "date-fns";
import { hr } from "date-fns/locale";
import { CalendarDays, MapPin, ArrowRight, Sparkles } from "lucide-react";

function formatEventDateRange(startStr: string | null, endStr: string | null): string | null {
  const startDate = startStr ? new Date(startStr) : null;
  const endDate = endStr ? new Date(endStr) : null;
  if (!startDate) return null;
  const isSameDay = endDate && startDate.toDateString() === endDate.toDateString();
  if (isSameDay || !endDate) {
    return format(startDate, "d. MMM yyyy.", { locale: hr });
  }
  return `${format(startDate, "d. MMM", { locale: hr })} – ${format(endDate, "d. MMM yyyy.", { locale: hr })}`;
}
import { useAvailableEvents } from "@/hooks/useEvent";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";

function EventCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 glass p-6 space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full ai-pulse" />
      </div>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

function NetworkGrid() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.08]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="1.5" fill="white" />
        </pattern>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(190, 95%, 70%)" />
          <stop offset="100%" stopColor="hsl(320, 80%, 70%)" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      {/* Network lines */}
      <line x1="60" y1="60" x2="180" y2="120" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.6" />
      <line x1="180" y1="120" x2="300" y2="60" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.4" />
      <line x1="300" y1="60" x2="420" y2="180" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.5" />
      <line x1="420" y1="180" x2="540" y2="120" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.3" />
      <line x1="540" y1="120" x2="660" y2="60" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.4" />
      <line x1="660" y1="60" x2="780" y2="180" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.5" />
      <line x1="120" y1="180" x2="240" y2="240" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.3" />
      <line x1="240" y1="240" x2="360" y2="180" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.5" />
      <line x1="360" y1="180" x2="480" y2="240" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.4" />
      <line x1="480" y1="240" x2="600" y2="180" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.3" />
      <line x1="600" y1="180" x2="720" y2="240" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.5" />
      <line x1="180" y1="120" x2="240" y2="240" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.2" />
      <line x1="420" y1="180" x2="360" y2="180" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.3" />
      <line x1="540" y1="120" x2="600" y2="180" stroke="url(#lineGrad)" strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}

function StatusTag({ status }: { status: string | null }) {
  const isOpen = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
        isOpen
          ? "bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30"
          : "bg-muted text-muted-foreground border border-border"
      }`}
    >
      {isOpen && <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan animate-pulse" />}
      {isOpen ? "Open" : status ?? "Upcoming"}
    </span>
  );
}

export default function Index() {
  const { data: events, isLoading } = useAvailableEvents();
  const { t } = useLanguage();

  const publicEvents = events?.filter((e) => e.status !== "draft") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader />

      {/* Hero — Mesh Gradient */}
      <section className="relative overflow-hidden mesh-gradient text-white">
        <NetworkGrid />

        {/* Floating orbs */}
        <div className="absolute top-12 right-[15%] h-32 w-32 rounded-full bg-brand-cyan/20 blur-3xl animate-float" />
        <div className="absolute bottom-8 left-[10%] h-40 w-40 rounded-full bg-brand-pink/20 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-[40%] h-24 w-24 rounded-full bg-brand-purple/20 blur-2xl animate-float" style={{ animationDelay: '4s' }} />

        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="max-w-2xl animate-fade-in-up">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 glass px-3 py-1 text-xs font-medium text-white/80">
              <Sparkles className="h-3.5 w-3.5 gradient-brand-text" style={{ WebkitTextFillColor: 'unset' }} />
              {t("home.aiBadge")}
            </div>
            <h1 className="mb-5 text-5xl font-extrabold tracking-tight md:text-6xl drop-shadow-lg">
              {t("home.heroTitle")}
            </h1>
            <p className="text-lg text-white/75 max-w-lg leading-relaxed">
              {t("home.heroSubtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Event Grid */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        {isLoading ? (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : publicEvents.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-brand">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">{t("home.noEventsTitle")}</h2>
            <p className="text-muted-foreground">{t("home.noEventsDesc")}</p>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {publicEvents.map((event, index) => {
              const dateRange = formatEventDateRange(event.start_date ?? null, event.end_date ?? null);
              return (
                <Link
                  key={event.slug}
                  to={`/event/${event.slug}`}
                  className="group relative rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:shadow-brand-hover hover:-translate-y-1"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Gradient border on hover */}
                  <div className="absolute inset-0 rounded-2xl gradient-brand opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-[1px] scale-[1.02]" />
                  <div className="absolute inset-[1px] rounded-2xl bg-card -z-10" />

                  <div className="mb-4">
                    <StatusTag status={event.status} />
                    <h3 className="mt-3 text-xl font-bold text-foreground group-hover:gradient-brand-text transition-all duration-300">
                      {event.name}
                    </h3>
                  </div>

                  <div className="space-y-2.5 text-sm text-muted-foreground mb-6">
                    {dateRange && (
                      <div className="flex items-center gap-2.5">
                        <CalendarDays className="h-4 w-4 shrink-0 text-brand-purple" />
                        <span>{dateRange}</span>
                      </div>
                    )}
                    {event.venue_name && (
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 shrink-0 text-brand-purple" />
                        <span>{event.venue_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-4">
                    <span className="text-sm font-bold gradient-brand text-white px-4 py-2 rounded-lg group-hover:shadow-brand transition-all duration-300">
                      View Details
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple transition-all duration-300 group-hover:translate-x-1 group-hover:bg-brand-purple group-hover:text-white">
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
      <footer className="border-t border-border/50 bg-card/50 py-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} <span className="font-semibold gradient-brand-text">CONWAYO</span>. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
