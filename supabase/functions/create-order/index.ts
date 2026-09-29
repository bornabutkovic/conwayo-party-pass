import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AttendeeInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  ticket_tier_id: string;
  services?: Array<{ service_id: string; quantity: number }>;
  oib?: string | null;
  institution?: string | null;
  specialty?: string | null;
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const r2 = (n: number) => Math.round(n * 100) / 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const xff = req.headers.get("x-forwarded-for");
    const callerIp =
      (xff ? xff.split(",")[0].trim() : null) ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;

    const body = await req.json();
    console.log("[create-order] Full request body:", JSON.stringify(body));

    const {
      event_id,
      attendees: attendeesInput,
      profile_id,
      payer_type,
      payer_name,
      payer_address,
      payer_city,
      payer_postal_code,
      payer_country_code,
      payer_country_name,
      company_name,
      company_oib,
      billing_email,
      po_number,
      payment_method,
      lang,
      terms_accepted,
      terms_accepted_at,
      gdpr_consent_given,
      gdpr_consent_at,
    } = body;
    const discountCodeInput: string | null =
      (body.discount_code ?? body.discountCode ?? body.promo_code ?? null) || null;

    const attendeesList: AttendeeInput[] = attendeesInput || [];

    if (!event_id) return json({ success: false, error: "Missing event_id" }, 400);
    if (attendeesList.length === 0) return json({ success: false, error: "At least one attendee is required" }, 400);

    for (let i = 0; i < attendeesList.length; i++) {
      const a = attendeesList[i];
      if (!a.first_name?.trim() || !a.last_name?.trim() || !a.email?.trim()) {
        return json({ success: false, error: `Attendee ${i + 1} is missing first_name, last_name, or email` }, 400);
      }
      if (!a.ticket_tier_id) {
        return json({ success: false, error: `Attendee ${i + 1} is missing ticket_tier_id` }, 400);
      }
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, vat_rate, currency")
      .eq("id", event_id)
      .single();
    if (eventError || !event) return json({ success: false, error: "Event not found" }, 404);

    const vatRate = event.vat_rate ?? 25;
    const isCompany = payer_type === "company";

    const allTierIds = [...new Set(attendeesList.map(a => a.ticket_tier_id))];
    const allServiceIds = [...new Set(attendeesList.flatMap(a => (a.services || []).map(s => s.service_id)))];

    const { data: tierData } = await supabase
      .from("ticket_tiers")
      .select("id, name, price, erp_code, sales_start, sales_end")
      .in("id", allTierIds);
    const tierMap = new Map((tierData ?? []).map(t => [t.id, t]));

    const now = new Date();
    for (const tierId of allTierIds) {
      const tier = tierMap.get(tierId);
      if (!tier) return json({ success: false, error: "Invalid ticket tier" }, 400);
      const start = tier.sales_start ? new Date(tier.sales_start) : null;
      const end = tier.sales_end ? new Date(tier.sales_end) : null;
      if ((start && now < start) || (end && now > end)) {
        return json({ success: false, error: `Ticket tier "${tier.name}" is no longer available for purchase` }, 400);
      }
    }

    let serviceMap = new Map<string, { id: string; name: string; price: number; erp_code: string | null }>();
    if (allServiceIds.length > 0) {
      const { data: svcData } = await supabase
        .from("event_services")
        .select("id, name, price, erp_code")
        .in("id", allServiceIds);
      serviceMap = new Map((svcData ?? []).map(s => [s.id, s]));
    }

    let discount: {
      id: string; type: string; value: number;
      allTickets: boolean; allServices: boolean;
      tierIds: string[]; serviceIds: string[];
    } | null = null;

    if (discountCodeInput && String(discountCodeInput).trim()) {
      const { data: vRows, error: vErr } = await supabase.rpc("validate_discount_code", {
        p_event_id: event_id,
        p_code: String(discountCodeInput),
      });
      const v = Array.isArray(vRows) ? vRows[0] : vRows;
      if (vErr || !v || !v.valid) {
        console.error("[create-order] Invalid discount code:", discountCodeInput, vErr, v?.reason);
        return json({ success: false, error: "Kod za popust nije valjan", reason: v?.reason ?? "invalid" }, 400);
      }
      discount = {
        id: v.discount_code_id,
        type: v.discount_type,
        value: Number(v.discount_value),
        allTickets: !!v.applies_to_all_tickets,
        allServices: !!v.applies_to_all_services,
        tierIds: v.target_ticket_tier_ids ?? [],
        serviceIds: v.target_event_service_ids ?? [],
      };
    }

    const unitDiscount = (price: number): number => {
      if (!discount || price <= 0) return 0;
      if (discount.type === "percentage") return r2(Math.min(price, (price * discount.value) / 100));
      return r2(Math.min(price, discount.value));
    };
    const tierEligible = (tierId: string) => !!discount && (discount.allTickets || discount.tierIds.includes(tierId));
    const serviceEligible = (svcId: string) => !!discount && (discount.allServices || discount.serviceIds.includes(svcId));

    type Line = {
      attIdx: number; kind: "ticket" | "service"; refId: string; description: string;
      quantity: number; listUnit: number; netUnit: number; discountAmount: number; erp_code: string | null;
    };
    const lines: Line[] = [];
    let discountApplied = false;

    attendeesList.forEach((att, idx) => {
      const tier = tierMap.get(att.ticket_tier_id)!;
      const listUnit = Number(tier.price ?? 0);
      const d = tierEligible(att.ticket_tier_id) ? unitDiscount(listUnit) : 0;
      if (d > 0) discountApplied = true;
      lines.push({
        attIdx: idx, kind: "ticket", refId: att.ticket_tier_id, description: tier.name ?? "Ticket",
        quantity: 1, listUnit, netUnit: r2(listUnit - d), discountAmount: d, erp_code: tier.erp_code || null,
      });
      for (const svc of (att.services || [])) {
        const service = serviceMap.get(svc.service_id);
        const sList = Number(service?.price ?? 0);
        const qty = svc.quantity || 1;
        const sd = serviceEligible(svc.service_id) ? unitDiscount(sList) : 0;
        if (sd > 0) discountApplied = true;
        lines.push({
          attIdx: idx, kind: "service", refId: svc.service_id, description: service?.name ?? "Service",
          quantity: qty, listUnit: sList, netUnit: r2(sList - sd), discountAmount: r2(sd * qty),
          erp_code: service?.erp_code || null,
        });
      }
    });

    if (discount && !discountApplied) {
      return json({ success: false, error: "Kod za popust ne vrijedi za odabrane ulaznice", reason: "not_applicable" }, 400);
    }

    const totalAmount = r2(lines.reduce((s, l) => s + l.netUnit * l.quantity, 0));
    const isFree = totalAmount <= 0;
    console.log("[create-order] Total:", totalAmount, "Discount:", discount?.id ?? "none", "Free:", isFree);

    const primary = attendeesList[0];
    const primaryPhone = primary.phone || null;
    const attendeeIds: string[] = [];
    for (let i = 0; i < attendeesList.length; i++) {
      const att = attendeesList[i];
      const ticketLine = lines.find(l => l.attIdx === i && l.kind === "ticket")!;
      const { data: createdAtt, error: attError } = await supabase
        .from("attendees")
        .insert({
          event_id,
          ticket_tier_id: att.ticket_tier_id,
          first_name: att.first_name,
          last_name: att.last_name,
          email: att.email,
          phone: att.phone || primaryPhone,
          profile_id: attendeeIds.length === 0 ? (profile_id || null) : null,
          oib: att.oib || null,
          institution: isCompany ? (company_name || null) : (att.institution || null),
          specialty: att.specialty || null,
          status: isFree ? "approved" : (isCompany && payment_method !== "stripe" ? "pending" : "approved"),
          payment_status: "pending",
          price_paid: ticketLine.netUnit,
        })
        .select("id")
        .single();
      if (attError) throw attError;
      attendeeIds.push(createdAtt.id);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id,
        attendee_id: attendeeIds[0],
        payer_name: payer_name || (isCompany ? company_name : `${primary.first_name} ${primary.last_name}`),
        payer_type: payer_type || "individual",
        payer_oib: company_oib || null,
        payer_address: payer_address || null,
        payer_city: payer_city || null,
        payer_postal_code: payer_postal_code || null,
        payer_country_code: payer_country_code || "HR",
        payer_country_name: payer_country_name || "Croatia",
        billing_email: billing_email || primary.email,
        contact_name: `${primary.first_name} ${primary.last_name}`,
        contact_email: primary.email,
        contact_phone: primaryPhone,
        po_number: po_number || null,
        payment_method: isFree ? "free" : (payment_method || (isCompany ? "invoice" : "stripe")),
        lang: lang === "en" ? "en" : "hr",
        status: "draft",
        total_amount: totalAmount,
        is_group_order: attendeesList.length > 1,
        terms_accepted: terms_accepted ?? false,
        terms_accepted_at: terms_accepted_at || null,
        gdpr_consent_given: gdpr_consent_given ?? false,
        gdpr_consent_at: gdpr_consent_at || null,
        terms_ip: callerIp,
      })
      .select("id, order_number")
      .single();
    if (orderError) throw orderError;

    const orderItems = lines.map(l => {
      const lineTotal = r2(l.netUnit * l.quantity);
      const vat = Number(((lineTotal * vatRate) / (100 + vatRate)).toFixed(2));
      const eligible = l.discountAmount > 0;
      return {
        order_id: order.id,
        attendee_id: attendeeIds[l.attIdx],
        ticket_type_id: l.kind === "ticket" ? l.refId : null,
        service_id: l.kind === "service" ? l.refId : null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.netUnit,
        total_price: lineTotal,
        vat_amount: vat,
        price_at_purchase: l.listUnit,
        erp_code: l.erp_code,
        item_type: l.kind,
        discount_code_id: eligible ? discount!.id : null,
        discount_amount: eligible ? l.discountAmount : 0,
      };
    });

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    if (discount) {
      const { error: incErr } = await supabase.rpc("increment_discount_code_usage", { p_discount_code_id: discount.id });
      if (incErr) console.error("[create-order] increment usage failed:", incErr);
    }

    if (isFree) {
      const { error: paidErr } = await supabase.from("orders").update({ status: "paid" }).eq("id", order.id);
      if (paidErr) console.error("[create-order] Failed to mark free order paid:", paidErr);
    }

    console.log("[create-order] Success. Order:", order.id, "Items:", orderItems.length);

    return json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      primary_attendee_id: attendeeIds[0],
      attendee_ids: attendeeIds,
      total_amount: totalAmount,
      discount_applied: !!discount,
      free: isFree,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : (typeof err === "object" ? JSON.stringify(err) : String(err));
    console.error("[create-order] Unhandled error:", message);
    return json({ success: false, error: message }, 500);
  }
});
