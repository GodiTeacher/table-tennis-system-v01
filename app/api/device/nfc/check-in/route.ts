import {createHash} from 'node:crypto';
import {NextRequest} from 'next/server';
import {createClient} from '@/lib/supabase/server';

function sha256(value:string){
  return createHash('sha256').update(value).digest('hex');
}

function normalizeCardToken(input:string){
  const raw=input.trim();
  if(!raw)return '';
  try{
    if(raw.startsWith('http://')||raw.startsWith('https://')){
      const url=new URL(raw);
      const parts=url.pathname.split('/').filter(Boolean);
      const cIndex=parts.lastIndexOf('c');
      if(cIndex>=0&&parts[cIndex+1])return parts[cIndex+1];
      return parts.at(-1)??'';
    }
  }catch{}
  return raw;
}

export async function POST(req:NextRequest){
  let body:any;
  try{
    body=await req.json();
  }catch{
    return Response.json({ok:false,code:'BAD_JSON'},{status:400});
  }

  const deviceKey=String(body?.device_key??'').trim();
  const deviceSecret=String(body?.device_secret??'').trim();
  const cardToken=normalizeCardToken(String(body?.card_token??body?.ndef_url??''));
  const firmware=String(body?.firmware??'').trim();

  if(!deviceKey||!deviceSecret||!cardToken){
    return Response.json({ok:false,code:'MISSING_FIELDS'},{status:400});
  }

  const supabase=await createClient();
  const {data,error}=await supabase.rpc('device_nfc_check_in',{
    target_device_key:deviceKey,
    target_secret_hash:sha256(deviceSecret),
    target_card_token_hash:sha256(cardToken),
    target_firmware:firmware||null,
  });

  if(error){
    const denied=error.message.includes('DEVICE_DENIED');
    return Response.json({ok:false,code:denied?'DEVICE_DENIED':'SERVER_ERROR'},{status:denied?403:500});
  }

  return Response.json(data,{status:(data as any)?.ok===false?429:200,headers:{'Cache-Control':'no-store'}});
}
