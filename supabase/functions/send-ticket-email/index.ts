import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-conwayo-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_EMAIL_WEBHOOK = "https://penta.app.n8n.cloud/webhook/send-payment-email";
const TICKET_PORTAL_ORIGIN = "https://conwayo.io";

function buildEmailHtml(params: {
  lang: string;
  firstName: string;
  eventName: string;
  tierName: string | null;
  ticketUrl: string;
}) {
  const { lang, firstName, eventName, tierName, ticketUrl } = params;
  const isHr = lang === "hr";
  const greeting = isHr ? `Pozdrav ${firstName || ""},`.trim() : `Hi ${firstName || ""},`.trim();
  const intro = isHr
    ? `Vaša uplata je zaprimljena. U nastavku je vaša ulaznica za <strong>${eventName}</strong>.`
    : `Your payment has been received. Here is your ticket for <strong>${eventName}</strong>.`;
  const tierLine = tierName
    ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;">${isHr ? "Vrsta ulaznice" : "Ticket type"}: <strong>${tierName}</strong></p>`
    : "";
  const cta = isHr ? "Pogledaj ulaznicu" : "View your ticket";
  const footer = isHr
    ? "Ovaj QR kod koristite za prijavu (check-in) na dan događaja."
    : "Use this QR code to check in on the day of the event.";

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;">
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">${greeting}</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.5;">${intro}</p>
    ${tierLine}
    <div style="text-align:center;margin:28px 0;">
      <a href="${ticketUrl}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">${cta}</a>
    </div>
    <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">${footer}</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  let attendeeId: string | undefined;

  try {
    const body = await req.json();
    attendeeId = body.attendeeId;
    const lang = body.lang === "en" ? "en" : "hr";

    if (!attendeeId) throw new Error("Missing attendeeId");

    const { data: secret, error: secretErr } = await adminClient.rpc("get_webhook_secret", {
      p_secret_name: "conwayo_webhook_secret",
    });
    if (secretErr || !secret) throw new Error("Webhook secret not configured");

    if (req.headers.get("x-conwayo-secret") !== secret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: attendee, error: attErr } = await adminClient
      .from("attendees")
      .select("id, first_name, last_name, email, event_id, ticket_tier_id")
      .eq("id", attendeeId)
      .single();

    if (attErr || !attendee) throw new Error("Attendee not found");
    if (!attendee.email) throw new Error("No email for attendee");

    const { data: event } = await adminClient
      .from("events")
      .select("name")
      .eq("id", attendee.event_id!)
      .single();

    let tierName: string | null = null;
    if (attendee.ticket_tier_id) {
      const { data: tier } = await adminClient
        .from("ticket_tiers")
        .select("name, translations")
        .eq("id", attendee.ticket_tier_id)
        .maybeSingle();
      if (tier) {
        const translated = (tier.translations as any)?.[lang]?.name;
        tierName = translated ?? tier.name ?? null;
      }
    }

    const eventName = event?.name ?? "Conwayo Event";
    const ticketUrl = `${TICKET_PORTAL_ORIGIN}/ticket/${attendee.id}`;
    const subject = lang === "hr" ? `Vaša ulaznica za ${eventName}` : `Your ticket for ${eventName}`;
    const html = buildEmailHtml({
      lang,
      firstName: attendee.first_name || "",
      eventName,
      tierName,
      ticketUrl,
    });

    const n8nRes = await fetch(N8N_EMAIL_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-conwayo-secret": secret,
      },
      body: JSON.stringify({ to: attendee.email, subject, html }),
    });

    if (!n8nRes.ok) {
      const errText = await n8nRes.text();
      throw new Error(`n8n webhook returned ${n8nRes.status}: ${errText.slice(0, 300)}`);
    }

    await adminClient
      .from("attendees")
      .update({
        ticket_sent_at: new Date().toISOString(),
        ticket_send_failed_at: null,
        ticket_send_fail_reason: null,
      })
      .eq("id", attendeeId);

    return new Response(
      JSON.stringify({ success: true, ticketUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Send ticket email error:", msg);

    if (attendeeId) {
      try {
        await adminClient
          .from("attendees")
          .update({
            ticket_send_failed_at: new Date().toISOString(),
            ticket_send_fail_reason: msg.slice(0, 500),
          })
          .eq("id", attendeeId);
      } catch (_) {
        // best-effort; do not mask original error
      }
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
