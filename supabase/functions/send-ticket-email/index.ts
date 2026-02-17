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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { attendeeId } = await req.json();
    if (!attendeeId) throw new Error("Missing attendeeId");

    // Fetch attendee and event
    const { data: attendee, error: attErr } = await adminClient
      .from("attendees")
      .select("id, first_name, last_name, email, event_id")
      .eq("id", attendeeId)
      .single();

    if (attErr || !attendee) throw new Error("Attendee not found");
    if (!attendee.email) throw new Error("No email for attendee");

    const { data: event } = await adminClient
      .from("events")
      .select("name, notification_sender_email, notification_sender_name")
      .eq("id", attendee.event_id!)
      .single();

    const eventName = event?.name ?? "Event";
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "https://id-preview--21945754-9116-42cb-9423-eeee75e6cb2e.lovable.app";
    const ticketUrl = `${origin}/ticket/${attendee.id}`;

    // Use Supabase's built-in email (auth.admin) to send
    // Since we don't have a dedicated email service, we'll use a simple approach
    // For now, log the email that should be sent - in production, integrate with Resend/SendGrid
    console.log(`[TICKET EMAIL] To: ${attendee.email}`);
    console.log(`[TICKET EMAIL] Subject: Your ticket for ${eventName}`);
    console.log(`[TICKET EMAIL] Ticket URL: ${ticketUrl}`);

    // TODO: Replace with actual email sending service (Resend, SendGrid, etc.)
    // For now, this logs the email details. To actually send emails, 
    // add a RESEND_API_KEY secret and use the Resend API.

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email logged (configure email service for actual delivery)",
        ticketUrl 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send ticket email error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
