import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { useAuth } from "@/hooks/useAuth";
import { useEvent } from "@/hooks/useEvent";
import { useEventServices } from "@/hooks/useEventServices";
import { supabase } from "@/integrations/supabase/client";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { ServiceCard } from "@/components/event/ServiceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { LogOut, Ticket, User, CreditCard, Loader2, ShoppingBag } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Attendee = Tables<"attendees">;

export default function EventDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(slug ?? "");
  const { data: services = [] } = useEventServices(event?.id);

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attLoading, setAttLoading] = useState(true);
  const [purchasedServiceIds, setPurchasedServiceIds] = useState<Set<string>>(new Set());
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);

  useEffect(() => {
    if (authLoading || eventLoading) return;

    if (!user) {
      navigate(`/event/${slug}/auth`);
      return;
    }

    if (!event) return;

    const fetchAttendees = async () => {
      try {
        // Get all attendees for this user across this event
        const { data, error } = await supabase
          .from("attendees")
          .select("*")
          .eq("event_id", event.id)
          .eq("profile_id", user.id);

        if (error) throw error;

        if (!data || data.length === 0) {
          toast({ title: "No registration found", description: "Please register first.", variant: "destructive" });
          navigate(`/event/${slug}`);
          return;
        }

        setAttendees(data);

        // Fetch purchased services for this attendee
        const attendeeIds = data.map((a) => a.id);
        const { data: items } = await supabase
          .from("order_items")
          .select("service_id")
          .in("attendee_id", attendeeIds)
          .not("service_id", "is", null);

        if (items) {
          setPurchasedServiceIds(new Set(items.map((i) => i.service_id!)));
        }
      } catch (err: any) {
        toast({ title: "Error loading tickets", description: err.message, variant: "destructive" });
      } finally {
        setAttLoading(false);
      }
    };

    fetchAttendees();
  }, [user, event, authLoading, eventLoading, slug, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate(`/event/${slug}`);
  };

  const triggerStripeCheckout = async (attendeeId: string) => {
    if (!event) return;
    setRedirectingToStripe(true);
    try {
      const res = await supabase.functions.invoke("create-checkout", {
        body: { attendeeId, eventId: event.id, slug },
      });
      const result = res.data;
      if (result.free) {
        setAttendees((prev) =>
          prev.map((a) => (a.id === attendeeId ? { ...a, payment_status: "paid" } : a))
        );
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

  const handlePurchaseService = async (serviceId: string) => {
    const attendee = attendees[0];
    if (!attendee || !event) return;

    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    try {
      const vatRate = event.vat_rate ?? 25;
      const vatAmount = Number(((service.price * vatRate) / (100 + vatRate)).toFixed(2));

      // Create order for service
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          event_id: event.id,
          attendee_id: attendee.id,
          payer_name: `${attendee.first_name} ${attendee.last_name}`,
          payer_type: "individual",
          status: "draft",
          total_amount: service.price,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Create order item for the service
      const { error: itemError } = await supabase.from("order_items").insert({
        order_id: order.id,
        attendee_id: attendee.id,
        service_id: serviceId,
        description: service.name,
        quantity: 1,
        unit_price: service.price,
        total_price: service.price,
        vat_amount: vatAmount,
        price_at_purchase: service.price,
      });

      if (itemError) throw itemError;

      // If free, mark as purchased
      if (service.price <= 0) {
        setPurchasedServiceIds((prev) => new Set([...prev, serviceId]));
        toast({ title: "Service added to your ticket!" });
        return;
      }

      // Trigger Stripe checkout for the service
      const res = await supabase.functions.invoke("create-checkout", {
        body: { attendeeId: attendee.id, eventId: event.id, slug },
      });

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error(res.data?.error || "Failed to create payment");
      }
    } catch (err: any) {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    }
  };

  if (authLoading || eventLoading) return <EventPageSkeleton />;
  if (eventError || !event) return <EventNotFound slug={slug} errorMessage={eventError?.message} />;

  const currency = event.currency ?? "EUR";
  const primaryAttendee = attendees[0];

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader />

      {/* Sub-header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">{event.name}</h1>
            <p className="text-xs text-muted-foreground">Member Dashboard</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* My Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                My Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-48 w-48 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div className="space-y-6">
                  {attendees.map((attendee) => {
                    const isPaid = attendee.payment_status === "paid";
                    return (
                      <div key={attendee.id} className="flex flex-col items-center gap-4 pb-4 border-b border-border last:border-0">
                        <div className="relative rounded-xl border-2 border-primary/20 bg-card p-4">
                          <div className={!isPaid ? "blur-md pointer-events-none select-none" : ""}>
                            <QRCodeSVG value={attendee.id} size={180} level="H" includeMargin />
                          </div>
                          {!isPaid && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="rounded-full bg-background/90 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
                                Payment Required
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-center space-y-1">
                          <p className="font-medium text-foreground">{attendee.first_name} {attendee.last_name}</p>
                          <p className="text-xs text-muted-foreground">ID: {attendee.id.slice(0, 8)}...</p>
                          <div className="flex gap-2 justify-center">
                            <Badge variant={attendee.status === "approved" ? "default" : "secondary"}>
                              {attendee.status ?? "Pending"}
                            </Badge>
                            <Badge variant={isPaid ? "default" : "secondary"}>
                              {attendee.payment_status ?? "Pending"}
                            </Badge>
                          </div>
                        </div>
                        {!isPaid && (
                          <Button
                            size="lg"
                            className="w-full max-w-xs"
                            onClick={() => triggerStripeCheckout(attendee.id)}
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendee Info */}
          {primaryAttendee && (
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
                      {primaryAttendee.first_name} {primaryAttendee.last_name}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium text-foreground">{primaryAttendee.email}</dd>
                  </div>
                  {primaryAttendee.phone && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd className="font-medium text-foreground">{primaryAttendee.phone}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Marketplace / Additional Services */}
          {services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Marketplace — Additional Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    currency={currency}
                    purchased={purchasedServiceIds.has(service.id)}
                    onPurchase={handlePurchaseService}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
