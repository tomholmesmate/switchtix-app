import { DOOR_WINDOW_HOURS, EVENT_TIME_ZONES, TICKET_PLATFORMS } from "@/lib/types";
import { createDeal } from "../actions";

export default async function NewDeal({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1>Start a deal</h1>
      <p className="muted">
        Selling tickets you already have? Create a deal link and send it to your buyer. Their money waits safely with
        SwitchTix, and you get paid when they get in: {DOOR_WINDOW_HOURS} hours after the event starts, unless they report a
        problem. You keep 100% of your price; the buyer pays Stripe’s payment processing, and SwitchTix keeps nothing.
      </p>
      <form action={createDeal} className="panel">
        <label htmlFor="event_name">Event *</label>
        <input id="event_name" name="event_name" required placeholder="Outside Lands, Saturday" />

        <div className="row2">
          <div>
            <label htmlFor="event_date">Date *</label>
            <input id="event_date" name="event_date" type="date" required />
          </div>
          <div>
            <label htmlFor="event_time">Start time *</label>
            <input id="event_time" name="event_time" type="time" required />
          </div>
        </div>

        <div className="row2">
          <div>
            <label htmlFor="event_time_zone">Time zone</label>
            <select id="event_time_zone" name="event_time_zone" defaultValue="America/Los_Angeles">
              {EVENT_TIME_ZONES.map((z) => (
                <option key={z.id} value={z.id}>{z.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="venue">Venue</label>
            <input id="venue" name="venue" placeholder="Golden Gate Park" />
          </div>
        </div>
        <p className="muted small" style={{ margin: "6px 0 0" }}>
          Use the time on the ticket (doors or show time). Your money releases {DOOR_WINDOW_HOURS} hours after it.
        </p>

        <label htmlFor="seats">Seats or ticket type</label>
        <input id="seats" name="seats" placeholder="Sec 112, Row F, Seats 3–4 · or GA" />

        <label htmlFor="ticket_platform">How you’ll send the tickets *</label>
        <select id="ticket_platform" name="ticket_platform" required defaultValue="">
          <option value="" disabled>Choose the ticket app</option>
          {TICKET_PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <p className="muted small" style={{ margin: "6px 0 0" }}>
          Escrow only works for tickets sent through the ticket app’s own transfer button. PDFs and screenshots can be
          copied, so they aren’t allowed.
        </p>

        <label htmlFor="price">Your price for the tickets (USD) *</label>
        <input id="price" name="price" inputMode="decimal" required placeholder="150" />

        <label className="check">
          <input type="checkbox" name="confirm_holding" required />
          <span>I have these tickets in my account right now and will send them through the ticket app.</span>
        </label>

        {error === "invite" && (
          <div className="notice bad">Selling is invite-only during the beta. Ask Tom to add your email, then try again.</div>
        )}
        {error === "time" && <div className="notice bad">Add the event’s date and start time.</div>}
        {error === "past" && <div className="notice bad">That start time has already passed. Check the date and time.</div>}
        {error && !["invite", "time", "past"].includes(error) && (
          <div className="notice bad">Fill in the event, the ticket app, a price between $1 and $5,000, and tick the box.</div>
        )}
        <button className="btn block" type="submit">Create deal link</button>
        <p className="muted small">Beta: payments use Stripe test cards. No real money moves.</p>
      </form>
    </>
  );
}
