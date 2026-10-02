import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useEventPreview } from "@/hooks/useEventPreview";
import { useLanguage } from "@/hooks/useLanguage";
import EventLanding from "./EventLanding";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";

const ALLOWED_ORIGINS = [
  "https://conwayo.app",
  "https://www.conwayo.app",
  "https://id-preview--908ddbac-4687-4971-b60a-0b5b5e488a13.lovable.app",
];

const EMPTY_EVENT: any = {
  id: null,
  slug: "preview",
  name: "",
  status: "draft",
  event_type: "face2face",
  currency: "EUR",
  supported_languages: ["hr"],
  translations: {},
  organizers_info: {},
  ticket_tiers: [],
  event_services: [],
  institutions: null,
};

function PlainNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
    </div>
  );
}

export default function EventPreview() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";
  const isNew = eventId === "new";
  const { setLang } = useLanguage();

  const { data: event, isLoading, error } = useEventPreview(isNew ? "" : (eventId ?? ""));

  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [previewLang, setPreviewLang] = useState<"hr" | "en" | null>(null);

  const announceReady = () => {
    for (const origin of ALLOWED_ORIGINS) {
      try {
        window.parent.postMessage({ source: "conwayo-preview", type: "ready" }, origin);
      } catch {
        // ignore — parent may not exist
      }
    }
  };

  useEffect(() => {
    if (!isEmbed) return;

    const handler = (e: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(e.origin)) return;
      const data = e.data;
      if (!data || data.source !== "conwayo-admin" || data.type !== "event-overrides") return;
      if (!data.payload || typeof data.payload !== "object" || Array.isArray(data.payload)) return;
      setOverrides(data.payload);
      if (data.lang === "hr" || data.lang === "en") {
        setPreviewLang(data.lang);
      }
    };

    window.addEventListener("message", handler);
    announceReady();
    return () => window.removeEventListener("message", handler);
  }, [isEmbed]);

  // Re-announce readiness once the fetched event has loaded
  useEffect(() => {
    if (isEmbed && event) announceReady();
  }, [isEmbed, event]);

  // Apply the language pushed by the Admin Portal
  useEffect(() => {
    if (previewLang) setLang(previewLang);
  }, [previewLang, setLang]);

  const baseEvent = isNew ? EMPTY_EVENT : event;

  const mergedEvent = useMemo(() => {
    if (!baseEvent) return null;
    const merged: any = { ...baseEvent, ...overrides };
    merged.translations = {
      ...(baseEvent.translations ?? {}),
      ...(overrides.translations ?? {}),
      en: {
        ...(baseEvent.translations?.en ?? {}),
        ...(overrides.translations?.en ?? {}),
      },
    };
    const info = (merged.organizers_info ?? {}) as {
      co_organizers?: any[];
      technical_organizer?: any;
    };
    merged.coOrganizersInfo = Array.isArray(info.co_organizers)
      ? info.co_organizers.filter(
          (o): o is any => !!o && typeof o.name === "string" && o.name.trim() !== ""
        )
      : [];
    merged.technicalOrganizerInfo =
      info.technical_organizer &&
      typeof info.technical_organizer.name === "string" &&
      info.technical_organizer.name.trim() !== ""
        ? info.technical_organizer
        : null;
    return merged;
  }, [baseEvent, overrides]);

  if (isNew) {
    return <EventLanding previewEvent={mergedEvent} isPreview={true} embedded={isEmbed} />;
  }

  if (isLoading) return <EventPageSkeleton />;
  if (error || !mergedEvent) return <PlainNotFound />;

  return <EventLanding previewEvent={mergedEvent} isPreview={true} embedded={isEmbed} />;
}
