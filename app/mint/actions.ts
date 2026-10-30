"use server";

import { redirect } from "next/navigation";
import { adminClient, currentUser } from "@/lib/supabase";
import { chainEnabled } from "@/lib/chain";
import { mintStub } from "@/lib/mint";
import { displayName } from "@/lib/types";

function text(form: FormData, key: string, max = 120) {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v || null;
}

export async function createStub(form: FormData): Promise<{ error: string } | void> {
  const user = await currentUser();
  if (!user) return { error: "Please sign in again." };

  const event_name = text(form, "event_name");
  if (!event_name) return { error: "Add the event name." };

  const db = adminClient();

  // Only link a deal the user actually bought and completed.
  let deal_id = text(form, "deal_id", 40);
  if (deal_id) {
    const { data: deal } = await db.from("deals").select("buyer_id,status").eq("id", deal_id).maybeSingle();
    if (!deal || deal.buyer_id !== user.id || deal.status !== "released") deal_id = null;
  }

  const { data: stub, error } = await db
    .from("stubs")
    .insert({
      owner_id: user.id,
      owner_name: displayName(user.email),
      event_name,
      event_date: text(form, "event_date", 10),
      venue: text(form, "venue"),
      section: text(form, "section", 20),
      row_label: text(form, "row_label", 20),
      seat: text(form, "seat", 20),
      went_with: text(form, "went_with"),
      note: text(form, "note", 500),
      deal_id,
      mint_status: chainEnabled() ? "pending" : "off",
    })
    .select("id")
    .single();
  if (error || !stub) return { error: "Couldn’t save your stub. Try again." };

  const photo = form.get("photo");
  if (photo instanceof Blob && photo.size > 0) {
    if (photo.size > 4 * 1024 * 1024) return { error: "That photo is too large." };
    const path = `${user.id}/${stub.id}.jpg`;
    const { error: upErr } = await db.storage.from("stubs").upload(path, photo, { contentType: "image/jpeg", upsert: true });
    if (!upErr) await db.from("stubs").update({ image_path: path }).eq("id", stub.id);
  }

  await mintStub(stub.id);
  redirect(`/s/${stub.id}?new=1`);
}
