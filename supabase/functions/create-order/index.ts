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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
      terms_accepted,
      terms_accepted_at,
    } = body;

    // ── Validate ──
    const attendeesList: AttendeeInput[] = attendeesInput || [];

    if (!event_id) {
      console.error("[create-order] Missing event_id");
      return new Response(
        JSON.stringify({ success: false, error: "Missing event_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (attendeesList.length === 0) {
      console.error("[create-order] No attendees provided");
      return new Response(
        JSON.stringify({ success: false, error: "At least one attendee is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate each attendee
    for (let i = 0; i < attendeesList.length; i++) {
      const a = attendeesList[i];
      if (!a.first_name?.trim() || !a.last_name?.trim() || !a.email?.trim()) {
        console.error(`[create-order] Attendee ${i} missing required fields:`, JSON.stringify(a));
        return new Response(
          JSON.stringify({ success: false, error: `Attendee ${i + 1} is missing first_name, last_name, or email` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!a.ticket_tier_id) {
        console.error(`[create-order] Attendee ${i} missing ticket_tier_id`);
        return new Response(
          JSON.stringify({ success: false, error: `Attendee ${i + 1} is missing ticket_tier_id` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── Get event details ──
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, vat_rate, currency")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      console.error("[create-order] Event not found:", eventError);
      return new Response(
        JSON.stringify({ success: false, error: "Event not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const vatRate = event.vat_rate ?? 25;
    const isCompany = payer_type === "company";

    // ── Collect unique tier IDs and service IDs ──
    const allTierIds = [...new Set(attendeesList.map(a => a.ticket_tier_id))];
    const allServiceIds = [...new Set(
      attendeesList.flatMap(a => (a.services || []).map(s => s.service_id))
    )];

    // Fetch tier prices
    const { data: tierData } = await supabase
      .from("ticket_tiers")
      .select("id, name, price, erp_code")
      .in("id", allTierIds);
    const tierMap = new Map((tierData ?? []).map(t => [t.id, t]));

    // Fetch service prices
    let serviceMap = new Map<string, { id: string; name: string; price: number; erp_code: string | null }>();
    if (allServiceIds.length > 0) {
      const { data: svcData } = await supabase
        .from("event_services")
        .select("id, name, price, erp_code")
        .in("id", allServiceIds);
      serviceMap = new Map((svcData ?? []).map(s => [s.id, s]));
    }

    // ── Calculate total ──
    let totalAmount = 0;
    for (const att of attendeesList) {
      const tier = tierMap.get(att.ticket_tier_id);
      totalAmount += tier?.price ?? 0;
      for (const svc of (att.services || [])) {
        const service = serviceMap.get(svc.service_id);
        totalAmount += (service?.price ?? 0) * (svc.quantity || 1);
      }
    }

    console.log("[create-order] Total amount:", totalAmount, "Attendees:", attendeesList.length);

    // ── Primary attendee info ──
    const primary = attendeesList[0];
    const primaryPhone = primary.phone || null;

    // ── Create all attendees ──
    const attendeeIds: string[] = [];
    for (const att of attendeesList) {
      const tier = tierMap.get(att.ticket_tier_id);
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
          institution: isCompany ? (company_name || null) : null,
          status: isCompany && payment_method !== "stripe" ? "pending" : "approved",
          payment_status: "pending",
          price_paid: tier?.price ?? 0,
        })
        .select("id")
        .single();

      if (attError) {
        console.error("[create-order] Failed to create attendee:", attError);
        throw attError;
      }
      attendeeIds.push(createdAtt.id);
    }

    const primaryAttendeeId = attendeeIds[0];

    // ── Create order ──
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id,
        attendee_id: primaryAttendeeId,
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
        payment_method: payment_method || (isCompany ? "invoice" : "stripe"),
        status: "draft",
        total_amount: totalAmount,
        is_group_order: attendeesList.length > 1,
        terms_accepted: terms_accepted ?? false,
        terms_accepted_at: terms_accepted_at || null,
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("[create-order] Failed to create order:", orderError);
      throw orderError;
    }

    console.log("[create-order] Order created:", order.id, "Order#", order.order_number);

    // ── Create order items ──
    const orderItems: Array<Record<string, unknown>> = [];

    for (let i = 0; i < attendeesList.length; i++) {
      const att = attendeesList[i];
      const attId = attendeeIds[i];
      const tier = tierMap.get(att.ticket_tier_id);
      const tierPrice = tier?.price ?? 0;
      const ticketVat = Number(((tierPrice * vatRate) / (100 + vatRate)).toFixed(2));

      // Ticket item
      orderItems.push({
        order_id: order.id,
        attendee_id: attId,
        ticket_type_id: att.ticket_tier_id,
        description: tier?.name ?? "Ticket",
        quantity: 1,
        unit_price: tierPrice,
        total_price: tierPrice,
        vat_amount: ticketVat,
        price_at_purchase: tierPrice,
        erp_code: tier?.erp_code || null,
        item_type: "ticket",
      });

      // Service items for this attendee
      for (const svc of (att.services || [])) {
        const service = serviceMap.get(svc.service_id);
        const svcPrice = service?.price ?? 0;
        const svcQty = svc.quantity || 1;
        const svcTotal = svcPrice * svcQty;
        const svcVat = Number(((svcTotal * vatRate) / (100 + vatRate)).toFixed(2));

        orderItems.push({
          order_id: order.id,
          attendee_id: attId,
          service_id: svc.service_id,
          description: service?.name ?? "Service",
          quantity: svcQty,
          unit_price: svcPrice,
          total_price: svcTotal,
          vat_amount: svcVat,
          price_at_purchase: svcPrice,
          erp_code: service?.erp_code || null,
          item_type: "service",
        });
      }
    }

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        console.error("[create-order] Failed to create order items:", itemsError);
        throw itemsError;
      }
    }

    console.log("[create-order] Success. Order:", order.id, "Attendees:", attendeeIds.length, "Items:", orderItems.length);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        primary_attendee_id: primaryAttendeeId,
        attendee_ids: attendeeIds,
        total_amount: totalAmount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-order] Unhandled error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});