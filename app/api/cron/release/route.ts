import { NextResponse, type NextRequest } from "next/server";
import { release, syncPayment } from "@/lib/escrow";
import { adminClient } from "@/lib/supabase";
import type { Deal } from "@/lib/types";

/**
 * Daily safety net (Vercel Cron): releases deals whose release time (2 hours after the event starts) has passed and
 * catches payments whose buyer closed the browser before returning to SwitchTix.
 * Deals are also brought up to date whenever someone opens them.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = adminClient();
  const now = new Date().toISOString();
  const { data: due } = await db.from("deals").select("*").eq("status", "sent").lte("auto_release_at", now);
  let released = 0;
  for (const deal of (due ?? []) as Deal[]) {
    if (await release(deal, "auto")) released++;
  }

  const { data: paying } = await db.from("deals").select("*").eq("status", "awaiting_payment");
  let synced = 0;
  for (const deal of (paying ?? []) as Deal[]) {
    try {
      const after = await syncPayment(deal);
      if (after.status !== deal.status) synced++;
    } catch (err) {
      console.error("sync failed", deal.id, err);
    }
  }

  return NextResponse.json({ released, synced });
}
