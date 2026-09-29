'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function getContext(){
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if(!userId) redirect('/login');
  const { data: teamId } = await supabase.rpc('current_team_id');
  if(!teamId) redirect('/more');
  return { supabase, teamId:String(teamId) };
}

function go(message:string):never{
  redirect('/training-groups?error='+encodeURIComponent(message));
}

export async function createTrainingGroup(formData:FormData){
  const name=String(formData.get('name')??'').trim();
  if(!name) go('請輸入組別名稱');
  const {supabase,teamId}=await getContext();
  const {count}=await supabase.from('training_groups').select('*',{count:'exact',head:true}).eq('team_id',teamId);
  const {error}=await supabase.from('training_groups').insert({team_id:teamId,name,sort_order:(count??0)+1});
  if(error) go(error.message);
  revalidatePath('/training-groups'); revalidatePath('/today');
  redirect('/training-groups?created=1');
}

export async function deleteTrainingGroup(formData:FormData){
  const id=String(formData.get('group_id')??'');
  if(!id) return;
  const {supabase,teamId}=await getContext();
  const {error}=await supabase.from('training_groups').delete().eq('id',id).eq('team_id',teamId);
  if(error) go(error.message);
  revalidatePath('/training-groups'); revalidatePath('/today');
  redirect('/training-groups?deleted=1');
}

export async function assignStudentGroup(formData:FormData){
  const studentId=String(formData.get('student_id')??'');
  const groupId=String(formData.get('group_id')??'');
  if(!studentId) return;
  const {supabase,teamId}=await getContext();
  if(groupId){
    const {data:group}=await supabase.from('training_groups').select('id').eq('id',groupId).eq('team_id',teamId).single();
    if(!group) go('組別不存在');
  }
  const {error}=await supabase.from('students').update({training_group_id:groupId||null}).eq('id',studentId).eq('team_id',teamId);
  if(error) go(error.message);
  revalidatePath('/training-groups'); revalidatePath('/today');
}

export async function saveGroupPreset(formData:FormData){
  const groupId=String(formData.get('group_id')??'');
  const skillIds=formData.getAll('skill_ids').map(String).filter(Boolean);
  if(!groupId) return;
  const {supabase,teamId}=await getContext();
  const {data:group}=await supabase.from('training_groups').select('id').eq('id',groupId).eq('team_id',teamId).single();
  if(!group) go('組別不存在');
  const {error:deleteError}=await supabase.from('group_training_presets').delete().eq('group_id',groupId);
  if(deleteError) go(deleteError.message);
  if(skillIds.length){
    const rows=skillIds.map((skillId,index)=>({group_id:groupId,skill_id:skillId,sort_order:index}));
    const {error}=await supabase.from('group_training_presets').insert(rows);
    if(error) go(error.message);
  }
  revalidatePath('/training-groups'); revalidatePath('/today');
  redirect('/training-groups?saved=1');
}
