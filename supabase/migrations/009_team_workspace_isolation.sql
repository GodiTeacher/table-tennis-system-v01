create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'coach' check (member_role in ('owner','admin','coach')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.students add column if not exists team_id uuid references public.teams(id) on delete restrict;
alter table public.training_sessions add column if not exists team_id uuid references public.teams(id) on delete restrict;
alter table public.competitions add column if not exists team_id uuid references public.teams(id) on delete restrict;

create or replace function public.current_team_id() returns uuid language sql stable security definer set search_path=public as $$
  select tm.team_id from public.team_members tm where tm.user_id=auth.uid() order by tm.created_at limit 1
$$;

create or replace function public.is_team_member(target_team uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members tm where tm.team_id=target_team and tm.user_id=auth.uid())
$$;

create or replace function public.assign_current_team() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.team_id is null then new.team_id := public.current_team_id(); end if;
  if new.team_id is null or not public.is_team_member(new.team_id) then raise exception 'No authorized team workspace'; end if;
  return new;
end;
$$;

drop trigger if exists students_assign_current_team on public.students;
create trigger students_assign_current_team before insert on public.students for each row execute function public.assign_current_team();
drop trigger if exists training_sessions_assign_current_team on public.training_sessions;
create trigger training_sessions_assign_current_team before insert on public.training_sessions for each row execute function public.assign_current_team();
drop trigger if exists competitions_assign_current_team on public.competitions;
create trigger competitions_assign_current_team before insert on public.competitions for each row execute function public.assign_current_team();

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists teams_member_read on public.teams;
create policy teams_member_read on public.teams for select to authenticated using (public.is_team_member(id));
drop policy if exists team_members_member_read on public.team_members;
create policy team_members_member_read on public.team_members for select to authenticated using (team_id=public.current_team_id());

drop policy if exists "coaches manage students" on public.students;
create policy "team members manage students" on public.students for all to authenticated using (team_id=public.current_team_id()) with check (team_id=public.current_team_id());

drop policy if exists "coach owns sessions" on public.training_sessions;
create policy "team members manage sessions" on public.training_sessions for all to authenticated using (team_id=public.current_team_id()) with check (team_id=public.current_team_id());

drop policy if exists "coach owns session items" on public.training_session_items;
create policy "team members manage session items" on public.training_session_items for all to authenticated using (exists(select 1 from public.training_sessions s where s.id=training_session_items.session_id and s.team_id=public.current_team_id())) with check (exists(select 1 from public.training_sessions s where s.id=training_session_items.session_id and s.team_id=public.current_team_id()));

drop policy if exists "coach manages own session students" on public.session_students;
create policy "team members manage session students" on public.session_students for all to authenticated using (exists(select 1 from public.training_sessions s where s.id=session_students.session_id and s.team_id=public.current_team_id())) with check (exists(select 1 from public.training_sessions s where s.id=session_students.session_id and s.team_id=public.current_team_id()));

drop policy if exists "coaches manage student skill progress" on public.student_skill_progress;
create policy "team members manage student skill progress" on public.student_skill_progress for all to authenticated using (exists(select 1 from public.students s where s.id=student_skill_progress.student_id and s.team_id=public.current_team_id())) with check (exists(select 1 from public.students s where s.id=student_skill_progress.student_id and s.team_id=public.current_team_id()));
