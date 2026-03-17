import React, { useState, useMemo } from "react";
import { EventBrandedHeader } from "@/components/event/EventBrandedHeader";
import { EventBrandingProvider } from "@/components/event/EventBrandingProvider";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent, useTicketTiers } from "@/hooks/useEvent";
import { useEventServices } from "@/hooks/useEventServices";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EventHero } from "@/components/event/EventHero";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Building2, UserIcon, CreditCard, LogIn, UserPlus,
  Minus, Plus, ShoppingBag, Ticket, Users, ChevronRight
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Enums } from "@/integrations/supabase/types";
import type { TicketTier } from "@/hooks/useEvent";
import type { EventService } from "@/hooks/useEventServices";

/* ─── Types ──────────────────────────────────────────── */

interface TicketSelection {
  tierId: string;
  quantity: number;
}

interface ServiceSelection {
  serviceId: string;
  quantity: number;
}

// Maps serviceId → array of attendee indices (one per quantity unit)
type ServiceAssignments = Record<string, number[]>;

interface AttendeeDetail {
  first_name: string;
  last_name: string;
  email: string;
}

interface SuccessData {
  orderId: string;
  attendeeIds: string[];
  eventName: string;
  totalAmount: number;
  currency: string;
  payerType: "individual" | "company";
}

/* ─── Quantity Selector ──────────────────────────────── */

const QuantitySelector = React.forwardRef<HTMLDivElement, {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}>(function QuantitySelector({ value, onChange, max }, ref) {
  return (
    <div ref={ref} className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-8 text-center font-semibold text-foreground">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
});

/* ─── Main Component ─────────────────────────────────── */

export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(slug ?? "");
  const { data: tiers = [] } = useTicketTiers(event?.id);
  const { data: services = [] } = useEventServices(event?.id);
  const { user, signIn, loading: authLoading } = useAuth();

  // Step management: "select" → "details" → "success"
  const [step, setStep] = useState<"select" | "details" | "success">("select");

  // Selection state
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>({});
  const [serviceSelections, setServiceSelections] = useState<Record<string, number>>({});

  // Details state
  const [attendees, setAttendees] = useState<AttendeeDetail[]>([]);
  const [serviceAssignments, setServiceAssignments] = useState<ServiceAssignments>({});
  const [entryTab, setEntryTab] = useState<string>("guest");
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);

  // Billing form (used for guest checkout)
  const [billing, setBilling] = useState({
    email: "",
    phone: "",
    institution: "",
    payer_type: "individual" as "individual" | "company",
    company_name: "",
    payer_oib: "",
    payer_address: "",
    po_number: "",
  });

  /* ─── Derived calculations (must be before early returns) ── */

  const totalTickets = Object.values(ticketSelections).reduce((s, q) => s + q, 0);

  const ticketLineItems = useMemo(() => {
    return tiers
      .filter((t) => (ticketSelections[t.id] ?? 0) > 0)
      .map((t) => ({
        tier: t,
        quantity: ticketSelections[t.id],
        subtotal: t.price * ticketSelections[t.id],
      }));
  }, [tiers, ticketSelections]);

  const serviceLineItems = useMemo(() => {
    return services
      .filter((s) => (serviceSelections[s.id] ?? 0) > 0)
      .map((s) => ({
        service: s,
        quantity: serviceSelections[s.id],
        subtotal: s.price * serviceSelections[s.id],
      }));
  }, [services, serviceSelections]);

  const grandTotal = useMemo(() => {
    const ticketTotal = ticketLineItems.reduce((s, i) => s + i.subtotal, 0);
    const serviceTotal = serviceLineItems.reduce((s, i) => s + i.subtotal, 0);
    return ticketTotal + serviceTotal;
  }, [ticketLineItems, serviceLineItems]);

  if (isLoading || authLoading) return <EventPageSkeleton />;
  if (error || !event) return <EventNotFound slug={slug} errorMessage={error?.message} />;

  const currency = event.currency ?? "EUR";
  const vatRate = event.vat_rate ?? 25;

  const hasItems = totalTickets > 0;

  /* ─── Step navigation ──────────────────────────────── */

  const goToDetails = () => {
    if (!hasItems) {
      toast({ title: "Please select at least one ticket", variant: "destructive" });
      return;
    }
    // Initialize attendee detail slots
    const slots: AttendeeDetail[] = Array.from({ length: totalTickets }, () => ({
      first_name: "",
      last_name: "",
      email: "",
    }));
    setAttendees(slots);

    // Initialize service assignments — default all units to attendee index 0
    const assignments: ServiceAssignments = {};
    for (const item of serviceLineItems) {
      assignments[item.service.id] = Array.from({ length: item.quantity }, () => 0);
    }
    setServiceAssignments(assignments);

    setStep("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── Login handler ────────────────────────────────── */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({ title: "Email and password are required", variant: "destructive" });
      return;
    }
    setLoginLoading(true);
    try {
      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Login failed");

      // Auto-fill first attendee from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone, institution")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        setAttendees((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[0] = {
              first_name: profile.first_name ?? "",
              last_name: profile.last_name ?? "",
              email: profile.email ?? session.user.email ?? "",
            };
          }
          return updated;
        });
        setBilling((prev) => ({
          ...prev,
          email: profile.email ?? session.user.email ?? "",
          phone: profile.phone ?? "",
          institution: profile.institution ?? "",
        }));
      }

      setEntryTab("guest"); // Switch to form view after login
      toast({ title: "Logged in successfully", description: "Your details have been auto-filled." });
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  /* ─── Submit / Checkout handler ────────────────────── */

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate billing email
    if (!billing.email) {
      toast({ title: "Billing email is required", variant: "destructive" });
      return;
    }

    // Validate at least first attendee has name
    const firstAtt = attendees[0];
    if (!firstAtt?.first_name || !firstAtt?.last_name) {
      toast({ title: "At least the first attendee's name is required", variant: "destructive" });
      return;
    }

    if (billing.payer_type === "company" && !billing.company_name) {
      toast({ title: "Company name is required for company billing", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payerName = billing.payer_type === "company" ? billing.company_name : `${firstAtt.first_name} ${firstAtt.last_name}`;

      // 1. Create attendee records — one per ticket
      const attendeeIds: string[] = [];
      let ticketIndex = 0;

      for (const item of ticketLineItems) {
        for (let i = 0; i < item.quantity; i++) {
          const att = attendees[ticketIndex] ?? { first_name: "", last_name: "", email: "" };
          const { data: created, error: attErr } = await supabase
            .from("attendees")
            .insert({
              event_id: event.id,
              ticket_tier_id: item.tier.id,
              first_name: att.first_name || firstAtt.first_name,
              last_name: att.last_name || firstAtt.last_name,
              email: att.email || billing.email,
              phone: billing.phone || null,
              institution: billing.institution || null,
              profile_id: user?.id ?? null,
              status: "approved",
              payment_status: "pending",
              price_paid: item.tier.price,
            })
            .select("id")
            .single();

          if (attErr) throw attErr;
          attendeeIds.push(created.id);
          ticketIndex++;
        }
      }

      // 2. Create ONE order (draft-first pattern)
      const isCompany = billing.payer_type === "company";
      const paymentMethod = isCompany ? "invoice" : "stripe";
      const isGroupOrder = totalTickets > 1;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          event_id: event.id,
          attendee_id: attendeeIds[0], // primary attendee
          payer_name: payerName,
          payer_type: billing.payer_type as Enums<"payer_type">,
          payer_oib: billing.payer_oib || null,
          payer_address: billing.payer_address || null,
          po_number: billing.po_number || null,
          status: "draft",
          total_amount: grandTotal,
          payment_method: paymentMethod,
          is_group_order: isGroupOrder,
        })
        .select("id")
        .single();

      if (orderErr) throw orderErr;

      // 3. Create order_items — tickets
      const orderItems: any[] = [];
      let attIdx = 0;
      for (const item of ticketLineItems) {
        for (let i = 0; i < item.quantity; i++) {
          const unitPrice = item.tier.price;
          const vatAmount = Number(((unitPrice * vatRate) / (100 + vatRate)).toFixed(2));
          orderItems.push({
            order_id: order.id,
            attendee_id: attendeeIds[attIdx],
            ticket_type_id: item.tier.id,
            description: item.tier.name,
            quantity: 1,
            unit_price: unitPrice,
            total_price: unitPrice,
            vat_amount: vatAmount,
            price_at_purchase: unitPrice,
          });
          attIdx++;
        }
      }

      // 4. Create order_items — services (with per-attendee assignment)
      for (const item of serviceLineItems) {
        const assignments = serviceAssignments[item.service.id] ?? [];
        for (let i = 0; i < item.quantity; i++) {
          const assignedAttIdx = assignments[i] ?? 0;
          const assignedAttId = attendeeIds[assignedAttIdx] ?? attendeeIds[0];
          const unitPrice = item.service.price;
          const vatAmount = Number(((unitPrice * vatRate) / (100 + vatRate)).toFixed(2));
          orderItems.push({
            order_id: order.id,
            attendee_id: assignedAttId,
            service_id: item.service.id,
            description: item.service.name,
            quantity: 1,
            unit_price: unitPrice,
            total_price: unitPrice,
            vat_amount: vatAmount,
            price_at_purchase: unitPrice,
          });
        }
      }

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      // 5. Send ticket emails (best-effort)
      for (const aid of attendeeIds) {
        supabase.functions.invoke("send-ticket-email", { body: { attendeeId: aid } }).catch(() => {});
      }

      const successData: SuccessData = {
        orderId: order.id,
        attendeeIds,
        eventName: event.name,
        totalAmount: grandTotal,
        currency,
        payerType: billing.payer_type,
      };

      // 6. For individual payers with amount > 0, trigger Stripe
      if (!isCompany && grandTotal > 0) {
        setSuccess(successData);
        setStep("success");
        await triggerStripeCheckout(order.id);
      } else {
        // Free or company invoice
        if (grandTotal === 0) {
          // Mark as paid immediately
          await supabase.from("orders").update({ status: "paid" }).eq("id", order.id);
          for (const aid of attendeeIds) {
            await supabase.from("attendees").update({ payment_status: "paid" }).eq("id", aid);
          }
        }
        setSuccess(successData);
        setStep("success");
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const triggerStripeCheckout = async (orderId: string) => {
    setRedirectingToStripe(true);
    try {
      console.log("create-checkout payload:", { orderId, eventId: event.id });

      const { data, error: fnError } = await supabase.functions.invoke("create-checkout", {
        body: { orderId, eventId: event.id },
      });

      console.log("create-checkout response:", { data, fnError });

      if (fnError) {
        throw new Error(typeof fnError === "object" && fnError.message ? fnError.message : "Edge function error: " + JSON.stringify(fnError));
      }

      if (data?.free) {
        toast({ title: "Free ticket activated!" });
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || "Payment system unavailable. Please check configuration.");
      }
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      toast({ title: "Payment redirect failed", description: err.message, variant: "destructive" });
    } finally {
      setRedirectingToStripe(false);
    }
  };

  /* ─── Success View ─────────────────────────────────── */

  if (step === "success" && success) {
    const primaryId = success.attendeeIds[0];
    return (
      <EventBrandingProvider event={event}>
      <div className="min-h-screen" style={{ backgroundColor: event.branding_secondary_color ?? '#ffffff', color: event.branding_text_color ?? '#1f2937' }}>
        <EventBrandedHeader event={event} />
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {success.payerType === "company" ? (
              <>
                <h2 className="mb-2 text-3xl font-bold text-foreground">Invoice Requested</h2>
                <p className="mb-6 text-muted-foreground">
                  Your order has been submitted. You will receive an invoice via email shortly.
                </p>
              </>
            ) : success.totalAmount === 0 ? (
              <>
                <h2 className="mb-2 text-3xl font-bold text-foreground">Registration Complete!</h2>
                <p className="mb-6 text-muted-foreground">
                  Your free tickets for <strong>{success.eventName}</strong> are confirmed.
                </p>
              </>
            ) : (
              <>
                <h2 className="mb-2 text-3xl font-bold text-foreground">Almost There!</h2>
                <p className="mb-6 text-muted-foreground">
                  Your order for <strong>{success.eventName}</strong> is confirmed. Complete payment to activate your tickets.
                </p>
                {redirectingToStripe && (
                  <div className="mb-6 rounded-lg border border-border bg-accent/10 p-4 text-sm text-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p>Redirecting to Stripe Checkout...</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mb-8 rounded-lg border border-border bg-card p-6 text-left">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tickets</dt>
                  <dd className="font-medium text-foreground">{success.attendeeIds.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Amount</dt>
                  <dd className="font-bold text-primary">
                    {success.totalAmount > 0 ? `${success.totalAmount.toFixed(2)} ${currency}` : "Free"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd>
                    <Badge variant={success.totalAmount === 0 ? "default" : "secondary"}>
                      {success.totalAmount === 0 ? "Confirmed" : "Pending"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>

            {success.payerType === "individual" && success.totalAmount > 0 ? (
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full text-lg"
                  onClick={() => triggerStripeCheckout(success.orderId)}
                  disabled={redirectingToStripe}
                >
                  {redirectingToStripe ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-5 w-5" />
                  )}
                  {redirectingToStripe ? "Redirecting..." : "PAY NOW"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/ticket/${primaryId}`)}>
                  View My Ticket
                </Button>
              </div>
            ) : (
              <Button onClick={() => navigate(`/ticket/${primaryId}`)}>
                View My Ticket
              </Button>
            )}
          </div>
        </section>
      </div>
      </EventBrandingProvider>
    );
  }

  /* ─── STEP 2: Details & Billing ────────────────────── */

  if (step === "details") {
    return (
      <EventBrandingProvider event={event}>
      <div className="min-h-screen" style={{ backgroundColor: event.branding_secondary_color ?? '#ffffff', color: event.branding_text_color ?? '#1f2937' }}>
        <EventBrandedHeader event={event} />

        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-2xl">
            {/* Back button */}
            <Button variant="ghost" size="sm" className="mb-6" onClick={() => setStep("select")}>
              ← Back to Selection
            </Button>

            <h2 className="mb-2 text-3xl font-bold text-foreground">Complete Your Order</h2>
            <p className="mb-8 text-muted-foreground">
              {totalTickets} ticket{totalTickets > 1 ? "s" : ""} · {grandTotal.toFixed(2)} {currency} total
            </p>

            {/* Auth Choice */}
            <Tabs value={entryTab} onValueChange={setEntryTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="guest" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Quick Purchase
                </TabsTrigger>
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome Back</CardTitle>
                    <CardDescription>
                      Sign in to link this purchase to your account and access past orders.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="login_email">Email</Label>
                        <Input
                          id="login_email"
                          type="email"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="login_password">Password</Label>
                        <Input
                          id="login_password"
                          type="password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loginLoading}>
                        {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loginLoading ? "Logging In..." : "Sign In & Continue"}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Don't have an account?{" "}
                        <button type="button" className="text-primary underline" onClick={() => navigate(`/event/${slug}/auth`)}>
                          Create one here
                        </button>
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="guest" className="mt-6">
                {user && (
                  <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                    Signed in as <strong>{user.email}</strong>. Your purchase will be linked to your account.
                  </div>
                )}

                {!user && (
                  <div className="mb-4 rounded-lg border border-border bg-accent/5 px-4 py-3 text-sm text-muted-foreground">
                    Purchasing as a guest. You'll receive ticket links via email, but won't be able to view past purchases without an account.
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <form onSubmit={handleCheckout} className="space-y-8">
              {/* Group Attendee Details */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  Attendee Details
                  {totalTickets > 1 && (
                    <Badge variant="secondary" className="ml-2">{totalTickets} tickets</Badge>
                  )}
                </h3>

                <div className="space-y-4">
                  {attendees.map((att, idx) => {
                    // Find which tier this attendee slot belongs to
                    let tierLabel = "";
                    let counter = 0;
                    for (const item of ticketLineItems) {
                      for (let i = 0; i < item.quantity; i++) {
                        if (counter === idx) {
                          tierLabel = item.tier.name;
                        }
                        counter++;
                      }
                    }

                    return (
                      <Card key={idx} className="border-border">
                        <CardContent className="pt-4">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                              Ticket #{idx + 1}
                              {tierLabel && <span className="text-muted-foreground"> — {tierLabel}</span>}
                            </p>
                            {idx > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Leave blank to use primary attendee's name
                              </p>
                            )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <Label>First Name {idx === 0 && "*"}</Label>
                              <Input
                                value={att.first_name}
                                placeholder={idx === 0 ? "Required" : "Optional"}
                                onChange={(e) => {
                                  const updated = [...attendees];
                                  updated[idx] = { ...updated[idx], first_name: e.target.value };
                                  setAttendees(updated);
                                }}
                              />
                            </div>
                            <div>
                              <Label>Last Name {idx === 0 && "*"}</Label>
                              <Input
                                value={att.last_name}
                                placeholder={idx === 0 ? "Required" : "Optional"}
                                onChange={(e) => {
                                  const updated = [...attendees];
                                  updated[idx] = { ...updated[idx], last_name: e.target.value };
                                  setAttendees(updated);
                                }}
                              />
                            </div>
                            <div>
                              <Label>Email {idx === 0 && "*"}</Label>
                              <Input
                                type="email"
                                value={att.email}
                                placeholder={idx === 0 ? "Required" : "Optional"}
                                onChange={(e) => {
                                  const updated = [...attendees];
                                  updated[idx] = { ...updated[idx], email: e.target.value };
                                  setAttendees(updated);
                                  // Sync billing email from first attendee
                                  if (idx === 0) {
                                    setBilling((prev) => ({ ...prev, email: e.target.value }));
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Service Assignment (per attendee) */}
              {serviceLineItems.length > 0 && (
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Assign Services to Attendees
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Choose which attendee receives each service (e.g., Gala Dinner, Workshop).
                  </p>

                  <div className="space-y-4">
                    {serviceLineItems.map((item) => {
                      const assignments = serviceAssignments[item.service.id] ?? [];
                      return (
                        <Card key={item.service.id} className="border-border">
                          <CardContent className="pt-4">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="font-semibold text-foreground">{item.service.name}</p>
                              <Badge variant="secondary">
                                {item.quantity} × {item.service.price > 0 ? `${item.service.price.toFixed(2)} ${currency}` : "Free"}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {Array.from({ length: item.quantity }, (_, unitIdx) => {
                                const currentIdx = assignments[unitIdx] ?? 0;
                                return (
                                  <div key={unitIdx} className="flex items-center gap-3">
                                    <Label className="text-sm text-muted-foreground whitespace-nowrap min-w-[60px]">
                                      Unit {item.quantity > 1 ? `#${unitIdx + 1}` : ""}
                                    </Label>
                                    <select
                                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      value={currentIdx}
                                      onChange={(e) => {
                                        const newIdx = Number(e.target.value);
                                        setServiceAssignments((prev) => {
                                          const updated = { ...prev };
                                          const arr = [...(updated[item.service.id] ?? [])];
                                          arr[unitIdx] = newIdx;
                                          updated[item.service.id] = arr;
                                          return updated;
                                        });
                                      }}
                                    >
                                      {attendees.map((att, attIdx) => {
                                        const label = att.first_name || att.last_name
                                          ? `${att.first_name} ${att.last_name}`.trim()
                                          : `Attendee #${attIdx + 1}`;
                                        return (
                                          <option key={attIdx} value={attIdx}>
                                            {label}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Billing Information */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Billing Information
                </h3>

                <div className="mb-6">
                  <Label className="mb-3 block">Who is paying? *</Label>
                  <RadioGroup
                    value={billing.payer_type}
                    onValueChange={(v) => setBilling((p) => ({ ...p, payer_type: v as "individual" | "company" }))}
                    className="grid grid-cols-2 gap-4"
                  >
                    <label
                      htmlFor="type-individual"
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                        billing.payer_type === "individual"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <RadioGroupItem value="individual" id="type-individual" />
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium text-foreground">Individual</span>
                          <p className="text-xs text-muted-foreground">Pay with card via Stripe</p>
                        </div>
                      </div>
                    </label>
                    <label
                      htmlFor="type-company"
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                        billing.payer_type === "company"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <RadioGroupItem value="company" id="type-company" />
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium text-foreground">Company</span>
                          <p className="text-xs text-muted-foreground">Request an invoice</p>
                        </div>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="billing_email">Contact Email *</Label>
                    <Input
                      id="billing_email"
                      type="email"
                      value={billing.email}
                      onChange={(e) => setBilling((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billing_phone">Phone</Label>
                    <Input
                      id="billing_phone"
                      value={billing.phone}
                      onChange={(e) => setBilling((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billing_institution">Institution</Label>
                    <Input
                      id="billing_institution"
                      value={billing.institution}
                      onChange={(e) => setBilling((p) => ({ ...p, institution: e.target.value }))}
                    />
                  </div>
                </div>

                {billing.payer_type === "company" && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={billing.company_name}
                        onChange={(e) => setBilling((p) => ({ ...p, company_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payer_oib">OIB / VAT ID</Label>
                      <Input
                        id="payer_oib"
                        value={billing.payer_oib}
                        onChange={(e) => setBilling((p) => ({ ...p, payer_oib: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payer_address">Company Address</Label>
                      <Input
                        id="payer_address"
                        value={billing.payer_address}
                        onChange={(e) => setBilling((p) => ({ ...p, payer_address: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="po_number">Purchase Order (PO) Number</Label>
                      <Input
                        id="po_number"
                        value={billing.po_number}
                        onChange={(e) => setBilling((p) => ({ ...p, po_number: e.target.value }))}
                        placeholder="e.g. PO-2026-001"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="rounded-lg border border-border bg-secondary/50 p-5 space-y-3">
                <h4 className="font-semibold text-foreground">Order Summary</h4>
                {ticketLineItems.map((item) => (
                  <div key={item.tier.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.tier.name} × {item.quantity}
                    </span>
                    <span className="font-medium text-foreground">{item.subtotal.toFixed(2)} {currency}</span>
                  </div>
                ))}
                {serviceLineItems.map((item) => (
                  <div key={item.service.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.service.name} × {item.quantity}
                    </span>
                    <span className="font-medium text-foreground">{item.subtotal.toFixed(2)} {currency}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Grand Total</span>
                  <span className="text-2xl font-bold text-primary">{grandTotal.toFixed(2)} {currency}</span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full text-lg"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting
                  ? "Processing..."
                  : billing.payer_type === "company"
                    ? `Request Invoice — ${grandTotal.toFixed(2)} ${currency}`
                    : grandTotal > 0
                      ? `Pay ${grandTotal.toFixed(2)} ${currency}`
                      : "Complete Registration"}
              </Button>

              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  No account needed. You'll receive ticket links via email.
                </p>
              )}
            </form>
          </div>
        </section>
      </div>
    );
  }

  /* ─── STEP 1: Unified Selection ────────────────────── */

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader />
      <EventHero event={event} />

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          {/* Ticket Tiers */}
          <div className="mb-10">
            <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold text-foreground">
              <Ticket className="h-6 w-6 text-primary" />
              Select Tickets
            </h2>
            <p className="mb-6 text-muted-foreground">Choose the ticket type and quantity for your group.</p>

            <div className="space-y-3">
              {tiers.map((tier) => (
                <Card key={tier.id} className="border-border">
                  <CardContent className="flex items-center justify-between gap-4 py-5">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{tier.name}</h3>
                      {tier.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{tier.description}</p>
                      )}
                      <p className="mt-1 text-lg font-bold text-primary">
                        {tier.price > 0 ? `${tier.price.toFixed(2)} ${currency}` : "Free"}
                      </p>
                    </div>
                    <QuantitySelector
                      value={ticketSelections[tier.id] ?? 0}
                      onChange={(v) => setTicketSelections((prev) => ({ ...prev, [tier.id]: v }))}
                      max={tier.capacity ?? undefined}
                    />
                  </CardContent>
                </Card>
              ))}
              {tiers.length === 0 && (
                <p className="text-muted-foreground">No tickets available at this time.</p>
              )}
            </div>
          </div>

          {/* Additional Services */}
          {services.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold text-foreground">
                <ShoppingBag className="h-6 w-6 text-primary" />
                Additional Services
              </h2>
              <p className="mb-6 text-muted-foreground">
                Enhance your experience with workshops, dinners, and more.
              </p>

              <div className="space-y-3">
                {services.map((service) => (
                  <Card key={service.id} className="border-border">
                    <CardContent className="flex items-center justify-between gap-4 py-5">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                        )}
                        <p className="mt-1 text-lg font-bold text-primary">
                          {service.price > 0 ? `${service.price.toFixed(2)} ${currency}` : "Free"}
                        </p>
                      </div>
                      <QuantitySelector
                        value={serviceSelections[service.id] ?? 0}
                        onChange={(v) => setServiceSelections((prev) => ({ ...prev, [service.id]: v }))}
                        max={service.capacity ?? undefined}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sticky Order Summary Bar */}
          <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 backdrop-blur px-4 py-4">
            <div className="mx-auto flex max-w-2xl items-center justify-between">
              <div>
                {hasItems && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {totalTickets} ticket{totalTickets > 1 ? "s" : ""}
                      {serviceLineItems.length > 0 && ` + ${serviceLineItems.length} service${serviceLineItems.length > 1 ? "s" : ""}`}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {grandTotal > 0 ? `${grandTotal.toFixed(2)} ${currency}` : "Free"}
                    </p>
                  </>
                )}
                {!hasItems && (
                  <p className="text-muted-foreground">Select at least one ticket to continue</p>
                )}
              </div>
              <Button
                size="lg"
                className="text-lg gap-2"
                disabled={!hasItems}
                onClick={goToDetails}
              >
                Continue
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
