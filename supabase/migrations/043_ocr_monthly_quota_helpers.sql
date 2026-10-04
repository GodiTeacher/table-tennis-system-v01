create or replace function public.get_current_ocr_usage()
returns table(used integer, monthly_limit integer, remaining integer, unlimited boolean)
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_team uuid;
  v_limit integer;
  v_used integer;
begin
  v_team := public.current_team_id();
  if v_team is null then raise exception 'NO_TEAM'; end if;

  select (public.get_team_entitlements(v_team)->>'monthly_ocr_imports')::integer into v_limit;
  select coalesce(ocr_imports,0) into v_used
  from public.team_usage_monthly
  where team_id=v_team and usage_month=date_trunc('month', current_date)::date;
  v_used := coalesce(v_used,0);

  return query select v_used, v_limit,
    case when v_limit is null then null else greatest(v_limit-v_used,0) end,
    v_limit is null;
end;
$$;

create or replace function public.consume_ocr_import()
returns table(allowed boolean, used integer, monthly_limit integer, remaining integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_team uuid;
  v_limit integer;
  v_used integer;
  v_month date := date_trunc('month', current_date)::date;
begin
  v_team := public.current_team_id();
  if v_team is null then raise exception 'NO_TEAM'; end if;

  select (public.get_team_entitlements(v_team)->>'monthly_ocr_imports')::integer into v_limit;

  insert into public.team_usage_monthly(team_id,usage_month,ocr_imports,pdf_exports)
  values(v_team,v_month,0,0)
  on conflict (team_id,usage_month) do nothing;

  select ocr_imports into v_used
  from public.team_usage_monthly
  where team_id=v_team and usage_month=v_month
  for update;

  if v_limit is not null and v_used >= v_limit then
    return query select false, v_used, v_limit, 0;
    return;
  end if;

  update public.team_usage_monthly
  set ocr_imports=ocr_imports+1, updated_at=now()
  where team_id=v_team and usage_month=v_month
  returning ocr_imports into v_used;

  return query select true, v_used, v_limit,
    case when v_limit is null then null else greatest(v_limit-v_used,0) end;
end;
$$;

revoke all on function public.get_current_ocr_usage() from public, anon;
revoke all on function public.consume_ocr_import() from public, anon;
grant execute on function public.get_current_ocr_usage() to authenticated;
grant execute on function public.consume_ocr_import() to authenticated;
