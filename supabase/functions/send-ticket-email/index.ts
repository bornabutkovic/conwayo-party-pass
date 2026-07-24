import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-conwayo-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_EMAIL_WEBHOOK = "https://penta.app.n8n.cloud/webhook/send-payment-email";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDateRange(startIso: string | null, endIso: string | null, lang: string): string {
  if (!startIso) return "—";
  const s = new Date(startIso);
  const sStr = lang === "hr"
    ? `${pad(s.getUTCDate())}. ${pad(s.getUTCMonth() + 1)}. ${s.getUTCFullYear()}.`
    : `${pad(s.getUTCDate())}/${pad(s.getUTCMonth() + 1)}/${s.getUTCFullYear()}`;
  if (!endIso) return sStr;
  const e = new Date(endIso);
  const eStr = lang === "hr"
    ? `${pad(e.getUTCDate())}. ${pad(e.getUTCMonth() + 1)}. ${e.getUTCFullYear()}.`
    : `${pad(e.getUTCDate())}/${pad(e.getUTCMonth() + 1)}/${e.getUTCFullYear()}`;
  return sStr === eStr ? sStr : `${sStr} – ${eStr}`;
}

function buildTicketEmailHtml(params: {
  lang: string;
  eventName: string;
  bannerUrl: string | null;
  fullName: string;
  qrData: string;
  dateRange: string;
  location: string;
  tierName: string | null;
  organizerEmail: string | null;
  organizerPhone: string | null;
  organizerName: string | null;
}) {
  const {
    lang, eventName, bannerUrl, fullName, qrData, dateRange, location,
    tierName, organizerEmail, organizerPhone, organizerName,
  } = params;
  const isHr = lang === "hr";
  const title = isHr ? `Vaša ulaznica – ${eventName}` : `Your ticket – ${eventName}`;
  const greeting = isHr
    ? `Dragi/a <strong style="color:#374151;">${fullName}</strong> — vaša registracija je potvrđena.`
    : `Dear <strong style="color:#374151;">${fullName}</strong> — your registration is confirmed.`;
  const qrCaption = isHr ? "Pokažite ovaj QR kod na ulazu" : "Show this QR code at the entrance";
  const labelDate = isHr ? "Datum" : "Date";
  const labelLocation = isHr ? "Lokacija" : "Location";
  const labelTier = isHr ? "Vrsta ulaznice" : "Ticket type";
  const labelContact = isHr ? "Kontakt organizatora" : "Organizer contact";
  const footerNote = isHr
    ? "Zadržite ovaj email. QR kod koristite pri ulasku na događaj."
    : "Keep this email. Use the QR code to enter the event.";

  const bannerRow = bannerUrl
    ? `<tr><td style="padding:0;line-height:0;"><img src="${bannerUrl}" alt="${eventName}" width="560" style="display:block;width:100%;max-height:220px;object-fit:cover;"></td></tr>`
    : "";

  const contactRow = (organizerEmail || organizerPhone)
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #F0F0F0;">
        <span style="display:block;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">${labelContact}</span>
        <span style="font-size:15px;color:#1F2937;font-weight:500;">${organizerEmail ? `<a href="mailto:${organizerEmail}" style="color:#602977;text-decoration:none;">${organizerEmail}</a>` : ""}${organizerEmail && organizerPhone ? " &nbsp;·&nbsp; " : ""}${organizerPhone ? `<a href="tel:${organizerPhone}" style="color:#602977;text-decoration:none;">${organizerPhone}</a>` : ""}</span>
      </td></tr>`
    : "";

  const tierRow = tierName
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid #F0F0F0;">
        <span style="display:block;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">${labelTier}</span>
        <span style="font-size:15px;color:#1F2937;font-weight:500;">${tierName}</span>
      </td></tr>`
    : "";

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
${bannerRow}
<tr><td style="padding:32px;">
  <p style="margin:0 0 6px 0;font-size:20px;font-weight:700;color:#111827;">${eventName}</p>
  <p style="margin:0 0 24px 0;font-size:15px;color:#6B7280;">${greeting}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr><td align="center" style="background:#F9FAFB;border-radius:10px;padding:24px;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}&bgcolor=ffffff&color=000000&margin=10" alt="QR" width="180" height="180" style="display:block;border-radius:6px;">
      <p style="margin:12px 0 0 0;font-size:12px;color:#9CA3AF;">${qrCaption}</p>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
    <tr><td style="padding:10px 0;border-bottom:1px solid #F0F0F0;">
        <span style="display:block;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">${labelDate}</span>
        <span style="font-size:15px;color:#1F2937;font-weight:500;">${dateRange}</span>
      </td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #F0F0F0;">
        <span style="display:block;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">${labelLocation}</span>
        <span style="font-size:15px;color:#1F2937;font-weight:500;">${location}</span>
      </td></tr>${tierRow}${contactRow}
  </table>
  <p style="margin:24px 0 0 0;font-size:13px;color:#9CA3AF;text-align:center;">${footerNote}</p>
</td></tr>
<tr><td style="background:#F9FAFB;padding:18px 32px;border-top:1px solid #E5E7EB;">
  <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">${organizerName ?? "Conwayo"} &nbsp;·&nbsp; Powered by <strong>Conwayo</strong></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
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
      .select("name, start_date, end_date, venue_name, location_address, location_city, notification_sender_name, notification_sender_email, support_phone, branding_banner_url")
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
    const fullName = `${attendee.first_name ?? ""} ${attendee.last_name ?? ""}`.trim();
    const locationParts = [event?.venue_name, event?.location_address, event?.location_city].filter(Boolean);
    const location = locationParts.length ? locationParts.join(", ") : "—";
    const dateRange = formatDateRange(event?.start_date ?? null, event?.end_date ?? null, lang);
    const subject = lang === "hr" ? `Vaša ulaznica – ${eventName}` : `Your ticket – ${eventName}`;

    const html = buildTicketEmailHtml({
      lang,
      eventName,
      bannerUrl: event?.branding_banner_url ?? null,
      fullName,
      qrData: attendee.id,
      dateRange,
      location,
      tierName,
      organizerEmail: event?.notification_sender_email ?? null,
      organizerPhone: event?.support_phone ?? null,
      organizerName: event?.notification_sender_name ?? null,
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
      JSON.stringify({ success: true }),
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
