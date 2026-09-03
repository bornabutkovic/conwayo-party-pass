import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketTierCard } from "./TicketTierCard";
import { RegistrationSuccess } from "./RegistrationSuccess";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import type { Event, TicketTier } from "@/hooks/useEvent";
import type { Enums } from "@/integrations/supabase/types";

type AttendeeFieldKey =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "oib"
  | "institution"
  | "specialty";

const FIELD_DEFS: Record<
  AttendeeFieldKey,
  { hr: string; en: string; type: string; max: number }
> = {
  first_name: { hr: "Ime", en: "First Name", type: "text", max: 100 },
  last_name: { hr: "Prezime", en: "Last Name", type: "text", max: 100 },
  email: { hr: "E-mail", en: "Email", type: "email", max: 255 },
  phone: { hr: "Telefon", en: "Phone", type: "tel", max: 30 },
  oib: { hr: "OIB", en: "Tax ID (OIB)", type: "text", max: 20 },
  institution: { hr: "Ustanova", en: "Institution", type: "text", max: 200 },
  specialty: { hr: "Specijalnost", en: "Specialty", type: "text", max: 200 },
};

const DEFAULT_FIELDS: AttendeeFieldKey[] = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "oib",
  "institution",
];

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderWithLinks(text: string) {
  return text.split(URL_REGEX).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface RegistrationFormProps {
  event: Event;
  tiers: TicketTier[];
}

interface SuccessData {
  attendeeName: string;
  eventName: string;
  tierName: string;
  price: number;
  currency: string;
}

export function RegistrationForm({ event, tiers }: RegistrationFormProps) {
  const { lang } = useLanguage();
  const supportsEnglish = (event.supported_languages ?? ["hr"]).includes("en");
  const displayLang: "hr" | "en" = !supportsEnglish ? "hr" : lang === "en" ? "en" : "hr";
  const L = (hr: string, en: string) => (displayLang === "hr" ? hr : en);

  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const fields = useMemo<AttendeeFieldKey[]>(() => {
    const configured = (event.required_attendee_fields ?? []).filter(
      (f): f is AttendeeFieldKey => f in FIELD_DEFS
    );
    return configured.length > 0 ? configured : DEFAULT_FIELDS;
  }, [event.required_attendee_fields]);

  const selectedTier = tiers.find((t) => t.id === selectedTierId);
  const needsBilling = !!selectedTier && Number(selectedTier.price) > 0;

  const schema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const key of fields) {
      const def = FIELD_DEFS[key];
      let base = z.string().trim().min(1, L("Obavezno polje", "Required")).max(def.max);
      if (key === "email") {
        base = z
          .string()
          .trim()
          .min(1, L("Obavezno polje", "Required"))
          .email(L("Neispravan e-mail", "Invalid email"))
          .max(def.max);
      }
      shape[key] = base;
    }
    shape.payer_name = z.string().trim().max(200).optional().or(z.literal(""));
    shape.payer_type = z.enum(["individual", "company"] as const);
    shape.payer_oib = z.string().trim().max(20).optional().or(z.literal(""));
    shape.payer_address = z.string().trim().max(300).optional().or(z.literal(""));
    return z.object(shape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, displayLang]);

  type FormValues = Record<string, any>;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: { payer_type: "individual" },
  });

  const payerType = watch("payer_type");
  const currency = event.currency ?? "EUR";

  useEffect(() => {
    if (tiers.length === 1 && !selectedTierId) {
      setSelectedTierId(tiers[0].id);
    }
  }, [tiers, selectedTierId]);

  const onSubmit = async (values: FormValues) => {
    if (!selectedTierId) {
      toast({ title: L("Odaberite vrstu ulaznice", "Please select a ticket tier"), variant: "destructive" });
      return;
    }
    if (event.custom_consent_text && !consentChecked) {
      toast({ title: L("Morate prihvatiti uvjete prije prijave", "You must accept the terms before registering"), variant: "destructive" });
      return;
    }

    const firstName = values.first_name ?? "";
    const lastName = values.last_name ?? "";

    if (needsBilling && !String(values.payer_name ?? "").trim()) {
      toast({
        title: L("Ime platitelja je obavezno", "Payer name is required"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create attendee
      const { data: attendee, error: attError } = await supabase
        .from("attendees")
        .insert({
          event_id: event.id,
          ticket_tier_id: selectedTierId,
          first_name: firstName,
          last_name: lastName,
          email: values.email || null,
          phone: values.phone || null,
          oib: values.oib || null,
          institution: values.institution || null,
          specialty: values.specialty || null,
          payment_status: "paid",
          status: "approved",
        })
        .select("id, price_paid")
        .single();

      if (attError) throw attError;

      const pricePaid = attendee.price_paid ?? selectedTier?.price ?? 0;
      const vatRate = event.vat_rate ?? 25;
      const vatAmount = Number(((pricePaid * vatRate) / (100 + vatRate)).toFixed(2));

      const payerName = needsBilling
        ? String(values.payer_name).trim()
        : `${firstName} ${lastName}`.trim() || (values.email ?? "Attendee");
      const payerTypeValue = needsBilling ? values.payer_type : "individual";

      // 2. Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          event_id: event.id,
          attendee_id: attendee.id,
          payer_name: payerName,
          payer_type: payerTypeValue as Enums<"payer_type">,
          payer_oib: needsBilling ? values.payer_oib || null : null,
          payer_address: needsBilling ? values.payer_address || null : null,
          status: "paid",
          total_amount: pricePaid,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // 3. Create order item
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
        attendeeName: `${firstName} ${lastName}`.trim(),
        eventName: event.name,
        tierName: selectedTier?.name ?? "Ticket",
        price: pricePaid,
        currency,
      });
    } catch (err: any) {
      toast({
        title: L("Prijava nije uspjela", "Registration failed"),
        description: err.message ?? L("Nešto je pošlo po zlu", "Something went wrong"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return <RegistrationSuccess {...success} />;
  }

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-8 text-3xl font-bold text-foreground">
          {L("Prijavite se", "Register Now")}
        </h2>

        {/* Ticket Tiers */}
        {tiers.length > 1 && (
          <div className="mb-10">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {L("Odaberite ulaznicu", "Select Your Ticket")}
            </h3>
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
          </div>
        )}
        {tiers.length === 0 && (
          <p className="mb-10 text-muted-foreground">
            {L("Trenutno nema dostupnih ulaznica.", "No tickets available at this time.")}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Attendee Info */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {L("Vaši podaci", "Your Information")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((key) => {
                const def = FIELD_DEFS[key];
                const wide = key === "email" || key === "institution" || key === "specialty";
                const err = errors[key]?.message as string | undefined;
                return (
                  <div key={key} className={wide ? "sm:col-span-2" : undefined}>
                    <Label htmlFor={key}>{`${L(def.hr, def.en)} *`}</Label>
                    <Input id={key} type={def.type} {...register(key)} />
                    {err && <p className="mt-1 text-sm text-destructive">{err}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Billing Info */}
          {needsBilling && (
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                {L("Podaci za naplatu", "Billing Information")}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="payer_name">{L("Platitelj", "Payer Name")} *</Label>
                  <Input id="payer_name" {...register("payer_name")} />
                </div>
                <div>
                  <Label>{L("Vrsta platitelja", "Payer Type")} *</Label>
                  <Select
                    value={payerType}
                    onValueChange={(v) => setValue("payer_type", v as "individual" | "company")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">
                        {L("Fizička osoba", "Individual")}
                      </SelectItem>
                      <SelectItem value="company">{L("Pravna osoba", "Company")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payer_oib">{L("OIB platitelja", "Payer Tax ID")}</Label>
                  <Input id="payer_oib" {...register("payer_oib")} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="payer_address">{L("Adresa platitelja", "Payer Address")}</Label>
                  <Input id="payer_address" {...register("payer_address")} />
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedTier && (
            <div className="rounded-lg border border-border bg-secondary/50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{selectedTier.name}</p>
                  <p className="text-sm text-muted-foreground">{event.name}</p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {Number(selectedTier.price) > 0
                    ? `${selectedTier.price} ${currency}`
                    : L("Besplatno", "Free")}
                </p>
              </div>
            </div>
          )}

          {event.custom_consent_text && (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
              <Checkbox
                id="consent"
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="consent" className="whitespace-pre-line text-xs font-normal text-muted-foreground leading-relaxed cursor-pointer">
                {renderWithLinks(event.custom_consent_text)}
              </Label>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="relative w-full text-lg"
            disabled={submitting || !selectedTierId || (!!event.custom_consent_text && !consentChecked)}
          >
            {submitting && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              </span>
            )}
            <span className={submitting ? "invisible" : ""}>
              {L("Završi prijavu", "Complete Registration")}
            </span>
          </Button>
        </form>
      </div>
    </section>
  );
}
