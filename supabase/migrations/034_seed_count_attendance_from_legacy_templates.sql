insert into public.attendance_templates (team_id, weekday, mode, grade, student_id, start_time, end_time, default_count, active, note, created_by)
select t.team_id, t.weekday, 'count', null, null, t.start_time, t.end_time,
       sum(case when t.mode='grade' then coalesce(t.default_count,0) else 1 end)::int,
       true, '由舊出勤模板自動合併轉換', min(t.created_by::text)::uuid
from public.attendance_templates t
where t.active=true
  and t.mode in ('grade','individual')
  and t.weekday between 1 and 5
  and not exists (
    select 1 from public.attendance_templates c
    where c.team_id=t.team_id and c.mode='count' and c.active=true
  )
group by t.team_id,t.weekday,t.start_time,t.end_time;
