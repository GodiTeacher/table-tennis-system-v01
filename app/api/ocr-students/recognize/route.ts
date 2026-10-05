import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {getCloudflareContext} from '@opennextjs/cloudflare';

const MAX_FILE_BYTES=6*1024*1024;
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp']);
const FIELD_KEYS=['display_name','grade','class_name','seat_number','gender'] as const;
type FieldKey=typeof FIELD_KEYS[number];

function normalizeParsedRows(parsed:any){
  const source=Array.isArray(parsed)?parsed:Array.isArray(parsed?.students)?parsed.students:Array.isArray(parsed?.rows)?parsed.rows:Array.isArray(parsed?.data)?parsed.data:[];
  return source.map((row:any)=>({
    display_name:String(row?.display_name??row?.name??row?.姓名??'').trim(),
    grade:Number.isInteger(Number(row?.grade??row?.年級))&&Number(row?.grade??row?.年級)>=1&&Number(row?.grade??row?.年級)<=6?Number(row?.grade??row?.年級):null,
    class_name:String(row?.class_name??row?.class??row?.班級??'').trim()||null,
    seat_number:Number.isInteger(Number(row?.seat_number??row?.seat??row?.座號))?Number(row?.seat_number??row?.seat??row?.座號):null,
    gender:['男','女','其他'].includes(String(row?.gender??row?.性別??''))?String(row?.gender??row?.性別):null,
    confidence:typeof row?.confidence==='number'?Math.max(0,Math.min(1,row.confidence)):null,
  })).filter((row:any)=>row.display_name);
}

function parseJsonRows(text:string){
  const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
  const attempts:string[]=[cleaned];
  const arrayStart=cleaned.indexOf('['),arrayEnd=cleaned.lastIndexOf(']');
  if(arrayStart>=0&&arrayEnd>arrayStart)attempts.push(cleaned.slice(arrayStart,arrayEnd+1));
  const objectStart=cleaned.indexOf('{'),objectEnd=cleaned.lastIndexOf('}');
  if(objectStart>=0&&objectEnd>objectStart)attempts.push(cleaned.slice(objectStart,objectEnd+1));
  for(const candidate of attempts){
    try{const rows=normalizeParsedRows(JSON.parse(candidate));if(rows.length)return rows;}catch{}
  }
  throw new Error('AI 有讀到圖片，但沒有回傳可解析的學生名單');
}

function requestedFields(raw:FormDataEntryValue|null):FieldKey[]{
  try{
    const values=JSON.parse(String(raw??'[]'));
    if(!Array.isArray(values))return [...FIELD_KEYS];
    const fields=FIELD_KEYS.filter(key=>values.includes(key));
    if(!fields.includes('display_name'))fields.unshift('display_name');
    return fields;
  }catch{return [...FIELD_KEYS];}
}

function fieldPrompt(fields:FieldKey[]){
  const labels:Record<FieldKey,string>={display_name:'姓名',grade:'年級',class_name:'班級',seat_number:'座號',gender:'性別'};
  const selected=fields.map(f=>labels[f]).join('、');
  const schema:Record<FieldKey,string>={display_name:'"display_name":"姓名"',grade:'"grade":1到6或null',class_name:'"class_name":"班級原文或null"',seat_number:'"seat_number":座號數字或null',gender:'"gender":"男/女/其他或null"'};
  const shape=fields.map(f=>schema[f]).join(',');
  return `你正在辨識台灣學校的紙本學生名單。這次只需要辨識：${selected}。\n請逐列讀取學生資料，忽略日期、出席勾選、補課註記、工作天數等非學生基本資料。\n只輸出 JSON 陣列，不要 Markdown、不加說明。每筆格式：{${shape},"confidence":0到1}。\n規則：\n1. 姓名必須保留繁體中文，姓名看不清楚就不要輸出那一列。\n2. 不要把序號欄當成座號；只有照片明確有座號欄時才填 seat_number。\n3. 班級請保留照片原文，例如 102、201、三甲。若班級是三位數代碼如 102、201、301，第一碼通常代表年級；只有本次有要求年級時才可據此填 grade。\n4. 沒有被要求辨識的欄位不要自行猜測。\n5. 一列一位學生，依照片由上到下排序。`;
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
  const fields=requestedFields(formData.get('fields'));
  if(!(file instanceof File))return NextResponse.json({ok:false,error:'請先選擇學生名單照片'},{status:400});
  if(!ALLOWED_TYPES.has(file.type))return NextResponse.json({ok:false,error:'目前支援 JPG、PNG、WebP 圖片'},{status:400});
  if(file.size>MAX_FILE_BYTES)return NextResponse.json({ok:false,error:'圖片過大，請壓縮至 6MB 以下'},{status:400});

  try{
    const {env}=getCloudflareContext();
    const AI=(env as any)?.AI;
    if(!AI)return NextResponse.json({ok:false,error:'照片辨識服務尚未連線，請稍後再試'},{status:503});

    const bytes=new Uint8Array(await file.arrayBuffer());
    let binary=''; const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    const image=`data:${file.type};base64,${btoa(binary)}`;
    const result:any=await AI.run('@cf/moondream/moondream3.1-9B-A2B',{
      task:'query',image,question:fieldPrompt(fields),reasoning:false,stream:false,temperature:0,max_tokens:6000,
    });
    const answer=String(result?.answer??'').trim();
    if(!answer)return NextResponse.json({ok:false,error:'辨識服務沒有讀出文字，請重新拍攝並讓名單文字盡量佔滿畫面'},{status:422});
    let rows;
    try{rows=parseJsonRows(answer);}catch(parseError:any){
      console.error('ocr parse failed',{answer:answer.slice(0,1500),parseError:String(parseError?.message??parseError)});
      return NextResponse.json({ok:false,code:'OCR_PARSE_FAILED',error:'照片其實有讀到，但名單整理失敗。已記錄這次格式，請再試一次；若仍失敗可直接把畫面截圖給我們。'},{status:422});
    }
    rows=rows.map((row:any)=>({
      ...row,
      grade:fields.includes('grade')?row.grade:null,
      class_name:fields.includes('class_name')?row.class_name:null,
      seat_number:fields.includes('seat_number')?row.seat_number:null,
      gender:fields.includes('gender')?row.gender:null,
    }));
    if(!rows.length)return NextResponse.json({ok:false,error:'沒有從照片中辨識到學生。請確認已勾選正確欄位，並讓姓名與班級文字清楚佔滿畫面。'},{status:422});

    const {data:consumeData,error:consumeError}=await supabase.rpc('consume_ocr_import');
    if(consumeError)return NextResponse.json({ok:false,error:consumeError.message},{status:500});
    const consumed=Array.isArray(consumeData)?consumeData[0]:consumeData;
    if(!consumed?.allowed)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:'本月照片文字辨識額度已用完'},{status:429});

    return NextResponse.json({ok:true,rows,fields,quota:{used:Number(consumed.used??0),monthlyLimit:consumed.monthly_limit==null?null:Number(consumed.monthly_limit),remaining:consumed.remaining==null?null:Number(consumed.remaining)}});
  }catch(error:any){
    console.error('ocr-students recognize failed',error);
    const message=String(error?.message??'');
    if(message.toLowerCase().includes('image'))return NextResponse.json({ok:false,error:'照片格式或尺寸無法辨識，請重新拍攝或換一張照片再試。'},{status:500});
    return NextResponse.json({ok:false,error:'照片辨識服務暫時失敗，這次不會扣使用次數，請稍後再試一次。'},{status:500});
  }
}
