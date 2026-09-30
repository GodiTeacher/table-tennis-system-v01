'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function context(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId) redirect('/login');
  const {data:teamId,error}=await supabase.rpc('current_team_id');
  if(error||!teamId) redirect('/aircon?error='+encodeURIComponent('目前沒有可使用的隊伍工作區。'));
  return {supabase,userId,teamId};
}

export async function saveMeterRecord(formData:FormData){
  const {supabase,userId,teamId}=await context();
  const rawMonth=String(formData.get('record_month')??'').trim();
  const recordMonth=rawMonth?`${rawMonth.slice(0,7)}-01`:'';
  const opening=Number(formData.get('opening_reading')??0);
  const closing=Number(formData.get('closing_reading')??0);
  const rate=Number(formData.get('rate_per_unit')??0);
  const fixed=Number(formData.get('fixed_fee')??0);
  const note=String(formData.get('note')??'').trim()||null;
  if(!recordMonth||![opening,closing,rate,fixed].every(Number.isFinite)||closing<opening||rate<0||fixed<0) redirect('/aircon?error='+encodeURIComponent('請確認月份、電表度數與費率資料。'));
  const {error}=await supabase.from('aircon_meter_records').upsert({team_id:teamId,record_month:recordMonth,opening_reading:opening,closing_reading:closing,rate_per_unit:rate,fixed_fee:fixed,note,created_by:userId,updated_at:new Date().toISOString()},{onConflict:'team_id,record_month'});
  if(error) redirect('/aircon?error='+encodeURIComponent(error.message));
  revalidatePath('/aircon');
  redirect('/aircon?message='+encodeURIComponent('每月冷氣電表資料已儲存。'));
}

export async function addUsageSession(formData:FormData){
  const {supabase,userId,teamId}=await context();
  const meterId=String(formData.get('meter_record_id')??'')||null;
  const usageDate=String(formData.get('usage_date')??'');
  const start=String(formData.get('start_time')??'')||null;
  const end=String(formData.get('end_time')??'')||null;
  const grade=String(formData.get('grade_label')??'').trim()||null;
  const units=Number(formData.get('usage_units')??0);
  const countRaw=String(formData.get('student_count')??'').trim();
  const studentCount=countRaw===''?null:Number(countRaw);
  const note=String(formData.get('note')??'').trim()||null;
  if(!usageDate||!Number.isFinite(units)||units<0||(studentCount!==null&&(!Number.isFinite(studentCount)||studentCount<0))) redirect('/aircon?error='+encodeURIComponent('請確認時段使用資料。'));
  const {error}=await supabase.from('aircon_usage_sessions').insert({team_id:teamId,meter_record_id:meterId,usage_date:usageDate,start_time:start,end_time:end,grade_label:grade,usage_units:units,student_count:studentCount,created_by:userId,note});
  if(error) redirect('/aircon?error='+encodeURIComponent(error.message));
  revalidatePath('/aircon');
  redirect('/aircon?message='+encodeURIComponent('冷氣時段明細已新增。'));
}

export async function deleteMeterRecord(formData:FormData){
  const {supabase,teamId}=await context();
  const id=String(formData.get('id')??'');
  const {error}=await supabase.from('aircon_meter_records').delete().eq('id',id).eq('team_id',teamId);
  if(error) redirect('/aircon?error='+encodeURIComponent(error.message));
  revalidatePath('/aircon');
  redirect('/aircon?message='+encodeURIComponent('月份紀錄已刪除。'));
}

export async function deleteUsageSession(formData:FormData){
  const {supabase,teamId}=await context();
  const id=String(formData.get('id')??'');
  const {error}=await supabase.from('aircon_usage_sessions').delete().eq('id',id).eq('team_id',teamId);
  if(error) redirect('/aircon?error='+encodeURIComponent(error.message));
  revalidatePath('/aircon');
  redirect('/aircon?message='+encodeURIComponent('時段紀錄已刪除。'));
}
