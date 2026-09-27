import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addStudent, setStudentActive, signOut } from './actions';

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/login');

  const { data: students, error } = await supabase
    .from('students')
    .select('id,display_name,active,created_at')
    .order('active', { ascending: false })
    .order('display_name', { ascending: true });

  const activeCount = students?.filter((s) => s.active).length ?? 0;

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>學生名單</h1>
        <p>先建立球隊學生資料。下一步會直接從這份名單勾選「今日到課」，再自動帶入訓練課表與分桌。</p>
        <div className="topNav">
          <Link href="/">訓練規劃</Link>
          <form action={signOut}><button className="linkButton">登出</button></form>
        </div>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>ROSTER</span><h2>新增學生</h2></div><strong>{activeCount} 位啟用中</strong></div>
        {(params.error || error) ? <div className="notice errorNotice">{params.error ?? error?.message}</div> : null}
        <form action={addStudent} className="inlineForm">
          <input name="display_name" placeholder="輸入學生姓名" required maxLength={30} />
          <button className="primaryButton">＋ 新增學生</button>
        </form>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>STUDENTS</span><h2>目前名單</h2></div></div>
        {!students?.length ? <p className="muted">目前還沒有學生，先從上方新增第一位。</p> : (
          <div className="studentList">
            {students.map((student) => (
              <div className={`studentRow ${student.active ? '' : 'inactive'}`} key={student.id}>
                <div>
                  <b>{student.display_name}</b>
                  <small>{student.active ? '啟用中' : '已停用'}</small>
                </div>
                <form action={setStudentActive}>
                  <input type="hidden" name="id" value={student.id} />
                  <input type="hidden" name="active" value={student.active ? 'false' : 'true'} />
                  <button className="secondaryButton">{student.active ? '停用' : '重新啟用'}</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
