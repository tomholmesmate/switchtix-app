import Link from "next/link";
import { notFound } from "next/navigation";
import {
  abandonPayment,
  cancelDeal,
  confirmReceived,
  markSent,
  openDispute,
  startPayment,
} from "@/app/deals/actions";
import ShareButton from "@/app/s/[id]/ShareButton";
import { feeForDeal, getDeal, refreshDeal } from "@/lib/escrow";
import { currentUser } from "@/lib/supabase";
import {
  DOOR_WINDOW_HOURS,
  STATUS_LABEL,
  eventStarted,
  formatEventStart,
  formatDate,
  formatDateTime,
  money,
  type Deal,
  type FeeBreakdown,
} from "@/lib/types";

const ERRORS: Record<string, string> = {
  taken: "Someone else already took this deal.",
  "payments-off": "Payments aren’t switched on yet. Ask Tom to add the Stripe test key.",
  reason: "Tell us what went wrong so Tom can review it.",
  "too-big": "That screenshot is too large. Try a smaller one (under 4 MB).",
};

function Action({ action, id, label, secondary }: { action: (f: FormData) => Promise<void>; id: string; label: string; secondary?: boolean }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className={`btn ${secondary ? "secondary" : ""}`} type="submit">{label}</button>
    </form>
  );
}

function stepIndex(d: Deal) {
  switch (d.status) {
    case "open":
    case "awaiting_payment":
      return 0;
    case "paid":
      return 1;
    case "sent":
      return d.transfer_accepted_at ? 3 : 2;
    case "disputed":
      return 2;
    case "released":
      return d.payout_status === "transferred" ? 4 : 3;
    default:
      return -1;
  }
}

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; paid?: string; released?: string; accepted?: string; error?: string; checkout?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const found = await getDeal(id);
  if (!found) notFound();
  const deal = await refreshDeal(found);

  const user = await currentUser();
  const isSeller = user?.id === deal.seller_id;
  const isBuyer = !!user && user.id === deal.buyer_id;
  const buyer = deal.buyer_name ?? "the buyer";
  const seller = deal.seller_name ?? "the seller";
  const app = deal.ticket_platform ?? "the ticket app";

  if (deal.status !== "open" && !isSeller && !isBuyer) {
    return (
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>This deal is already taken</h1>
        <p className="muted">Someone else is buying these tickets.</p>
        <Link className="btn" href="/">Go to SwitchTix</Link>
      </div>
    );
  }

  const reached = stepIndex(deal);
  const steps = [
    "Deal created",
    `${isBuyer ? "You pay" : `${buyer} pays`} · SwitchTix holds the money`,
    `${isSeller ? "You send" : `${seller} sends`} the tickets in ${app}`,
    `${isBuyer ? "You accept" : `${buyer} accepts`} the transfer in ${app}`,
    `${isSeller ? "You get" : `${seller} gets`} paid ${DOOR_WINDOW_HOURS} hours after the event starts, unless ${isBuyer ? "you" : buyer} can’t get in`,
  ];
  const started = eventStarted(deal);
  const when = formatEventStart(deal) || formatDate(deal.event_date);
  // Payment processing: stored once the buyer starts paying, otherwise worked out live.
  const fee: FeeBreakdown =
    deal.fee_breakdown && deal.buyer_fee_cents > 0 && deal.status !== "open" ? deal.fee_breakdown : await feeForDeal(deal);
  const total = deal.price_cents + fee.totalCents;

  return (
    <>
      {q.new && isSeller && <div className="notice good">Deal created. Send this link to your buyer.</div>}
      {q.paid && isBuyer && deal.status === "paid" && (
        <div className="notice good">Payment received. SwitchTix is holding {money(deal.price_cents)} until after the event.</div>
      )}
      {q.paid && isBuyer && deal.status === "awaiting_payment" && (
        <div className="notice">Confirming your payment… refresh in a moment.</div>
      )}
      {q.released && isBuyer && deal.status === "released" && (
        <div className="notice good">Done. The money is on its way to {seller}. Enjoy the show!</div>
      )}
      {q.accepted && isBuyer && deal.status === "sent" && (
        <div className="notice good">Got it. Your money stays held until after the event, so you’re covered if anything goes wrong at the door.</div>
      )}
      {q.checkout === "cancelled" && isBuyer && <div className="notice">Payment not finished. You can try again or back out below.</div>}
      {q.error && ERRORS[q.error] && <div className="notice bad">{ERRORS[q.error]}</div>}

      <div className="panel">
        <p className="muted small" style={{ margin: 0 }}>
          {isSeller ? "You’re selling" : isBuyer ? "You’re buying" : `${seller} is selling`}
        </p>
        <h1 style={{ marginTop: 6 }}>{deal.event_name}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {[deal.venue, when, deal.seats].filter(Boolean).join(" · ")}
        </p>
        <div className="seats" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <span className="chip">Sent via {app}</span>
          <span className={`chip ${deal.status === "released" ? "good" : ["refunded", "cancelled", "disputed"].includes(deal.status) ? "bad" : "warn"}`}>
            {STATUS_LABEL[deal.status]}
          </span>
        </div>
        <PriceBox deal={deal} fee={fee} isSeller={isSeller} />

        <EscrowBox deal={deal} isBuyer={isBuyer} isSeller={isSeller} app={app} buyer={buyer} seller={seller} />

        {!["cancelled", "refunded"].includes(deal.status) && (
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
          {/* Waiting for a buyer */}
          {deal.status === "open" && isSeller && <ShareButton title={`Ticket deal: ${deal.event_name}`} />}
          {deal.status === "open" && !isSeller && user && (
            <Action action={startPayment} id={id} label={`Pay ${money(total)} safely`} />
          )}
          {deal.status === "open" && !user && <Link className="btn" href={`/signin?next=/d/${id}`}>Sign in to buy</Link>}

          {/* Buyer is at checkout */}
          {deal.status === "awaiting_payment" && isBuyer && (
            <>
              <Action action={startPayment} id={id} label="Continue to payment" />
              <Action action={abandonPayment} id={id} label="Never mind" secondary />
            </>
          )}

          {/* Paid: seller sends */}
          {deal.status === "paid" && isSeller && <Action action={markSent} id={id} label="I’ve sent the tickets" />}

          {/* Before the event: buyer says the transfer is accepted (money stays held). After it starts: "I got in" pays the seller. */}
          {(deal.status === "sent" || deal.status === "paid") && isBuyer && started && (
            <Action action={confirmReceived} id={id} label={`I got in · pay ${seller} now`} />
          )}
          {(deal.status === "sent" || deal.status === "paid") && isBuyer && !started && !deal.transfer_accepted_at && (
            <Action action={confirmReceived} id={id} label={`I accepted the tickets in ${app}`} />
          )}

          {/* Cancels */}
          {deal.status === "open" && isSeller && <Action action={cancelDeal} id={id} label="Cancel deal" secondary />}
          {deal.status === "awaiting_payment" && isSeller && <Action action={cancelDeal} id={id} label="Cancel deal" secondary />}
          {deal.status === "paid" && isSeller && (
            <Action action={cancelDeal} id={id} label="Cancel and refund the buyer" secondary />
          )}
        </div>

        {deal.status === "open" && !isSeller && user && (
          <p className="muted small">Test mode: use card 4242 4242 4242 4242, any future date, any CVC and ZIP.</p>
        )}

        {/* Buyer can report a problem while money is held */}
        {isBuyer && ["paid", "sent"].includes(deal.status) && (
          <details className="panel" style={{ background: "var(--surface-2)" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Something’s wrong, or I couldn’t get in</summary>
            <p className="muted small">
              This freezes the money and Tom reviews it. Use it if the tickets never arrived, the transfer was cancelled, or
              they didn’t scan at the door. Add a photo of the error screen or your {app} account if you can.
              {deal.auto_release_at && <> Report before {formatDateTime(deal.auto_release_at)}.</>}
            </p>
            <form action={openDispute}>
              <input type="hidden" name="id" value={id} />
              <label htmlFor="reason">What happened?</label>
              <textarea id="reason" name="reason" required maxLength={1000} placeholder="The tickets didn’t scan at the gate…" />
              <label htmlFor="screenshot">Photo or screenshot (optional)</label>
              <input id="screenshot" name="screenshot" type="file" accept="image/*" />
              <button className="btn block" type="submit">Report a problem</button>
            </form>
          </details>
        )}
      </div>
    </>
  );
}

function EscrowBox({
  deal,
  isBuyer,
  isSeller,
  app,
  buyer,
  seller,
}: {
  deal: Deal;
  isBuyer: boolean;
  isSeller: boolean;
  app: string;
  buyer: string;
  seller: string;
}) {
  const amount = money(deal.price_cents);
  let tone = "";
  let body: React.ReactNode = null;

  switch (deal.status) {
    case "open":
      body = isSeller
        ? "Waiting for your buyer to pay. Their money will be held by SwitchTix, not sent to you yet."
        : `Pay into escrow. ${seller} only gets the money once you get in: ${DOOR_WINDOW_HOURS} hours after the event starts, unless you report a problem.`;
      break;
    case "awaiting_payment":
      body = isBuyer ? "Finish paying to lock in these tickets." : `${buyer} is paying now.`;
      break;
    case "paid":
      tone = "good";
      body = isSeller ? (
        <>
          <strong>{amount} is held by SwitchTix.</strong> Now send the tickets to {buyer} using {app}’s transfer
          button, then tap “I’ve sent the tickets”.
        </>
      ) : (
        <>
          <strong>Your {amount} is held safely until after the event.</strong> {seller} will send the tickets to your {app}{" "}
          account. Accept the transfer there, then tap “I accepted the tickets”.
        </>
      );
      break;
    case "sent":
      tone = "good";
      body = isBuyer ? (
        deal.transfer_accepted_at ? (
          <>
            <strong>You’re all set. Your {amount} stays held until after the event.</strong> If the tickets don’t scan, tap
            “Something’s wrong” before {formatDateTime(deal.auto_release_at)}. Otherwise it releases to {seller} automatically.
          </>
        ) : (
          <>
            <strong>Check your {app} app and accept the transfer,</strong> then tap “I accepted the tickets”. Your money stays
            held until {formatDateTime(deal.auto_release_at)}, {DOOR_WINDOW_HOURS} hours after the event starts.
          </>
        )
      ) : (
        <>
          <strong>{amount} is still held.</strong>
          {deal.transfer_accepted_at ? ` ${buyer} accepted the tickets.` : ""} It releases to you at{" "}
          {formatDateTime(deal.auto_release_at)}, {DOOR_WINDOW_HOURS} hours after the event starts, unless {buyer} can’t get
          in. If they tap “I got in”, it releases sooner.
        </>
      );
      break;
    case "disputed":
      tone = "bad";
      body = (
        <>
          <strong>{amount} is frozen while Tom reviews this deal.</strong>
          {deal.dispute_reason && <span className="muted"> {isBuyer ? "You said" : `${buyer} said`}: “{deal.dispute_reason}”</span>}
        </>
      );
      break;
    case "released":
      tone = "good";
      if (isBuyer) {
        body = (
          <>
            Done. {amount} released to {seller}. Enjoy the show!
            <br />
            Got tickets of your own you can’t use? <Link href="/deals/new">Sell them safely with SwitchTix →</Link>
          </>
        );
      } else if (deal.payout_status === "transferred") {
        body = <>Done. {amount} has been paid out to your payout account.</>;
      } else if (deal.payout_status === "failed") {
        tone = "bad";
        body = (
          <>
            {amount} is released to you, but the payout didn’t go through. <Link href="/payouts">Check your payout setup →</Link>
          </>
        );
      } else {
        body = (
          <>
            <strong>{amount} is released to you.</strong> <Link href="/payouts">Set up payouts to receive it →</Link>
          </>
        );
      }
      break;
    case "refunded":
      tone = "bad";
      body = <>Refunded. {amount} went back to {isBuyer ? "you" : buyer}.{deal.resolution_note ? ` (${deal.resolution_note})` : ""}</>;
      break;
    case "cancelled":
      tone = "bad";
      body = "This deal was cancelled. No money changed hands.";
      break;
  }

  return <div className={`notice ${tone}`}>{body}</div>;
}

function PriceBox({ deal, fee, isSeller }: { deal: Deal; fee: FeeBreakdown; isSeller: boolean }) {
  const total = deal.price_cents + fee.totalCents;
  if (isSeller) {
    return (
      <div className="pricebox">
        <div className="price-row big"><span>You receive</span><span className="num">{money(deal.price_cents)}</span></div>
        <p className="muted small">The full price. The buyer pays the payment processing on top, and SwitchTix keeps nothing.</p>
      </div>
    );
  }
  return (
    <div className="pricebox">
      <div className="price-row"><span>Tickets</span><span className="num">{money(deal.price_cents)}</span></div>
      <div className="price-row"><span>Payment processing</span><span className="num">{money(fee.totalCents)}</span></div>
      <details className="price-detail">
        <summary>Where the {money(fee.totalCents)} goes</summary>
        <div className="price-row"><span>Card or Apple Pay processing (Stripe, 2.9% + 30¢)</span><span className="num">{money(fee.cardCents)}</span></div>
        <div className="price-row"><span>Sending the seller their money (Stripe, 0.25% + 25¢)</span><span className="num">{money(fee.payoutCents)}</span></div>
        <div className="price-row">
          <span>{fee.sellerMonthlyCents ? "Stripe’s monthly fee for paying this seller" : "Stripe’s monthly seller fee (already covered this month)"}</span>
          <span className="num">{money(fee.sellerMonthlyCents)}</span>
        </div>
        <div className="price-row keep"><span>SwitchTix keeps</span><span className="num">$0.00</span></div>
      </details>
      <div className="price-row big"><span>Total</span><span className="num">{money(total)}</span></div>
      <p className="muted small">The seller receives the full {money(deal.price_cents)}.</p>
    </div>
  );
}
