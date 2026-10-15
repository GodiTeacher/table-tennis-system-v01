import {createHash} from 'node:crypto';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

export default async function NfcCardEntryPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const raw=String(token??'').trim();
  if(!raw)redirect('/wallet?error='+encodeURIComponent('NFC 卡片網址無效'));

  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub){
    redirect('/login?next='+encodeURIComponent('/c/'+raw));
  }

  const tokenHash=createHash('sha256').update(raw).digest('hex');
  const {data,error}=await supabase.rpc('nfc_resolve_card',{target_token_hash:tokenHash});

  if(error){
    const message=
      error.message.includes('CARD_NOT_FOUND')?'找不到此 NFC 卡片，卡片可能已停用、遺失或更換。':
      error.message.includes('TEAM_ACCESS_DENIED')?'目前登入帳號不屬於這張卡片的球隊。':
      error.message.includes('WALLET_VIEW_DENIED')?'目前帳號沒有查看學生錢包的權限。':
      'NFC 卡片讀取失敗：'+error.message;
    redirect('/wallet?error='+encodeURIComponent(message));
  }

  const studentId=String((data as any)?.student_id??'');
  if(!studentId)redirect('/wallet?error='+encodeURIComponent('NFC 卡片沒有綁定有效學生'));
  redirect('/wallet?student='+encodeURIComponent(studentId)+'&message='+encodeURIComponent('NFC 感應成功'));
}
