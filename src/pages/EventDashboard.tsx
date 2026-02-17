import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEvent } from "@/hooks/useEvent";
import { supabase } from "@/integrations/supabase/client";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { LogOut, Ticket, User, CreditCard, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Attendee = Tables<"attendees">;

export default function EventDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(slug ?? "");

  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [attLoading, setAttLoading] = useState(true);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);

  useEffect(() => {
    if (authLoading || eventLoading) return;

    if (!user) {
      navigate(`/event/${slug}/auth`);
      return;
    }

    if (!event) return;

    const fetchAttendee = async () => {
      try {
        const { data, error } = await supabase
          .from("attendees")
          .select("*")
          .eq("event_id", event.id)
          .eq("profile_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast({ title: "No registration found", description: "Please register first.", variant: "destructive" });
          navigate(`/event/${slug}/auth`);
          return;
        }

        setAttendee(data);
      } catch (err: any) {
        toast({ title: "Error loading ticket", description: err.message, variant: "destructive" });
      } finally {
        setAttLoading(false);
      }
    };

    fetchAttendee();
  }, [user, event, authLoading, eventLoading, slug, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate(`/event/${slug}/auth`);
  };

  const triggerStripeCheckout = async () => {
    if (!attendee || !event) return;
    setRedirectingToStripe(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `https://yqusqfdaikkvvjflgmmh.supabase.co/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attendeeId: attendee.id,
            eventId: event.id,
            slug,
          }),
        }
      );
      const result = await res.json();
      if (result.free) {
        setAttendee({ ...attendee, payment_status: "paid" });
        toast({ title: "Free ticket activated!" });
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error || "Failed to create checkout");
      }
    } catch (err: any) {
      toast({ title: "Payment redirect failed", description: err.message, variant: "destructive" });
    } finally {
      setRedirectingToStripe(false);
    }
  };

  if (authLoading || eventLoading) return <EventPageSkeleton />;

  if (eventError || !event) {
    return <EventNotFound slug={slug} errorMessage={eventError?.message} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{event.name}</h1>
            <p className="text-sm text-muted-foreground">Attendee Dashboard</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-lg space-y-6">
          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                My Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {attLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-48 w-48 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : attendee ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative rounded-xl border-2 border-primary/20 bg-card p-4">
                    <div className={attendee.payment_status !== "paid" ? "blur-md pointer-events-none select-none" : ""}>
                      <QRCodeSVG
                        value={attendee.id}
                        size={192}
                        level="H"
                        includeMargin
                      />
                    </div>
                    {attendee.payment_status !== "paid" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-background/90 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
                          Waiting for payment confirmation
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ID: {attendee.id.slice(0, 8)}...
                  </p>
                  {attendee.payment_status !== "paid" && (
                    <Button
                      size="lg"
                      className="w-full mt-2"
                      onClick={triggerStripeCheckout}
                      disabled={redirectingToStripe}
                    >
                      {redirectingToStripe ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-5 w-5" />
                      )}
                      {redirectingToStripe ? "Redirecting..." : "PAY NOW"}
                    </Button>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Attendee Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Attendee Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : attendee ? (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium text-foreground">
                      {attendee.first_name} {attendee.last_name}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium text-foreground">{attendee.email}</dd>
                  </div>
                  {attendee.phone && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd className="font-medium text-foreground">{attendee.phone}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant={attendee.status === "approved" ? "default" : "secondary"}>
                        {attendee.status ?? "Pending"}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Payment</dt>
                    <dd>
                      <Badge variant={attendee.payment_status === "paid" ? "default" : "secondary"}>
                        {attendee.payment_status ?? "Pending"}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
