import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addAttendanceTemplate,addDailyAttendanceSegment,applyTemplateToDate,deleteAttendanceTemplate,deleteDailyAttendanceSegment } from './actions';

const WEEK=['一','二','三','四','五','六','日'];
const pad=(n:number)=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};

export default async function AttendanceSettingsPage({searchParams}:{searchParams:Promise<{date?:string;message?:string;error?:string}>}){
  const q=await searchParams;
  const selectedDate=q.date||today();
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)redirect('/more');
  const [{data:students},{data:templates},{data:segments}]=await Promise.all([
    supabase.from('students').select('id,display_name,grade,class_name,seat_number').eq('team_id',teamId).eq('active',true).order('grade').order('class_name').order('seat_number'),
    supabase.from('attendance_templates').select('id,weekday,mode,grade,student_id,start_time,end_time,default_count,note').eq('team_id',teamId).eq('active',true).order('weekday').order('start_time'),
    supabase.from('daily_attendance_segments').select('id,attendance_date,mode,grade,student_id,start_time,end_time,attendee_count,source,note').eq('team_id',teamId).eq('attendance_date',selectedDate).order('start_time'),
  ]);
  const studentMap=new Map((students??[]).map(s=>[s.id,s]));
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">ATTENDANCE ENGINE</div><h1>出勤／時段設定</h1><p>先設定一學期固定週模板，平常直接套用；只有請假、臨時改時間時才修改當天資料。冷氣費與教練薪酬都共用這份時段。</p><div className="topNav"><Link href="/today">今日訓練</Link><Link href="/aircon">冷氣費</Link><Link href="/payroll">教練薪酬</Link><Link href="/more">更多</Link></div></section>
    {q.message?<div className="notice successNotice">{q.message}</div>:null}{q.error?<div className="notice errorNotice">{q.error}</div>:null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>固定每週出席模板</h2></div><strong>一次設定，平常套用</strong></div>
      <div className="notice"><b>兩種模式可以混用：</b>低中高年級可用「依年級＋人數」，需要精準計費的學生可改用「依個人」。同一天也能有不同時段。</div>
      <form action={addAttendanceTemplate} className="gridForm">
        <label>星期<select name="weekday">{WEEK.map((w,i)=><option key={w} value={i+1}>星期{w}</option>)}</select></label>
        <label>登記方式<select name="mode"><option value="grade">依年級</option><option value="individual">依個人</option></select></label>
        <label>年級<select name="grade"><option value="">—</option>{[1,2,3,4,5,6].map(g=><option key={g} value={g}>{g}年級</option>)}</select></label>
        <label>學生<select name="student_id"><option value="">—</option>{(students??[]).map(s=><option key={s.id} value={s.id}>{s.display_name}｜{s.grade??'-'}年{s.class_name?` ${s.class_name}`:''}{s.seat_number?` ${s.seat_number}號`:''}</option>)}</select></label>
        <label>開始<input type="time" name="start_time" required/></label><label>結束<input type="time" name="end_time" required/></label>
        <label>年級預設人數<input type="number" name="default_count" min="0" placeholder="個人模式可空白"/></label><label>備註<input name="note" placeholder="例如：低年級全天班"/></label>
        <button className="primaryButton wide">＋ 新增固定模板</button>
      </form>
      <div className="templateList">{(templates??[]).map(t=>{const s=t.student_id?studentMap.get(t.student_id):null;return <article key={t.id}><div><b>星期{WEEK[Number(t.weekday)-1]}｜{String(t.start_time).slice(0,5)}–{String(t.end_time).slice(0,5)}</b><small>{t.mode==='grade'?`${t.grade}年級｜預設 ${t.default_count??0} 人`:`${s?.display_name??'學生'}｜個人模式`}</small>{t.note?<p>{t.note}</p>:null}</div><form action={deleteAttendanceTemplate}><input type="hidden" name="id" value={t.id}/><button className="dangerButton">刪除</button></form></article>})}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>某一天實際出勤</h2></div><strong>{selectedDate}</strong></div>
      <form method="get" className="dateBar"><input type="date" name="date" defaultValue={selectedDate}/><button className="secondaryButton">查看日期</button></form>
      <form action={applyTemplateToDate} className="dateBar"><input type="hidden" name="attendance_date" value={selectedDate}/><button className="primaryButton">⚡ 套用這天的固定模板</button><span className="muted">套用後只要刪掉請假的、補上臨時時段即可。</span></form>
      <form action={addDailyAttendanceSegment} className="gridForm"><input type="hidden" name="attendance_date" value={selectedDate}/>
        <label>登記方式<select name="mode"><option value="grade">依年級</option><option value="individual">依個人</option></select></label>
        <label>年級<select name="grade"><option value="">—</option>{[1,2,3,4,5,6].map(g=><option key={g} value={g}>{g}年級</option>)}</select></label>
        <label>學生<select name="student_id"><option value="">—</option>{(students??[]).map(s=><option key={s.id} value={s.id}>{s.display_name}｜{s.grade??'-'}年{s.seat_number?` ${s.seat_number}號`:''}</option>)}</select></label>
        <label>開始<input type="time" name="start_time" required/></label><label>結束<input type="time" name="end_time" required/></label>
        <label>實際人數<input type="number" name="attendee_count" min="0" placeholder="個人模式可空白"/></label><label>備註<input name="note"/></label>
        <button className="primaryButton wide">＋ 新增當日例外／實際時段</button>
      </form>
      <div className="templateList">{(segments??[]).length===0?<p className="muted">這天還沒有出勤時段。</p>:(segments??[]).map(s=>{const st=s.student_id?studentMap.get(s.student_id):null;return <article key={s.id}><div><b>{String(s.start_time).slice(0,5)}–{String(s.end_time).slice(0,5)}｜{s.mode==='grade'?`${s.grade}年級 ${s.attendee_count} 人`:st?.display_name??'學生'}</b><small>{s.source==='template'?'由固定模板帶入':'手動調整'}{s.note?`｜${s.note}`:''}</small></div><form action={deleteDailyAttendanceSegment}><input type="hidden" name="id" value={s.id}/><button className="dangerButton">刪除</button></form></article>})}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>使用方式</h2></div></div><div className="notice"><b>最省事流程：</b>學期初設定週模板 → 每天按「套用」→ 只改今天的請假／臨時時間。冷氣頁會用這些時段計算「人 × 冷氣分鐘」；薪酬頁也會用同一批出勤資料估算教練時段內學生數。</div></section>
    <style>{`.gridForm{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:12px}.gridForm label{font-size:12px;font-weight:800;color:#637083}.gridForm input,.gridForm select{display:block;width:100%;margin-top:6px;padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.gridForm .wide{grid-column:1/-1}.templateList{display:grid;gap:8px;margin-top:14px}.templateList article{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border:1px solid #e1e6eb;border-radius:14px;padding:12px;background:#fff}.templateList small{display:block;color:#748191;margin-top:3px}.templateList p{margin:4px 0 0;color:#687587}.dateBar{display:flex;gap:10px;align-items:center;margin:10px 0}.dateBar input{padding:10px;border:1px solid #dce2e8;border-radius:10px}@media(max-width:850px){.gridForm{grid-template-columns:1fr 1fr}}@media(max-width:560px){.gridForm{grid-template-columns:1fr}.gridForm .wide{grid-column:auto}.dateBar{align-items:stretch;flex-direction:column}.templateList article{grid-template-columns:1fr}.templateList button{width:100%}}`}</style>
  </main>
}
