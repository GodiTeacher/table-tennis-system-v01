'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function context(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId) redirect('/login');
  const {data:teamId,error}=await supabase.rpc('current_team_id');
  if(error||!teamId) redirect('/points?error='+encodeURIComponent('目前沒有可使用的隊伍工作區。'));
  return {supabase,userId,teamId};
}

export async function addPointRecord(formData:FormData){
  const {supabase,userId,teamId}=await context();
  const studentId=String(formData.get('student_id')??'');
  const points=Math.trunc(Number(formData.get('points')??0));
  const reason=String(formData.get('reason')??'').trim();
  const note=String(formData.get('note')??'').trim()||null;
  const occurredOn=String(formData.get('occurred_on')??'').trim()||new Date().toISOString().slice(0,10);
  if(!studentId||!Number.isFinite(points)||points===0||!reason) redirect('/points?error='+encodeURIComponent('請選學生、輸入非 0 點數並填寫原因。'));
  const {error}=await supabase.from('student_point_records').insert({team_id:teamId,student_id:studentId,points,reason,note,occurred_on:occurredOn,created_by:userId});
  if(error) redirect('/points?error='+encodeURIComponent(error.message));
  revalidatePath('/points');
  redirect('/points?message='+encodeURIComponent(points>0?'加點紀錄已新增。':'扣點紀錄已新增。'));
}

export async function deletePointRecord(formData:FormData){
  const {supabase,teamId}=await context();
  const id=String(formData.get('id')??'');
  if(!id) redirect('/points?error='+encodeURIComponent('找不到點數紀錄。'));
  const {error}=await supabase.from('student_point_records').delete().eq('id',id).eq('team_id',teamId);
  if(error) redirect('/points?error='+encodeURIComponent(error.message));
  revalidatePath('/points');
  redirect('/points?message='+encodeURIComponent('點數紀錄已刪除，總點數已重新計算。'));
}
