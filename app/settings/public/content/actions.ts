'use server';

import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';

async function context(){
  const supabase=await createClient();
  const {data:u}=await supabase.auth.getUser();
  if(!u.user)redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)redirect('/settings');
  const {data:m}=await supabase.from('team_members').select('member_role').eq('team_id',teamId).eq('user_id',u.user.id).single();
  if(!m||!['owner','admin'].includes(m.member_role))throw new Error('只有隊伍擁有者或管理員可以管理家長公開內容。');
  return {supabase,teamId,userId:u.user.id};
}
function done(message:string):never{revalidatePath('/settings/public/content');redirect(`/settings/public/content?message=${encodeURIComponent(message)}`)}
function fail(message:string):never{redirect(`/settings/public/content?error=${encodeURIComponent(message)}`)}
function cleanUrl(v:FormDataEntryValue|null){const s=String(v||'').trim();if(!s)return null;try{const u=new URL(s);if(!['http:','https:'].includes(u.protocol))return null;return s}catch{return null}}
function priority(v:FormDataEntryValue|null){const x=String(v||'normal');return ['normal','reminder','important'].includes(x)?x:'normal'}

export async function createPublicAnnouncement(formData:FormData){
  try{
    const {supabase,teamId,userId}=await context();
    const title=String(formData.get('title')||'').trim();
    const body=String(formData.get('body')||'').trim();
    if(!title||!body)return fail('公告標題與內容不可空白。');
    const rawAttachment=String(formData.get('attachment_url')||'').trim();
    const attachment=cleanUrl(formData.get('attachment_url'));
    if(rawAttachment&&!attachment)return fail('圖片／附件連結必須是 http 或 https 網址。');
    const {error}=await supabase.from('team_public_announcements').insert({
      team_id:teamId,title,body,priority:priority(formData.get('priority')),attachment_url:attachment,
      pinned:formData.get('pinned')==='on',active:true,
      published_from:String(formData.get('published_from')||'')||null,
      published_until:String(formData.get('published_until')||'')||null,created_by:userId
    });
    if(error)throw error;return done('公告已新增。');
  }catch(e:any){return fail(e?.message||'新增公告失敗。')}
}

export async function updatePublicAnnouncement(formData:FormData){
  try{
    const {supabase,teamId}=await context();
    const id=String(formData.get('announcement_id')||'');
    const title=String(formData.get('title')||'').trim();
    const body=String(formData.get('body')||'').trim();
    if(!id||!title||!body)return fail('公告資料不完整。');
    const rawAttachment=String(formData.get('attachment_url')||'').trim();
    const attachment=cleanUrl(formData.get('attachment_url'));
    if(rawAttachment&&!attachment)return fail('圖片／附件連結必須是 http 或 https 網址。');
    const {error}=await supabase.from('team_public_announcements').update({
      title,body,priority:priority(formData.get('priority')),attachment_url:attachment,
      pinned:formData.get('pinned')==='on',active:formData.get('active')==='on',
      published_from:String(formData.get('published_from')||'')||null,
      published_until:String(formData.get('published_until')||'')||null,
      updated_at:new Date().toISOString()
    }).eq('id',id).eq('team_id',teamId);
    if(error)throw error;return done('公告已更新。');
  }catch(e:any){return fail(e?.message||'更新公告失敗。')}
}

export async function deletePublicAnnouncement(formData:FormData){
  try{const {supabase,teamId}=await context();const id=String(formData.get('announcement_id')||'');if(!id)return fail('缺少公告編號。');const {error}=await supabase.from('team_public_announcements').delete().eq('id',id).eq('team_id',teamId);if(error)throw error;return done('公告已刪除。');}
  catch(e:any){return fail(e?.message||'刪除公告失敗。')}
}

export async function updateCompetitionPublicInfo(formData:FormData){
  try{
    const {supabase,teamId}=await context();
    const id=String(formData.get('competition_id')||'');
    if(!id)return fail('缺少比賽編號。');
    const {error}=await supabase.from('competitions').update({
      public_show_roster:formData.get('public_show_roster')==='on',
      public_meeting_time:String(formData.get('public_meeting_time')||'').trim()||null,
      public_meeting_place:String(formData.get('public_meeting_place')||'').trim()||null,
      public_clothing:String(formData.get('public_clothing')||'').trim()||null,
      public_notes:String(formData.get('public_notes')||'').trim()||null,
    }).eq('id',id).eq('team_id',teamId);
    if(error)throw error;return done('比賽家長公開資訊已更新。');
  }catch(e:any){return fail(e?.message||'更新比賽公開設定失敗。')}
}

export async function toggleCompetitionRoster(formData:FormData){
  try{const {supabase,teamId}=await context();const id=String(formData.get('competition_id')||'');if(!id)return fail('缺少比賽編號。');const enabled=formData.get('public_show_roster')==='on';const {error}=await supabase.from('competitions').update({public_show_roster:enabled}).eq('id',id).eq('team_id',teamId);if(error)throw error;return done(enabled?'已開放該比賽參賽名單。':'已關閉該比賽參賽名單。');}
  catch(e:any){return fail(e?.message||'更新比賽公開設定失敗。')}
}
