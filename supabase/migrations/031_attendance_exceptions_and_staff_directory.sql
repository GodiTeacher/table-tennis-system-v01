create table if not exists public.attendance_template_exceptions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  template_id uuid not null references public.attendance_templates(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  note text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_template_exceptions_time_chk check (end_time > start_time)
);
create index if not exists attendance_template_exceptions_team_template_idx on public.attendance_template_exceptions(team_id,template_id);
create unique index if not exists attendance_template_exceptions_unique_student on public.attendance_template_exceptions(template_id,student_id) where active=true;
alter table public.attendance_template_exceptions enable row level security;
drop policy if exists attendance_template_exceptions_select on public.attendance_template_exceptions;
create policy attendance_template_exceptions_select on public.attendance_template_exceptions for select using (public.is_team_member(team_id));
drop policy if exists attendance_template_exceptions_write on public.attendance_template_exceptions;
create policy attendance_template_exceptions_write on public.attendance_template_exceptions for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  linked_user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  role_type text not null default 'coach' check (role_type in ('coach','assistant','admin','other')),
  phone text,
  note text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists staff_members_team_active_idx on public.staff_members(team_id,active,display_name);
create unique index if not exists staff_members_team_linked_user_unique on public.staff_members(team_id,linked_user_id) where linked_user_id is not null;
alter table public.staff_members enable row level security;
drop policy if exists staff_members_select on public.staff_members;
create policy staff_members_select on public.staff_members for select using (public.is_team_member(team_id));
drop policy if exists staff_members_write on public.staff_members;
create policy staff_members_write on public.staff_members for all using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

insert into public.staff_members(team_id,linked_user_id,display_name,role_type,created_by)
select tm.team_id,tm.user_id,coalesce(p.display_name,p.email,'教練'),case when tm.member_role in ('owner','admin') then 'admin' else 'coach' end,tm.user_id
from public.team_members tm join public.profiles p on p.id=tm.user_id
where not exists (select 1 from public.staff_members s where s.team_id=tm.team_id and s.linked_user_id=tm.user_id);

alter table public.coach_pay_rules add column if not exists staff_id uuid references public.staff_members(id) on delete cascade;
alter table public.coach_schedule_templates add column if not exists staff_id uuid references public.staff_members(id) on delete cascade;
alter table public.coach_attendance_segments add column if not exists staff_id uuid references public.staff_members(id) on delete cascade;
update public.coach_pay_rules c set staff_id=s.id from public.staff_members s where c.staff_id is null and s.team_id=c.team_id and s.linked_user_id=c.coach_user_id;
update public.coach_schedule_templates c set staff_id=s.id from public.staff_members s where c.staff_id is null and s.team_id=c.team_id and s.linked_user_id=c.coach_user_id;
update public.coach_attendance_segments c set staff_id=s.id from public.staff_members s where c.staff_id is null and s.team_id=c.team_id and s.linked_user_id=c.coach_user_id;
alter table public.coach_pay_rules alter column coach_user_id drop not null;
alter table public.coach_schedule_templates alter column coach_user_id drop not null;
alter table public.coach_attendance_segments alter column coach_user_id drop not null;
create unique index if not exists coach_pay_rules_team_staff_unique on public.coach_pay_rules(team_id,staff_id) where staff_id is not null;
create index if not exists coach_schedule_templates_staff_idx on public.coach_schedule_templates(team_id,staff_id,weekday);
create index if not exists coach_attendance_segments_staff_idx on public.coach_attendance_segments(team_id,staff_id,work_date);