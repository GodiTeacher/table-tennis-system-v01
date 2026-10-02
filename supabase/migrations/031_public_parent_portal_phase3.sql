alter table public.competitions add column if not exists public_show_roster boolean not null default false;

create table if not exists public.team_public_announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  published_from date,
  published_until date,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_public_announcements_team_idx on public.team_public_announcements(team_id,pinned desc,created_at desc);

alter table public.team_public_announcements enable row level security;
drop policy if exists team_public_announcements_select on public.team_public_announcements;
create policy team_public_announcements_select on public.team_public_announcements for select to authenticated using (public.is_team_member(team_id));
drop policy if exists team_public_announcements_manage on public.team_public_announcements;
create policy team_public_announcements_manage on public.team_public_announcements for all to authenticated using (
  exists(select 1 from public.team_members tm where tm.team_id=team_public_announcements.team_id and tm.user_id=auth.uid() and tm.member_role in ('owner','admin'))
) with check (
  exists(select 1 from public.team_members tm where tm.team_id=team_public_announcements.team_id and tm.user_id=auth.uid() and tm.member_role in ('owner','admin'))
);

update public.teams set public_modules = coalesce(public_modules,'{}'::jsonb) || '{"announcements":true}'::jsonb;

create or replace function public.get_public_competition_holidays(target_slug text)
returns table(holiday_date date,name text)
language sql stable security definer set search_path=public as $$
select h.holiday_date,h.name
from public.competition_holidays h
join public.teams t on t.id=h.team_id
where t.public_enabled=true and t.public_slug=lower(trim(target_slug))
order by h.holiday_date asc;$$;
grant execute on function public.get_public_competition_holidays(text) to anon, authenticated;

create or replace function public.get_public_announcements(target_slug text)
returns table(id uuid,title text,body text,pinned boolean,published_from date,published_until date,created_at timestamptz)
language sql stable security definer set search_path=public as $$
select a.id,a.title,a.body,a.pinned,a.published_from,a.published_until,a.created_at
from public.team_public_announcements a
join public.teams t on t.id=a.team_id
where t.public_enabled=true and t.public_slug=lower(trim(target_slug))
  and coalesce((t.public_modules->>'announcements')::boolean,true)=true
  and a.active=true
  and (a.published_from is null or a.published_from<=current_date)
  and (a.published_until is null or a.published_until>=current_date)
order by a.pinned desc,a.created_at desc;$$;
grant execute on function public.get_public_announcements(text) to anon, authenticated;

create or replace function public.get_public_competition_roster(target_slug text,target_competition uuid)
returns table(student_name text,competition_date date,category text)
language sql stable security definer set search_path=public as $$
select s.display_name,cp.competition_date,cp.category
from public.competition_participants cp
join public.competitions c on c.id=cp.competition_id
join public.teams t on t.id=c.team_id
join public.students s on s.id=cp.student_id
where c.id=target_competition
  and c.public_show_roster=true
  and t.public_enabled=true
  and t.public_slug=lower(trim(target_slug))
  and coalesce((t.public_modules->>'competitions')::boolean,false)=true
order by cp.competition_date nulls last,cp.category nulls last,s.display_name;$$;
grant execute on function public.get_public_competition_roster(text,uuid) to anon, authenticated;

drop function if exists public.get_public_competitions(text);
create function public.get_public_competitions(target_slug text)
returns table(id uuid,name text,start_date date,end_date date,location text,registration_deadline date,status text,public_show_roster boolean)
language sql stable security definer set search_path=public as $$
select c.id,c.name,c.start_date,c.end_date,c.location,c.registration_deadline,c.status,c.public_show_roster
from public.competitions c join public.teams t on t.id=c.team_id
where t.public_enabled=true and t.public_slug=lower(trim(target_slug))
  and (coalesce((t.public_modules->>'competitions')::boolean,false)=true or coalesce((t.public_modules->>'countdown')::boolean,false)=true)
  and c.status<>'cancelled'
order by c.start_date asc;$$;
grant execute on function public.get_public_competitions(text) to anon, authenticated;