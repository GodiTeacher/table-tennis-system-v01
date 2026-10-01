import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addAttendanceTemplate,addDailyAttendanceSegment,applyTemplateToDate,applyTemplatesToMonth,deleteAttendanceTemplate,deleteDailyAttendanceSegment,duplicateAttendanceTemplate,updateAttendanceTemplate } from './actions';

const WEEK=['一','二','三','四','五','六','日'];
const pad=(n:number)=>String(n).padStart(2,'0');
const nowParts=()=>{const d=new Date();return {date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,month:`${d.getFullYear()}-${pad(d.getMonth()+1)}`}};

export default async function AttendanceSettingsPage({searchParams}:{searchParams:Promise<{date?:string;month?:string;message?:string;error?:string}>}){
  const q=await searchParams; const n=nowParts(); const selectedDate=q.date||n.date; const selectedMonth=q.month||selectedDate.slice(0,7)||n.month;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims(); if(!claims?.claims?.sub)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id'); if(!teamId)redirect('/more');
  const [{data:students},{data:templates},{data:segments}]=await Promise.all([
    supabase.from('students').select('id,display_name,grade,class_name,seat_number').eq('team_id',teamId).eq('active',true).order('grade').order('class_name').order('seat_number'),
    supabase.from('attendance_templates').select('id,weekday,mode,grade,student_id,start_time,end_time,default_count,note').eq('team_id',teamId).eq('active',true).order('weekday').order('start_time'),
    supabase.from('daily_attendance_segments').select('id,attendance_date,mode,grade,student_id,start_time,end_time,attendee_count,source,note').eq('team_id',teamId).eq('attendance_date',selectedDate).order('start_time'),
  ]);
  const studentMap=new Map((students??[]).map(s=>[s.id,s]));
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">ATTENDANCE ENGINE V2</div><h1>出勤／時段設定</h1><p>固定模板用表格式快速維護；可複製後再修改，也可以整月一次套用，不需要每天重複按。</p><div className="topNav"><Link href="/today">今日訓練</Link><Link href="/aircon">冷氣費</Link><Link href="/payroll">教練薪酬</Link><Link href="/more">更多</Link></div></section>
    {q.message?<div className="notice successNotice">{q.message}</div>:null}{q.error?<div className="notice errorNotice">{q.error}</div>:null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>固定每週出席模板</h2></div><strong>表格式快速編輯</strong></div>
      <div className="notice"><b>建議：</b>先建一筆最常用時段，再按「複製」改星期、年級、人數或時間，比重新輸入快很多。</div>
      <form action={addAttendanceTemplate} className="gridForm">
        <label>星期<select name="weekday">{WEEK.map((w,i)=><option key={w} value={i+1}>星期{w}</option>)}</select></label>
        <label>方式<select name="mode"><option value="grade">依年級</option><option value="individual">依個人</option></select></label>
        <label>年級<select name="grade"><option value="">—</option>{[1,2,3,4,5,6].map(g=><option key={g} value={g}>{g}年級</option>)}</select></label>
        <label>學生<select name="student_id"><option value="">—</option>{(students??[]).map(s=><option key={s.id} value={s.id}>{s.display_name}｜{s.grade??'-'}年{s.class_name?` ${s.class_name}`:''}{s.seat_number?` ${s.seat_number}號`:''}</option>)}</select></label>
        <label>開始<input type="time" name="start_time" required/></label><label>結束<input type="time" name="end_time" required/></label>
        <label>預設人數<input type="number" name="default_count" min="0" placeholder="個人模式可空白"/></label><label>備註<input name="note"/></label>
        <button className="primaryButton wide">＋ 新增一列</button>
      </form>
      <div className="editableTableWrap"><table className="editableTable"><thead><tr><th>星期</th><th>方式</th><th>年級</th><th>學生</th><th>開始</th><th>結束</th><th>人數</th><th>備註</th><th>操作</th></tr></thead><tbody>{(templates??[]).map(t=><tr key={t.id}><td colSpan={9}><form action={updateAttendanceTemplate} className="rowForm"><input type="hidden" name="id" value={t.id}/><select name="weekday" defaultValue={t.weekday}>{WEEK.map((w,i)=><option key={w} value={i+1}>週{w}</option>)}</select><select name="mode" defaultValue={t.mode}><option value="grade">年級</option><option value="individual">個人</option></select><select name="grade" defaultValue={t.grade??''}><option value="">—</option>{[1,2,3,4,5,6].map(g=><option key={g} value={g}>{g}</option>)}</select><select name="student_id" defaultValue={t.student_id??''}><option value="">—</option>{(students??[]).map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select><input type="time" name="start_time" defaultValue={String(t.start_time).slice(0,5)} required/><input type="time" name="end_time" defaultValue={String(t.end_time).slice(0,5)} required/><input type="number" name="default_count" min="0" defaultValue={t.default_count??''}/><input name="note" defaultValue={t.note??''}/><div className="rowActions"><button className="secondaryButton">儲存</button></div></form><div className="subActions"><form action={duplicateAttendanceTemplate}><input type="hidden" name="id" value={t.id}/><button className="secondaryButton">複製</button></form><form action={deleteAttendanceTemplate}><input type="hidden" name="id" value={t.id}/><button className="dangerButton">刪除</button></form></div></td></tr>)}</tbody></table></div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>整月一鍵帶入</h2></div><strong>{selectedMonth}</strong></div>
      <form action={applyTemplatesToMonth} className="monthApply"><label>月份<input type="month" name="month" defaultValue={selectedMonth} required/></label><button className="primaryButton">⚡ 套用整個月份</button><span className="muted">會重建該月「模板來源」資料；你手動修改或新增的例外不會被刪除。</span></form>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>某一天實際出勤</h2></div><strong>{selectedDate}</strong></div>
      <form method="get" className="dateBar"><input type="date" name="date" defaultValue={selectedDate}/><input type="hidden" name="month" value={selectedMonth}/><button className="secondaryButton">查看日期</button></form>
      <form action={applyTemplateToDate} className="dateBar"><input type="hidden" name="attendance_date" value={selectedDate}/><button className="primaryButton">⚡ 只重套這一天</button><span className="muted">平常建議用上面的「整月一鍵帶入」，這裡只處理單日重建。</span></form>
      <form action={addDailyAttendanceSegment} className="gridForm"><input type="hidden" name="attendance_date" value={selectedDate}/>
        <label>方式<select name="mode"><option value="grade">依年級</option><option value="individual">依個人</option></select></label>
        <label>年級<select name="grade"><option value="">—</option>{[1,2,3,4,5,6].map(g=><option key={g} value={g}>{g}年級</option>)}</select></label>
        <label>學生<select name="student_id"><option value="">—</option>{(students??[]).map(s=><option key={s.id} value={s.id}>{s.display_name}｜{s.grade??'-'}年{s.seat_number?` ${s.seat_number}號`:''}</option>)}</select></label>
        <label>開始<input type="time" name="start_time" required/></label><label>結束<input type="time" name="end_time" required/></label>
        <label>實際人數<input type="number" name="attendee_count" min="0" placeholder="個人模式可空白"/></label><label>備註<input name="note"/></label>
        <button className="primaryButton wide">＋ 新增當日例外／實際時段</button>
      </form>
      <div className="templateList">{(segments??[]).length===0?<p className="muted">{selectedDate} 尚無出勤時段。</p>:(segments??[]).map(s=>{const st=s.student_id?studentMap.get(s.student_id):null;return <article key={s.id}><div><b>{selectedDate}｜{String(s.start_time).slice(0,5)}–{String(s.end_time).slice(0,5)}｜{s.mode==='grade'?`${s.grade}年級 ${s.attendee_count} 人`:st?.display_name??'學生'}</b><small>{s.source==='template'?'由固定模板帶入':'手動調整'}{s.note?`｜${s.note}`:''}</small></div><form action={deleteDailyAttendanceSegment}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="attendance_date" value={selectedDate}/><button className="dangerButton">刪除</button></form></article>})}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>04</span><h2>建議使用方式</h2></div></div><div className="notice"><b>學期初：</b>把週模板整理好。<br/><b>每月初：</b>按一次「套用整個月份」。<br/><b>每天：</b>只有請假、臨時加課、提早離開才改當天資料。冷氣費與教練薪酬都直接共用。</div></section>
    <style>{`.gridForm{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:12px}.gridForm label,.monthApply label{font-size:12px;font-weight:800;color:#637083}.gridForm input,.gridForm select,.monthApply input{display:block;width:100%;margin-top:6px;padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.gridForm .wide{grid-column:1/-1}.editableTableWrap{overflow-x:auto;margin-top:14px}.editableTable{width:100%;min-width:1100px;border-collapse:separate;border-spacing:0 7px}.editableTable th{text-align:left;font-size:12px;color:#6b7788;padding:0 6px}.editableTable td{padding:0}.rowForm{display:grid;grid-template-columns:90px 90px 80px 150px 105px 105px 90px minmax(160px,1fr) 90px;gap:6px;padding:8px;background:#fff;border:1px solid #e1e6eb;border-radius:13px}.rowForm input,.rowForm select{width:100%;padding:8px;border:1px solid #dce2e8;border-radius:9px;background:#fff}.subActions{display:flex;gap:6px;margin:4px 8px 0}.subActions form{margin:0}.rowActions button,.subActions button{white-space:nowrap}.templateList{display:grid;gap:8px;margin-top:14px}.templateList article{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border:1px solid #e1e6eb;border-radius:14px;padding:12px;background:#fff}.templateList small{display:block;color:#748191;margin-top:3px}.dateBar,.monthApply{display:flex;gap:10px;align-items:end;margin:10px 0}.dateBar input{padding:10px;border:1px solid #dce2e8;border-radius:10px}.monthApply label{min-width:180px}@media(max-width:850px){.gridForm{grid-template-columns:1fr 1fr}}@media(max-width:560px){.gridForm{grid-template-columns:1fr}.gridForm .wide{grid-column:auto}.dateBar,.monthApply{align-items:stretch;flex-direction:column}.templateList article{grid-template-columns:1fr}.templateList button{width:100%}}`}</style>
  </main>;
}
