import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketTierCard } from "./TicketTierCard";
import { RegistrationSuccess } from "./RegistrationSuccess";
import { toast } from "@/hooks/use-toast";
import type { Event, TicketTier } from "@/hooks/useEvent";
import type { Enums } from "@/integrations/supabase/types";

const registrationSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  oib: z.string().trim().max(20).optional().or(z.literal("")),
  institution: z.string().trim().max(200).optional().or(z.literal("")),
  payer_name: z.string().trim().min(1, "Payer name is required").max(200),
  payer_type: z.enum(["individual", "company"] as const),
  payer_oib: z.string().trim().max(20).optional().or(z.literal("")),
  payer_address: z.string().trim().max(300).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof registrationSchema>;

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
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      payer_type: "individual",
    },
  });

  const payerType = watch("payer_type");
  const currency = event.currency ?? "EUR";

  const selectedTier = tiers.find((t) => t.id === selectedTierId);

  const onSubmit = async (values: FormValues) => {
    if (!selectedTierId) {
      toast({ title: "Please select a ticket tier", variant: "destructive" });
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
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          phone: values.phone || null,
          oib: values.oib || null,
          institution: values.institution || null,
          payment_status: "paid",
          status: "approved",
        })
        .select("id, price_paid")
        .single();

      if (attError) throw attError;

      const pricePaid = attendee.price_paid ?? selectedTier?.price ?? 0;
      const vatRate = event.vat_rate ?? 25;
      const vatAmount = Number(((pricePaid * vatRate) / (100 + vatRate)).toFixed(2));

      // 2. Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          event_id: event.id,
          attendee_id: attendee.id,
          payer_name: values.payer_name,
          payer_type: values.payer_type as Enums<"payer_type">,
          payer_oib: values.payer_oib || null,
          payer_address: values.payer_address || null,
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
        attendeeName: `${values.first_name} ${values.last_name}`,
        eventName: event.name,
        tierName: selectedTier?.name ?? "Ticket",
        price: pricePaid,
        currency,
      });
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message ?? "Something went wrong",
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
        <h2 className="mb-8 text-3xl font-bold text-foreground">Register Now</h2>

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Attendee Info */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Your Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input id="first_name" {...register("first_name")} />
                {errors.first_name && <p className="mt-1 text-sm text-destructive">{errors.first_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input id="last_name" {...register("last_name")} />
                {errors.last_name && <p className="mt-1 text-sm text-destructive">{errors.last_name.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <div>
                <Label htmlFor="oib">OIB</Label>
                <Input id="oib" {...register("oib")} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" {...register("institution")} />
              </div>
            </div>
          </div>

          {/* Billing Info */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Billing Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="payer_name">Payer Name *</Label>
                <Input id="payer_name" {...register("payer_name")} />
                {errors.payer_name && <p className="mt-1 text-sm text-destructive">{errors.payer_name.message}</p>}
              </div>
              <div>
                <Label>Payer Type *</Label>
                <Select
                  value={payerType}
                  onValueChange={(v) => setValue("payer_type", v as "individual" | "company")}
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
                <Input id="payer_oib" {...register("payer_oib")} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="payer_address">Payer Address</Label>
                <Input id="payer_address" {...register("payer_address")} />
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
            className="relative w-full text-lg"
            disabled={submitting || !selectedTierId}
          >
            {submitting && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              </span>
            )}
            <span className={submitting ? "invisible" : ""}>
              Complete Registration
            </span>
          </Button>
        </form>
      </div>
    </section>
  );
}
