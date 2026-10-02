alter table public.teams add column if not exists public_enabled boolean not null default false;
alter table public.teams add column if not exists public_slug text;
alter table public.teams add column if not exists public_description text;
alter table public.teams add column if not exists public_modules jsonb not null default '{"competitions":true,"countdown":true,"standards":true,"rubber_guide":true,"blade_guide":true,"career_guide":true,"service_rules":true}'::jsonb;

update public.teams
set public_slug = 'team-' || substr(id::text,1,8)
where public_slug is null or btrim(public_slug)='';

create unique index if not exists teams_public_slug_unique on public.teams(public_slug) where public_slug is not null;

create or replace function public.update_current_team_public_settings(target_enabled boolean,target_slug text,target_description text,target_modules jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare tid uuid; role_text text; cleaned_slug text;
begin
  tid := public.current_team_id();
  if tid is null then raise exception '目前沒有可管理的隊伍。'; end if;
  select tm.member_role into role_text from public.team_members tm where tm.team_id=tid and tm.user_id=auth.uid() limit 1;
  if role_text not in ('owner','admin') then raise exception '只有隊伍擁有者或管理員可以修改公開設定。'; end if;
  cleaned_slug := lower(trim(coalesce(target_slug,'')));
  if cleaned_slug !~ '^[a-z0-9][a-z0-9-]{2,39}$' then raise exception '公開網址代碼需為 3～40 個英文字母、數字或連字號。'; end if;
  if exists(select 1 from public.teams t where t.public_slug=cleaned_slug and t.id<>tid) then raise exception '這個公開網址代碼已被使用，請換一個。'; end if;
  update public.teams set public_enabled=coalesce(target_enabled,false),public_slug=cleaned_slug,public_description=nullif(trim(coalesce(target_description,'')),''),public_modules=coalesce(target_modules,'{}'::jsonb) where id=tid;
end;$$;
grant execute on function public.update_current_team_public_settings(boolean,text,text,jsonb) to authenticated;

create or replace function public.get_public_team(target_slug text)
returns table(team_id uuid,name text,short_name text,school_name text,sport_name text,logo_data_url text,brand_color text,tagline text,public_description text,public_modules jsonb)
language sql stable security definer set search_path=public as $$
select t.id,t.name,t.short_name,t.school_name,t.sport_name,t.logo_data_url,t.brand_color,t.tagline,t.public_description,t.public_modules
from public.teams t where t.public_enabled=true and t.public_slug=lower(trim(target_slug)) limit 1;$$;
grant execute on function public.get_public_team(text) to anon, authenticated;

create or replace function public.get_public_competitions(target_slug text)
returns table(id uuid,name text,start_date date,end_date date,location text,registration_deadline date,status text,notes text)
language sql stable security definer set search_path=public as $$
select c.id,c.name,c.start_date,c.end_date,c.location,c.registration_deadline,c.status,c.notes
from public.competitions c join public.teams t on t.id=c.team_id
where t.public_enabled=true and t.public_slug=lower(trim(target_slug))
  and coalesce((t.public_modules->>'competitions')::boolean,false)=true
  and c.status<>'cancelled'
order by c.start_date asc;$$;
grant execute on function public.get_public_competitions(text) to anon, authenticated;