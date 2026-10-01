'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function ctx(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId) redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId) redirect('/more');
  return {supabase,userId,teamId};
}

export async function addAttendanceTemplate(formData:FormData){
  const {supabase,userId,teamId}=await ctx();
  const mode=String(formData.get('mode')??'grade');
  const weekday=Number(formData.get('weekday')??0);
  const gradeRaw=String(formData.get('grade')??'');
  const studentId=String(formData.get('student_id')??'')||null;
  const start=String(formData.get('start_time')??'');
  const end=String(formData.get('end_time')??'');
  const countRaw=String(formData.get('default_count')??'');
  const note=String(formData.get('note')??'').trim()||null;
  const grade=gradeRaw?Number(gradeRaw):null;
  const defaultCount=countRaw===''?null:Number(countRaw);
  if(!weekday||weekday<1||weekday>7||!start||!end||end<=start) redirect('/attendance-settings?error='+encodeURIComponent('請確認星期與出席時間。'));
  if(mode==='grade'&&(!grade||defaultCount===null||!Number.isFinite(defaultCount))) redirect('/attendance-settings?error='+encodeURIComponent('年級模式請填年級與預設人數。'));
  if(mode==='individual'&&!studentId) redirect('/attendance-settings?error='+encodeURIComponent('個人模式請選學生。'));
  const {error}=await supabase.from('attendance_templates').insert({team_id:teamId,weekday,mode,grade:mode==='grade'?grade:null,student_id:mode==='individual'?studentId:null,start_time:start,end_time:end,default_count:mode==='grade'?defaultCount:null,note,created_by:userId});
  if(error) redirect('/attendance-settings?error='+encodeURIComponent(error.message));
  revalidatePath('/attendance-settings');
  redirect('/attendance-settings?message='+encodeURIComponent('固定出席模板已新增。'));
}

export async function deleteAttendanceTemplate(formData:FormData){
  const {supabase,teamId}=await ctx();
  const id=String(formData.get('id')??'');
  await supabase.from('attendance_templates').delete().eq('id',id).eq('team_id',teamId);
  revalidatePath('/attendance-settings');
}

export async function addDailyAttendanceSegment(formData:FormData){
  const {supabase,userId,teamId}=await ctx();
  const mode=String(formData.get('mode')??'grade');
  const date=String(formData.get('attendance_date')??'');
  const gradeRaw=String(formData.get('grade')??'');
  const studentId=String(formData.get('student_id')??'')||null;
  const start=String(formData.get('start_time')??'');
  const end=String(formData.get('end_time')??'');
  const countRaw=String(formData.get('attendee_count')??'');
  const note=String(formData.get('note')??'').trim()||null;
  const grade=gradeRaw?Number(gradeRaw):null;
  const attendeeCount=countRaw===''?null:Number(countRaw);
  if(!date||!start||!end||end<=start) redirect('/attendance-settings?error='+encodeURIComponent('請確認日期與出席時間。'));
  if(mode==='grade'&&(!grade||attendeeCount===null||!Number.isFinite(attendeeCount))) redirect('/attendance-settings?error='+encodeURIComponent('年級模式請填年級與實際人數。'));
  if(mode==='individual'&&!studentId) redirect('/attendance-settings?error='+encodeURIComponent('個人模式請選學生。'));
  const {error}=await supabase.from('daily_attendance_segments').insert({team_id:teamId,attendance_date:date,mode,grade:mode==='grade'?grade:null,student_id:mode==='individual'?studentId:null,start_time:start,end_time:end,attendee_count:mode==='grade'?attendeeCount:null,source:'manual',note,created_by:userId});
  if(error) redirect('/attendance-settings?error='+encodeURIComponent(error.message));
  revalidatePath('/attendance-settings');
  redirect('/attendance-settings?message='+encodeURIComponent('當日出席時段已新增。'));
}

export async function applyTemplateToDate(formData:FormData){
  const {supabase,userId,teamId}=await ctx();
  const date=String(formData.get('attendance_date')??'');
  if(!date) redirect('/attendance-settings?error='+encodeURIComponent('請先選日期。'));
  const weekday=((new Date(`${date}T12:00:00`).getDay()+6)%7)+1;
  const {data:templates,error:tError}=await supabase.from('attendance_templates').select('mode,grade,student_id,start_time,end_time,default_count,note').eq('team_id',teamId).eq('weekday',weekday).eq('active',true);
  if(tError) redirect('/attendance-settings?error='+encodeURIComponent(tError.message));
  await supabase.from('daily_attendance_segments').delete().eq('team_id',teamId).eq('attendance_date',date).eq('source','template');
  if(templates?.length){
    const rows=templates.map(t=>({team_id:teamId,attendance_date:date,mode:t.mode,grade:t.grade,student_id:t.student_id,start_time:t.start_time,end_time:t.end_time,attendee_count:t.mode==='grade'?t.default_count:null,source:'template',note:t.note,created_by:userId}));
    const {error}=await supabase.from('daily_attendance_segments').insert(rows);
    if(error) redirect('/attendance-settings?error='+encodeURIComponent(error.message));
  }
  revalidatePath('/attendance-settings');
  redirect(`/attendance-settings?date=${date}&message=${encodeURIComponent('已套用當天固定模板；接著只需修改例外。')}`);
}

export async function deleteDailyAttendanceSegment(formData:FormData){
  const {supabase,teamId}=await ctx();
  const id=String(formData.get('id')??'');
  await supabase.from('daily_attendance_segments').delete().eq('id',id).eq('team_id',teamId);
  revalidatePath('/attendance-settings');
}
