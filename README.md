# SwitchTix — friends and family beta

*Buy and sell tickets with anyone, without getting scammed.*

An invite-only web app where friends:

- **Mint stubs** — upload a photo of a ticket stub, add the details and a note, and get a keepsake card they can share. Each stub is minted on **Base Sepolia**, a free blockchain test network.
- **Sell tickets through escrow** — the buyer pays with a Stripe **test** card, SwitchTix holds the money, and it's released to the seller only when the buyer confirms the tickets arrived (or 48 hours pass with no problem reported). No real money moves in the beta.
- **Install it** — open the site on a phone and choose *Add to Home Screen*.

Everything runs on free tiers. Nothing needs to be installed on your PC.

---

## Part 1 — Supabase (database, sign-in, photos) · ~15 min

1. In your Supabase project, open **SQL Editor → New query**.
2. Paste in everything from [`supabase/schema.sql`](supabase/schema.sql). Edit the email list at the bottom to add yourself and anyone you want to invite. Click **Run**.
3. Open **Project Settings → API** (or **API Keys**) and keep this tab open. You'll copy three values in Part 2:
   - **Project URL**
   - **anon / publishable** key
   - **service_role / secret** key (keep this one private)

## Part 2 — Vercel (put it online) · ~10 min

1. In Vercel, click **Add New → Project** and import the `switchtix` GitHub repo.
2. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |

3. Click **Deploy**. When it finishes, copy your live address (something like `https://switchtix-abc.vercel.app`). The app detects this address automatically; set `NEXT_PUBLIC_SITE_URL` only if you later use a custom domain.

## Part 3 — Try it, then invite people

Sign-in uses a password, so the app never sends email and there are no email limits.

1. Open your Vercel address on your phone, enter your email (it must be on the invite list) and **pick a password**. The first password you enter becomes yours.
2. Mint a stub and start a deal to make sure everything works.
3. To invite someone, run this in the Supabase SQL Editor:

   ```sql
   insert into public.invites (email) values ('friend@example.com') on conflict do nothing;
   ```

4. Send them the link. They enter their email and choose a password the first time. Tell them to tap **Share → Add to Home Screen** (iPhone) or **⋮ → Add to Home screen** (Android).

**Someone forgot their password?** Run this in the SQL Editor (with their email), and the next password they enter becomes their new one:

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data - 'password_set' where email = 'friend@example.com';
```

**Good to know about the free tiers**

- Free Supabase projects pause after about a week with no activity. If the app stops loading, open Supabase and click **Restore project**.
- Vercel's free Hobby plan is for non-commercial use, which suits a private beta.

## Part 4 — Turn on escrow (Stripe test mode, free) · ~15 min

1. **Database:** in Supabase **SQL Editor → New query**, paste all of [`supabase/escrow.sql`](supabase/escrow.sql) and click **Run**.
2. **Stripe account:** sign up free at stripe.com. Stay in **test mode / sandbox** (no business details needed).
3. **Turn on Connect** (this is what lets sellers receive payouts): in the Stripe dashboard open **Connect** and click **Get started**. If asked, choose a *platform or marketplace* where sellers are paid out.
4. **Copy the test secret key:** **Developers → API keys** → *Secret key* (starts with `sk_test_`). The app refuses live keys, so no real money can move.
5. **In Vercel → Settings → Environment Variables**, add, then **Deployments → ⋯ → Redeploy**:

   | Name | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | the `sk_test_…` key |
   | `ADMIN_EMAILS` | your email (comma-separate more) — unlocks the **Admin** page for disputes |
   | `CRON_SECRET` | any long random text — protects the daily auto-release job |

**How a deal works**

1. Seller creates a deal link (must send through Ticketmaster, AXS or SeatGeek transfer — no PDFs).
2. Buyer pays into escrow with a test card: `4242 4242 4242 4242`, any future date, any CVC/ZIP.
3. Seller sends the tickets in the ticket app and taps **I've sent the tickets**.
4. Buyer taps **I got the tickets**, or the money releases automatically 48 hours later unless they report a problem.
5. Seller sets up payouts once (Payouts page, using Stripe's test details shown there) and the money is transferred.

Problems go to the **Admin** page, where you release to the seller or refund the buyer.

## Part 4b — Sign up with Google (free) · ~15 min

The app's main sign-in button. The first time someone taps **Continue with Google** it creates their SwitchTix account; after that it signs them in. Anyone can join this way to buy from a deal link; selling still needs an invite.

1. Go to **console.cloud.google.com** and create a project called `SwitchTix`.
2. **Google Auth Platform → Branding / OAuth consent screen:** choose *External*, app name `SwitchTix`, your email as support and developer contact. Under **Audience**, click **Publish app** so anyone with a Google account can sign in (basic email and profile need no Google review). Save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID:** type *Web application*. Under **Authorized redirect URIs** add `https://YOUR-PROJECT.supabase.co/auth/v1/callback` (your Supabase Project URL + `/auth/v1/callback`). Create, then copy the **Client ID** and **Client secret**.
4. **Supabase → Authentication → Sign In / Providers → Google:** turn it on and paste the Client ID and secret. Save.
5. Also in **Supabase → Authentication → URL Configuration**, make sure `https://switchtix-app.vercel.app/**` is listed under Redirect URLs.

That's it: the app checks Supabase and shows **Continue with Google** within a minute, with no redeploy. (To hide it again, set `NEXT_PUBLIC_GOOGLE_SIGNIN` = `off` in Vercel.)

## Part 4c — Email updates at each step (optional, free) · ~5 min

Without these, people have to check the app to know it's their turn. With them, the seller gets "Your buyer paid — send the tickets", the buyer gets "Your tickets are on the way", and you get an email for every dispute.

1. Turn on 2-Step Verification on your Google account, then create an app password at **myaccount.google.com/apppasswords** (name it `SwitchTix`).
2. **Vercel → Environment Variables:** add `SMTP_USER` = your Gmail address and `SMTP_PASS` = the 16-character app password (optionally `SMTP_FROM` = `SwitchTix <you@gmail.com>`). Redeploy.

Gmail allows a few hundred emails a day, plenty for the beta.

## Who can do what during the beta

- **Buy:** anyone who opens a deal link can create an account and pay.
- **Sell:** only emails on the invite list (`insert into public.invites (email) values ('friend@example.com');`).
- **Admin:** emails in `ADMIN_EMAILS` see the Admin page for disputes.

## Pricing: break-even and transparent

Sellers receive their full price. The buyer pays a *payment processing* line that equals exactly what Stripe charges for the deal (card 2.9% + 30¢, payout 0.25% + 25¢, and Stripe's $2 monthly fee the first time a seller is paid in a month). SwitchTix keeps $0, and the deal page shows the breakdown. The formula is `processingFee()` in `lib/types.ts`.

## Part 5 — Turn on minting (phase 2, optional, free) · ~20 min

Until this is done, stubs save normally and show "mint coming soon".

1. Install the **MetaMask** browser extension and create a **new account just for SwitchTix testing**. Never use an account that holds real money.
2. In MetaMask, add the **Base Sepolia** network (enable *Show test networks*, or add it from chainlist.org).
3. Get free test ETH from a Base Sepolia faucet (Coinbase runs one; search "Base Sepolia faucet"). A tiny amount covers hundreds of mints.
4. Open **remix.ethereum.org**, create a file `SwitchTixStubs.sol`, and paste in [`contracts/SwitchTixStubs.sol`](contracts/SwitchTixStubs.sol).
5. **Solidity Compiler** tab → compile (version 0.8.24 or newer).
6. **Deploy** tab → Environment: **Injected Provider – MetaMask** (make sure MetaMask shows Base Sepolia) → **Deploy** → confirm in MetaMask.
7. Copy the deployed contract address from Remix.
8. In MetaMask, open the test account's menu → **Account details → Show private key**.
9. In Vercel, add these environment variables, then redeploy:

   | Name | Value |
   |---|---|
   | `STUB_CONTRACT_ADDRESS` | the contract address |
   | `MINTER_PRIVATE_KEY` | the **test** account's private key |

New stubs now mint automatically, and each card links to its transaction on sepolia.basescan.org.

> During the beta, minted stubs are held by the app's wallet and each friend's ownership is tracked in the database, so nobody needs a wallet. When you launch publicly, you can re-mint them on the main network into each person's own wallet as founding-member stubs.

---

## How it fits together

| Part | Tool |
|---|---|
| App | Next.js (`app/`) |
| Sign-in, database, photos | Supabase (`lib/supabase.ts`, `supabase/schema.sql`) |
| Minting | viem → `SwitchTixStubs` contract on Base Sepolia (`lib/chain.ts`, `lib/mint.ts`) |
| Collectible metadata | `/api/metadata/[id]` |
| Shareable keepsake (phase 2, hidden from the menu) | `/s/[id]`, `/mint`, `/collection` |
| Homepage and sign-in | `app/page.tsx`, `/signin` |
| Email updates | `lib/notify.ts` |
| Deal link and escrow | `/d/[id]`, `lib/escrow.ts`, `app/deals/actions.ts` |
| Seller payouts | `/payouts` (Stripe Connect Express, test mode) |
| Disputes | `/admin` |
| Daily auto-release | `/api/cron/release` + `vercel.json` |
| Look and feel | `app/globals.css` — swap the colors at the top for the original SwitchTix brand |

To run it on your own PC later: install Node.js, copy `.env.example` to `.env.local`, fill it in, then run `npm install` and `npm run dev`.
