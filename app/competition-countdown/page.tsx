import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addCompetitionHoliday, deleteCompetitionHoliday } from './actions';

const MS_DAY=86_400_000;
function parseDateOnly(value:string){const [y,m,d]=value.split('-').map(Number);return Date.UTC(y,m-1,d)}
function taipeiToday(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function calendarDays(today:string,target:string){return Math.max(0,Math.round((parseDateOnly(target)-parseDateOnly(today))/MS_DAY))}
function workingDays(today:string,target:string,holidays:Set<string>){
  const start=parseDateOnly(today); const end=parseDateOnly(target); if(end<=start)return 0;
  let count=0;
  for(let t=start+MS_DAY;t<=end;t+=MS_DAY){
    const d=new Date(t); const iso=d.toISOString().slice(0,10); const isTarget=t===end; const weekend=d.getUTCDay()===0||d.getUTCDay()===6;
    if(isTarget||(!weekend&&!holidays.has(iso)))count++;
  }
  return count;
}
function urgency(days:number){if(days<=3)return 'critical';if(days<=7)return 'urgent';if(days<=14)return 'soon';if(days<=30)return 'near';return 'far'}
function dateLabel(value:string){const [y,m,d]=value.split('-');return `${y}/${m}/${d}`}

export default async function CompetitionCountdownPage(){
  const supabase=await createClient(); const {data:claims}=await supabase.auth.getClaims(); if(!claims?.claims?.sub)redirect('/login');
  const today=taipeiToday();
  const [{data:competitions},{data:holidays}]=await Promise.all([
    supabase.from('competitions').select('id,name,start_date,end_date,location,status').gte('start_date',today).not('status','in','(completed,cancelled)').order('start_date',{ascending:true}),
    supabase.from('competition_holidays').select('id,holiday_date,name').gte('holiday_date',today).order('holiday_date',{ascending:true}),
  ]);
  const holidaySet=new Set((holidays??[]).map(h=>h.holiday_date));
  return <main className="shell countdownPage">
    <section className="hero compactHero"><div className="eyebrow">COMPETITION COUNTDOWN</div><h1>比賽倒數</h1><p>直接讀取比賽管理中的開始日期，同時顯示「實際日曆天數」與「扣除週末／休假日後的準備天數」。</p><div className="topNav"><Link href="/competitions">比賽管理</Link><Link href="/more">更多</Link></div></section>

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>即將到來的比賽</h2></div><strong>{competitions?.length??0} 場</strong></div>
      {!competitions?.length?<div className="notice">目前沒有尚未結束的未來比賽；先到「比賽管理」建立賽事。</div>:<div className="countdownGrid">{competitions.map(c=>{
        const raw=calendarDays(today,c.start_date); const work=workingDays(today,c.start_date,holidaySet); const level=urgency(raw);
        return <article className={`countdownCard ${level}`} key={c.id}>
          <div className="countdownHead"><div><b>{c.name}</b><small>{dateLabel(c.start_date)}{c.end_date&&c.end_date!==c.start_date?` ～ ${dateLabel(c.end_date)}`:''}{c.location?` · ${c.location}`:''}</small></div><Link href={`/competitions/${c.id}`}>管理比賽 ›</Link></div>
          <div className="countdownHalf calendar"><span>未扣假日</span><strong>{raw}</strong><em>天</em><small>實際日曆倒數</small></div>
          <div className="countdownDivider"/>
          <div className="countdownHalf working"><span>扣除假日</span><strong>{work}</strong><em>天</em><small>扣除週六、週日與自訂休假日；比賽當天保留</small></div>
        </article>})}</div>}
      <div className="countdownLegend"><span className="far">30 天以上</span><span className="near">15～30 天</span><span className="soon">8～14 天</span><span className="urgent">4～7 天</span><span className="critical">3 天內</span></div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>休假日設定</h2></div><strong>週末自動扣除</strong></div>
      <div className="notice"><b>計算方式：</b>週六、週日會自動視為假日；國定假日、補假或學校自訂放假日可在下面另外加入。這些日期只影響「扣除假日」的倒數。</div>
      <form action={addCompetitionHoliday} className="holidayForm"><label>日期<input type="date" name="holiday_date" required/></label><label>名稱<input name="name" placeholder="例如：國慶日／學校補假" maxLength={40}/></label><button className="primaryButton">＋ 加入休假日</button></form>
      {!holidays?.length?<p className="muted">目前沒有另外設定休假日。</p>:<div className="holidayList">{holidays.map(h=><div key={h.id}><span><b>{dateLabel(h.holiday_date)}</b>{h.name}</span><form action={deleteCompetitionHoliday}><input type="hidden" name="holiday_id" value={h.id}/><button className="secondaryButton dangerText">刪除</button></form></div>)}</div>}
    </section>

    <style>{`
      .countdownGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.countdownCard{border-radius:22px;overflow:hidden;border:1px solid rgba(25,35,45,.09);box-shadow:0 12px 30px rgba(30,40,55,.09);background:#fff}.countdownHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:16px 18px;background:rgba(255,255,255,.9)}.countdownHead b{display:block;font-size:18px}.countdownHead small{display:block;color:#69788a;margin-top:5px}.countdownHead a{text-decoration:none;color:inherit;font-weight:900;font-size:12px;white-space:nowrap}.countdownHalf{display:grid;grid-template-columns:auto auto 1fr;align-items:baseline;gap:8px;padding:20px 22px}.countdownHalf span{grid-column:1/-1;font-weight:900;font-size:13px;letter-spacing:.02em}.countdownHalf strong{font-size:58px;line-height:.95}.countdownHalf em{font-size:19px;font-style:normal;font-weight:900}.countdownHalf small{grid-column:1/-1;margin-top:3px;color:rgba(20,30,40,.72)}.countdownDivider{height:1px;background:rgba(255,255,255,.58);margin:0 18px}.countdownCard.far .countdownHalf{background:#dff5ea}.countdownCard.near .countdownHalf{background:#fff3bf}.countdownCard.soon .countdownHalf{background:#ffe0ae}.countdownCard.urgent .countdownHalf{background:#ffc2aa}.countdownCard.critical .countdownHalf{background:#d94a4a;color:#fff}.countdownCard.critical .countdownHalf small{color:rgba(255,255,255,.9)}.countdownLegend{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}.countdownLegend span{padding:6px 9px;border-radius:999px;font-size:11px;font-weight:900}.countdownLegend .far{background:#dff5ea}.countdownLegend .near{background:#fff3bf}.countdownLegend .soon{background:#ffe0ae}.countdownLegend .urgent{background:#ffc2aa}.countdownLegend .critical{background:#d94a4a;color:#fff}.holidayForm{display:grid;grid-template-columns:1fr 1.4fr auto;gap:10px;align-items:end;margin-top:14px}.holidayForm label{font-size:12px;font-weight:800;color:#657286}.holidayForm input{display:block;width:100%;margin-top:6px;padding:11px 12px;border:1px solid #dce3e9;border-radius:11px;background:#fff;font:inherit}.holidayList{display:flex;flex-direction:column;gap:8px;margin-top:14px}.holidayList>div{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid #e1e6eb;border-radius:13px;padding:9px 11px;background:#fff}.holidayList span{display:flex;gap:12px;align-items:center;color:#667486}.holidayList b{color:#263342}.dangerText{color:#a33}@media(max-width:780px){.countdownGrid{grid-template-columns:1fr}.holidayForm{grid-template-columns:1fr}.countdownHalf strong{font-size:50px}}`}</style>
  </main>;
}
