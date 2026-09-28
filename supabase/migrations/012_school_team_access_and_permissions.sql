alter table public.teams add column if not exists school_name text;
alter table public.teams add column if not exists sport_name text not null default '桌球';
alter table public.team_members add column if not exists permissions jsonb not null default '{"students":true,"training":true,"assessment":true,"competitions":true,"transport":true}'::jsonb;
alter table public.profiles add column if not exists platform_admin boolean not null default false;

-- Existing global admin is the platform administrator; team admins are controlled by team_members.member_role.
update public.profiles set platform_admin=true where role='admin';

create table if not exists public.team_access_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  request_type text not null check (request_type in ('join','create')),
  school_name text not null,
  sport_name text not null default '桌球',
  team_name text not null,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_permissions jsonb not null default '{}'::jsonb,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists team_access_requests_one_pending on public.team_access_requests(requester_id) where status='pending';

alter table public.team_access_requests enable row level security;

create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select p.platform_admin from public.profiles p where p.id=auth.uid()),false)
$$;

create or replace function public.team_has_permission(target_team uuid, permission_key text) returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.team_members tm
    where tm.team_id=target_team and tm.user_id=auth.uid()
      and (tm.member_role in ('owner','admin') or coalesce((tm.permissions->>permission_key)::boolean,false))
  )
$$;

create or replace function public.list_team_directory()
returns table(id uuid,school_name text,sport_name text,team_name text)
language sql stable security definer set search_path=public as $$
  select t.id,coalesce(t.school_name,''),coalesce(t.sport_name,'桌球'),t.name from public.teams t order by coalesce(t.school_name,''),t.name
$$;

grant execute on function public.list_team_directory() to authenticated;

create or replace function public.submit_team_access_request(
  target_team uuid,
  requested_school text,
  requested_sport text,
  requested_team_name text,
  requested_message text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid; kind text; s text; sp text; tn text;
begin
  if exists(select 1 from public.team_members where user_id=auth.uid()) then raise exception 'Already belongs to a team'; end if;
  if exists(select 1 from public.team_access_requests where requester_id=auth.uid() and status='pending') then raise exception 'A request is already pending'; end if;
  if target_team is not null then
    select coalesce(t.school_name,''),coalesce(t.sport_name,'桌球'),t.name into s,sp,tn from public.teams t where t.id=target_team;
    if tn is null then raise exception 'Team not found'; end if;
    kind:='join';
  else
    s:=trim(coalesce(requested_school,'')); sp:=trim(coalesce(requested_sport,'桌球')); tn:=trim(coalesce(requested_team_name,'')); kind:='create';
    if s='' or tn='' then raise exception 'School and team name are required'; end if;
  end if;
  insert into public.team_access_requests(requester_id,team_id,request_type,school_name,sport_name,team_name,message)
  values(auth.uid(),target_team,kind,s,sp,tn,nullif(trim(coalesce(requested_message,'')),'')) returning id into new_id;
  return new_id;
end;
$$;
grant execute on function public.submit_team_access_request(uuid,text,text,text,text) to authenticated;

create or replace function public.list_my_team_access_requests()
returns table(id uuid,request_type text,school_name text,sport_name text,team_name text,status text,message text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select r.id,r.request_type,r.school_name,r.sport_name,r.team_name,r.status,r.message,r.created_at
  from public.team_access_requests r where r.requester_id=auth.uid() order by r.created_at desc
$$;
grant execute on function public.list_my_team_access_requests() to authenticated;

create or replace function public.list_team_join_requests()
returns table(id uuid,requester_id uuid,display_name text,email text,message text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select r.id,r.requester_id,p.display_name,p.email,r.message,r.created_at
  from public.team_access_requests r join public.profiles p on p.id=r.requester_id
  where r.status='pending' and r.request_type='join' and r.team_id=public.current_team_id() and public.is_current_team_admin()
  order by r.created_at
$$;
grant execute on function public.list_team_join_requests() to authenticated;

create or replace function public.list_new_team_requests()
returns table(id uuid,requester_id uuid,display_name text,email text,school_name text,sport_name text,team_name text,message text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select r.id,r.requester_id,p.display_name,p.email,r.school_name,r.sport_name,r.team_name,r.message,r.created_at
  from public.team_access_requests r join public.profiles p on p.id=r.requester_id
  where r.status='pending' and r.request_type='create' and public.is_platform_admin()
  order by r.created_at
$$;
grant execute on function public.list_new_team_requests() to authenticated;

create or replace function public.approve_team_join_request(target_request uuid, granted_role text, granted_permissions jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare r public.team_access_requests%rowtype;
begin
  select * into r from public.team_access_requests where id=target_request and status='pending' and request_type='join';
  if r.id is null or not public.is_team_member(r.team_id) or not public.is_current_team_admin() then raise exception 'Not authorized'; end if;
  if granted_role not in ('admin','coach') then raise exception 'Invalid role'; end if;
  insert into public.team_members(team_id,user_id,member_role,permissions) values(r.team_id,r.requester_id,granted_role,coalesce(granted_permissions,'{}'::jsonb))
  on conflict(team_id,user_id) do update set member_role=excluded.member_role,permissions=excluded.permissions;
  update public.profiles set role='coach' where id=r.requester_id and role='pending';
  update public.team_access_requests set status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
end;
$$;
grant execute on function public.approve_team_join_request(uuid,text,jsonb) to authenticated;

create or replace function public.approve_new_team_request(target_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.team_access_requests%rowtype; new_team uuid;
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  select * into r from public.team_access_requests where id=target_request and status='pending' and request_type='create';
  if r.id is null then raise exception 'Request not found'; end if;
  insert into public.teams(name,school_name,sport_name,created_by) values(r.team_name,r.school_name,r.sport_name,r.requester_id) returning id into new_team;
  insert into public.team_members(team_id,user_id,member_role,permissions) values(new_team,r.requester_id,'owner','{"students":true,"training":true,"assessment":true,"competitions":true,"transport":true}'::jsonb);
  update public.profiles set role='coach' where id=r.requester_id and role='pending';
  update public.team_access_requests set status='approved',team_id=new_team,reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
  return new_team;
end;
$$;
grant execute on function public.approve_new_team_request(uuid) to authenticated;

create or replace function public.reject_team_access_request(target_request uuid) returns void language plpgsql security definer set search_path=public as $$
declare r public.team_access_requests%rowtype;
begin
  select * into r from public.team_access_requests where id=target_request and status='pending';
  if r.id is null then raise exception 'Request not found'; end if;
  if not (public.is_platform_admin() or (r.request_type='join' and r.team_id=public.current_team_id() and public.is_current_team_admin())) then raise exception 'Not authorized'; end if;
  update public.team_access_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
end;
$$;
grant execute on function public.reject_team_access_request(uuid) to authenticated;

-- Permission-aware RLS for core modules.
drop policy if exists "team members manage students" on public.students;
create policy "team students select" on public.students for select to authenticated using (public.team_has_permission(team_id,'students'));
create policy "team students manage" on public.students for all to authenticated using (public.team_has_permission(team_id,'students')) with check (public.team_has_permission(team_id,'students'));

drop policy if exists "team members manage sessions" on public.training_sessions;
create policy "team training select" on public.training_sessions for select to authenticated using (public.team_has_permission(team_id,'training'));
create policy "team training manage" on public.training_sessions for all to authenticated using (public.team_has_permission(team_id,'training')) with check (public.team_has_permission(team_id,'training'));

drop policy if exists "team members manage session items" on public.training_session_items;
create policy "team training items" on public.training_session_items for all to authenticated using (exists(select 1 from public.training_sessions s where s.id=training_session_items.session_id and public.team_has_permission(s.team_id,'training'))) with check (exists(select 1 from public.training_sessions s where s.id=training_session_items.session_id and public.team_has_permission(s.team_id,'training')));

drop policy if exists "team members manage session students" on public.session_students;
create policy "team session students" on public.session_students for all to authenticated using (exists(select 1 from public.training_sessions s where s.id=session_students.session_id and public.team_has_permission(s.team_id,'training'))) with check (exists(select 1 from public.training_sessions s where s.id=session_students.session_id and public.team_has_permission(s.team_id,'training')));

drop policy if exists "team members manage student skill progress" on public.student_skill_progress;
create policy "team assessment progress" on public.student_skill_progress for all to authenticated using (exists(select 1 from public.students s where s.id=student_skill_progress.student_id and public.team_has_permission(s.team_id,'assessment'))) with check (exists(select 1 from public.students s where s.id=student_skill_progress.student_id and public.team_has_permission(s.team_id,'assessment')));
