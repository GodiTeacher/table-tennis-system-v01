import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OperationsCloseReportExport from '@/components/OperationsCloseReportExport';

const pad=(n:number)=>String(n).padStart(2,'0');
const currentMonth=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;};
const tm=(t:string)=>{const [h,m]=String(t).slice(0,5).split(':').map(Number);return h*60+m};

type Att={attendance_date:string;start_time:string;end_time:string;attendee_count:number|null};
type Work={staff_id:string|null;work_date:string;start_time:string;end_time:string};
type Rule={staff_id:string|null;method:string;monthly_salary:number;weight_multiplier:number};

export default async function OperationsClosePage({searchParams}:{searchParams:Promise<{month?:string}>}){
  const q=await searchParams;
  const month=q.month||currentMonth();
  const monthStart=`${month}-01`;
  const d=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),1);
  const nextMonth=`${d.getFullYear()}-${pad(d.getMonth()+1)}-01`;

  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)redirect('/more');

  const [attRes,meterRes,runsRes,groupsRes,groupMonthRes,worksRes,staffRes,rulesRes,financeRes]=await Promise.all([
    supabase.from('daily_attendance_segments').select('id,attendance_date,start_time,end_time,attendee_count').eq('team_id',teamId).eq('mode','count').gte('attendance_date',monthStart).lt('attendance_date',nextMonth),
    supabase.from('aircon_meter_records').select('opening_reading,closing_reading,rate_per_unit,fixed_fee').eq('team_id',teamId).eq('record_month',monthStart).maybeSingle(),
    supabase.from('aircon_runs').select('id').eq('team_id',teamId).gte('usage_date',monthStart).lt('usage_date',nextMonth),
    supabase.from('aircon_fee_groups').select('id').eq('team_id',teamId).eq('active',true),
    supabase.from('aircon_fee_group_months').select('group_id,member_count').eq('team_id',teamId).eq('record_month',monthStart),
    supabase.from('coach_attendance_segments').select('staff_id,work_date,start_time,end_time').eq('team_id',teamId).gte('work_date',monthStart).lt('work_date',nextMonth),
    supabase.from('staff_members').select('id,display_name').eq('team_id',teamId).eq('active',true).order('display_name'),
    supabase.from('coach_pay_rules').select('staff_id,method,monthly_salary,weight_multiplier').eq('team_id',teamId),
    supabase.from('finance_items').select('item_type,category,description,amount').eq('team_id',teamId).eq('record_month',monthStart),
  ]);

  const attendance=(attRes.data??[]) as Att[];
  const meter=meterRes.data;
  const runs=runsRes.data??[];
  const groups=groupsRes.data??[];
  const groupMonths=groupMonthRes.data??[];
  const works=(worksRes.data??[]) as Work[];
  const staff=(staffRes.data??[]) as Array<{id:string;display_name:string}>;
  const rules=(rulesRes.data??[]) as Rule[];
  const finance=(financeRes.data??[]) as any[];

  const attendanceDays=new Set(attendance.map(x=>x.attendance_date)).size;
  const attendanceReady=attendance.length>0;
  const meterReady=!!meter&&Number(meter.closing_reading)>=Number(meter.opening_reading)&&Number(meter.rate_per_unit)>=0;
  const groupReady=groups.length>0&&groupMonths.length>=groups.length&&groupMonths.every((x:any)=>Number(x.member_count)>=0);
  const airconReady=meterReady&&runs.length>0&&groupReady;

  const activeIds=new Set(staff.map(x=>x.id));
  const ruleIds=new Set(rules.map(x=>x.staff_id).filter(Boolean));
  const payrollRuleReady=activeIds.size>0&&[...activeIds].every(id=>ruleIds.has(id));
  const payrollReady=works.length>0&&payrollRuleReady;

  const incomeItems=finance.filter(x=>x.item_type==='income').map(x=>({label:String(x.category),description:x.description??null,amount:Number(x.amount)}));
  const manualExpenseItems=finance.filter(x=>x.item_type==='expense').map(x=>({label:String(x.category),description:x.description??null,amount:Number(x.amount)}));
  const income=incomeItems.reduce((a,x)=>a+x.amount,0);
  const manualExpense=manualExpenseItems.reduce((a,x)=>a+x.amount,0);
  const airconCost=meter?(Number(meter.closing_reading)-Number(meter.opening_reading))*Number(meter.rate_per_unit)+Number(meter.fixed_fee):0;
  const expenseItems=[...manualExpenseItems,...(meter?[{label:'冷氣費（系統）',description:'由冷氣電表結算自動帶入',amount:Math.ceil(airconCost)}]:[])];
  const operatingExpense=manualExpense+airconCost;
  const financeReady=income>0;

  const ruleMap=new Map(rules.filter(r=>r.staff_id).map(r=>[r.staff_id as string,r]));
  const byDate=new Map<string,Att[]>();for(const a of attendance){const list=byDate.get(a.attendance_date)??[];list.push(a);byDate.set(a.attendance_date,list)}
  const studentCountAt=(date:string,a:number,b:number)=>{let total=0;for(const x of byDate.get(date)??[]){const xs=tm(x.start_time),xe=tm(x.end_time);if(Math.min(b,xe)>Math.max(a,xs))total+=Number(x.attendee_count??0)}return total};
  const rawWeightMap=new Map<string,number>();
  for(const w of works){const staffId=w.staff_id||'';const r=ruleMap.get(staffId);if(!staffId||r?.method!=='weighted_students')continue;const start=tm(w.start_time),end=tm(w.end_time);const points=new Set<number>([start,end]);for(const a of byDate.get(w.work_date)??[]){const s=Math.max(start,tm(a.start_time)),e=Math.min(end,tm(a.end_time));if(e>s){points.add(s);points.add(e)}}const p=[...points].sort((a,b)=>a-b);let raw=0;for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1];if(b>a)raw+=((b-a)/60)*studentCountAt(w.work_date,a,b)}rawWeightMap.set(staffId,(rawWeightMap.get(staffId)??0)+raw)}
  const weightMap=new Map<string,number>();let fixedPayTotal=0;
  for(const s of staff){const r=ruleMap.get(s.id);if(r?.method==='fixed_monthly')fixedPayTotal+=Math.max(0,Number(r.monthly_salary??0));else if(r?.method==='weighted_students')weightMap.set(s.id,(rawWeightMap.get(s.id)??0)*Math.max(0,Number(r.weight_multiplier??1)))}
  const totalWeight=[...weightMap.values()].reduce((a,b)=>a+b,0);
  const weightedPool=Math.max(0,income-operatingExpense-fixedPayTotal);
  const payMap=new Map<string,number>();
  for(const s of staff){const r=ruleMap.get(s.id);if(r?.method==='fixed_monthly')payMap.set(s.id,Math.max(0,Number(r.monthly_salary??0)));else if(r?.method==='weighted_students')payMap.set(s.id,totalWeight>0?weightedPool*(weightMap.get(s.id)??0)/totalWeight:0)}
  const coachPayTotal=[...payMap.values()].reduce((a,b)=>a+b,0);
  const finalBalance=income-operatingExpense-coachPayTotal;
  const reportStaff=staff.map(s=>{const r=ruleMap.get(s.id);const rawWeight=rawWeightMap.get(s.id)??0;const weight=weightMap.get(s.id)??0;return {name:s.display_name,method:r?.method??'weighted_students',pay:payMap.get(s.id)??0,rawWeight,weight,weightMultiplier:Number(r?.weight_multiplier??1),share:totalWeight>0?weight/totalWeight:0}});

  const completeCount=[attendanceReady,airconReady,payrollReady,financeReady].filter(Boolean).length;
  const status=(ok:boolean)=>(ok?'✅ 已完成':'⏳ 待完成');

  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">MONTHLY OPERATIONS CLOSE</div><h1>營運月結</h1><p>把學生出勤、冷氣費、教練薪酬、收入與支出集中在同一個月份檢查，並可直接產出月結報告。</p></section>

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>選擇月份</h2></div><strong>{month}</strong></div><form method="get" className="monthForm"><input type="month" name="month" defaultValue={month}/><button className="secondaryButton">查看月份</button></form><div className="progress"><div style={{width:`${(completeCount/4)*100}%`}}/><span>{completeCount}/4 項完成</span></div></section>

    <section className="statusGrid">
      <article className={attendanceReady?'done':''}><header><span>01</span><b>學生出勤</b><strong>{status(attendanceReady)}</strong></header><p>{attendanceReady?`${attendanceDays} 個出勤日・${attendance.length} 個時段`:'尚未產生本月學生出勤時段'}</p><Link href={`/attendance-settings?month=${month}`}>前往學生出勤 →</Link></article>
      <article className={airconReady?'done':''}><header><span>02</span><b>冷氣登記與費用</b><strong>{status(airconReady)}</strong></header><p>{meterReady?`本月冷氣費約 $${Math.ceil(airconCost).toLocaleString()}・${runs.length} 段冷氣時段`:'尚未完成本月電表結算'}{groups.length?`・${groups.length} 個月費群組`:''}</p><Link href={`/aircon?month=${month}`}>前往冷氣費 →</Link></article>
      <article className={payrollReady?'done':''}><header><span>03</span><b>教練薪酬</b><strong>{status(payrollReady)}</strong></header><p>{works.length?`${works.length} 段教練實際出勤`:'尚未產生本月教練實際出勤'}{payrollRuleReady?'・計薪規則完整':'・仍有教練缺計薪規則'}</p><Link href={`/payroll?month=${month}`}>前往教練薪酬 →</Link></article>
      <article className={financeReady?'done':''}><header><span>04</span><b>收入與支出</b><strong>{status(financeReady)}</strong></header><p>收入 ${Math.round(income).toLocaleString()}・營運支出 ${Math.ceil(operatingExpense).toLocaleString()}・教練薪酬 ${Math.round(coachPayTotal).toLocaleString()}</p><Link href={`/payroll?month=${month}#finance`}>前往收支 →</Link></article>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>本月摘要與報告</h2></div><strong>{completeCount===4?'可月結':'仍有待辦'}</strong></div><div className="summaryGrid"><div><span>學生出勤</span><b>{attendanceDays} 天</b></div><div><span>冷氣費</span><b>${Math.ceil(airconCost).toLocaleString()}</b></div><div><span>收入</span><b>${Math.round(income).toLocaleString()}</b></div><div><span>營運支出</span><b>${Math.ceil(operatingExpense).toLocaleString()}</b></div><div><span>教練薪酬</span><b>${Math.round(coachPayTotal).toLocaleString()}</b></div><div><span>本月餘額</span><b className={finalBalance<0?'negative':''}>${Math.round(finalBalance).toLocaleString()}</b></div></div><div className="notice">報告會包含收入、支出、冷氣費、固定月薪、加權薪酬與本月最終餘額；修改原始資料後請重新匯出。</div><OperationsCloseReportExport month={month} attendanceDays={attendanceDays} attendanceSegments={attendance.length} airconCost={airconCost} incomeItems={incomeItems} expenseItems={expenseItems} income={income} operatingExpense={operatingExpense} fixedPayTotal={fixedPayTotal} weightedPool={weightedPool} coachPayTotal={coachPayTotal} finalBalance={finalBalance} staff={reportStaff} completeCount={completeCount}/></section>

    <style>{`
      .monthForm{display:flex;gap:8px;align-items:center}.monthForm input{padding:10px;border:1px solid #dce2e8;border-radius:10px}.progress{position:relative;height:34px;margin-top:12px;border-radius:999px;background:#eef1f5;overflow:hidden}.progress>div{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,var(--theme-accent,#7c3aed),#ec4899,#14b8a6)}.progress span{position:relative;z-index:1;display:flex;height:100%;align-items:center;justify-content:center;font-size:12px;font-weight:900}.statusGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:12px 0}.statusGrid article{padding:15px;border:1px solid #e1e6eb;border-radius:16px;background:#fff}.statusGrid article.done{border-color:color-mix(in srgb,#16a34a 35%,#e1e6eb);background:color-mix(in srgb,#fff 94%,#dcfce7)}.statusGrid header{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center}.statusGrid header span{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--theme-soft,#f5f3ff);font-size:10px;font-weight:900}.statusGrid header b{font-size:16px}.statusGrid header strong{font-size:12px}.statusGrid p{color:#687486;font-size:13px;min-height:38px}.statusGrid a{text-decoration:none;font-weight:900;color:var(--theme-accent,#7c3aed)}.summaryGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.summaryGrid div{padding:14px;border-radius:13px;background:var(--theme-soft,#f4f7fa)}.summaryGrid span{display:block;font-size:11px;color:#748191}.summaryGrid b{font-size:20px}.negative{color:#c0392b}@media(max-width:760px){.statusGrid,.summaryGrid{grid-template-columns:1fr 1fr}}@media(max-width:520px){.statusGrid,.summaryGrid{grid-template-columns:1fr}.monthForm{align-items:stretch;flex-direction:column}}
    `}</style>
  </main>;
}
