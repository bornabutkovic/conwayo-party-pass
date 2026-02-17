import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
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

    // If STRIPE_WEBHOOK_SECRET is set, verify signature; otherwise trust the event
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
      const attendeeId = session.metadata?.attendee_id;
      const eventId = session.metadata?.event_id;

      if (!attendeeId) {
        console.error("No attendee_id in session metadata");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      // Update attendee payment status
      const { error: attError } = await adminClient
        .from("attendees")
        .update({ payment_status: "paid" })
        .eq("id", attendeeId);

      if (attError) console.error("Failed to update attendee:", attError);

      // Update related order status
      if (eventId) {
        const { error: orderError } = await adminClient
          .from("orders")
          .update({ status: "paid" })
          .eq("attendee_id", attendeeId)
          .eq("event_id", eventId);

        if (orderError) console.error("Failed to update order:", orderError);
      }

      console.log(`Payment confirmed for attendee ${attendeeId}`);
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
