alter table public.competitions
  add column if not exists public_image_urls text[] not null default '{}';

update public.competitions
set public_image_urls = array[public_image_url]
where coalesce(array_length(public_image_urls, 1), 0) = 0
  and public_image_url is not null
  and btrim(public_image_url) <> '';

drop function if exists public.get_public_competitions(text);
create function public.get_public_competitions(target_slug text)
returns table(
  id uuid,
  name text,
  start_date date,
  end_date date,
  location text,
  registration_deadline date,
  status text,
  public_show_roster boolean,
  public_meeting_time text,
  public_meeting_place text,
  public_clothing text,
  public_notes text,
  public_official_url text,
  public_image_url text,
  public_image_urls text[]
)
language sql stable security definer set search_path='public'
as $$
select c.id,c.name,c.start_date,c.end_date,c.location,c.registration_deadline,c.status,
       c.public_show_roster,c.public_meeting_time,c.public_meeting_place,c.public_clothing,c.public_notes,
       c.public_official_url,c.public_image_url,
       case
         when coalesce(array_length(c.public_image_urls, 1), 0) > 0 then c.public_image_urls
         when c.public_image_url is not null and btrim(c.public_image_url) <> '' then array[c.public_image_url]
         else '{}'::text[]
       end
from public.competitions c
join public.teams t on t.id=c.team_id
where t.public_enabled=true and t.public_slug=lower(trim(target_slug))
  and (coalesce((t.public_modules->>'competitions')::boolean,false)=true
       or coalesce((t.public_modules->>'countdown')::boolean,false)=true)
  and c.status<>'cancelled'
order by c.start_date asc;
$$;
grant execute on function public.get_public_competitions(text) to anon, authenticated;
