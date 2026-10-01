'use server';

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
const enc=(s:string)=>encodeURIComponent(s);
const weekdayFor=(date:string)=>((new Date(`${date}T12:00:00`).getDay()+6)%7)+1;
const monthBounds=(month:string)=>{const y=Number(month.slice(0,4)),m=Number(month.slice(5,7));const start=`${month}-01`;const d=new Date(y,m,1);const next=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;return {start,next,y,m};};

type TemplatePayloadResult =
  | { error: string }
  | { data: { weekday:number; mode:string; grade:number|null; student_id:string|null; start_time:string; end_time:string; default_count:number|null; note:string|null } };

function templatePayload(formData:FormData):TemplatePayloadResult{
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
  if(!weekday||weekday<1||weekday>7||!start||!end||end<=start) return {error:'請確認星期與出席時間。'};
  if(mode==='grade'&&(!grade||defaultCount===null||!Number.isFinite(defaultCount))) return {error:'年級模式請填年級與預設人數。'};
  if(mode==='individual'&&!studentId) return {error:'個人模式請選學生。'};
  return {data:{weekday,mode,grade:mode==='grade'?grade:null,student_id:mode==='individual'?studentId:null,start_time:start,end_time:end,default_count:mode==='grade'?defaultCount:null,note}};
}

export async function addAttendanceTemplate(formData:FormData){
  const {supabase,userId,teamId}=await ctx(); const parsed=templatePayload(formData);
  if('error' in parsed) redirect('/attendance-settings?error='+enc(parsed.error));
  const {error}=await supabase.from('attendance_templates').insert({team_id:teamId,...parsed.data,created_by:userId});
  if(error) redirect('/attendance-settings?error='+enc(error.message));
  redirect('/attendance-settings?message='+enc('固定出席模板已新增。'));
}

export async function updateAttendanceTemplate(formData:FormData){
  const {supabase,teamId}=await ctx(); const id=String(formData.get('id')??''); const parsed=templatePayload(formData);
  if(!id)redirect('/attendance-settings?error='+enc('缺少模板編號。'));
  if('error' in parsed) redirect('/attendance-settings?error='+enc(parsed.error));
  const {error}=await supabase.from('attendance_templates').update({...parsed.data,updated_at:new Date().toISOString()}).eq('id',id).eq('team_id',teamId);
  if(error)redirect('/attendance-settings?error='+enc(error.message));
  redirect('/attendance-settings?message='+enc('固定模板已更新。'));
}

export async function duplicateAttendanceTemplate(formData:FormData){
  const {supabase,userId,teamId}=await ctx(); const id=String(formData.get('id')??'');
  const {data:t,error}=await supabase.from('attendance_templates').select('weekday,mode,grade,student_id,start_time,end_time,default_count,note').eq('id',id).eq('team_id',teamId).single();
  if(error||!t)redirect('/attendance-settings?error='+enc(error?.message||'找不到模板。'));
  const {error:insertError}=await supabase.from('attendance_templates').insert({...t,team_id:teamId,created_by:userId,note:t.note?`${t.note}（複製）`:'複製'});
  if(insertError)redirect('/attendance-settings?error='+enc(insertError.message));
  redirect('/attendance-settings?message='+enc('已複製一筆模板，可直接在表格中修改。'));
}

export async function deleteAttendanceTemplate(formData:FormData){
  const {supabase,teamId}=await ctx(); const id=String(formData.get('id')??'');
  await supabase.from('attendance_templates').delete().eq('id',id).eq('team_id',teamId);
  redirect('/attendance-settings?message='+enc('固定模板已刪除。'));
}

export async function addDailyAttendanceSegment(formData:FormData){
  const {supabase,userId,teamId}=await ctx();
  const mode=String(formData.get('mode')??'grade'); const date=String(formData.get('attendance_date')??''); const gradeRaw=String(formData.get('grade')??''); const studentId=String(formData.get('student_id')??'')||null; const start=String(formData.get('start_time')??''); const end=String(formData.get('end_time')??''); const countRaw=String(formData.get('attendee_count')??''); const note=String(formData.get('note')??'').trim()||null;
  const grade=gradeRaw?Number(gradeRaw):null; const attendeeCount=countRaw===''?null:Number(countRaw);
  if(!date||!start||!end||end<=start) redirect(`/attendance-settings?date=${date}&error=${enc('請確認日期與出席時間。')}`);
  if(mode==='grade'&&(!grade||attendeeCount===null||!Number.isFinite(attendeeCount))) redirect(`/attendance-settings?date=${date}&error=${enc('年級模式請填年級與實際人數。')}`);
  if(mode==='individual'&&!studentId) redirect(`/attendance-settings?date=${date}&error=${enc('個人模式請選學生。')}`);
  const {error}=await supabase.from('daily_attendance_segments').insert({team_id:teamId,attendance_date:date,mode,grade:mode==='grade'?grade:null,student_id:mode==='individual'?studentId:null,start_time:start,end_time:end,attendee_count:mode==='grade'?attendeeCount:null,source:'manual',note,created_by:userId});
  if(error) redirect(`/attendance-settings?date=${date}&error=${enc(error.message)}`);
  redirect(`/attendance-settings?date=${date}&message=${enc('當日出席時段已新增。')}`);
}

export async function applyTemplateToDate(formData:FormData){
  const {supabase,userId,teamId}=await ctx(); const date=String(formData.get('attendance_date')??'');
  if(!date) redirect('/attendance-settings?error='+enc('請先選日期。'));
  const weekday=weekdayFor(date);
  const {data:templates,error:tError}=await supabase.from('attendance_templates').select('mode,grade,student_id,start_time,end_time,default_count,note').eq('team_id',teamId).eq('weekday',weekday).eq('active',true);
  if(tError) redirect(`/attendance-settings?date=${date}&error=${enc(tError.message)}`);
  const {error:delError}=await supabase.from('daily_attendance_segments').delete().eq('team_id',teamId).eq('attendance_date',date).eq('source','template');
  if(delError)redirect(`/attendance-settings?date=${date}&error=${enc(delError.message)}`);
  if(templates?.length){const rows=templates.map(t=>({team_id:teamId,attendance_date:date,mode:t.mode,grade:t.grade,student_id:t.student_id,start_time:t.start_time,end_time:t.end_time,attendee_count:t.mode==='grade'?t.default_count:null,source:'template',note:t.note,created_by:userId}));const {error}=await supabase.from('daily_attendance_segments').insert(rows);if(error)redirect(`/attendance-settings?date=${date}&error=${enc(error.message)}`);}
  redirect(`/attendance-settings?date=${date}&message=${enc(`已套用 ${date} 固定模板。`)}`);
}

export async function applyTemplatesToMonth(formData:FormData){
  const {supabase,userId,teamId}=await ctx(); const month=String(formData.get('month')??'').slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(month))redirect('/attendance-settings?error='+enc('請選擇月份。'));
  const {start,next,y,m}=monthBounds(month);
  const {data:templates,error:tError}=await supabase.from('attendance_templates').select('weekday,mode,grade,student_id,start_time,end_time,default_count,note').eq('team_id',teamId).eq('active',true);
  if(tError)redirect(`/attendance-settings?month=${month}&error=${enc(tError.message)}`);
  const rows:any[]=[]; const lastDay=new Date(y,m,0).getDate();
  for(let day=1;day<=lastDay;day++){const date=`${month}-${String(day).padStart(2,'0')}`;const weekday=weekdayFor(date);for(const t of templates??[]){if(Number(t.weekday)!==weekday)continue;rows.push({team_id:teamId,attendance_date:date,mode:t.mode,grade:t.grade,student_id:t.student_id,start_time:t.start_time,end_time:t.end_time,attendee_count:t.mode==='grade'?t.default_count:null,source:'template',note:t.note,created_by:userId});}}
  const {error:delError}=await supabase.from('daily_attendance_segments').delete().eq('team_id',teamId).gte('attendance_date',start).lt('attendance_date',next).eq('source','template');
  if(delError)redirect(`/attendance-settings?month=${month}&error=${enc(delError.message)}`);
  if(rows.length){const {error}=await supabase.from('daily_attendance_segments').insert(rows);if(error)redirect(`/attendance-settings?month=${month}&error=${enc(error.message)}`);}
  redirect(`/attendance-settings?month=${month}&date=${month}-01&message=${enc(`已一次套用 ${month} 全月固定模板，共 ${rows.length} 筆時段。`)}`);
}

export async function deleteDailyAttendanceSegment(formData:FormData){
  const {supabase,teamId}=await ctx(); const id=String(formData.get('id')??''); const date=String(formData.get('attendance_date')??'');
  await supabase.from('daily_attendance_segments').delete().eq('id',id).eq('team_id',teamId);
  redirect(`/attendance-settings${date?`?date=${date}`:''}`);
}
