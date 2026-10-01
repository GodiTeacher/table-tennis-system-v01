'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const enc=(s:string)=>encodeURIComponent(s);
const monthDate=(m:string)=>`${m.slice(0,7)}-01`;
const bounds=(month:string)=>{const y=Number(month.slice(0,4)),m=Number(month.slice(5,7));const d=new Date(y,m,1);return {start:`${month}-01`,next:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};};
async function context(){const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)redirect('/login');const {data:teamId,error}=await supabase.rpc('current_team_id');if(error||!teamId)redirect('/more');return {supabase,teamId};}

export async function saveAirconFeeGroups(formData:FormData){
  const {supabase,teamId}=await context();const month=String(formData.get('month')??'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(month))redirect('/aircon?error='+enc('請先選擇月份。'));
  const ids=formData.getAll('group_id').map(String).filter(Boolean);if(!ids.length)redirect(`/aircon?month=${month}&error=${enc('目前沒有可儲存的月費群組。')}`);
  for(const id of ids){
    const name=String(formData.get(`name_${id}`)??'').trim();const fee=Number(formData.get(`monthly_fee_${id}`)??0);const members=Number(formData.get(`member_count_${id}`)??0);
    if(!name||!Number.isFinite(fee)||fee<0||!Number.isInteger(members)||members<0)redirect(`/aircon?month=${month}&error=${enc('請確認群組名稱、月費與收費人數。')}`);
    const {error:gError}=await supabase.from('aircon_fee_groups').update({name,default_monthly_fee:fee,updated_at:new Date().toISOString()}).eq('id',id).eq('team_id',teamId);if(gError)redirect(`/aircon?month=${month}&error=${enc(gError.message)}`);
    const {error:mError}=await supabase.from('aircon_fee_group_months').upsert({team_id:teamId,group_id:id,record_month:monthDate(month),monthly_fee:fee,member_count:members,updated_at:new Date().toISOString()},{onConflict:'group_id,record_month'});if(mError)redirect(`/aircon?month=${month}&error=${enc(mError.message)}`);
  }
  redirect(`/aircon?month=${month}&message=${enc('本月月費群組設定已儲存。')}#fee-groups`);
}

export async function addAirconFeeGroup(formData:FormData){
  const {supabase,teamId}=await context();const month=String(formData.get('month')??'').slice(0,7);const {data:last}=await supabase.from('aircon_fee_groups').select('sort_order').eq('team_id',teamId).order('sort_order',{ascending:false}).limit(1).maybeSingle();const next=Math.min(32000,Number(last?.sort_order??0)+1);
  const {error}=await supabase.from('aircon_fee_groups').insert({team_id:teamId,name:`月費群組 ${next}`,default_monthly_fee:0,sort_order:next,active:true});if(error)redirect(`/aircon?month=${month}&error=${enc(error.message)}`);redirect(`/aircon?month=${month}&message=${enc('已新增一個月費群組。')}#fee-groups`);
}

export async function archiveAirconFeeGroup(formData:FormData){
  const {supabase,teamId}=await context();const month=String(formData.get('month')??'').slice(0,7),id=String(formData.get('id')??'');if(id)await supabase.from('aircon_fee_groups').update({active:false,updated_at:new Date().toISOString()}).eq('id',id).eq('team_id',teamId);redirect(`/aircon?month=${month}&message=${enc('群組已停用；歷史月份資料會保留。')}#fee-groups`);
}

export async function saveAirconGroupAttendance(formData:FormData){
  const {supabase,teamId}=await context();const month=String(formData.get('month')??'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(month))redirect('/aircon?error='+enc('請先選擇月份。'));const {start,next}=bounds(month);
  const [{data:segments,error:sError},{data:groups,error:gError}]=await Promise.all([
    supabase.from('daily_attendance_segments').select('id,attendee_count').eq('team_id',teamId).eq('mode','count').gte('attendance_date',start).lt('attendance_date',next),
    supabase.from('aircon_fee_groups').select('id').eq('team_id',teamId).eq('active',true),
  ]);
  if(sError||gError)redirect(`/aircon?month=${month}&error=${enc(sError?.message||gError?.message||'讀取資料失敗')}`);
  const rows:any[]=[];let incomplete=0;
  for(const s of segments??[]){let sum=0;for(const g of groups??[]){const raw=String(formData.get(`g_${s.id}_${g.id}`)??'0');const count=Number(raw);if(!Number.isInteger(count)||count<0)redirect(`/aircon?month=${month}&error=${enc('群組出勤人數只能填 0 或正整數。')}#group-attendance`);sum+=count;rows.push({team_id:teamId,attendance_segment_id:s.id,group_id:g.id,attendee_count:count,updated_at:new Date().toISOString()});}const total=Number(s.attendee_count??0);if(sum>total)redirect(`/aircon?month=${month}&error=${enc('有時段的群組人數合計超過該時段總出勤人數，請修正後再儲存。')}#group-attendance`);if(sum!==total)incomplete++;}
  if(rows.length){const {error}=await supabase.from('aircon_fee_group_attendance').upsert(rows,{onConflict:'attendance_segment_id,group_id'});if(error)redirect(`/aircon?month=${month}&error=${enc(error.message)}#group-attendance`);}
  const msg=incomplete===0?'群組出勤人數已儲存，所有時段都已完整分組。':`群組出勤人數已儲存；尚有 ${incomplete} 個時段的人數未完全分組。`;
  redirect(`/aircon?month=${month}&message=${enc(msg)}#group-attendance`);
}
