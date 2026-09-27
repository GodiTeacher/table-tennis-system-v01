create or replace function public.is_coach_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('coach','admin')
  );
$$;

grant execute on function public.is_coach_or_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'coach'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create policy "profile owner can read"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "profile owner can update"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "coaches manage students"
on public.students for all to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

create policy "coach manages own session students"
on public.session_students for all to authenticated
using (
  public.is_coach_or_admin()
  and exists (
    select 1 from public.training_sessions s
    where s.id = session_students.session_id
      and s.coach_id = auth.uid()
  )
)
with check (
  public.is_coach_or_admin()
  and exists (
    select 1 from public.training_sessions s
    where s.id = session_students.session_id
      and s.coach_id = auth.uid()
  )
);

create policy "coaches manage student skill progress"
on public.student_skill_progress for all to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());
