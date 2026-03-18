import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEvent, useTicketTiers } from "@/hooks/useEvent";
import { useEventServices } from "@/hooks/useEventServices";
import { supabase } from "@/integrations/supabase/client";
import { EventHero } from "@/components/event/EventHero";
import { TicketTierCard } from "@/components/event/TicketTierCard";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, UserIcon, CreditCard, Plus, Minus, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Enums } from "@/integrations/supabase/types";

// ── CHANGE 1: Country list & zone helper ──
const EU_CODES = ['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'];

const COUNTRIES = [
  { code: 'HR', name: 'Croatia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LV', name: 'Latvia' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NO', name: 'Norway' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'RS', name: 'Serbia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'AL', name: 'Albania' },
  { code: 'TR', name: 'Turkey' },
  { code: 'RU', name: 'Russia' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'OTHER', name: 'Other' },
];

const getZone = (code: string) => {
  if (code === 'HR') return 'HR';
  if (EU_CODES.includes(code)) return 'EU';
  return 'INO';
};

interface SuccessData {
  attendeeId: string;
  attendeeName: string;
  eventName: string;
  tierName: string;
  price: number;
  currency: string;
  payerType: "individual" | "company";
}

export default function EventRegister() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(slug ?? "");
  const { data: tiers = [] } = useTicketTiers(event?.id);
  const { data: services = [] } = useEventServices(event?.id);

  const [profileLoading, setProfileLoading] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState("");
  const [ticketQty, setTicketQty] = useState(1);
  const [serviceQtys, setServiceQtys] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);
  const [invoiceSuccessMessage, setInvoiceSuccessMessage] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    institution: "",
    payer_name: "",
    payer_type: "individual" as "individual" | "company",
    payer_oib: "",
    company_name: "",
    billing_email: "",
    po_number: "",
  });

  // ── CHANGE 2: Address state variables ──
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryCode, setCountryCode] = useState('HR');
  const [countryName, setCountryName] = useState('Croatia');
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);

  const countryRef = useRef<HTMLDivElement>(null);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
        setCountrySearch('');
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    return <EventNotFound slug={slug} errorMessage={eventError?.message} />;
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
    if (form.payer_type === "company" && !form.company_name) {
      toast({ title: "Company name is required for company billing", variant: "destructive" });
      return;
    }

    // ── CHANGE 6: Address validation ──
    if (!street || !city || !postalCode || !countryCode) {
      toast({ title: "Please fill in all address fields.", variant: "destructive" });
      return;
    }

    const isCompany = form.payer_type === "company";

    // ── COMPANY / INVOICE FLOW ──
    if (isCompany) {
      setSubmitting(true);
      try {
        const pricePaid = selectedTier?.price ?? 0;
        const vatRate = event.vat_rate ?? 25;
        const ticketTotal = pricePaid * ticketQty;

        let svcTotal = 0;
        const selectedServices = Object.entries(serviceQtys)
          .filter(([, qty]) => qty > 0)
          .map(([sid, qty]) => {
            const svc = services.find((s) => s.id === sid);
            const linePrice = (svc?.price ?? 0) * qty;
            svcTotal += linePrice;
            return { service_id: sid, quantity: qty, svc };
          });
        const totalAmount = ticketTotal + svcTotal;

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
            profile_id: user?.id ?? null,
            status: "pending",
            payment_status: "pending",
          })
          .select("id")
          .single();

        if (attError) throw attError;

        // Create order
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            event_id: event.id,
            attendee_id: attendee.id,
            payer_name: form.company_name,
            payer_type: "company" as Enums<"payer_type">,
            payer_oib: form.payer_oib || null,
            payer_address: street || null,
            payer_city: city || null,
            payer_postal_code: postalCode || null,
            payer_country_code: countryCode || "HR",
            payer_country_name: countryName,
            billing_email: form.billing_email || form.email,
            contact_name: `${form.first_name} ${form.last_name}`,
            contact_email: form.email,
            contact_phone: form.phone || null,
            po_number: form.po_number || null,
            payment_method: "invoice",
            status: "draft",
            total_amount: totalAmount,
            is_group_order: ticketQty > 1,
          })
          .select("id, order_number")
          .single();

        if (orderError) throw orderError;

        // Create order items — tickets
        const orderItemsToInsert: Array<{
          order_id: string;
          attendee_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          vat_amount: number;
          price_at_purchase: number;
          ticket_type_id?: string;
          service_id?: string;
        }> = [];
        const ticketVat = Number(((ticketTotal * vatRate) / (100 + vatRate)).toFixed(2));
        orderItemsToInsert.push({
          order_id: order.id,
          attendee_id: attendee.id,
          ticket_type_id: selectedTierId,
          description: selectedTier?.name ?? "Ticket",
          quantity: ticketQty,
          unit_price: pricePaid,
          total_price: ticketTotal,
          vat_amount: ticketVat,
          price_at_purchase: pricePaid,
        });

        // Create order items — services
        for (const s of selectedServices) {
          const lineTotal = (s.svc?.price ?? 0) * s.quantity;
          const svcVat = Number(((lineTotal * vatRate) / (100 + vatRate)).toFixed(2));
          orderItemsToInsert.push({
            order_id: order.id,
            attendee_id: attendee.id,
            service_id: s.service_id,
            description: s.svc?.name ?? "Service",
            quantity: s.quantity,
            unit_price: s.svc?.price ?? 0,
            total_price: lineTotal,
            vat_amount: svcVat,
            price_at_purchase: s.svc?.price ?? 0,
          });
        }

        if (orderItemsToInsert.length > 0) {
          await supabase.from("order_items").insert(orderItemsToInsert);
        }

        // ── CHANGE 5: Invoice payload with address fields ──
        const { data: invoiceResult, error: invoiceError } = await supabase.functions.invoke(
          "create-invoice-registration",
          {
            body: {
              order_id: order.id,
              event_id: event.id,
              first_name: form.first_name,
              last_name: form.last_name,
              email: form.email,
              phone: form.phone || null,
              profile_id: user?.id ?? null,
              company_name: form.company_name,
              company_oib: form.payer_oib || null,
              payer_address: street,
              payer_city: city,
              payer_postal_code: postalCode,
              payer_country_code: countryCode,
              payer_country_name: countryName,
              bc_posting_zone: getZone(countryCode),
              company_address: street,
              company_city: city,
              company_postal_code: postalCode,
              company_country_code: countryCode,
              company_country_name: countryName,
              payer_type: form.payer_type,
              billing_email: form.billing_email || form.email,
              po_number: form.po_number || null,
              tickets: [{ ticket_tier_id: selectedTierId, quantity: ticketQty }]
                .filter((t) => t.quantity > 0),
              services: selectedServices
                .filter((s) => s.quantity > 0)
                .map((s) => ({ service_id: s.service_id, quantity: s.quantity })),
            },
          },
        );

        if (invoiceError || !invoiceResult?.success) {
          console.error("BC processing failed:", invoiceError || invoiceResult?.error);
          setInvoiceSuccessMessage(
            "Invoice request received! Payment email could not be sent — please contact support.",
          );
        } else {
          setInvoiceSuccessMessage(
            `Quote created! Payment instructions have been sent to your email.`,
          );
        }
        setInvoiceSuccess(true);
      } catch (err: any) {
        toast({
          title: "Something went wrong. Please try again or contact support.",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── INDIVIDUAL / STRIPE FLOW ──
    setSubmitting(true);
    try {
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
          payment_status: "pending",
        })
        .select("id, price_paid")
        .single();

      if (attError) throw attError;

      const pricePaid = attendee.price_paid ?? selectedTier?.price ?? 0;
      const vatRate = event.vat_rate ?? 25;
      const vatAmount = Number(((pricePaid * vatRate) / (100 + vatRate)).toFixed(2));

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          event_id: event.id,
          attendee_id: attendee.id,
          payer_name: form.payer_name,
          payer_type: form.payer_type as Enums<"payer_type">,
          payer_oib: form.payer_oib || null,
          payer_address: street || null,
          payer_city: city || null,
          payer_postal_code: postalCode || null,
          payer_country_code: countryCode || "HR",
          payer_country_name: countryName,
          billing_email: form.email,
          contact_name: `${form.first_name} ${form.last_name}`,
          contact_email: form.email,
          contact_phone: form.phone || null,
          payment_method: "stripe",
          status: "draft",
          total_amount: pricePaid,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

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

      if (pricePaid > 0) {
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // ── CHANGE 5: Stripe payload with address fields ──
      const res = await fetch(
        `https://yqusqfdaikkvvjflgmmh.supabase.co/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attendeeId: aid,
            eventId: event.id,
            slug,
            payer_address: street,
            payer_city: city,
            payer_postal_code: postalCode,
            payer_country_code: countryCode,
            payer_country_name: countryName,
            bc_posting_zone: getZone(countryCode),
          }),
        }
      );

      const result = await res.json();

      if (result.free) {
        toast({ title: "Free ticket activated!" });
        navigate(`/event/${slug}/dashboard`);
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

  // ── Invoice success view ──
  if (invoiceSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <section className="container mx-auto flex min-h-screen items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mb-2 text-3xl font-bold text-foreground">Invoice Request Received!</h2>
            <p className="mb-6 text-muted-foreground">
              {invoiceSuccessMessage || "Your invoice request has been received! A payment instruction will be sent to your email shortly."}
            </p>
            <Button onClick={() => navigate(`/event/${slug}`)}>
              Back to Event
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // Success view with QR code (individual/Stripe flow)
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
                  <dd>
                    <Badge variant="secondary">Pending</Badge>
                  </dd>
                </div>
              </dl>
            </div>

            {success.price > 0 ? (
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
                  onClick={() => navigate(`/event/${slug}/dashboard`)}
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <Button onClick={() => navigate(`/event/${slug}/dashboard`)}>
                Go to My Dashboard
              </Button>
            )}
          </div>
        </section>
      </div>
    );
  }

  // ── Compute total for company invoice button ──
  const ticketTotal = (selectedTier?.price ?? 0) * ticketQty;
  const servicesTotal = Object.entries(serviceQtys).reduce((sum, [sid, qty]) => {
    const svc = services.find((s) => s.id === sid);
    return sum + (svc?.price ?? 0) * qty;
  }, 0);
  const grandTotal = ticketTotal + servicesTotal;

  // ── CHANGE 3: Reusable address fields block ──
  const addressFieldsBlock = (
    <div className="space-y-3 mt-3 sm:col-span-2">
      {/* Street */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          Street Address <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={street}
          onChange={e => setStreet(e.target.value)}
          placeholder="Ulica i broj / Street and number"
          required
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {/* City + Postal Code */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            City <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Grad / City"
            required
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Postal Code <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={e => setPostalCode(e.target.value)}
            placeholder="Poštanski broj / ZIP"
            required
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      {/* Country Dropdown */}
      <div className="relative" ref={countryRef}>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          Country <span className="text-destructive">*</span>
        </label>
        <div
          className="w-full border border-input rounded-lg px-3 py-2 text-sm cursor-pointer flex justify-between items-center bg-background text-foreground"
          onClick={() => setCountryOpen(!countryOpen)}
        >
          <span>{countryName}</span>
          <span className="text-muted-foreground">▼</span>
        </div>
        {countryOpen && (
          <div className="absolute z-50 w-full bg-popover border border-border rounded-lg shadow-xl mt-1">
            <div className="p-2 border-b border-border sticky top-0 bg-popover">
              <input
                type="text"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                placeholder="Search country..."
                className="w-full border border-input rounded px-2 py-1 text-sm bg-background text-foreground focus:outline-none"
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {COUNTRIES.filter(c =>
                c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                c.code.toLowerCase().includes(countrySearch.toLowerCase())
              ).map(c => (
                <div
                  key={c.code}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${countryCode === c.code ? 'bg-accent/50 font-medium' : ''}`}
                  onClick={() => {
                    setCountryCode(c.code);
                    setCountryName(c.name);
                    setCountryOpen(false);
                    setCountrySearch('');
                  }}
                >
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

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

              {/* Ticket Quantity (company only) */}
              {form.payer_type === "company" && selectedTier && (
                <div className="mb-6 flex items-center gap-4">
                  <Label className="text-sm font-medium text-foreground">Ticket Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setTicketQty(Math.max(1, ticketQty - 1))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium text-foreground">{ticketQty}</span>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setTicketQty(ticketQty + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Additional Services */}
              {services.length > 0 && (
                <div className="mb-10">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Additional Services</h3>
                  <div className="space-y-3">
                    {services.map((svc) => {
                      const qty = serviceQtys[svc.id] ?? 0;
                      return (
                        <div
                          key={svc.id}
                          className={`flex items-center justify-between rounded-lg border-2 p-4 transition-colors ${
                            qty > 0 ? "border-primary bg-primary/5" : "border-border bg-card"
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{svc.name}</p>
                            {svc.description && (
                              <p className="text-sm text-muted-foreground">{svc.description}</p>
                            )}
                            <p className="mt-1 text-sm font-semibold text-primary">
                              €{Number(svc.price).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setServiceQtys((p) => ({ ...p, [svc.id]: Math.max(0, (p[svc.id] ?? 0) - 1) }))}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium text-foreground">{qty}</span>
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setServiceQtys((p) => ({ ...p, [svc.id]: (p[svc.id] ?? 0) + 1 }))}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Attendee Info */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Your Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input id="first_name" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input id="last_name" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="institution">Institution</Label>
                      <Input id="institution" value={form.institution} onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Billing Info */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Billing Information</h3>

                  {/* Payer Type Toggle */}
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="payer_name">Payer Name *</Label>
                      <Input id="payer_name" value={form.payer_name} onChange={(e) => setForm((p) => ({ ...p, payer_name: e.target.value }))} />
                    </div>

                    {/* ── INDIVIDUAL: address below email ── */}
                    {form.payer_type === "individual" && addressFieldsBlock}

                    {/* ── COMPANY FIELDS ── */}
                    {form.payer_type === "company" && (
                      <>
                        <div className="sm:col-span-2">
                          <Label htmlFor="company_name">Company Name *</Label>
                          <Input
                            id="company_name"
                            value={form.company_name}
                            onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                            placeholder="Your company legal name"
                          />
                        </div>
                        {/* CHANGE 4: Dynamic OIB/VAT label */}
                        <div>
                          <Label htmlFor="payer_oib">
                            {countryCode === 'HR' ? 'OIB' : 'VAT ID'}{countryCode === 'HR' ? ' *' : ''}
                          </Label>
                          <Input
                            id="payer_oib"
                            value={form.payer_oib}
                            onChange={(e) => setForm((p) => ({ ...p, payer_oib: e.target.value }))}
                            placeholder={countryCode === 'HR' ? "e.g. 12345678901" : "e.g. DE123456789"}
                          />
                        </div>

                        {addressFieldsBlock}

                        <div>
                          <Label htmlFor="billing_email">Billing Email</Label>
                          <Input
                            id="billing_email"
                            type="email"
                            value={form.billing_email}
                            onChange={(e) => setForm((p) => ({ ...p, billing_email: e.target.value }))}
                            placeholder="invoices@company.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="po_number">PO Number</Label>
                          <Input
                            id="po_number"
                            value={form.po_number}
                            onChange={(e) => setForm((p) => ({ ...p, po_number: e.target.value }))}
                            placeholder="Optional"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {selectedTier && (
                  <div className="rounded-lg border border-border bg-secondary/50 p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {selectedTier.name}
                          {form.payer_type === "company" && ticketQty > 1 ? ` × ${ticketQty}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">{event.name}</p>
                      </div>
                      <p className="text-xl font-bold text-primary">
                        {ticketTotal > 0 ? `${ticketTotal.toFixed(2)} ${currency}` : "Free"}
                      </p>
                    </div>
                    {Object.entries(serviceQtys)
                      .filter(([, qty]) => qty > 0)
                      .map(([sid, qty]) => {
                        const svc = services.find((s) => s.id === sid);
                        if (!svc) return null;
                        return (
                          <div key={sid} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{svc.name} × {qty}</span>
                            <span className="font-medium text-foreground">{(Number(svc.price) * qty).toFixed(2)} {currency}</span>
                          </div>
                        );
                      })}
                    {servicesTotal > 0 && (
                      <div className="border-t border-border pt-2 flex items-center justify-between">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-bold text-primary">{grandTotal.toFixed(2)} {currency}</span>
                      </div>
                    )}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full text-lg" disabled={submitting || !selectedTierId}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {submitting
                    ? "Processing..."
                    : form.payer_type === "company"
                      ? `Request Invoice — ${grandTotal.toFixed(2)} ${currency}`
                      : "Register & Pay"}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
