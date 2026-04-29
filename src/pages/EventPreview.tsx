import { useParams } from "react-router-dom";
import { useEventPreview } from "@/hooks/useEventPreview";
import EventLanding from "./EventLanding";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";

function PlainNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
    </div>
  );
}

export default function EventPreview() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading, error } = useEventPreview(eventId ?? "");

  if (isLoading) return <EventPageSkeleton />;
  if (error || !event) return <PlainNotFound />;

  return <EventLanding previewEvent={event} isPreview={true} />;
}
