import { useEffect, useState } from "react";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEventServices } from "@/hooks/useEventServices";
import { CreateAccountBanner } from "@/components/event/CreateAccountBanner";
import { ServiceCard } from "@/components/event/ServiceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Ticket, User, CreditCard, Loader2, ShoppingBag } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Attendee = Tables<"attendees">;

export default function TicketPage() {
  const { attendeeId } = useParams<{ attendeeId: string }>();
  const { user } = useAuth();
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [poNumber, setPoNumber] = useState<string | null>(null);
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(true);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const [purchasedServiceIds, setPurchasedServiceIds] = useState<Set<string>>(new Set());

  const { data: services = [] } = useEventServices(eventId);

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

        // Fetch PO number from order
        const { data: order } = await supabase
          .from("orders")
          .select("po_number")
          .eq("attendee_id", att.id)
          .maybeSingle();

        if (order?.po_number) {
          setPoNumber(order.po_number);
        }

        // Fetch purchased services
        const { data: items } = await supabase
          .from("order_items")
          .select("service_id")
          .eq("attendee_id", att.id)
          .not("service_id", "is", null);

        if (items) {
          setPurchasedServiceIds(new Set(items.map((i) => i.service_id!)));
        }

        if (att.event_id) {
          setEventId(att.event_id);
          const { data: ev } = await supabase
            .from("events")
            .select("name, slug, currency")
            .eq("id", att.event_id)
            .maybeSingle();

          if (ev) {
            setEventName(ev.name);
            setCurrency(ev.currency ?? "EUR");
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
      const res = await supabase.functions.invoke("create-checkout", {
        body: { attendeeId: attendee.id, eventId: attendee.event_id },
      });
      const result = res.data;
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

  const handlePurchaseService = async (serviceId: string) => {
    if (!attendee || !eventId) return;

    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    try {
      // Fetch event for VAT
      const { data: ev } = await supabase
        .from("events")
        .select("vat_rate")
        .eq("id", eventId)
        .maybeSingle();

      const vatRate = ev?.vat_rate ?? 25;
      const vatAmount = Number(((service.price * vatRate) / (100 + vatRate)).toFixed(2));

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          event_id: eventId,
          attendee_id: attendee.id,
          payer_name: `${attendee.first_name} ${attendee.last_name}`,
          payer_type: "individual",
          status: "draft",
          total_amount: service.price,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

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

      if (service.price <= 0) {
        setPurchasedServiceIds((prev) => new Set([...prev, serviceId]));
        toast({ title: "Service added to your ticket!" });
        return;
      }

      const res = await supabase.functions.invoke("create-checkout", {
        body: { attendeeId: attendee.id, eventId },
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
  const isGuest = !attendee.profile_id;

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-lg space-y-6">
          {/* Guest → Account Conversion Banner */}
          {isGuest && !user && attendee.email && (
            <CreateAccountBanner
              attendeeId={attendee.id}
              email={attendee.email}
              firstName={attendee.first_name}
              lastName={attendee.last_name}
            />
          )}

          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                My Ticket
                {eventName && <span className="text-sm font-normal text-muted-foreground">— {eventName}</span>}
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
                {poNumber && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">PO Number</dt>
                    <dd className="font-medium text-foreground">{poNumber}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Marketplace / Services */}
          {services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Additional Services
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
