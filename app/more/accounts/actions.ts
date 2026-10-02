'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function checked(formData:FormData,key:string){return formData.get(`perm_${key}`)==='on';}
function permissionsFromForm(formData:FormData){
  const granular={
    student_profiles:checked(formData,'student_profiles'),
    attendance:checked(formData,'attendance'),
    points:checked(formData,'points'),
    training_plans:checked(formData,'training_plans'),
    training_history:checked(formData,'training_history'),
    assessment:checked(formData,'assessment'),
    competitions_manage:checked(formData,'competitions_manage'),
    transport:checked(formData,'transport'),
    competition_rubbers:checked(formData,'competition_rubbers'),
    equipment_catalog:checked(formData,'equipment_catalog'),
    equipment_inventory:checked(formData,'equipment_inventory'),
    service_rules:checked(formData,'service_rules'),
    aircon:checked(formData,'aircon'),
    payroll:checked(formData,'payroll'),
    operations_close:checked(formData,'operations_close'),
    team_settings:checked(formData,'team_settings'),
  };
  return {
    ...granular,
    students:granular.student_profiles||granular.attendance||granular.points,
    training:granular.training_plans||granular.training_history,
    assessment:granular.assessment,
    competitions:granular.competitions_manage||granular.competition_rubbers,
    transport:granular.transport,
    equipment:granular.equipment_catalog||granular.equipment_inventory||granular.service_rules||granular.competition_rubbers,
    operations:granular.aircon||granular.payroll||granular.operations_close,
  };
}

async function getSupabase(){const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();if(!claimsData?.claims?.sub)redirect('/login');return supabase;}

export async function approveJoinRequest(formData:FormData){
  const requestId=String(formData.get('request_id')??'');const role=String(formData.get('member_role')??'coach');const supabase=await getSupabase();
  const {error}=await supabase.rpc('approve_team_join_request',{target_request:requestId,granted_role:role,granted_permissions:permissionsFromForm(formData)});
  if(error)redirect('/more/accounts?error='+encodeURIComponent(error.message));
  revalidatePath('/more/accounts');redirect('/more/accounts?approved=1');
}

export async function approveNewTeamRequest(formData:FormData){const requestId=String(formData.get('request_id')??'');const supabase=await getSupabase();const {error}=await supabase.rpc('approve_new_team_request',{target_request:requestId});if(error)redirect('/more/accounts?error='+encodeURIComponent(error.message));revalidatePath('/more/accounts');redirect('/more/accounts?created=1');}
export async function rejectAccessRequest(formData:FormData){const requestId=String(formData.get('request_id')??'');const supabase=await getSupabase();const {error}=await supabase.rpc('reject_team_access_request',{target_request:requestId});if(error)redirect('/more/accounts?error='+encodeURIComponent(error.message));revalidatePath('/more/accounts');redirect('/more/accounts?rejected=1');}
