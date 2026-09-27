import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addStudent, batchAddStudents, deleteStudent, setStudentActive, signOut, updateStudent } from './actions';

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/login');

  const { data: students, error } = await supabase
    .from('students')
    .select('id,display_name,grade,class_name,gender,active,created_at')
    .order('active', { ascending: false })
    .order('grade', { ascending: true, nullsFirst: false })
    .order('class_name', { ascending: true, nullsFirst: false })
    .order('display_name', { ascending: true });

  const activeCount = students?.filter((s) => s.active).length ?? 0;

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>學生管理</h1>
        <p>管理姓名、年級、班級、性別與啟用狀態，也可以直接從 Excel 批次貼上整隊名單。</p>
        <div className="topNav">
          <Link href="/today">今日訓練</Link>
          <Link href="/history">歷史訓練</Link>
          <Link href="/">訓練規劃</Link>
          <form action={signOut}><button className="linkButton">登出</button></form>
        </div>
      </section>

      {(params.error || error) ? <div className="notice errorNotice">{params.error ?? error?.message}</div> : null}

      <section className="card">
        <div className="sectionTitle"><div><span>ROSTER</span><h2>單筆新增</h2></div><strong>{activeCount} 位啟用中</strong></div>
        <form action={addStudent} className="studentCreateGrid">
          <input name="display_name" placeholder="學生姓名" required maxLength={30} />
          <select name="grade" defaultValue=""><option value="">年級</option>{[1,2,3,4,5,6].map((grade) => <option key={grade} value={grade}>{grade} 年級</option>)}</select>
          <input name="class_name" placeholder="班級，例如 甲／3班" maxLength={20} />
          <select name="gender" defaultValue=""><option value="">性別</option><option value="男">男</option><option value="女">女</option><option value="其他">其他</option></select>
          <button className="primaryButton">＋ 新增學生</button>
        </form>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>BATCH</span><h2>批次加入</h2></div></div>
        <p className="muted">可直接從 Excel 複製四欄貼上：姓名、年級、班級、性別。也可以只貼姓名，一行一位。</p>
        <form action={batchAddStudents} className="batchForm">
          <textarea name="batch_text" rows={8} placeholder={'範例：\n王小明\t3\t甲\t男\n陳小美\t4\t2班\t女\n李小華'} required />
          <button className="primaryButton">一次加入全部學生</button>
        </form>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>STUDENTS</span><h2>目前名單</h2></div><strong>{students?.length ?? 0} 人</strong></div>
        {!students?.length ? <p className="muted">目前還沒有學生，先從上方新增第一位。</p> : (
          <div className="studentList">
            {students.map((student) => (
              <div className={`studentManageCard ${student.active ? '' : 'inactive'}`} key={student.id}>
                <form action={updateStudent} className="studentEditGrid">
                  <input type="hidden" name="id" value={student.id} />
                  <label>姓名<input name="display_name" defaultValue={student.display_name} required maxLength={30} /></label>
                  <label>年級<select name="grade" defaultValue={student.grade ?? ''}><option value="">未設定</option>{[1,2,3,4,5,6].map((grade) => <option key={grade} value={grade}>{grade} 年級</option>)}</select></label>
                  <label>班級<input name="class_name" defaultValue={student.class_name ?? ''} placeholder="未設定" maxLength={20} /></label>
                  <label>性別<select name="gender" defaultValue={student.gender ?? ''}><option value="">未設定</option><option value="男">男</option><option value="女">女</option><option value="其他">其他</option></select></label>
                  <button className="secondaryButton">儲存修改</button>
                </form>
                <div className="studentManageActions">
                  <span className={student.active ? 'statusPill active' : 'statusPill'}>{student.active ? '啟用中' : '已停用'}</span>
                  <form action={setStudentActive}>
                    <input type="hidden" name="id" value={student.id} />
                    <input type="hidden" name="active" value={student.active ? 'false' : 'true'} />
                    <button className="secondaryButton">{student.active ? '停用' : '重新啟用'}</button>
                  </form>
                  <form action={deleteStudent}>
                    <input type="hidden" name="id" value={student.id} />
                    <button className="dangerButton">永久刪除</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
