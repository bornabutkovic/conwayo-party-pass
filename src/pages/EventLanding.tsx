import { useParams } from "react-router-dom";
import { useEvent, useTicketTiers } from "@/hooks/useEvent";
import { EventHero } from "@/components/event/EventHero";
import { RegistrationForm } from "@/components/event/RegistrationForm";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = useEvent(slug ?? "");
  const { data: tiers = [] } = useTicketTiers(event?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary/10 py-16">
          <div className="container mx-auto px-4">
            <Skeleton className="mb-4 h-10 w-32" />
            <Skeleton className="mb-6 h-16 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-foreground">Event Not Found</h1>
          <p className="text-muted-foreground">
            The event you're looking for doesn't exist or has been removed.
          </p>
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
