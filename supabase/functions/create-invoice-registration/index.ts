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
    const body = await req.json();
    const {
      event_id,
      first_name,
      last_name,
      email,
      phone,
      profile_id,
      company_name,
      company_oib,
      company_address,
      billing_email,
      po_number,
      tickets,
      services,
    } = body;

    // Validate required fields
    if (!event_id || !first_name || !last_name || !email || !company_name) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, vat_rate, currency, institution_uuid")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ success: false, error: "Event not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch ticket tiers for price lookup
    const ticketTierIds = (tickets || []).map((t: { ticket_tier_id: string }) => t.ticket_tier_id);
    let ticketTiersMap: Record<string, { name: string; price: number; erp_code: string | null }> = {};

    if (ticketTierIds.length > 0) {
      const { data: tiers } = await supabase
        .from("ticket_tiers")
        .select("id, name, price, erp_code")
        .in("id", ticketTierIds);
      if (tiers) {
        for (const t of tiers) {
          ticketTiersMap[t.id] = { name: t.name, price: t.price, erp_code: t.erp_code };
        }
      }
    }

    // 3. Fetch services for price lookup
    const serviceIds = (services || []).map((s: { service_id: string }) => s.service_id);
    let servicesMap: Record<string, { name: string; price: number; erp_code: string | null }> = {};

    if (serviceIds.length > 0) {
      const { data: svcData } = await supabase
        .from("event_services")
        .select("id, name, price, erp_code")
        .in("id", serviceIds);
      if (svcData) {
        for (const s of svcData) {
          servicesMap[s.id] = { name: s.name, price: s.price, erp_code: s.erp_code };
        }
      }
    }

    // 4. Calculate total
    const vatRate = event.vat_rate ?? 25;
    let totalAmount = 0;
    const orderItems: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      vat_amount: number;
      ticket_type_id?: string;
      service_id?: string;
    }> = [];

    for (const t of tickets || []) {
      const tier = ticketTiersMap[t.ticket_tier_id];
      if (!tier) continue;
      const qty = t.quantity || 1;
      const lineTotal = tier.price * qty;
      const vatAmount = Number(((lineTotal * vatRate) / (100 + vatRate)).toFixed(2));
      totalAmount += lineTotal;
      orderItems.push({
        description: tier.name,
        quantity: qty,
        unit_price: tier.price,
        total_price: lineTotal,
        vat_amount: vatAmount,
        ticket_type_id: t.ticket_tier_id,
      });
    }

    for (const s of services || []) {
      const svc = servicesMap[s.service_id];
      if (!svc) continue;
      const qty = s.quantity || 1;
      const lineTotal = svc.price * qty;
      const vatAmount = Number(((lineTotal * vatRate) / (100 + vatRate)).toFixed(2));
      totalAmount += lineTotal;
      orderItems.push({
        description: svc.name,
        quantity: qty,
        unit_price: svc.price,
        total_price: lineTotal,
        vat_amount: vatAmount,
        service_id: s.service_id,
      });
    }

    // 5. Create attendee (first ticket tier)
    const firstTicketTierId = ticketTierIds[0] || null;
    const { data: attendee, error: attError } = await supabase
      .from("attendees")
      .insert({
        event_id,
        ticket_tier_id: firstTicketTierId,
        first_name,
        last_name,
        email,
        phone: phone || null,
        profile_id: profile_id || null,
        status: "pending",
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (attError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create attendee: " + attError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id,
        attendee_id: attendee.id,
        payer_name: company_name,
        payer_type: "company" as const,
        payer_oib: company_oib || null,
        payer_address: company_address || null,
        billing_email: billing_email || email,
        contact_name: `${first_name} ${last_name}`,
        contact_email: email,
        contact_phone: phone || null,
        po_number: po_number || null,
        payment_method: "invoice",
        status: "draft",
        total_amount: totalAmount,
        is_group_order: (tickets || []).some((t: { quantity: number }) => t.quantity > 1),
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create order: " + orderError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Create order items
    const itemsToInsert = orderItems.map((item) => ({
      order_id: order.id,
      attendee_id: attendee.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      vat_amount: item.vat_amount,
      price_at_purchase: item.unit_price,
      ticket_type_id: item.ticket_type_id || null,
      service_id: item.service_id || null,
    }));

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
      if (itemsError) {
        console.error("Failed to create order items:", itemsError.message);
      }
    }

    // 8. Forward to n8n webhook for BC processing
    try {
      await fetch("https://penta.app.n8n.cloud/webhook/lovable-invoice-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          order_id: order.id,
          order_number: order.order_number,
          attendee_id: attendee.id,
          total_amount: totalAmount,
        }),
      });
    } catch (webhookErr) {
      console.error("n8n webhook call failed (non-blocking):", webhookErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        quote_number: `INV-${order.order_number}`,
        attendee_id: attendee.id,
        total_amount: totalAmount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-invoice-registration error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
