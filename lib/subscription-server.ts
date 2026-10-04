import {createClient} from '@/lib/supabase/server';

export type TeamEntitlements={
  plan_code:'free'|'pro';
  plan_name:string;
  student_limit:number|null;
  training_history_months:number|null;
  monthly_ocr_imports:number|null;
  pdf_level:'basic'|'custom';
  features:Record<string,boolean>;
  status:string;
};

export async function getCurrentTeamEntitlements(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId)return {supabase,userId:null,teamId:null,entitlements:null as TeamEntitlements|null};

  const {data:membership}=await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id',userId)
    .limit(1)
    .maybeSingle();
  const teamId=membership?.team_id??null;
  if(!teamId)return {supabase,userId,teamId:null,entitlements:null as TeamEntitlements|null};

  const {data}=await supabase.rpc('get_team_entitlements',{target_team:teamId});
  return {supabase,userId,teamId,entitlements:(data??null) as TeamEntitlements|null};
}

export function hasPlanFeature(entitlements:TeamEntitlements|null,feature:string){
  return Boolean(entitlements?.features?.[feature]);
}

export function friendlyPlanError(message:string){
  const match=message.match(/FREE_STUDENT_LIMIT_REACHED:(\d+)/);
  if(match)return `免費版最多可使用 ${match[1]} 位啟用中的學生；可先停用不使用的學生，或升級菁英版。`;
  return message;
}
