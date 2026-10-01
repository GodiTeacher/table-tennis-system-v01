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
const enc=(s:string|undefined|null)=>encodeURIComponent(s??'');
const weekdayFor=(date:string)=>((new Date(`${date}T12:00:00`).getDay()+6)%7)+1;
const monthBounds=(month:string)=>{const y=Number(month.slice(0,4)),m=Number(month.slice(5,7));const start=`${month}-01`;const d=new Date(y,m,1);const next=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;return {start,next,y,m};};
type CountTemplate={id:string;weekday:number;start_time:string;end_time:string;default_count:number|null;note:string|null};
type DateOverride={attendance_date:string;action:'remove'|'include';template_weekday:number|null;note:string|null};

function countTemplatePayload(formData:FormData){
  const weekday=Number(formData.get('weekday')??0);
  const start=String(formData.get('start_time')??'');
  const end=String(formData.get('end_time')??'');
  const count=Number(formData.get('default_count')??NaN);
  const note=String(formData.get('note')??'').trim()||null;
  if(weekday<1||weekday>5||!start||!end||end<=start||!Number.isFinite(count)||count<0)return {error:'請確認星期一至星期五、時段與出勤人數。'} as const;
  return {data:{weekday,mode:'count',grade:null,student_id:null,start_time:start,end_time:end,default_count:count,note}} as const;
}

function rowsForDate(teamId:string,userId:string,date:string,sourceWeekday:number,templates:CountTemplate[]){
  return templates.filter(t=>Number(t.weekday)===sourceWeekday).map(t=>({
    team_id:teamId,attendance_date:date,mode:'count',grade:null,student_id:null,
    start_time:t.start_time,end_time:t.end_time,attendee_count:Number(t.default_count??0),
    source:'template',note:t.note,created_by:userId
  }));
}

export async function addAttendanceTemplate(formData:FormData){
  const {supabase,userId,teamId}=await ctx();const parsed=countTemplatePayload(formData);
  if('error' in parsed)redirect('/attendance-settings?error='+enc(parsed.error));
  const {error}=await supabase.from('attendance_templates').insert({team_id:teamId,...parsed.data,created_by:userId});
  if(error)redirect('/attendance-settings?error='+enc(error.message));
  redirect('/attendance-settings?message='+enc('固定出勤時段已新增。'));
}

export async function updateAttendanceTemplate(formData:FormData){
  const {supabase,teamId}=await ctx();const id=String(formData.get('id')??'');const parsed=countTemplatePayload(formData);
  if(!id)redirect('/attendance-settings?error='+enc('缺少模板編號。'));
  if('error' in parsed)redirect('/attendance-settings?error='+enc(parsed.error));
  const {error}=await supabase.from('attendance_templates').update({...parsed.data,updated_at:new Date().toISOString()}).eq('id',id).eq('team_id',teamId).eq('mode','count');
  if(error)redirect('/attendance-settings?error='+enc(error.message));
  redirect('/attendance-settings?message='+enc('固定出勤時段已更新。'));
}

export async function duplicateAttendanceTemplate(formData:FormData){
  const {supabase,userId,teamId}=await ctx();const id=String(formData.get('id')??'');
  const {data:t,error}=await supabase.from('attendance_templates').select('weekday,start_time,end_time,default_count,note').eq('id',id).eq('team_id',teamId).eq('mode','count').single();
  if(error||!t)redirect('/attendance-settings?error='+enc(error?.message||'找不到模板。'));
  const {error:insertError}=await supabase.from('attendance_templates').insert({team_id:teamId,weekday:t.weekday,mode:'count',grade:null,student_id:null,start_time:t.start_time,end_time:t.end_time,default_count:t.default_count,note:t.note?`${t.note}（複製）`:'複製',created_by:userId});
  if(insertError)redirect('/attendance-settings?error='+enc(insertError.message));
  redirect('/attendance-settings?message='+enc('已複製時段。'));
}

export async function deleteAttendanceTemplate(formData:FormData){
  const {supabase,teamId}=await ctx();const id=String(formData.get('id')??'');
  await supabase.from('attendance_templates').delete().eq('id',id).eq('team_id',teamId).eq('mode','count');
  redirect('/attendance-settings?message='+enc('固定出勤時段已刪除。'));
}

export async function saveAttendanceDateOverride(formData:FormData){
  const {supabase,userId,teamId}=await ctx();
  const date=String(formData.get('attendance_date')??'');const action=String(formData.get('action')??'remove');const weekdayRaw=String(formData.get('template_weekday')??'');const note=String(formData.get('note')??'').trim()||null;
  const templateWeekday=action==='include'?Number(weekdayRaw):null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['remove','include'].includes(action)||(action==='include'&&(!templateWeekday||templateWeekday<1||templateWeekday>5)))redirect('/attendance-settings?error='+enc('請確認例外日期與處理方式。'));
  const {error}=await supabase.from('attendance_date_overrides').upsert({team_id:teamId,attendance_date:date,action,template_weekday:templateWeekday,note,created_by:userId,updated_at:new Date().toISOString()},{onConflict:'team_id,attendance_date'});
  if(error)redirect('/attendance-settings?error='+enc(error.message));
  redirect(`/attendance-settings?month=${date.slice(0,7)}&date=${date}&message=${enc('例外日期已儲存。')}`);
}

export async function deleteAttendanceDateOverride(formData:FormData){
  const {supabase,teamId}=await ctx();const id=String(formData.get('id')??'');const month=String(formData.get('month')??'');
  await supabase.from('attendance_date_overrides').delete().eq('id',id).eq('team_id',teamId);
  redirect(`/attendance-settings${month?`?month=${month}`:''}`);
}

export async function addDailyAttendanceSegment(formData:FormData){
  const {supabase,userId,teamId}=await ctx();const date=String(formData.get('attendance_date')??'');const start=String(formData.get('start_time')??'');const end=String(formData.get('end_time')??'');const count=Number(formData.get('attendee_count')??NaN);const note=String(formData.get('note')??'').trim()||null;
  if(!date||!start||!end||end<=start||!Number.isFinite(count)||count<0)redirect(`/attendance-settings?date=${date}&error=${enc('請確認日期、時段與實際人數。')}`);
  const {error}=await supabase.from('daily_attendance_segments').insert({team_id:teamId,attendance_date:date,mode:'count',grade:null,student_id:null,start_time:start,end_time:end,attendee_count:count,source:'manual',note,created_by:userId});
  if(error)redirect(`/attendance-settings?date=${date}&error=${enc(error.message)}`);
  redirect(`/attendance-settings?date=${date}&message=${enc('當日出勤時段已新增。')}`);
}

export async function applyTemplateToDate(formData:FormData){
  const {supabase,userId,teamId}=await ctx();const date=String(formData.get('attendance_date')??'');
  if(!date)redirect('/attendance-settings?error='+enc('請先選日期。'));
  const [{data:templates,error:tError},{data:override,error:oError}]=await Promise.all([
    supabase.from('attendance_templates').select('id,weekday,start_time,end_time,default_count,note').eq('team_id',teamId).eq('mode','count').eq('active',true),
    supabase.from('attendance_date_overrides').select('attendance_date,action,template_weekday,note').eq('team_id',teamId).eq('attendance_date',date).maybeSingle(),
  ]);
  if(tError||oError)redirect(`/attendance-settings?date=${date}&error=${enc(tError?.message||oError?.message||'讀取資料失敗')}`);
  await supabase.from('daily_attendance_segments').delete().eq('team_id',teamId).eq('attendance_date',date).eq('source','template');
  const ov=override as DateOverride|null;const actual=weekdayFor(date);let sourceWeekday:number|null=actual<=5?actual:null;
  if(ov?.action==='remove')sourceWeekday=null;else if(ov?.action==='include')sourceWeekday=Number(ov.template_weekday);
  const rows=sourceWeekday?rowsForDate(teamId,userId,date,sourceWeekday,(templates??[]) as CountTemplate[]):[];
  if(rows.length){const {error}=await supabase.from('daily_attendance_segments').insert(rows);if(error)redirect(`/attendance-settings?date=${date}&error=${enc(error.message)}`);}
  redirect(`/attendance-settings?date=${date}&message=${enc(sourceWeekday?`已套用 ${date} 的出勤時段。`:`${date} 已設定為無出勤。`)}`);
}

export async function applyTemplatesToMonth(formData:FormData){
  const {supabase,userId,teamId}=await ctx();const month=String(formData.get('month')??'').slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(month))redirect('/attendance-settings?error='+enc('請選擇月份。'));
  const {start,next,y,m}=monthBounds(month);
  const [{data:templates,error:tError},{data:overrides,error:oError}]=await Promise.all([
    supabase.from('attendance_templates').select('id,weekday,start_time,end_time,default_count,note').eq('team_id',teamId).eq('mode','count').eq('active',true),
    supabase.from('attendance_date_overrides').select('attendance_date,action,template_weekday,note').eq('team_id',teamId).gte('attendance_date',start).lt('attendance_date',next),
  ]);
  if(tError||oError)redirect(`/attendance-settings?month=${month}&error=${enc(tError?.message||oError?.message||'讀取模板失敗')}`);
  const overrideMap=new Map<string,DateOverride>((overrides??[]).map((o:any)=>[o.attendance_date,o as DateOverride]));
  const rows:any[]=[];const lastDay=new Date(y,m,0).getDate();
  for(let day=1;day<=lastDay;day++){
    const date=`${month}-${String(day).padStart(2,'0')}`;const actual=weekdayFor(date);const ov=overrideMap.get(date);let sourceWeekday:number|null=actual<=5?actual:null;
    if(ov?.action==='remove')sourceWeekday=null;else if(ov?.action==='include')sourceWeekday=Number(ov.template_weekday);
    if(sourceWeekday)rows.push(...rowsForDate(teamId,userId,date,sourceWeekday,(templates??[]) as CountTemplate[]));
  }
  const {error:delError}=await supabase.from('daily_attendance_segments').delete().eq('team_id',teamId).gte('attendance_date',start).lt('attendance_date',next).eq('source','template');
  if(delError)redirect(`/attendance-settings?month=${month}&error=${enc(delError.message)}`);
  if(rows.length){const {error}=await supabase.from('daily_attendance_segments').insert(rows);if(error)redirect(`/attendance-settings?month=${month}&error=${enc(error.message)}`);}
  redirect(`/attendance-settings?month=${month}&date=${month}-01&message=${enc(`已套用 ${month} 全月，共 ${rows.length} 筆時段；六日預設無出勤，例外日已自動處理。`)}`);
}

export async function deleteDailyAttendanceSegment(formData:FormData){
  const {supabase,teamId}=await ctx();const id=String(formData.get('id')??'');const date=String(formData.get('attendance_date')??'');
  await supabase.from('daily_attendance_segments').delete().eq('id',id).eq('team_id',teamId);
  redirect(`/attendance-settings${date?`?date=${date}`:''}`);
}
