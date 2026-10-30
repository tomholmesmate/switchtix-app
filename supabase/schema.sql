-- SwitchTix beta database.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run. Safe to run more than once.

-- 1. Invite list: only these emails can sign in.
create table if not exists public.invites (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.invites enable row level security;
-- No policies: only the server (service role) can read or change the invite list.

-- 2. Memory stubs.
create table if not exists public.stubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_name text,
  event_name text not null,
  event_date date,
  venue text,
  section text,
  row_label text,
  seat text,
  went_with text,
  note text,
  image_path text,
  mint_status text not null default 'pending'
    check (mint_status in ('pending', 'minting', 'minted', 'failed', 'off')),
  token_id text,
  tx_hash text,
  deal_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists stubs_owner_idx on public.stubs (owner_id);
alter table public.stubs enable row level security;
drop policy if exists "Owners read their stubs" on public.stubs;
create policy "Owners read their stubs" on public.stubs
  for select to authenticated using (owner_id = auth.uid());

-- 3. Deals (simulated escrow during the beta).
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_name text,
  buyer_id uuid references auth.users(id) on delete set null,
  buyer_name text,
  event_name text not null,
  event_date date,
  venue text,
  seats text,
  price_cents integer not null check (price_cents > 0),
  status text not null default 'open'
    check (status in ('open', 'accepted', 'transferred', 'released', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.deals enable row level security;
drop policy if exists "Parties read their deals" on public.deals;
create policy "Parties read their deals" on public.deals
  for select to authenticated using (seller_id = auth.uid() or buyer_id = auth.uid());

-- All writes go through the app server with the service role, which enforces the deal steps.

-- 4. Photo storage: a public bucket so shared stub pages can show the image.
insert into storage.buckets (id, name, public)
values ('stubs', 'stubs', true)
on conflict (id) do update set public = true;

-- 5. Add your invites (edit the emails, then run just these lines any time).
insert into public.invites (email) values
  ('thomashamilitonholmes@gmail.com')
on conflict do nothing;
