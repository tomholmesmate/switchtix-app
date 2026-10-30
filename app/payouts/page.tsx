import { payPendingForSeller, refreshPayoutAccount } from "@/lib/escrow";
import { stripeEnabled } from "@/lib/stripe";
import { adminClient, currentUser } from "@/lib/supabase";
import { money, type Deal } from "@/lib/types";
import { startPayoutSetup } from "./actions";

export default async function Payouts({ searchParams }: { searchParams: Promise<{ return?: string; error?: string }> }) {
  const q = await searchParams;
  const user = await currentUser();

  let account: Awaited<ReturnType<typeof refreshPayoutAccount>> = null;
  let problem = false;
  if (stripeEnabled()) {
    try {
      account = await refreshPayoutAccount(user!.id);
      if (account?.payouts_ready) await payPendingForSeller(user!.id);
    } catch (err) {
      console.error(err);
      problem = true;
    }
  }

  const { data } = await adminClient()
    .from("deals")
    .select("*")
    .eq("seller_id", user!.id)
    .eq("status", "released")
    .in("payout_status", ["waiting_for_seller", "failed"]);
  const waiting = (data ?? []) as Deal[];
  const waitingTotal = waiting.reduce((sum, d) => sum + d.price_cents, 0);

  return (
    <>
      <h1>Payouts</h1>
      <p className="muted">
        When you sell tickets, this is where your money goes once the buyer confirms. Setup is a short Stripe form.
      </p>

      {!stripeEnabled() && <div className="notice bad">Payments aren’t switched on yet. Ask Tom to add the Stripe test key.</div>}
      {problem && <div className="notice bad">Couldn’t reach Stripe just now. Try again in a minute.</div>}
      {q.return && account && !account.payouts_ready && (
        <div className="notice">Stripe is still checking your details, or a step was skipped. Refresh in a minute, or continue setup.</div>
      )}

      <div className="panel">
        {account?.payouts_ready ? (
          <>
            <p style={{ marginTop: 0 }}><span className="chip good">Payouts ready</span></p>
            <p className="muted">Money from your completed deals is sent here automatically.</p>
          </>
        ) : (
          <>
            <p style={{ marginTop: 0 }}><span className="chip warn">Not set up yet</span></p>
            {waiting.length > 0 && (
              <p><strong>{money(waitingTotal)}</strong> from {waiting.length} completed deal{waiting.length > 1 ? "s" : ""} is waiting for you.</p>
            )}
            <div className="notice small">
              <strong>Beta (Stripe test mode) — use test details only, never your real information:</strong>
              <br />Phone: 000 000 0000 · SMS code: 000000 · SSN last 4: 0000 · Date of birth: 01/01/1901
              <br />Address line 1: address_full_match · Bank routing: 110000000 · Account: 000123456789
            </div>
            <form action={startPayoutSetup}>
              <button className="btn block" type="submit">{account ? "Continue payout setup" : "Set up payouts"}</button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
