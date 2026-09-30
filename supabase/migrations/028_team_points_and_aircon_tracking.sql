create table if not exists public.student_point_records (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  points integer not null,
  reason text not null,
  note text,
  occurred_on date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists student_point_records_team_student_idx on public.student_point_records(team_id, student_id, occurred_on desc, created_at desc);
alter table public.student_point_records enable row level security;
drop policy if exists student_point_records_select on public.student_point_records;
create policy student_point_records_select on public.student_point_records for select using (team_id = public.current_team_id());
drop policy if exists student_point_records_insert on public.student_point_records;
create policy student_point_records_insert on public.student_point_records for insert with check (team_id = public.current_team_id() and public.is_team_member(team_id));
drop policy if exists student_point_records_delete on public.student_point_records;
create policy student_point_records_delete on public.student_point_records for delete using (team_id = public.current_team_id() and public.is_team_member(team_id));

create table if not exists public.aircon_meter_records (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  record_month date not null,
  opening_reading numeric(12,2) not null default 0,
  closing_reading numeric(12,2) not null default 0,
  rate_per_unit numeric(10,4) not null default 0,
  fixed_fee numeric(10,2) not null default 0,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aircon_meter_reading_check check (closing_reading >= opening_reading),
  unique(team_id, record_month)
);
create index if not exists aircon_meter_records_team_month_idx on public.aircon_meter_records(team_id, record_month desc);
alter table public.aircon_meter_records enable row level security;
drop policy if exists aircon_meter_records_select on public.aircon_meter_records;
create policy aircon_meter_records_select on public.aircon_meter_records for select using (team_id = public.current_team_id());
drop policy if exists aircon_meter_records_insert on public.aircon_meter_records;
create policy aircon_meter_records_insert on public.aircon_meter_records for insert with check (team_id = public.current_team_id() and public.is_team_member(team_id));
drop policy if exists aircon_meter_records_update on public.aircon_meter_records;
create policy aircon_meter_records_update on public.aircon_meter_records for update using (team_id = public.current_team_id() and public.is_team_member(team_id)) with check (team_id = public.current_team_id());
drop policy if exists aircon_meter_records_delete on public.aircon_meter_records;
create policy aircon_meter_records_delete on public.aircon_meter_records for delete using (team_id = public.current_team_id() and public.is_team_member(team_id));

create table if not exists public.aircon_usage_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  meter_record_id uuid references public.aircon_meter_records(id) on delete cascade,
  usage_date date not null,
  start_time time,
  end_time time,
  grade_label text,
  usage_units numeric(10,2) not null default 0 check (usage_units >= 0),
  student_count integer check (student_count is null or student_count >= 0),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists aircon_usage_sessions_team_date_idx on public.aircon_usage_sessions(team_id, usage_date desc);
alter table public.aircon_usage_sessions enable row level security;
drop policy if exists aircon_usage_sessions_select on public.aircon_usage_sessions;
create policy aircon_usage_sessions_select on public.aircon_usage_sessions for select using (team_id = public.current_team_id());
drop policy if exists aircon_usage_sessions_insert on public.aircon_usage_sessions;
create policy aircon_usage_sessions_insert on public.aircon_usage_sessions for insert with check (team_id = public.current_team_id() and public.is_team_member(team_id));
drop policy if exists aircon_usage_sessions_delete on public.aircon_usage_sessions;
create policy aircon_usage_sessions_delete on public.aircon_usage_sessions for delete using (team_id = public.current_team_id() and public.is_team_member(team_id));
