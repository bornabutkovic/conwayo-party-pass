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

    const { attendeeId, eventId } = await req.json();
    if (!attendeeId || !eventId) throw new Error("Missing attendeeId or eventId");

    const { data: event, error: eventError } = await adminClient
      .from("events")
      .select("name, price, currency, slug")
      .eq("id", eventId)
      .single();

    if (eventError || !event) throw new Error("Event not found");

    const { data: attendee, error: attError } = await adminClient
      .from("attendees")
      .select("id, first_name, last_name, email, price_paid")
      .eq("id", attendeeId)
      .single();

    if (attError || !attendee) throw new Error("Attendee not found");

    const price = attendee.price_paid ?? event.price ?? 0;
    if (price <= 0) {
      await adminClient
        .from("attendees")
        .update({ payment_status: "paid" })
        .eq("id", attendeeId);

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
        attendee_id: attendeeId,
        event_id: eventId,
      },
      success_url: `${origin}/ticket/${attendeeId}?payment=success`,
      cancel_url: `${origin}/ticket/${attendeeId}?payment=cancelled`,
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
