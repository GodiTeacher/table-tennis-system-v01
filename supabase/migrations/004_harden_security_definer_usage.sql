drop policy if exists "coaches manage students" on public.students;
drop policy if exists "coach manages own session students" on public.session_students;
drop policy if exists "coaches manage student skill progress" on public.student_skill_progress;

create policy "coaches manage students"
on public.students for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('coach','admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('coach','admin')
  )
);

create policy "coach manages own session students"
on public.session_students for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('coach','admin')
  )
  and exists (
    select 1 from public.training_sessions s
    where s.id = session_students.session_id
      and s.coach_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('coach','admin')
  )
  and exists (
    select 1 from public.training_sessions s
    where s.id = session_students.session_id
      and s.coach_id = auth.uid()
  )
);

create policy "coaches manage student skill progress"
on public.student_skill_progress for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('coach','admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('coach','admin')
  )
);

revoke all on function public.is_coach_or_admin() from public, anon, authenticated;
drop function if exists public.is_coach_or_admin();

revoke all on function public.handle_new_user() from public, anon, authenticated;
