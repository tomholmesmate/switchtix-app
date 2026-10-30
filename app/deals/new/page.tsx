import { createDeal } from "../actions";

export default async function NewDeal({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1>Start a deal</h1>
      <p className="muted">
        Selling a ticket you already hold? Create a deal, then send the link to your buyer however you like.
      </p>
      <form action={createDeal} className="panel">
        <label htmlFor="event_name">Event *</label>
        <input id="event_name" name="event_name" required placeholder="Outside Lands, Saturday" />

        <div className="row2">
          <div>
            <label htmlFor="event_date">Date</label>
            <input id="event_date" name="event_date" type="date" />
          </div>
          <div>
            <label htmlFor="venue">Venue</label>
            <input id="venue" name="venue" placeholder="Golden Gate Park" />
          </div>
        </div>

        <label htmlFor="seats">Seats or ticket type</label>
        <input id="seats" name="seats" placeholder="Sec 112, Row F, Seats 3–4 · or GA" />

        <label htmlFor="price">Total price (USD) *</label>
        <input id="price" name="price" inputMode="decimal" required placeholder="150" />

        {error && <div className="notice bad">Add the event and a price above $0.</div>}
        <button className="btn block" type="submit">Create deal link</button>
        <p className="muted small">Only list tickets you already have. During the beta no money changes hands.</p>
      </form>
    </>
  );
}
