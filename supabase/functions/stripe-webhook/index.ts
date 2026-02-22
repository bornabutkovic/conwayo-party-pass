import Stripe from "npm:stripe@^14.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const body = await req.text();

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) throw new Error("Missing stripe-signature header");
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      const attendeeId = session.metadata?.attendee_id;
      const eventId = session.metadata?.event_id;

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      if (orderId) {
        // ─── Unified order flow (source of truth) ───
        // 1. Update the order to paid
        const { error: orderError } = await adminClient
          .from("orders")
          .update({ status: "paid", payment_method: "stripe" })
          .eq("id", orderId);

        if (orderError) console.error("Failed to update order:", orderError);

        // 2. Find all attendees linked via order_items and mark them paid
        const { data: items } = await adminClient
          .from("order_items")
          .select("attendee_id")
          .eq("order_id", orderId)
          .not("attendee_id", "is", null);

        const attendeeIds = [...new Set((items ?? []).map((i: any) => i.attendee_id))];

        if (attendeeIds.length > 0) {
          const { error: attError } = await adminClient
            .from("attendees")
            .update({ payment_status: "paid" })
            .in("id", attendeeIds);

          if (attError) console.error("Failed to update attendees:", attError);
        }

        console.log(`Payment confirmed for order ${orderId} (${attendeeIds.length} attendees)`);
      } else if (attendeeId) {
        // ─── Legacy single-attendee flow ───
        const { error: attError } = await adminClient
          .from("attendees")
          .update({ payment_status: "paid" })
          .eq("id", attendeeId);

        if (attError) console.error("Failed to update attendee:", attError);

        if (eventId) {
          const { error: orderError } = await adminClient
            .from("orders")
            .update({ status: "paid" })
            .eq("attendee_id", attendeeId)
            .eq("event_id", eventId);

          if (orderError) console.error("Failed to update order:", orderError);
        }

        console.log(`Payment confirmed for attendee ${attendeeId}`);
      } else {
        console.error("No order_id or attendee_id in session metadata");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
