import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {env} from 'cloudflare:workers';

const MAX_FILE_BYTES=6*1024*1024;
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp']);

function parseJsonArray(text:string){
  const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
  const start=cleaned.indexOf('['); const end=cleaned.lastIndexOf(']');
  const candidate=start>=0&&end>start?cleaned.slice(start,end+1):cleaned;
  const parsed=JSON.parse(candidate);
  if(!Array.isArray(parsed))throw new Error('辨識結果不是名單格式');
  return parsed.map((row:any)=>({
    display_name:String(row?.display_name??row?.姓名??'').trim(),
    grade:Number.isInteger(Number(row?.grade??row?.年級))?Number(row?.grade??row?.年級):null,
    class_name:String(row?.class_name??row?.班級??'').trim()||null,
    seat_number:Number.isInteger(Number(row?.seat_number??row?.座號))?Number(row?.seat_number??row?.座號):null,
    gender:['男','女','其他'].includes(String(row?.gender??row?.性別??''))?String(row?.gender??row?.性別):null,
    confidence:typeof row?.confidence==='number'?Math.max(0,Math.min(1,row.confidence)):null,
  })).filter((row:any)=>row.display_name);
}

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)return NextResponse.json({ok:false,error:'尚未登入'},{status:401});

  const {data:quotaData,error:quotaError}=await supabase.rpc('get_current_ocr_usage');
  if(quotaError)return NextResponse.json({ok:false,error:quotaError.message},{status:500});
  const quota=Array.isArray(quotaData)?quotaData[0]:quotaData;
  if(quota?.monthly_limit!=null&&Number(quota.remaining??0)<=0){
    return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:`本月照片文字辨識額度已用完（${quota.used}/${quota.monthly_limit} 次）`},{status:429});
  }

  const formData=await request.formData();
  const file=formData.get('image');
  if(!(file instanceof File))return NextResponse.json({ok:false,error:'請先選擇學生名單照片'},{status:400});
  if(!ALLOWED_TYPES.has(file.type))return NextResponse.json({ok:false,error:'目前支援 JPG、PNG、WebP 圖片'},{status:400});
  if(file.size>MAX_FILE_BYTES)return NextResponse.json({ok:false,error:'圖片過大，請壓縮至 6MB 以下'},{status:400});
  if(!env.AI)return NextResponse.json({ok:false,error:'照片辨識服務尚未連線，請稍後再試'},{status:503});

  try{
    const bytes=new Uint8Array(await file.arrayBuffer());
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    const image=`data:${file.type};base64,${btoa(binary)}`;
    const question=`請辨識這張學生名單照片，找出每一位學生。只輸出 JSON 陣列，不要加任何說明。每筆格式：{"display_name":"姓名","grade":1到6或null,"class_name":"班級或null","seat_number":座號數字或null,"gender":"男/女/其他或null","confidence":0到1}。若欄位看不清楚請填 null，不要猜測；姓名看不清楚的資料不要輸出。請保留照片中的繁體中文姓名。`;
    const result:any=await env.AI.run('@cf/moondream/moondream3.1-9B-A2B',{
      task:'query', image, question, reasoning:false, stream:false, temperature:0.1, max_tokens:3500,
    });
    const answer=String(result?.answer??'').trim();
    const rows=parseJsonArray(answer);
    if(!rows.length)return NextResponse.json({ok:false,error:'沒有從照片中辨識到學生，請換一張較清楚、正面拍攝的照片'},{status:422});

    const {data:consumeData,error:consumeError}=await supabase.rpc('consume_ocr_import');
    if(consumeError)return NextResponse.json({ok:false,error:consumeError.message},{status:500});
    const consumed=Array.isArray(consumeData)?consumeData[0]:consumeData;
    if(!consumed?.allowed)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:'本月照片文字辨識額度已用完'},{status:429});

    return NextResponse.json({
      ok:true,
      rows,
      quota:{used:Number(consumed.used??0),monthlyLimit:consumed.monthly_limit==null?null:Number(consumed.monthly_limit),remaining:consumed.remaining==null?null:Number(consumed.remaining)},
    });
  }catch(error:any){
    console.error('ocr-students recognize failed',error);
    return NextResponse.json({ok:false,error:'照片辨識失敗，請確認照片清楚後再試一次'},{status:500});
  }
}
