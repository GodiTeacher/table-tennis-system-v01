create table if not exists public.aircon_fee_group_patterns (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  group_id uuid not null references public.aircon_fee_groups(id) on delete cascade,
  weekday integer not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  default_count integer not null default 0 check (default_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, weekday, start_time, end_time)
);

create index if not exists aircon_fee_group_patterns_team_idx
  on public.aircon_fee_group_patterns(team_id);

alter table public.aircon_fee_group_patterns enable row level security;

drop policy if exists aircon_fee_group_patterns_select on public.aircon_fee_group_patterns;
drop policy if exists aircon_fee_group_patterns_write on public.aircon_fee_group_patterns;

create policy aircon_fee_group_patterns_select
  on public.aircon_fee_group_patterns
  for select to authenticated
  using (public.is_team_member(team_id));

create policy aircon_fee_group_patterns_write
  on public.aircon_fee_group_patterns
  for all to authenticated
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));
