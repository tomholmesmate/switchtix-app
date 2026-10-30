import Link from "next/link";
import { notFound } from "next/navigation";
import { advanceDeal } from "@/app/deals/actions";
import ShareButton from "@/app/s/[id]/ShareButton";
import { adminClient, currentUser } from "@/lib/supabase";
import { formatDate, money, type Deal } from "@/lib/types";

const ORDER = ["open", "accepted", "transferred", "released"] as const;

function StepButton({ id, step, label, secondary }: { id: string; step: string; label: string; secondary?: boolean }) {
  return (
    <form action={advanceDeal}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="step" value={step} />
      <button className={`btn ${secondary ? "secondary" : ""}`} type="submit">{label}</button>
    </form>
  );
}

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await adminClient().from("deals").select("*").eq("id", id).maybeSingle();
  const deal = data as Deal | null;
  if (!deal) notFound();

  const user = await currentUser();
  const isSeller = user?.id === deal.seller_id;
  const isBuyer = !!user && user.id === deal.buyer_id;

  // Once a deal is taken, only the two people in it can see the details.
  if (deal.status !== "open" && !isSeller && !isBuyer) {
    return (
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>This deal is already taken</h1>
        <p className="muted">Someone else accepted this deal.</p>
        <Link className="btn" href="/">Go to SwitchTix</Link>
      </div>
    );
  }

  const reached = deal.status === "cancelled" ? -1 : ORDER.indexOf(deal.status as (typeof ORDER)[number]);
  const steps = [
    "Deal created",
    `${deal.buyer_name ?? "Buyer"} pays into escrow (simulated)`,
    `${deal.seller_name ?? "Seller"} transfers the tickets in their ticket app`,
    "Buyer confirms the tickets arrived · money released to seller",
  ];

  return (
    <>
      {isNew && isSeller && (
        <div className="notice good">Deal created. Send this link to your buyer.</div>
      )}
      <div className="panel">
        <p className="muted small" style={{ margin: 0 }}>
          {isSeller ? "You’re selling" : isBuyer ? "You’re buying" : `${deal.seller_name ?? "A friend"} is selling`}
        </p>
        <h1 style={{ marginTop: 6 }}>{deal.event_name}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {[deal.venue, formatDate(deal.event_date), deal.seats].filter(Boolean).join(" · ")}
        </p>
        <p style={{ fontSize: "1.6rem", fontWeight: 800, margin: "14px 0 0" }}>{money(deal.price_cents)}</p>
        <p className="muted small" style={{ margin: "4px 0 0" }}>Beta: no real money moves. This walks through how escrow will work.</p>

        {deal.status === "cancelled" ? (
          <div className="notice bad">This deal was cancelled.</div>
        ) : (
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s} className={i <= reached ? "done" : i === reached + 1 ? "now" : ""}>
                <span className="dot">{i <= reached ? "✓" : i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="actions">
          {deal.status === "open" && isSeller && <ShareButton title={`Ticket deal: ${deal.event_name}`} />}
          {deal.status === "open" && !isSeller && user && <StepButton id={id} step="accept" label={`Accept and pay ${money(deal.price_cents)} (simulated)`} />}
          {deal.status === "open" && !user && (
            <Link className="btn" href={`/?next=/d/${id}`}>Sign in to accept</Link>
          )}
          {deal.status === "accepted" && isSeller && <StepButton id={id} step="transferred" label="I’ve sent the tickets" />}
          {deal.status === "accepted" && isBuyer && <p className="muted">Waiting for {deal.seller_name ?? "the seller"} to send the tickets through their ticket app.</p>}
          {deal.status === "transferred" && isBuyer && <StepButton id={id} step="received" label="I got the tickets" />}
          {deal.status === "transferred" && isSeller && <p className="muted">Waiting for {deal.buyer_name ?? "the buyer"} to confirm the tickets arrived.</p>}
          {deal.status === "released" && isBuyer && (
            <Link className="btn" href={`/mint?deal=${id}`}>Mint your stub from this deal</Link>
          )}
          {deal.status === "released" && isSeller && <div className="notice good">Done. In the live version, your money would be on its way.</div>}
          {["open", "accepted"].includes(deal.status) && (isSeller || isBuyer) && (
            <StepButton id={id} step="cancel" label="Cancel deal" secondary />
          )}
        </div>
      </div>
    </>
  );
}
