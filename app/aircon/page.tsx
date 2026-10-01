import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addAirconRun,deleteAirconRun,deleteMeterRecord,saveMeterRecord,saveMonthAllocation } from './actions';

type Meter={id:string;record_month:string;opening_reading:number;closing_reading:number;rate_per_unit:number;fixed_fee:number;note:string|null};
type Run={id:string;meter_record_id:string|null;usage_date:string;start_time:string;end_time:string;note:string|null};
type Attendance={attendance_date:string;mode:'grade'|'individual';grade:number|null;student_id:string|null;start_time:string;end_time:string;attendee_count:number|null};
const pad=(n:number)=>String(n).padStart(2,'0');
const currentMonth=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};
const mins=(t:string)=>{const [h,m]=t.slice(0,5).split(':').map(Number);return h*60+m};
const overlap=(a1:string,a2:string,b1:string,b2:string)=>Math.max(0,Math.min(mins(a2),mins(b2))-Math.max(mins(a1),mins(b1)));

export default async function AirconPage({searchParams}:{searchParams:Promise<{month?:string;message?:string;error?:string}>}){
  const q=await searchParams;
  const month=q.month||currentMonth();
  const monthStart=`${month}-01`;
  const endDate=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),1); const nextMonth=`${endDate.getFullYear()}-${pad(endDate.getMonth()+1)}-01`;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims(); if(!claims?.claims?.sub)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id'); if(!teamId)redirect('/more');
  const [{data:meters},{data:runs},{data:attendance},{data:setting},{data:students}]=await Promise.all([
    supabase.from('aircon_meter_records').select('id,record_month,opening_reading,closing_reading,rate_per_unit,fixed_fee,note').eq('team_id',teamId).order('record_month',{ascending:false}),
    supabase.from('aircon_runs').select('id,meter_record_id,usage_date,start_time,end_time,note').eq('team_id',teamId).gte('usage_date',monthStart).lt('usage_date',nextMonth).order('usage_date').order('start_time'),
    supabase.from('daily_attendance_segments').select('attendance_date,mode,grade,student_id,start_time,end_time,attendee_count').eq('team_id',teamId).gte('attendance_date',monthStart).lt('attendance_date',nextMonth),
    supabase.from('aircon_month_settings').select('allocation_mode').eq('team_id',teamId).eq('record_month',monthStart).maybeSingle(),
    supabase.from('students').select('id,display_name,grade').eq('team_id',teamId),
  ]);
  const meterList=(meters??[]) as Meter[]; const runList=(runs??[]) as Run[]; const att=(attendance??[]) as Attendance[];
  const meter=meterList.find(m=>String(m.record_month).slice(0,7)===month);
  const allocationMode=(setting?.allocation_mode??'grade') as 'grade'|'individual';
  const studentMap=new Map((students??[]).map(s=>[s.id,s]));
  const weights=new Map<string,number>();
  for(const r of runList){
    for(const a of att){
      if(a.attendance_date!==r.usage_date||a.mode!==allocationMode)continue;
      const ov=overlap(r.start_time,r.end_time,a.start_time,a.end_time); if(ov<=0)continue;
      if(allocationMode==='grade'&&a.grade){const key=`${a.grade}年級`;weights.set(key,(weights.get(key)??0)+ov*Number(a.attendee_count??0));}
      if(allocationMode==='individual'&&a.student_id){weights.set(a.student_id,(weights.get(a.student_id)??0)+ov);}
    }
  }
  const totalWeight=[...weights.values()].reduce((a,b)=>a+b,0);
  const units=meter?Number(meter.closing_reading)-Number(meter.opening_reading):0;
  const totalCost=meter?units*Number(meter.rate_per_unit)+Number(meter.fixed_fee):0;
  const allocations=[...weights.entries()].map(([key,weight])=>({key,label:allocationMode==='individual'?(studentMap.get(key)?.display_name??'未知學生'):key,weight,amount:totalWeight>0?totalCost*weight/totalWeight:0})).sort((a,b)=>b.amount-a.amount);
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">AIRCON V2</div><h1>冷氣登記與費用分攤</h1><p>只登記「冷氣實際開幾點到幾點」，系統再和出勤時段交叉，依人數 × 實際吹冷氣分鐘自動分攤。</p><div className="topNav"><Link href="/attendance-settings">出勤／時段設定</Link><Link href="/payroll">教練薪酬</Link><Link href="/more">更多</Link></div></section>
    {q.message?<div className="notice successNotice">{q.message}</div>:null}{q.error?<div className="notice errorNotice">{q.error}</div>:null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>選擇月份與分攤方式</h2></div></div>
      <form method="get" className="inline"><input type="month" name="month" defaultValue={month}/><button className="secondaryButton">切換月份</button></form>
      <form action={saveMonthAllocation} className="inline"><input type="hidden" name="record_month" value={month}/><select name="allocation_mode" defaultValue={allocationMode}><option value="grade">依年級分攤</option><option value="individual">依個人分攤</option></select><button className="primaryButton">儲存分攤方式</button></form>
      <div className="notice"><b>算法：</b>每一段出席時間只計算與冷氣實際開啟時間重疊的分鐘。依年級＝人數 × 重疊分鐘；依個人＝每位學生自己的重疊分鐘。</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>本月電表結算</h2></div><strong>{meter?`${units.toFixed(2)} 度`:'尚未登記'}</strong></div>
      <form action={saveMeterRecord} className="grid"><label>月份<input type="month" name="record_month" defaultValue={month} required/></label><label>月初電表<input type="number" step="0.01" name="opening_reading" defaultValue={meter?.opening_reading??''} required/></label><label>月底電表<input type="number" step="0.01" name="closing_reading" defaultValue={meter?.closing_reading??''} required/></label><label>每度單價<input type="number" step="0.0001" name="rate_per_unit" defaultValue={meter?.rate_per_unit??''} required/></label><label>固定費<input type="number" name="fixed_fee" defaultValue={meter?.fixed_fee??0}/></label><label className="wide">備註<input name="note" defaultValue={meter?.note??''}/></label><button className="primaryButton wide">儲存／更新本月電表</button></form>
      {meter?<div className="summary"><span>本月用電 <b>{units.toFixed(2)} 度</b></span><span>應繳學校 <b>${Math.round(totalCost).toLocaleString()}</b></span></div>:null}
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>每天實際吹冷氣時間</h2></div><strong>{runList.length} 段</strong></div>
      <form action={addAirconRun} className="grid"><input type="hidden" name="meter_record_id" value={meter?.id??''}/><label>日期<input type="date" name="usage_date" required/></label><label>開啟時間<input type="time" name="start_time" required/></label><label>關閉時間<input type="time" name="end_time" required/></label><label>備註<input name="note" placeholder="例如：下午訓練"/></label><button className="primaryButton wide">＋ 新增冷氣時段</button></form>
      <div className="runList">{runList.length===0?<p className="muted">本月還沒有冷氣時段。</p>:runList.map(r=><article key={r.id}><div><b>{r.usage_date}｜{String(r.start_time).slice(0,5)}–{String(r.end_time).slice(0,5)}</b>{r.note?<small>{r.note}</small>:null}</div><form action={deleteAirconRun}><input type="hidden" name="id" value={r.id}/><button className="dangerButton">刪除</button></form></article>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>04</span><h2>本月自動分攤</h2></div><strong>{allocationMode==='grade'?'依年級':'依個人'}</strong></div>
      {!meter?<div className="notice">先登記本月電表與費率，才有總金額可以分攤。</div>:runList.length===0?<div className="notice">先登記每天實際吹冷氣的時間。</div>:totalWeight===0?<div className="notice errorNotice">目前找不到符合「{allocationMode==='grade'?'依年級':'依個人'}」模式的當日出勤時段。請到「出勤／時段設定」套用或新增資料。</div>:<><div className="allocationGrid">{allocations.map(x=><article key={x.key}><b>{x.label}</b><strong>${Math.round(x.amount).toLocaleString()}</strong><span>{allocationMode==='grade'?`${Math.round(x.weight).toLocaleString()} 人分鐘`:`${Math.round(x.weight).toLocaleString()} 分鐘`}</span><small>{(x.weight/totalWeight*100).toFixed(1)}%</small></article>)}</div><div className="notice" style={{marginTop:12}}>分攤總額 ${Math.round(totalCost).toLocaleString()}；所有比例加總後會回到本月實際應繳學校金額。</div></>}
    </section>

    <section className="card"><div className="sectionTitle"><div><span>05</span><h2>最簡單的日常流程</h2></div></div><div className="notice"><b>每天：</b>出勤模板套用 → 改請假例外 → 登記冷氣開／關時間。<br/><b>月底：</b>輸入電表 → 選依年級或依個人 → 系統直接算分攤。</div></section>
    <style>{`.inline{display:flex;gap:9px;align-items:center;margin:10px 0}.inline input,.inline select,.grid input,.grid select{padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.grid label{font-size:12px;font-weight:800;color:#637083}.grid input{display:block;width:100%;margin-top:6px}.grid .wide{grid-column:1/-1}.summary{display:flex;gap:12px;margin-top:12px}.summary span{flex:1;padding:14px;border-radius:14px;background:var(--theme-soft,#f4f7fa)}.summary b{font-size:20px}.runList{display:grid;gap:8px;margin-top:12px}.runList article{display:grid;grid-template-columns:1fr auto;align-items:center;border:1px solid #e1e6eb;border-radius:14px;padding:12px;background:#fff}.runList small{display:block;color:#748191;margin-top:3px}.allocationGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.allocationGrid article{padding:15px;border:1px solid #e0e6eb;border-radius:15px;background:#fff;display:flex;flex-direction:column;gap:5px}.allocationGrid strong{font-size:22px}.allocationGrid span,.allocationGrid small{color:#748191}@media(max-width:850px){.grid,.allocationGrid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.inline{align-items:stretch;flex-direction:column}.grid,.allocationGrid{grid-template-columns:1fr}.grid .wide{grid-column:auto}.runList article{grid-template-columns:1fr}.runList button{width:100%}}`}</style>
  </main>;
}
