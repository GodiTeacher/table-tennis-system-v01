alter table public.attendance_templates drop constraint if exists attendance_templates_mode_check;
alter table public.attendance_templates drop constraint if exists attendance_templates_check1;
alter table public.attendance_templates add constraint attendance_templates_mode_check check (mode in ('grade','individual','count'));
alter table public.attendance_templates add constraint attendance_templates_shape_check check (
  (mode='grade' and grade is not null and student_id is null and default_count is not null)
  or (mode='individual' and student_id is not null)
  or (mode='count' and grade is null and student_id is null and default_count is not null)
);

alter table public.daily_attendance_segments drop constraint if exists daily_attendance_segments_mode_check;
alter table public.daily_attendance_segments drop constraint if exists daily_attendance_segments_check1;
alter table public.daily_attendance_segments add constraint daily_attendance_segments_mode_check check (mode in ('grade','individual','count'));
alter table public.daily_attendance_segments add constraint daily_attendance_segments_shape_check check (
  (mode='grade' and grade is not null and student_id is null and attendee_count is not null)
  or (mode='individual' and student_id is not null)
  or (mode='count' and grade is null and student_id is null and attendee_count is not null)
);

create table if not exists public.attendance_date_overrides (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  attendance_date date not null,
  action text not null check (action in ('remove','include')),
  template_weekday smallint check (template_weekday between 1 and 5),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, attendance_date),
  check ((action='remove' and template_weekday is null) or (action='include' and template_weekday is not null))
);
create index if not exists attendance_date_overrides_team_date_idx on public.attendance_date_overrides(team_id, attendance_date);
alter table public.attendance_date_overrides enable row level security;
drop policy if exists attendance_date_overrides_select on public.attendance_date_overrides;
drop policy if exists attendance_date_overrides_write on public.attendance_date_overrides;
create policy attendance_date_overrides_select on public.attendance_date_overrides for select to authenticated using (public.is_team_member(team_id));
create policy attendance_date_overrides_write on public.attendance_date_overrides for all to authenticated using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

alter table public.coach_pay_rules add column if not exists monthly_salary numeric(12,2) not null default 0 check (monthly_salary >= 0);
alter table public.coach_pay_rules drop constraint if exists coach_pay_rules_method_check;
alter table public.coach_pay_rules add constraint coach_pay_rules_method_check check (method in ('hourly','tiered','base_plus_student','fixed_monthly','weighted_students'));
