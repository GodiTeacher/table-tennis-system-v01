'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

async function requireAdmin(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)redirect('/more');
  const {data:membership}=await supabase.from('team_members').select('member_role').eq('team_id',teamId).eq('user_id',userId).maybeSingle();
  if(!membership||!['owner','admin'].includes(membership.member_role)){
    redirect('/wallet?error='+encodeURIComponent('只有 Owner／Admin 可以管理消費類別。'));
  }
  return {supabase,teamId};
}

export async function createWalletCategory(formData:FormData){
  const name=String(formData.get('name')??'').trim();
  if(!name)redirect('/wallet/settings?error='+encodeURIComponent('請輸入類別名稱'));
  const {supabase,teamId}=await requireAdmin();
  const {error}=await supabase.from('wallet_categories').insert({team_id:teamId,name,category_type:'charge',active:true,sort_order:500});
  if(error){
    const msg=error.code==='23505'?'已有相同名稱的消費類別。':error.message;
    redirect('/wallet/settings?error='+encodeURIComponent(msg));
  }
  revalidatePath('/wallet');
  revalidatePath('/wallet/settings');
  redirect('/wallet/settings?message='+encodeURIComponent('消費類別已新增。'));
}

export async function renameWalletCategory(formData:FormData){
  const id=String(formData.get('id')??'').trim();
  const name=String(formData.get('name')??'').trim();
  if(!id||!name)redirect('/wallet/settings?error='+encodeURIComponent('類別資料不完整'));
  const {supabase,teamId}=await requireAdmin();
  const {error}=await supabase.from('wallet_categories').update({name,updated_at:new Date().toISOString()}).eq('id',id).eq('team_id',teamId);
  if(error)redirect('/wallet/settings?error='+encodeURIComponent(error.code==='23505'?'已有相同名稱的消費類別。':error.message));
  revalidatePath('/wallet');
  revalidatePath('/wallet/settings');
  redirect('/wallet/settings?message='+encodeURIComponent('類別名稱已更新。'));
}

export async function toggleWalletCategory(formData:FormData){
  const id=String(formData.get('id')??'').trim();
  const active=String(formData.get('active')??'')==='1';
  if(!id)redirect('/wallet/settings?error='+encodeURIComponent('類別資料不完整'));
  const {supabase,teamId}=await requireAdmin();
  const {error}=await supabase.from('wallet_categories').update({active,updated_at:new Date().toISOString()}).eq('id',id).eq('team_id',teamId);
  if(error)redirect('/wallet/settings?error='+encodeURIComponent(error.message));
  revalidatePath('/wallet');
  revalidatePath('/wallet/settings');
  redirect('/wallet/settings?message='+encodeURIComponent(active?'類別已啟用。':'類別已停用。'));
}
