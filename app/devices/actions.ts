'use server';

import {createHash,randomBytes} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

async function requireDeviceManager(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)redirect('/more');
  const {data:membership}=await supabase.from('team_members').select('member_role,permissions').eq('team_id',teamId).eq('user_id',userId).maybeSingle();
  const admin=['owner','admin'].includes(membership?.member_role??'');
  const canManage=admin||Boolean((membership?.permissions as Record<string,boolean>|null)?.nfc_manage);
  if(!canManage)redirect('/more?error='+encodeURIComponent('目前帳號沒有 NFC 裝置管理權限。'));
  return {supabase,userId,teamId};
}

export async function createNfcDevice(formData:FormData){
  const name=String(formData.get('name')??'').trim();
  const windowMinutes=Number(formData.get('scan_window_minutes')??30);
  const maxScans=Number(formData.get('max_scans_per_window')??3);
  if(!name)redirect('/devices?error='+encodeURIComponent('請輸入裝置名稱'));
  if(!Number.isInteger(windowMinutes)||windowMinutes<1||windowMinutes>1440)redirect('/devices?error='+encodeURIComponent('刷卡限制分鐘數不正確'));
  if(!Number.isInteger(maxScans)||maxScans<1||maxScans>100)redirect('/devices?error='+encodeURIComponent('刷卡次數限制不正確'));

  const {supabase,userId,teamId}=await requireDeviceManager();
  const deviceKey='dev_'+randomBytes(8).toString('hex');
  const rawSecret=randomBytes(24).toString('base64url');
  const secretHash=createHash('sha256').update(rawSecret).digest('hex');

  const {data,error}=await supabase.from('team_devices').insert({
    team_id:teamId,
    name,
    device_key:deviceKey,
    secret_hash:secretHash,
    scan_window_minutes:windowMinutes,
    max_scans_per_window:maxScans,
    min_repeat_seconds:3,
    created_by:userId,
  }).select('id').single();

  if(error)redirect('/devices?error='+encodeURIComponent(error.message));
  revalidatePath('/devices');
  const p=new URLSearchParams({
    created:String(data.id),
    device_key:deviceKey,
    device_secret:rawSecret,
    message:'裝置已建立。Device Secret 只會顯示這一次，請先保存。',
  });
  redirect('/devices?'+p.toString());
}

export async function updateNfcDevice(formData:FormData){
  const id=String(formData.get('id')??'').trim();
  const name=String(formData.get('name')??'').trim();
  const windowMinutes=Number(formData.get('scan_window_minutes')??30);
  const maxScans=Number(formData.get('max_scans_per_window')??3);
  const enabled=String(formData.get('enabled')??'1')==='1';
  if(!id||!name)redirect('/devices?error='+encodeURIComponent('裝置資料不完整'));

  const {supabase,teamId}=await requireDeviceManager();
  const {error}=await supabase.from('team_devices').update({
    name,
    scan_window_minutes:windowMinutes,
    max_scans_per_window:maxScans,
    enabled,
    updated_at:new Date().toISOString(),
  }).eq('id',id).eq('team_id',teamId);
  if(error)redirect('/devices?error='+encodeURIComponent(error.message));
  revalidatePath('/devices');
  redirect('/devices?message='+encodeURIComponent('裝置設定已更新。'));
}

export async function rotateNfcDeviceSecret(formData:FormData){
  const id=String(formData.get('id')??'').trim();
  if(!id)redirect('/devices?error='+encodeURIComponent('缺少裝置資料'));
  const {supabase,teamId}=await requireDeviceManager();
  const rawSecret=randomBytes(24).toString('base64url');
  const secretHash=createHash('sha256').update(rawSecret).digest('hex');
  const {data,error}=await supabase.from('team_devices').update({secret_hash:secretHash,updated_at:new Date().toISOString()}).eq('id',id).eq('team_id',teamId).select('device_key').single();
  if(error)redirect('/devices?error='+encodeURIComponent(error.message));
  revalidatePath('/devices');
  const p=new URLSearchParams({
    created:id,
    device_key:data.device_key,
    device_secret:rawSecret,
    message:'Device Secret 已重新產生，舊 Secret 已失效。',
  });
  redirect('/devices?'+p.toString());
}
