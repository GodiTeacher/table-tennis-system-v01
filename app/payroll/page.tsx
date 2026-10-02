import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  addCoachScheduleFromAttendanceTemplate,
  addCoachScheduleTemplate,
  addFinanceItem,
  addStaffMember,
  applyCoachTemplatesToMonth,
  archiveStaffMember,
  deleteCoachScheduleTemplate,
  deleteFinanceItem,
  saveCoachPayRule,
  updateStaffMember,
} from './actions';
import { addCoachAttendanceForMonth, updateCoachAttendanceBulk } from './edit-actions';
import PayrollReportExport from '@/components/PayrollReportExport';

const WEEK=['一','二','三','四','五','六','日'];
const pad=(n:number)=>String(n).padStart(2,'0');
const currentMonth=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};
const tm=(t:string)=>{const [h,m]=String(t).slice(0,5).split(':').map(Number);return h*60+m};

type Staff={id:string;linked_user_id:string|null;display_name:string;role_type:string;phone:string|null;note:string|null;active:boolean};
type Rule={staff_id:string|null;coach_user_id:string|null;method:string;monthly_salary:number;weight_multiplier:number;note:string|null};
type Work={id:string;staff_id:string|null;coach_user_id:string|null;work_date:string;start_time:string;end_time:string;source:string;note:string|null};
type Att={attendance_date:string;start_time:string;end_time:string;attendee_count:number|null};

export default async function PayrollPage({searchParams}:{searchParams:Promise<{month?:string;message?:string;error?:string}>}){
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

  const [
    {data:staff},{data:rules},{data:templates},{data:monthlyWorks},{data:finance},{data:meter},{data:studentTemplates},{data:monthlyAtt}
  ]=await Promise.all([
    supabase.from('staff_members').select('id,linked_user_id,display_name,role_type,phone,note,active').eq('team_id',teamId).order('active',{ascending:false}).order('display_name'),
    supabase.from('coach_pay_rules').select('staff_id,coach_user_id,method,monthly_salary,weight_multiplier,note').eq('team_id',teamId),
    supabase.from('coach_schedule_templates').select('id,staff_id,coach_user_id,weekday,start_time,end_time,note').eq('team_id',teamId).eq('active',true).order('weekday').order('start_time'),
    supabase.from('coach_attendance_segments').select('id,staff_id,coach_user_id,work_date,start_time,end_time,source,note').eq('team_id',teamId).gte('work_date',monthStart).lt('work_date',nextMonth).order('work_date').order('start_time'),
    supabase.from('finance_items').select('id,record_month,item_type,category,description,amount').eq('team_id',teamId).eq('record_month',monthStart).order('created_at'),
    supabase.from('aircon_meter_records').select('opening_reading,closing_reading,rate_per_unit,fixed_fee').eq('team_id',teamId).eq('record_month',monthStart).maybeSingle(),
    supabase.from('attendance_templates').select('id,weekday,start_time,end_time,default_count,note').eq('team_id',teamId).eq('mode','count').eq('active',true).order('weekday').order('start_time'),
    supabase.from('daily_attendance_segments').select('attendance_date,start_time,end_time,attendee_count').eq('team_id',teamId).eq('mode','count').gte('attendance_date',monthStart).lt('attendance_date',nextMonth),
  ]);

  const staffList=(staff??[]) as Staff[];
  const activeStaff=staffList.filter(s=>s.active);
  const staffMap=new Map(staffList.map(s=>[s.id,s]));
  const ruleMap=new Map<string,Rule>();
  for(const r of (rules??[]) as Rule[]){const k=r.staff_id||r.coach_user_id;if(k)ruleMap.set(k,r)}

  const workList=(monthlyWorks??[]) as Work[];
  const worksByDate=new Map<string,Work[]>();
  for(const w of workList){const list=worksByDate.get(w.work_date)??[];list.push(w);worksByDate.set(w.work_date,list)}
  const workDays=[...worksByDate.entries()].sort(([a],[b])=>a.localeCompare(b));
  const nameFor=(w:Work)=>w.staff_id?staffMap.get(w.staff_id)?.display_name||'人員':'教練／人員';

  const financeList=(finance??[]) as any[];
  const incomeItems=financeList.filter(x=>x.item_type==='income').map(x=>({label:String(x.category),description:x.description??null,amount:Number(x.amount)}));
  const manualExpenseItems=financeList.filter(x=>x.item_type==='expense').map(x=>({label:String(x.category),description:x.description??null,amount:Number(x.amount)}));
  const income=incomeItems.reduce((a,x)=>a+x.amount,0);
  const manualExpense=manualExpenseItems.reduce((a,x)=>a+x.amount,0);
  const airconCost=meter?(Number(meter.closing_reading)-Number(meter.opening_reading))*Number(meter.rate_per_unit)+Number(meter.fixed_fee):0;
  const expenseItems=[...manualExpenseItems,...(meter?[{label:'冷氣費（系統）',description:'由冷氣電表結算自動帶入',amount:Math.ceil(airconCost)}]:[])];
  const operatingExpense=manualExpense+airconCost;

  const fixedPayMap=new Map<string,number>();
  let fixedPayTotal=0;
  for(const s of activeStaff){const r=ruleMap.get(s.id);const fixed=Math.max(0,Number(r?.monthly_salary??0));fixedPayMap.set(s.id,fixed);fixedPayTotal+=fixed;}
  const beforeCoachPool=income-operatingExpense;
  const weightedPool=Math.max(0,beforeCoachPool-fixedPayTotal);

  const atts=(monthlyAtt??[]) as Att[];
  const byDate=new Map<string,Att[]>();
  for(const a of atts){const list=byDate.get(a.attendance_date)??[];list.push(a);byDate.set(a.attendance_date,list)}
  const studentCountAt=(date:string,a:number,b:number)=>{let total=0;for(const x of byDate.get(date)??[]){const xs=tm(x.start_time),xe=tm(x.end_time);if(Math.min(b,xe)>Math.max(a,xs))total+=Number(x.attendee_count??0)}return total};

  const rawWeightMap=new Map<string,number>();
  for(const w of workList){
    const staffId=w.staff_id||'';
    const multiplier=Math.max(0,Number(ruleMap.get(staffId)?.weight_multiplier??0));
    if(!staffId||multiplier<=0)continue;
    const start=tm(w.start_time),end=tm(w.end_time);const points=new Set<number>([start,end]);
    for(const a of byDate.get(w.work_date)??[]){const s=Math.max(start,tm(a.start_time)),e=Math.min(end,tm(a.end_time));if(e>s){points.add(s);points.add(e)}}
    const p=[...points].sort((a,b)=>a-b);let weight=0;
    for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1];if(b>a)weight+=((b-a)/60)*studentCountAt(w.work_date,a,b)}
    rawWeightMap.set(staffId,(rawWeightMap.get(staffId)??0)+weight);
  }

  const weightMap=new Map<string,number>();
  for(const s of activeStaff){const r=ruleMap.get(s.id);const multiplier=Math.max(0,Number(r?.weight_multiplier??0));if(multiplier>0)weightMap.set(s.id,(rawWeightMap.get(s.id)??0)*multiplier)}
  const totalWeight=[...weightMap.values()].reduce((a,b)=>a+b,0);
  const weightedPayMap=new Map<string,number>();
  const payMap=new Map<string,number>();
  for(const s of activeStaff){
    const fixed=fixedPayMap.get(s.id)??0;
    const weighted=totalWeight>0?weightedPool*(weightMap.get(s.id)??0)/totalWeight:0;
    weightedPayMap.set(s.id,weighted);
    payMap.set(s.id,fixed+weighted);
  }
  const coachPayTotal=[...payMap.values()].reduce((a,b)=>a+b,0);
  const finalBalance=income-operatingExpense-coachPayTotal;
  const reportStaff=activeStaff.map(s=>{const r=ruleMap.get(s.id);const rawWeight=rawWeightMap.get(s.id)??0;const weight=weightMap.get(s.id)??0;const fixedPay=fixedPayMap.get(s.id)??0;const weightedPay=weightedPayMap.get(s.id)??0;return {name:s.display_name,pay:payMap.get(s.id)??0,rawWeight,weight,weightMultiplier:Number(r?.weight_multiplier??0),share:totalWeight>0?weight/totalWeight:0,configuredMonthlySalary:Number(r?.monthly_salary??0),fixedPay,weightedPay}});

  return <main className="shell">
    <section className="hero compactHero"><div className="eyebrow">PAYROLL V9 · FIXED + WEIGHTED</div><h1>教練薪酬</h1><p>固定月薪與加權分配可以同時存在；固定月薪填 0 代表沒有，加權比例填 0 代表不參與加權分配。</p><div className="topNav"><Link href={`/attendance-settings?month=${month}`}>學生出勤</Link><Link href={`/aircon?month=${month}`}>冷氣費</Link><Link href={`/operations-close?month=${month}`}>營運月結</Link></div></section>
    {q.message?<div className="notice successNotice statusBanner">✓ {q.message}</div>:null}{q.error?<div className="notice errorNotice statusBanner">{q.error}</div>:null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>檢視月份</h2></div><strong>{month}</strong></div><form method="get" className="inline"><input type="month" name="month" defaultValue={month}/><button className="secondaryButton">切換月份</button><span className="muted">只切換查看月份，不會修改固定班表。</span></form></section>

    <section className="card" id="coach-rules"><div className="sectionTitle"><div><span>02</span><h2>教練／工作人員與計薪方式</h2></div><strong>{activeStaff.length} 人</strong></div>
      <div className="notice"><b>兩種計薪可同時使用。</b> 固定月薪填 <b>0</b>＝沒有固定月薪；加權比例填 <b>0</b>＝不參與「出勤 × 學生人數」分配。兩個都非 0 時，本月薪酬＝固定月薪＋加權分配。</div>
      <form action={addStaffMember} className="grid"><label>姓名<input name="display_name" required/></label><label>類型<select name="role_type"><option value="coach">教練</option><option value="assistant">助教</option><option value="admin">行政</option><option value="other">其他</option></select></label><label>電話<input name="phone"/></label><label>備註<input name="note"/></label><button className="primaryButton wide">＋ 新增人員</button></form>
      <div className="staffGrid">{staffList.map(s=><article key={s.id} className={!s.active?'inactive':''}><form action={updateStaffMember} className="staffEdit"><input type="hidden" name="id" value={s.id}/><input name="display_name" defaultValue={s.display_name}/><select name="role_type" defaultValue={s.role_type}><option value="coach">教練</option><option value="assistant">助教</option><option value="admin">行政</option><option value="other">其他</option></select><input name="phone" defaultValue={s.phone??''} placeholder="電話"/><input name="note" defaultValue={s.note??''} placeholder="備註"/><button className="secondaryButton">儲存資料</button></form>{s.active?<><form action={saveCoachPayRule} className="payRule"><input type="hidden" name="staff_id" value={s.id}/><input type="hidden" name="month" value={month}/><label>固定月薪<input type="number" name="monthly_salary" min="0" defaultValue={ruleMap.get(s.id)?.monthly_salary??0}/><small>0＝沒有</small></label><label>加權比例<input type="number" name="weight_multiplier" min="0" step="0.05" defaultValue={Number(ruleMap.get(s.id)?.weight_multiplier??0)}/><small>0＝不參與；1＝標準</small></label><input name="note" defaultValue={ruleMap.get(s.id)?.note??''} placeholder="計薪備註"/><button className="secondaryButton">儲存計薪規則</button></form><form action={archiveStaffMember}><input type="hidden" name="id" value={s.id}/><button className="dangerButton">停用</button></form></>:<span className="muted">已停用</span>}</article>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>03</span><h2>固定每週教練班表</h2></div><strong>跨月份共用</strong></div><div className="notice"><b>這是一套長期固定模板。</b>每個月份都會看到同一份；請假、加班或臨時調整再到下一區修改。</div>
      <form action={addCoachScheduleFromAttendanceTemplate} className="inline"><select name="staff_id">{activeStaff.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select><select name="attendance_template_id">{(studentTemplates??[]).map((t:any)=><option key={t.id} value={t.id}>週{WEEK[Number(t.weekday)-1]}｜{String(t.start_time).slice(0,5)}–{String(t.end_time).slice(0,5)}｜學生 {t.default_count??0} 人</option>)}</select><button className="primaryButton">由學生時段建立</button></form>
      <details><summary className="secondaryButton">＋ 手動新增固定班表</summary><form action={addCoachScheduleTemplate} className="grid"><label>人員<select name="staff_id">{activeStaff.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select></label><label>星期<select name="weekday">{WEEK.map((w,i)=><option key={w} value={i+1}>星期{w}</option>)}</select></label><label>開始<input type="time" name="start_time" required/></label><label>結束<input type="time" name="end_time" required/></label><label className="wide">備註<input name="note"/></label><button className="primaryButton wide">新增班表</button></form></details>
      <div className="scheduleGrid">{(templates??[]).map((t:any)=><article key={t.id}><div><b>{t.staff_id?staffMap.get(t.staff_id)?.display_name:'人員'}</b><span>週{WEEK[Number(t.weekday)-1]}｜{String(t.start_time).slice(0,5)}–{String(t.end_time).slice(0,5)}</span>{t.note?<small>{t.note}</small>:null}</div><form action={deleteCoachScheduleTemplate}><input type="hidden" name="id" value={t.id}/><button className="dangerButton">刪除</button></form></article>)}</div>
      <form action={applyCoachTemplatesToMonth} className="applyBar"><input type="hidden" name="month" value={month}/><span>依固定班表一次建立 {month} 整月實際出勤。</span><button className="primaryButton">⚡ 套用 {month} 整月班表</button></form>
    </section>

    <section className="card" id="coach-attendance"><div className="sectionTitle"><div><span>04</span><h2>本月教練實際出勤</h2></div><strong>{workDays.length} 天｜{workList.length} 段</strong></div>{q.message?<div className="notice successNotice">✓ {q.message}</div>:null}<div className="notice">同一天集中在同一張卡片。可改時間與備註，最後一次儲存整月。</div>
      <form action={addCoachAttendanceForMonth} className="grid"><input type="hidden" name="month" value={month}/><label>人員<select name="staff_id">{activeStaff.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select></label><label>日期<input type="date" name="work_date" defaultValue={`${month}-01`} required/></label><label>開始<input type="time" name="start_time" required/></label><label>結束<input type="time" name="end_time" required/></label><label className="wide">備註<input name="note"/></label><button className="primaryButton wide">＋ 新增本月實際出勤</button></form>
      {workList.length===0?<p className="muted">本月還沒有教練出勤。</p>:<form action={updateCoachAttendanceBulk} className="attendanceBulk"><input type="hidden" name="month" value={month}/><div className="bulkTop"><span>共 {workDays.length} 個出勤日，修改完成後一次儲存。</span><button className="primaryButton">💾 一次儲存本月全部出勤</button></div><div className="attendanceDays">{workDays.map(([date,dayWorks])=><section className="attendanceDay" key={date}><header className="attendanceDayHead"><div><b>{date}</b><span>{dayWorks.length} 位教練／人員</span></div><strong>{dayWorks.map(nameFor).join('、')}</strong></header><div className="attendanceHead"><span>教練</span><span>開始</span><span>結束</span><span>備註</span><span>刪除</span></div>{dayWorks.map(w=><div className="attendanceRow" key={w.id}><input type="hidden" name="work_id" value={w.id}/><input type="hidden" name={`work_date_${w.id}`} value={w.work_date}/><b>{nameFor(w)}</b><input type="time" name={`start_time_${w.id}`} defaultValue={String(w.start_time).slice(0,5)}/><input type="time" name={`end_time_${w.id}`} defaultValue={String(w.end_time).slice(0,5)}/><input name={`note_${w.id}`} defaultValue={w.note??''} placeholder={w.source==='template'?'固定班表':'手動'}/><label className="deleteCheck"><input type="checkbox" name={`delete_${w.id}`} value="1"/> 刪除</label></div>)}</section>)}</div><div className="bulkFooter"><button className="primaryButton">💾 一次儲存本月全部出勤</button></div></form>}
    </section>

    <section className="card" id="finance"><div className="sectionTitle"><div><span>05</span><h2>收入與支出項目</h2></div><strong>{month}</strong></div><div className="notice">先列完整本月收入與支出；冷氣費會由冷氣電表結算自動帶入。</div><form action={addFinanceItem} className="grid"><input type="hidden" name="record_month" value={month}/><label>類型<select name="item_type"><option value="income">收入</option><option value="expense">支出</option></select></label><label>分類<input name="category" required/></label><label>說明<input name="description"/></label><label>金額<input type="number" name="amount" min="0" required/></label><button className="primaryButton wide">＋ 新增收支</button></form>
      <div className="financeCols"><div><h3>收入</h3>{financeList.filter(x=>x.item_type==='income').map(x=><article key={x.id}><div><b>{x.category}</b><span>{x.description??''}</span></div><strong>+${Number(x.amount).toLocaleString()}</strong><form action={deleteFinanceItem}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="month" value={month}/><button className="dangerButton">刪除</button></form></article>)}</div><div><h3>支出</h3>{financeList.filter(x=>x.item_type==='expense').map(x=><article key={x.id}><div><b>{x.category}</b><span>{x.description??''}</span></div><strong>-${Number(x.amount).toLocaleString()}</strong><form action={deleteFinanceItem}><input type="hidden" name="id" value={x.id}/><input type="hidden" name="month" value={month}/><button className="dangerButton">刪除</button></form></article>)}{meter?<article className="systemExpense"><div><b>冷氣費（系統）</b><span>由冷氣電表結算自動帶入</span></div><strong>-${Math.ceil(airconCost).toLocaleString()}</strong></article>:null}</div></div>
      <div className="moneySummary"><div><span>收入合計</span><b>${Math.round(income).toLocaleString()}</b></div><div><span>營運支出</span><b>${Math.ceil(operatingExpense).toLocaleString()}</b></div><div><span>扣薪前可用</span><b>${Math.floor(beforeCoachPool).toLocaleString()}</b></div></div>
    </section>

    <section className="card" id="coach-pay"><div className="sectionTitle"><div><span>06</span><h2>教練薪酬分配</h2></div><strong>即時試算</strong></div><div className="formulaBox"><b>計薪公式</b><span>固定月薪：直接加入個人本月薪酬。</span><span>原始權重 ＝ Σ（該段實際出勤小時 × 該段學生人數）</span><span>最終權重 ＝ 原始權重 × 加權比例；加權比例 0 代表不參與。</span><span>加權可分配池 ＝ 收入 − 營運支出 − 全體固定月薪</span><span>本月薪酬 ＝ 固定月薪 ＋ 個人加權分配。</span></div><a className="primaryButton calc" href="#coach-pay-results">查看本月薪酬分配</a>
      <div id="coach-pay-results" className="payResult"><div className={`notice ${atts.length&&workList.length?'successNotice':'warningNotice'}`}>已讀取 <b>{atts.length} 個學生出勤時段</b>、<b>{workList.length} 段教練實際出勤</b>；加權總權重 <b>{totalWeight.toFixed(1)}</b>。</div><div className="poolSummary"><div><span>收入</span><b>${Math.round(income).toLocaleString()}</b></div><div><span>營運支出</span><b>-${Math.ceil(operatingExpense).toLocaleString()}</b></div><div><span>固定月薪</span><b>-${Math.round(fixedPayTotal).toLocaleString()}</b></div><div><span>加權教練可分配池</span><b>${Math.floor(weightedPool).toLocaleString()}</b></div></div>
        <div className="salaryGrid">{activeStaff.map(s=>{const r=ruleMap.get(s.id);const fixed=fixedPayMap.get(s.id)??0;const rawWeight=rawWeightMap.get(s.id)??0;const multiplier=Math.max(0,Number(r?.weight_multiplier??0));const weight=weightMap.get(s.id)??0;const share=totalWeight>0?weight/totalWeight:0;const weighted=weightedPayMap.get(s.id)??0;const pay=payMap.get(s.id)??0;const mode=fixed>0&&multiplier>0?'固定＋加權':fixed>0?'固定月薪':multiplier>0?'加權分配':'未設定';return <article key={s.id} className={fixed>0?'fixedSalary':''}><header><b>{s.display_name}</b><span>{mode}</span></header><strong>${Math.round(pay).toLocaleString()}</strong><small>{fixed>0?`固定 ${Math.round(fixed).toLocaleString()}｜`:''}{multiplier>0?`原始 ${rawWeight.toFixed(1)} 人時 × ${multiplier.toFixed(2)}＝${weight.toFixed(1)} 加權｜占比 ${(share*100).toFixed(1)}%｜加權 ${Math.round(weighted).toLocaleString()}`:'不參與加權分配'}</small></article>})}</div>
        <div className="closeSummary">教練薪酬合計 <b>${Math.round(coachPayTotal).toLocaleString()}</b>｜分配後餘額 <b className={finalBalance<0?'negative':''}>${Math.round(finalBalance).toLocaleString()}</b></div>
        <PayrollReportExport month={month} incomeItems={incomeItems} expenseItems={expenseItems} income={income} operatingExpense={operatingExpense} fixedPayTotal={fixedPayTotal} weightedPool={weightedPool} coachPayTotal={coachPayTotal} finalBalance={finalBalance} staff={reportStaff}/>
      </div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>07</span><h2>前往營運月結</h2></div><strong>整合檢查</strong></div><div className="notice">完成學生出勤、冷氣費與教練薪酬後，到營運月結一次確認本月是否全部完成。</div><Link className="primaryButton calc" href={`/operations-close?month=${month}`}>查看 {month} 營運月結 →</Link></section>

    <style>{`
      .statusBanner{margin-bottom:10px}.inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}.inline input,.inline select,.grid input,.grid select,.staffEdit input,.staffEdit select,.payRule input,.attendanceRow input{padding:9px;border:1px solid #dce2e8;border-radius:10px;background:#fff}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.grid label,.payRule label{font-size:12px;font-weight:800;color:#637083}.grid input,.grid select,.payRule input{display:block;width:100%;margin-top:4px;min-width:0}.payRule small{display:block;margin-top:3px;color:#8a94a3;font-size:10px}.grid input[type="time"],.attendanceRow input[type="time"]{min-width:145px}.wide{grid-column:1/-1}
      .staffGrid{display:grid;gap:9px;margin-top:12px}.staffGrid article{padding:12px;border:1px solid #e1e6eb;border-radius:14px;background:#fff}.staffGrid article.inactive{opacity:.58}.staffEdit{display:grid;grid-template-columns:1.1fr .8fr 1fr 1.4fr auto;gap:7px}.payRule{display:grid;grid-template-columns:.8fr .8fr 1.2fr auto;gap:7px;align-items:end;margin-top:8px;padding-top:8px;border-top:1px dashed #e1e6eb}
      .scheduleGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.scheduleGrid article{display:flex;justify-content:space-between;gap:8px;padding:10px;border:1px solid #e1e6eb;border-radius:13px;background:#fff}.scheduleGrid article>div{display:flex;flex-direction:column}.scheduleGrid span,.scheduleGrid small{font-size:12px;color:#748191}.applyBar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;padding:11px;border-radius:13px;background:var(--theme-soft,#f5f3ff)}.applyBar span{font-size:12px;color:#637083}
      .attendanceBulk{margin-top:12px}.bulkTop,.bulkFooter{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0}.bulkTop span{font-size:12px;color:#748191}.bulkFooter{justify-content:flex-end}.attendanceDays{display:grid;gap:12px}.attendanceDay{border:1px solid #e1e6eb;border-radius:15px;overflow:hidden;background:#fff}.attendanceDayHead{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 13px;background:linear-gradient(90deg,var(--theme-soft,#f4f1ff),#fff)}.attendanceDayHead>div{display:flex;align-items:baseline;gap:10px}.attendanceDayHead b{font-size:15px}.attendanceDayHead span{font-size:11px;color:#748191}.attendanceDayHead strong{font-size:11px;color:var(--theme-accent,#7c3aed);text-align:right}.attendanceHead,.attendanceRow{display:grid;grid-template-columns:130px 145px 145px minmax(180px,1fr) 70px;gap:7px;align-items:center}.attendanceHead{padding:8px 10px;background:#fafbfc;font-size:10px;font-weight:900;color:#657183}.attendanceRow{padding:7px 10px;border-top:1px solid #eef1f4}.attendanceRow b{font-size:12px}.attendanceRow input{width:100%;min-width:0}.deleteCheck{font-size:11px;color:#a1443e;white-space:nowrap}.deleteCheck input{width:auto}
      .financeCols{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.financeCols>div{border:1px solid #e1e6eb;border-radius:14px;padding:10px;background:#fff}.financeCols h3{margin:0 0 7px;font-size:14px}.financeCols article{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:9px 0;border-top:1px solid #eef1f4}.financeCols article:first-of-type{border-top:0}.financeCols article>div{display:flex;flex-direction:column}.financeCols article span{font-size:11px;color:#748191}.systemExpense{background:#faf9ff}
      .moneySummary,.poolSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.poolSummary{grid-template-columns:repeat(4,1fr)}.moneySummary div,.poolSummary div{padding:12px;border-radius:12px;background:var(--theme-soft,#f4f7fa)}.moneySummary span,.poolSummary span{display:block;font-size:11px;color:#748191}.moneySummary b,.poolSummary b{font-size:18px}.formulaBox{display:grid;gap:5px;padding:12px;border-radius:13px;background:var(--theme-soft,#f4f7fa);font-size:12px;color:#596577}.formulaBox b{color:#263244}.calc{display:inline-block;text-decoration:none;margin-top:10px}.payResult{scroll-margin-top:90px}.salaryGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:12px}.salaryGrid article{padding:13px;border:1px solid #e1e6eb;border-radius:14px;background:#fff}.salaryGrid article.fixedSalary{border-color:#c9b6ff;background:#fcfaff}.salaryGrid header{display:flex;justify-content:space-between;gap:8px}.salaryGrid header span{font-size:11px;color:var(--theme-accent,#7c3aed);font-weight:800}.salaryGrid strong{display:block;margin-top:8px;font-size:22px}.salaryGrid small{color:#748191}.closeSummary{margin-top:12px;padding:14px;border-radius:14px;background:var(--theme-soft,#f4f7fa)}.negative{color:#c0392b}summary{cursor:pointer;margin:10px 0}
      @media(max-width:1000px){.staffEdit,.payRule{grid-template-columns:1fr 1fr}.staffEdit button,.payRule button{grid-column:1/-1}.scheduleGrid{grid-template-columns:1fr 1fr}.attendanceHead{display:none}.attendanceRow{grid-template-columns:120px 1fr 1fr}.attendanceRow input[name^="note_"]{grid-column:1/-1}.attendanceDayHead{align-items:flex-start;flex-direction:column}.financeCols{grid-template-columns:1fr}.salaryGrid{grid-template-columns:1fr 1fr}}
      @media(max-width:700px){.grid{grid-template-columns:1fr 1fr}.poolSummary,.moneySummary{grid-template-columns:1fr 1fr}.applyBar,.bulkTop{align-items:stretch;flex-direction:column}.attendanceRow{grid-template-columns:1fr 1fr}.attendanceRow b,.attendanceRow input[name^="note_"]{grid-column:1/-1}.salaryGrid{grid-template-columns:1fr}}
      @media(max-width:560px){.inline{align-items:stretch;flex-direction:column}.grid,.staffEdit,.payRule,.scheduleGrid,.poolSummary,.moneySummary,.attendanceRow{grid-template-columns:1fr}.wide{grid-column:auto}.grid input[type="time"],.attendanceRow input[type="time"]{min-width:0}.attendanceRow b,.attendanceRow input[name^="note_"]{grid-column:auto}.attendanceDayHead strong{text-align:left}}
    `}</style>
  </main>;
}
