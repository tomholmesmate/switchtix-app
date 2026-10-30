"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { feeForDeal, getDeal, isAdmin, refreshDeal, refund, release } from "@/lib/escrow";
import { emailAdmins, emailUser } from "@/lib/notify";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { adminClient, currentUser, siteUrl } from "@/lib/supabase";
import { AUTO_RELEASE_HOURS, TICKET_PLATFORMS, displayName, formatDateTime, money, type Deal } from "@/lib/types";

function text(form: FormData, key: string, max = 120) {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v || null;
}

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host && !process.env.NEXT_PUBLIC_SITE_URL ? `${proto}://${host}` : siteUrl();
}

/** During the beta, anyone can buy from a deal link, but only invited people can sell. */
export async function canSell(email: string | undefined | null) {
  if (!email) return false;
  const { data } = await adminClient().from("invites").select("email").eq("email", email.toLowerCase()).maybeSingle();
  return Boolean(data);
}

async function signedIn(next: string) {
  const user = await currentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return user;
}

function back(id: string, flag?: string): never {
  redirect(`/d/${id}${flag ? `?${flag}` : ""}`);
}

export async function createDeal(form: FormData) {
  const user = await signedIn("/deals/new");
  if (!(await canSell(user.email))) redirect("/deals/new?error=invite");
  const event_name = text(form, "event_name");
  const platform = text(form, "ticket_platform");
  const price = Number(String(form.get("price") ?? "").replace(/[^0-9.]/g, ""));
  const confirmed = form.get("confirm_holding") === "on";
  if (
    !event_name ||
    !Number.isFinite(price) ||
    price < 1 ||
    price > 5000 ||
    !platform ||
    !(TICKET_PLATFORMS as readonly string[]).includes(platform) ||
    !confirmed
  ) {
    redirect("/deals/new?error=1");
  }

  const { data, error } = await adminClient()
    .from("deals")
    .insert({
      seller_id: user.id,
      seller_name: displayName(user.email),
      event_name,
      event_date: text(form, "event_date", 10),
      venue: text(form, "venue"),
      seats: text(form, "seats"),
      ticket_platform: platform,
      price_cents: Math.round(price * 100),
      status: "open",
    })
    .select("id")
    .single();
  if (error || !data) redirect("/deals/new?error=1");
  redirect(`/d/${data.id}?new=1`);
}

/** Buyer: claim the deal and pay into escrow through Stripe Checkout (test mode). */
export async function startPayment(form: FormData) {
  const id = String(form.get("id") ?? "");
  const user = await signedIn(`/d/${id}`);
  if (!stripeEnabled()) back(id, "error=payments-off");

  let deal = await getDeal(id);
  if (!deal) redirect("/deals");
  deal = await refreshDeal(deal);
  if (deal.seller_id === user.id) back(id);

  const db = adminClient();
  if (deal.status === "open") {
    const { data } = await db
      .from("deals")
      .update({
        status: "awaiting_payment",
        buyer_id: user.id,
        buyer_name: displayName(user.email),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "open")
      .select("*")
      .maybeSingle();
    if (!data) back(id, "error=taken");
    deal = data as Deal;
  } else if (!(deal.status === "awaiting_payment" && deal.buyer_id === user.id)) {
    back(id, "error=taken");
  }

  const fee = await feeForDeal(deal);
  await db.from("deals").update({ buyer_fee_cents: fee.totalCents, fee_breakdown: fee }).eq("id", id);

  const base = await baseUrl();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: deal.price_cents,
          product_data: {
            name: `${deal.event_name} — tickets from ${deal.seller_name ?? "a friend"}`,
            description: "Held by SwitchTix until you confirm the tickets arrived. The seller receives this full amount.",
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: fee.totalCents,
          product_data: {
            name: "Payment processing",
            description: "Exactly what Stripe charges to take your payment and pay the seller. SwitchTix keeps $0.",
          },
        },
      },
    ],
    payment_intent_data: { transfer_group: deal.id, metadata: { deal_id: deal.id, processing_fee_cents: String(fee.totalCents) } },
    metadata: { deal_id: deal.id },
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    success_url: `${base}/d/${deal.id}?paid=1`,
    cancel_url: `${base}/d/${deal.id}?checkout=cancelled`,
  });

  await db.from("deals").update({ checkout_session_id: session.id }).eq("id", id);
  redirect(session.url!);
}

/** Buyer backs out before paying: the deal goes back up. */
export async function abandonPayment(form: FormData) {
  const id = String(form.get("id") ?? "");
  const user = await signedIn(`/d/${id}`);
  const deal = await getDeal(id);
  if (!deal || deal.buyer_id !== user.id) back(id);
  const fresh = await refreshDeal(deal!);
  if (fresh.status === "awaiting_payment") {
    if (fresh.checkout_session_id) {
      try {
        await stripe().checkout.sessions.expire(fresh.checkout_session_id);
      } catch {
        // already expired or completed
      }
    }
    const recheck = await refreshDeal((await getDeal(id))!);
    if (recheck.status === "awaiting_payment") {
      await adminClient()
        .from("deals")
        .update({ status: "open", buyer_id: null, buyer_name: null, checkout_session_id: null })
        .eq("id", id)
        .eq("status", "awaiting_payment");
    }
  }
  back(id);
}

/** Seller: tickets were sent through the ticket app. Starts the auto-release clock. */
export async function markSent(form: FormData) {
  const id = String(form.get("id") ?? "");
  const user = await signedIn(`/d/${id}`);
  const deal = await getDeal(id);
  if (!deal || deal.seller_id !== user.id) back(id);
  const now = new Date();
  const autoRelease = new Date(now.getTime() + AUTO_RELEASE_HOURS * 3600_000).toISOString();
  const { data: sent } = await adminClient()
    .from("deals")
    .update({ status: "sent", sent_at: now.toISOString(), auto_release_at: autoRelease, updated_at: now.toISOString() })
    .eq("id", id)
    .eq("status", "paid")
    .select("*")
    .maybeSingle();
  if (sent) {
    const d = sent as Deal;
    await emailUser(
      d.buyer_id,
      `Your ${d.event_name} tickets are on the way`,
      [
        `${d.seller_name ?? "The seller"} says they've sent your tickets through ${d.ticket_platform ?? "the ticket app"}.`,
        `Open ${d.ticket_platform ?? "the ticket app"}, accept the transfer, then tap "I got the tickets" on SwitchTix.`,
        `If anything's wrong, tap "Something's wrong" before ${formatDateTime(autoRelease)}. After that, the ${money(d.price_cents)} is released to the seller automatically.`,
      ],
      `/d/${d.id}`,
      "Open the deal",
    );
  }
  back(id);
}

/** Buyer: tickets arrived. Releases the money to the seller. */
export async function confirmReceived(form: FormData) {
  const id = String(form.get("id") ?? "");
  const user = await signedIn(`/d/${id}`);
  const deal = await getDeal(id);
  if (!deal || deal.buyer_id !== user.id) back(id);
  if (deal.status === "paid" || deal.status === "sent") await release(deal, "buyer_confirmed");
  back(id, "released=1");
}

/** Buyer: something is wrong. Freezes the money until Tom reviews it. */
export async function openDispute(form: FormData) {
  const id = String(form.get("id") ?? "");
  const user = await signedIn(`/d/${id}`);
  const deal = await getDeal(id);
  if (!deal || deal.buyer_id !== user.id || !["paid", "sent"].includes(deal.status)) back(id);
  const reason = text(form, "reason", 1000);
  if (!reason) back(id, "error=reason");

  const db = adminClient();
  let image_path: string | null = null;
  const file = form.get("screenshot");
  if (file instanceof File && file.size > 0) {
    if (file.size > 4 * 1024 * 1024) back(id, "error=too-big");
    const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5);
    image_path = `${id}/buyer-${Date.now()}.${ext}`;
    const { error } = await db.storage.from("evidence").upload(image_path, file, { contentType: file.type || "image/jpeg" });
    if (error) image_path = null;
  }

  await db
    .from("deals")
    .update({
      status: "disputed",
      dispute_reason: reason,
      dispute_image_path: image_path,
      disputed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["paid", "sent"]);
  await emailAdmins(
    `Dispute on ${deal.event_name} (${money(deal.price_cents)})`,
    [`${deal.buyer_name ?? "The buyer"} reported a problem with ${deal.seller_name ?? "the seller"}'s deal.`, `They said: "${reason}"`],
    "/admin",
    "Review on Admin",
  );
  await emailUser(
    deal.seller_id,
    `Your buyer reported a problem with ${deal.event_name}`,
    [
      `${deal.buyer_name ?? "Your buyer"} says something's wrong. The money is held while Tom reviews it.`,
      `If you did send the tickets, keep a screenshot of the transfer showing as accepted in ${deal.ticket_platform ?? "your ticket app"}. That settles most cases.`,
    ],
    `/d/${deal.id}`,
    "Open the deal",
  );
  back(id);
}

/** Either side cancels. Before payment it just closes; after payment (but before sending) the buyer is refunded. */
export async function cancelDeal(form: FormData) {
  const id = String(form.get("id") ?? "");
  const user = await signedIn(`/d/${id}`);
  let deal = await getDeal(id);
  if (!deal) redirect("/deals");
  deal = await refreshDeal(deal);
  const isSeller = deal.seller_id === user.id;

  if (deal.status === "open" && isSeller) {
    await adminClient().from("deals").update({ status: "cancelled" }).eq("id", id).eq("status", "open");
  } else if (deal.status === "awaiting_payment" && isSeller) {
    if (deal.checkout_session_id) {
      try {
        await stripe().checkout.sessions.expire(deal.checkout_session_id);
      } catch {
        // already finished
      }
    }
    const fresh = await refreshDeal((await getDeal(id))!);
    if (fresh.status === "paid") await refund(fresh, ["paid"], "Seller cancelled before sending");
    else await adminClient().from("deals").update({ status: "cancelled" }).eq("id", id).in("status", ["open", "awaiting_payment"]);
  } else if (deal.status === "paid" && isSeller) {
    // Only the seller can cancel once paid; a buyer who never got tickets reports a problem instead,
    // so a seller who already sent them can't be left with no tickets and no money.
    await refund(deal, ["paid"], "Seller cancelled before sending the tickets");
  }
  back(id);
}

/** Tom: settle a dispute by releasing to the seller or refunding the buyer. */
export async function resolveDispute(form: FormData) {
  const id = String(form.get("id") ?? "");
  const outcome = String(form.get("outcome") ?? "");
  const note = text(form, "note", 500) ?? undefined;
  const user = await signedIn("/admin");
  if (!isAdmin(user.email)) redirect("/collection");
  const deal = await getDeal(id);
  if (deal?.status === "disputed") {
    if (outcome === "release") await release(deal, "admin", note);
    if (outcome === "refund") await refund(deal, ["disputed"], note ?? "Refunded after review");
  }
  redirect("/admin");
}
