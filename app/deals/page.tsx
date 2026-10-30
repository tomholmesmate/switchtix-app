import Link from "next/link";
import { currentUser, userClient } from "@/lib/supabase";
import { formatDate, money, type Deal } from "@/lib/types";

const LABEL: Record<Deal["status"], string> = {
  open: "Waiting for buyer",
  accepted: "Paid into escrow",
  transferred: "Tickets sent",
  released: "Complete",
  cancelled: "Cancelled",
};

export default async function Deals() {
  const user = await currentUser();
  const supabase = await userClient();
  const { data } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
  const deals = ((data ?? []) as Deal[]).filter((d) => d.seller_id === user!.id || d.buyer_id === user!.id);

  return (
    <>
      <h1>Deals</h1>
      <p className="muted">
        Sell a ticket to a friend with a deal link. The buyer’s money waits in escrow until they confirm the tickets
        arrived. <strong>Beta: no real money moves.</strong>
      </p>
      <div className="actions">
        <Link className="btn" href="/deals/new">+ Start a deal</Link>
      </div>

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
              <span className={`chip ${d.status === "released" ? "good" : d.status === "cancelled" ? "bad" : "warn"}`}>
                {LABEL[d.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
