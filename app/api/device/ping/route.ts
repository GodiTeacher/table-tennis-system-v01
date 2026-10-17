import {createHash} from 'node:crypto';
import {NextRequest} from 'next/server';
import {createClient} from '@/lib/supabase/server';

function sha256(value:string){
  return createHash('sha256').update(value).digest('hex');
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
  const firmware=String(body?.firmware??'').trim();

  if(!deviceKey||!deviceSecret){
    return Response.json({ok:false,code:'MISSING_FIELDS'},{status:400});
  }

  const supabase=await createClient();
  const {data,error}=await supabase.rpc('device_heartbeat',{
    target_device_key:deviceKey,
    target_secret_hash:sha256(deviceSecret),
    target_firmware:firmware||null,
  });

  if(error){
    const denied=error.message.includes('DEVICE_DENIED');
    return Response.json(
      {ok:false,code:denied?'DEVICE_DENIED':'SERVER_ERROR'},
      {status:denied?403:500,headers:{'Cache-Control':'no-store'}}
    );
  }

  return Response.json(data,{status:200,headers:{'Cache-Control':'no-store'}});
}
