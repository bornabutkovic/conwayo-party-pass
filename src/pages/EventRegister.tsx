import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEvent, useTicketTiers } from "@/hooks/useEvent";
import { useEventServices } from "@/hooks/useEventServices";
import { supabase } from "@/integrations/supabase/client";
import { EventHero } from "@/components/event/EventHero";
import { EventPageSkeleton } from "@/components/event/EventPageSkeleton";
import { EventNotFound } from "@/components/event/EventNotFound";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, UserIcon, CreditCard, Plus, Minus, CheckCircle2, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { OrderConfirmation } from "@/components/event/OrderConfirmation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ── Country list & zone helper ──
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

interface AttendeeRow {
  firstName: string;
  lastName: string;
  email: string;
  tierId: string;
  tierName: string;
  selectedServiceIds: Set<string>;
}

interface SuccessAttendeeInfo {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  tierName: string;
  tierPrice: number;
  services: { name: string; price: number }[];
}

interface SuccessData {
  attendeeId: string;
  attendeeName: string;
  eventName: string;
  tierName: string;
  price: number;
  currency: string;
  payerType: "individual" | "company";
  allAttendees: SuccessAttendeeInfo[];
  totalAmount: number;
}

export default function EventRegister() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(slug ?? "");
  const { data: tiers = [] } = useTicketTiers(event?.id);
  const { data: services = [] } = useEventServices(event?.id);

  const [profileLoading, setProfileLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);
  const [invoiceSuccessMessage, setInvoiceSuccessMessage] = useState("");

  // Ticket quantities per tier
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});

  // Per-ticket attendee rows
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);

  // Contact phone (shared)
  const [contactPhone, setContactPhone] = useState("");

  // Billing form
  const [payerType, setPayerType] = useState<"individual" | "company">("individual");
  const [payerName, setPayerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyOib, setCompanyOib] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [poNumber, setPoNumber] = useState("");

  // Address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryCode, setCountryCode] = useState('HR');
  const [countryName, setCountryName] = useState('Croatia');
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Profile email for fallback
  const [profileEmail, setProfileEmail] = useState("");

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

  // No longer redirect unauthenticated users — guest checkout is allowed

  // Auto-fill from profile (only if logged in)
  useEffect(() => {
    if (authLoading || eventLoading || !event) return;

    // If not logged in, just stop loading
    if (!user) {
      setProfileLoading(false);
      return;
    }

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
          setPayerName(`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim());
          setContactPhone(profile.phone ?? "");
          setProfileEmail(profile.email ?? user.email ?? "");
          setAttendees(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            if (!updated[0].firstName && !updated[0].lastName) {
              updated[0] = {
                ...updated[0],
                firstName: profile.first_name ?? "",
                lastName: profile.last_name ?? "",
                email: profile.email ?? user.email ?? "",
              };
            }
            return updated;
          });
        } else {
          setProfileEmail(user.email ?? "");
        }
      } catch (err: any) {
        toast({ title: "Error loading profile", description: err.message, variant: "destructive" });
      } finally {
        setProfileLoading(false);
      }
    };

    init();
  }, [authLoading, eventLoading, user, event, slug, navigate]);

  // Rebuild attendee rows when ticket quantities change
  useEffect(() => {
    const newRows: AttendeeRow[] = [];
    for (const tier of tiers) {
      const qty = ticketQuantities[tier.id] ?? 0;
      for (let i = 0; i < qty; i++) {
        // Try to preserve existing data
        const existingIdx = newRows.length;
        const existing = attendees[existingIdx];
        if (existing && existing.tierId === tier.id) {
          newRows.push(existing);
        } else {
          newRows.push({ firstName: "", lastName: "", email: "", tierId: tier.id, tierName: tier.name, selectedServiceIds: new Set() });
        }
      }
    }
    setAttendees(newRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketQuantities, tiers]);

  // When first ticket is added and profile is loaded, pre-fill first attendee
  const profileLoadedRef = useRef(false);
  useEffect(() => {
    if (profileLoading || profileLoadedRef.current) return;
    profileLoadedRef.current = true;
  }, [profileLoading]);

  const totalTickets = useMemo(() =>
    Object.values(ticketQuantities).reduce((s, q) => s + q, 0),
    [ticketQuantities]
  );

  if (eventLoading) return <EventPageSkeleton />;
  if (eventError || !event) return <EventNotFound slug={slug} errorMessage={eventError?.message} />;

  const currency = event.currency ?? "EUR";

  const setTierQty = (tierId: string, delta: number) => {
    setTicketQuantities(prev => {
      const current = prev[tierId] ?? 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [tierId]: next };
    });
  };

  const updateAttendee = (index: number, field: keyof Pick<AttendeeRow, 'firstName' | 'lastName' | 'email'>, value: string) => {
    setAttendees(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleAttendeeService = (index: number, serviceId: string) => {
    setAttendees(prev => {
      const updated = [...prev];
      const newSet = new Set(updated[index].selectedServiceIds);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      updated[index] = { ...updated[index], selectedServiceIds: newSet };
      return updated;
    });
  };

  // Compute totals
  const ticketTotal = tiers.reduce((sum, tier) => {
    return sum + (tier.price ?? 0) * (ticketQuantities[tier.id] ?? 0);
  }, 0);
  const servicesTotal = attendees.reduce((sum, att) => {
    return sum + services
      .filter(s => att.selectedServiceIds.has(s.id))
      .reduce((s, svc) => s + Number(svc.price), 0);
  }, 0);
  const grandTotal = ticketTotal + servicesTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalTickets === 0) {
      toast({ title: "Please select at least one ticket", variant: "destructive" });
      return;
    }

    // Validate all attendees
    const incomplete = attendees.some(a => !a.firstName.trim() || !a.lastName.trim() || !a.email.trim());
    if (incomplete) {
      toast({ title: "Please fill in details for all attendees", description: "Every ticket requires a first name, last name, and email.", variant: "destructive" });
      return;
    }

    if (payerType === "individual" && !payerName.trim()) {
      toast({ title: "Payer name is required", variant: "destructive" });
      return;
    }
    if (payerType === "company" && !companyName.trim()) {
      toast({ title: "Company name is required for company billing", variant: "destructive" });
      return;
    }
    if (!street.trim() || !city.trim() || !postalCode.trim()) {
      toast({ title: "Please fill in your complete address (street, city, postal code).", variant: "destructive" });
      return;
    }
    if (!termsAccepted) {
      setTermsError(true);
      toast({ title: "Please accept the Terms of Purchase to continue.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          event_id: event.id,
          payer_type: payerType,
          attendees: attendees.map(a => ({
            first_name: a.firstName,
            last_name: a.lastName,
            email: a.email,
            phone: contactPhone || null,
            ticket_tier_id: a.tierId,
            services: Array.from(a.selectedServiceIds).map(sid => ({ service_id: sid, quantity: 1 })),
          })),
          payer_address: street,
          payer_city: city,
          payer_postal_code: postalCode,
          payer_country_code: countryCode,
          payer_country_name: countryName,
          payer_name: payerType === "company" ? companyName : payerName,
          company_name: payerType === "company" ? companyName : undefined,
          company_oib: payerType === "company" ? companyOib : undefined,
          billing_email: payerType === "company" ? (billingEmail || attendees[0]?.email) : attendees[0]?.email,
          po_number: payerType === "company" ? poNumber : undefined,
          profile_id: user?.id || null,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Registration failed");
      }

      if (payerType === "company") {
        // Company flow — call create-invoice-registration
        const { data: invoiceResult, error: invoiceError } = await supabase.functions.invoke(
          "create-invoice-registration",
          {
            body: {
              order_id: data.order_id,
              event_id: event.id,
              first_name: attendees[0]?.firstName,
              last_name: attendees[0]?.lastName,
              email: attendees[0]?.email,
              phone: contactPhone || null,
              profile_id: user?.id ?? null,
              company_name: companyName,
              company_oib: companyOib || null,
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
              payer_type: payerType,
              billing_email: billingEmail || attendees[0]?.email,
              po_number: poNumber || null,
              tickets: tiers
                .filter(t => (ticketQuantities[t.id] ?? 0) > 0)
                .map(t => ({ ticket_tier_id: t.id, quantity: ticketQuantities[t.id] })),
              services: [],
            },
          },
        );

        if (invoiceError || !invoiceResult?.success) {
          setInvoiceSuccessMessage("Invoice request received! Payment email could not be sent — please contact support.");
        } else {
          setInvoiceSuccessMessage("Quote created! Payment instructions have been sent to your email.");
        }
        // Build success data for invoice flow too
        const allAtts: SuccessAttendeeInfo[] = attendees.map(a => {
          const tier = tiers.find(t => t.id === a.tierId);
          return {
            firstName: a.firstName,
            lastName: a.lastName,
            email: a.email,
            tierName: a.tierName,
            tierPrice: tier?.price ?? 0,
            services: services.filter(s => a.selectedServiceIds.has(s.id)).map(s => ({ name: s.name, price: Number(s.price) })),
          };
        });
        setSuccess({
          attendeeId: data.primary_attendee_id,
          attendeeName: `${attendees[0]?.firstName} ${attendees[0]?.lastName}`,
          eventName: event.name,
          tierName: attendees[0]?.tierName ?? "Ticket",
          price: data.total_amount ?? grandTotal,
          currency,
          payerType,
          allAttendees: allAtts,
          totalAmount: data.total_amount ?? grandTotal,
        });
        setInvoiceSuccess(true);
        return;
      }

      const allAtts: SuccessAttendeeInfo[] = (data.attendee_ids || []).map((id: string, idx: number) => {
        const a = attendees[idx];
        const tier = tiers.find(t => t.id === a?.tierId);
        return {
          id,
          firstName: a?.firstName ?? "",
          lastName: a?.lastName ?? "",
          email: a?.email ?? "",
          tierName: a?.tierName ?? "Ticket",
          tierPrice: tier?.price ?? 0,
          services: a ? services.filter(s => a.selectedServiceIds.has(s.id)).map(s => ({ name: s.name, price: Number(s.price) })) : [],
        };
      });
      // Fallback if edge function doesn't return attendee_ids array
      if (allAtts.length === 0) {
        attendees.forEach(a => {
          const tier = tiers.find(t => t.id === a.tierId);
          allAtts.push({
            firstName: a.firstName,
            lastName: a.lastName,
            email: a.email,
            tierName: a.tierName,
            tierPrice: tier?.price ?? 0,
            services: services.filter(s => a.selectedServiceIds.has(s.id)).map(s => ({ name: s.name, price: Number(s.price) })),
          });
        });
      }
      const successData: SuccessData = {
        attendeeId: data.primary_attendee_id,
        attendeeName: `${attendees[0]?.firstName} ${attendees[0]?.lastName}`,
        eventName: event.name,
        tierName: attendees[0]?.tierName ?? "Ticket",
        price: data.total_amount ?? grandTotal,
        currency,
        payerType,
        allAttendees: allAtts,
        totalAmount: data.total_amount ?? grandTotal,
      };
      setSuccess(successData);
      await triggerStripeCheckout(data.primary_attendee_id);
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
        },
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
  if (invoiceSuccess && success) {
    return (
      <OrderConfirmation
        eventName={event.name}
        eventDate={event.start_date}
        eventEndDate={event.end_date}
        venueName={event.venue_name}
        locationCity={event.location_city}
        currency={currency}
        attendees={success.allAttendees}
        totalAmount={success.totalAmount}
        payerType="company"
        slug={slug!}
        invoiceMessage={invoiceSuccessMessage}
        paymentDueDays={event.payment_due_days}
        billingEmail={billingEmail || attendees[0]?.email}
        companyName={companyName}
      />
    );
  }

  // ── Success view (Stripe flow) ──
  if (success) {
    return (
      <OrderConfirmation
        eventName={event.name}
        eventDate={event.start_date}
        eventEndDate={event.end_date}
        venueName={event.venue_name}
        locationCity={event.location_city}
        currency={currency}
        attendees={success.allAttendees}
        totalAmount={success.totalAmount}
        payerType="individual"
        slug={slug!}
        redirectingToStripe={redirectingToStripe}
        onPayNow={() => triggerStripeCheckout()}
      />
    );
  }

  // ── Address fields block ──
  const addressFieldsBlock = (
    <div className="space-y-3 mt-3 sm:col-span-2">
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
          {/* Guest / Logged-in banner */}
          {!authLoading && !user && (
            <div className="mb-6 rounded-lg border border-border bg-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium">Already have an account?</p>
                <p className="text-xs text-muted-foreground">Or continue as guest below</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/event/${slug}/auth`}>
                  <LogIn className="mr-1.5 h-4 w-4" />
                  Log In
                </Link>
              </Button>
            </div>
          )}

          {!authLoading && user && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {(user.user_metadata?.first_name?.charAt(0) ?? user.email?.charAt(0) ?? "?").toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Logged in as {user.user_metadata?.first_name || user.email?.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          )}

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
              {/* ── Ticket Selection with Quantity ── */}
              <div className="mb-10">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Select Your Tickets</h3>
                <div className="space-y-3">
                  {tiers.map((tier) => {
                    const qty = ticketQuantities[tier.id] ?? 0;
                    return (
                      <div
                        key={tier.id}
                        className={`flex items-center justify-between rounded-lg border-2 p-4 transition-colors ${
                          qty > 0 ? "border-primary bg-primary/5" : "border-border bg-card"
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{tier.name}</p>
                          {tier.description && (
                            <p className="text-sm text-muted-foreground">{tier.description}</p>
                          )}
                          <p className="mt-1 text-sm font-semibold text-primary">
                            {tier.price > 0 ? `€${Number(tier.price).toFixed(2)}` : "Free"}
                          </p>
                          {tier.capacity !== null && (
                            <p className="text-xs text-muted-foreground">{tier.capacity} spots left</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setTierQty(tier.id, -1)}
                            disabled={qty === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium text-foreground">{qty}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setTierQty(tier.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {tiers.length === 0 && (
                    <p className="text-muted-foreground">No tickets available at this time.</p>
                  )}
                </div>
              </div>


              <form onSubmit={handleSubmit} className="space-y-8">
                {/* ── Per-Ticket Attendee Details ── */}
                {totalTickets > 0 && (
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-foreground">
                      Attendee Details
                      {totalTickets > 1 && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({totalTickets} tickets)
                        </span>
                      )}
                    </h3>
                    <div className="space-y-4">
                      {attendees.map((att, idx) => (
                        <div key={idx} className="rounded-lg border border-border bg-card p-4">
                          <p className="mb-3 text-sm font-medium text-primary">
                            Ticket #{idx + 1} — {att.tierName}
                          </p>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <Label className="text-xs">First Name *</Label>
                              <Input
                                value={att.firstName}
                                onChange={(e) => updateAttendee(idx, 'firstName', e.target.value)}
                                placeholder="First name"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Last Name *</Label>
                              <Input
                                value={att.lastName}
                                onChange={(e) => updateAttendee(idx, 'lastName', e.target.value)}
                                placeholder="Last name"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Email *</Label>
                              <Input
                                type="email"
                                value={att.email}
                                onChange={(e) => updateAttendee(idx, 'email', e.target.value)}
                                placeholder="email@example.com"
                              />
                            </div>
                          </div>

                          {/* Per-attendee services */}
                          {services.length > 0 && (
                            <div className="mt-4 border-t border-border pt-3">
                              <p className="mb-2 text-xs font-medium text-muted-foreground">Additional options for this attendee:</p>
                              <div className="space-y-2">
                                {services.map(svc => {
                                  const checked = att.selectedServiceIds.has(svc.id);
                                  return (
                                    <label
                                      key={svc.id}
                                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                                        checked ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleAttendeeService(idx, svc.id)}
                                        className="h-4 w-4 rounded border-input text-primary accent-primary"
                                      />
                                      <span className="flex-1 text-foreground">{svc.name}</span>
                                      <span className="font-medium text-primary">€{Number(svc.price).toFixed(2)}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Shared contact phone */}
                    <div className="mt-4 max-w-xs">
                      <Label>Contact Phone</Label>
                      <Input
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+385..."
                      />
                    </div>
                  </div>
                )}

                {/* ── Billing Information ── */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Billing Information</h3>

                  <div className="mb-6">
                    <Label className="mb-3 block">Who is paying? *</Label>
                    <RadioGroup
                      value={payerType}
                      onValueChange={(v) => setPayerType(v as "individual" | "company")}
                      className="grid grid-cols-2 gap-4"
                    >
                      <label
                        htmlFor="type-individual"
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                          payerType === "individual"
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
                          payerType === "company"
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
                      <Input id="payer_name" value={payerName} onChange={(e) => setPayerName(e.target.value)} />
                    </div>

                    {payerType === "individual" && addressFieldsBlock}

                    {payerType === "company" && (
                      <>
                        <div className="sm:col-span-2">
                          <Label htmlFor="company_name">Company Name *</Label>
                          <Input
                            id="company_name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Your company legal name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="payer_oib">
                            {countryCode === 'HR' ? 'OIB' : 'VAT ID'}{countryCode === 'HR' ? ' *' : ''}
                          </Label>
                          <Input
                            id="payer_oib"
                            value={companyOib}
                            onChange={(e) => setCompanyOib(e.target.value)}
                            placeholder={countryCode === 'HR' ? "e.g. 12345678901" : "e.g. DE123456789"}
                          />
                        </div>

                        {addressFieldsBlock}

                        <div>
                          <Label htmlFor="billing_email">Billing Email</Label>
                          <Input
                            id="billing_email"
                            type="email"
                            value={billingEmail}
                            onChange={(e) => setBillingEmail(e.target.value)}
                            placeholder="invoices@company.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="po_number">PO Number</Label>
                          <Input
                            id="po_number"
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Order Summary ── */}
                {totalTickets > 0 && (
                  <div className="rounded-lg border border-border bg-secondary/50 p-5 space-y-2">
                    {tiers
                      .filter(t => (ticketQuantities[t.id] ?? 0) > 0)
                      .map(tier => {
                        const qty = ticketQuantities[tier.id] ?? 0;
                        const subtotal = (tier.price ?? 0) * qty;
                        return (
                          <div key={tier.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-foreground">
                                {tier.name} × {qty}
                              </p>
                            </div>
                            <p className="text-lg font-bold text-primary">
                              {subtotal > 0 ? `${subtotal.toFixed(2)} ${currency}` : "Free"}
                            </p>
                          </div>
                        );
                      })}
                    {servicesTotal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Additional services</span>
                        <span className="font-medium text-foreground">{servicesTotal.toFixed(2)} {currency}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex items-center justify-between">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-2xl font-bold text-primary">{grandTotal.toFixed(2)} {currency}</span>
                    </div>
                  </div>
                )}

                {/* Terms & Conditions */}
                <div className="space-y-1">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        if (e.target.checked) setTermsError(false);
                      }}
                      className="mt-1 h-4 w-4 rounded border-input text-primary accent-primary"
                    />
                    <span className="text-sm text-muted-foreground">
                      I agree to the{" "}
                      <a
                        href={event.terms_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-primary/80"
                      >
                        Terms of Purchase
                      </a>{" "}
                      and Cancellation Policy
                      <br />
                      <span className="text-xs">(Slažem se s Uvjetima kupnje i Politikom povrata)</span>
                    </span>
                  </label>
                  {termsError && !termsAccepted && (
                    <p className="text-xs text-destructive ml-7">Please accept the Terms of Purchase to continue.</p>
                  )}
                </div>

                <Button type="submit" size="lg" className="w-full text-lg" disabled={submitting || totalTickets === 0 || !termsAccepted}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {submitting
                    ? "Processing..."
                    : payerType === "company"
                      ? `Request Invoice — ${grandTotal.toFixed(2)} ${currency}`
                      : `Register & Pay — ${grandTotal.toFixed(2)} ${currency}`}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
