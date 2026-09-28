import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuickSessionAssessment from '@/components/QuickSessionAssessment';

export default async function SessionReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id:string }>;
  searchParams: Promise<{ saved?:string; error?:string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin','coach'].includes(profile.role)) redirect('/today');

  const { data: session } = await supabase.from('training_sessions').select('id,session_date,focus_level,duration_minutes').eq('id', id).single();
  if (!session) notFound();

  const [{ data: studentRows }, { data: itemRows }] = await Promise.all([
    supabase.from('session_students').select('student_id,table_no,students(id,display_name,grade,class_name,gender)').eq('session_id', id).order('table_no'),
    supabase.from('training_session_items').select('skill_id,sort_order,skills(id,name,domain,subcategory)').eq('session_id', id).order('sort_order'),
  ]);

  const students = (studentRows ?? []).map((row:any) => row.students).filter(Boolean);
  const skills = (itemRows ?? []).map((row:any) => row.skills).filter(Boolean);
  const studentIds = students.map((student:any) => student.id);
  const skillIds = skills.map((skill:any) => skill.id);

  let existing:any[] = [];
  if (studentIds.length && skillIds.length) {
    const { data } = await supabase
      .from('student_skill_progress')
      .select('student_id,skill_id,status,level_value,observation,assessed_at')
      .in('student_id', studentIds)
      .in('skill_id', skillIds)
      .order('assessed_at', { ascending:false });
    const seen = new Set<string>();
    existing = (data ?? []).filter((row:any) => {
      const key = `${row.student_id}:${row.skill_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">POST TRAINING REVIEW</div>
        <h1>課後快速評量</h1>
        <p>{session.session_date} · {session.focus_level} 級 · {session.duration_minutes} 分鐘。只評今天到課學生與今天練過的技能。</p>
        <div className="topNav"><Link href={`/history/${id}`}>返回課表</Link><Link href="/today">今日訓練</Link></div>
      </section>
      {query.saved ? <div className="notice successNotice"><b>已儲存：</b>本次新增 {query.saved} 筆技能評量。</div> : null}
      {query.error ? <div className="notice errorNotice"><b>儲存失敗：</b>{query.error}</div> : null}
      {!students.length || !skills.length ? <section className="card"><p className="muted">這堂課缺少學生或訓練項目，無法進行快速評量。</p></section> : <QuickSessionAssessment sessionId={id} students={students} skills={skills} existing={existing} />}
    </main>
  );
}
