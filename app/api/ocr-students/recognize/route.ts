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
  return [];
}

function cleanNameToken(value:string){
  return value.replace(/[\s:：;；,，。\.\-—_\[\]【】()（）]/g,'').trim();
}

function parsePlainRows(text:string,fields:FieldKey[]){
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const rows:any[]=[];
  const seen=new Set<string>();
  for(const raw of lines){
    const line=raw.replace(/^[-*•#\d.、)）\s]+/,'').trim();
    if(!line||/^(姓名|name|學生|名單|班級|年級|座號|性別)/i.test(line))continue;
    const parts=line.split(/\t|\s{2,}|[,，|｜]/).map(x=>x.trim()).filter(Boolean);
    const candidates=[...parts,line];
    let chineseName='';
    for(const candidate of candidates){
      const matches=candidate.match(/[\u3400-\u9fff·]{2,5}/g)??[];
      const plausible=matches.map(cleanNameToken).find(x=>x.length>=2&&x.length<=5&&!/^(學生|姓名|名單|班級|年級|座號|性別|補課|課後|四點|工作天|日期)$/.test(x));
      if(plausible){chineseName=plausible;break;}
    }
    if(!chineseName||seen.has(chineseName))continue;
    let class_name:string|null=null,grade:number|null=null,seat_number:number|null=null,gender:string|null=null;
    const tokens=parts.filter(p=>!p.includes(chineseName));
    if(fields.includes('class_name')){
      const classToken=tokens.find(p=>/^\d{3}$/.test(p)||/^[一二三四五六1-6][甲乙丙丁戊己庚辛壬癸A-Za-z0-9]*班?$/.test(p));
      if(classToken)class_name=classToken;
    }
    if(fields.includes('grade')){
      const direct=tokens.find(p=>/^[1-6]$/.test(p)||/^[一二三四五六]年級$/.test(p));
      if(direct&&/^[1-6]$/.test(direct))grade=Number(direct);
      else if(class_name&&/^\d{3}$/.test(class_name))grade=Number(class_name[0]);
    }
    if(fields.includes('seat_number')){
      const nums=tokens.filter(p=>/^\d{1,2}$/.test(p)).map(Number);
      if(nums.length)seat_number=nums[nums.length-1];
    }
    if(fields.includes('gender')){
      const g=tokens.find(p=>['男','女','其他'].includes(p)); if(g)gender=g;
    }
    seen.add(chineseName);
    rows.push({display_name:chineseName,grade,class_name,seat_number,gender,confidence:.62});
  }
  return rows;
}

function requestedFields(raw:FormDataEntryValue|null):FieldKey[]{
  try{const values=JSON.parse(String(raw??'[]'));if(!Array.isArray(values))return [...FIELD_KEYS];const fields=FIELD_KEYS.filter(key=>values.includes(key));if(!fields.includes('display_name'))fields.unshift('display_name');return fields;}catch{return [...FIELD_KEYS];}
}

function fieldPrompt(fields:FieldKey[]){
  const labels:Record<FieldKey,string>={display_name:'姓名',grade:'年級',class_name:'班級',seat_number:'座號',gender:'性別'};
  const selected=fields.map(f=>labels[f]).join('、');
  const schema:Record<FieldKey,string>={display_name:'"display_name":"姓名"',grade:'"grade":1到6或null',class_name:'"class_name":"班級原文或null"',seat_number:'"seat_number":座號數字或null',gender:'"gender":"男/女/其他或null"'};
  const shape=fields.map(f=>schema[f]).join(',');
  if(fields.length===1){
    return '這是一張台灣學校學生名單照片。請只辨識學生姓名，依照片由上到下讀取。忽略數字、班級、座號、性別、日期、出席勾選、補課文字。只輸出 JSON 陣列，例如 [{"display_name":"王小明","confidence":0.95}]。姓名請保留繁體中文；看不清楚的姓名不要猜。';
  }
  return `這是一張台灣學校學生名單照片。請逐列讀取，這次只辨識：${selected}。\n忽略日期、出席勾選、補課註記、工作天數等非學生基本資料。\n只輸出 JSON 陣列，不要 Markdown、不加說明。每筆格式：{${shape},"confidence":0到1}。\n姓名必須保留繁體中文。不要把最左側流水序號當座號。班級代碼如 102、201、301 請保留原文；若有要求年級，可用第一碼推定年級。沒有被要求的欄位不要猜。`;
}

function fallbackPrompt(fields:FieldKey[]){
  const labels:Record<FieldKey,string>={display_name:'姓名',grade:'年級',class_name:'班級',seat_number:'座號',gender:'性別'};
  if(fields.length===1)return '請只抄出圖片中「學生姓名」那一欄，由上到下每行一個繁體中文姓名。不要抄數字、班級、座號、性別、日期、註記或其他文字。不要解釋。';
  return `請只做文字抄錄，不要解釋。把這張台灣學生名單由上到下抄成多行。每行只放 ${fields.map(f=>labels[f]).join('、')}，欄位用 TAB 分隔。姓名一定要保留繁體中文。看不到的欄位留空。不要把最左側流水序號當座號。`;
}

async function runLlamaVision(AI:any,image:string,prompt:string){
  const result:any=await AI.run('@cf/meta/llama-3.2-11b-vision-instruct',{
    messages:[
      {role:'system',content:'你是台灣學校名單文字辨識助手。請精確抄錄繁體中文，不要猜測看不清楚的字。'},
      {role:'user',content:prompt},
    ],
    image,
    max_tokens:5000,
    temperature:0,
  });
  return String(result?.response??result?.answer??result?.result??'').trim();
}

async function runMoondream(AI:any,image:string,question:string,max_tokens=4500){
  const result:any=await AI.run('@cf/moondream/moondream3.1-9B-A2B',{task:'query',image,question,reasoning:false,stream:false,temperature:0,max_tokens});
  return String(result?.answer??result?.caption??'').trim();
}

function normalizeFields(rows:any[],fields:FieldKey[]){
  return rows.map((row:any)=>({...row,grade:fields.includes('grade')?row.grade:null,class_name:fields.includes('class_name')?row.class_name:null,seat_number:fields.includes('seat_number')?row.seat_number:null,gender:fields.includes('gender')?row.gender:null}));
}

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)return NextResponse.json({ok:false,error:'尚未登入'},{status:401});
  const {data:quotaData,error:quotaError}=await supabase.rpc('get_current_ocr_usage');
  if(quotaError)return NextResponse.json({ok:false,error:quotaError.message},{status:500});
  const quota=Array.isArray(quotaData)?quotaData[0]:quotaData;
  if(quota?.monthly_limit!=null&&Number(quota.remaining??0)<=0)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:`本月照片文字辨識額度已用完（${quota.used}/${quota.monthly_limit} 次）`},{status:429});

  const formData=await request.formData(); const file=formData.get('image'); const fields=requestedFields(formData.get('fields'));
  if(!(file instanceof File))return NextResponse.json({ok:false,error:'請先選擇學生名單照片'},{status:400});
  if(!ALLOWED_TYPES.has(file.type))return NextResponse.json({ok:false,error:'目前支援 JPG、PNG、WebP 圖片'},{status:400});
  if(file.size>MAX_FILE_BYTES)return NextResponse.json({ok:false,error:'圖片過大，請壓縮至 6MB 以下'},{status:400});

  try{
    const {env}=getCloudflareContext(); const AI=(env as any)?.AI;
    if(!AI)return NextResponse.json({ok:false,error:'照片辨識服務尚未連線，請稍後再試'},{status:503});
    const bytes=new Uint8Array(await file.arrayBuffer()); let binary=''; const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    const image=`data:${file.type};base64,${btoa(binary)}`;

    let answer=''; let rows:any[]=[]; let method='';

    // Pass 1: use a larger vision model for Chinese roster OCR.
    try{
      answer=await runLlamaVision(AI,image,fieldPrompt(fields));
      rows=parseJsonRows(answer);
      if(!rows.length)rows=parsePlainRows(answer,fields);
      if(rows.length)method='llama-vision';
    }catch(error){console.error('llama vision pass failed',error);}

    // Pass 2: ask the same model for plain transcription; this is easier than structured JSON.
    if(!rows.length){
      try{
        answer=await runLlamaVision(AI,image,fallbackPrompt(fields));
        rows=parseJsonRows(answer);
        if(!rows.length)rows=parsePlainRows(answer,fields);
        if(rows.length)method='llama-plain';
      }catch(error){console.error('llama plain pass failed',error);}
    }

    // Pass 3: keep Moondream as an independent fallback.
    if(!rows.length){
      try{
        answer=await runMoondream(AI,image,fallbackPrompt(fields),4500);
        rows=parseJsonRows(answer);
        if(!rows.length)rows=parsePlainRows(answer,fields);
        if(rows.length)method='moondream-fallback';
      }catch(error){console.error('moondream fallback failed',error);}
    }

    rows=normalizeFields(rows,fields);
    if(!rows.length){
      console.error('ocr no rows after all models',{answer:answer.slice(0,1800),fields});
      return NextResponse.json({ok:false,code:'OCR_NO_ROWS',error:'這張照片目前仍無法可靠辨識姓名。這次不會扣使用次數。請把名單裁切到「姓名欄」附近再試，或直接把畫面截圖給我們。'},{status:422});
    }

    const {data:consumeData,error:consumeError}=await supabase.rpc('consume_ocr_import');
    if(consumeError)return NextResponse.json({ok:false,error:consumeError.message},{status:500});
    const consumed=Array.isArray(consumeData)?consumeData[0]:consumeData;
    if(!consumed?.allowed)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:'本月照片文字辨識額度已用完'},{status:429});
    return NextResponse.json({ok:true,rows,fields,method,quota:{used:Number(consumed.used??0),monthlyLimit:consumed.monthly_limit==null?null:Number(consumed.monthly_limit),remaining:consumed.remaining==null?null:Number(consumed.remaining)}});
  }catch(error:any){
    console.error('ocr-students recognize failed',error); const message=String(error?.message??'');
    if(message.toLowerCase().includes('image'))return NextResponse.json({ok:false,error:'照片格式或尺寸無法辨識，請重新拍攝或換一張照片再試。'},{status:500});
    return NextResponse.json({ok:false,error:'照片辨識服務暫時失敗，這次不會扣使用次數，請稍後再試一次。'},{status:500});
  }
}
