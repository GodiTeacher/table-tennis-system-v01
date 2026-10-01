'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function context(){const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login');const {data:teamId,error}=await supabase.rpc('current_team_id');if(error||!teamId)redirect('/aircon?error='+encodeURIComponent('目前沒有可使用的隊伍工作區。'));return {supabase,userId,teamId};}
const enc=(s:string)=>encodeURIComponent(s);
const bounds=(month:string)=>{const y=Number(month.slice(0,4)),m=Number(month.slice(5,7));const d=new Date(y,m,1);return {start:`${month}-01`,next:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};};

export async function saveMeterRecord(formData:FormData){const {supabase,userId,teamId}=await context();const rawMonth=String(formData.get('record_month')??'').trim();const recordMonth=rawMonth?`${rawMonth.slice(0,7)}-01`:'';const opening=Number(formData.get('opening_reading')??0),closing=Number(formData.get('closing_reading')??0),rate=Number(formData.get('rate_per_unit')??0),fixed=Number(formData.get('fixed_fee')??0);const note=String(formData.get('note')??'').trim()||null;if(!recordMonth||![opening,closing,rate,fixed].every(Number.isFinite)||closing<opening||rate<0||fixed<0)redirect(`/aircon?month=${rawMonth.slice(0,7)}&error=${enc('請確認月份、電表度數與費率資料。')}`);const {error}=await supabase.from('aircon_meter_records').upsert({team_id:teamId,record_month:recordMonth,opening_reading:opening,closing_reading:closing,rate_per_unit:rate,fixed_fee:fixed,note,created_by:userId,updated_at:new Date().toISOString()},{onConflict:'team_id,record_month'});if(error)redirect(`/aircon?month=${rawMonth.slice(0,7)}&error=${enc(error.message)}`);redirect(`/aircon?month=${rawMonth.slice(0,7)}&message=${enc('該月份冷氣電表資料已儲存。')}`);}

export async function saveMonthAllocation(formData:FormData){const {supabase,teamId}=await context();const raw=String(formData.get('record_month')??'');const month=raw?`${raw.slice(0,7)}-01`:'';const mode=String(formData.get('allocation_mode')??'grade');if(!month||!['grade','individual'].includes(mode))redirect('/aircon?error='+enc('請確認月份與分攤方式。'));const {error}=await supabase.from('aircon_month_settings').upsert({team_id:teamId,record_month:month,allocation_mode:mode},{onConflict:'team_id,record_month'});if(error)redirect(`/aircon?month=${raw.slice(0,7)}&error=${enc(error.message)}`);redirect(`/aircon?month=${raw.slice(0,7)}&message=${enc('本月分攤方式已更新。')}`);}

export async function addAirconRun(formData:FormData){const {supabase,userId,teamId}=await context();const meterId=String(formData.get('meter_record_id')??'')||null,date=String(formData.get('usage_date')??''),start=String(formData.get('start_time')??''),end=String(formData.get('end_time')??''),note=String(formData.get('note')??'').trim()||null;if(!date||!start||!end||end<=start)redirect(`/aircon?month=${date.slice(0,7)}&error=${enc('請確認冷氣開啟日期與時間。')}`);const {error}=await supabase.from('aircon_runs').insert({team_id:teamId,meter_record_id:meterId,usage_date:date,start_time:start,end_time:end,note,source:'manual',created_by:userId});if(error)redirect(`/aircon?month=${date.slice(0,7)}&error=${enc(error.message)}`);redirect(`/aircon?month=${date.slice(0,7)}&message=${enc('冷氣實際開啟時段已新增。')}`);}

export async function importAirconRunsFromAttendance(formData:FormData){
  const {supabase,userId,teamId}=await context();const month=String(formData.get('month')??'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(month))redirect(`/aircon?month=${month}&error=${enc('請選擇月份。')}`);const {start,next}=bounds(month);
  const [{data:attendance,error:aError},{data:meter}]=await Promise.all([
    supabase.from('daily_attendance_segments').select('attendance_date,start_time,end_time').eq('team_id',teamId).eq('mode','count').gte('attendance_date',start).lt('attendance_date',next).order('attendance_date').order('start_time'),
    supabase.from('aircon_meter_records').select('id').eq('team_id',teamId).eq('record_month',start).maybeSingle(),
  ]);
  if(aError)redirect(`/aircon?month=${month}&error=${enc(aError.message)}`);
  await supabase.from('aircon_runs').delete().eq('team_id',teamId).gte('usage_date',start).lt('usage_date',next).in('source',['attendance_count','attendance_grade']);
  const byDate=new Map<string,{start:string;end:string}[]>();for(const a of attendance??[]){const list=byDate.get(a.attendance_date)??[];list.push({start:String(a.start_time).slice(0,5),end:String(a.end_time).slice(0,5)});byDate.set(a.attendance_date,list);}
  const rows:any[]=[];for(const [date,intervals] of byDate){intervals.sort((a,b)=>a.start.localeCompare(b.start));const merged:{start:string;end:string}[]=[];for(const it of intervals){const last=merged[merged.length-1];if(last&&it.start<=last.end){if(it.end>last.end)last.end=it.end;}else merged.push({...it});}for(const it of merged)rows.push({team_id:teamId,meter_record_id:meter?.id??null,usage_date:date,start_time:it.start,end_time:it.end,note:'由學生每日出勤時段帶入',source:'attendance_count',source_grade:null,created_by:userId});}
  if(rows.length){const {error}=await supabase.from('aircon_runs').insert(rows);if(error)redirect(`/aircon?month=${month}&error=${enc(error.message)}`);}
  redirect(`/aircon?month=${month}&message=${enc(`已從整月學生出勤帶入 ${rows.length} 段冷氣時間；相連時段已自動合併。`)}`);
}

export async function deleteAirconRun(formData:FormData){
  const {supabase,teamId}=await context();
  const id=String(formData.get('id')??'').trim();
  const month=String(formData.get('month')??'').slice(0,7);
  if(!id)redirect(`/aircon${month?`?month=${month}&error=${enc('缺少要刪除的冷氣時段編號。')}`:`?error=${enc('缺少要刪除的冷氣時段編號。')}`}`);
  const {error}=await supabase.from('aircon_runs').delete().eq('id',id).eq('team_id',teamId);
  if(error)redirect(`/aircon?month=${month}&error=${enc(error.message)}`);
  redirect(`/aircon?month=${month}&message=${enc('冷氣時段已刪除。')}`);
}

export async function deleteAllAirconRunsForMonth(formData:FormData){
  const {supabase,teamId}=await context();
  const month=String(formData.get('month')??'').slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(month))redirect(`/aircon?error=${enc('請先選擇要清除的月份。')}`);
  const {start,next}=bounds(month);
  const {error}=await supabase.from('aircon_runs').delete().eq('team_id',teamId).gte('usage_date',start).lt('usage_date',next);
  if(error)redirect(`/aircon?month=${month}&error=${enc(error.message)}`);
  redirect(`/aircon?month=${month}&message=${enc(`${month} 的冷氣時段已全部刪除。`)}`);
}

export async function deleteMeterRecord(formData:FormData){const {supabase,teamId}=await context();const id=String(formData.get('id')??''),month=String(formData.get('month')??'');const {error}=await supabase.from('aircon_meter_records').delete().eq('id',id).eq('team_id',teamId);if(error)redirect(`/aircon?month=${month}&error=${enc(error.message)}`);redirect(`/aircon?month=${month}&message=${enc('月份電表紀錄已刪除。')}`);}
