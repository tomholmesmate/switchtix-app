import Link from "next/link";
import { currentUser, stubImageUrl, userClient } from "@/lib/supabase";
import { displayName, formatDate, type Stub } from "@/lib/types";

export default async function Collection() {
  const user = await currentUser();
  const supabase = await userClient();
  const { data } = await supabase
    .from("stubs")
    .select("*")
    .eq("owner_id", user!.id)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  const stubs = (data ?? []) as Stub[];

  return (
    <>
      <h1>{displayName(user!.email)}’s stubs</h1>
      <p className="muted">Every show, game and night out, kept for good.</p>
      <div className="actions">
        <Link className="btn" href="/mint">+ Mint a stub</Link>
        <Link className="btn secondary" href="/deals/new">Start a deal</Link>
      </div>

      <h2>Your collection ({stubs.length})</h2>
      {stubs.length === 0 ? (
        <div className="panel">
          <p style={{ marginTop: 0 }}>No stubs yet. Grab an old ticket stub (or a screenshot of a digital one) and mint your first.</p>
          <Link className="btn" href="/mint">Mint my first stub</Link>
        </div>
      ) : (
        <div className="grid">
          {stubs.map((s) => {
            const img = stubImageUrl(s.image_path);
            return (
              <Link key={s.id} href={`/s/${s.id}`} className="tile">
                {img ? <img src={img} alt="" /> : <div className="noimg">🎟️</div>}
                <div className="t">
                  <strong>{s.event_name}</strong>
                  <span className="muted small">{[s.venue, formatDate(s.event_date)].filter(Boolean).join(" · ")}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
