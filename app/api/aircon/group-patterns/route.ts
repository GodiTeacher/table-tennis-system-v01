import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)return NextResponse.json({error:'unauthorized'},{status:401});
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)return NextResponse.json({patterns:[],templates:[]});
  const {data:allowed}=await supabase.rpc('team_can_use',{target_team:teamId,feature_key:'finance'});
  if(!allowed)return NextResponse.json({error:'此功能為菁英版功能，請先升級方案。',code:'PRO_REQUIRED'},{status:403});
  const [{data:patterns,error:pError},{data:templates,error:tError}]=await Promise.all([
    supabase.from('aircon_fee_group_patterns').select('group_id,weekday,start_time,end_time,default_count').eq('team_id',teamId).order('weekday').order('start_time'),
    supabase.from('attendance_templates').select('id,weekday,start_time,end_time,default_count,note').eq('team_id',teamId).eq('mode','count').eq('active',true).order('weekday').order('start_time'),
  ]);
  if(pError||tError)return NextResponse.json({error:pError?.message||tError?.message},{status:500});
  return NextResponse.json({patterns:patterns??[],templates:templates??[]});
}
