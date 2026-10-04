-- SECURITY DEFINER functions are executable by PUBLIC by default in Postgres.
-- Restrict SaaS/private RPCs to signed-in users only; trigger functions need no API execute grant.

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

revoke all on function public.platform_list_teams() from public, anon;
grant execute on function public.platform_list_teams() to authenticated;

revoke all on function public.platform_set_team_plan(uuid,text,text,timestamptz) from public, anon;
grant execute on function public.platform_set_team_plan(uuid,text,text,timestamptz) to authenticated;

revoke all on function public.get_team_entitlements(uuid) from public, anon;
grant execute on function public.get_team_entitlements(uuid) to authenticated;

revoke all on function public.team_can_use(uuid,text) from public, anon;
grant execute on function public.team_can_use(uuid,text) to authenticated;

revoke all on function public.team_training_history_cutoff(uuid) from public, anon;
grant execute on function public.team_training_history_cutoff(uuid) to authenticated;

revoke all on function public.create_default_team_subscription() from public, anon, authenticated;
revoke all on function public.enforce_team_student_limit() from public, anon, authenticated;
