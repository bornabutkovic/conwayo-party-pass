import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Calendar, MapPin, ExternalLink } from "lucide-react";
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
  events: {
    name: string;
    start_date: string | null;
    end_date: string | null;
    slug: string;
    venue_name: string | null;
    location_city: string | null;
    branding_primary_color: string | null;
  } | null;
}

export default function MyTickets() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [attendees, setAttendees] = useState<AttendeeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth?tab=login", { replace: true });
      return;
    }

    const fetchTickets = async () => {
      const { data, error } = await supabase
        .from("attendees")
        .select(`
          id, first_name, last_name, email, payment_status, ticket_sent_at, created_at,
          ticket_tiers(name, price),
          events(name, start_date, end_date, slug, venue_name, location_city, branding_primary_color)
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
    const key = att.events?.slug ?? att.events?.name ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(att);
    return acc;
  }, {});

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">✅ Paid</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">⏳ Pending Payment</Badge>;
      case "issued":
        return <Badge variant="secondary" className="bg-sky-100 text-sky-800 hover:bg-sky-100">📄 Invoice Sent</Badge>;
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
            {Object.entries(grouped).map(([key, atts]) => {
              const event = atts[0]?.events;
              return (
                <Card key={key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      🎪 {event?.name ?? "Unknown Event"}
                    </CardTitle>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {event?.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(event.start_date), "MMM d, yyyy")}
                        </span>
                      )}
                      {event?.location_city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.venue_name ? `${event.venue_name}, ${event.location_city}` : event.location_city}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {atts.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-lg border border-border p-4"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {att.ticket_tiers?.name ?? "Ticket"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {att.first_name} {att.last_name}
                          </p>
                          <div>{statusBadge(att.payment_status)}</div>
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
                                Complete Payment →
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
