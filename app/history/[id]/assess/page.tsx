import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuickAssessmentGrid from '@/components/QuickAssessmentGrid';

type ProgressRow = { student_id: string; skill_id: string; level_value: number | null; assessed_at: string };

export default async function QuickAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const { data: session } = await supabase
    .from('training_sessions')
    .select('id,session_date,focus_level,duration_minutes,participant_count,table_count')
    .eq('id', id)
    .single();
  if (!session) notFound();

  const [{ data: attendanceRows }, { data: itemRows }] = await Promise.all([
    supabase.from('session_students').select('student_id,table_no').eq('session_id', id).order('table_no'),
    supabase.from('training_session_items').select('skill_id,sort_order').eq('session_id', id).order('sort_order'),
  ]);

  const studentIds = (attendanceRows ?? []).map((row) => row.student_id);
  const skillIds = (itemRows ?? []).map((row) => row.skill_id);

  const [{ data: students }, { data: skills }, { data: progressRows }] = await Promise.all([
    studentIds.length
      ? supabase.from('students').select('id,display_name,grade,class_name').in('id', studentIds)
      : Promise.resolve({ data: [] }),
    skillIds.length
      ? supabase.from('skills').select('id,name,domain,subcategory').in('id', skillIds)
      : Promise.resolve({ data: [] }),
    studentIds.length && skillIds.length
      ? supabase.from('student_skill_progress').select('student_id,skill_id,level_value,assessed_at').in('student_id', studentIds).in('skill_id', skillIds).order('assessed_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const studentMap = new Map((students ?? []).map((student) => [student.id, student]));
  const skillMap = new Map((skills ?? []).map((skill) => [skill.id, skill]));
  const orderedStudents = (attendanceRows ?? []).map((row) => studentMap.get(row.student_id)).filter(Boolean) as Array<{ id: string; display_name: string; grade: number | null; class_name: string | null }>;
  const orderedSkills = (itemRows ?? []).map((row) => skillMap.get(row.skill_id)).filter(Boolean) as Array<{ id: string; name: string; domain: string; subcategory: string | null }>;

  const latest: Record<string, Record<string, number | null>> = {};
  for (const row of (progressRows ?? []) as ProgressRow[]) {
    latest[row.student_id] ??= {};
    if (!(row.skill_id in latest[row.student_id])) latest[row.student_id][row.skill_id] = row.level_value;
  }

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">POST TRAINING REVIEW</div>
        <h1>課後快速評量</h1>
        <p>{session.session_date} · {session.focus_level} 級 · {session.participant_count} 人 · {session.duration_minutes} 分鐘</p>
        <div className="topNav"><Link href={`/history/${id}`}>本次課表</Link><Link href="/today">今日訓練</Link><Link href="/history">歷史訓練</Link></div>
      </section>

      {query.saved ? <div className="notice successNotice"><b>已儲存：</b>本次快速評量已更新到學生能力紀錄。</div> : null}
      {query.error ? <div className="notice errorNotice"><b>儲存失敗：</b>{query.error}</div> : null}

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>本次訓練技能</h2></div><strong>{orderedSkills.length} 項</strong></div>
        <div className="selectedChips">{orderedSkills.map((skill) => <span key={skill.id} className="staticChip">{skill.name}</span>)}</div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>到課學生快速評量</h2></div><strong>{orderedStudents.length} 人</strong></div>
        <QuickAssessmentGrid sessionId={id} students={orderedStudents} skills={orderedSkills} latest={latest} />
      </section>
    </main>
  );
}
