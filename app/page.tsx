import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (next) redirect(`/signin?next=${encodeURIComponent(next)}`);
  const user = await currentUser();

  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">Safe ticket deals between people</p>
        <h1>
          Buy and sell tickets with anyone. <em>Without getting scammed.</em>
        </h1>
        <p className="lead">
          Your money waits safely with SwitchTix until the tickets are in your account. The seller gets paid the moment
          you confirm. Nobody has to go first on trust.
        </p>
        <div className="actions">
          <Link className="btn" href={user ? "/deals/new" : "/signin?next=/deals/new"}>Sell tickets safely</Link>
          <Link className="btn secondary" href={user ? "/deals" : "/signin"}>{user ? "My deals" : "Sign in"}</Link>
        </div>
        <p className="muted small">Got a deal link from a seller? Just open it. It takes you straight to your deal.</p>
      </section>

      <section>
        <h2>How it works</h2>
        <ol className="how">
          <li>
            <strong>The seller sends you a link</strong>
            <span>They set the price and choose how they’ll send the tickets: Ticketmaster, AXS or SeatGeek.</span>
          </li>
          <li>
            <strong>You pay safely</strong>
            <span>Card or Apple Pay. SwitchTix holds the money. The seller can see it’s there but can’t touch it yet.</span>
          </li>
          <li>
            <strong>Tickets arrive, seller gets paid</strong>
            <span>Accept the transfer in your ticket app and tap “I got the tickets”. If something’s wrong, the money stays put until it’s sorted.</span>
          </li>
        </ol>
      </section>

      <section>
        <h2>Why not just Venmo?</h2>
        <p className="muted">
          Venmo, Zelle and Cash App send money instantly with no take-backs. That’s exactly how ticket scams work: you
          pay, and the tickets never show up.
        </p>
        <div className="tablebox">
          <table className="compare">
            <thead>
              <tr><th></th><th>Holds your money until the tickets arrive</th><th>Protects the seller too</th><th>Cost on a $150 ticket</th></tr>
            </thead>
            <tbody>
              <tr><td>Zelle, Cash App, Venmo to friends</td><td>No</td><td>No</td><td>Free, no protection</td></tr>
              <tr><td>Resale sites</td><td>Their guarantee</td><td>Partly</td><td>$20–45 in fees</td></tr>
              <tr className="us"><td>SwitchTix</td><td>Yes</td><td>Yes</td><td>$7.50, at cost</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>We don’t make a cent on your deal</h2>
        <div className="pricebox">
          <div className="price-row"><span>Tickets</span><span className="num">$150.00</span></div>
          <div className="price-row"><span>Payment processing (exactly what Stripe charges)</span><span className="num">$7.50</span></div>
          <div className="price-row keep"><span>SwitchTix keeps</span><span className="num">$0.00</span></div>
          <div className="price-row big"><span>Buyer pays</span><span className="num">$157.50</span></div>
          <p className="muted small">The seller receives the full $150. Every deal shows the breakdown before anyone pays.</p>
        </div>
      </section>

      <section className="beta-note">
        <p className="small muted">
          SwitchTix is in a private beta with friends and family. Payments run in Stripe test mode, so no real money moves
          yet. Selling is invite-only for now; anyone can buy from a deal link.
        </p>
      </section>
    </div>
  );
}
