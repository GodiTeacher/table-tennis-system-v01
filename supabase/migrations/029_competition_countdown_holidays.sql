create table if not exists public.competition_holidays (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  holiday_date date not null,
  name text not null default '休假日',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(team_id, holiday_date)
);

create index if not exists competition_holidays_team_date_idx
  on public.competition_holidays(team_id, holiday_date);

alter table public.competition_holidays enable row level security;

drop policy if exists competition_holidays_select on public.competition_holidays;
create policy competition_holidays_select on public.competition_holidays
for select using (team_id = public.current_team_id());

drop policy if exists competition_holidays_insert on public.competition_holidays;
create policy competition_holidays_insert on public.competition_holidays
for insert with check (team_id = public.current_team_id() and public.is_team_member(team_id));

drop policy if exists competition_holidays_update on public.competition_holidays;
create policy competition_holidays_update on public.competition_holidays
for update using (team_id = public.current_team_id() and public.is_team_member(team_id))
with check (team_id = public.current_team_id() and public.is_team_member(team_id));

drop policy if exists competition_holidays_delete on public.competition_holidays;
create policy competition_holidays_delete on public.competition_holidays
for delete using (team_id = public.current_team_id() and public.is_team_member(team_id));
