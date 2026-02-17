import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Ticket, User, CreditCard, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Attendee = Tables<"attendees">;

export default function TicketPage() {
  const { attendeeId } = useParams<{ attendeeId: string }>();
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);

  useEffect(() => {
    if (!attendeeId) return;

    const fetchData = async () => {
      try {
        const { data: att, error: attErr } = await supabase
          .from("attendees")
          .select("*")
          .eq("id", attendeeId)
          .maybeSingle();

        if (attErr) throw attErr;
        if (!att) {
          toast({ title: "Ticket not found", variant: "destructive" });
          return;
        }

        setAttendee(att);

        if (att.event_id) {
          const { data: ev } = await supabase
            .from("events")
            .select("name, slug")
            .eq("id", att.event_id)
            .maybeSingle();

          if (ev) {
            setEventName(ev.name);
            setEventSlug(ev.slug);
          }
        }
      } catch (err: any) {
        toast({ title: "Error loading ticket", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [attendeeId]);

  const triggerStripeCheckout = async () => {
    if (!attendee) return;
    setRedirectingToStripe(true);
    try {
      const res = await fetch(
        `https://yqusqfdaikkvvjflgmmh.supabase.co/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdXNxZmRhaWtrdnZqZmxnbW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDMxNzYsImV4cCI6MjA4MjY3OTE3Nn0.nWRj48zSZxz5qUK_wkV3PKbkG969rdpsbQ8OAWdBESk`,
          },
          body: JSON.stringify({
            attendeeId: attendee.id,
            eventId: attendee.event_id,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6">
          <Skeleton className="h-48 w-48 mx-auto rounded-lg" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!attendee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Ticket Not Found</h1>
          <p className="text-muted-foreground">This ticket link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const isPaid = attendee.payment_status === "paid";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">{eventName || "Event"}</h1>
          <p className="text-sm text-muted-foreground">Your Ticket</p>
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
              <div className="flex flex-col items-center gap-4">
                <div className="relative rounded-xl border-2 border-primary/20 bg-card p-4">
                  <div className={!isPaid ? "blur-md pointer-events-none select-none" : ""}>
                    <QRCodeSVG value={attendee.id} size={192} level="H" includeMargin />
                  </div>
                  {!isPaid && (
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
                {!isPaid && (
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
                    <Badge variant={isPaid ? "default" : "secondary"}>
                      {attendee.payment_status ?? "Pending"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
