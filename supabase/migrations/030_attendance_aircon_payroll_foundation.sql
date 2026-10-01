create table if not exists public.attendance_templates (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7), mode text not null check (mode in ('grade','individual')),
  grade smallint check (grade between 1 and 6), student_id uuid references public.students(id) on delete cascade,
  start_time time not null, end_time time not null, default_count integer check (default_count is null or default_count >= 0),
  active boolean not null default true, note text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_time > start_time), check ((mode='grade' and grade is not null and student_id is null) or (mode='individual' and student_id is not null))
);
create index if not exists attendance_templates_team_weekday_idx on public.attendance_templates(team_id,weekday);

create table if not exists public.daily_attendance_segments (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  attendance_date date not null, mode text not null check (mode in ('grade','individual')), grade smallint check (grade between 1 and 6),
  student_id uuid references public.students(id) on delete cascade, start_time time not null, end_time time not null,
  attendee_count integer check (attendee_count is null or attendee_count >= 0), source text not null default 'manual' check (source in ('manual','template','today_attendance')),
  note text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), check (end_time > start_time),
  check ((mode='grade' and grade is not null and student_id is null and attendee_count is not null) or (mode='individual' and student_id is not null))
);
create index if not exists daily_attendance_segments_team_date_idx on public.daily_attendance_segments(team_id,attendance_date);

create table if not exists public.aircon_runs (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  meter_record_id uuid references public.aircon_meter_records(id) on delete set null, usage_date date not null,
  start_time time not null, end_time time not null, note text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), check (end_time > start_time)
);
create index if not exists aircon_runs_team_date_idx on public.aircon_runs(team_id,usage_date);

create table if not exists public.aircon_month_settings (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  record_month date not null, allocation_mode text not null default 'grade' check (allocation_mode in ('grade','individual')), unique(team_id,record_month)
);

create table if not exists public.coach_pay_rules (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  coach_user_id uuid not null references public.profiles(id) on delete cascade, method text not null default 'hourly' check (method in ('hourly','tiered','base_plus_student')),
  hourly_rate numeric(10,2) not null default 0, base_hourly_rate numeric(10,2) not null default 0, per_student_hour numeric(10,2) not null default 0,
  tier_rules jsonb not null default '[]'::jsonb, note text, updated_at timestamptz not null default now(), unique(team_id,coach_user_id)
);
create table if not exists public.coach_schedule_templates (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  coach_user_id uuid not null references public.profiles(id) on delete cascade, weekday smallint not null check (weekday between 1 and 7),
  start_time time not null, end_time time not null, scope_type text not null default 'team' check (scope_type in ('team','grade','group')),
  grade smallint check (grade between 1 and 6), training_group_id uuid references public.training_groups(id) on delete set null,
  active boolean not null default true, note text, created_at timestamptz not null default now(), check (end_time > start_time)
);
create table if not exists public.coach_attendance_segments (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  coach_user_id uuid not null references public.profiles(id) on delete cascade, work_date date not null,
  start_time time not null, end_time time not null, student_count integer check (student_count is null or student_count >= 0),
  scope_type text not null default 'team' check (scope_type in ('team','grade','group')), grade smallint check (grade between 1 and 6),
  training_group_id uuid references public.training_groups(id) on delete set null, source text not null default 'manual' check (source in ('manual','template')),
  note text, created_at timestamptz not null default now(), check (end_time > start_time)
);
create index if not exists coach_attendance_team_date_idx on public.coach_attendance_segments(team_id,work_date);

create table if not exists public.finance_items (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  record_month date not null, item_type text not null check (item_type in ('income','expense')), category text not null,
  description text, amount numeric(12,2) not null default 0, linked_source text, linked_id uuid,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create index if not exists finance_items_team_month_idx on public.finance_items(team_id,record_month);

alter table public.attendance_templates enable row level security; alter table public.daily_attendance_segments enable row level security;
alter table public.aircon_runs enable row level security; alter table public.aircon_month_settings enable row level security;
alter table public.coach_pay_rules enable row level security; alter table public.coach_schedule_templates enable row level security;
alter table public.coach_attendance_segments enable row level security; alter table public.finance_items enable row level security;

do $$ declare t text; begin
  foreach t in array array['attendance_templates','daily_attendance_segments','aircon_runs','aircon_month_settings','coach_pay_rules','coach_schedule_templates','coach_attendance_segments','finance_items'] loop
    execute format('drop policy if exists %I on public.%I','team_read_'||t,t);
    execute format('create policy %I on public.%I for select using (public.is_team_member(team_id))','team_read_'||t,t);
    execute format('drop policy if exists %I on public.%I','team_write_'||t,t);
    execute format('create policy %I on public.%I for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id))','team_write_'||t,t);
  end loop;
end $$;
