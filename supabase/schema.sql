-- Komet V1 Schema (Supabase PostgreSQL)
-- Run this once in Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.ig_accounts (
  id uuid primary key default gen_random_uuid(),
  ig_user_id text not null unique,
  username text not null,
  profile_picture_url text,
  access_token text not null,
  token_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,
  media_id text not null default 'ALL',
  media_caption text,
  media_thumbnail_url text,
  trigger_keywords text[] not null default '{}',
  match_any boolean not null default false,
  dm_message text not null,
  dm_link text,
  public_reply text,
  is_active boolean not null default true,
  dm_sent_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dm_logs (
  id uuid primary key default gen_random_uuid(),
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete set null,
  comment_id text not null unique,
  commenter_id text,
  commenter_username text,
  comment_text text,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rules_account_active
  on public.automation_rules (ig_account_id, is_active, media_id);

create index if not exists idx_logs_account_created
  on public.dm_logs (ig_account_id, created_at desc);

create or replace function public.increment_rule_dm_count(p_rule_id uuid)
returns void
language sql
as $$
  update public.automation_rules
  set dm_sent_count = dm_sent_count + 1,
      updated_at = now()
  where id = p_rule_id;
$$;
