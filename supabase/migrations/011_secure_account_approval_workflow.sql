alter table public.profiles add column if not exists email text;

update public.profiles p set email=u.email from auth.users u where p.id=u.id and p.email is null;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name,role,email)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)),'pending',new.email)
  on conflict(id) do update set email=excluded.email;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

drop policy if exists "profile owner can update" on public.profiles;

create or replace function public.is_current_team_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members tm where tm.user_id=auth.uid() and tm.team_id=public.current_team_id() and tm.member_role in ('owner','admin'))
$$;

create or replace function public.list_pending_accounts()
returns table(id uuid,display_name text,email text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.id,p.display_name,p.email,p.created_at from public.profiles p
  where public.is_current_team_admin() and p.role='pending'
    and not exists(select 1 from public.team_members tm where tm.user_id=p.id)
  order by p.created_at
$$;

create or replace function public.list_current_team_members()
returns table(id uuid,display_name text,email text,role text,member_role text,joined_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.id,p.display_name,p.email,p.role,tm.member_role,tm.created_at
  from public.team_members tm join public.profiles p on p.id=tm.user_id
  where public.is_current_team_admin() and tm.team_id=public.current_team_id()
  order by tm.created_at
$$;

create or replace function public.approve_pending_account(target_user uuid) returns void language plpgsql security definer set search_path=public as $$
declare target_team uuid;
begin
  if not public.is_current_team_admin() then raise exception 'Not authorized'; end if;
  target_team:=public.current_team_id();
  if target_team is null then raise exception 'No current team'; end if;
  if not exists(select 1 from public.profiles p where p.id=target_user and p.role='pending') then raise exception 'Account is not pending'; end if;
  update public.profiles set role='coach' where id=target_user;
  insert into public.team_members(team_id,user_id,member_role) values(target_team,target_user,'coach')
  on conflict(team_id,user_id) do update set member_role='coach';
end;
$$;

grant execute on function public.list_pending_accounts() to authenticated;
grant execute on function public.list_current_team_members() to authenticated;
grant execute on function public.approve_pending_account(uuid) to authenticated;
