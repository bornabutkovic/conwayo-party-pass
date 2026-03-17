import { useEffect, useMemo } from "react";
import type { Event } from "@/hooks/useEvent";

interface EventBrandingProviderProps {
  event: Event;
  children: React.ReactNode;
}

/**
 * Wraps event pages and injects dynamic CSS variables + document.title
 * based on the event's branding columns.
 */
export function EventBrandingProvider({ event, children }: EventBrandingProviderProps) {
  const primary = event.branding_primary_color ?? "#6366f1";
  const secondary = event.branding_secondary_color ?? "#ffffff";
  const textColor = event.branding_text_color ?? "#1f2937";

  // Set document title
  useEffect(() => {
    const prev = document.title;
    document.title = event.name;
    return () => {
      document.title = prev;
    };
  }, [event.name]);

  const style = useMemo(
    () =>
      ({
        "--event-primary": primary,
        "--event-secondary": secondary,
        "--event-text": textColor,
      }) as React.CSSProperties,
    [primary, secondary, textColor]
  );

  return (
    <div style={style} className="event-branded">
      {children}
    </div>
  );
}
