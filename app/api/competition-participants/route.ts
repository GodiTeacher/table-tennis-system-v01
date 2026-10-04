import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getCoachContext(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId) return {error:NextResponse.json({ok:false,error:'尚未登入'},{status:401})};
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',userId).single();
  if(!profile||!['admin','coach'].includes(profile.role)) return {error:NextResponse.json({ok:false,error:'沒有權限'},{status:403})};
  return {supabase};
}

const conflictMessage=(message:string)=>message.includes('duplicate')||message.includes('unique')?'同一位學生在這一天的相同組別已經存在':message;

export async function POST(request:Request){
  const ctx=await getCoachContext();
  if('error' in ctx) return ctx.error;
  const {supabase}=ctx;
  const formData=await request.formData();
  const intent=String(formData.get('intent')??'add');
  const competitionId=String(formData.get('competition_id')??'').trim();
  if(!competitionId) return NextResponse.json({ok:false,error:'缺少比賽資料'},{status:400});

  if(intent==='update_team'){
    const oldDate=String(formData.get('old_competition_date')??'').trim();
    const oldCategory=String(formData.get('old_category')??'').trim();
    const competitionDate=String(formData.get('competition_date')??'').trim();
    const category=String(formData.get('category')??'').trim();
    const competitorIds=[...new Set(formData.getAll('competitor_student_ids').map(String).filter(Boolean))];
    const reserveIds=[...new Set(formData.getAll('reserve_student_ids').map(String).filter(Boolean))];
    const overlap=competitorIds.filter(id=>reserveIds.includes(id));
    const studentIds=[...new Set([...competitorIds,...reserveIds])];

    if(!oldDate||!oldCategory||!competitionDate||!category||!studentIds.length){
      return NextResponse.json({ok:false,error:'請確認隊伍日期、組別，並至少保留一位參賽或後備選手'},{status:400});
    }
    if(overlap.length){
      return NextResponse.json({ok:false,error:'同一位選手不能同時設定為參賽與後備'},{status:400});
    }

    const {data:oldRows,error:oldError}=await supabase
      .from('competition_participants')
      .select('id,student_id,participant_role')
      .eq('competition_id',competitionId)
      .eq('competition_date',oldDate)
      .eq('category',oldCategory);
    if(oldError) return NextResponse.json({ok:false,error:oldError.message},{status:500});
    if(!oldRows?.length) return NextResponse.json({ok:false,error:'找不到這個隊伍，請重新整理後再試'},{status:404});

    const oldIds=new Set(oldRows.map((r:any)=>String(r.id)));
    const oldByStudent=new Map(oldRows.map((r:any)=>[String(r.student_id),String(r.id)]));

    const {data:targetRows,error:targetError}=await supabase
      .from('competition_participants')
      .select('id,student_id')
      .eq('competition_id',competitionId)
      .eq('competition_date',competitionDate)
      .eq('category',category)
      .in('student_id',studentIds);
    if(targetError) return NextResponse.json({ok:false,error:targetError.message},{status:500});
    const outsideConflict=(targetRows??[]).find((r:any)=>!oldIds.has(String(r.id)));
    if(outsideConflict) return NextResponse.json({ok:false,error:'有勾選的學生已存在於目標日期與組別，請先確認名單'},{status:409});

    const desiredRole=new Map<string,'competitor'|'reserve'>();
    competitorIds.forEach(id=>desiredRole.set(id,'competitor'));
    reserveIds.forEach(id=>desiredRole.set(id,'reserve'));

    const retained=studentIds.filter(id=>oldByStudent.has(id));
    const addedIds=studentIds.filter(id=>!oldByStudent.has(id));
    const removedRowIds=oldRows.filter((r:any)=>!desiredRole.has(String(r.student_id))).map((r:any)=>String(r.id));

    const retainedCompetitors=retained.filter(id=>desiredRole.get(id)==='competitor').map(id=>oldByStudent.get(id)!).filter(Boolean);
    const retainedReserves=retained.filter(id=>desiredRole.get(id)==='reserve').map(id=>oldByStudent.get(id)!).filter(Boolean);

    if(retainedCompetitors.length){
      const {error}=await supabase.from('competition_participants')
        .update({competition_date:competitionDate,category,participant_role:'competitor'})
        .eq('competition_id',competitionId).in('id',retainedCompetitors);
      if(error) return NextResponse.json({ok:false,error:conflictMessage(String(error.message||''))},{status:409});
    }
    if(retainedReserves.length){
      const {error}=await supabase.from('competition_participants')
        .update({competition_date:competitionDate,category,participant_role:'reserve'})
        .eq('competition_id',competitionId).in('id',retainedReserves);
      if(error) return NextResponse.json({ok:false,error:conflictMessage(String(error.message||''))},{status:409});
    }

    if(addedIds.length){
      const rows=addedIds.map(studentId=>({
        competition_id:competitionId,
        student_id:studentId,
        competition_date:competitionDate,
        category,
        participant_role:desiredRole.get(studentId)??'competitor',
      }));
      const {error}=await supabase.from('competition_participants').insert(rows);
      if(error) return NextResponse.json({ok:false,error:conflictMessage(String(error.message||''))},{status:409});
    }

    if(removedRowIds.length){
      const {error}=await supabase.from('competition_participants').delete().eq('competition_id',competitionId).in('id',removedRowIds);
      if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
    }

    return NextResponse.json({ok:true,updated:retained.length,added:addedIds.length,removed:removedRowIds.length,competitors:competitorIds.length,reserves:reserveIds.length});
  }

  if(intent==='update'){
    const participantId=String(formData.get('participant_id')??'').trim();
    const competitionDate=String(formData.get('competition_date')??'').trim();
    const category=String(formData.get('category')??'').trim();
    const participantRole=String(formData.get('participant_role')??'competitor');
    if(!participantId||!competitionDate||!category||!['competitor','reserve'].includes(participantRole)){
      return NextResponse.json({ok:false,error:'請確認比賽日期、組別與身分'},{status:400});
    }
    const {data:row,error:lookupError}=await supabase.from('competition_participants').select('id').eq('id',participantId).eq('competition_id',competitionId).maybeSingle();
    if(lookupError) return NextResponse.json({ok:false,error:lookupError.message},{status:500});
    if(!row) return NextResponse.json({ok:false,error:'找不到這筆參賽資料，請重新整理頁面'},{status:404});
    const {error}=await supabase.from('competition_participants').update({competition_date:competitionDate,category,participant_role:participantRole}).eq('id',participantId).eq('competition_id',competitionId);
    if(error) return NextResponse.json({ok:false,error:conflictMessage(String(error.message||''))},{status:409});
    return NextResponse.json({ok:true,updated:1});
  }

  const competitionDate=String(formData.get('competition_date')??'').trim();
  const category=String(formData.get('category')??'').trim();
  const participantRole=String(formData.get('participant_role')??'competitor');
  const studentIds=[...new Set(formData.getAll('student_ids').map(String).filter(Boolean))];
  if(!competitionDate||!category||!studentIds.length||!['competitor','reserve'].includes(participantRole)){
    return NextResponse.json({ok:false,error:'請選擇比賽日期、填寫組別並至少勾選一位學生'},{status:400});
  }

  const {data:existing,error:existingError}=await supabase
    .from('competition_participants')
    .select('student_id')
    .eq('competition_id',competitionId)
    .eq('competition_date',competitionDate)
    .eq('category',category)
    .in('student_id',studentIds);
  if(existingError) return NextResponse.json({ok:false,error:existingError.message},{status:500});
  const existingIds=new Set((existing??[]).map((r:any)=>String(r.student_id)));
  const newIds=studentIds.filter(id=>!existingIds.has(id));
  if(newIds.length){
    const rows=newIds.map(studentId=>({competition_id:competitionId,student_id:studentId,competition_date:competitionDate,category,participant_role:participantRole}));
    const {error}=await supabase.from('competition_participants').insert(rows);
    if(error){
      const msg=String(error.message||'');
      if(!(msg.includes('duplicate')||msg.includes('unique'))) return NextResponse.json({ok:false,error:msg},{status:500});
      return NextResponse.json({ok:true,added:0,skipped:studentIds.length});
    }
  }
  return NextResponse.json({ok:true,added:newIds.length,skipped:studentIds.length-newIds.length});
}
