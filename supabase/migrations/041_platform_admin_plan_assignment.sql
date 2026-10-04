create table if not exists public.plan_assignment_logs (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  old_plan_code text,
  new_plan_code text not null references public.subscription_plans(code),
  reason text,
  changed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.plan_assignment_logs enable row level security;

drop policy if exists plan_assignment_logs_platform_read on public.plan_assignment_logs;
create policy plan_assignment_logs_platform_read on public.plan_assignment_logs
for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.platform_admin=true));

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce((select p.platform_admin from public.profiles p where p.id=auth.uid()),false);
$$;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.platform_list_teams()
returns table(
  team_id uuid,
  team_name text,
  school_name text,
  owner_name text,
  owner_email text,
  active_students bigint,
  plan_code text,
  plan_name text,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz
)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501';
  end if;

  return query
  select
    t.id,
    t.name,
    t.school_name,
    coalesce(owner_profile.display_name,''),
    coalesce(owner_profile.email,''),
    (select count(*) from public.students s where s.team_id=t.id and s.active=true),
    coalesce(ts.plan_code,'free'),
    coalesce(sp.display_name,'免費版'),
    coalesce(ts.status,'active'),
    ts.current_period_end,
    t.created_at
  from public.teams t
  left join public.team_subscriptions ts on ts.team_id=t.id
  left join public.subscription_plans sp on sp.code=coalesce(ts.plan_code,'free')
  left join lateral (
    select p.display_name,p.email
    from public.team_members tm
    join public.profiles p on p.id=tm.user_id
    where tm.team_id=t.id
    order by case tm.member_role when 'owner' then 0 when 'admin' then 1 else 2 end, tm.created_at
    limit 1
  ) owner_profile on true
  order by t.created_at desc;
end;$$;
grant execute on function public.platform_list_teams() to authenticated;

create or replace function public.platform_set_team_plan(
  target_team uuid,
  target_plan text,
  change_reason text default null,
  period_end timestamptz default null
)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  old_plan text;
  normalized_reason text;
begin
  if not public.is_platform_admin() then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode='42501';
  end if;

  if not exists(select 1 from public.teams where id=target_team) then
    raise exception 'TEAM_NOT_FOUND' using errcode='P0002';
  end if;

  if not exists(select 1 from public.subscription_plans where code=target_plan and active=true) then
    raise exception 'INVALID_PLAN' using errcode='22023';
  end if;

  select plan_code into old_plan from public.team_subscriptions where team_id=target_team;
  normalized_reason=nullif(trim(coalesce(change_reason,'')),'');

  insert into public.team_subscriptions(team_id,plan_code,status,current_period_start,current_period_end,updated_at)
  values(target_team,target_plan,'active',now(),period_end,now())
  on conflict(team_id) do update set
    plan_code=excluded.plan_code,
    status='active',
    current_period_start=now(),
    current_period_end=excluded.current_period_end,
    updated_at=now();

  insert into public.plan_assignment_logs(team_id,old_plan_code,new_plan_code,reason,changed_by)
  values(target_team,old_plan,target_plan,normalized_reason,auth.uid());

  return jsonb_build_object('ok',true,'team_id',target_team,'old_plan',old_plan,'new_plan',target_plan,'period_end',period_end);
end;$$;
grant execute on function public.platform_set_team_plan(uuid,text,text,timestamptz) to authenticated;
