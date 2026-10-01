'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
const enc=(s:string)=>encodeURIComponent(s);
export async function updateAirconRun(formData:FormData){
  const supabase=await createClient(); const {data:claims}=await supabase.auth.getClaims(); if(!claims?.claims?.sub)redirect('/login'); const {data:teamId}=await supabase.rpc('current_team_id'); if(!teamId)redirect('/more');
  const id=String(formData.get('id')??''),date=String(formData.get('usage_date')??''),start=String(formData.get('start_time')??''),end=String(formData.get('end_time')??''),note=String(formData.get('note')??'').trim()||null; const month=date.slice(0,7);
  if(!id||!date||!start||!end||end<=start)redirect(`/aircon?month=${month}&error=${enc('請確認冷氣日期與時間。')}`);
  const {error}=await supabase.from('aircon_runs').update({usage_date:date,start_time:start,end_time:end,note,source:'manual',source_grade:null}).eq('id',id).eq('team_id',teamId);
  if(error)redirect(`/aircon?month=${month}&error=${enc(error.message)}`);
  redirect(`/aircon?month=${month}&message=${enc('冷氣時段已更新。')}`);
}
