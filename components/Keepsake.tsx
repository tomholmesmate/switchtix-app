import { EXPLORER } from "@/lib/chain";
import { stubImageUrl } from "@/lib/supabase";
import { formatDate, type Stub } from "@/lib/types";

const STATUS: Record<Stub["mint_status"], { label: string; tone: string }> = {
  minted: { label: "Minted on Base testnet", tone: "good" },
  minting: { label: "Minting…", tone: "warn" },
  pending: { label: "Saved · mint coming soon", tone: "" },
  failed: { label: "Saved · mint didn’t go through", tone: "bad" },
  off: { label: "Saved", tone: "" },
};

export default function Keepsake({ stub }: { stub: Stub }) {
  const img = stubImageUrl(stub.image_path);
  const status = STATUS[stub.mint_status] ?? STATUS.pending;
  const place = [stub.venue, formatDate(stub.event_date)].filter(Boolean).join(" · ");
  return (
    <div className="keepsake">
      <div className="keepsake-inner">
        {img ? <img src={img} alt={`Stub for ${stub.event_name}`} /> : <div className="noimg">🎟️</div>}
        <div className="body">
          <p className="event">{stub.event_name}</p>
          {place && <p className="when">{place}</p>}
          <div className="seats">
            {stub.section && <span className="chip">Sec {stub.section}</span>}
            {stub.row_label && <span className="chip">Row {stub.row_label}</span>}
            {stub.seat && <span className="chip">Seat {stub.seat}</span>}
            {stub.deal_id && <span className="chip good">Verified via SwitchTix deal</span>}
          </div>
          {stub.went_with && <p className="muted small" style={{ margin: "12px 0 0" }}>With {stub.went_with}</p>}
          {stub.note && <p className="note">“{stub.note}”</p>}
          <div className="meta">
            <span>{stub.owner_name ?? "A fan"}’s stub</span>
            {stub.tx_hash ? (
              <a href={`${EXPLORER}/tx/${stub.tx_hash}`} target="_blank" rel="noreferrer">
                <span className={`chip ${status.tone}`}>{status.label}{stub.token_id ? ` · #${stub.token_id}` : ""}</span>
              </a>
            ) : (
              <span className={`chip ${status.tone}`}>{status.label}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
