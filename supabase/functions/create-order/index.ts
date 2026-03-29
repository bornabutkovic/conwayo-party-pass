import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const {
      event_id,
      first_name,
      last_name,
      email,
      phone,
      institution,
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
      tickets = [],
      services = [],
    } = body;

    // Validate required fields
    if (!event_id || !first_name || !last_name || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields (event_id, first_name, last_name, email)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!tickets.length) {
      return new Response(
        JSON.stringify({ success: false, error: "At least one ticket is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, vat_rate, currency")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ success: false, error: "Event not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const vatRate = event.vat_rate ?? 25;
    const isCompany = payer_type === "company";

    // Get ticket tier prices
    const ticketTierIds = tickets.map((t: { ticket_tier_id: string }) => t.ticket_tier_id);
    const { data: tierData } = await supabase
      .from("ticket_tiers")
      .select("id, name, price")
      .in("id", ticketTierIds);

    const tierMap = new Map((tierData ?? []).map((t: { id: string; name: string; price: number }) => [t.id, t]));

    // Get service prices
    const serviceIds = services.map((s: { service_id: string }) => s.service_id);
    let serviceMap = new Map();
    if (serviceIds.length > 0) {
      const { data: svcData } = await supabase
        .from("event_services")
        .select("id, name, price")
        .in("id", serviceIds);
      serviceMap = new Map((svcData ?? []).map((s: { id: string; name: string; price: number }) => [s.id, s]));
    }

    // Calculate totals
    let totalAmount = 0;
    for (const t of tickets) {
      const tier = tierMap.get(t.ticket_tier_id);
      totalAmount += (tier?.price ?? 0) * t.quantity;
    }
    for (const s of services) {
      const svc = serviceMap.get(s.service_id);
      totalAmount += (svc?.price ?? 0) * s.quantity;
    }

    // Create primary attendee
    const primaryTicket = tickets[0];
    const { data: attendee, error: attError } = await supabase
      .from("attendees")
      .insert({
        event_id,
        ticket_tier_id: primaryTicket?.ticket_tier_id ?? null,
        first_name,
        last_name,
        email,
        phone: phone || null,
        institution: institution || null,
        profile_id: profile_id || null,
        status: isCompany ? "pending" : "approved",
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (attError) throw attError;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id,
        attendee_id: attendee.id,
        payer_name: payer_name || (isCompany ? company_name : `${first_name} ${last_name}`),
        payer_type,
        payer_oib: company_oib || null,
        payer_address: payer_address || null,
        payer_city: payer_city || null,
        payer_postal_code: payer_postal_code || null,
        payer_country_code: payer_country_code || "HR",
        payer_country_name: payer_country_name || "Croatia",
        billing_email: billing_email || email,
        contact_name: `${first_name} ${last_name}`,
        contact_email: email,
        contact_phone: phone || null,
        po_number: po_number || null,
        payment_method: payment_method || (isCompany ? "invoice" : "stripe"),
        status: "draft",
        total_amount: totalAmount,
        is_group_order: (primaryTicket?.quantity ?? 1) > 1,
      })
      .select("id, order_number")
      .single();

    if (orderError) throw orderError;

    // Create order items — tickets
    const orderItems: Array<Record<string, unknown>> = [];

    for (const t of tickets) {
      const tier = tierMap.get(t.ticket_tier_id);
      const lineTotal = (tier?.price ?? 0) * t.quantity;
      const vatAmount = Number(((lineTotal * vatRate) / (100 + vatRate)).toFixed(2));
      orderItems.push({
        order_id: order.id,
        attendee_id: attendee.id,
        ticket_type_id: t.ticket_tier_id,
        description: tier?.name ?? "Ticket",
        quantity: t.quantity,
        unit_price: tier?.price ?? 0,
        total_price: lineTotal,
        vat_amount: vatAmount,
        price_at_purchase: tier?.price ?? 0,
      });
    }

    // Create order items — services
    for (const s of services) {
      const svc = serviceMap.get(s.service_id);
      const lineTotal = (svc?.price ?? 0) * s.quantity;
      const vatAmount = Number(((lineTotal * vatRate) / (100 + vatRate)).toFixed(2));
      orderItems.push({
        order_id: order.id,
        attendee_id: attendee.id,
        service_id: s.service_id,
        description: svc?.name ?? "Service",
        quantity: s.quantity,
        unit_price: svc?.price ?? 0,
        total_price: lineTotal,
        vat_amount: vatAmount,
        price_at_purchase: svc?.price ?? 0,
      });
    }

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        primary_attendee_id: attendee.id,
        total_amount: totalAmount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-order error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
