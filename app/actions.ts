"use server";

import { headers } from "next/headers";
import { adminClient, siteUrl, userClient } from "@/lib/supabase";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendSignInLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const next = String(form.get("next") || "");
  if (!email.includes("@")) return { status: "error", message: "Enter a valid email." };

  // Invite-only: the email must be on the invite list.
  const { data: invite, error } = await adminClient().from("invites").select("email").eq("email", email).maybeSingle();
  if (error) return { status: "error", message: "Something went wrong. Try again in a minute." };
  if (!invite) return { status: "error", message: "That email isn’t on the invite list yet. Ask Tom to add you." };

  // Send people back to the address they're actually using (falls back to the configured site URL).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = host && !process.env.NEXT_PUBLIC_SITE_URL ? `${proto}://${host}` : siteUrl();
  const redirectTo = `${base}/auth/callback${next.startsWith("/") ? `?next=${encodeURIComponent(next)}` : ""}`;
  const supabase = await userClient();
  const { error: sendError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (sendError) {
    return {
      status: "error",
      message: sendError.message.toLowerCase().includes("rate")
        ? "Too many sign-in emails were sent recently. Wait a bit and try again."
        : "Couldn’t send the email. Try again.",
    };
  }
  return { status: "sent" };
}
