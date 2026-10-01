'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const enc=(s:string)=>encodeURIComponent(s);
export async function updateDailyAttendanceSegment(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)redirect('/more');
  const id=String(formData.get('id')??''),date=String(formData.get('attendance_date')??''),start=String(formData.get('start_time')??''),end=String(formData.get('end_time')??''),count=Number(formData.get('attendee_count')??NaN),note=String(formData.get('note')??'').trim()||null;
  if(!id||!date||!start||!end||end<=start||!Number.isFinite(count)||count<0)redirect(`/attendance-settings?date=${date}&error=${enc('請確認出勤時段與人數。')}`);
  const {error}=await supabase.from('daily_attendance_segments').update({mode:'count',grade:null,student_id:null,start_time:start,end_time:end,attendee_count:count,note,source:'manual'}).eq('id',id).eq('team_id',teamId);
  if(error)redirect(`/attendance-settings?date=${date}&error=${enc(error.message)}`);
  redirect(`/attendance-settings?date=${date}&message=${enc('當日出勤已更新。')}`);
}
