-- Migration: Add platform_admins table for Super Admin role
-- Admins are Supabase Auth users who also exist in this table.
-- The table is intentionally minimal — no PII beyond email.

create table if not exists public.platform_admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  created_at  timestamptz not null default now()
);

-- Only service-role can insert. No direct client access.
alter table public.platform_admins enable row level security;

create policy "platform_admins_select_own"
  on public.platform_admins
  for select
  using (auth.uid() = id);

-- Index for fast lookups
create index if not exists platform_admins_email_idx on public.platform_admins(email);

comment on table public.platform_admins is
  'Super Admins / Platform Managers who have full read access to all platform data.';
