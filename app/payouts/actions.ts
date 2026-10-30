"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { adminClient, currentUser, siteUrl } from "@/lib/supabase";

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host && !process.env.NEXT_PUBLIC_SITE_URL ? `${proto}://${host}` : siteUrl();
}

/** Creates (or reuses) the seller's Stripe test account and sends them to Stripe's setup form. */
export async function startPayoutSetup() {
  const user = await currentUser();
  if (!user) redirect("/?next=/payouts");
  if (!stripeEnabled()) redirect("/payouts?error=payments-off");

  const db = adminClient();
  const { data: row } = await db.from("payout_accounts").select("stripe_account_id").eq("user_id", user.id).maybeSingle();

  let accountId = row?.stripe_account_id as string | undefined;
  if (!accountId) {
    const account = await stripe().accounts.create({
      type: "express",
      country: "US",
      email: user.email ?? undefined,
      business_type: "individual",
      capabilities: { transfers: { requested: true } },
      business_profile: { product_description: "Selling event tickets to friends through SwitchTix escrow" },
      metadata: { switchtix_user_id: user.id },
    });
    accountId = account.id;
    await db.from("payout_accounts").upsert({ user_id: user.id, stripe_account_id: accountId, payouts_ready: false });
  }

  const base = await baseUrl();
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${base}/payouts?refresh=1`,
    return_url: `${base}/payouts?return=1`,
  });
  redirect(link.url);
}
