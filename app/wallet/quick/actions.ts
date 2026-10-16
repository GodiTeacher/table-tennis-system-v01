'use server';

import {randomUUID} from 'node:crypto';
import {cookies} from 'next/headers';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

const COOKIE_AMOUNT='wallet-quick-amount';
const COOKIE_CATEGORY='wallet-quick-category';
const COOKIE_NOTE='wallet-quick-note';
const COOKIE_ENABLED='wallet-quick-enabled';

async function requireUser(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)redirect('/login');
  return supabase;
}

export async function configureQuickCharge(formData:FormData){
  await requireUser();
  const amount=Number(formData.get('amount')??0);
  const category=String(formData.get('category_id')??'').trim();
  const note=String(formData.get('note')??'').trim();

  if(!Number.isFinite(amount)||amount<=0){
    redirect('/wallet/quick?error='+encodeURIComponent('請輸入正確的固定扣款金額'));
  }

  const jar=await cookies();
  const base={path:'/',maxAge:60*60*8,sameSite:'lax' as const,httpOnly:true,secure:true};
  jar.set(COOKIE_AMOUNT,String(Math.round(amount*100)/100),base);
  jar.set(COOKIE_CATEGORY,category,base);
  jar.set(COOKIE_NOTE,note,base);
  jar.set(COOKIE_ENABLED,'1',base);
  redirect('/wallet/quick?message='+encodeURIComponent('快速扣款模式已開啟，現在可以依序感應學生卡片。'));
}

export async function disableQuickCharge(){
  await requireUser();
  const jar=await cookies();
  jar.delete(COOKIE_AMOUNT);
  jar.delete(COOKIE_CATEGORY);
  jar.delete(COOKIE_NOTE);
  jar.delete(COOKIE_ENABLED);
  redirect('/wallet/quick?message='+encodeURIComponent('快速扣款模式已關閉。'));
}

export async function quickChargeStudent(formData:FormData){
  const supabase=await requireUser();
  const studentId=String(formData.get('student_id')??'').trim();
  if(!studentId)redirect('/wallet/quick?error='+encodeURIComponent('缺少學生資料'));

  const jar=await cookies();
  if(jar.get(COOKIE_ENABLED)?.value!=='1'){
    redirect('/wallet/quick?error='+encodeURIComponent('快速扣款模式尚未開啟'));
  }

  const amount=Number(jar.get(COOKIE_AMOUNT)?.value??0);
  const category=jar.get(COOKIE_CATEGORY)?.value??'';
  const note=jar.get(COOKIE_NOTE)?.value??'';
  if(!Number.isFinite(amount)||amount<=0){
    redirect('/wallet/quick?error='+encodeURIComponent('快速扣款設定無效，請重新設定'));
  }

  const {data,error}=await supabase.rpc('wallet_charge',{
    target_student:studentId,
    charge_amount:amount,
    target_category:category||null,
    note_text:note||'快速扣款',
    request_key:randomUUID(),
  });

  if(error){
    const msg=
      error.message.includes('INSUFFICIENT_BALANCE')?'餘額不足，未扣款。':
      error.message.includes('WALLET_CHARGE_DENIED')?'目前帳號沒有扣款權限。':
      error.message.includes('INVALID_CATEGORY')?'快速扣款的消費類別已停用，請重新設定。':
      error.message;
    redirect('/wallet/quick?student='+encodeURIComponent(studentId)+'&error='+encodeURIComponent(msg));
  }

  const balance=Number((data as any)?.balance??0);
  revalidatePath('/wallet');
  revalidatePath('/wallet-report');
  redirect('/wallet/quick?message='+encodeURIComponent('扣款成功，目前餘額 $'+balance.toLocaleString('zh-TW')+'。請感應下一張卡。'));
}
