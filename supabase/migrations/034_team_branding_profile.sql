alter table public.teams
  add column if not exists short_name text,
  add column if not exists logo_data_url text,
  add column if not exists brand_color text,
  add column if not exists tagline text;

create or replace function public.update_current_team_branding(
  target_name text,
  target_short_name text,
  target_logo_data_url text,
  target_brand_color text,
  target_tagline text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
  role_text text;
begin
  tid := public.current_team_id();
  if tid is null then
    raise exception '目前沒有可管理的隊伍。';
  end if;

  select tm.member_role into role_text
  from public.team_members tm
  where tm.team_id = tid and tm.user_id = auth.uid()
  limit 1;

  if role_text not in ('owner','admin') then
    raise exception '只有隊伍擁有者或管理員可以修改品牌設定。';
  end if;

  if coalesce(trim(target_name),'') = '' then
    raise exception '團隊名稱不可空白。';
  end if;

  if target_brand_color is not null and target_brand_color <> '' and target_brand_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception '品牌主題色格式不正確。';
  end if;

  if target_logo_data_url is not null and length(target_logo_data_url) > 700000 then
    raise exception 'Logo 檔案過大，請壓縮後再上傳。';
  end if;

  update public.teams
  set name = trim(target_name),
      short_name = nullif(trim(target_short_name),''),
      logo_data_url = nullif(target_logo_data_url,''),
      brand_color = coalesce(nullif(target_brand_color,''), '#7c3aed'),
      tagline = nullif(trim(target_tagline),'')
  where id = tid;
end;
$$;

revoke all on function public.update_current_team_branding(text,text,text,text,text) from public;
grant execute on function public.update_current_team_branding(text,text,text,text,text) to authenticated;
