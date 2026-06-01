// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { data: { users } } = await supabase.auth.admin.listUsers();
    const userExists = users?.find((u) => u.email === email);

    if (!userExists) {
      return new Response(
        JSON.stringify({ error: "No account found with this email." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("password_reset_otps").update({ used: true }).eq("email", email);

    const { error: insertError } = await supabase
      .from("password_reset_otps")
      .insert({ email, otp, expires_at });

    if (insertError) throw insertError;

    const client = new SmtpClient();
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: Deno.env.get("GMAIL_USER"),
      password: Deno.env.get("GMAIL_APP_PASSWORD"),
    });

    await client.send({
      from: Deno.env.get("GMAIL_USER"),
      to: email,
      subject: "Your Password Reset OTP",
      content: "text/html",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#16a34a;">Password Reset</h2>
          <p style="color:#374151;">Use the OTP below. It expires in <strong>10 minutes</strong>.</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#111827;">${otp}</span>
          </div>
          <p style="color:#6b7280;font-size:13px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Something went wrong." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});