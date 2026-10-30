import Stripe from "stripe";

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Stripe client. The beta refuses to run with live keys, so no real money can ever move. */
export function stripe() {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    throw new Error("SwitchTix beta only runs with Stripe TEST keys (sk_test_…).");
  }
  return new Stripe(key);
}
