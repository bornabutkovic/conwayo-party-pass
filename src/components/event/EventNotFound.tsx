import { useNavigate } from "react-router-dom";
import { useAvailableEvents } from "@/hooks/useEvent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface EventNotFoundProps {
  slug?: string;
  errorMessage?: string;
}

export function EventNotFound({ slug, errorMessage }: EventNotFoundProps) {
  const navigate = useNavigate();
  const { data: events = [], isLoading: eventsLoading } = useAvailableEvents();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">Event Not Found</h1>
        <p className="mb-2 text-muted-foreground">
          The event you're looking for doesn't exist or has been removed.
        </p>
        {slug && (
          <p className="mb-2 text-sm text-muted-foreground">
            Searched slug: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{slug}</code>
          </p>
        )}
        {errorMessage && (
          <p className="mb-4 text-sm text-destructive">
            Error: {errorMessage}
          </p>
        )}

        {/* Available events */}
        <div className="mb-6 mt-6 rounded-lg border border-border bg-card p-4 text-left">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Available Events</h3>
          {eventsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : events.length > 0 ? (
            <ul className="space-y-2">
              {events.map((evt) => (
                <li key={evt.slug}>
                  <button
                    onClick={() => navigate(`/event/${evt.slug}`)}
                    className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span className="font-medium text-foreground">{evt.name}</span>
                    {evt.venue_name && (
                      <span className="ml-2 text-xs text-muted-foreground">— {evt.venue_name}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No events available.</p>
          )}
        </div>

        <Button onClick={() => navigate("/")} variant="outline">
          Back to Home
        </Button>
      </div>
    </div>
  );
}