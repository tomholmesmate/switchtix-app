# SwitchTix Handoff

Oct 30, 2026 · Tom Holmes · updated Nov 10, 2026

**Nov 10 update:** money now releases 2 hours after the event starts ("seller gets paid when you get in"), Google sign-in is on, and a full test-card deal has been run end to end. The business model (free for fans forever; brokers, tips and a protection pool pay the costs) is in the **SwitchTix Escrow & Business Model** doc: https://claude.ai/artifact/32vdKMkLYDRimS8x4cdf4Y

The live, editable version of this handoff (with the drawn deal-flow diagram) is the **SwitchTix Handoff** doc:
https://claude.ai/artifact/1e3NjiWvgV8mqZ16MpHwZQ

## Where things stand

SwitchTix is live as an invite-only friends-and-family beta with real escrow running in **Stripe test mode**. A buyer's money is held until the tickets arrive; no real money moves yet. Everything runs on free plans, so it costs $0 while it stays in test mode.

The product is **escrow first**: a fair, transparent way for strangers to trade tickets without anyone going first on trust. Memory stubs (minting) are built but hidden, saved for phase 2. Buyers pay exactly what Stripe charges and SwitchTix keeps $0, so this side of the business breaks even by design.

| What | Where |
| --- | --- |
| Live app | https://switchtix-app.vercel.app |
| App code | https://github.com/tomholmesmate/switchtix-app (setup guide in README.md) |
| Original 2021 website code | https://github.com/tomholmesmate/SwitchTix |
| Revival plan (strategy, research, market; written mint-first, now superseded on order) | https://claude.ai/artifact/7DD5zvVMe81WA5yBKuTu5s |
| Interactive cost and growth forecast | https://claude.ai/artifact/4PAvBLq1Y9UW1rjpsLGTyt (also `forecast/switchtix-forecast.html` in the zip) |
| 2021 white paper, brand assets, site backup | Google Drive, *SwitchTix Assets* folder |

## Decisions made (newest first)

| Decision | What we chose | Why |
| --- | --- | --- |
| Fee model | Buyer pays Stripe's exact costs as an itemized "payment processing" line; seller keeps 100%; SwitchTix keeps $0 | Break even on deals, fully transparent, monetize other ways later |
| Product order | Escrow first; memory stubs are phase 2 | For the average person, a fair money transfer is the hook |
| App, not website | Opens straight to a sign-in screen or your deals; bottom tab bar (Deals, Sell, Payouts); the marketing story lives on switchtix.io later | It's an app; keep it simple |
| Sign-in | "Continue with Google" is the main button and creates the account on first use; email + password is the fallback | Passwords feel janky; Google feels natural |
| Who can join | Anyone opening a deal link can buy; only invited emails can sell | Grandma gets the link and just pays; you control who sells |
| Escrow rules (Nov 9) | "Seller gets paid when you get in": release 2 h after the event starts unless disputed; buyer's "I accepted the tickets" doesn't release early; "I got in" after the start releases now; 48 h after "sent" only if there's no future start time | The event proves the tickets were real; covers fakes and cancelled transfers |
| Escrow rules (Oct 30, superseded) | Release on buyer "I got the tickets", or automatically 48 h after "sent" unless disputed | Fair to both sides |
| Tickets allowed | Only issuer-app transfers (Ticketmaster, AXS, SeatGeek); no PDFs or screenshots | Copyable tickets can't be protected by escrow |
| Disputes | You decide by hand on the Admin page; an accepted transfer beats "never got it" | Simple and fair at beta scale |
| Payments | Stripe Checkout (card, Apple Pay, Google Pay, Cash App Pay, Link); sellers paid via Stripe Connect Express | Stripe holds funds under its licenses; Venmo can't do escrow |
| Categories | Tickets only, but the engine is a generic "deal link" | Tickets are verifiable, deadline-bound and scam-prone |
| Blockchain | Quorum dropped (deprecated 2022); stubs mint on Base Sepolia test network | Fans never see crypto; phase 2 |
| Hosting | GitHub → Vercel, Supabase database, all free plans | $0 until real money |

## What's built

- **App shell**: opens to a one-screen sign-in (or straight to your deals), logo bar on top, tab bar at the bottom (Deals, Sell, Payouts, Admin for you).
- **Sign up with Google**: one tap creates a SwitchTix account; email + password tucked under "Use email instead".
- **Deal links**: seller enters event, date, venue, seats, ticket app and price, confirms they hold the tickets, shares the link.
- **Escrow checkout**: buyer pays ticket + payment processing through Stripe; money is held until release.
- **Itemized price** on every deal: card processing, payout cost, Stripe's monthly seller fee, "SwitchTix keeps $0.00".
- **Release flow**: seller taps "I've sent the tickets" → buyer taps "I accepted the tickets" (money stays held) → money releases 2 h after the event starts unless the buyer reports a problem, or right away if the buyer taps "I got in" after the start.
- **"Something's wrong"** button freezes the money, with a reason and screenshot.
- **Admin page** (ADMIN_EMAILS only) to review disputes and release or refund.
- **Payouts page**: sellers set up Stripe Connect Express only once they have money waiting.
- **Email updates** at each step: built, switched on with Gmail settings.
- **Sell-next prompt** after a completed deal (the buyer → seller growth loop).
- **Daily safety job** that auto-releases due deals and catches payments where the buyer closed the browser.
- **Installable app** with the original SwitchTix logo and brand colors (#a51890 magenta, #5f249f purple).
- **Phase 2, hidden**: memory stubs (photo → keepsake card, share page, NFT metadata, minting on Base Sepolia once the contract is deployed).

## How a deal works

```
 1 Seller shares link ──► 2 Buyer pays (money held) ──► 3 Seller sends tickets in issuer app
        │                         │                               │
        │        seller cancels before sending                    ▼
        │                         ▼                     4 Buyer accepts; event + 2 h
        │                  Buyer refunded                         │
        │                         ▲                               ▼
        │                         │ refund                 5 Seller is paid (SwitchTix keeps $0)
        │                         │                               ▲ release
        │                   Tom reviews on Admin ◄── "Something's wrong" (money frozen)
```

Rules:
- Only tickets sent through the issuer's own transfer (Ticketmaster, AXS, SeatGeek); the seller confirms they hold the tickets.
- Release is automatic 2 h after the event starts. Before the start, the buyer's "I accepted the tickets" only records the transfer; after the start, "I got in" releases at once. Deals with no future start time fall back to 48 h after "sent".
- Before sending, only the seller can cancel (buyer refunded in full). Once paid, a buyer with a problem reports it instead of cancelling.
- A dispute freezes the money until you release or refund from Admin.
- Sellers set up payouts the first time money is waiting; it then transfers automatically.

Statuses: open → awaiting_payment → paid → sent → released (plus disputed, refunded, cancelled).

## Pricing and economics

Fee formula (cents): `fee = ceil((price×0.029 + 30 + payout + monthly) / 0.971)`, where `payout = ceil(price×0.0025 + 25)` and `monthly = 200` unless the seller was already paid this calendar month.

| Line on a $150 deal | Amount | Set by |
| --- | --- | --- |
| Tickets (seller receives all of it) | $150.00 | Seller |
| Card / Apple Pay processing, 2.9% + 30¢ on the total | $4.85 | Stripe |
| Paying the seller out, 0.25% + 25¢ | $0.65 | Stripe Connect |
| Stripe's monthly active-seller fee (first payout that month only) | $2.00 | Stripe Connect |
| **Buyer pays** | **$157.50** | |
| SwitchTix keeps | $0.00 | |

Without the $2 monthly fee: $5.44. $50 tickets: $4.26. $400 tickets: $15.61.

What you still absorb: refunds (Stripe keeps its card fee, ~$4.85 on $150), chargebacks ($15 + deal amount), and running costs once real money starts (~$117/month: Vercel Pro $20, Supabase Pro $25, California $800/year minimum franchise tax).

Forecast headline (20 sellers month 1, +10/month, $150 deals, live from month 4): break-even fee → about $1,750 over 18 months, all fixed costs; free to users would be about $4,983. Growth plateaus around 80 active sellers / 385 people because only ~15% of buyers become sellers. **Growth, not cost, is the hurdle.**

Later monetization (not built): optional instant payouts (~1%), premium memory stubs and merch drops (phase 2), venue partnerships.

## Accounts and setup

| Service | Used for | Plan |
| --- | --- | --- |
| GitHub (tomholmesmate) | App code in switchtix-app; original site in SwitchTix | Free |
| Vercel | Hosts the app; redeploys on every push to main | Hobby |
| Supabase | Database, sign-in, photo/screenshot storage | Free |
| Stripe (test mode) | Escrow payments and payouts (Connect enabled) | Free in test |
| Google Cloud (project "SwitchTix") | Google sign-in key; app published, no logo (a logo triggers Google review) | Free |
| Gmail app password (optional) | Email updates | Free |

Vercel environment variables:

| Name | Comes from | Status |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase → Project Settings → Data API | Set |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase → API Keys | Set |
| SUPABASE_SERVICE_ROLE_KEY | Supabase → API Keys (secret) | Set |
| STRIPE_SECRET_KEY | Stripe → Developers → API keys (sk_test_…) | Set |
| ADMIN_EMAILS | Your email | Set |
| CRON_SECRET | Any long random text | Set |
| NEXT_PUBLIC_GOOGLE_SIGNIN | Not needed: Google appears automatically once on in Supabase (`off` hides it) | Not needed (Google is on as of Nov 10) |
| SMTP_USER, SMTP_PASS, SMTP_FROM | Gmail address + app password | Not yet |
| MINTER_PRIVATE_KEY, STUB_CONTRACT_ADDRESS | Phase 2 minting | Not yet |
| NEXT_PUBLIC_SITE_URL | Only for a custom domain | Not needed |

Database scripts (Supabase → SQL Editor, paste contents, Run; safe to re-run):
1. `supabase/schema.sql` — done.
2. `supabase/escrow.sql` — run the fee section if you haven't (the Pay button fails without it):

```sql
alter table public.deals
  add column if not exists buyer_fee_cents integer not null default 0,
  add column if not exists fee_breakdown jsonb;
```

Invite a seller:
```sql
insert into public.invites (email) values ('friend@example.com') on conflict do nothing;
```

Test accounts without new inboxes: sign in by email as `you+buyer@gmail.com`, `you+buyer2@gmail.com` and so on (Google's button always uses your real account). Buyers need no invite; extra sellers do.

Reset someone's password (their next password becomes the new one):
```sql
update auth.users set raw_app_meta_data = raw_app_meta_data - 'password_set' where email = 'friend@example.com';
```

Wipe test data and start over. Deals only:
```sql
delete from public.stubs;
delete from public.deals;
```
Everything, including accounts (the invite list stays; sellers redo payout setup):
```sql
delete from public.stubs;
delete from public.deals;
delete from public.payout_accounts;
delete from auth.users;
```

## Pick-up checklist

Finish the beta (free):
- [x] Run the processing-fee SQL above (Nov 10, with escrow.sql section 6)
- [x] Release 2 h after the event starts (PR #1, Nov 10)
- [x] Run a test-card deal end to end (Nov 10)
- [ ] Stripe test mode → Settings → Payment methods: turn on Apple Pay, Google Pay, Cash App Pay, Link
- [ ] Finish a seller's Payouts setup with the test details shown on that page; confirm the transfer in Stripe → Connect
- [ ] Run one dispute end to end and resolve it on Admin
- [ ] Turn on email updates (README Part 4c, ~5 min)
- [x] Turn on Google in Google Cloud + Supabase (Nov 10)
- [ ] Invite 10–15 sellers: concert friends, a season-ticket holder, sports parents
- [ ] Run for two weeks; record repeat deals, buyers who later sell, where people got stuck

Before real money:
- [ ] Ask Stripe to approve peer-to-peer ticket resale on your account
- [ ] One startup-lawyer consult: holding funds via Stripe, terms, state resale rules (DC RESALE Act Jan 1, 2027)
- [ ] Decide the entity (Switch, Inc. or new LLC; $800/yr CA minimum tax)
- [ ] Terms of service and privacy page
- [ ] Upgrade to Vercel Pro and Supabase Pro
- [ ] Allow live Stripe keys (one change in `lib/stripe.ts`)
- [ ] Point a domain (e.g. app.switchtix.io) and set NEXT_PUBLIC_SITE_URL
- [ ] Supabase custom auth domain, so Google's screen says SwitchTix instead of "…supabase.co" (paid add-on)
- [ ] Small real-money pilot group first

## Roadmap

| Stage | Target | What happens | Gate |
| --- | --- | --- | --- |
| 1. Friends test | Nov 2026 | 10–15 sellers, test-card deals, email + Google on | People finish deals unaided; some repeat |
| 2. Real-money readiness | Dec 2026 | Stripe approval, legal, entity, terms, paid hosting, live keys | Every "before real money" box ticked |
| 3. Real-money pilot | Early 2027 | Small Bay Area group, break-even fee | Disputes < 2%; buyers turning into sellers |
| 4. Growth | 2027 | Reddit/fan groups, season-ticket holders, venues | Growth from buyer→seller loop |
| 5. Phase 2: memory stubs | After traction | Minting on; free stub per deal; merch later | Users ask for keepsakes |

UX upgrades next: Apple Pay button directly on the deal page (Stripe Express Checkout); illustrated "how to send tickets" guides per app; optional instant payouts; text-message updates.

## Technical notes and known limits

Next.js 16 (Turbopack, `proxy.ts`), React 19, TypeScript, Supabase (@supabase/ssr, RLS, buckets `stubs` public / `evidence` private), Stripe SDK (separate charges and transfers, idempotency keys, no webhooks — payments are checked on return and by the daily cron), nodemailer, viem.

| Area | Code | Note |
| --- | --- | --- |
| Escrow + payouts | `lib/escrow.ts`, `app/deals/actions.ts` | Status changes are guarded so double taps can't release twice |
| Processing fee | `processingFee()` in `lib/types.ts` | Stripe's published US rates |
| Deal page | `app/d/[id]/page.tsx` | One main button per person per step |
| Email | `lib/notify.ts` | Off until SMTP set; never blocks a deal |
| Auto-release job | `app/api/cron/release`, `vercel.json` | Daily 17:00 UTC; deals also refresh when opened |
| Test-mode lock | `lib/stripe.ts` | Refuses live keys by design |
| Phase 2 minting | `lib/chain.ts`, `lib/mint.ts`, `contracts/SwitchTixStubs.sol` | README Part 5 |

Known limits:
- The release job runs once a day on Vercel's free plan, so a seller can wait up to a day past the release time unless the buyer taps "I got in" or someone opens the deal.
- Stripe can hold funds ~90 days; far-off events may need a two-step hold before real money.
- Cancelled events refund the original purchaser (the seller); a pass-through rule is still needed.
- Chargebacks ("friendly fraud") are the biggest money risk; keep transfer screenshots.
- The first password entered for an invited email claims the account; send invites promptly.
- The free Supabase project pauses after a quiet week; click Restore in Supabase if the app stops loading.

## Sources

- Stripe Connect pricing: https://stripe.com/connect/pricing
- Stripe wallets: https://docs.stripe.com/payments/wallets
- Vercel pricing 2026: https://www.wearefounders.uk/vercel-pricing-2026-what-you-actually-pay-to-host-your-startup/
- Supabase pricing 2026: https://www.wearefounders.uk/supabase-pricing-2026-every-tier-explained-for-indie-hackers/
- California franchise tax 2026: https://www.zenind.com/help/post/california-franchise-tax-in-2026-what-businesses-need-to-know
- Ticket fees and resale caps 2026: https://pricebugalerts.com/guides/ticket-fees-resale-caps/
- Venmo Purchase Protection: https://venmo.com/legal/purchase-protection-eligibility
- Escrow.com fees: https://www.escrow.com/fee-calculator
- Market, competitor and regulatory research: Sources section of the Revival Plan doc
