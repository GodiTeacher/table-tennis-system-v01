import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type SkillProgress = {
  skill_id: string;
  level_value: number | null;
  status: string | null;
  observation: string | null;
  assessed_at: string;
};

const STATUS_TEXT: Record<string, string> = {
  learning: '學習中',
  developing: '發展中',
  stable: '穩定',
  mastered: '已掌握',
};

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const { data: student } = await supabase
    .from('students')
    .select('id,display_name,grade,class_name,gender,active,created_at')
    .eq('id', id)
    .single();
  if (!student) notFound();

  const [{ data: attendanceRows }, { data: progressRows }] = await Promise.all([
    supabase.from('session_students').select('session_id,table_no,group_no').eq('student_id', id),
    supabase.from('student_skill_progress').select('skill_id,level_value,status,observation,assessed_at').eq('student_id', id).order('assessed_at', { ascending: false }),
  ]);

  const sessionIds = [...new Set((attendanceRows ?? []).map((row) => row.session_id))];
  const [{ data: sessions }, { data: itemRows }] = await Promise.all([
    sessionIds.length
      ? supabase.from('training_sessions').select('id,session_date,focus_level,duration_minutes,table_count,created_at').in('id', sessionIds).order('session_date', { ascending: false }).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ id: string; session_date: string; focus_level: string; duration_minutes: number; table_count: number; created_at: string }> }),
    sessionIds.length
      ? supabase.from('training_session_items').select('session_id,skill_id,planned_minutes').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as Array<{ session_id: string; skill_id: string; planned_minutes: number | null }> }),
  ]);

  const skillIds = [...new Set((itemRows ?? []).map((row) => row.skill_id))];
  const { data: skills } = skillIds.length
    ? await supabase.from('skills').select('id,name,domain,subcategory,stage').in('id', skillIds)
    : { data: [] as Array<{ id: string; name: string; domain: string; subcategory: string | null; stage: string | null }> };

  const skillMap = new Map((skills ?? []).map((skill) => [skill.id, skill]));
  const latestProgress = new Map<string, SkillProgress>();
  for (const row of (progressRows ?? []) as SkillProgress[]) {
    if (!latestProgress.has(row.skill_id)) latestProgress.set(row.skill_id, row);
  }

  const practiceMap = new Map<string, { count: number; minutes: number }>();
  for (const row of itemRows ?? []) {
    const current = practiceMap.get(row.skill_id) ?? { count: 0, minutes: 0 };
    current.count += 1;
    current.minutes += row.planned_minutes ?? 0;
    practiceMap.set(row.skill_id, current);
  }

  const practicedSkills = [...practiceMap.entries()]
    .map(([skillId, stats]) => ({ skillId, stats, skill: skillMap.get(skillId), progress: latestProgress.get(skillId) }))
    .sort((a, b) => b.stats.count - a.stats.count || b.stats.minutes - a.stats.minutes || (a.skill?.name ?? a.skillId).localeCompare(b.skill?.name ?? b.skillId, 'zh-Hant'));

  const totalSessions = sessions?.length ?? 0;
  const totalMinutes = (sessions ?? []).reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0);
  const meta = [student.grade ? `${student.grade} 年級` : '年級未設定', student.class_name || '班級未設定', student.gender || '性別未設定'].join(' · ');

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">STUDENT PROFILE</div>
        <h1>{student.display_name}</h1>
        <p>{meta} · {student.active ? '啟用中' : '已停用'}</p>
        <div className="topNav"><Link href="/students">學生管理</Link><Link href="/today">今日訓練</Link><Link href="/history">歷史訓練</Link></div>
      </section>

      <section className="studentStatsGrid">
        <div className="statCard"><span>訓練出席</span><strong>{totalSessions}</strong><small>次</small></div>
        <div className="statCard"><span>累積課程時間</span><strong>{totalMinutes}</strong><small>分鐘</small></div>
        <div className="statCard"><span>練過技能</span><strong>{practiceMap.size}</strong><small>項</small></div>
        <div className="statCard"><span>已有評量</span><strong>{latestProgress.size}</strong><small>項</small></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>技能訓練累積</h2></div><strong>{practicedSkills.length} 項</strong></div>
        {!practicedSkills.length ? <p className="muted">目前還沒有訓練紀錄。學生參加課程後，技能累積會自動出現在這裡。</p> : (
          <div className="skillProgressList">
            {practicedSkills.map(({ skillId, skill, stats, progress }) => (
              <div className="skillProgressRow" key={skillId}>
                <div className="skillProgressMain">
                  <b>{skill?.name ?? skillId}</b>
                  <small>{skill ? `${skill.domain}${skill.subcategory ? ` · ${skill.subcategory}` : ''}` : '技能資料未找到'}</small>
                </div>
                <div className="skillPracticeStats"><strong>{stats.count}</strong><span>次</span><small>{stats.minutes} 分</small></div>
                <div className={progress ? 'skillStatus assessed' : 'skillStatus'}>
                  <b>{progress?.status ? (STATUS_TEXT[progress.status] ?? progress.status) : '尚未評量'}</b>
                  {progress?.level_value != null ? <small>等級 {progress.level_value}</small> : <small>—</small>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>最近訓練</h2></div><strong>{totalSessions} 筆</strong></div>
        {!sessions?.length ? <p className="muted">目前尚無訓練紀錄。</p> : (
          <div className="historyList">
            {sessions.slice(0, 10).map((session) => {
              const attendance = (attendanceRows ?? []).find((row) => row.session_id === session.id);
              return <Link className="historyRow" href={`/history/${session.id}`} key={session.id}>
                <div><b>{session.session_date}</b><small>{session.focus_level} 級 · {attendance?.table_no ? `${attendance.table_no} 號桌` : '未分桌'}</small></div>
                <div className="historyRowRight"><strong>{session.duration_minutes} 分鐘</strong><span>查看 ›</span></div>
              </Link>;
            })}
          </div>
        )}
      </section>
    </main>
  );
}
