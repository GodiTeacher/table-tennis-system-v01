import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const pad=(n:number)=>String(n).padStart(2,'0');
const currentMonth=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};

export default async function OperationsClosePage({searchParams}:{searchParams:Promise<{month?:string}>}){
  const q=await searchParams;const month=q.month||currentMonth();const monthStart=`${month}-01`;const d=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),1);const nextMonth=`${d.getFullYear()}-${pad(d.getMonth()+1)}-01`;
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)redirect('/login');const {data:teamId}=await supabase.rpc('current_team_id');if(!teamId)redirect('/more');
  const [attRes,meterRes,runsRes,groupsRes,groupMonthRes,worksRes,staffRes,rulesRes,financeRes]=await Promise.all([
    supabase.from('daily_attendance_segments').select('id,attendance_date,start_time,end_time,attendee_count').eq('team_id',teamId).eq('mode','count').gte('attendance_date',monthStart).lt('attendance_date',nextMonth),
    supabase.from('aircon_meter_records').select('opening_reading,closing_reading,rate_per_unit,fixed_fee').eq('team_id',teamId).eq('record_month',monthStart).maybeSingle(),
    supabase.from('aircon_runs').select('id').eq('team_id',teamId).gte('usage_date',monthStart).lt('usage_date',nextMonth),
    supabase.from('aircon_fee_groups').select('id').eq('team_id',teamId).eq('active',true),
    supabase.from('aircon_fee_group_months').select('group_id,member_count').eq('team_id',teamId).eq('record_month',monthStart),
    supabase.from('coach_attendance_segments').select('id').eq('team_id',teamId).gte('work_date',monthStart).lt('work_date',nextMonth),
    supabase.from('staff_members').select('id').eq('team_id',teamId).eq('active',true),
    supabase.from('coach_pay_rules').select('staff_id,coach_user_id,method').eq('team_id',teamId),
    supabase.from('finance_items').select('item_type,amount').eq('team_id',teamId).eq('record_month',monthStart),
  ]);
  const attendance=attRes.data??[],meter=meterRes.data,runs=runsRes.data??[],groups=groupsRes.data??[],groupMonths=groupMonthRes.data??[],works=worksRes.data??[],staff=staffRes.data??[],rules=rulesRes.data??[],finance=financeRes.data??[];
  const attendanceDays=new Set(attendance.map((x:any)=>x.attendance_date)).size;
  const attendanceReady=attendance.length>0;
  const meterReady=!!meter&&Number(meter.closing_reading)>=Number(meter.opening_reading)&&Number(meter.rate_per_unit)>=0;
  const groupReady=groups.length>0&&groupMonths.length>=groups.length&&groupMonths.every((x:any)=>Number(x.member_count)>=0);
  const airconReady=meterReady&&runs.length>0&&groupReady;
  const activeIds=new Set(staff.map((x:any)=>x.id));const ruleIds=new Set(rules.map((x:any)=>x.staff_id).filter(Boolean));const payrollRuleReady=activeIds.size>0&&[...activeIds].every(id=>ruleIds.has(id));const payrollReady=works.length>0&&payrollRuleReady;
  const income=finance.filter((x:any)=>x.item_type==='income').reduce((a:number,x:any)=>a+Number(x.amount),0);const manualExpense=finance.filter((x:any)=>x.item_type==='expense').reduce((a:number,x:any)=>a+Number(x.amount),0);const airconCost=meter?(Number(meter.closing_reading)-Number(meter.opening_reading))*Number(meter.rate_per_unit)+Number(meter.fixed_fee):0;
  const financeReady=income>0;
  const completeCount=[attendanceReady,airconReady,payrollReady,financeReady].filter(Boolean).length;
  const status=(ok:boolean)=>ok?'✅ 已完成':'⏳ 待完成';
  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">MONTHLY OPERATIONS CLOSE</div><h1>營運月結</h1><p>把學生出勤、冷氣費、教練薪酬與收支集中在同一個月份檢查。這裡不改原始資料，只負責確認完成度與快速跳轉。</p></section>
    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>選擇月份</h2></div><strong>{month}</strong></div><form method="get" className="monthForm"><input type="month" name="month" defaultValue={month}/><button className="secondaryButton">查看月份</button></form><div className="progress"><div style={{width:`${completeCount/4*100}%`}}/><span>{completeCount}/4 項完成</span></div></section>
    <section className="statusGrid">
      <article className={attendanceReady?'done':''}><header><span>01</span><b>學生出勤</b><strong>{status(attendanceReady)}</strong></header><p>{attendanceReady?`${attendanceDays} 個出勤日・${attendance.length} 個時段`:'尚未產生本月學生出勤時段'}</p><Link href={`/attendance-settings?month=${month}`}>前往學生出勤 →</Link></article>
      <article className={airconReady?'done':''}><header><span>02</span><b>冷氣登記與費用</b><strong>{status(airconReady)}</strong></header><p>{meterReady?`本月冷氣費約 $${Math.ceil(airconCost).toLocaleString()}・${runs.length} 段冷氣時段`:'尚未完成本月電表結算'}{groups.length?`・${groups.length} 個月費群組`:''}</p><Link href={`/aircon?month=${month}`}>前往冷氣費 →</Link></article>
      <article className={payrollReady?'done':''}><header><span>03</span><b>教練薪酬</b><strong>{status(payrollReady)}</strong></header><p>{works.length?`${works.length} 段教練實際出勤`:'尚未產生本月教練實際出勤'}{payrollRuleReady?'・計薪規則完整':'・仍有教練缺計薪規則'}</p><Link href={`/payroll?month=${month}`}>前往教練薪酬 →</Link></article>
      <article className={financeReady?'done':''}><header><span>04</span><b>收入與支出</b><strong>{status(financeReady)}</strong></header><p>收入 $${Math.round(income).toLocaleString()}・手動支出 $${Math.round(manualExpense).toLocaleString()}・冷氣 $${Math.ceil(airconCost).toLocaleString()}</p><Link href={`/payroll?month=${month}#finance`}>前往收支 →</Link></article>
    </section>
    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>本月摘要</h2></div><strong>{completeCount===4?'可進行月結確認':'仍有待辦'}</strong></div><div className="summaryGrid"><div><span>學生出勤</span><b>{attendanceDays} 天</b></div><div><span>冷氣費</span><b>${Math.ceil(airconCost).toLocaleString()}</b></div><div><span>收入</span><b>${Math.round(income).toLocaleString()}</b></div><div><span>目前已知支出</span><b>${Math.round(manualExpense+airconCost).toLocaleString()}</b></div></div><div className="notice">完成度是「資料是否具備」的檢查，不會鎖住月份。之後若你希望正式做「鎖帳／結案」，再加月結確認與歷史版本。</div></section>
    <style>{`.monthForm{display:flex;gap:8px;align-items:center}.monthForm input{padding:10px;border:1px solid #dce2e8;border-radius:10px}.progress{position:relative;height:34px;margin-top:12px;border-radius:999px;background:#eef1f5;overflow:hidden}.progress>div{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,var(--theme-accent,#7c3aed),#ec4899,#14b8a6)}.progress span{position:relative;z-index:1;display:flex;height:100%;align-items:center;justify-content:center;font-size:12px;font-weight:900}.statusGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:12px 0}.statusGrid article{padding:15px;border:1px solid #e1e6eb;border-radius:16px;background:#fff}.statusGrid article.done{border-color:color-mix(in srgb,#16a34a 35%,#e1e6eb);background:color-mix(in srgb,#fff 94%,#dcfce7)}.statusGrid header{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center}.statusGrid header span{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--theme-soft,#f5f3ff);font-size:10px;font-weight:900}.statusGrid header b{font-size:16px}.statusGrid header strong{font-size:12px}.statusGrid p{color:#687486;font-size:13px;min-height:38px}.statusGrid a{text-decoration:none;font-weight:900;color:var(--theme-accent,#7c3aed)}.summaryGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.summaryGrid div{padding:14px;border-radius:13px;background:var(--theme-soft,#f4f7fa)}.summaryGrid span{display:block;font-size:11px;color:#748191}.summaryGrid b{font-size:20px}@media(max-width:760px){.statusGrid,.summaryGrid{grid-template-columns:1fr 1fr}}@media(max-width:520px){.statusGrid,.summaryGrid{grid-template-columns:1fr}.monthForm{align-items:stretch;flex-direction:column}}</style>
  </main>;
}
