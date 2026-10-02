drop function if exists public.get_public_competition_holidays(text);
create function public.get_public_competition_holidays(target_slug text)
returns table(holiday_date date, name text)
language sql stable security definer set search_path='public'
as $$
select h.holiday_date,h.name
from public.competition_holidays h
join public.teams t on t.id=h.team_id
where t.public_enabled=true and t.public_slug=lower(trim(target_slug))
order by h.holiday_date;
$$;
grant execute on function public.get_public_competition_holidays(text) to anon, authenticated;
