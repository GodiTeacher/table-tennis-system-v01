import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)return NextResponse.json({error:'unauthorized'},{status:401});
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)return NextResponse.json({patterns:[],templates:[]});
  const [{data:patterns,error:pError},{data:templates,error:tError}]=await Promise.all([
    supabase.from('aircon_fee_group_patterns').select('group_id,weekday,start_time,end_time,default_count').eq('team_id',teamId).order('weekday').order('start_time'),
    supabase.from('attendance_templates').select('id,weekday,start_time,end_time,default_count,note').eq('team_id',teamId).eq('mode','count').eq('active',true).order('weekday').order('start_time'),
  ]);
  if(pError||tError)return NextResponse.json({error:pError?.message||tError?.message},{status:500});
  return NextResponse.json({patterns:patterns??[],templates:templates??[]});
}
