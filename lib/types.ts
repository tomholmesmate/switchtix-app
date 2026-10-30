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

export type DealStatus = "open" | "accepted" | "transferred" | "released" | "cancelled";

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
  price_cents: number;
  status: DealStatus;
  created_at: string;
  updated_at: string;
};

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

export function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
