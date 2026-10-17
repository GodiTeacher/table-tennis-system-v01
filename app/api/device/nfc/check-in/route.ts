import {createHash} from 'node:crypto';
import {NextRequest} from 'next/server';
import {createClient} from '@/lib/supabase/server';

function sha256(value:string){
  return createHash('sha256').update(value).digest('hex');
}

function fit20(value:string){
  const clean=value.replace(/\s+/g,' ').trim();
  return clean.length<=20?clean:clean.slice(0,20);
}

function hardwarePayload(data:any){
  const code=String(data?.code??'SERVER_ERROR');
  const student=data?.student??{};
  const studentLabel=[
    student.grade?String(student.grade)+'G':'',
    student.class_name?String(student.class_name):'',
    student.seat_number?String(student.seat_number).padStart(2,'0'):''
  ].filter(Boolean).join('-') || String(student.display_name??'STUDENT');

  const balance=Number(data?.wallet_balance??0);
  const points=Number(data?.points??0);

  if(code==='CHECKIN_OK'){
    return {
      lcd:{lines:[
        fit20(studentLabel),
        fit20('CHECK-IN OK'),
        fit20('BALANCE 
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

  const result=data as any;
  const hardware=hardwarePayload(result);
  return Response.json(
    {...result,...hardware},
    {status:result?.ok===false?429:200,headers:{'Cache-Control':'no-store'}}
  );
}
+balance.toLocaleString('en-US')),
        fit20('POINTS '+points.toLocaleString('en-US')),
      ]},
      indicator:{led:'green',beep:'short'},
      hold_ms:3500,
    };
  }

  if(code==='ALREADY_CHECKED_IN'){
    return {
      lcd:{lines:[
        fit20(studentLabel),
        fit20('ALREADY CHECKED'),
        fit20('BALANCE 
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
+balance.toLocaleString('en-US')),
        fit20('POINTS '+points.toLocaleString('en-US')),
      ]},
      indicator:{led:'yellow',beep:'double'},
      hold_ms:3500,
    };
  }

  if(code==='RATE_LIMIT'){
    return {
      lcd:{lines:[
        'SCAN LIMIT',
        'TRY AGAIN LATER',
        fit20('WAIT '+String(data?.retry_minutes??30)+' MIN'),
        '',
      ]},
      indicator:{led:'red',beep:'long'},
      hold_ms:3500,
    };
  }

  if(code==='INVALID_CARD'||code==='STUDENT_NOT_FOUND'){
    return {
      lcd:{lines:['CARD ERROR','INVALID CARD','','']},
      indicator:{led:'red',beep:'long'},
      hold_ms:3000,
    };
  }

  return {
    lcd:{lines:['SYSTEM ERROR','TRY AGAIN','','']},
    indicator:{led:'red',beep:'long'},
    hold_ms:3000,
  };
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
