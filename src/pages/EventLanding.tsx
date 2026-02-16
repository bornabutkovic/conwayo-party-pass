import { useParams, useNavigate } from "react-router-dom";
import { useEvent, useTicketTiers } from "@/hooks/useEvent";
import { EventHero } from "@/components/event/EventHero";
import { RegistrationForm } from "@/components/event/RegistrationForm";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(slug ?? "");
  const { data: tiers = [] } = useTicketTiers(event?.id);

  if (isLoading) {
    return <EventPageSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Event Not Found</h1>
          <p className="mb-8 text-muted-foreground">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EventHero event={event} />
      <RegistrationForm event={event} tiers={tiers} />
    </div>
  );
}
