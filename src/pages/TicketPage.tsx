import { useEffect, useState } from "react";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
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

interface PublicTicket {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  payment_status: string | null;
  event_id: string | null;
  is_guest: boolean;
  event_name: string | null;
  event_slug: string | null;
  currency: string | null;
  order_id: string | null;
  order_number: number | null;
  order_status: string | null;
  payment_method: string | null;
  po_number: string | null;
  purchased_service_ids: string[] | null;
}

export default function TicketPage() {
  const { attendeeId } = useParams<{ attendeeId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const paymentParam = searchParams.get("payment");
  const isPaymentSuccess = paymentParam === "success";

  const { data: services = [] } = useEventServices(ticket?.event_id);

  const isPaid = ticket?.payment_status === "paid";
  const isPolling =
    isPaymentSuccess && !!ticket && !isPaid && !pollTimedOut;

  useEffect(() => {
    if (!attendeeId) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const applyData = (data: PublicTicket | null) => {
      if (!data) {
        setNotFound(true);
        setTicket(null);
        return;
      }
      setNotFound(false);
      setTicket(data);
    };

    const fetchData = async () => {
      const { data, error } = await supabase.rpc("get_public_ticket" as any, {
        p_attendee_id: attendeeId,
      });
      if (cancelled) return;
      if (error) {
        setLoadError(true);
        setLoading(false);
        return;
      }
      applyData(data as PublicTicket | null);
      setLoading(false);
    };

    fetchData();

    if (paymentParam === "success") {
      interval = setInterval(async () => {
        const { data, error } = await supabase.rpc("get_public_ticket" as any, {
          p_attendee_id: attendeeId,
        });
        if (cancelled || error || !data) return;
        const t = data as PublicTicket;
        if (t.payment_status === "paid") {
          applyData(t);
          if (interval) clearInterval(interval);
          if (timeout) clearTimeout(timeout);
        }
      }, 2000);

      timeout = setTimeout(() => {
        if (interval) clearInterval(interval);
        if (!cancelled) setPollTimedOut(true);
      }, 60000);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [attendeeId, paymentParam]);

  const triggerStripeCheckout = async () => {
    if (!ticket) return;
    setRedirectingToStripe(true);
    try {
      const res = await supabase.functions.invoke("create-checkout", {
        body: { orderId: ticket.order_id, eventId: ticket.event_id },
      });
      const result = res.data;
      if (result.free) {
        setTicket({ ...ticket, payment_status: "paid" });
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
    if (!ticket || !ticket.event_id) return;

    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    try {
      // Fetch event for VAT
      const { data: ev } = await supabase
        .from("events")
        .select("vat_rate")
        .eq("id", ticket.event_id)
        .maybeSingle();

      const vatRate = ev?.vat_rate ?? 25;
      const vatAmount = Number(((service.price * vatRate) / (100 + vatRate)).toFixed(2));

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          event_id: ticket.event_id,
          attendee_id: ticket.id,
          payer_name: `${ticket.first_name} ${ticket.last_name}`,
          payer_type: "individual",
          status: "draft",
          total_amount: service.price,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      const { error: itemError } = await supabase.from("order_items").insert({
        order_id: order.id,
        attendee_id: ticket.id,
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
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                purchased_service_ids: [...(prev.purchased_service_ids ?? []), serviceId],
              }
            : prev
        );
        toast({ title: "Service added to your ticket!" });
        return;
      }

      const res = await supabase.functions.invoke("create-checkout", {
        body: { attendeeId: ticket.id, eventId: ticket.event_id },
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

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {lang === "en" ? "Something went wrong" : "Došlo je do pogreške"}
          </h1>
          <p className="text-muted-foreground">
            {lang === "en"
              ? "We cannot display your ticket right now. Please check your email or contact the organizer."
              : "Ulaznicu trenutno ne možemo prikazati. Provjerite e-mail ili kontaktirajte organizatora."}
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Ticket Not Found</h1>
          <p className="text-muted-foreground">This ticket link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const purchasedServiceIds = new Set(ticket.purchased_service_ids ?? []);
  const isGuest = ticket.is_guest;
  const orderSettled = ["paid", "issued", "overdue", "deferred"].includes(
    ticket.order_status ?? ""
  );
  const showPayNow = !isPaid && !isPaymentSuccess && !orderSettled && !isPolling;

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-lg space-y-6">
          {/* Guest → Account Conversion Banner */}
          {isGuest && !user && ticket.email && (
            <CreateAccountBanner
              attendeeId={ticket.id}
              email={ticket.email}
              firstName={ticket.first_name}
              lastName={ticket.last_name}
            />
          )}

          {/* Payment confirmation pending */}
          {isPolling && (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {lang === "en"
                    ? "Payment received. Confirming your payment, this takes a few seconds…"
                    : "Plaćanje je zaprimljeno. Potvrđujemo uplatu, ovo traje nekoliko sekundi…"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Payment received but not confirmed within 60s */}
          {isPaymentSuccess && !isPaid && pollTimedOut && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {lang === "en"
                    ? "Your payment was received; the confirmation and ticket will arrive by email. Please do not pay again."
                    : "Uplata je zaprimljena, a potvrda i ulaznica stižu na vaš e-mail. Nemojte ponovno plaćati."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                My Ticket
                {ticket.event_name && (
                  <span className="text-sm font-normal text-muted-foreground">
                    — {ticket.event_name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative rounded-xl border-2 border-primary/20 bg-card p-4">
                  <div className={!isPaid ? "blur-md pointer-events-none select-none" : ""}>
                    <QRCodeSVG value={ticket.id} size={192} level="H" includeMargin />
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
                  ID: {ticket.id.slice(0, 8)}...
                </p>
                {showPayNow && (
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
                    {ticket.first_name} {ticket.last_name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium text-foreground">{ticket.email}</dd>
                </div>
                {ticket.phone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-medium text-foreground">{ticket.phone}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={ticket.status === "approved" ? "default" : "secondary"}>
                      {ticket.status ?? "Pending"}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd>
                    <Badge variant={isPaid ? "default" : "secondary"}>
                      {ticket.payment_status ?? "Pending"}
                    </Badge>
                  </dd>
                </div>
                {ticket.po_number && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">PO Number</dt>
                    <dd className="font-medium text-foreground">{ticket.po_number}</dd>
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
                    currency={ticket.currency ?? "EUR"}
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
