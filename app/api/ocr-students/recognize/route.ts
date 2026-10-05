import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {getCloudflareContext} from '@opennextjs/cloudflare';

const MAX_FILE_BYTES=6*1024*1024;
const MAX_IMAGES=5;
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp']);
const FIELD_KEYS=['display_name','grade','class_name','seat_number','gender'] as const;
type FieldKey=typeof FIELD_KEYS[number];
type Row={display_name:string;grade:number|null;class_name:string|null;seat_number:number|null;gender:string|null;confidence:number|null};

function requestedFields(raw:FormDataEntryValue|null):FieldKey[]{
  try{const values=JSON.parse(String(raw??'[]'));if(!Array.isArray(values))return [...FIELD_KEYS];const fields=FIELD_KEYS.filter(k=>values.includes(k));if(!fields.includes('display_name'))fields.unshift('display_name');return fields;}catch{return [...FIELD_KEYS];}
}

function normalizeRow(row:any,fields:FieldKey[]):Row{
  const grade=Number(row?.grade??row?.年級);const seat=Number(row?.seat_number??row?.seat??row?.座號);const gender=String(row?.gender??row?.性別??'').trim();
  return {display_name:String(row?.display_name??row?.name??row?.姓名??'').trim(),grade:fields.includes('grade')&&Number.isInteger(grade)&&grade>=1&&grade<=6?grade:null,class_name:fields.includes('class_name')?(String(row?.class_name??row?.class??row?.班級??'').trim()||null):null,seat_number:fields.includes('seat_number')&&Number.isInteger(seat)&&seat>=1&&seat<=99?seat:null,gender:fields.includes('gender')&&['男','女','其他'].includes(gender)?gender:null,confidence:typeof row?.confidence==='number'?Math.max(0,Math.min(1,row.confidence)):.82};
}

function dedupe(rows:Row[]){const seen=new Set<string>();return rows.filter(r=>{const key=r.display_name.trim();if(!key||seen.has(key))return false;seen.add(key);return true;});}

const BANNED=new Set(['姓名','學生','名單','班級','年級','座號','性別','日期','補課','課後','工作天','男','女','圖片','照片','文字','表格','內容','點名票','作業單','點數紀錄表','點數紀錄','紀錄表','工作表']);

function parseRows(text:string,fields:FieldKey[]):Row[]{
  const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
  const candidates=[cleaned];const a=cleaned.indexOf('['),b=cleaned.lastIndexOf(']');if(a>=0&&b>a)candidates.push(cleaned.slice(a,b+1));
  for(const candidate of candidates){try{const parsed=JSON.parse(candidate);const source=Array.isArray(parsed)?parsed:Array.isArray(parsed?.rows)?parsed.rows:Array.isArray(parsed?.students)?parsed.students:[];const rows=source.map((row:any)=>normalizeRow(row,fields)).filter((r:Row)=>r.display_name&&r.display_name.length<=4&&!BANNED.has(r.display_name));if(rows.length)return dedupe(rows);}catch{}}
  const rows:Row[]=[];
  for(const raw of cleaned.split(/\r?\n/)){
    const line=raw.replace(/^\s*[-*•#\d.、)）]+\s*/,'').trim();if(!line)continue;
    const parts=line.split(/\t|\s{2,}|[,，|｜]/).map(x=>x.trim()).filter(Boolean);
    const matches=(parts.length?parts:[line]).flatMap(v=>v.match(/[\u3400-\u9fff·]{2,4}/g)??[]);
    const name=matches.find(v=>v.length>=2&&v.length<=4&&!BANNED.has(v));if(!name)continue;
    const others=parts.filter(p=>!p.includes(name));const row:any={display_name:name,grade:null,class_name:null,seat_number:null,gender:null,confidence:.82};
    if(fields.includes('class_name'))row.class_name=others.find(t=>/^\d{3}$/.test(t)||/^[一二三四五六1-6][甲乙丙丁戊己A-Za-z0-9]*班?$/.test(t))??null;
    if(fields.includes('grade')){const g=others.find(t=>/^[1-6]$/.test(t));row.grade=g?Number(g):(row.class_name&&/^\d{3}$/.test(row.class_name)?Number(row.class_name[0]):null);}
    if(fields.includes('seat_number')){const nums=others.filter(t=>/^\d{1,2}$/.test(t)).map(Number);row.seat_number=nums.length?nums.at(-1):null;}
    if(fields.includes('gender'))row.gender=others.find(t=>t==='男'||t==='女'||t==='其他')??null;
    rows.push(normalizeRow(row,fields));
  }
  return dedupe(rows.filter(r=>r.display_name));
}

function promptFor(fields:FieldKey[],part:number,total:number){
  if(fields.length===1)return `這是台灣學生名單的第 ${part}/${total} 段裁切圖。只讀學生姓名欄，由上到下逐行輸出繁體中文姓名，每行一個。姓名通常 2 到 4 個中文字。不要輸出數字、班級、座號、性別、日期、工作表名稱、註記或任何解釋。`;
  const labels:Record<FieldKey,string>={display_name:'姓名',grade:'年級',class_name:'班級',seat_number:'座號',gender:'性別'};const selected=fields.map(f=>labels[f]).join('、');
  return `這是台灣學生名單第 ${part}/${total} 段裁切圖。只辨識：${selected}。由上到下逐列輸出，每列欄位用 TAB 分隔。不要輸出日期、出席、補課、工作表名稱等其他內容。姓名保留繁體中文；最左側流水號不是座號。`;
}

async function withTimeout<T>(promise:Promise<T>,ms:number,label='AI_TIMEOUT'):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([promise,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),ms);})]);}finally{if(timer)clearTimeout(timer);}}
function toDataUri(bytes:Uint8Array,type:string){let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return `data:${type};base64,${btoa(binary)}`;}
function extractConvertedText(result:any){if(Array.isArray(result))return String(result[0]?.data??result[0]?.text??'').trim();return String(result?.data??result?.text??result?.result?.data??'').trim();}

export async function POST(request:Request){
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)return NextResponse.json({ok:false,error:'尚未登入'},{status:401});
  const {data:quotaData,error:quotaError}=await supabase.rpc('get_current_ocr_usage');if(quotaError)return NextResponse.json({ok:false,error:quotaError.message},{status:500});
  const quota=Array.isArray(quotaData)?quotaData[0]:quotaData;if(quota?.monthly_limit!=null&&Number(quota.remaining??0)<=0)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:`本月照片文字辨識額度已用完（${quota.used}/${quota.monthly_limit} 次）`},{status:429});

  const formData=await request.formData();const fields=requestedFields(formData.get('fields'));
  let files=formData.getAll('images').filter(v=>v instanceof File) as File[];if(!files.length){const single=formData.get('image');if(single instanceof File)files=[single];}
  files=files.slice(0,MAX_IMAGES);
  if(!files.length)return NextResponse.json({ok:false,error:'請先選擇學生名單照片'},{status:400});
  for(const file of files){if(!ALLOWED_TYPES.has(file.type))return NextResponse.json({ok:false,error:'目前支援 JPG、PNG、WebP 圖片'},{status:400});if(file.size>MAX_FILE_BYTES)return NextResponse.json({ok:false,error:'圖片過大，請壓縮至 6MB 以下'},{status:400});}

  try{
    const {env}=getCloudflareContext();const AI=(env as any)?.AI;if(!AI)return NextResponse.json({ok:false,error:'照片辨識服務尚未連線，請稍後再試'},{status:503});
    const started=Date.now();
    const prepared=await Promise.all(files.map(async file=>{const bytes=new Uint8Array(await file.arrayBuffer());return {file,bytes,image:toDataUri(bytes,file.type)};}));

    const visionResults=await Promise.all(prepared.map(async(p,index)=>{
      try{const value:any=await withTimeout(AI.run('@cf/moondream/moondream3.1-9B-A2B',{task:'query',image:p.image,question:promptFor(fields,index+1,prepared.length),reasoning:false,stream:false,temperature:0,max_tokens:1800}),18000,'VISION_TIMEOUT');return {text:String(value?.answer??value?.caption??'').trim(),error:''};}
      catch(error:any){return {text:'',error:String(error?.message??error)};}
    }));

    let rows=dedupe(visionResults.flatMap(r=>r.text?parseRows(r.text,fields):[]));let method='segmented-moondream';let bestText=visionResults.map(r=>r.text).filter(Boolean).join('\n');

    if(!rows.length){
      const documentResults=await Promise.all(prepared.map(async(p,index)=>{
        try{const value:any=await withTimeout(AI.toMarkdown({name:`roster-part-${index+1}.jpg`,blob:new Blob([p.bytes],{type:p.file.type})},{conversionOptions:{output:{format:'text'},image:{descriptionLanguage:'zh-TW'}}}),22000,'DOCUMENT_TIMEOUT');return extractConvertedText(value);}catch{return '';}
      }));
      bestText=documentResults.filter(Boolean).join('\n');rows=dedupe(documentResults.flatMap(t=>t?parseRows(t,fields):[]));method='segmented-tomarkdown';
    }

    if(!rows.length&&bestText){
      try{const cleanResult:any=await withTimeout(AI.run('@cf/google/gemma-4-26b-a4b-it',{messages:[{role:'system',content:'你是台灣學生名單文字整理助手。只能根據提供文字整理，不可新增姓名。'},{role:'user',content:`只整理出學生姓名，由上到下每行一個繁體中文姓名，姓名通常 2 到 4 個中文字。排除「點名票、作業單、點數紀錄表」等工作表名稱。不要說明。\n\n${bestText.slice(0,12000)}`}],max_tokens:1600,temperature:0}),8000,'CLEANUP_TIMEOUT');const cleaned=String(cleanResult?.response??cleanResult?.answer??cleanResult?.text??cleanResult?.result??'').trim();rows=parseRows(cleaned,fields);if(rows.length)method='segmented-ai-cleanup';}catch{}
    }

    if(!rows.length){console.error('segmented OCR no rows',{elapsed:Date.now()-started,visionErrors:visionResults.map(r=>r.error),preview:bestText.slice(0,800),fields,parts:files.length});return NextResponse.json({ok:false,code:'OCR_NO_ROWS',error:'系統已讀取裁切區域，但仍沒有整理出可靠的學生姓名。這次不扣使用次數。請重新框小一點，讓姓名文字佔滿畫面後再試。'},{status:422});}

    const {data:consumeData,error:consumeError}=await supabase.rpc('consume_ocr_import');if(consumeError)return NextResponse.json({ok:false,error:consumeError.message},{status:500});const consumed=Array.isArray(consumeData)?consumeData[0]:consumeData;if(!consumed?.allowed)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:'本月照片文字辨識額度已用完'},{status:429});
    return NextResponse.json({ok:true,rows,fields,method,parts:files.length,elapsedMs:Date.now()-started,quota:{used:Number(consumed.used??0),monthlyLimit:consumed.monthly_limit==null?null:Number(consumed.monthly_limit),remaining:consumed.remaining==null?null:Number(consumed.remaining)}});
  }catch(error:any){console.error('ocr-students failed',error);return NextResponse.json({ok:false,error:'照片辨識服務暫時失敗，這次不會扣使用次數，請稍後再試。'},{status:500});}
}
