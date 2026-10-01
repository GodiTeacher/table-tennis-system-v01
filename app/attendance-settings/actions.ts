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
type TemplateRow={id:string;weekday:number;mode:string;grade:number|null;student_id:string|null;start_time:string;end_time:string;default_count:number|null;note:string|null};
type ExceptionRow={template_id:string;student_id:string;start_time:string;end_time:string;note:string|null};

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
  if(mode==='grade'&&(!grade||defaultCount===null||!Number.isFinite(defaultCount))) return {error:'年級模式請填年級與預設總人數。'};
  if(mode==='individual'&&!studentId) return {error:'個人模式請選學生。'};
  return {data:{weekday,mode,grade:mode==='grade'?grade:null,student_id:mode==='individual'?studentId:null,start_time:start,end_time:end,default_count:mode==='grade'?defaultCount:null,note}};
}

function buildRowsForDate(teamId:string,userId:string,date:string,templates:TemplateRow[],exceptions:ExceptionRow[]){
  const rows:any[]=[];
  for(const t of templates){
    if(Number(t.weekday)!==weekdayFor(date))continue;
    const ex=exceptions.filter(x=>x.template_id===t.id);
    if(t.mode==='grade'){
      const distinctStudents=new Set(ex.map(x=>x.student_id));
      const base=Math.max(0,Number(t.default_count??0)-distinctStudents.size);
      if(base>0) rows.push({team_id:teamId,attendance_date:date,mode:'grade',grade:t.grade,student_id:null,start_time:t.start_time,end_time:t.end_time,attendee_count:base,source:'template',note:t.note,created_by:userId});
      for(const x of ex) rows.push({team_id:teamId,attendance_date:date,mode:'individual',grade:null,student_id:x.student_id,start_time:x.start_time,end_time:x.end_time,attendee_count:null,source:'template',note:x.note?`固定例外｜${x.note}`:'固定例外',created_by:userId});
    }else{
      rows.push({team_id:teamId,attendance_date:date,mode:'individual',grade:null,student_id:t.student_id,start_time:t.start_time,end_time:t.end_time,attendee_count:null,source:'template',note:t.note,created_by:userId});
    }
  }
  return rows;
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

export async function addAttendanceException(formData:FormData){
  const {supabase,userId,teamId}=await ctx();
  const templateId=String(formData.get('template_id')??''); const studentId=String(formData.get('student_id')??''); const start=String(formData.get('start_time')??''); const end=String(formData.get('end_time')??''); const note=String(formData.get('note')??'').trim()||null;
  if(!templateId||!studentId||!start||!end||end<=start)redirect('/attendance-settings?error='+enc('請確認例外學生與時段。'));
  const {data:t}=await supabase.from('attendance_templates').select('mode,grade').eq('id',templateId).eq('team_id',teamId).single();
  if(!t||t.mode!=='grade')redirect('/attendance-settings?error='+enc('例外時段只能掛在年級模板下。'));
  const {data:s}=await supabase.from('students').select('grade').eq('id',studentId).eq('team_id',teamId).single();
  if(!s||Number(s.grade)!==Number(t.grade))redirect('/attendance-settings?error='+enc('例外學生必須屬於該年級。'));
  const {error}=await supabase.from('attendance_template_exceptions').upsert({team_id:teamId,template_id:templateId,student_id:studentId,start_time:start,end_time:end,note,active:true,created_by:userId,updated_at:new Date().toISOString()},{onConflict:'template_id,student_id'});
  if(error)redirect('/attendance-settings?error='+enc(error.message));
  redirect('/attendance-settings?message='+enc('固定例外時段已儲存；整月套用時會自動帶入。'));
}

export async function deleteAttendanceException(formData:FormData){
  const {supabase,teamId}=await ctx(); const id=String(formData.get('id')??'');
  await supabase.from('attendance_template_exceptions').delete().eq('id',id).eq('team_id',teamId);
  redirect('/attendance-settings?message='+enc('固定例外已刪除。'));
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
  const [{data:templates,error:tError},{data:exceptions,error:eError}]=await Promise.all([
    supabase.from('attendance_templates').select('id,weekday,mode,grade,student_id,start_time,end_time,default_count,note').eq('team_id',teamId).eq('weekday',weekday).eq('active',true),
    supabase.from('attendance_template_exceptions').select('template_id,student_id,start_time,end_time,note').eq('team_id',teamId).eq('active',true),
  ]);
  if(tError||eError) redirect(`/attendance-settings?date=${date}&error=${enc(tError?.message||eError?.message||'讀取模板失敗')}`);
  const {error:delError}=await supabase.from('daily_attendance_segments').delete().eq('team_id',teamId).eq('attendance_date',date).eq('source','template');
  if(delError)redirect(`/attendance-settings?date=${date}&error=${enc(delError.message)}`);
  const rows=buildRowsForDate(teamId,userId,date,(templates??[]) as TemplateRow[],(exceptions??[]) as ExceptionRow[]);
  if(rows.length){const {error}=await supabase.from('daily_attendance_segments').insert(rows);if(error)redirect(`/attendance-settings?date=${date}&error=${enc(error.message)}`);}
  redirect(`/attendance-settings?date=${date}&message=${enc(`已套用 ${date} 固定模板與例外時段。`)}`);
}

export async function applyTemplatesToMonth(formData:FormData){
  const {supabase,userId,teamId}=await ctx(); const month=String(formData.get('month')??'').slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(month))redirect('/attendance-settings?error='+enc('請選擇月份。'));
  const {start,next,y,m}=monthBounds(month);
  const [{data:templates,error:tError},{data:exceptions,error:eError}]=await Promise.all([
    supabase.from('attendance_templates').select('id,weekday,mode,grade,student_id,start_time,end_time,default_count,note').eq('team_id',teamId).eq('active',true),
    supabase.from('attendance_template_exceptions').select('template_id,student_id,start_time,end_time,note').eq('team_id',teamId).eq('active',true),
  ]);
  if(tError||eError)redirect(`/attendance-settings?month=${month}&error=${enc(tError?.message||eError?.message||'讀取模板失敗')}`);
  const rows:any[]=[]; const lastDay=new Date(y,m,0).getDate();
  for(let day=1;day<=lastDay;day++){const date=`${month}-${String(day).padStart(2,'0')}`;rows.push(...buildRowsForDate(teamId,userId,date,(templates??[]) as TemplateRow[],(exceptions??[]) as ExceptionRow[]));}
  const {error:delError}=await supabase.from('daily_attendance_segments').delete().eq('team_id',teamId).gte('attendance_date',start).lt('attendance_date',next).eq('source','template');
  if(delError)redirect(`/attendance-settings?month=${month}&error=${enc(delError.message)}`);
  if(rows.length){const {error}=await supabase.from('daily_attendance_segments').insert(rows);if(error)redirect(`/attendance-settings?month=${month}&error=${enc(error.message)}`);}
  redirect(`/attendance-settings?month=${month}&date=${month}-01&message=${enc(`已套用 ${month} 全月固定模板與例外，共 ${rows.length} 筆時段。`)}`);
}

export async function deleteDailyAttendanceSegment(formData:FormData){
  const {supabase,teamId}=await ctx(); const id=String(formData.get('id')??''); const date=String(formData.get('attendance_date')??'');
  await supabase.from('daily_attendance_segments').delete().eq('id',id).eq('team_id',teamId);
  redirect(`/attendance-settings${date?`?date=${date}`:''}`);
}
