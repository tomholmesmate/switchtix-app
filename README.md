# SwitchTix — friends and family beta

*Safe deals. Forever stubs.*

An invite-only web app where friends:

- **Mint stubs** — upload a photo of a ticket stub, add the details and a note, and get a keepsake card they can share. Each stub is minted on **Base Sepolia**, a free blockchain test network.
- **Try deal links** — sell a ticket to a friend through a simulated escrow flow (no real money moves).
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

## Part 5 — Turn on minting (optional, free) · ~20 min

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
| Shareable keepsake | `/s/[id]` |
| Deal link | `/d/[id]` |
| Look and feel | `app/globals.css` — swap the colors at the top for the original SwitchTix brand |

To run it on your own PC later: install Node.js, copy `.env.example` to `.env.local`, fill it in, then run `npm install` and `npm run dev`.
