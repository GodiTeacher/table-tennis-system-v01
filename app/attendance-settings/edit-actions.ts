'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const enc=(s:string)=>encodeURIComponent(s);
export async function updateDailyAttendanceSegment(formData:FormData){
  const supabase=await createClient(); const {data:claims}=await supabase.auth.getClaims(); if(!claims?.claims?.sub)redirect('/login'); const {data:teamId}=await supabase.rpc('current_team_id'); if(!teamId)redirect('/more');
  const id=String(formData.get('id')??''),date=String(formData.get('attendance_date')??''),mode=String(formData.get('mode')??'grade'),gradeRaw=String(formData.get('grade')??''),studentId=String(formData.get('student_id')??'')||null,start=String(formData.get('start_time')??''),end=String(formData.get('end_time')??''),countRaw=String(formData.get('attendee_count')??''),note=String(formData.get('note')??'').trim()||null;
  const grade=gradeRaw?Number(gradeRaw):null,count=countRaw===''?null:Number(countRaw);
  if(!id||!date||!start||!end||end<=start)redirect(`/attendance-settings?date=${date}&error=${enc('請確認出席資料。')}`);
  if(mode==='grade'&&(!grade||count===null||!Number.isFinite(count)))redirect(`/attendance-settings?date=${date}&error=${enc('年級模式需填年級與人數。')}`);
  if(mode==='individual'&&!studentId)redirect(`/attendance-settings?date=${date}&error=${enc('個人模式需選學生。')}`);
  const {error}=await supabase.from('daily_attendance_segments').update({mode,grade:mode==='grade'?grade:null,student_id:mode==='individual'?studentId:null,start_time:start,end_time:end,attendee_count:mode==='grade'?count:null,note,source:'manual'}).eq('id',id).eq('team_id',teamId);
  if(error)redirect(`/attendance-settings?date=${date}&error=${enc(error.message)}`);
  redirect(`/attendance-settings?date=${date}&message=${enc('當日出勤已更新。')}`);
}
