-- Label the existing workspace for the current deployment.
update public.teams
set school_name = coalesce(school_name, '管嶼國小'),
    sport_name = coalesce(nullif(sport_name,''), '桌球'),
    name = case when name='桌球隊工作區' then '桌球隊' else name end
where school_name is null;

-- Competition module permission.
drop policy if exists coach_admin_manage_competitions on public.competitions;
drop policy if exists competitions_coach_all on public.competitions;
drop policy if exists team_members_manage_competitions on public.competitions;
drop policy if exists team_competitions_select on public.competitions;
drop policy if exists team_competitions_manage on public.competitions;
create policy team_competitions_select on public.competitions for select to authenticated
using (public.team_has_permission(team_id,'competitions'));
create policy team_competitions_manage on public.competitions for all to authenticated
using (public.team_has_permission(team_id,'competitions'))
with check (public.team_has_permission(team_id,'competitions'));

-- Participants belong to a competition and inherit its competition permission.
drop policy if exists coach_admin_manage_competition_participants on public.competition_participants;
drop policy if exists competition_participants_coach_all on public.competition_participants;
drop policy if exists team_participants_manage on public.competition_participants;
create policy team_participants_manage on public.competition_participants for all to authenticated
using (exists(select 1 from public.competitions c where c.id=competition_participants.competition_id and public.team_has_permission(c.team_id,'competitions')))
with check (exists(select 1 from public.competitions c where c.id=competition_participants.competition_id and public.team_has_permission(c.team_id,'competitions')));

-- Transport module permission.
drop policy if exists coach_admin_manage_transport_vehicles on public.competition_transport_vehicles;
drop policy if exists team_transport_vehicles_manage on public.competition_transport_vehicles;
create policy team_transport_vehicles_manage on public.competition_transport_vehicles for all to authenticated
using (exists(select 1 from public.competitions c where c.id=competition_transport_vehicles.competition_id and public.team_has_permission(c.team_id,'transport')))
with check (exists(select 1 from public.competitions c where c.id=competition_transport_vehicles.competition_id and public.team_has_permission(c.team_id,'transport')));

drop policy if exists coach_admin_manage_transport_assignments on public.competition_transport_assignments;
drop policy if exists team_transport_assignments_manage on public.competition_transport_assignments;
create policy team_transport_assignments_manage on public.competition_transport_assignments for all to authenticated
using (exists(select 1 from public.competitions c where c.id=competition_transport_assignments.competition_id and public.team_has_permission(c.team_id,'transport')))
with check (exists(select 1 from public.competitions c where c.id=competition_transport_assignments.competition_id and public.team_has_permission(c.team_id,'transport')));

drop policy if exists coach_admin_manage_competition_payments on public.competition_payments;
drop policy if exists team_competition_payments_manage on public.competition_payments;
create policy team_competition_payments_manage on public.competition_payments for all to authenticated
using (exists(select 1 from public.competitions c where c.id=competition_payments.competition_id and public.team_has_permission(c.team_id,'transport')))
with check (exists(select 1 from public.competitions c where c.id=competition_payments.competition_id and public.team_has_permission(c.team_id,'transport')));
