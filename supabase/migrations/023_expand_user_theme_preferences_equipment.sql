alter table public.profiles drop constraint if exists profiles_theme_preference_check;
alter table public.profiles add constraint profiles_theme_preference_check
  check (theme_preference in ('current','clean','teaching','competitive','sunset','berry','pingpong','equipment'));

create or replace function public.set_my_theme(target_theme text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_theme not in ('current','clean','teaching','competitive','sunset','berry','pingpong','equipment') then
    raise exception 'Invalid theme';
  end if;

  update public.profiles
  set theme_preference = target_theme
  where id = auth.uid();
end;
$$;
