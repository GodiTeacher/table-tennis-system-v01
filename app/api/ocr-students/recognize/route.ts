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

function normalizeRow(row:any,fields:FieldKey[]):Row{
  const grade=Number(row?.grade??row?.年級);
  const seat=Number(row?.seat_number??row?.seat??row?.座號);
  const gender=String(row?.gender??row?.性別??'').trim();
  return {
    display_name:String(row?.display_name??row?.name??row?.姓名??'').trim(),
    grade:fields.includes('grade')&&Number.isInteger(grade)&&grade>=1&&grade<=6?grade:null,
    class_name:fields.includes('class_name')?(String(row?.class_name??row?.class??row?.班級??'').trim()||null):null,
    seat_number:fields.includes('seat_number')&&Number.isInteger(seat)&&seat>=1&&seat<=99?seat:null,
    gender:fields.includes('gender')&&['男','女','其他'].includes(gender)?gender:null,
    confidence:typeof row?.confidence==='number'?Math.max(0,Math.min(1,row.confidence)):.78,
  };
}

function dedupe(rows:Row[]){
  const seen=new Set<string>();
  return rows.filter(r=>{const key=r.display_name.trim();if(!key||seen.has(key))return false;seen.add(key);return true;});
}

function parseRows(text:string,fields:FieldKey[]):Row[]{
  const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
  const candidates=[cleaned];
  const a=cleaned.indexOf('['),b=cleaned.lastIndexOf(']');
  if(a>=0&&b>a)candidates.push(cleaned.slice(a,b+1));
  for(const candidate of candidates){
    try{
      const parsed=JSON.parse(candidate);
      const source=Array.isArray(parsed)?parsed:Array.isArray(parsed?.rows)?parsed.rows:Array.isArray(parsed?.students)?parsed.students:[];
      const rows=source.map((row:any)=>normalizeRow(row,fields)).filter((r:Row)=>r.display_name);
      if(rows.length)return dedupe(rows);
    }catch{}
  }

  const banned=new Set(['姓名','學生','名單','班級','年級','座號','性別','日期','補課','課後','工作天','男','女']);
  const rows:Row[]=[];
  for(const raw of cleaned.split(/\r?\n/)){
    const line=raw.replace(/^\s*[-*•#\d.、)）]+\s*/,'').trim();
    if(!line)continue;
    const parts=line.split(/\t|\s{2,}|[,，|｜]/).map(x=>x.trim()).filter(Boolean);
    const matches=(parts.length?parts:[line]).flatMap(v=>v.match(/[\u3400-\u9fff·]{2,5}/g)??[]);
    const name=matches.find(v=>v.length>=2&&v.length<=5&&!banned.has(v));
    if(!name)continue;
    const others=parts.filter(p=>!p.includes(name));
    const row:any={display_name:name,grade:null,class_name:null,seat_number:null,gender:null,confidence:.76};
    if(fields.includes('class_name'))row.class_name=others.find(t=>/^\d{3}$/.test(t)||/^[一二三四五六1-6][甲乙丙丁戊己A-Za-z0-9]*班?$/.test(t))??null;
    if(fields.includes('grade')){
      const g=others.find(t=>/^[1-6]$/.test(t));
      row.grade=g?Number(g):(row.class_name&&/^\d{3}$/.test(row.class_name)?Number(row.class_name[0]):null);
    }
    if(fields.includes('seat_number')){
      const nums=others.filter(t=>/^\d{1,2}$/.test(t)).map(Number);
      row.seat_number=nums.length?nums.at(-1):null;
    }
    if(fields.includes('gender'))row.gender=others.find(t=>t==='男'||t==='女'||t==='其他')??null;
    rows.push(normalizeRow(row,fields));
  }
  return dedupe(rows.filter(r=>r.display_name));
}

function promptFor(fields:FieldKey[]){
  if(fields.length===1)return '從下面的 OCR 文字中，只找出台灣學生姓名。只輸出 JSON 陣列，格式 [{"display_name":"王小明","confidence":0.95}]。不要輸出班級、數字、性別、日期、註記或說明。';
  const labels:Record<FieldKey,string>={display_name:'姓名',grade:'年級',class_name:'班級',seat_number:'座號',gender:'性別'};
  const selected=fields.map(f=>labels[f]).join('、');
  return `從下面的 OCR 文字中整理學生資料，只抓：${selected}。只輸出 JSON 陣列。欄位使用 display_name、grade、class_name、seat_number、gender、confidence。不要把最左側流水號當座號。班級如 102/201/301 請保留原文，若有要求年級可用第一碼推定。`;
}

async function withTimeout<T>(promise:Promise<T>,ms:number):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([promise,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(new Error('AI_TIMEOUT')),ms);})]);}
  finally{if(timer)clearTimeout(timer);}
}

function extractConvertedText(result:any){
  if(Array.isArray(result))return String(result[0]?.data??result[0]?.text??'').trim();
  return String(result?.data??result?.text??result?.result?.data??'').trim();
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

    const started=Date.now();
    let extracted='';
    try{
      const converted:any=await withTimeout(AI.toMarkdown({name:file.name||'student-roster.jpg',blob:file},{conversionOptions:{output:{format:'text'},image:{descriptionLanguage:'zh-TW'}}}),10000);
      extracted=extractConvertedText(converted);
    }catch(error:any){
      const timedOut=String(error?.message??'')==='AI_TIMEOUT';
      console.error('toMarkdown OCR failed',{timedOut,error:String(error?.message??error),elapsed:Date.now()-started});
      return NextResponse.json({ok:false,code:timedOut?'OCR_TIMEOUT':'OCR_ENGINE_FAILED',error:timedOut?'文件辨識超過 10 秒，系統已停止。這次不扣使用次數，請再試一次。':'文件辨識引擎目前沒有正常回應。這次不扣使用次數，請再試一次。'},{status:504});
    }

    if(!extracted)return NextResponse.json({ok:false,code:'OCR_EMPTY',error:'文件辨識引擎沒有讀到文字。這次不扣使用次數，請再試一次。'},{status:422});

    let rows=parseRows(extracted,fields);
    let method='tomarkdown-direct';

    if(!rows.length){
      try{
        const result:any=await withTimeout(AI.run('@cf/google/gemma-4-26b-a4b-it',{
          messages:[
            {role:'system',content:'你是台灣學生名單資料整理助手，只能根據提供的 OCR 文字整理，不可自行猜測。'},
            {role:'user',content:`${promptFor(fields)}\n\nOCR文字：\n${extracted.slice(0,12000)}`},
          ],
          max_tokens:2500,
          temperature:0,
        }),7000);
        const answer=String(result?.response??result?.answer??result?.text??result?.result??'').trim();
        rows=parseRows(answer,fields);
        if(rows.length)method='tomarkdown-gemma-cleanup';
      }catch(error){console.error('OCR cleanup model failed',error);}
    }

    if(!rows.length){
      console.error('OCR text but no student rows',{elapsed:Date.now()-started,preview:extracted.slice(0,1200),fields});
      return NextResponse.json({ok:false,code:'OCR_NO_ROWS',error:'系統已讀到圖片文字，但仍沒有整理出學生姓名。這次不扣使用次數；請把這個訊息截圖給我們。'},{status:422});
    }

    const {data:consumeData,error:consumeError}=await supabase.rpc('consume_ocr_import');
    if(consumeError)return NextResponse.json({ok:false,error:consumeError.message},{status:500});
    const consumed=Array.isArray(consumeData)?consumeData[0]:consumeData;
    if(!consumed?.allowed)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:'本月照片文字辨識額度已用完'},{status:429});

    return NextResponse.json({ok:true,rows,fields,method,elapsedMs:Date.now()-started,quota:{used:Number(consumed.used??0),monthlyLimit:consumed.monthly_limit==null?null:Number(consumed.monthly_limit),remaining:consumed.remaining==null?null:Number(consumed.remaining)}});
  }catch(error:any){
    console.error('ocr-students failed',error);
    return NextResponse.json({ok:false,error:'照片辨識服務暫時失敗，這次不會扣使用次數，請稍後再試。'},{status:500});
  }
}
