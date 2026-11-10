-- SwitchTix escrow (Stripe test mode).
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.

-- 1. New deal steps:
--    open → awaiting_payment → paid → sent → released
--    with side exits: disputed (then released or refunded), cancelled, refunded
alter table public.deals drop constraint if exists deals_status_check;
update public.deals set status = 'paid' where status = 'accepted';
update public.deals set status = 'sent' where status = 'transferred';
alter table public.deals add constraint deals_status_check check (
  status in ('open', 'awaiting_payment', 'paid', 'sent', 'disputed', 'released', 'refunded', 'cancelled')
);

-- 2. Escrow details on each deal.
alter table public.deals
  add column if not exists ticket_platform text,
  add column if not exists checkout_session_id text,
  add column if not exists payment_intent_id text,
  add column if not exists charge_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists auto_release_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists release_reason text,
  add column if not exists payout_status text not null default 'none',
  add column if not exists transfer_id text,
  add column if not exists refund_id text,
  add column if not exists refunded_at timestamptz,
  add column if not exists dispute_reason text,
  add column if not exists dispute_image_path text,
  add column if not exists disputed_at timestamptz,
  add column if not exists resolution_note text,
  add column if not exists resolved_at timestamptz;

alter table public.deals drop constraint if exists deals_payout_status_check;
alter table public.deals add constraint deals_payout_status_check check (
  payout_status in ('none', 'waiting_for_seller', 'transferred', 'failed')
);

create index if not exists deals_auto_release_idx on public.deals (status, auto_release_at);

-- 3. Where each seller gets paid (a Stripe Connect account, test mode).
create table if not exists public.payout_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  payouts_ready boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.payout_accounts enable row level security;
drop policy if exists "Users read their payout account" on public.payout_accounts;
create policy "Users read their payout account" on public.payout_accounts
  for select to authenticated using (user_id = auth.uid());

-- 4. Private storage for dispute screenshots.
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- 5. Transparent payment processing (added later; safe to run again).
alter table public.deals
  add column if not exists buyer_fee_cents integer not null default 0,
  add column if not exists fee_breakdown jsonb;

-- 6. "Seller gets paid when you get in" (Nov 2026; safe to run again).
--    Money releases 2 hours after the event starts unless the buyer reports a problem.
alter table public.deals
  add column if not exists event_starts_at timestamptz,
  add column if not exists event_time_zone text,
  add column if not exists transfer_accepted_at timestamptz;
