'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function ctx(){const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login');const {data:teamId}=await supabase.rpc('current_team_id');if(!teamId)redirect('/more');return {supabase,userId,teamId};}
const enc=(s:string)=>encodeURIComponent(s);
const weekdayFor=(date:string)=>((new Date(`${date}T12:00:00`).getDay()+6)%7)+1;
const bounds=(month:string)=>{const y=Number(month.slice(0,4)),m=Number(month.slice(5,7));const d=new Date(y,m,1);return {start:`${month}-01`,next:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`,y,m};};
async function staffInfo(supabase:any,teamId:string,staffId:string){const {data,error}=await supabase.from('staff_members').select('id,linked_user_id,display_name').eq('id',staffId).eq('team_id',teamId).eq('active',true).single();return error||!data?null:data as {id:string;linked_user_id:string|null;display_name:string};}

export async function addStaffMember(formData:FormData){const {supabase,userId,teamId}=await ctx();const name=String(formData.get('display_name')??'').trim();const role=String(formData.get('role_type')??'coach');const phone=String(formData.get('phone')??'').trim()||null;const note=String(formData.get('note')??'').trim()||null;if(!name||!['coach','assistant','admin','other'].includes(role))redirect('/payroll?error='+enc('請填寫人員姓名與類型。'));const {error}=await supabase.from('staff_members').insert({team_id:teamId,display_name:name,role_type:role,phone,note,active:true,created_by:userId});if(error)redirect('/payroll?error='+enc(error.message));redirect('/payroll?message='+enc('教練／工作人員已新增。'));}
export async function updateStaffMember(formData:FormData){const {supabase,teamId}=await ctx();const id=String(formData.get('id')??''),name=String(formData.get('display_name')??'').trim(),role=String(formData.get('role_type')??'coach'),phone=String(formData.get('phone')??'').trim()||null,note=String(formData.get('note')??'').trim()||null;if(!id||!name)redirect('/payroll?error='+enc('請確認人員資料。'));const {error}=await supabase.from('staff_members').update({display_name:name,role_type:role,phone,note,updated_at:new Date().toISOString()}).eq('id',id).eq('team_id',teamId);if(error)redirect('/payroll?error='+enc(error.message));redirect('/payroll?message='+enc('人員資料已更新。'));}
export async function archiveStaffMember(formData:FormData){const {supabase,teamId}=await ctx();const id=String(formData.get('id')??'');const {error}=await supabase.from('staff_members').update({active:false,updated_at:new Date().toISOString()}).eq('id',id).eq('team_id',teamId);if(error)redirect('/payroll?error='+enc(error.message));redirect('/payroll?message='+enc('人員已停用。'));}

export async function saveCoachPayRule(formData:FormData){
  const {supabase,teamId}=await ctx();
  const staffId=String(formData.get('staff_id')??'');
  const month=String(formData.get('month')??'').slice(0,7);
  const monthly=Number(formData.get('monthly_salary')??0);
  const multiplier=Number(formData.get('weight_multiplier')??0);
  const note=String(formData.get('note')??'').trim()||null;
  if(!staffId||![monthly,multiplier].every(Number.isFinite)||monthly<0||multiplier<0)redirect(`/payroll${month?`?month=${month}&`:'?'}error=${enc('請確認固定月薪與加權比例。')}`);
  const staff=await staffInfo(supabase,teamId,staffId);if(!staff)redirect(`/payroll${month?`?month=${month}&`:'?'}error=${enc('找不到這位人員。')}`);
  const method=multiplier>0?'weighted_students':'fixed_monthly';
  const payload={team_id:teamId,staff_id:staff.id,coach_user_id:staff.linked_user_id,method,monthly_salary:monthly,weight_multiplier:multiplier,hourly_rate:0,base_hourly_rate:0,per_student_hour:0,tier_rules:[],note,updated_at:new Date().toISOString()};
  const {data:existing}=await supabase.from('coach_pay_rules').select('id').eq('team_id',teamId).eq('staff_id',staffId).maybeSingle();
  const result=existing?.id?await supabase.from('coach_pay_rules').update(payload).eq('id',existing.id):await supabase.from('coach_pay_rules').insert(payload);
  if(result.error)redirect(`/payroll${month?`?month=${month}&`:'?'}error=${enc(result.error.message)}`);
  redirect(`/payroll${month?`?month=${month}&`:'?'}message=${enc('計薪規則已儲存。')}#coach-rules`);
}

export async function addCoachScheduleTemplate(formData:FormData){const {supabase,teamId}=await ctx();const staffId=String(formData.get('staff_id')??''),weekday=Number(formData.get('weekday')??0),start=String(formData.get('start_time')??''),end=String(formData.get('end_time')??''),note=String(formData.get('note')??'').trim()||null;if(!staffId||weekday<1||weekday>7||!start||!end||end<=start)redirect('/payroll?error='+enc('請確認固定班表資料。'));const staff=await staffInfo(supabase,teamId,staffId);if(!staff)redirect('/payroll?error='+enc('找不到這位人員。'));const {error}=await supabase.from('coach_schedule_templates').insert({team_id:teamId,staff_id:staff.id,coach_user_id:staff.linked_user_id,weekday,start_time:start,end_time:end,scope_type:'team',grade:null,training_group_id:null,note});if(error)redirect('/payroll?error='+enc(error.message));redirect('/payroll?message='+enc('固定班表已新增。'));}
export async function addCoachScheduleFromAttendanceTemplate(formData:FormData){const {supabase,teamId}=await ctx();const staffId=String(formData.get('staff_id')??''),templateId=String(formData.get('attendance_template_id')??'');if(!staffId||!templateId)redirect('/payroll?error='+enc('請選人員與學生出勤模板。'));const staff=await staffInfo(supabase,teamId,staffId);if(!staff)redirect('/payroll?error='+enc('找不到這位人員。'));const {data:t,error}=await supabase.from('attendance_templates').select('weekday,start_time,end_time,note').eq('id',templateId).eq('team_id',teamId).eq('mode','count').single();if(error||!t)redirect('/payroll?error='+enc(error?.message||'找不到學生出勤模板。'));const {error:ins}=await supabase.from('coach_schedule_templates').insert({team_id:teamId,staff_id:staff.id,coach_user_id:staff.linked_user_id,weekday:t.weekday,start_time:t.start_time,end_time:t.end_time,scope_type:'team',grade:null,training_group_id:null,note:`由學生出勤模板帶入${t.note?`｜${t.note}`:''}`});if(ins)redirect('/payroll?error='+enc(ins.message));redirect('/payroll?message='+enc('已由學生出勤模板建立教練班表。'));}
export async function deleteCoachScheduleTemplate(formData:FormData){const {supabase,teamId}=await ctx();await supabase.from('coach_schedule_templates').delete().eq('id',String(formData.get('id')??'')).eq('team_id',teamId);redirect('/payroll');}

export async function addCoachAttendance(formData:FormData){const {supabase,teamId}=await ctx();const staffId=String(formData.get('staff_id')??''),date=String(formData.get('work_date')??''),start=String(formData.get('start_time')??''),end=String(formData.get('end_time')??''),note=String(formData.get('note')??'').trim()||null;if(!staffId||!date||!start||!end||end<=start)redirect('/payroll?error='+enc('請確認實際出勤。'));const staff=await staffInfo(supabase,teamId,staffId);if(!staff)redirect('/payroll?error='+enc('找不到這位人員。'));const {error}=await supabase.from('coach_attendance_segments').insert({team_id:teamId,staff_id:staff.id,coach_user_id:staff.linked_user_id,work_date:date,start_time:start,end_time:end,student_count:null,scope_type:'team',grade:null,training_group_id:null,source:'manual',note});if(error)redirect('/payroll?error='+enc(error.message));redirect(`/payroll?date=${date}&message=${enc('實際出勤已新增。')}`);}
export async function applyCoachTemplatesToDate(formData:FormData){const {supabase,teamId}=await ctx();const date=String(formData.get('work_date')??'');if(!date)redirect('/payroll?error='+enc('請先選日期。'));const weekday=weekdayFor(date);const {data:templates,error}=await supabase.from('coach_schedule_templates').select('staff_id,coach_user_id,start_time,end_time,note').eq('team_id',teamId).eq('weekday',weekday).eq('active',true);if(error)redirect(`/payroll?date=${date}&error=${enc(error.message)}`);await supabase.from('coach_attendance_segments').delete().eq('team_id',teamId).eq('work_date',date).eq('source','template');if(templates?.length){const {error:ins}=await supabase.from('coach_attendance_segments').insert(templates.map(t=>({team_id:teamId,staff_id:t.staff_id,coach_user_id:t.coach_user_id,work_date:date,start_time:t.start_time,end_time:t.end_time,student_count:null,scope_type:'team',grade:null,training_group_id:null,source:'template',note:t.note})));if(ins)redirect(`/payroll?date=${date}&error=${enc(ins.message)}`);}redirect(`/payroll?date=${date}&message=${enc('已套用當天固定班表。')}`);}
export async function applyCoachTemplatesToMonth(formData:FormData){const {supabase,teamId}=await ctx();const month=String(formData.get('month')??'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(month))redirect('/payroll?error='+enc('請選月份。'));const {start,next,y,m}=bounds(month);const {data:templates,error}=await supabase.from('coach_schedule_templates').select('staff_id,coach_user_id,weekday,start_time,end_time,note').eq('team_id',teamId).eq('active',true);if(error)redirect(`/payroll?month=${month}&error=${enc(error.message)}`);const rows:any[]=[];const lastDay=new Date(y,m,0).getDate();for(let d=1;d<=lastDay;d++){const date=`${month}-${String(d).padStart(2,'0')}`,wd=weekdayFor(date);for(const t of templates??[]){if(Number(t.weekday)!==wd)continue;rows.push({team_id:teamId,staff_id:t.staff_id,coach_user_id:t.coach_user_id,work_date:date,start_time:t.start_time,end_time:t.end_time,student_count:null,scope_type:'team',grade:null,training_group_id:null,source:'template',note:t.note});}}await supabase.from('coach_attendance_segments').delete().eq('team_id',teamId).gte('work_date',start).lt('work_date',next).eq('source','template');if(rows.length){const {error:ins}=await supabase.from('coach_attendance_segments').insert(rows);if(ins)redirect(`/payroll?month=${month}&error=${enc(ins.message)}`);}redirect(`/payroll?month=${month}&date=${month}-01&message=${enc(`已套用 ${month} 全月教練班表。`)}`);}
export async function deleteCoachAttendance(formData:FormData){const {supabase,teamId}=await ctx();const date=String(formData.get('work_date')??'');await supabase.from('coach_attendance_segments').delete().eq('id',String(formData.get('id')??'')).eq('team_id',teamId);redirect(`/payroll${date?`?date=${date}`:''}`);}

export async function addFinanceItem(formData:FormData){
  const {supabase,userId,teamId}=await ctx();
  const raw=String(formData.get('record_month')??'');
  const month=raw?`${raw.slice(0,7)}-01`:'';
  const monthParam=raw.slice(0,7);
  const type=String(formData.get('item_type')??'expense');
  const category=String(formData.get('category')??'').trim();
  const description=String(formData.get('description')??'').trim()||null;
  const amount=Number(formData.get('amount')??0);
  const financeUrl=(kind:'message'|'error',text:string)=>`/payroll?${monthParam?`month=${monthParam}&`:''}${kind}=${enc(text)}#finance`;
  if(!month||!category||!Number.isFinite(amount)||amount<0)redirect(financeUrl('error','請確認收支項目。'));
  const {error}=await supabase.from('finance_items').insert({team_id:teamId,record_month:month,item_type:type,category,description,amount,created_by:userId});
  if(error)redirect(financeUrl('error',error.message));
  redirect(financeUrl('message','收支項目已新增。'));
}
export async function deleteFinanceItem(formData:FormData){
  const {supabase,teamId}=await ctx();
  const month=String(formData.get('month')??'').slice(0,7);
  const id=String(formData.get('id')??'');
  const {error}=await supabase.from('finance_items').delete().eq('id',id).eq('team_id',teamId);
  if(error)redirect(`/payroll?${month?`month=${month}&`:''}error=${enc(error.message)}#finance`);
  redirect(`/payroll${month?`?month=${month}`:''}#finance`);
}
