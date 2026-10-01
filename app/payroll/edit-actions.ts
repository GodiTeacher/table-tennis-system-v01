'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const enc=(s:string)=>encodeURIComponent(s);
async function ctx(){const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)redirect('/login');const {data:teamId}=await supabase.rpc('current_team_id');if(!teamId)redirect('/more');return {supabase,teamId};}
async function staffInfo(supabase:any,teamId:string,staffId:string){const {data,error}=await supabase.from('staff_members').select('id,linked_user_id').eq('id',staffId).eq('team_id',teamId).eq('active',true).single();return error||!data?null:data as {id:string;linked_user_id:string|null};}

export async function addCoachAttendanceForMonth(formData:FormData){
  const {supabase,teamId}=await ctx();const month=String(formData.get('month')??'').slice(0,7);const staffId=String(formData.get('staff_id')??'');const date=String(formData.get('work_date')??'');const start=String(formData.get('start_time')??'');const end=String(formData.get('end_time')??'');const note=String(formData.get('note')??'').trim()||null;
  if(!/^\d{4}-\d{2}$/.test(month)||!staffId||!date||!start||!end||end<=start)redirect(`/payroll?month=${month||''}&error=${enc('請確認實際出勤資料。')}`);
  const staff=await staffInfo(supabase,teamId,staffId);if(!staff)redirect(`/payroll?month=${month}&error=${enc('找不到這位人員。')}`);
  const {error}=await supabase.from('coach_attendance_segments').insert({team_id:teamId,staff_id:staff.id,coach_user_id:staff.linked_user_id,work_date:date,start_time:start,end_time:end,student_count:null,scope_type:'team',grade:null,training_group_id:null,source:'manual',note});
  if(error)redirect(`/payroll?month=${month}&error=${enc(error.message)}`);
  redirect(`/payroll?month=${month}&message=${enc('實際出勤已新增。')}#coach-attendance`);
}

export async function updateCoachAttendanceBulk(formData:FormData){
  const {supabase,teamId}=await ctx();
  const month=String(formData.get('month')??'').slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(month))redirect('/payroll?error='+enc('月份格式錯誤。'));
  const ids=formData.getAll('work_id').map(String).filter(Boolean);
  for(const id of ids){
    const remove=String(formData.get(`delete_${id}`)??'')==='1';
    if(remove){const {error}=await supabase.from('coach_attendance_segments').delete().eq('id',id).eq('team_id',teamId);if(error)redirect(`/payroll?month=${month}&error=${enc(error.message)}`);continue;}
    const workDate=String(formData.get(`work_date_${id}`)??'');
    const start=String(formData.get(`start_time_${id}`)??'');
    const end=String(formData.get(`end_time_${id}`)??'');
    const note=String(formData.get(`note_${id}`)??'').trim()||null;
    if(!workDate||!start||!end||end<=start)redirect(`/payroll?month=${month}&error=${enc(`請檢查 ${workDate||'某日'} 的教練出勤時間。`)}`);
    const {error}=await supabase.from('coach_attendance_segments').update({work_date:workDate,start_time:start,end_time:end,note}).eq('id',id).eq('team_id',teamId);
    if(error)redirect(`/payroll?month=${month}&error=${enc(error.message)}`);
  }
  redirect(`/payroll?month=${month}&message=${enc('本月教練實際出勤已一次儲存。')}#coach-attendance`);
}
