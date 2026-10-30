// Server-side only: uses the Supabase service role and the Stripe secret key.
import type Stripe from "stripe";
import { adminClient } from "./supabase";
import { stripe, stripeEnabled } from "./stripe";
import { processingFee, type Deal, type DealStatus, type FeeBreakdown } from "./types";

const db = () => adminClient();

export async function getDeal(id: string): Promise<Deal | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("deals").select("*").eq("id", id).maybeSingle();
  return (data as Deal) ?? null;
}

/** Moves a deal from one status to another only if it is still in an expected status (guards double-clicks and races). */
async function transition(id: string, from: DealStatus[], patch: Partial<Deal>) {
  const { data } = await db()
    .from("deals")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", from)
    .select("*")
    .maybeSingle();
  return (data as Deal) ?? null;
}

/** Checks Stripe for a deal whose buyer was sent to checkout, and records the payment once it succeeds. */
export async function syncPayment(deal: Deal): Promise<Deal> {
  if (deal.status !== "awaiting_payment" || !deal.checkout_session_id || !stripeEnabled()) return deal;
  const session = await stripe().checkout.sessions.retrieve(deal.checkout_session_id, { expand: ["payment_intent"] });

  if (session.payment_status === "paid") {
    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    const charge = pi?.latest_charge;
    const updated = await transition(deal.id, ["awaiting_payment"], {
      status: "paid",
      payment_intent_id: pi?.id ?? null,
      charge_id: typeof charge === "string" ? charge : charge?.id ?? null,
      paid_at: new Date().toISOString(),
    });
    return updated ?? (await getDeal(deal.id)) ?? deal;
  }

  if (session.status === "expired") {
    // Buyer never finished paying: put the deal back up for grabs.
    const reopened = await transition(deal.id, ["awaiting_payment"], {
      status: "open",
      buyer_id: null,
      buyer_name: null,
      checkout_session_id: null,
    });
    return reopened ?? deal;
  }
  return deal;
}

/** Releases money to the seller if the auto-release time has passed and nobody disputed. */
export async function maybeAutoRelease(deal: Deal): Promise<Deal> {
  if (deal.status !== "sent" || !deal.auto_release_at) return deal;
  if (new Date(deal.auto_release_at).getTime() > Date.now()) return deal;
  return (await release(deal, "auto")) ?? deal;
}

/** Brings a deal up to date with Stripe and the clock. Call before showing a deal. */
export async function refreshDeal(deal: Deal): Promise<Deal> {
  return maybeAutoRelease(await syncPayment(deal));
}

/** Marks the money released and pays the seller (or waits until they set up payouts). */
export async function release(deal: Deal, reason: "buyer_confirmed" | "auto" | "admin", note?: string) {
  const released = await transition(deal.id, ["paid", "sent", "disputed"], {
    status: "released",
    released_at: new Date().toISOString(),
    release_reason: reason,
    ...(reason === "admin" ? { resolution_note: note ?? null, resolved_at: new Date().toISOString() } : {}),
  });
  if (!released) return null;
  return payout(released);
}

/** Sends the held money to the seller's payout account, if they have one ready. */
export async function payout(deal: Deal): Promise<Deal> {
  if (deal.status !== "released" || deal.payout_status === "transferred") return deal;

  const { data: account } = await db()
    .from("payout_accounts")
    .select("stripe_account_id,payouts_ready")
    .eq("user_id", deal.seller_id)
    .maybeSingle();

  if (!account?.payouts_ready) {
    return (await setPayout(deal.id, { payout_status: "waiting_for_seller" })) ?? deal;
  }

  try {
    const transfer = await stripe().transfers.create(
      {
        amount: deal.price_cents,
        currency: "usd",
        destination: account.stripe_account_id,
        transfer_group: deal.id,
        ...(deal.charge_id ? { source_transaction: deal.charge_id } : {}),
        metadata: { deal_id: deal.id },
      },
      { idempotencyKey: `switchtix-transfer-${deal.id}` },
    );
    return (await setPayout(deal.id, { payout_status: "transferred", transfer_id: transfer.id })) ?? deal;
  } catch (err) {
    console.error("Transfer failed", deal.id, err);
    return (await setPayout(deal.id, { payout_status: "failed" })) ?? deal;
  }
}

async function setPayout(id: string, patch: Partial<Deal>) {
  const { data } = await db()
    .from("deals")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  return (data as Deal) ?? null;
}

/** Refunds the buyer in full. */
export async function refund(deal: Deal, from: DealStatus[], note?: string) {
  if (!deal.payment_intent_id) return null;
  const r = await stripe().refunds.create(
    { payment_intent: deal.payment_intent_id, metadata: { deal_id: deal.id } },
    { idempotencyKey: `switchtix-refund-${deal.id}` },
  );
  return transition(deal.id, from, {
    status: "refunded",
    refund_id: r.id,
    refunded_at: new Date().toISOString(),
    ...(note ? { resolution_note: note, resolved_at: new Date().toISOString() } : {}),
  });
}

/** Pays out any released deals that were waiting for this seller to set up payouts. */
export async function payPendingForSeller(userId: string) {
  const { data } = await db()
    .from("deals")
    .select("*")
    .eq("seller_id", userId)
    .eq("status", "released")
    .in("payout_status", ["waiting_for_seller", "failed"]);
  for (const deal of (data ?? []) as Deal[]) await payout(deal);
}

/** Reads the seller's Stripe account and records whether it can receive money. */
export async function refreshPayoutAccount(userId: string) {
  const { data: row } = await db().from("payout_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (!row) return null;
  const account = await stripe().accounts.retrieve(row.stripe_account_id);
  const ready = account.capabilities?.transfers === "active";
  if (ready !== row.payouts_ready) {
    await db()
      .from("payout_accounts")
      .update({ payouts_ready: ready, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }
  return { ...row, payouts_ready: ready, details_submitted: account.details_submitted };
}

export function isAdmin(email: string | undefined | null) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** True if this seller already received a payout this calendar month (Stripe charges its $2 seller fee once a month). */
export async function sellerPaidThisMonth(sellerId: string) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await db()
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .eq("payout_status", "transferred")
    .gte("released_at", start.toISOString());
  return (count ?? 0) > 0;
}

/** What the buyer pays for payment processing on this deal right now. */
export async function feeForDeal(deal: Deal): Promise<FeeBreakdown> {
  return processingFee(deal.price_cents, await sellerPaidThisMonth(deal.seller_id));
}
