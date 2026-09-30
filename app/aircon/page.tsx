import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addUsageSession, deleteMeterRecord, deleteUsageSession, saveMeterRecord } from './actions';

type Meter={id:string;record_month:string;opening_reading:number;closing_reading:number;rate_per_unit:number;fixed_fee:number;note:string|null};
type Session={id:string;meter_record_id:string|null;usage_date:string;start_time:string|null;end_time:string|null;grade_label:string|null;usage_units:number;student_count:number|null;note:string|null};

export default async function AirconPage({searchParams}:{searchParams:Promise<{message?:string;error?:string}>}){
  const params=await searchParams;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub) redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId) redirect('/more');
  const [{data:meterRows},{data:sessionRows}]=await Promise.all([
    supabase.from('aircon_meter_records').select('id,record_month,opening_reading,closing_reading,rate_per_unit,fixed_fee,note').eq('team_id',teamId).order('record_month',{ascending:false}),
    supabase.from('aircon_usage_sessions').select('id,meter_record_id,usage_date,start_time,end_time,grade_label,usage_units,student_count,note').eq('team_id',teamId).order('usage_date',{ascending:false}),
  ]);
  const meters=(meterRows??[]) as Meter[];
  const sessions=(sessionRows??[]) as Session[];
  const meterMap=new Map(meters.map(m=>[m.id,m]));
  const monthly=meters.map(m=>({m,units:Number(m.closing_reading)-Number(m.opening_reading),amount:(Number(m.closing_reading)-Number(m.opening_reading))*Number(m.rate_per_unit)+Number(m.fixed_fee)}));
  const gradeTotals=new Map<string,{units:number,cost:number,count:number}>();
  for(const s of sessions){
    const key=s.grade_label||'未指定年級';
    const meter=s.meter_record_id?meterMap.get(s.meter_record_id):undefined;
    const rate=meter?Number(meter.rate_per_unit):0;
    const current=gradeTotals.get(key)??{units:0,cost:0,count:0};
    current.units+=Number(s.usage_units); current.cost+=Number(s.usage_units)*rate; current.count+=1; gradeTotals.set(key,current);
  }
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">AIR CONDITIONING</div><h1>冷氣度數與費用</h1><p>每月登記電表起訖與費率，計算應繳學校的冷氣費；時段明細預留年級與人數，之後可直接延伸到每位學生分攤。</p><div className="topNav"><Link href="/more">返回更多</Link><Link href="/team-standards#venue">球隊規範</Link></div></section>
    {params.message?<div className="notice successNotice">{params.message}</div>:null}{params.error?<div className="notice errorNotice">{params.error}</div>:null}
    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>每月電表結算</h2></div></div>
      <form action={saveMeterRecord} className="airconForm"><label>月份<input type="month" name="record_month" required defaultValue={new Date().toISOString().slice(0,7)}/></label><label>月初電表<input type="number" step="0.01" name="opening_reading" required/></label><label>月底電表<input type="number" step="0.01" name="closing_reading" required/></label><label>每度單價<input type="number" step="0.0001" name="rate_per_unit" required/></label><label>固定費<input type="number" step="1" name="fixed_fee" defaultValue="0"/></label><label className="wide">備註<input name="note" placeholder="例如：校方優惠、特殊月份"/></label><button className="primaryButton wide">儲存／更新月份</button></form>
      <div className="notice" style={{marginTop:12}}><b>公式：</b>本月度數＝月底電表－月初電表；應繳學校＝本月度數 × 每度單價 ＋ 固定費。</div>
    </section>
    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>月份總表</h2></div><strong>{monthly.length} 個月</strong></div>{monthly.length===0?<p className="muted">尚無資料。</p>:<div className="airconMonthList">{monthly.map(({m,units,amount})=><article key={m.id}><div><b>{m.record_month.slice(0,7)}</b><small>{m.opening_reading} → {m.closing_reading}｜{units.toFixed(2)} 度</small></div><div><span>每度 ${Number(m.rate_per_unit).toFixed(2)}</span><strong>${Math.round(amount).toLocaleString()}</strong></div><form action={deleteMeterRecord}><input type="hidden" name="id" value={m.id}/><button className="dangerButton">刪除</button></form></article>)}</div>}</section>
    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>時段／年級明細</h2></div><strong>為未來分攤預留</strong></div>
      <form action={addUsageSession} className="airconForm"><label>對應月份<select name="meter_record_id" defaultValue=""><option value="">未指定</option>{meters.map(m=><option key={m.id} value={m.id}>{m.record_month.slice(0,7)}</option>)}</select></label><label>日期<input type="date" name="usage_date" required defaultValue={new Date().toISOString().slice(0,10)}/></label><label>開始時間<input type="time" name="start_time"/></label><label>結束時間<input type="time" name="end_time"/></label><label>年級<input name="grade_label" placeholder="例如：低年級／3年級"/></label><label>該時段度數<input type="number" step="0.01" min="0" name="usage_units" defaultValue="0" required/></label><label>學生人數<input type="number" min="0" step="1" name="student_count"/></label><label className="wide">備註<input name="note" placeholder="例如：16:00–17:30 培育班"/></label><button className="primaryButton wide">＋ 新增時段明細</button></form>
      <div className="notice" style={{marginTop:12}}><b>下一階段：</b>把今日到課／訓練時段與這裡的年級明細串起來，就能依每個時段實際到課學生自動計算每位學生冷氣分攤，不需要再人工重算。</div>
    </section>
    <section className="card"><div className="sectionTitle"><div><span>04</span><h2>年級使用彙整</h2></div></div>{gradeTotals.size===0?<p className="muted">尚無時段資料。</p>:<div className="gradeCostGrid">{[...gradeTotals.entries()].map(([grade,v])=><article key={grade}><b>{grade}</b><strong>{v.units.toFixed(2)} 度</strong><span>已登記 {v.count} 個時段</span><small>依已綁定月份費率估算：約 ${Math.round(v.cost).toLocaleString()}</small></article>)}</div>}</section>
    <section className="card"><div className="sectionTitle"><div><span>05</span><h2>時段紀錄</h2></div><strong>{sessions.length} 筆</strong></div>{sessions.length===0?<p className="muted">尚無紀錄。</p>:<div className="airconSessionList">{sessions.map(s=>{const meter=s.meter_record_id?meterMap.get(s.meter_record_id):undefined;const est=Number(s.usage_units)*(meter?Number(meter.rate_per_unit):0);const per=s.student_count&&s.student_count>0?est/s.student_count:null;return <article key={s.id}><div><b>{s.usage_date}｜{s.grade_label||'未指定年級'}</b><small>{s.start_time?.slice(0,5)||'--:--'}–{s.end_time?.slice(0,5)||'--:--'}｜{Number(s.usage_units).toFixed(2)} 度{s.student_count!=null?`｜${s.student_count} 人`:''}</small>{s.note?<p>{s.note}</p>:null}</div><div><strong>{meter?`約 $${Math.round(est).toLocaleString()}`:'未綁費率'}</strong>{per!=null?<small>約 ${per.toFixed(1)}／人</small>:null}</div><form action={deleteUsageSession}><input type="hidden" name="id" value={s.id}/><button className="dangerButton">刪除</button></form></article>})}</div>}</section>
    <style>{`.airconForm{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.airconForm label{font-size:12px;font-weight:800;color:#637083}.airconForm input,.airconForm select{display:block;width:100%;margin-top:6px;padding:10px 11px;border:1px solid #dce2e8;border-radius:11px;background:#fff;font:inherit}.airconForm .wide{grid-column:1/-1}.airconMonthList,.airconSessionList{display:grid;gap:8px}.airconMonthList article,.airconSessionList article{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;border:1px solid #e1e6eb;border-radius:14px;padding:12px;background:#fff}.airconMonthList small,.airconSessionList small{display:block;color:#7b8796;margin-top:3px}.airconMonthList article>div:nth-child(2),.airconSessionList article>div:nth-child(2){text-align:right}.airconMonthList strong,.airconSessionList strong{display:block;font-size:18px}.airconSessionList p{margin:5px 0 0;color:#687587}.gradeCostGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.gradeCostGrid article{padding:14px;border:1px solid #e1e6eb;border-radius:14px;background:#fff;display:flex;flex-direction:column;gap:4px}.gradeCostGrid strong{font-size:22px}.gradeCostGrid span,.gradeCostGrid small{color:#748191}@media(max-width:900px){.airconForm{grid-template-columns:repeat(2,1fr)}.gradeCostGrid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.airconForm{grid-template-columns:1fr}.airconForm .wide{grid-column:auto}.gradeCostGrid{grid-template-columns:1fr}.airconMonthList article,.airconSessionList article{grid-template-columns:1fr auto}.airconMonthList form,.airconSessionList form{grid-column:1/-1}.airconMonthList form button,.airconSessionList form button{width:100%}}`}</style>
  </main>;
}
