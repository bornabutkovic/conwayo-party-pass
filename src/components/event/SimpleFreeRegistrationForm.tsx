import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import type { Event, TicketTier } from "@/hooks/useEvent";

type FieldKey = "first_name" | "last_name" | "email" | "phone" | "oib" | "institution" | "specialty";

const FIELD_DEFS: Record<FieldKey, { hr: string; en: string; type: string }> = {
  first_name: { hr: "Ime", en: "First Name", type: "text" },
  last_name: { hr: "Prezime", en: "Last Name", type: "text" },
  oib: { hr: "OIB", en: "Tax ID (OIB)", type: "text" },
  email: { hr: "E-mail", en: "Email", type: "email" },
  specialty: { hr: "Specijalnost", en: "Specialty", type: "text" },
  institution: { hr: "Ustanova", en: "Institution", type: "text" },
  phone: { hr: "Telefon", en: "Phone", type: "tel" },
};

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
function renderWithLinks(text: string) {
  return text.split(URL_REGEX).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{part}</a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface Props {
  event: Event;
  tier: TicketTier;
}

export function SimpleFreeRegistrationForm({ event, tier }: Props) {
  const { lang } = useLanguage();
  const supportsEnglish = ((event as any).supported_languages ?? ["hr"]).includes("en");
  const displayLang: "hr" | "en" = !supportsEnglish ? "hr" : lang === "en" ? "en" : "hr";
  const L = (hr: string, en: string) => (displayLang === "hr" ? hr : en);

  const fields = useMemo<FieldKey[]>(() => {
    const configured = ((event as any).required_attendee_fields ?? []).filter(
      (f: string): f is FieldKey => f in FIELD_DEFS
    );
    return configured.length > 0 ? configured : ["first_name", "last_name", "email"];
  }, [event]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const setField = (key: string, v: string) => setValues((p) => ({ ...p, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const key of fields) {
      if (!values[key]?.trim()) {
        toast({ title: L("Molimo popunite sva obavezna polja", "Please fill in all required fields"), variant: "destructive" });
        return;
      }
    }
    if ((event as any).custom_consent_text && !consentChecked) {
      toast({ title: L("Morate prihvatiti uvjete prije prijave", "You must accept the terms before registering"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const firstName = values.first_name ?? "";
      const lastName = values.last_name ?? "";
      const fullName = `${firstName} ${lastName}`.trim() || (values.email ?? "Attendee");

      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          event_id: event.id,
          payer_type: "individual",
          payer_name: fullName,
          lang: displayLang,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          gdpr_consent_given: true,
          gdpr_consent_at: new Date().toISOString(),
          attendees: [
            {
              first_name: firstName,
              last_name: lastName,
              email: values.email || "",
              phone: values.phone || null,
              ticket_tier_id: tier.id,
              oib: values.oib || null,
              institution: values.institution || null,
              specialty: values.specialty || null,
              services: [],
            },
          ],
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Registration failed");
      }

      setSuccess(true);
    } catch (err: any) {
      toast({ title: L("Prijava nije uspjela", "Registration failed"), description: err.message ?? "", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const eventName = event.name;
  const bannerUrl = (event as any).branding_banner_url;

  if (success) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ConvwayoHeader showBackToEvents />
        <div className="container mx-auto px-4 py-20 text-center max-w-lg">
          <h1 className="text-2xl font-bold mb-3">{L("Prijava zaprimljena!", "Registration received!")}</h1>
          <p className="text-muted-foreground">
            {L(`Hvala na prijavi. Potvrdu ćete dobiti na e-mail.`, `Thank you for registering. You'll receive a confirmation by email.`)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConvwayoHeader showBackToEvents />

      {bannerUrl && (
        <section
          className="relative w-full overflow-hidden"
          style={{ height: (event as any).branding_banner_height ?? 400, backgroundColor: (event as any).branding_primary_color ?? "#6366f1" }}
        >
          <img src={bannerUrl} alt={`${eventName} banner`} className="h-full w-full object-contain" />
        </section>
      )}

      <section className="container mx-auto px-4 py-10 max-w-2xl">
        {(event as any).branding_logo_url && (
          <img src={(event as any).branding_logo_url} alt={`${eventName} logo`} className="h-16 w-16 object-contain rounded-lg border border-border bg-white p-1 mb-4" />
        )}
        <h1 className="text-2xl font-bold mb-1">{eventName}</h1>
        <p className="text-muted-foreground mb-8">{L("Besplatna prijava", "Free registration")}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((key) => {
              const def = FIELD_DEFS[key];
              const wide = key === "email" || key === "institution" || key === "specialty";
              return (
                <div key={key} className={wide ? "sm:col-span-2" : undefined}>
                  <Label htmlFor={key}>{`${L(def.hr, def.en)} *`}</Label>
                  <Input id={key} type={def.type} value={values[key] ?? ""} onChange={(e) => setField(key, e.target.value)} />
                </div>
              );
            })}
          </div>

          {(event as any).custom_consent_text && (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
              <Checkbox id="consent" checked={consentChecked} onCheckedChange={(v) => setConsentChecked(v === true)} className="mt-0.5" />
              <Label htmlFor="consent" className="whitespace-pre-line text-xs font-normal text-muted-foreground leading-relaxed cursor-pointer">
                {renderWithLinks((event as any).custom_consent_text)}
              </Label>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full text-lg" disabled={submitting || (!!(event as any).custom_consent_text && !consentChecked)}>
            {submitting ? L("Slanje...", "Submitting...") : L("Pošalji", "Submit")}
          </Button>
        </form>
      </section>
    </div>
  );
}
