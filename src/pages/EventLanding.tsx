import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEvent, useTicketTiers } from "@/hooks/useEvent";
import { EventHero } from "@/components/event/EventHero";
import { TicketTierCard } from "@/components/event/TicketTierCard";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const currency = event.currency ?? "EUR";

  const handleRegister = () => {
    if (user) {
      navigate(`/event/${slug}/register`);
    } else {
      navigate(`/event/${slug}/auth`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <EventHero event={event} />

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          {/* Ticket Tiers Preview */}
          {tiers.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-4 text-2xl font-bold text-foreground">Available Tickets</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {tiers.map((tier) => (
                  <TicketTierCard
                    key={tier.id}
                    tier={tier}
                    selected={false}
                    currency={currency}
                    onSelect={() => handleRegister()}
                  />
                ))}
              </div>
            </div>
          )}

          <Button size="lg" className="w-full text-lg" onClick={handleRegister}>
            Register for Event
          </Button>
        </div>
      </section>
    </div>
  );
}
