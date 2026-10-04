create table if not exists public.subscription_plans (
  code text primary key,
  display_name text not null,
  student_limit integer,
  training_history_months integer,
  monthly_ocr_imports integer,
  pdf_level text not null default 'basic',
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_code_check check (code in ('free','pro')),
  constraint subscription_plans_pdf_level_check check (pdf_level in ('basic','custom')),
  constraint subscription_plans_student_limit_check check (student_limit is null or student_limit >= 0),
  constraint subscription_plans_training_history_check check (training_history_months is null or training_history_months >= 0),
  constraint subscription_plans_ocr_limit_check check (monthly_ocr_imports is null or monthly_ocr_imports >= 0)
);

insert into public.subscription_plans(code,display_name,student_limit,training_history_months,monthly_ocr_imports,pdf_level,features)
values
('free','免費版',20,2,5,'basic',jsonb_build_object(
  'student_roster',true,
  'basic_attendance',true,
  'simple_schedule',true,
  'training_records',true,
  'basic_parent_notifications',true,
  'basic_pdf',true,
  'ocr_student_import',true,
  'table_tennis_map',true,
  'advanced_analytics',false,
  'finance',false,
  'payroll',false,
  'inventory',false,
  'advanced_competitions',false,
  'custom_pdf',false,
  'multi_coach',false
)),
('pro','菁英版',null,null,null,'custom',jsonb_build_object(
  'student_roster',true,
  'basic_attendance',true,
  'simple_schedule',true,
  'training_records',true,
  'basic_parent_notifications',true,
  'basic_pdf',true,
  'ocr_student_import',true,
  'table_tennis_map',true,
  'advanced_analytics',true,
  'finance',true,
  'payroll',true,
  'inventory',true,
  'advanced_competitions',true,
  'custom_pdf',true,
  'multi_coach',true
))
on conflict (code) do update set
  display_name=excluded.display_name,
  student_limit=excluded.student_limit,
  training_history_months=excluded.training_history_months,
  monthly_ocr_imports=excluded.monthly_ocr_imports,
  pdf_level=excluded.pdf_level,
  features=excluded.features,
  active=true,
  updated_at=now();

create table if not exists public.team_subscriptions (
  team_id uuid primary key references public.teams(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code) default 'free',
  status text not null default 'active',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  override_limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_subscriptions_status_check check (status in ('active','trial','past_due','cancelled'))
);

create table if not exists public.team_usage_monthly (
  team_id uuid not null references public.teams(id) on delete cascade,
  usage_month date not null,
  ocr_imports integer not null default 0,
  pdf_exports integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(team_id,usage_month),
  constraint team_usage_monthly_month_check check (usage_month = date_trunc('month',usage_month)::date),
  constraint team_usage_monthly_ocr_check check (ocr_imports >= 0),
  constraint team_usage_monthly_pdf_check check (pdf_exports >= 0)
);

alter table public.subscription_plans enable row level security;
alter table public.team_subscriptions enable row level security;
alter table public.team_usage_monthly enable row level security;

drop policy if exists subscription_plans_read on public.subscription_plans;
create policy subscription_plans_read on public.subscription_plans for select to authenticated using (active=true);

drop policy if exists subscription_plans_platform_manage on public.subscription_plans;
create policy subscription_plans_platform_manage on public.subscription_plans for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.platform_admin=true))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.platform_admin=true));

drop policy if exists team_subscriptions_read on public.team_subscriptions;
create policy team_subscriptions_read on public.team_subscriptions for select to authenticated
using (exists(select 1 from public.team_members tm where tm.team_id=team_subscriptions.team_id and tm.user_id=auth.uid()));

drop policy if exists team_subscriptions_platform_manage on public.team_subscriptions;
create policy team_subscriptions_platform_manage on public.team_subscriptions for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.platform_admin=true))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.platform_admin=true));

drop policy if exists team_usage_monthly_read on public.team_usage_monthly;
create policy team_usage_monthly_read on public.team_usage_monthly for select to authenticated
using (exists(select 1 from public.team_members tm where tm.team_id=team_usage_monthly.team_id and tm.user_id=auth.uid()));

drop policy if exists team_usage_monthly_manage on public.team_usage_monthly;
create policy team_usage_monthly_manage on public.team_usage_monthly for all to authenticated
using (exists(select 1 from public.team_members tm where tm.team_id=team_usage_monthly.team_id and tm.user_id=auth.uid()))
with check (exists(select 1 from public.team_members tm where tm.team_id=team_usage_monthly.team_id and tm.user_id=auth.uid()));

create or replace function public.create_default_team_subscription()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.team_subscriptions(team_id,plan_code,status)
  values(new.id,'free','active')
  on conflict (team_id) do nothing;
  return new;
end;$$;

drop trigger if exists teams_default_subscription_trigger on public.teams;
create trigger teams_default_subscription_trigger
after insert on public.teams
for each row execute function public.create_default_team_subscription();

-- Existing development teams stay Pro so current development data/features are not disrupted.
insert into public.team_subscriptions(team_id,plan_code,status)
select id,'pro','active' from public.teams
on conflict (team_id) do update set plan_code='pro',status='active',updated_at=now();

create or replace function public.get_team_entitlements(target_team uuid)
returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'plan_code',sp.code,
    'plan_name',sp.display_name,
    'student_limit',coalesce((ts.override_limits->>'student_limit')::integer,sp.student_limit),
    'training_history_months',coalesce((ts.override_limits->>'training_history_months')::integer,sp.training_history_months),
    'monthly_ocr_imports',coalesce((ts.override_limits->>'monthly_ocr_imports')::integer,sp.monthly_ocr_imports),
    'pdf_level',coalesce(ts.override_limits->>'pdf_level',sp.pdf_level),
    'features',sp.features,
    'status',ts.status
  )
  from public.team_subscriptions ts
  join public.subscription_plans sp on sp.code=ts.plan_code
  where ts.team_id=target_team;
$$;
grant execute on function public.get_team_entitlements(uuid) to authenticated;

create or replace function public.team_can_use(target_team uuid,feature_key text)
returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce((sp.features->>feature_key)::boolean,false)
  from public.team_subscriptions ts join public.subscription_plans sp on sp.code=ts.plan_code
  where ts.team_id=target_team and ts.status in ('active','trial');
$$;
grant execute on function public.team_can_use(uuid,text) to authenticated;

create or replace function public.team_training_history_cutoff(target_team uuid)
returns date
language sql stable security definer set search_path=public as $$
  select case
    when coalesce((ts.override_limits->>'training_history_months')::integer,sp.training_history_months) is null then null
    else (current_date - make_interval(months => coalesce((ts.override_limits->>'training_history_months')::integer,sp.training_history_months)))::date
  end
  from public.team_subscriptions ts join public.subscription_plans sp on sp.code=ts.plan_code
  where ts.team_id=target_team;
$$;
grant execute on function public.team_training_history_cutoff(uuid) to authenticated;

create or replace function public.enforce_team_student_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_limit integer;
  v_count integer;
begin
  if coalesce(new.active,true)=false then return new; end if;
  select coalesce((ts.override_limits->>'student_limit')::integer,sp.student_limit)
    into v_limit
  from public.team_subscriptions ts join public.subscription_plans sp on sp.code=ts.plan_code
  where ts.team_id=new.team_id and ts.status in ('active','trial');
  if v_limit is null then return new; end if;
  select count(*) into v_count from public.students s
   where s.team_id=new.team_id and s.active=true and (tg_op='INSERT' or s.id<>new.id);
  if v_count >= v_limit then
    raise exception 'FREE_STUDENT_LIMIT_REACHED:%',v_limit using errcode='P0001';
  end if;
  return new;
end;$$;

drop trigger if exists students_plan_limit_trigger on public.students;
create trigger students_plan_limit_trigger
before insert or update of active,team_id on public.students
for each row execute function public.enforce_team_student_limit();
