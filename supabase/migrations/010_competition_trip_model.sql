alter table public.competition_participants add column if not exists competition_date date;
update public.competition_participants cp set competition_date=c.start_date from public.competitions c where cp.competition_id=c.id and cp.competition_date is null;
alter table public.competition_participants alter column competition_date set not null;
alter table public.competition_participants drop constraint if exists competition_participants_competition_id_student_id_category_key;
create unique index if not exists competition_participant_day_category_uq on public.competition_participants(competition_id,student_id,competition_date,coalesce(category,''));

alter table public.competition_transport_vehicles add column if not exists transport_date date;
alter table public.competition_transport_vehicles add column if not exists fare_per_ride numeric(10,2) not null default 0 check (fare_per_ride>=0);
update public.competition_transport_vehicles v set transport_date=c.start_date from public.competitions c where v.competition_id=c.id and v.transport_date is null;
alter table public.competition_transport_vehicles alter column transport_date set not null;

alter table public.competition_transport_assignments add column if not exists competition_id uuid references public.competitions(id) on delete cascade;
alter table public.competition_transport_assignments add column if not exists transport_date date;
alter table public.competition_transport_assignments add column if not exists ride_direction text check (ride_direction in ('outbound','return'));
alter table public.competition_transport_assignments add column if not exists amount_due numeric(10,2) not null default 0 check (amount_due>=0);
alter table public.competition_transport_assignments add column if not exists amount_paid numeric(10,2) not null default 0 check (amount_paid>=0);
alter table public.competition_transport_assignments add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','waived'));
alter table public.competition_transport_assignments add column if not exists payment_note text;

update public.competition_transport_assignments a
set competition_id=v.competition_id,
    transport_date=v.transport_date,
    ride_direction=case when v.direction='return' then 'return' else 'outbound' end,
    amount_due=coalesce(v.fare_per_ride,0)
from public.competition_transport_vehicles v
where a.vehicle_id=v.id and (a.competition_id is null or a.transport_date is null or a.ride_direction is null);

alter table public.competition_transport_assignments alter column competition_id set not null;
alter table public.competition_transport_assignments alter column transport_date set not null;
alter table public.competition_transport_assignments alter column ride_direction set not null;
alter table public.competition_transport_assignments drop constraint if exists competition_transport_assignments_vehicle_id_student_id_key;
create unique index if not exists competition_student_trip_unique on public.competition_transport_assignments(competition_id,student_id,transport_date,ride_direction);

create or replace function public.validate_transport_assignment() returns trigger language plpgsql security definer set search_path=public as $$
declare v public.competition_transport_vehicles%rowtype; used_count integer;
begin
  select * into v from public.competition_transport_vehicles where id=new.vehicle_id;
  if v.id is null then raise exception 'Vehicle not found'; end if;
  if new.competition_id<>v.competition_id or new.transport_date<>v.transport_date then raise exception 'Trip date or competition does not match vehicle'; end if;
  if v.direction='outbound' and new.ride_direction<>'outbound' then raise exception 'Vehicle is outbound only'; end if;
  if v.direction='return' and new.ride_direction<>'return' then raise exception 'Vehicle is return only'; end if;
  select count(*) into used_count from public.competition_transport_assignments a where a.vehicle_id=new.vehicle_id and a.transport_date=new.transport_date and a.ride_direction=new.ride_direction and a.id<>coalesce(new.id,gen_random_uuid());
  if used_count>=v.capacity then raise exception 'Vehicle capacity exceeded'; end if;
  return new;
end;
$$;

drop trigger if exists validate_transport_assignment_trigger on public.competition_transport_assignments;
create trigger validate_transport_assignment_trigger before insert or update on public.competition_transport_assignments for each row execute function public.validate_transport_assignment();
