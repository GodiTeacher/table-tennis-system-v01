import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Att={id:string;attendance_date:string;start_time:string;end_time:string;attendee_count:number|null};
type Run={usage_date:string;start_time:string;end_time:string};
type Group={id:string;name:string;default_monthly_fee:number};
type Setting={group_id:string;monthly_fee:number;member_count:number};
type Split={attendance_segment_id:string;group_id:string;attendee_count:number};
const tm=(t:string)=>{const [h,m]=String(t).slice(0,5).split(':').map(Number);return h*60+m};
const pad=(n:number)=>String(n).padStart(2,'0');

export async function GET(req:NextRequest){
  const month=req.nextUrl.searchParams.get('month')||'';
  const allowUnclassified=req.nextUrl.searchParams.get('allow_unclassified')==='1';
  if(!/^\d{4}-\d{2}$/.test(month))return NextResponse.json({error:'月份格式錯誤'},{status:400});
  const monthStart=`${month}-01`;const d=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),1);const nextMonth=`${d.getFullYear()}-${pad(d.getMonth()+1)}-01`;
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)return NextResponse.json({error:'未登入'},{status:401});const {data:teamId}=await supabase.rpc('current_team_id');if(!teamId)return NextResponse.json({error:'找不到球隊'},{status:400});
  const [{data:meter},{data:runs},{data:attendance},{data:groups},{data:settings}]=await Promise.all([
    supabase.from('aircon_meter_records').select('opening_reading,closing_reading,rate_per_unit,fixed_fee').eq('team_id',teamId).eq('record_month',monthStart).maybeSingle(),
    supabase.from('aircon_runs').select('usage_date,start_time,end_time').eq('team_id',teamId).gte('usage_date',monthStart).lt('usage_date',nextMonth),
    supabase.from('daily_attendance_segments').select('id,attendance_date,start_time,end_time,attendee_count').eq('team_id',teamId).eq('mode','count').gte('attendance_date',monthStart).lt('attendance_date',nextMonth),
    supabase.from('aircon_fee_groups').select('id,name,default_monthly_fee').eq('team_id',teamId).eq('active',true).order('sort_order'),
    supabase.from('aircon_fee_group_months').select('group_id,monthly_fee,member_count').eq('team_id',teamId).eq('record_month',monthStart),
  ]);
  if(!meter)return NextResponse.json({error:'尚未登記本月電表'},{status:400});
  const att=(attendance??[]) as Att[],runList=(runs??[]) as Run[],groupList=(groups??[]) as Group[],settingList=(settings??[]) as Setting[];
  const ids=att.map(a=>a.id);const {data:splits}=ids.length?await supabase.from('aircon_fee_group_attendance').select('attendance_segment_id,group_id,attendee_count').eq('team_id',teamId).in('attendance_segment_id',ids):{data:[] as Split[]};
  const splitList=(splits??[]) as Split[];const countMap=new Map(splitList.map(s=>[`${s.attendance_segment_id}:${s.group_id}`,Number(s.attendee_count??0)]));
  const status=att.map(a=>{const assigned=groupList.reduce((sum,g)=>sum+(countMap.get(`${a.id}:${g.id}`)??0),0);return {a,total:Number(a.attendee_count??0),assigned};});
  const over=status.filter(x=>x.assigned>x.total);const incomplete=status.filter(x=>x.assigned<x.total);if(over.length)return NextResponse.json({error:`有 ${over.length} 個時段群組人數超過出勤總數`},{status:400});if(incomplete.length&&!allowUnclassified)return NextResponse.json({error:`尚有 ${incomplete.length} 個時段未分類完整`},{status:400});
  const byDate=new Map<string,Att[]>();for(const a of att){const list=byDate.get(a.attendance_date)??[];list.push(a);byDate.set(a.attendance_date,list);}
  const pm=new Map(groupList.map(g=>[g.id,0]));let unclassifiedPm=0;
  for(const r of runList){const rs=tm(r.start_time),re=tm(r.end_time);for(const a of byDate.get(r.usage_date)??[]){const s=Math.max(rs,tm(a.start_time)),e=Math.min(re,tm(a.end_time));if(e<=s)continue;let assigned=0;for(const g of groupList){const c=countMap.get(`${a.id}:${g.id}`)??0;assigned+=c;pm.set(g.id,(pm.get(g.id)??0)+(e-s)*c);}if(allowUnclassified)unclassifiedPm+=(e-s)*Math.max(0,Number(a.attendee_count??0)-assigned);}}
  const totalCost=(Number(meter.closing_reading)-Number(meter.opening_reading))*Number(meter.rate_per_unit)+Number(meter.fixed_fee);const denominator=[...pm.values()].reduce((a,b)=>a+b,0)+unclassifiedPm;const settingMap=new Map(settingList.map(s=>[s.group_id,s]));
  const rows=groupList.map(g=>{const s=settingMap.get(g.id);const personMinutes=pm.get(g.id)??0;const theoreticalShare=denominator>0?totalCost*personMinutes/denominator:0;const members=Number(s?.member_count??0);const monthlyFee=Number(s?.monthly_fee??g.default_monthly_fee??0);const coolingPerPerson=members>0?Math.ceil(theoreticalShare/members):0;const groupCoolingFee=members>0?coolingPerPerson*members:Math.ceil(theoreticalShare);return {name:g.name,monthlyFee,members,personHours:personMinutes/60,theoreticalShare,groupCoolingFee,coolingPerPerson,totalPerPerson:monthlyFee+coolingPerPerson};});
  const unclassifiedShare=denominator>0?totalCost*unclassifiedPm/denominator:0;
  return NextResponse.json({month,totalCost,rows,unclassified:unclassifiedPm>0?{personHours:unclassifiedPm/60,groupCoolingFee:Math.ceil(unclassifiedShare)}:null,rounding:'ceil'});
}
