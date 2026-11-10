export type Stub = {
  id: string;
  owner_id: string;
  owner_name: string | null;
  event_name: string;
  event_date: string | null;
  venue: string | null;
  section: string | null;
  row_label: string | null;
  seat: string | null;
  went_with: string | null;
  note: string | null;
  image_path: string | null;
  mint_status: "pending" | "minting" | "minted" | "failed" | "off";
  token_id: string | null;
  tx_hash: string | null;
  deal_id: string | null;
  created_at: string;
};

export type DealStatus =
  | "open"
  | "awaiting_payment"
  | "paid"
  | "sent"
  | "disputed"
  | "released"
  | "refunded"
  | "cancelled";

export type Deal = {
  id: string;
  seller_id: string;
  seller_name: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  event_name: string;
  event_date: string | null;
  /** When the event starts (doors or show time), as an absolute time. */
  event_starts_at: string | null;
  /** IANA time zone the seller entered the start time in, for display. */
  event_time_zone: string | null;
  venue: string | null;
  seats: string | null;
  ticket_platform: string | null;
  price_cents: number;
  buyer_fee_cents: number;
  fee_breakdown: FeeBreakdown | null;
  status: DealStatus;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  charge_id: string | null;
  paid_at: string | null;
  sent_at: string | null;
  /** When the buyer said the transfer is accepted in their ticket app (no money moves). */
  transfer_accepted_at: string | null;
  auto_release_at: string | null;
  released_at: string | null;
  release_reason: string | null;
  payout_status: "none" | "waiting_for_seller" | "transferred" | "failed";
  transfer_id: string | null;
  refund_id: string | null;
  refunded_at: string | null;
  dispute_reason: string | null;
  dispute_image_path: string | null;
  disputed_at: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * "Seller gets paid when you get in": money releases this many hours after the event starts,
 * unless the buyer reports a problem first. The event itself proves the tickets were real.
 */
export const DOOR_WINDOW_HOURS = 2;

/** Used only when there is no future event start time (older deals, or tickets sent after the event began). */
export const FALLBACK_RELEASE_HOURS = 48;

/** When held money releases automatically once the seller has sent the tickets. */
export function releaseTime(deal: Pick<Deal, "event_starts_at">, now = new Date()): Date {
  const start = deal.event_starts_at ? new Date(deal.event_starts_at).getTime() : NaN;
  if (Number.isFinite(start) && start > now.getTime()) return new Date(start + DOOR_WINDOW_HOURS * 3600_000);
  return new Date(now.getTime() + FALLBACK_RELEASE_HOURS * 3600_000);
}

/** True once the event has started, so "I got in" can pay the seller straight away. */
export function eventStarted(deal: Pick<Deal, "event_starts_at">, now = new Date()) {
  return !deal.event_starts_at || new Date(deal.event_starts_at).getTime() <= now.getTime();
}

export const EVENT_TIME_ZONES = [
  { id: "America/Los_Angeles", label: "Pacific" },
  { id: "America/Denver", label: "Mountain" },
  { id: "America/Phoenix", label: "Arizona" },
  { id: "America/Chicago", label: "Central" },
  { id: "America/New_York", label: "Eastern" },
  { id: "Pacific/Honolulu", label: "Hawaii" },
  { id: "America/Anchorage", label: "Alaska" },
] as const;

/** Turns a local date ("2026-12-05") and time ("19:30") in a time zone into an absolute ISO time. */
export function zonedTimeToIso(date: string, time: string, timeZone: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t || +t[1] > 23 || +t[2] > 59 || +d[2] < 1 || +d[2] > 12 || +d[3] < 1 || +d[3] > 31) return null;
  const wallClock = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
  // Offset of the zone at a given instant, in ms (wall clock minus UTC).
  const offset = (instant: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .formatToParts(new Date(instant))
        .map((p) => [p.type, p.value]),
    );
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - instant;
  };
  let guess = wallClock - offset(wallClock);
  guess = wallClock - offset(guess); // second pass settles daylight-saving edges
  return Number.isFinite(guess) ? new Date(guess).toISOString() : null;
}

/** The event start in the event's own time zone, e.g. "Sat, Dec 5, 7:30 PM PST". */
export function formatEventStart(deal: Pick<Deal, "event_starts_at" | "event_time_zone">) {
  if (!deal.event_starts_at) return "";
  return new Date(deal.event_starts_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: deal.event_time_zone || "America/Los_Angeles",
    timeZoneName: "short",
  });
}

export const TICKET_PLATFORMS = ["Ticketmaster", "AXS", "SeatGeek", "Other ticket app transfer"] as const;

export const STATUS_LABEL: Record<DealStatus, string> = {
  open: "Waiting for buyer",
  awaiting_payment: "Buyer is paying",
  paid: "Paid · money held",
  sent: "Tickets sent · held until the event",
  disputed: "Under review",
  released: "Complete",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/**
 * Stripe's published US prices that the buyer's "payment processing" line covers.
 * SwitchTix adds nothing on top: the line is exactly what Stripe charges for the deal.
 */
export const STRIPE_COSTS = {
  cardPercent: 0.029, // card, Apple Pay, Google Pay, Link
  cardFixedCents: 30,
  payoutPercent: 0.0025, // sending the seller's money (Stripe Connect)
  payoutFixedCents: 25,
  sellerMonthlyCents: 200, // Stripe Connect, the first time a seller is paid in a calendar month
};

export type FeeBreakdown = {
  cardCents: number;
  payoutCents: number;
  sellerMonthlyCents: number;
  totalCents: number;
};

/**
 * The buyer's payment-processing fee for a ticket price, so SwitchTix nets exactly $0.
 * The card fee is charged on the total (ticket + this fee), hence the division.
 */
export function processingFee(priceCents: number, sellerPaidThisMonth: boolean): FeeBreakdown {
  const c = STRIPE_COSTS;
  const payoutCents = Math.ceil(priceCents * c.payoutPercent + c.payoutFixedCents);
  const sellerMonthlyCents = sellerPaidThisMonth ? 0 : c.sellerMonthlyCents;
  const otherCents = payoutCents + sellerMonthlyCents;
  const totalCents = Math.ceil((priceCents * c.cardPercent + c.cardFixedCents + otherCents) / (1 - c.cardPercent));
  return { cardCents: totalCents - otherCents, payoutCents, sellerMonthlyCents, totalCents };
}

export function displayName(email: string | undefined | null) {
  if (!email) return "A friend";
  return email.split("@")[0];
}

export function formatDate(d: string | null) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
  });
}

export function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
