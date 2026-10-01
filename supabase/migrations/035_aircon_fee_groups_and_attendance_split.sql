create table if not exists public.aircon_fee_groups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  default_monthly_fee numeric(10,2) not null default 0 check (default_monthly_fee >= 0),
  sort_order smallint not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, sort_order)
);
create index if not exists aircon_fee_groups_team_idx on public.aircon_fee_groups(team_id, active, sort_order);
alter table public.aircon_fee_groups enable row level security;
drop policy if exists aircon_fee_groups_select on public.aircon_fee_groups;
drop policy if exists aircon_fee_groups_write on public.aircon_fee_groups;
create policy aircon_fee_groups_select on public.aircon_fee_groups for select to authenticated using (public.is_team_member(team_id));
create policy aircon_fee_groups_write on public.aircon_fee_groups for all to authenticated using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

create table if not exists public.aircon_fee_group_months (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  group_id uuid not null references public.aircon_fee_groups(id) on delete cascade,
  record_month date not null,
  monthly_fee numeric(10,2) not null default 0 check (monthly_fee >= 0),
  member_count integer not null default 0 check (member_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, record_month)
);
create index if not exists aircon_fee_group_months_team_month_idx on public.aircon_fee_group_months(team_id, record_month);
alter table public.aircon_fee_group_months enable row level security;
drop policy if exists aircon_fee_group_months_select on public.aircon_fee_group_months;
drop policy if exists aircon_fee_group_months_write on public.aircon_fee_group_months;
create policy aircon_fee_group_months_select on public.aircon_fee_group_months for select to authenticated using (public.is_team_member(team_id));
create policy aircon_fee_group_months_write on public.aircon_fee_group_months for all to authenticated using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

create table if not exists public.aircon_fee_group_attendance (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  attendance_segment_id uuid not null references public.daily_attendance_segments(id) on delete cascade,
  group_id uuid not null references public.aircon_fee_groups(id) on delete cascade,
  attendee_count integer not null default 0 check (attendee_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(attendance_segment_id, group_id)
);
create index if not exists aircon_fee_group_attendance_team_idx on public.aircon_fee_group_attendance(team_id, attendance_segment_id);
alter table public.aircon_fee_group_attendance enable row level security;
drop policy if exists aircon_fee_group_attendance_select on public.aircon_fee_group_attendance;
drop policy if exists aircon_fee_group_attendance_write on public.aircon_fee_group_attendance;
create policy aircon_fee_group_attendance_select on public.aircon_fee_group_attendance for select to authenticated using (public.is_team_member(team_id));
create policy aircon_fee_group_attendance_write on public.aircon_fee_group_attendance for all to authenticated using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

insert into public.aircon_fee_groups (team_id, name, default_monthly_fee, sort_order)
select t.id, x.name, 0, x.sort_order
from public.teams t
cross join (values ('月費群組 1',1),('月費群組 2',2),('月費群組 3',3)) as x(name,sort_order)
on conflict (team_id, sort_order) do nothing;
