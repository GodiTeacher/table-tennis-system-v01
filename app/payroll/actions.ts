'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function ctx(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims(); const userId=claims?.claims?.sub;
  if(!userId)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id'); if(!teamId)redirect('/more');
  return {supabase,userId,teamId};
}

export async function saveCoachPayRule(formData:FormData){
  const {supabase,teamId}=await ctx();
  const coach=String(formData.get('coach_user_id')??''); const method=String(formData.get('method')??'hourly');
  const hourly=Number(formData.get('hourly_rate')??0); const base=Number(formData.get('base_hourly_rate')??0); const per=Number(formData.get('per_student_hour')??0);
  const tier1Max=Number(formData.get('tier1_max')??5), tier1Rate=Number(formData.get('tier1_rate')??0), tier2Max=Number(formData.get('tier2_max')??10), tier2Rate=Number(formData.get('tier2_rate')??0), tier3Rate=Number(formData.get('tier3_rate')??0);
  const note=String(formData.get('note')??'').trim()||null;
  if(!coach||!['hourly','tiered','base_plus_student'].includes(method))redirect('/payroll?error='+encodeURIComponent('請確認教練與計薪方式。'));
  const tierRules=[{min:0,max:tier1Max,rate:tier1Rate},{min:tier1Max+1,max:tier2Max,rate:tier2Rate},{min:tier2Max+1,max:null,rate:tier3Rate}];
  const {error}=await supabase.from('coach_pay_rules').upsert({team_id:teamId,coach_user_id:coach,method,hourly_rate:hourly,base_hourly_rate:base,per_student_hour:per,tier_rules:tierRules,note,updated_at:new Date().toISOString()},{onConflict:'team_id,coach_user_id'});
  if(error)redirect('/payroll?error='+encodeURIComponent(error.message));
  revalidatePath('/payroll'); redirect('/payroll?message='+encodeURIComponent('教練計薪規則已儲存。'));
}

export async function addCoachScheduleTemplate(formData:FormData){
  const {supabase,teamId}=await ctx(); const coach=String(formData.get('coach_user_id')??''); const weekday=Number(formData.get('weekday')??0); const start=String(formData.get('start_time')??''); const end=String(formData.get('end_time')??''); const scope=String(formData.get('scope_type')??'team'); const gradeRaw=String(formData.get('grade')??''); const group=String(formData.get('training_group_id')??'')||null; const note=String(formData.get('note')??'').trim()||null;
  if(!coach||weekday<1||weekday>7||!start||!end||end<=start)redirect('/payroll?error='+encodeURIComponent('請確認固定班表資料。'));
  const {error}=await supabase.from('coach_schedule_templates').insert({team_id:teamId,coach_user_id:coach,weekday,start_time:start,end_time:end,scope_type:scope,grade:scope==='grade'&&gradeRaw?Number(gradeRaw):null,training_group_id:scope==='group'?group:null,note});
  if(error)redirect('/payroll?error='+encodeURIComponent(error.message)); revalidatePath('/payroll');
}

export async function deleteCoachScheduleTemplate(formData:FormData){const {supabase,teamId}=await ctx();await supabase.from('coach_schedule_templates').delete().eq('id',String(formData.get('id')??'')).eq('team_id',teamId);revalidatePath('/payroll');}

export async function addCoachAttendance(formData:FormData){
  const {supabase,teamId}=await ctx(); const coach=String(formData.get('coach_user_id')??''); const date=String(formData.get('work_date')??''); const start=String(formData.get('start_time')??''); const end=String(formData.get('end_time')??''); const countRaw=String(formData.get('student_count')??''); const count=countRaw===''?null:Number(countRaw); const scope=String(formData.get('scope_type')??'team'); const gradeRaw=String(formData.get('grade')??''); const group=String(formData.get('training_group_id')??'')||null; const note=String(formData.get('note')??'').trim()||null;
  if(!coach||!date||!start||!end||end<=start)redirect('/payroll?error='+encodeURIComponent('請確認教練實際出勤。'));
  const {error}=await supabase.from('coach_attendance_segments').insert({team_id:teamId,coach_user_id:coach,work_date:date,start_time:start,end_time:end,student_count:count,scope_type:scope,grade:scope==='grade'&&gradeRaw?Number(gradeRaw):null,training_group_id:scope==='group'?group:null,source:'manual',note});
  if(error)redirect('/payroll?error='+encodeURIComponent(error.message)); revalidatePath('/payroll');
}

export async function applyCoachTemplatesToDate(formData:FormData){
  const {supabase,teamId}=await ctx(); const date=String(formData.get('work_date')??''); if(!date)redirect('/payroll?error='+encodeURIComponent('請先選日期。'));
  const weekday=((new Date(`${date}T12:00:00`).getDay()+6)%7)+1;
  const {data:templates}=await supabase.from('coach_schedule_templates').select('coach_user_id,start_time,end_time,scope_type,grade,training_group_id,note').eq('team_id',teamId).eq('weekday',weekday).eq('active',true);
  await supabase.from('coach_attendance_segments').delete().eq('team_id',teamId).eq('work_date',date).eq('source','template');
  if(templates?.length){await supabase.from('coach_attendance_segments').insert(templates.map(t=>({team_id:teamId,coach_user_id:t.coach_user_id,work_date:date,start_time:t.start_time,end_time:t.end_time,student_count:null,scope_type:t.scope_type,grade:t.grade,training_group_id:t.training_group_id,source:'template',note:t.note})));}
  revalidatePath('/payroll'); redirect(`/payroll?date=${date}&message=${encodeURIComponent('已套用當天教練固定班表。')}`);
}

export async function deleteCoachAttendance(formData:FormData){const {supabase,teamId}=await ctx();await supabase.from('coach_attendance_segments').delete().eq('id',String(formData.get('id')??'')).eq('team_id',teamId);revalidatePath('/payroll');}

export async function addFinanceItem(formData:FormData){
  const {supabase,userId,teamId}=await ctx(); const raw=String(formData.get('record_month')??''); const month=raw?`${raw.slice(0,7)}-01`:''; const type=String(formData.get('item_type')??'expense'); const category=String(formData.get('category')??'').trim(); const description=String(formData.get('description')??'').trim()||null; const amount=Number(formData.get('amount')??0);
  if(!month||!category||!Number.isFinite(amount)||amount<0)redirect('/payroll?error='+encodeURIComponent('請確認收支項目。'));
  const {error}=await supabase.from('finance_items').insert({team_id:teamId,record_month:month,item_type:type,category,description,amount,created_by:userId}); if(error)redirect('/payroll?error='+encodeURIComponent(error.message)); revalidatePath('/payroll');
}
export async function deleteFinanceItem(formData:FormData){const {supabase,teamId}=await ctx();await supabase.from('finance_items').delete().eq('id',String(formData.get('id')??'')).eq('team_id',teamId);revalidatePath('/payroll');}
