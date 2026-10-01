import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub)return NextResponse.json({error:'unauthorized'},{status:401});
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId)return NextResponse.json({patterns:[]});
  const {data,error}=await supabase.from('aircon_fee_group_patterns').select('group_id,weekday,start_time,end_time,default_count').eq('team_id',teamId).order('weekday').order('start_time');
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({patterns:data??[]});
}
