export const metadata = { title: "Privacy · SwitchTix" };

const CONTACT = "thomashamilitonholmes@gmail.com";

export default function Privacy() {
  return (
    <article className="legal">
      <h1>Privacy policy</h1>
      <p className="muted small">Last updated October 30, 2026</p>

      <p>
        SwitchTix helps people buy and sell event tickets with each other safely: the buyer’s payment is held until the
        tickets arrive. SwitchTix is in a private beta. Payments run in Stripe test mode, so no real money moves.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account:</strong> your email address and, if you sign in with Google, your name and profile picture from Google. We never see your Google password.</li>
        <li><strong>Your deals:</strong> event name, date, venue, seats, price, which ticket app you use, and each deal’s status.</li>
        <li><strong>Problem reports:</strong> anything you write when you tap “Something’s wrong”, and any screenshot you upload.</li>
        <li><strong>Payments and payouts:</strong> handled by Stripe. Card details and the bank details sellers enter go to Stripe, not to us. We keep Stripe’s reference numbers so we can release or refund a deal.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your deals: hold payments, release them to sellers, refund buyers, and settle disputes.</li>
        <li>To email you when it’s your turn on a deal (for example “Your buyer paid”).</li>
        <li>To keep SwitchTix safe and to fix problems.</li>
      </ul>
      <p>We don’t sell your information and we don’t show ads.</p>

      <h2>Who else sees it</h2>
      <ul>
        <li><strong>The other person on your deal</strong> sees the deal details. They don’t see your email address or payment details.</li>
        <li><strong>Service providers</strong> that run SwitchTix: Stripe (payments), Supabase (database and sign-in), Vercel (hosting), and Google (sign-in and email).</li>
        <li><strong>The law:</strong> if we’re legally required to share something, we will.</li>
      </ul>

      <h2>Keeping and deleting your data</h2>
      <p>
        We keep your account and deals while your account is open. To delete your account, email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Stripe may keep payment records for as long as the law requires.
      </p>

      <h2>Children</h2>
      <p>SwitchTix is for people 18 and older.</p>

      <h2>Changes and contact</h2>
      <p>
        If this policy changes, we’ll update the date above. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </article>
  );
}
