import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const { data: session } = await supabase
    .from('training_sessions')
    .select('id,session_date,focus_level,duration_minutes,participant_count,table_count,notes,created_at')
    .eq('id', id)
    .single();
  if (!session) notFound();

  const [{ data: itemRows }, { data: studentRows }] = await Promise.all([
    supabase.from('training_session_items').select('skill_id,sort_order,planned_minutes').eq('session_id', id).order('sort_order'),
    supabase.from('session_students').select('student_id,table_no,group_no').eq('session_id', id).order('table_no').order('group_no'),
  ]);

  const skillIds = itemRows?.map((row) => row.skill_id) ?? [];
  const studentIds = studentRows?.map((row) => row.student_id) ?? [];

  const [{ data: skills }, { data: students }] = await Promise.all([
    skillIds.length ? supabase.from('skills').select('id,name,domain,subcategory').in('id', skillIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string; domain: string; subcategory: string | null }> }),
    studentIds.length ? supabase.from('students').select('id,display_name,grade,class_name,gender').in('id', studentIds) : Promise.resolve({ data: [] as Array<{ id: string; display_name: string; grade: number | null; class_name: string | null; gender: string | null }> }),
  ]);

  const skillMap = new Map((skills ?? []).map((skill) => [skill.id, skill]));
  const studentMap = new Map((students ?? []).map((student) => [student.id, student]));
  const tables = new Map<number, typeof studentRows>();
  for (const row of studentRows ?? []) {
    const tableNo = row.table_no ?? 0;
    const current = tables.get(tableNo) ?? [];
    current.push(row);
    tables.set(tableNo, current);
  }

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TRAINING RECORD</div>
        <h1>{session.session_date}</h1>
        <p>{session.focus_level} 級 · {session.participant_count} 人 · {session.table_count} 桌 · {session.duration_minutes} 分鐘</p>
        <div className="topNav"><Link href="/history">返回歷史訓練</Link><Link href="/today">今日訓練</Link></div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>訓練項目</h2></div><strong>{itemRows?.length ?? 0} 項</strong></div>
        {!itemRows?.length ? <p className="muted">此課程沒有訓練項目。</p> : (
          <div className="scheduleList">
            {itemRows.map((row, index) => {
              const skill = skillMap.get(row.skill_id);
              return <div className="scheduleRow" key={row.skill_id}>
                <span className="orderBadge">{index + 1}</span>
                <div><b>{skill?.name ?? row.skill_id}</b><small>{skill ? `${skill.domain}${skill.subcategory ? ` · ${skill.subcategory}` : ''}` : '技能資料未找到'}</small></div>
                <strong>{row.planned_minutes ?? 0} 分</strong>
              </div>;
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>分桌與到課學生</h2></div><strong>{studentRows?.length ?? 0} 人</strong></div>
        {!studentRows?.length ? <p className="muted">此課程沒有學生紀錄。</p> : (
          <div className="historyTables">
            {[...tables.entries()].sort(([a], [b]) => a - b).map(([tableNo, rows]) => (
              <div className="historyTable" key={tableNo}>
                <div className="historyTableTitle"><b>{tableNo > 0 ? `${tableNo} 號桌` : '未分桌'}</b><span>{rows?.length ?? 0} 人</span></div>
                <div className="historyStudentList">
                  {(rows ?? []).map((row) => {
                    const student = studentMap.get(row.student_id);
                    const meta = student ? [student.grade ? `${student.grade}年級` : null, student.class_name, student.gender].filter(Boolean).join(' · ') : '';
                    return student ? (
                      <Link href={`/students/${student.id}`} key={row.student_id} className="historyStudentLink">
                        <b>{student.display_name}</b>{meta ? <small>{meta}</small> : null}<span>個人頁 ›</span>
                      </Link>
                    ) : <div key={row.student_id}><b>未知學生</b></div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
