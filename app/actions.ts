"use server";

import { redirect } from "next/navigation";
import { adminClient, userClient } from "@/lib/supabase";

export type LoginState = { status: "idle" | "error"; message?: string };

/**
 * Invite-only sign-in with a password, so no emails are ever sent.
 * The first time an invited person signs in, the password they type becomes their password.
 */
export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "");
  const dest = next.startsWith("/") ? next : "/collection";

  if (!email.includes("@")) return { status: "error", message: "Enter a valid email." };
  if (password.length < 6) return { status: "error", message: "Passwords need at least 6 characters." };

  const admin = adminClient();
  const { data: invite, error } = await admin.from("invites").select("email").eq("email", email).maybeSingle();
  if (error) return { status: "error", message: "Something went wrong. Try again in a minute." };
  if (!invite) return { status: "error", message: "That email isn’t on the invite list yet. Ask Tom to add you." };

  const supabase = await userClient();

  // Returning user with the right password.
  const first = await supabase.auth.signInWithPassword({ email, password });
  if (!first.error) redirect(dest);

  // First visit: create the account with this password (no confirmation email).
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { password_set: true },
  });

  if (created.error) {
    // The account already exists. If it never had a password set (for example it came from an
    // earlier email-link attempt), set this one now; otherwise the password was wrong.
    const existing = await findUserByEmail(email);
    if (!existing) return { status: "error", message: "Couldn’t sign you in. Try again." };
    if (existing.app_metadata?.password_set) {
      return { status: "error", message: "That password doesn’t match. Try again, or ask Tom to reset it." };
    }
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { ...existing.app_metadata, password_set: true },
    });
    if (updated.error) return { status: "error", message: "Couldn’t set your password. Try again." };
  }

  const second = await supabase.auth.signInWithPassword({ email, password });
  if (second.error) return { status: "error", message: "Couldn’t sign you in. Try again." };
  redirect(dest);
}

async function findUserByEmail(email: string) {
  const admin = adminClient();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}
