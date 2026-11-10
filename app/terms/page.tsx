export const metadata = { title: "Terms · SwitchTix" };

const CONTACT = "thomashamilitonholmes@gmail.com";

export default function Terms() {
  return (
    <article className="legal">
      <h1>Terms of service</h1>
      <p className="muted small">Last updated October 30, 2026</p>

      <p>
        By using SwitchTix you agree to these terms. SwitchTix is a private beta for friends and family. Payments run in
        Stripe test mode, so no real money moves, and features may change or stop at any time.
      </p>

      <h2>What SwitchTix does</h2>
      <p>
        SwitchTix lets a seller create a deal link for tickets they hold. The buyer pays through Stripe and the money is
        held until 2 hours after the event starts, unless the buyer reports a problem first. A buyer who gets in can tap
        “I got in” to pay the seller sooner. If the tickets are sent after the event has started, the money is held 48
        hours instead. Then the seller is paid. SwitchTix is not the seller or buyer of any ticket and is not
        connected to Ticketmaster, AXS, SeatGeek or any event organizer.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or older.</li>
        <li>Keep your sign-in to yourself. You’re responsible for deals made from your account.</li>
        <li>During the beta, selling is invite-only.</li>
      </ul>

      <h2>Selling</h2>
      <ul>
        <li>Only sell tickets you actually hold, and describe them accurately.</li>
        <li>Send tickets only through the ticket app’s own transfer (Ticketmaster, AXS or SeatGeek). No PDFs, screenshots or copies.</li>
        <li>Follow the ticket issuer’s rules and any local laws on resale and price limits.</li>
      </ul>

      <h2>Buying and fees</h2>
      <ul>
        <li>Every deal shows the full price before you pay: the ticket price plus payment processing, which is exactly what Stripe charges. SwitchTix keeps nothing from it.</li>
        <li>Accept the transfer in your ticket app, then tap “I accepted the tickets”. If the tickets don’t arrive or don’t scan at the door, tap “Something’s wrong” before the release time shown on the deal (2 hours after the event starts).</li>
      </ul>

      <h2>Problems and refunds</h2>
      <ul>
        <li>A reported problem freezes the money. SwitchTix reviews it and either pays the seller or refunds the buyer. A transfer the buyer accepted in their ticket app counts as delivered.</li>
        <li>If a seller cancels before sending, the buyer gets a full refund.</li>
        <li>If an event is cancelled, the ticket issuer usually refunds the original purchaser. Sellers who receive that refund should pass it on to their buyer.</li>
      </ul>

      <h2>Things you can’t do</h2>
      <p>Don’t sell tickets you don’t have, scam or harass other people, use SwitchTix for anything illegal, or try to get around how it holds money. We may suspend accounts that do.</p>

      <h2>Limits</h2>
      <p>
        SwitchTix is provided as is, without warranties. As far as the law allows, SwitchTix isn’t liable for indirect
        losses, and its total liability for any deal is limited to the amount paid for that deal.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above shows when. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </article>
  );
}
