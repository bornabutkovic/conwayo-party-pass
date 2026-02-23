import Stripe from "npm:stripe@^14.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    if (!stripeKey.startsWith("sk_")) throw new Error("Invalid STRIPE_SECRET_KEY: must start with sk_");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("[create-checkout] Request body:", JSON.stringify(body));

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

      let session;
      try {
        session = await stripe.checkout.sessions.create({
          ui_mode: "hosted",
          mode: "payment",
          customer_email: (attendee.email && isValidEmail(attendee.email)) ? attendee.email : undefined,
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
      } catch (stripeError: any) {
        console.error("Stripe Error:", stripeError);
        throw new Error("Stripe error: " + (stripeError?.message || "Unknown Stripe error"));
      }

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

    if (orderError || !order) throw new Error("Order not found: " + JSON.stringify(orderError));
    console.log("[create-checkout] Order:", JSON.stringify(order));

    const totalAmount = order.total_amount ?? 0;
    if (totalAmount <= 0) {
      console.log("[create-checkout] Zero-amount order, bypassing Stripe");
      await adminClient.from("orders").update({ status: "paid", payment_method: "free" }).eq("id", orderId);

      const { data: items } = await adminClient
        .from("order_items")
        .select("attendee_id")
        .eq("order_id", orderId)
        .not("attendee_id", "is", null);

      const attendeeIds = [...new Set((items ?? []).map((i: any) => i.attendee_id))];
      if (attendeeIds.length > 0) {
        await adminClient.from("attendees").update({ payment_status: "paid" }).in("id", attendeeIds);
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
      .select("description, quantity, unit_price, total_price")
      .eq("order_id", orderId);

    if (itemsError) throw new Error("Failed to fetch order items: " + JSON.stringify(itemsError));
    if (!orderItems || orderItems.length === 0) throw new Error("No order items found for order " + orderId);

    console.log("[create-checkout] Order items:", JSON.stringify(orderItems));

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const currency = (event.currency ?? "EUR").toLowerCase();
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "https://localhost:5173";

    // Fetch primary attendee email
    let customerEmail: string | undefined;
    if (order.attendee_id) {
      const { data: att } = await adminClient
        .from("attendees")
        .select("email")
        .eq("id", order.attendee_id)
        .single();
      const rawEmail = att?.email ?? undefined;
      customerEmail = (rawEmail && isValidEmail(rawEmail)) ? rawEmail : undefined;
    }

    const lineItems = orderItems.map((item: any) => {
      const unitAmountCents = Math.round((item.unit_price ?? 0) * 100);
      return {
        price_data: {
          currency,
          product_data: { name: item.description || "Item" },
          unit_amount: unitAmountCents > 0 ? unitAmountCents : 1, // Stripe requires > 0
        },
        quantity: item.quantity ?? 1,
      };
    });

    // Filter out any items with 0 amount
    const validLineItems = lineItems.filter((li: any) => li.price_data.unit_amount > 0);
    if (validLineItems.length === 0) throw new Error("All line items have zero price");

    console.log("[create-checkout] Stripe line_items:", JSON.stringify(validLineItems));

    const primaryAttendeeId = order.attendee_id ?? "unknown";

    try {
      const session = await stripe.checkout.sessions.create({
        ui_mode: "hosted",
        mode: "payment",
        customer_email: customerEmail,
        line_items: validLineItems,
        metadata: {
          order_id: orderId,
          event_id: eventId,
          attendee_id: primaryAttendeeId,
        },
        success_url: `${origin}/ticket/${primaryAttendeeId}?payment=success`,
        cancel_url: `${origin}/ticket/${primaryAttendeeId}?payment=cancelled`,
      });

      console.log("[create-checkout] Stripe session created:", session.id, "URL:", session.url);

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (stripeError: any) {
      console.error("[create-checkout] Stripe session creation failed:", stripeError?.message, stripeError?.type, JSON.stringify(stripeError));
      throw new Error("Stripe error: " + (stripeError?.message || "Unknown Stripe error"));
    }
  } catch (error) {
    console.error("[create-checkout] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
