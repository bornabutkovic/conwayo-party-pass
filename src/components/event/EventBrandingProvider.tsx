import { useEffect, useMemo } from "react";
import type { Event } from "@/hooks/useEvent";

interface EventBrandingProviderProps {
  event: Event;
  children: React.ReactNode;
}

/* ---------- Color helpers ---------- */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Parse #RGB / #RRGGBB into [r,g,b] 0-255. Returns null if invalid. */
function parseHex(hex: string): [number, number, number] | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

/** Convert hex color to Tailwind HSL token string: "H S% L%". */
function hexToHslTokens(hex: string | null | undefined, fallback: string): string {
  const rgb = parseHex(hex ?? "") ?? parseHex(fallback);
  if (!rgb) return "0 0% 0%";
  let [r, g, b] = rgb;
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(clamp(s * 100, 0, 100))}% ${Math.round(
    clamp(l * 100, 0, 100)
  )}%`;
}

/** Returns "0 0% 100%" (white) or "0 0% 0%" (black) for best contrast on given hex. */
function contrastingTokens(hex: string | null | undefined, fallback: string): string {
  const rgb = parseHex(hex ?? "") ?? parseHex(fallback);
  if (!rgb) return "0 0% 100%";
  const [r, g, b] = rgb;
  // Relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "0 0% 10%" : "0 0% 100%";
}

/** Mix two HSL token strings producing an intermediate (used for muted text). */
function muteTokens(textHsl: string, bgHsl: string, ratio = 0.55): string {
  const parse = (t: string) => {
    const m = t.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
    if (!m) return [0, 0, 0];
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
  };
  const [h1, s1, l1] = parse(textHsl);
  const [, , l2] = parse(bgHsl);
  // Pull lightness toward background, reduce saturation
  const l = l1 + (l2 - l1) * ratio;
  const s = s1 * 0.6;
  return `${Math.round(h1)} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`;
}

/**
 * Wraps event pages and injects dynamic Tailwind design-token CSS variables
 * (--primary, --background, --foreground, etc.) based on the event's branding
 * columns so the whole subtree adopts the event's colors automatically.
 */
export function EventBrandingProvider({ event, children }: EventBrandingProviderProps) {
  const primaryHex = event.branding_primary_color ?? "#6366f1";
  const secondaryHex = event.branding_secondary_color ?? "#ffffff";
  const textHex = event.branding_text_color ?? "#1f2937";

  // Set document title
  useEffect(() => {
    const prev = document.title;
    document.title = event.name;
    return () => {
      document.title = prev;
    };
  }, [event.name]);

  const style = useMemo(() => {
    const primary = hexToHslTokens(primaryHex, "#6366f1");
    const background = hexToHslTokens(secondaryHex, "#ffffff");
    const foreground = hexToHslTokens(textHex, "#1f2937");
    const primaryForeground = contrastingTokens(primaryHex, "#6366f1");
    const mutedForeground = muteTokens(foreground, background, 0.5);
    const border = muteTokens(foreground, background, 0.85);

    return {
      // Tailwind semantic tokens (override scoped to .event-branded)
      "--primary": primary,
      "--primary-foreground": primaryForeground,
      "--ring": primary,
      "--accent": primary,
      "--accent-foreground": primaryForeground,

      "--background": background,
      "--foreground": foreground,

      "--card": background,
      "--card-foreground": foreground,

      "--popover": background,
      "--popover-foreground": foreground,

      "--secondary": border,
      "--secondary-foreground": foreground,

      "--muted": border,
      "--muted-foreground": mutedForeground,

      "--border": border,
      "--input": border,

      // Raw values (kept for any direct consumers)
      "--event-primary": primaryHex,
      "--event-secondary": secondaryHex,
      "--event-text": textHex,
    } as React.CSSProperties;
  }, [primaryHex, secondaryHex, textHex]);

  return (
    <div style={style} className="event-branded">
      {children}
    </div>
  );
}
