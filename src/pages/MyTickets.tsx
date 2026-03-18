import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface AttendeeWithRelations {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  payment_status: string | null;
  ticket_sent_at: string | null;
  created_at: string | null;
  ticket_tiers: { name: string; price: number } | null;
  events: { name: string; start_date: string | null; slug: string } | null;
}

export default function MyTickets() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [attendees, setAttendees] = useState<AttendeeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/event/auth-redirect", { replace: true });
      return;
    }

    const fetchTickets = async () => {
      const { data, error } = await supabase
        .from("attendees")
        .select(`
          id, first_name, last_name, email, payment_status, ticket_sent_at, created_at,
          ticket_tiers(name, price),
          events(name, start_date, slug)
        `)
        .eq("email", user.email!)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAttendees(data as unknown as AttendeeWithRelations[]);
      }
      setLoading(false);
    };

    fetchTickets();
  }, [authLoading, user, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <ConvwayoHeader />
        <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Group by event
  const grouped = attendees.reduce<Record<string, AttendeeWithRelations[]>>((acc, att) => {
    const key = att.events?.name ?? "Unknown Event";
    if (!acc[key]) acc[key] = [];
    acc[key].push(att);
    return acc;
  }, {});

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600 text-white">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Payment</Badge>;
      case "issued":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Invoice Sent</Badge>;
      default:
        return <Badge variant="secondary">{status ?? "Unknown"}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Ticket className="h-6 w-6 text-primary" />
          My Tickets
        </h1>

        {attendees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">You don't have any tickets yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Register for an event to see your tickets here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([eventName, atts]) => {
              const event = atts[0]?.events;
              return (
                <Card key={eventName}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {eventName}
                    </CardTitle>
                    {event?.start_date && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.start_date), "d MMM yyyy")}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {atts.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {att.first_name} {att.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {att.ticket_tiers?.name ?? "Ticket"} — €{Number(att.ticket_tiers?.price ?? 0).toFixed(2)}
                          </p>
                          <div className="mt-1">{statusBadge(att.payment_status)}</div>
                        </div>
                        <div>
                          {att.payment_status === "paid" ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/ticket/${att.id}`}>
                                <ExternalLink className="mr-1 h-3 w-3" />
                                View Ticket
                              </Link>
                            </Button>
                          ) : att.payment_status === "pending" ? (
                            <Button size="sm" asChild>
                              <Link to={`/ticket/${att.id}`}>
                                Complete Payment
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
