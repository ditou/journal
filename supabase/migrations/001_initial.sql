-- =====================================================
-- TradeLog - Supabase Migration
-- Corré esto en el SQL Editor de tu proyecto Supabase
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  username      text unique not null,
  display_name  text,
  bio           text,
  avatar_url    text,
  is_public     boolean default false,
  risk_settings jsonb default '{}',
  total_trades  integer default 0,
  win_rate      numeric(5,2) default 0,
  total_pnl     numeric(12,2) default 0,
  created_at    timestamptz default now()
);

-- ── TRADES ────────────────────────────────────────────────────────────────
create table if not exists public.trades (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  broker_source   text not null check (broker_source in ('TRADOVATE', 'METATRADER', 'MANUAL')),
  external_id     text,
  symbol          text not null,
  direction       text not null check (direction in ('LONG', 'SHORT')),
  status          text not null check (status in ('WIN', 'LOSS', 'BREAKEVEN')),
  entry_price     numeric(18,6) not null,
  exit_price      numeric(18,6) not null,
  quantity        numeric(18,6) not null,
  pnl             numeric(12,2) not null,
  pnl_percent     numeric(8,4),
  commission      numeric(10,2) default 0,
  entry_time      timestamptz not null,
  exit_time       timestamptz not null,
  duration_minutes integer,
  setup           text,
  emotion         text,
  mistake         text,
  notes           text,
  tags            text[] default '{}',
  created_at      timestamptz default now(),
  -- Prevent duplicates from same broker
  unique (user_id, external_id, broker_source)
);

-- ── TRADOVATE CREDENTIALS ─────────────────────────────────────────────────
create table if not exists public.tradovate_credentials (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references public.profiles(id) on delete cascade unique not null,
  access_token     text not null,
  refresh_token    text,
  token_expires_at timestamptz,
  account_id       bigint,
  account_name     text,
  environment      text default 'live' check (environment in ('live', 'demo')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.trades enable row level security;
alter table public.tradovate_credentials enable row level security;

-- Profiles: user can read/update own, can read public ones
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can view public profiles"
  on public.profiles for select using (is_public = true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Trades: user can only access own trades
create policy "Users can view own trades"
  on public.trades for select using (auth.uid() = user_id);

create policy "Users can insert own trades"
  on public.trades for insert with check (auth.uid() = user_id);

create policy "Users can update own trades"
  on public.trades for update using (auth.uid() = user_id);

create policy "Users can delete own trades"
  on public.trades for delete using (auth.uid() = user_id);

-- Credentials: only own
create policy "Users can manage own credentials"
  on public.tradovate_credentials for all using (auth.uid() = user_id);

-- ── FUNCTION: update profile stats on trade insert/update ─────────────────
create or replace function update_profile_stats()
returns trigger language plpgsql security definer as $$
declare
  v_total_pnl    numeric;
  v_total_trades integer;
  v_wins         integer;
  v_win_rate     numeric;
begin
  select
    coalesce(sum(pnl), 0),
    count(*),
    count(*) filter (where status = 'WIN')
  into v_total_pnl, v_total_trades, v_wins
  from public.trades
  where user_id = coalesce(new.user_id, old.user_id);

  v_win_rate := case when v_total_trades > 0 then (v_wins::numeric / v_total_trades * 100) else 0 end;

  update public.profiles
  set
    total_pnl    = v_total_pnl,
    total_trades = v_total_trades,
    win_rate     = round(v_win_rate, 2)
  where id = coalesce(new.user_id, old.user_id);

  return coalesce(new, old);
end;
$$;

create or replace trigger on_trade_change
  after insert or update or delete on public.trades
  for each row execute function update_profile_stats();

-- ── INDEXES ───────────────────────────────────────────────────────────────
create index if not exists idx_trades_user_exit on public.trades(user_id, exit_time desc);
create index if not exists idx_trades_user_symbol on public.trades(user_id, symbol);
create index if not exists idx_trades_status on public.trades(user_id, status);
create index if not exists idx_profiles_public on public.profiles(is_public) where is_public = true;
