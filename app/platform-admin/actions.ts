'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function setTeamPlan(formData:FormData){
  const teamId=String(formData.get('team_id')??'').trim();
  const plan=String(formData.get('plan_code')??'').trim();
  const reason=String(formData.get('reason')??'').trim();
  const periodEndRaw=String(formData.get('period_end')??'').trim();
  if(!teamId||!['free','pro'].includes(plan)) redirect('/platform-admin?error='+encodeURIComponent('方案資料不完整'));

  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub) redirect('/login');
  const periodEnd=periodEndRaw ? `${periodEndRaw}T23:59:59+08:00` : null;
  const {error}=await supabase.rpc('platform_set_team_plan',{
    target_team:teamId,
    target_plan:plan,
    change_reason:reason||null,
    period_end:periodEnd,
  });
  if(error) redirect('/platform-admin?error='+encodeURIComponent(error.message));
  revalidatePath('/platform-admin');
  revalidatePath('/more');
  revalidatePath('/plans');
  redirect('/platform-admin?success='+encodeURIComponent(`已切換為 ${plan==='pro'?'菁英版 Pro':'免費版 Free'}`));
}
