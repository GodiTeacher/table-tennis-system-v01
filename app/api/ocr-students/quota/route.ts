import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function GET(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)return NextResponse.json({ok:false,error:'尚未登入'},{status:401});

  const {data,error}=await supabase.rpc('get_current_ocr_usage');
  if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
  const row=Array.isArray(data)?data[0]:data;
  return NextResponse.json({
    ok:true,
    used:Number(row?.used??0),
    monthlyLimit:row?.monthly_limit==null?null:Number(row.monthly_limit),
    remaining:row?.remaining==null?null:Number(row.remaining),
    unlimited:Boolean(row?.unlimited),
  });
}
