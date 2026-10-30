"use server";

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

  const redirectTo = `${siteUrl()}/auth/callback${next.startsWith("/") ? `?next=${encodeURIComponent(next)}` : ""}`;
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
