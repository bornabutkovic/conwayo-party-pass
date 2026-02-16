import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface RegistrationSuccessProps {
  attendeeName: string;
  eventName: string;
  tierName: string;
  price: number;
  currency: string;
}

export function RegistrationSuccess({
  attendeeName,
  eventName,
  tierName,
  price,
  currency,
}: RegistrationSuccessProps) {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md animate-fade-in-up text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>

        <h2 className="mb-2 text-3xl font-bold text-foreground">You're In!</h2>
        <p className="mb-8 text-muted-foreground">
          Your registration for <strong>{eventName}</strong> has been confirmed.
        </p>

        <div className="mb-8 rounded-lg border border-border bg-card p-6 text-left">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium text-foreground">{attendeeName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Ticket</dt>
              <dd className="font-medium text-foreground">{tierName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-bold text-primary">
                {price > 0 ? `${price} ${currency}` : "Free"}
              </dd>
            </div>
          </dl>
        </div>

        <Button onClick={() => navigate("/")} variant="outline">
          Back to Home
        </Button>
      </div>
    </section>
  );
}
