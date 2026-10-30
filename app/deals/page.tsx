import Link from "next/link";
import { refreshDeal } from "@/lib/escrow";
import { currentUser, userClient } from "@/lib/supabase";
import { STATUS_LABEL, formatDate, money, type Deal } from "@/lib/types";

export default async function Deals() {
  const user = await currentUser();
  const supabase = await userClient();
  const { data } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
  const mine = ((data ?? []) as Deal[]).filter((d) => d.seller_id === user!.id || d.buyer_id === user!.id);
  const deals = await Promise.all(mine.map((d) => refreshDeal(d).catch(() => d)));
  const owed = deals.filter((d) => d.seller_id === user!.id && d.status === "released" && d.payout_status !== "transferred");

  return (
    <>
      <h1>Deals</h1>
      <Link className="btn block" href="/deals/new">+ Sell tickets</Link>

      {owed.length > 0 && (
        <div className="notice">
          You have {money(owed.reduce((s, d) => s + d.price_cents, 0))} waiting. <Link href="/payouts">Set up payouts →</Link>
        </div>
      )}

      <div style={{ marginTop: 20 }} />
      {deals.length === 0 ? (
        <p className="muted center">No deals yet. Sell tickets, or open a deal link someone sent you.</p>
      ) : (
        <div className="list">
          {deals.map((d) => (
            <Link key={d.id} href={`/d/${d.id}`} className="deal-row">
              <div>
                <strong>{d.event_name}</strong>
                <div className="muted small">
                  {d.seller_id === user!.id ? "Selling" : "Buying"} · {money(d.price_cents)}
                  {d.event_date ? ` · ${formatDate(d.event_date)}` : ""}
                </div>
              </div>
              <span
                className={`chip ${
                  d.status === "released" ? "good" : ["cancelled", "refunded", "disputed"].includes(d.status) ? "bad" : "warn"
                }`}
              >
                {STATUS_LABEL[d.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
