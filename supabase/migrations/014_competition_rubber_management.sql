alter table public.team_members alter column permissions set default '{"students":true,"training":true,"assessment":true,"competitions":true,"transport":true,"equipment":true}'::jsonb;
update public.team_members set permissions = permissions || '{"equipment":true}'::jsonb where not (permissions ? 'equipment');

create table if not exists public.competition_rubber_orders (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  side text not null check (side in ('forehand','backhand')),
  rubber_brand text,
  rubber_model text not null,
  sponge_thickness text,
  color text check (color in ('red','black','other')),
  rubber_price numeric(10,2) not null default 0 check (rubber_price>=0),
  labor_fee numeric(10,2) not null default 0 check (labor_fee>=0),
  edge_tape_fee numeric(10,2) not null default 0 check (edge_tape_fee>=0),
  amount_due numeric(10,2) not null default 0 check (amount_due>=0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid>=0),
  payee text,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','waived')),
  workflow_status text not null default 'requested' check (workflow_status in ('requested','ordered','arrived','glued','delivered','cancelled')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competition_rubber_orders_competition_idx on public.competition_rubber_orders(competition_id,workflow_status);
create index if not exists competition_rubber_orders_student_idx on public.competition_rubber_orders(student_id,created_at desc);

create or replace function public.assign_rubber_order_team() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.team_id is null then new.team_id:=public.current_team_id(); end if;
  if new.team_id is null or not public.team_has_permission(new.team_id,'equipment') then raise exception 'No equipment permission'; end if;
  if not exists(select 1 from public.competitions c where c.id=new.competition_id and c.team_id=new.team_id) then raise exception 'Competition does not belong to team'; end if;
  if not exists(select 1 from public.students s where s.id=new.student_id and s.team_id=new.team_id) then raise exception 'Student does not belong to team'; end if;
  new.amount_due:=coalesce(new.rubber_price,0)+coalesce(new.labor_fee,0)+coalesce(new.edge_tape_fee,0);
  new.updated_at:=now();
  return new;
end;
$$;

drop trigger if exists competition_rubber_orders_assign_team on public.competition_rubber_orders;
create trigger competition_rubber_orders_assign_team before insert or update on public.competition_rubber_orders for each row execute function public.assign_rubber_order_team();

alter table public.competition_rubber_orders enable row level security;
drop policy if exists competition_rubber_orders_access on public.competition_rubber_orders;
create policy competition_rubber_orders_access on public.competition_rubber_orders for all to authenticated
using (public.team_has_permission(team_id,'equipment'))
with check (public.team_has_permission(team_id,'equipment'));

create or replace function public.approve_new_team_request(target_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.team_access_requests%rowtype; new_team uuid;
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  select * into r from public.team_access_requests where id=target_request and status='pending' and request_type='create';
  if r.id is null then raise exception 'Request not found'; end if;
  insert into public.teams(name,school_name,sport_name,created_by) values(r.team_name,r.school_name,r.sport_name,r.requester_id) returning id into new_team;
  insert into public.team_members(team_id,user_id,member_role,permissions) values(new_team,r.requester_id,'owner','{"students":true,"training":true,"assessment":true,"competitions":true,"transport":true,"equipment":true}'::jsonb);
  update public.profiles set role='coach' where id=r.requester_id and role='pending';
  update public.team_access_requests set status='approved',team_id=new_team,reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
  return new_team;
end;
$$;
