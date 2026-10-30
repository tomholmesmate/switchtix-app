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
  venue: string | null;
  seats: string | null;
  ticket_platform: string | null;
  price_cents: number;
  status: DealStatus;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  charge_id: string | null;
  paid_at: string | null;
  sent_at: string | null;
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

/** Hours after the seller marks tickets sent before money releases automatically (unless disputed). */
export const AUTO_RELEASE_HOURS = 48;

export const TICKET_PLATFORMS = ["Ticketmaster", "AXS", "SeatGeek", "Other ticket app transfer"] as const;

export const STATUS_LABEL: Record<DealStatus, string> = {
  open: "Waiting for buyer",
  awaiting_payment: "Buyer is paying",
  paid: "Paid · money held",
  sent: "Tickets sent · money held",
  disputed: "Under review",
  released: "Complete",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/** The fee SwitchTix plans to charge after the beta: 6% split between buyer and seller, $4.99 minimum. */
export function plannedFeeEachSide(priceCents: number) {
  return Math.ceil(Math.max(499, Math.round(priceCents * 0.06)) / 2);
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
