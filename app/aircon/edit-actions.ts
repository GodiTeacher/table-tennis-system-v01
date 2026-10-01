'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const enc=(s:string)=>encodeURIComponent(s);

async function context(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)redirect('/more');
  return {supabase,teamId};
}

export async function updateAirconRun(formData:FormData){
  const {supabase,teamId}=await context();
  const id=String(formData.get('id')??''),date=String(formData.get('usage_date')??''),start=String(formData.get('start_time')??''),end=String(formData.get('end_time')??''),note=String(formData.get('note')??'').trim()||null; const month=date.slice(0,7);
  if(!id||!date||!start||!end||end<=start)redirect(`/aircon?month=${month}&error=${enc('請確認冷氣日期與時間。')}`);
  const {error}=await supabase.from('aircon_runs').update({usage_date:date,start_time:start,end_time:end,note,source:'manual',source_grade:null}).eq('id',id).eq('team_id',teamId);
  if(error)redirect(`/aircon?month=${month}&error=${enc(error.message)}`);
  redirect(`/aircon?month=${month}&message=${enc('冷氣時段已更新。')}`);
}

export async function updateAirconRunsBulk(formData:FormData){
  const {supabase,teamId}=await context();
  const month=String(formData.get('month')??'').slice(0,7);
  const ids=formData.getAll('run_id').map(String).filter(Boolean);
  for(const id of ids){
    const date=String(formData.get(`usage_date_${id}`)??'');
    const start=String(formData.get(`start_time_${id}`)??'');
    const end=String(formData.get(`end_time_${id}`)??'');
    const note=String(formData.get(`note_${id}`)??'').trim()||null;
    if(!date||!start||!end||end<=start)redirect(`/aircon?month=${month}&error=${enc(`請確認 ${date||'某一天'} 的冷氣時間。`)}`);
    const {error}=await supabase.from('aircon_runs').update({usage_date:date,start_time:start,end_time:end,note,source:'manual',source_grade:null}).eq('id',id).eq('team_id',teamId);
    if(error)redirect(`/aircon?month=${month}&error=${enc(error.message)}`);
  }
  redirect(`/aircon?month=${month}&message=${enc(`已一次儲存 ${ids.length} 筆冷氣時段。`)}`);
}
