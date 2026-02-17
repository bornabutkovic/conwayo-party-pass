import { useState } from "react";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent, useTicketTiers } from "@/hooks/useEvent";
import { supabase } from "@/integrations/supabase/client";
import { EventHero } from "@/components/event/EventHero";
import { TicketTierCard } from "@/components/event/TicketTierCard";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, UserIcon, CreditCard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Enums } from "@/integrations/supabase/types";

interface SuccessData {
  attendeeId: string;
  attendeeName: string;
  eventName: string;
  tierName: string;
  price: number;
  currency: string;
  payerType: "individual" | "company";
}

export default function EventLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(slug ?? "");
  const { data: tiers = [] } = useTicketTiers(event?.id);

  const [selectedTierId, setSelectedTierId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    institution: "",
    payer_type: "individual" as "individual" | "company",
    company_name: "",
    payer_oib: "",
    payer_address: "",
    po_number: "",
  });

  if (isLoading) return <EventPageSkeleton />;
  if (error || !event) return <EventNotFound slug={slug} errorMessage={error?.message} />;

  const currency = event.currency ?? "EUR";
  const selectedTier = tiers.find((t) => t.id === selectedTierId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.first_name || !form.last_name || !form.email) {
      toast({ title: "First name, last name and email are required", variant: "destructive" });
      return;
    }
    if (!selectedTierId) {
      toast({ title: "Please select a ticket tier", variant: "destructive" });
      return;
    }
    if (form.payer_type === "company" && !form.company_name) {
      toast({ title: "Company name is required for company billing", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const isCompany = form.payer_type === "company";
      const payerName = isCompany ? form.company_name : `${form.first_name} ${form.last_name}`;

      // Check for duplicate by email + event
      const { data: existing } = await supabase
        .from("attendees")
        .select("id")
        .eq("event_id", event.id)
        .eq("email", form.email)
        .maybeSingle();

      if (existing) {
        toast({ title: "Already registered", description: "Redirecting to your ticket." });
        navigate(`/ticket/${existing.id}`);
        return;
      }

      // Create attendee (no profile_id needed)
      const { data: attendee, error: attError } = await supabase
        .from("attendees")
        .insert({
          event_id: event.id,
          ticket_tier_id: selectedTierId,
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone || null,
          institution: form.institution || null,
          status: "approved",
          payment_status: "pending",
        })
        .select("id, price_paid")
        .single();

      if (attError) throw attError;

      const pricePaid = attendee.price_paid ?? selectedTier?.price ?? 0;
      const vatRate = event.vat_rate ?? 25;
      const vatAmount = Number(((pricePaid * vatRate) / (100 + vatRate)).toFixed(2));

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          event_id: event.id,
          attendee_id: attendee.id,
          payer_name: payerName,
          payer_type: form.payer_type as Enums<"payer_type">,
          payer_oib: form.payer_oib || null,
          payer_address: form.payer_address || null,
          po_number: form.po_number || null,
          status: "draft",
          total_amount: pricePaid,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Create order item
      const { error: itemError } = await supabase.from("order_items").insert({
        order_id: order.id,
        attendee_id: attendee.id,
        ticket_type_id: selectedTierId,
        description: selectedTier?.name ?? "Ticket",
        quantity: 1,
        unit_price: pricePaid,
        total_price: pricePaid,
        vat_amount: vatAmount,
        price_at_purchase: pricePaid,
      });

      if (itemError) throw itemError;

      const successData: SuccessData = {
        attendeeId: attendee.id,
        attendeeName: `${form.first_name} ${form.last_name}`,
        eventName: event.name,
        tierName: selectedTier?.name ?? "Ticket",
        price: pricePaid,
        currency,
        payerType: form.payer_type,
      };

      // Send ticket email
      try {
        await fetch(
          `https://yqusqfdaikkvvjflgmmh.supabase.co/functions/v1/send-ticket-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdXNxZmRhaWtrdnZqZmxnbW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDMxNzYsImV4cCI6MjA4MjY3OTE3Nn0.nWRj48zSZxz5qUK_wkV3PKbkG969rdpsbQ8OAWdBESk`,
            },
            body: JSON.stringify({ attendeeId: attendee.id }),
          }
        );
      } catch {
        // Email sending is best-effort
      }

      // For individual payers with price > 0, redirect to Stripe
      if (!isCompany && pricePaid > 0) {
        setSuccess(successData);
        await triggerStripeCheckout(attendee.id);
      } else {
        setSuccess(successData);
      }
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const triggerStripeCheckout = async (attendeeId?: string) => {
    const aid = attendeeId || success?.attendeeId;
    if (!aid || !event) return;

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
            attendeeId: aid,
            eventId: event.id,
          }),
        }
      );

      const result = await res.json();

      if (result.free) {
        toast({ title: "Free ticket activated!" });
        navigate(`/ticket/${aid}`);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error || "Failed to create checkout session");
      }
    } catch (err: any) {
      toast({ title: "Payment redirect failed", description: err.message, variant: "destructive" });
    } finally {
      setRedirectingToStripe(false);
    }
  };

  // Success view
  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <ConvwayoHeader />
        <section className="container mx-auto flex min-h-screen items-center justify-center px-4 py-16">
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
                  We have sent your details to our accounting system (MS Business Central). You will receive an offer via email shortly.
                </p>
                <div className="mb-6 rounded-lg border border-border bg-accent/10 p-4 text-sm text-foreground">
                  <p>Your QR code will be available once payment is confirmed.</p>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-2 text-3xl font-bold text-foreground">Almost There!</h2>
                <p className="mb-6 text-muted-foreground">
                  Your registration for <strong>{success.eventName}</strong> is confirmed. Complete your payment to activate your ticket.
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

            {/* QR Code - blurred for pending */}
            <div className="relative mx-auto mb-6 inline-block rounded-xl border-2 border-primary/20 bg-card p-4">
              <div className="blur-md pointer-events-none select-none">
                <QRCodeSVG value={success.attendeeId} size={192} level="H" includeMargin />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-background/90 px-4 py-2 text-sm font-medium text-muted-foreground">
                  Waiting for payment
                </span>
              </div>
            </div>

            <div className="mb-8 rounded-lg border border-border bg-card p-6 text-left">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium text-foreground">{success.attendeeName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Ticket</dt>
                  <dd className="font-medium text-foreground">{success.tierName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-bold text-primary">
                    {success.price > 0 ? `${success.price} ${currency}` : "Free"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd><Badge variant="secondary">Pending</Badge></dd>
                </div>
              </dl>
            </div>

            <div className="mb-4 rounded-lg border border-border bg-accent/5 p-4 text-sm text-muted-foreground">
              A confirmation email with your ticket link has been sent to <strong className="text-foreground">{form.email}</strong>.
            </div>

            {success.payerType === "individual" && success.price > 0 ? (
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full text-lg"
                  onClick={() => triggerStripeCheckout()}
                  disabled={redirectingToStripe}
                >
                  {redirectingToStripe ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-5 w-5" />
                  )}
                  {redirectingToStripe ? "Redirecting..." : "PAY NOW"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/ticket/${success.attendeeId}`)}
                >
                  View My Ticket
                </Button>
              </div>
            ) : (
              <Button onClick={() => navigate(`/ticket/${success.attendeeId}`)}>
                View My Ticket
              </Button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ConvwayoHeader />
      <EventHero event={event} />

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-3xl font-bold text-foreground">Register for Event</h2>

          {/* Ticket Tiers */}
          <div className="mb-10">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Select Your Ticket</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {tiers.map((tier) => (
                <TicketTierCard
                  key={tier.id}
                  tier={tier}
                  selected={selectedTierId === tier.id}
                  currency={currency}
                  onSelect={() => setSelectedTierId(tier.id)}
                />
              ))}
            </div>
            {tiers.length === 0 && (
              <p className="text-muted-foreground">No tickets available at this time.</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Attendee Info */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">Your Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="institution">Institution</Label>
                  <Input
                    id="institution"
                    value={form.institution}
                    onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Billing Info */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">Billing Information</h3>

              <div className="mb-6">
                <Label className="mb-3 block">Who is paying? *</Label>
                <RadioGroup
                  value={form.payer_type}
                  onValueChange={(v) => setForm((p) => ({ ...p, payer_type: v as "individual" | "company" }))}
                  className="grid grid-cols-2 gap-4"
                >
                  <label
                    htmlFor="type-individual"
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                      form.payer_type === "individual"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem value="individual" id="type-individual" />
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">Individual</span>
                    </div>
                  </label>
                  <label
                    htmlFor="type-company"
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                      form.payer_type === "company"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem value="company" id="type-company" />
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">Company</span>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {form.payer_type === "company" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={form.company_name}
                      onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                      placeholder="Your company legal name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payer_oib">OIB / VAT ID *</Label>
                    <Input
                      id="payer_oib"
                      value={form.payer_oib}
                      onChange={(e) => setForm((p) => ({ ...p, payer_oib: e.target.value }))}
                      placeholder="e.g. 12345678901"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payer_address">Company Address</Label>
                    <Input
                      id="payer_address"
                      value={form.payer_address}
                      onChange={(e) => setForm((p) => ({ ...p, payer_address: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="po_number">Purchase Order (PO) Number</Label>
                    <Input
                      id="po_number"
                      value={form.po_number}
                      onChange={(e) => setForm((p) => ({ ...p, po_number: e.target.value }))}
                      placeholder="e.g. PO-2026-001"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            {selectedTier && (
              <div className="rounded-lg border border-border bg-secondary/50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{selectedTier.name}</p>
                    <p className="text-sm text-muted-foreground">{event.name}</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {selectedTier.price > 0 ? `${selectedTier.price} ${currency}` : "Free"}
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full text-lg"
              disabled={submitting || !selectedTierId}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting
                ? "Registering..."
                : form.payer_type === "company"
                  ? "Register & Request Invoice"
                  : "Register & Pay"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
