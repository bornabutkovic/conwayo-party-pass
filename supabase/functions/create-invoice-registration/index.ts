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
      order_id,
      event_id,
      first_name,
      last_name,
      email,
      phone,
      profile_id,
      company_name,
      company_oib,
      company_address,
      company_city,
      company_postal_code,
      company_country_code,
      company_country_name,
      bc_posting_zone,
      billing_email,
      po_number,
      tickets,
      services,
    } = body;

    if (!event_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing event_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch event details for enrichment
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, vat_rate, currency, institution_uuid, bc_position, bc_reference")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ success: false, error: "Event not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch institution for BC mapping
    let institution = null;
    if (event.institution_uuid) {
      const { data: inst } = await supabase
        .from("institutions")
        .select("id, name, bc_generic_customer_id, bc_payment_method_bank, bc_payment_method_card, stripe_connect_id")
        .eq("id", event.institution_uuid)
        .single();
      institution = inst;
    }

    // Enrich ticket data with erp_code
    const ticketTierIds = (tickets || []).map((t: { ticket_tier_id: string }) => t.ticket_tier_id);
    let enrichedTickets: Array<Record<string, unknown>> = [];
    if (ticketTierIds.length > 0) {
      const { data: tiers } = await supabase
        .from("ticket_tiers")
        .select("id, name, price, erp_code")
        .in("id", ticketTierIds);
      if (tiers) {
        enrichedTickets = (tickets || []).map((t: { ticket_tier_id: string; quantity: number }) => {
          const tier = tiers.find((tt) => tt.id === t.ticket_tier_id);
          return {
            ticket_tier_id: t.ticket_tier_id,
            quantity: t.quantity,
            name: tier?.name,
            price: tier?.price,
            erp_code: tier?.erp_code,
          };
        });
      }
    }

    // Enrich service data with erp_code
    const serviceIds = (services || []).map((s: { service_id: string }) => s.service_id);
    let enrichedServices: Array<Record<string, unknown>> = [];
    if (serviceIds.length > 0) {
      const { data: svcData } = await supabase
        .from("event_services")
        .select("id, name, price, erp_code")
        .in("id", serviceIds);
      if (svcData) {
        enrichedServices = (services || []).map((s: { service_id: string; quantity: number }) => {
          const svc = svcData.find((sv) => sv.id === s.service_id);
          return {
            service_id: s.service_id,
            quantity: s.quantity,
            name: svc?.name,
            price: svc?.price,
            erp_code: svc?.erp_code,
          };
        });
      }
    }

    // Fetch order details if order_id provided
    let orderData = null;
    if (order_id) {
      const { data: ord } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, payer_name, payer_oib, payer_address, billing_email, po_number, payment_method")
        .eq("id", order_id)
        .single();
      orderData = ord;
    }

    // Forward enriched payload to n8n for BC processing
    const n8nPayload = {
      order_id: order_id || null,
      order_number: orderData?.order_number || null,
      event_id,
      event_name: event.name,
      bc_position: event.bc_position,
      bc_reference: event.bc_reference,
      institution_name: institution?.name,
      bc_generic_customer_id: institution?.bc_generic_customer_id,
      bc_payment_method_bank: institution?.bc_payment_method_bank,
      first_name,
      last_name,
      email,
      phone: phone || null,
      profile_id: profile_id || null,
      company_name,
      company_oib: company_oib || null,
      company_address: company_address || null,
      billing_email: billing_email || email,
      po_number: po_number || null,
      total_amount: orderData?.total_amount || null,
      tickets: enrichedTickets,
      services: enrichedServices,
    };

    console.log("Forwarding to n8n:", JSON.stringify(n8nPayload));

    try {
      const n8nRes = await fetch("https://penta.app.n8n.cloud/webhook/lovable-invoice-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n8nPayload),
      });
      console.log("n8n response status:", n8nRes.status);
    } catch (webhookErr) {
      console.error("n8n webhook call failed:", webhookErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order_id || null,
        quote_number: orderData ? `INV-${orderData.order_number}` : null,
        message: "Invoice registration processed",
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
