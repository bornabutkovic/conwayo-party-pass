import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Support both new (orderId) and legacy (attendeeId) flows
    const orderId = body.orderId;
    const eventId = body.eventId;

    if (!orderId && !body.attendeeId) throw new Error("Missing orderId or attendeeId");

    // ─── Legacy flow (single attendee checkout) ───
    if (!orderId && body.attendeeId) {
      const { data: event, error: eventError } = await adminClient
        .from("events")
        .select("name, price, currency, slug")
        .eq("id", eventId)
        .single();

      if (eventError || !event) throw new Error("Event not found");

      const { data: attendee, error: attError } = await adminClient
        .from("attendees")
        .select("id, first_name, last_name, email, price_paid")
        .eq("id", body.attendeeId)
        .single();

      if (attError || !attendee) throw new Error("Attendee not found");

      const price = attendee.price_paid ?? event.price ?? 0;
      if (price <= 0) {
        await adminClient
          .from("attendees")
          .update({ payment_status: "paid" })
          .eq("id", body.attendeeId);

        return new Response(JSON.stringify({ free: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      const currency = (event.currency ?? "EUR").toLowerCase();
      const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "https://localhost:5173";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: attendee.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `${event.name} — Ticket`,
                description: `Attendee: ${attendee.first_name} ${attendee.last_name}`,
              },
              unit_amount: Math.round(price * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          attendee_id: body.attendeeId,
          event_id: eventId,
        },
        success_url: `${origin}/ticket/${body.attendeeId}?payment=success`,
        cancel_url: `${origin}/ticket/${body.attendeeId}?payment=cancelled`,
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── New unified order flow ───
    if (!eventId) throw new Error("Missing eventId");

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, total_amount, attendee_id, payer_name")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("Order not found");

    const totalAmount = order.total_amount ?? 0;
    if (totalAmount <= 0) {
      // Free order — mark as paid
      await adminClient.from("orders").update({ status: "paid" }).eq("id", orderId);

      // Mark all attendees linked via order_items as paid
      const { data: items } = await adminClient
        .from("order_items")
        .select("attendee_id")
        .eq("order_id", orderId)
        .not("attendee_id", "is", null);

      const attendeeIds = [...new Set((items ?? []).map((i: any) => i.attendee_id))];
      for (const aid of attendeeIds) {
        await adminClient.from("attendees").update({ payment_status: "paid" }).eq("id", aid);
      }

      return new Response(JSON.stringify({ free: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch event for currency
    const { data: event, error: evError } = await adminClient
      .from("events")
      .select("name, currency, slug")
      .eq("id", eventId)
      .single();

    if (evError || !event) throw new Error("Event not found");

    // Fetch order items to build Stripe line_items
    const { data: orderItems, error: itemsError } = await adminClient
      .from("order_items")
      .select("description, quantity, unit_price")
      .eq("order_id", orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
      throw new Error("No order items found");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const currency = (event.currency ?? "EUR").toLowerCase();
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "https://localhost:5173";

    // Fetch primary attendee email for customer_email
    let customerEmail: string | undefined;
    if (order.attendee_id) {
      const { data: att } = await adminClient
        .from("attendees")
        .select("email")
        .eq("id", order.attendee_id)
        .single();
      customerEmail = att?.email ?? undefined;
    }

    const lineItems = orderItems.map((item: any) => ({
      price_data: {
        currency,
        product_data: {
          name: item.description,
        },
        unit_amount: Math.round((item.unit_price ?? 0) * 100),
      },
      quantity: item.quantity ?? 1,
    }));

    const primaryAttendeeId = order.attendee_id ?? "unknown";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail,
      line_items: lineItems,
      metadata: {
        order_id: orderId,
        event_id: eventId,
        attendee_id: primaryAttendeeId,
      },
      success_url: `${origin}/ticket/${primaryAttendeeId}?payment=success`,
      cancel_url: `${origin}/ticket/${primaryAttendeeId}?payment=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
