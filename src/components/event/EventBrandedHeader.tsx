import { Link } from "react-router-dom";
import type { Event } from "@/hooks/useEvent";

interface EventBrandedHeaderProps {
  event: Event;
}

export function EventBrandedHeader({ event }: EventBrandedHeaderProps) {
  const primaryColor = event.branding_primary_color ?? "#6366f1";
  const textOnPrimary = "#ffffff"; // white text on colored header

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/20 backdrop-blur-md"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to={`/event/${event.slug}`} className="flex items-center gap-3">
          {event.branding_logo_url ? (
            <img
              src={event.branding_logo_url}
              alt={`${event.name} logo`}
              className="h-10 max-h-[60px] w-auto object-contain"
            />
          ) : (
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: textOnPrimary }}
            >
              {event.name}
            </span>
          )}
        </Link>
        <span
          className="text-xs font-medium uppercase tracking-widest opacity-80"
          style={{ color: textOnPrimary }}
        >
          Events
        </span>
      </div>
    </header>
  );
}
