import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addPointRecord, deletePointRecord } from './actions';

type Student={id:string;display_name:string;grade:number|null;class_name:string|null;seat_number:number|null};
type RecordRow={id:string;student_id:string;points:number;reason:string;note:string|null;occurred_on:string;created_at:string};

export default async function PointsPage({searchParams}:{searchParams:Promise<{message?:string;error?:string}>}){
  const params=await searchParams;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub) redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId) redirect('/more');
  const [{data:studentRows},{data:recordRows}]=await Promise.all([
    supabase.from('students').select('id,display_name,grade,class_name,seat_number').eq('active',true),
    supabase.from('student_point_records').select('id,student_id,points,reason,note,occurred_on,created_at').eq('team_id',teamId).order('occurred_on',{ascending:false}).order('created_at',{ascending:false}),
  ]);
  const students=(studentRows??[]) as Student[];
  const records=(recordRows??[]) as RecordRow[];
  const studentMap=new Map(students.map(s=>[s.id,s]));
  const totals=new Map<string,number>();
  for(const row of records) totals.set(row.student_id,(totals.get(row.student_id)??0)+Number(row.points));
  const ranking=[...students].map(s=>({student:s,total:totals.get(s.id)??0})).sort((a,b)=>b.total-a.total||a.student.display_name.localeCompare(b.student.display_name,'zh-Hant'));

  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">POINTS</div><h1>點數紀錄</h1><p>以每一筆加點／扣點紀錄累計學生點數；誤登資料可直接刪除，總分會自動重算。</p><div className="topNav"><Link href="/more">返回更多</Link><Link href="/team-standards#reward">球隊規範</Link></div></section>
    {params.message?<div className="notice successNotice">{params.message}</div>:null}{params.error?<div className="notice errorNotice">{params.error}</div>:null}
    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>新增點數異動</h2></div></div>
      <form action={addPointRecord} className="pointForm">
        <label>學生<select name="student_id" required defaultValue=""><option value="" disabled>選擇學生</option>{students.sort((a,b)=>(a.grade??99)-(b.grade??99)||(a.class_name??'').localeCompare(b.class_name??'','zh-Hant')||(a.seat_number??999)-(b.seat_number??999)).map(s=><option value={s.id} key={s.id}>{s.display_name}｜{s.grade??'-'}年級 {s.class_name??''} {s.seat_number?`${s.seat_number}號`:''}</option>)}</select></label>
        <label>點數<input name="points" type="number" step="1" placeholder="例如 5 或 -2" required/></label>
        <label>日期<input name="occurred_on" type="date" defaultValue={new Date().toISOString().slice(0,10)} required/></label>
        <label className="wide">原因<input name="reason" placeholder="例如：訓練認真、協助隊友、未依規定整理器材" required maxLength={80}/></label>
        <label className="wide">備註<input name="note" placeholder="可留空" maxLength={160}/></label>
        <button className="primaryButton wide">＋ 新增紀錄</button>
      </form>
      <div className="notice" style={{marginTop:12}}><b>使用方式：</b>正數是加點，例如 +5；負數是扣點，例如 -2。若整筆登錯，直接刪除該筆即可。</div>
    </section>
    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>學生累積點數</h2></div><strong>{students.length} 人</strong></div><div className="pointRanking">{ranking.map(({student,total},i)=><div className="pointRankCard" key={student.id}><span>#{i+1}</span><div><b>{student.display_name}</b><small>{student.grade??'-'}年級 · {student.class_name??'未分班'}{student.seat_number?` · ${student.seat_number}號`:''}</small></div><strong className={total<0?'negative':''}>{total>0?'+':''}{total}</strong></div>)}</div></section>
    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>異動紀錄</h2></div><strong>{records.length} 筆</strong></div>{records.length===0?<p className="muted">目前尚無點數紀錄。</p>:<div className="pointRecords">{records.map(row=>{const s=studentMap.get(row.student_id);return <article key={row.id} className="pointRecord"><div><b>{s?.display_name??'已刪除學生'}</b><small>{row.occurred_on} · {row.reason}</small>{row.note?<p>{row.note}</p>:null}</div><strong className={row.points<0?'negative':''}>{row.points>0?'+':''}{row.points}</strong><form action={deletePointRecord}><input type="hidden" name="id" value={row.id}/><button className="dangerButton">刪除</button></form></article>})}</div>}</section>
    <style>{`.pointForm{display:grid;grid-template-columns:1.4fr .6fr .8fr;gap:10px}.pointForm label{font-size:12px;font-weight:800;color:#637083}.pointForm input,.pointForm select{display:block;width:100%;margin-top:6px;padding:11px 12px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.pointForm .wide{grid-column:1/-1}.pointRanking{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.pointRankCard{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid #e1e6eb;border-radius:14px;padding:12px;background:#fff}.pointRankCard>span{font-size:11px;font-weight:900;color:#8090a0}.pointRankCard small,.pointRecord small{display:block;color:#7a8795;margin-top:3px}.pointRankCard>strong,.pointRecord>strong{font-size:20px;color:#248257}.negative{color:#c84f4f!important}.pointRecords{display:grid;gap:8px}.pointRecord{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;border:1px solid #e1e6eb;border-radius:14px;padding:12px;background:#fff}.pointRecord p{margin:5px 0 0;color:#657284;font-size:13px}@media(max-width:760px){.pointForm{grid-template-columns:1fr}.pointForm .wide{grid-column:auto}.pointRanking{grid-template-columns:1fr}.pointRecord{grid-template-columns:1fr auto}.pointRecord form{grid-column:1/-1}.pointRecord form button{width:100%}}`}</style>
  </main>;
}
