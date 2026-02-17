import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEvent, useTicketTiers } from "@/hooks/useEvent";
import { supabase } from "@/integrations/supabase/client";
import { EventHero } from "@/components/event/EventHero";
import { TicketTierCard } from "@/components/event/TicketTierCard";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { RegistrationSuccess } from "@/components/event/RegistrationSuccess";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Enums } from "@/integrations/supabase/types";

interface SuccessData {
  attendeeId: string;
  attendeeName: string;
  eventName: string;
  tierName: string;
  price: number;
  currency: string;
}

export default function EventRegister() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(slug ?? "");
  const { data: tiers = [] } = useTicketTiers(event?.id);

  const [profileLoading, setProfileLoading] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    institution: "",
    payer_name: "",
    payer_type: "individual" as "individual" | "company",
    payer_oib: "",
    payer_address: "",
  });

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/event/${slug}/auth`);
    }
  }, [authLoading, user, slug, navigate]);

  // Check for existing attendee + auto-fill from profile
  useEffect(() => {
    if (authLoading || eventLoading || !user || !event) return;

    const init = async () => {
      try {
        // Check for duplicate registration
        const { data: existing } = await supabase
          .from("attendees")
          .select("id")
          .eq("event_id", event.id)
          .eq("profile_id", user.id)
          .maybeSingle();

        if (existing) {
          toast({ title: "Already registered", description: "Redirecting to your dashboard." });
          navigate(`/event/${slug}/dashboard`);
          return;
        }

        // Auto-fill from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, phone, institution")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setForm((prev) => ({
            ...prev,
            first_name: profile.first_name ?? prev.first_name,
            last_name: profile.last_name ?? prev.last_name,
            email: profile.email ?? user.email ?? prev.email,
            phone: profile.phone ?? prev.phone,
            institution: profile.institution ?? prev.institution,
            payer_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || prev.payer_name,
          }));
        } else {
          setForm((prev) => ({ ...prev, email: user.email ?? prev.email }));
        }
      } catch (err: any) {
        toast({ title: "Error loading profile", description: err.message, variant: "destructive" });
      } finally {
        setProfileLoading(false);
      }
    };

    init();
  }, [authLoading, eventLoading, user, event, slug, navigate]);

  if (authLoading || eventLoading) return <EventPageSkeleton />;

  if (eventError || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Event Not Found</h1>
          <p className="mb-8 text-muted-foreground">The event you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
        </div>
      </div>
    );
  }

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
    if (!form.payer_name) {
      toast({ title: "Payer name is required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Create attendee
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
          profile_id: user!.id,
          status: "approved",
          payment_status: "paid",
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
          payer_name: form.payer_name,
          payer_type: form.payer_type as Enums<"payer_type">,
          payer_oib: form.payer_oib || null,
          payer_address: form.payer_address || null,
          status: "paid",
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

      setSuccess({
        attendeeId: attendee.id,
        attendeeName: `${form.first_name} ${form.last_name}`,
        eventName: event.name,
        tierName: selectedTier?.name ?? "Ticket",
        price: pricePaid,
        currency,
      });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Success view with QR code
  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <section className="container mx-auto flex min-h-screen items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="mb-2 text-3xl font-bold text-foreground">You're In!</h2>
            <p className="mb-6 text-muted-foreground">
              Your registration for <strong>{success.eventName}</strong> has been confirmed.
            </p>

            {/* QR Code */}
            <div className="mx-auto mb-6 inline-block rounded-xl border-2 border-primary/20 bg-card p-4">
              <QRCodeSVG value={success.attendeeId} size={192} level="H" includeMargin />
            </div>
            <p className="mb-6 text-xs text-muted-foreground">
              Ticket ID: {success.attendeeId.slice(0, 8)}...
            </p>

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
              </dl>
            </div>

            <Button onClick={() => navigate(`/event/${slug}/dashboard`)}>
              Go to My Dashboard
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EventHero event={event} />

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-3xl font-bold text-foreground">Complete Registration</h2>

          {profileLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
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
                {/* Attendee Info - auto-filled */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Your Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={form.first_name}
                        onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={form.last_name}
                        onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="payer_name">Payer Name *</Label>
                      <Input
                        id="payer_name"
                        value={form.payer_name}
                        onChange={(e) => setForm((p) => ({ ...p, payer_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Payer Type *</Label>
                      <Select
                        value={form.payer_type}
                        onValueChange={(v) => setForm((p) => ({ ...p, payer_type: v as "individual" | "company" }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="payer_oib">Payer OIB</Label>
                      <Input
                        id="payer_oib"
                        value={form.payer_oib}
                        onChange={(e) => setForm((p) => ({ ...p, payer_oib: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="payer_address">Payer Address</Label>
                      <Input
                        id="payer_address"
                        value={form.payer_address}
                        onChange={(e) => setForm((p) => ({ ...p, payer_address: e.target.value }))}
                      />
                    </div>
                  </div>
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
                  {submitting ? "Registering..." : "Complete Registration"}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}