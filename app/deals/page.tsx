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
      <p className="muted">
        Sell tickets to anyone with a deal link. The buyer’s money is held by SwitchTix until they confirm the tickets
        arrived, so nobody has to go first on trust. You keep your full price. <strong>Beta: Stripe test cards only, no real money.</strong>
      </p>
      <div className="actions">
        <Link className="btn" href="/deals/new">+ Start a deal</Link>
        <Link className="btn secondary" href="/payouts">Payouts</Link>
      </div>

      {owed.length > 0 && (
        <div className="notice">
          You have {money(owed.reduce((s, d) => s + d.price_cents, 0))} waiting. <Link href="/payouts">Set up payouts →</Link>
        </div>
      )}

      <h2>Your deals</h2>
      {deals.length === 0 ? (
        <p className="muted">No deals yet.</p>
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
