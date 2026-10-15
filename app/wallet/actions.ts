'use server';

import {randomUUID} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

function walletUrl(studentId:string,message?:string,error?:string){
  const p=new URLSearchParams({student:studentId});
  if(message)p.set('message',message);
  if(error)p.set('error',error);
  return '/wallet?'+p.toString();
}

function friendlyWalletError(message:string){
  if(message.includes('PRO_FEATURE_REQUIRED'))return 'NFC 智慧儲值屬於菁英版功能。';
  if(message.includes('WALLET_TOP_UP_DENIED'))return '目前帳號沒有儲值權限。';
  if(message.includes('WALLET_CHARGE_DENIED'))return '目前帳號沒有扣款權限。';
  if(message.includes('INSUFFICIENT_BALANCE'))return '餘額不足，無法完成扣款。';
  if(message.includes('WALLET_NOT_ACTIVE'))return '此學生錢包目前不是啟用狀態。';
  if(message.includes('INVALID_CATEGORY'))return '消費類別無效或已停用。';
  if(message.includes('STUDENT_NOT_FOUND'))return '找不到學生，或學生目前已停用。';
  return message;
}

async function requireUser(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)redirect('/login');
  return supabase;
}

export async function topUpWallet(formData:FormData){
  const studentId=String(formData.get('student_id')??'').trim();
  const amount=Number(formData.get('amount')??0);
  const method=String(formData.get('payment_method')??'cash').trim();
  const note=String(formData.get('note')??'').trim();
  if(!studentId)redirect('/wallet?error='+encodeURIComponent('請先選擇學生'));
  if(!Number.isFinite(amount)||amount<=0)redirect(walletUrl(studentId,undefined,'請輸入正確的儲值金額'));
  const supabase=await requireUser();
  const {data,error}=await supabase.rpc('wallet_top_up',{target_student:studentId,top_up_amount:amount,payment_method:method,note_text:note||null,request_key:randomUUID()});
  if(error)redirect(walletUrl(studentId,undefined,friendlyWalletError(error.message)));
  const balance=Number((data as any)?.balance??0);
  revalidatePath('/wallet');
  redirect(walletUrl(studentId,'儲值成功，目前餘額 $'+balance.toLocaleString('zh-TW')));
}

export async function chargeWallet(formData:FormData){
  const studentId=String(formData.get('student_id')??'').trim();
  const amount=Number(formData.get('amount')??0);
  const categoryRaw=String(formData.get('category_id')??'').trim();
  const note=String(formData.get('note')??'').trim();
  if(!studentId)redirect('/wallet?error='+encodeURIComponent('請先選擇學生'));
  if(!Number.isFinite(amount)||amount<=0)redirect(walletUrl(studentId,undefined,'請輸入正確的扣款金額'));
  const supabase=await requireUser();
  const {data,error}=await supabase.rpc('wallet_charge',{target_student:studentId,charge_amount:amount,target_category:categoryRaw||null,note_text:note||null,request_key:randomUUID()});
  if(error)redirect(walletUrl(studentId,undefined,friendlyWalletError(error.message)));
  const balance=Number((data as any)?.balance??0);
  revalidatePath('/wallet');
  redirect(walletUrl(studentId,'扣款成功，目前餘額 $'+balance.toLocaleString('zh-TW')));
}
