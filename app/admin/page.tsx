import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveDispute } from "@/app/deals/actions";
import { isAdmin, refreshDeal } from "@/lib/escrow";
import { adminClient, currentUser } from "@/lib/supabase";
import { STATUS_LABEL, formatDateTime, money, type Deal } from "@/lib/types";

export default async function Admin() {
  const user = await currentUser();
  if (!isAdmin(user?.email)) redirect("/collection");

  const db = adminClient();
  const { data } = await db.from("deals").select("*").order("updated_at", { ascending: false }).limit(50);
  const deals = await Promise.all(((data ?? []) as Deal[]).map((d) => refreshDeal(d).catch(() => d)));
  const disputes = deals.filter((d) => d.status === "disputed");

  const evidence = new Map<string, string>();
  for (const d of disputes) {
    if (!d.dispute_image_path) continue;
    const { data: signed } = await db.storage.from("evidence").createSignedUrl(d.dispute_image_path, 3600);
    if (signed?.signedUrl) evidence.set(d.id, signed.signedUrl);
  }

  return (
    <>
      <h1>Admin</h1>
      <p className="muted">Disputes wait here until you decide. The rule of thumb: an accepted transfer in the ticket app beats “I never got it”.</p>

      <h2>Open disputes ({disputes.length})</h2>
      {disputes.length === 0 && <p className="muted">Nothing to review.</p>}
      {disputes.map((d) => (
        <div key={d.id} className="panel">
          <strong>{d.event_name}</strong> · {money(d.price_cents)} · via {d.ticket_platform}
          <p className="muted small" style={{ margin: "6px 0" }}>
            Seller {d.seller_name} · Buyer {d.buyer_name} · Sent {formatDateTime(d.sent_at) || "not marked"} · Disputed{" "}
            {formatDateTime(d.disputed_at)}
          </p>
          <p>“{d.dispute_reason}”</p>
          {evidence.get(d.id) && (
            <a href={evidence.get(d.id)} target="_blank" rel="noreferrer">
              <img className="preview" src={evidence.get(d.id)} alt="Buyer’s screenshot" />
            </a>
          )}
          <form action={resolveDispute}>
            <input type="hidden" name="id" value={d.id} />
            <label htmlFor={`note-${d.id}`}>Note (shown to both)</label>
            <input id={`note-${d.id}`} name="note" placeholder="Transfer shows accepted on Oct 30" />
            <div className="actions">
              <button className="btn" name="outcome" value="release" type="submit">Release to seller</button>
              <button className="btn secondary" name="outcome" value="refund" type="submit">Refund buyer</button>
            </div>
          </form>
          <p className="small"><Link href={`/d/${d.id}`}>Open deal →</Link></p>
        </div>
      ))}

      <h2>Recent deals</h2>
      <div className="list">
        {deals.map((d) => (
          <Link key={d.id} href={`/d/${d.id}`} className="deal-row">
            <div>
              <strong>{d.event_name}</strong>
              <div className="muted small">
                {d.seller_name} → {d.buyer_name ?? "—"} · {money(d.price_cents)}
                {d.status === "released" ? ` · payout: ${d.payout_status.replace(/_/g, " ")}` : ""}
              </div>
            </div>
            <span className="chip">{STATUS_LABEL[d.status]}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
