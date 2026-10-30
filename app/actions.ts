"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminClient, siteUrl, userClient } from "@/lib/supabase";

export type LoginState = { status: "idle" | "error"; message?: string };

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/deals";
}

/** Anyone opening a deal link may join (to buy). Otherwise, during the beta, only invited emails. */
async function allowedToJoin(email: string, next: string) {
  if (next.startsWith("/d/")) return true;
  const { data } = await adminClient().from("invites").select("email").eq("email", email).maybeSingle();
  return Boolean(data);
}

/**
 * Email + password sign-in, with no emails sent. The first password an allowed person enters becomes theirs.
 */
export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const dest = safeNext(String(form.get("next") || ""));

  if (!email.includes("@")) return { status: "error", message: "Enter a valid email." };
  if (password.length < 6) return { status: "error", message: "Passwords need at least 6 characters." };

  const admin = adminClient();
  const supabase = await userClient();

  // Returning user with the right password.
  const first = await supabase.auth.signInWithPassword({ email, password });
  if (!first.error) redirect(dest);

  if (!(await allowedToJoin(email, dest))) {
    return { status: "error", message: "SwitchTix is invite-only right now. Ask Tom to add your email, or open a deal link someone sent you." };
  }

  // First visit: create the account with this password (no confirmation email).
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { password_set: true },
  });

  if (created.error) {
    // The account already exists. If it never had a password (for example it was made with Google or an
    // earlier email link), set this one now; otherwise the password was wrong.
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

/** "Continue with Google". Only shown when NEXT_PUBLIC_GOOGLE_SIGNIN=on (after Google is set up in Supabase). */
export async function signInWithGoogle(form: FormData) {
  const dest = safeNext(String(form.get("next") || ""));
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = host && !process.env.NEXT_PUBLIC_SITE_URL ? `${proto}://${host}` : siteUrl();

  const supabase = await userClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${base}/auth/callback?next=${encodeURIComponent(dest)}` },
  });
  if (error || !data.url) redirect(`/signin?next=${encodeURIComponent(dest)}&error=google`);
  redirect(data.url);
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
