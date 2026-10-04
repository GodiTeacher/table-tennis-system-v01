drop function if exists public.get_public_competition_roster(text,uuid);

create function public.get_public_competition_roster(target_slug text,target_competition uuid)
returns table(
  student_name text,
  competition_date date,
  category text,
  participant_role text
)
language sql stable security definer set search_path=public as $$
select
  s.display_name,
  cp.competition_date,
  cp.category,
  cp.participant_role
from public.competition_participants cp
join public.competitions c on c.id=cp.competition_id
join public.teams t on t.id=c.team_id
join public.students s on s.id=cp.student_id
where c.id=target_competition
  and c.public_show_roster=true
  and t.public_enabled=true
  and t.public_slug=lower(trim(target_slug))
  and coalesce((t.public_modules->>'competitions')::boolean,false)=true
order by
  cp.competition_date nulls last,
  cp.category nulls last,
  case when cp.participant_role='competitor' then 0 else 1 end,
  s.display_name;
$$;

grant execute on function public.get_public_competition_roster(text,uuid) to anon, authenticated;
