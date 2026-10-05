import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {getCloudflareContext} from '@opennextjs/cloudflare';

const MAX_FILE_BYTES=6*1024*1024;
const MAX_IMAGES=8;
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp']);
type Row={display_name:string;grade:null;class_name:null;seat_number:null;gender:null;confidence:number|null};

const BANNED=new Set(['姓名','學生','名單','班級','年級','座號','性別','日期','補課','課後','工作天','男','女','圖片','照片','文字','表格','內容','點名票','作業單','點數紀錄表','點數紀錄','紀錄表','工作表']);

function makeRow(name:string,confidence=.84):Row{return {display_name:name.trim(),grade:null,class_name:null,seat_number:null,gender:null,confidence};}
function dedupe(rows:Row[]){const seen=new Set<string>();return rows.filter(r=>{const key=r.display_name.trim();if(!key||seen.has(key))return false;seen.add(key);return true;});}
function parseNames(text:string):Row[]{
  const cleaned=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
  if(!cleaned)return [];
  const candidates=[cleaned];const a=cleaned.indexOf('['),b=cleaned.lastIndexOf(']');if(a>=0&&b>a)candidates.push(cleaned.slice(a,b+1));
  for(const candidate of candidates){
    try{
      const parsed=JSON.parse(candidate);const source=Array.isArray(parsed)?parsed:Array.isArray(parsed?.rows)?parsed.rows:Array.isArray(parsed?.students)?parsed.students:[];
      const rows=source.map((r:any)=>makeRow(String(r?.display_name??r?.name??r?.姓名??''),typeof r?.confidence==='number'?r.confidence:.88)).filter((r:Row)=>/^[\u3400-\u9fff·]{2,4}$/.test(r.display_name)&&!BANNED.has(r.display_name));
      if(rows.length)return dedupe(rows);
    }catch{}
  }
  const rows:Row[]=[];
  for(const raw of cleaned.split(/\r?\n/)){
    const line=raw.replace(/^\s*[-*•#\d.、)）]+\s*/,'').trim();
    if(!line)continue;
    const matches=line.match(/[\u3400-\u9fff·]{2,4}/g)??[];
    for(const name of matches){if(!BANNED.has(name))rows.push(makeRow(name,.82));}
  }
  return dedupe(rows);
}

async function withTimeout<T>(promise:Promise<T>,ms:number,label:string):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([promise,new Promise<T>((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),ms);})]);}finally{if(timer)clearTimeout(timer);}}
function toDataUri(bytes:Uint8Array,type:string){let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return `data:${type};base64,${btoa(binary)}`;}
function extractConvertedText(result:any){if(Array.isArray(result))return String(result[0]?.data??result[0]?.text??'').trim();return String(result?.data??result?.text??result?.result?.data??'').trim();}
function prompt(part:number,total:number){return `這是台灣學生名單姓名欄的第 ${part}/${total} 段。只讀由上到下的學生姓名，每行一個繁體中文姓名。姓名通常 2 到 4 個中文字。不要輸出數字、班級、座號、性別、工作表名稱、標題、註記或解釋。即使只有一部分姓名也要全部列出。`;}

export async function POST(request:Request){
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)return NextResponse.json({ok:false,error:'尚未登入'},{status:401});
  const {data:quotaData,error:quotaError}=await supabase.rpc('get_current_ocr_usage');if(quotaError)return NextResponse.json({ok:false,error:quotaError.message},{status:500});
  const quota=Array.isArray(quotaData)?quotaData[0]:quotaData;if(quota?.monthly_limit!=null&&Number(quota.remaining??0)<=0)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:`本月照片文字辨識額度已用完（${quota.used}/${quota.monthly_limit} 次）`},{status:429});

  const formData=await request.formData();let files=formData.getAll('images').filter(v=>v instanceof File) as File[];if(!files.length){const single=formData.get('image');if(single instanceof File)files=[single];}files=files.slice(0,MAX_IMAGES);
  if(!files.length)return NextResponse.json({ok:false,error:'請先選擇學生名單照片'},{status:400});
  for(const file of files){if(!ALLOWED_TYPES.has(file.type))return NextResponse.json({ok:false,error:'目前支援 JPG、PNG、WebP 圖片'},{status:400});if(file.size>MAX_FILE_BYTES)return NextResponse.json({ok:false,error:'圖片過大，請壓縮至 6MB 以下'},{status:400});}

  try{
    const {env}=getCloudflareContext();const AI=(env as any)?.AI;if(!AI)return NextResponse.json({ok:false,error:'照片辨識服務尚未連線，請稍後再試'},{status:503});
    const started=Date.now();
    const prepared=await Promise.all(files.map(async file=>{const bytes=new Uint8Array(await file.arrayBuffer());return {file,bytes,image:toDataUri(bytes,file.type)};}));

    const segmentResults=await Promise.all(prepared.map(async(p,index)=>{
      let visionText='';let documentText='';
      try{const value:any=await withTimeout(AI.run('@cf/moondream/moondream3.1-9B-A2B',{task:'query',image:p.image,question:prompt(index+1,prepared.length),reasoning:false,stream:false,temperature:0,max_tokens:900}),15000,'VISION_TIMEOUT');visionText=String(value?.answer??value?.caption??'').trim();}catch{}
      let rows=parseNames(visionText);
      if(rows.length<3){
        try{const value:any=await withTimeout(AI.toMarkdown({name:`roster-part-${index+1}.jpg`,blob:new Blob([p.bytes],{type:p.file.type})},{conversionOptions:{output:{format:'text'},image:{descriptionLanguage:'zh-TW'}}}),18000,'DOCUMENT_TIMEOUT');documentText=extractConvertedText(value);}catch{}
        const docRows=parseNames(documentText);
        if(docRows.length){rows=dedupe([...rows,...docRows]);}
      }
      if(rows.length<2&&(visionText||documentText)){
        try{const source=`${visionText}\n${documentText}`.slice(0,4000);const cleaned:any=await withTimeout(AI.run('@cf/google/gemma-4-26b-a4b-it',{messages:[{role:'system',content:'你只負責從 OCR 文字找出台灣學生姓名，不得新增不存在的人名。'},{role:'user',content:`從以下文字只列出學生姓名，一行一個，保持原順序。排除標題與工作表名稱。\n${source}`}],temperature:0,max_tokens:700}),6000,'CLEANUP_TIMEOUT');rows=dedupe([...rows,...parseNames(String(cleaned?.response??cleaned?.answer??cleaned?.text??''))]);}catch{}
      }
      return {index,rows,raw:[visionText,documentText].filter(Boolean).join('\n')};
    }));

    const ordered=segmentResults.sort((a,b)=>a.index-b.index).flatMap(r=>r.rows);
    let rows=dedupe(ordered);

    const combinedRaw=segmentResults.sort((a,b)=>a.index-b.index).map((r,i)=>r.raw?`【第${i+1}段】\n${r.raw}`:'').filter(Boolean).join('\n\n').slice(0,14000);
    if(combinedRaw&&rows.length<18){
      try{
        const cleaned:any=await withTimeout(AI.run('@cf/google/gemma-4-26b-a4b-it',{
          messages:[
            {role:'system',content:'你是台灣學生名單 OCR 校正器。只能從提供的 OCR 原文找出實際出現的學生姓名，不可自行猜測或補造姓名。'},
            {role:'user',content:`以下是同一個姓名欄由上到下分段 OCR 的原始結果。請綜合所有段落，盡量完整找出學生姓名並維持由上到下順序。姓名通常 2～4 個繁體中文字。相鄰分段可能重複，重複姓名只保留一次。排除「姓名、學生、點名票、作業單、點數紀錄表、工作表」等標題。只輸出 JSON 陣列，例如 [{"display_name":"王小明"}]，不要說明。\n\n${combinedRaw}`}
          ],temperature:0,max_tokens:1800
        }),9000,'GLOBAL_CLEANUP_TIMEOUT');
        const recovered=parseNames(String(cleaned?.response??cleaned?.answer??cleaned?.text??cleaned?.result??''));
        if(recovered.length>rows.length)rows=recovered;
        else if(recovered.length)rows=dedupe([...rows,...recovered]);
      }catch{}
    }

    if(!rows.length)return NextResponse.json({ok:false,code:'OCR_NO_ROWS',error:'系統已讀取裁切區域，但仍沒有整理出可靠的學生姓名。這次不扣使用次數；請把框選範圍縮小到只剩姓名欄再試。'},{status:422});

    const {data:consumeData,error:consumeError}=await supabase.rpc('consume_ocr_import');if(consumeError)return NextResponse.json({ok:false,error:consumeError.message},{status:500});const consumed=Array.isArray(consumeData)?consumeData[0]:consumeData;if(!consumed?.allowed)return NextResponse.json({ok:false,code:'OCR_LIMIT_REACHED',error:'本月照片文字辨識額度已用完'},{status:429});
    return NextResponse.json({ok:true,rows,fields:['display_name'],method:'ordered-segment-name-ocr-v2',parts:files.length,elapsedMs:Date.now()-started,quota:{used:Number(consumed.used??0),monthlyLimit:consumed.monthly_limit==null?null:Number(consumed.monthly_limit),remaining:consumed.remaining==null?null:Number(consumed.remaining)}});
  }catch(error:any){console.error('ocr-students failed',error);return NextResponse.json({ok:false,error:'照片辨識服務暫時失敗，這次不會扣使用次數，請稍後再試。'},{status:500});}
}
