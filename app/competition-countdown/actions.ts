'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function addCompetitionHoliday(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId) redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId) return;
  const holidayDate=String(formData.get('holiday_date')??'').trim();
  const name=String(formData.get('name')??'休假日').trim()||'休假日';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(holidayDate)) return;
  await supabase.from('competition_holidays').upsert({team_id:teamId,holiday_date:holidayDate,name,created_by:userId},{onConflict:'team_id,holiday_date'});
  revalidatePath('/competition-countdown');
}

export async function deleteCompetitionHoliday(formData:FormData){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub) redirect('/login');
  const id=String(formData.get('holiday_id')??'');
  if(!id) return;
  await supabase.from('competition_holidays').delete().eq('id',id);
  revalidatePath('/competition-countdown');
}
