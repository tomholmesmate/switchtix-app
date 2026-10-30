"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient, currentUser } from "@/lib/supabase";
import { displayName, type Deal, type DealStatus } from "@/lib/types";

function text(form: FormData, key: string, max = 120) {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v || null;
}

export async function createDeal(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/");
  const event_name = text(form, "event_name");
  const price = Number(String(form.get("price") ?? "").replace(/[^0-9.]/g, ""));
  if (!event_name || !Number.isFinite(price) || price <= 0) redirect("/deals/new?error=1");

  const { data, error } = await adminClient()
    .from("deals")
    .insert({
      seller_id: user.id,
      seller_name: displayName(user.email),
      event_name,
      event_date: text(form, "event_date", 10),
      venue: text(form, "venue"),
      seats: text(form, "seats"),
      price_cents: Math.round(price * 100),
      status: "open",
    })
    .select("id")
    .single();
  if (error || !data) redirect("/deals/new?error=1");
  redirect(`/d/${data.id}?new=1`);
}

type Step = "accept" | "transferred" | "received" | "cancel";

/** Moves a (simulated) deal forward. Only the right person can take each step. */
export async function advanceDeal(form: FormData) {
  const user = await currentUser();
  const id = String(form.get("id") ?? "");
  const step = String(form.get("step") ?? "") as Step;
  if (!user) redirect(`/?next=/d/${id}`);

  const db = adminClient();
  const { data } = await db.from("deals").select("*").eq("id", id).maybeSingle();
  const deal = data as Deal | null;
  if (!deal) redirect("/deals");

  const isSeller = deal.seller_id === user.id;
  const isBuyer = deal.buyer_id === user.id;
  let update: Partial<Deal> & { status: DealStatus } | null = null;

  if (step === "accept" && deal.status === "open" && !isSeller) {
    update = { status: "accepted", buyer_id: user.id, buyer_name: displayName(user.email) };
  } else if (step === "transferred" && deal.status === "accepted" && isSeller) {
    update = { status: "transferred" };
  } else if (step === "received" && deal.status === "transferred" && isBuyer) {
    update = { status: "released" };
  } else if (step === "cancel" && ["open", "accepted"].includes(deal.status) && (isSeller || isBuyer)) {
    update = { status: "cancelled" };
  }

  if (update) {
    // The status check guards against two people acting at the same moment.
    await db
      .from("deals")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", deal.status);
  }
  revalidatePath(`/d/${id}`);
  redirect(`/d/${id}`);
}
