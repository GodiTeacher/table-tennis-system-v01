import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {getCloudflareContext} from '@opennextjs/cloudflare';

const MAX_FILE_BYTES=6*1024*1024;
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp']);
const FIELD_KEYS=['display_name','grade','class_name','seat_number','gender'] as const;
type FieldKey=typeof FIELD_KEYS[number];

type Row={display_name:string;grade:number|null;class_name:string|null;seat_number:number|null;gender:string|null;confidence:number|null};

function requestedFields(raw:FormDataEntryValue|null):FieldKey[]{
  try{
    const values=JSON.parse(String(raw??'[]'));
    if(!Array.isArray(values))return [...FIELD_KEYS];
    const fields=FIELD_KEYS.filter(k=>values.includes(k));
    if(!fields.includes('display_name'))fields.unshift('display_name');
    return fields;
  }catch{return [...FIELD_KEYS];}
}

function normalizeRow(row:any):Row{
  const grade=Number(row?.grade??row?.年級);
  const seat=Number(row?.seat_number??row?.seat??row?.座號);
  const gender=String(row?.gender??row?.性別??'').trim();
  return {
    display_name:String(row?.display_name??row?.name??row?.姓名??'').trim(),
    grade:Number.isInteger(grade)&&grade>=1&&grade<=6?grade:null,
    class_name:String(row?.class_name??row?.class??row?.班級??'').trim()||null,
    seat_number:Number.isInteger(seat)&&seat>=1&&seat<=99?seat:null,
    gender:['男','女','其他'].includes(gender)?gender:null,
    confidence:typeof row?.confidence==='number'?Math.max(0,Math.min(1,row.confidence)):null,
  };
}

function parseJsonRows(text:string):Row[]{
  const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
  const candidates=[cleaned];
  const a=cleaned.indexOf('['),b=cleaned.lastIndexOf(']');
  if(a>=0&&b>a)candidates.push(cleaned.slice(a,b+1));
  const c=cleaned.indexOf('{'),d=cleaned.lastIndexOf('}');
  if(c>=0&&d>c)candidates.push(cleaned.slice(c,d+1));
  for(const candidate of candidates){
    try{
      const parsed=JSON.parse(candidate);
      const source=Array.isArray(parsed)?parsed:Array.isArray(parsed?.students)?parsed.students:Array.isArray(parsed?.rows)?parsed.rows:Array.isArray(parsed?.data)?parsed.data:[];
      const rows=source.map(normalizeRow).filter((r:Row)=>r.display_name);
      if(rows.length)return rows;
    }catch{}
  }
  return [];
}

function parsePlainRows(text:string,fields:FieldKey[]):Row[]{
  const banned=new Set(['姓名','學生','名單','班級','年級','座號','性別','日期','補課','課後','工作天']);
  const seen=new Set<string>();
  const rows:Row[]=[];
  for(const raw of text.split(/\r?\n/)){
    const line=raw.replace(/^\s*[-*•#\d.、)）]+\s*/,'').trim();
    if(!line)continue;
    const tokens=line.split(/\t|\s{2,}|[,，|｜]/).map(x=>x.trim()).filter(Boolean);
    const matches=(tokens.length?tokens:[line]).flatMap(v=>v.match(/[\u3400-\u9fff·]{2,5}/g)??[]);
    const name=matches.find(v=>v.length>=2&&v.length<=5&&!banned.has(v));
    if(!name||seen.has(name))continue;
    seen.add(name);
    let class_name:string|null=null,grade:number|null=null,seat_number:number|null=null,gender:string|null=null;
    const others=tokens.filter(t=>!t.includes(name));
    if(fields.includes('class_name'))class_name=others.find(t=>/^\d{3}$/.test(t)||/^[一二三四五六1-6][甲乙丙丁戊己A-Za-z0-9]*班?$/.test(t))??null;
    if(fields.includes('grade')){
      const g=others.find(t=>/^[1-6]$/.test(t));
      if(g)grade=Number(g); else if(class_name&&/^\d{3}$/.test(class_name))grade=Number(class_name[0]);
    }
    if(fields.includes('seat_number')){
      const nums=others.filter(t=>/^\d{1,2}$/.test(t)).map(Number);
      if(nums.length)seat_number=nums.at(-1)??null;
    }
    if(fields.includes('gender'))gender=(others.find(t=>t==='男'||t==='女'||t==='其他') as string|undefined)??null;
    rows.push({display_name:name,grade,class_name,seat_number,gender,confidence:.72});
  }
  return rows;
}

function parseAny(text:string,fields:FieldKey[]){
  const json=parseJsonRows(text);
  return json.length?json:parsePlainRows(text,fields);
}

function normalizeFields(rows:Row[],fields:FieldKey[]){
  return rows.map(r=>({...r,grade:fields.includes('grade')?r.grade:null,class_name:fields.includes('class_name')?r.class_name:null,seat_number:fields.includes('seat_number')?r.seat_number:null,gender:fields.includes('gender')?r.gender:null}));
}

function promptFor(fields:FieldKey[],plain=false){
  const labels:Record<FieldKey,string>={display_name:'姓名',grade:'年級',class_name:'班級',seat_number:'座號',gender:'性別'};
  if(fields.length===1){
    return plain
      ?'這是台灣學生名單。請只做 OCR：由上到下逐行抄出「姓名欄」的繁體中文姓名，每行一個姓名。不要輸出數字、班級、性別、日期、註記或任何說明。'
      :'請從這張台灣學生名單圖片中只辨識姓名欄。由上到下逐列讀取，只輸出 JSON 陣列，例如 [{"display_name":"王小明","confidence":0.95}]。不要輸出數字、班級、座號、性別、日期或註記；姓名保留繁體中文。';
  }
  const selected=fields.map(f=>labels[f]).join('、');
  return plain
    ?`請只做 OCR 抄錄。由上到下逐列抄出：${selected}，欄位用 TAB 分隔。不要抄日期、出席勾選、補課註記。姓名保留繁體中文。`
    :`請辨識這張台灣學生名單，只抓：${selected}。由上到下逐列輸出 JSON 陣列。欄位名稱使用 display_name、grade、class_name、seat_number、gender、confidence。沒有的欄位填 null。不要把最左側流水序號當座號。班級 102/201/301 類型請保留原文，若有要求年級可用第一碼推定。`;
}

function extractText(result:any){
  return String(result?.response??result?.answer??result?.text??result?.result?.response??result?.result?.text??result?.result??'').trim();
}

async function runGemma(AI:any,image:string,prompt:string){
  const system='你是繁體中文文件 OCR 助手。請精確閱讀圖片中的台灣學生姓名與表格文字，不要猜測模糊字。';
  try{
    const result:any=await AI.run('@cf/google/gemma-4-26b-a4b-it',{
      messages:[
        {role:'system',content:system},
        {role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:image}}]},
      ],
      max_tokens:5000,
      temperature:0,
    });
    const text=extractText(result);
    if(text)return text;
  }catch(error){console.error('gemma multimodal-content failed',error);}
  const result:any=await AI.run('@cf/google/gemma-4-26b-a4b-it',{
    messages:[{role:'system',content:system},{role:'user',content:prompt}],image,max_tokens:5000,temperature:0,
  });
  return extractText(result);
}

async function runLlama(AI:any,image:string,prompt:string){
  const result:any=await AI.run('@cf/meta/llama-3.2-11b-vision-instruct',{
    messages:[{role:'system',content:'你是繁體中文 OCR 助手。'},{role:'user',content:prompt}],image,max_tokens:4500,temperature:0,
  });
  return extractText(result);
}

async function runMoondream(AI:any,image:string,prompt:string){
  const result:any=await AI.run('@cf/moondream/moondream3.1-9B-A2B',{task:'query',image,question:prompt,reasoning:false,stream:false,temperature:0,max_tokens:4000});
  return String(result?.answer??result?.caption??'').trim();
}

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)return NextResponse.json({ok:false,error:'尚未登入'},{status:401});

  const {data:quotaData,error:quotaError}=await supabase.rpc('get_current_ocr_usage');
  if(quotaError)return NextResponse.json({ok:false,error:quotaError.message},{status:500});
  const quota=Array.isArray(quotaData)?quotaData[0]:quotaData;
  if(quota?.monthly_limit!=null&&Number(quota.remaining??0)<=0)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:`本月照片文字辨識額度已用完（${quota.used}/${quota.monthly_limit} 次）`},{status:429});

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
    let binary='';
    for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    const image=`data:${file.type};base64,${btoa(binary)}`;

    let rows:Row[]=[]; let answer=''; let method='';
    try{answer=await runGemma(AI,image,promptFor(fields,false));rows=parseAny(answer,fields);if(rows.length)method='gemma4-multimodal';}catch(e){console.error('gemma structured failed',e);}
    if(!rows.length)try{answer=await runGemma(AI,image,promptFor(fields,true));rows=parseAny(answer,fields);if(rows.length)method='gemma4-plain';}catch(e){console.error('gemma plain failed',e);}
    if(!rows.length)try{answer=await runLlama(AI,image,promptFor(fields,true));rows=parseAny(answer,fields);if(rows.length)method='llama';}catch(e){console.error('llama failed',e);}
    if(!rows.length)try{answer=await runMoondream(AI,image,promptFor(fields,true));rows=parseAny(answer,fields);if(rows.length)method='moondream';}catch(e){console.error('moondream failed',e);}

    rows=normalizeFields(rows,fields);
    if(!rows.length){
      console.error('ocr no rows',{fields,answer:answer.slice(0,1200)});
      return NextResponse.json({ok:false,code:'OCR_NO_ROWS',error:'圖片很清楚，但目前仍沒有成功讀到姓名。這次不扣使用次數；我們已修正圖片傳給視覺模型的方式，請更新後再用同一張照片測試。'},{status:422});
    }

    const {data:consumeData,error:consumeError}=await supabase.rpc('consume_ocr_import');
    if(consumeError)return NextResponse.json({ok:false,error:consumeError.message},{status:500});
    const consumed=Array.isArray(consumeData)?consumeData[0]:consumeData;
    if(!consumed?.allowed)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:'本月照片文字辨識額度已用完'},{status:429});

    return NextResponse.json({ok:true,rows,fields,method,quota:{used:Number(consumed.used??0),monthlyLimit:consumed.monthly_limit==null?null:Number(consumed.monthly_limit),remaining:consumed.remaining==null?null:Number(consumed.remaining)}});
  }catch(error){
    console.error('ocr-students failed',error);
    return NextResponse.json({ok:false,error:'照片辨識服務暫時失敗，這次不會扣使用次數，請稍後再試。'},{status:500});
  }
}
