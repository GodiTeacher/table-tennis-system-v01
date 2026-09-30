'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function saveGuidePrice(formData: FormData) {
  const guideKind = String(formData.get('guide_kind') ?? '');
  const itemKey = String(formData.get('item_key') ?? '').trim();
  const returnToRaw = String(formData.get('return_to') ?? '');
  const returnTo = returnToRaw === '/rubber-guide' ? '/rubber-guide' : '/blade-guide';
  const minPrice = Math.max(0, Math.round(Number(formData.get('min_price') ?? 0)));
  const maxPrice = Math.max(0, Math.round(Number(formData.get('max_price') ?? 0)));

  if (!['rubber', 'blade'].includes(guideKind) || !itemKey) {
    redirect(`${returnTo}?error=${encodeURIComponent('價格資料格式錯誤。')}`);
  }
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || maxPrice < minPrice) {
    redirect(`${returnTo}?error=${encodeURIComponent('最高價格必須大於或等於最低價格。')}`);
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: teamId, error: teamError } = await supabase.rpc('current_team_id');
  if (teamError || !teamId) redirect(`${returnTo}?error=${encodeURIComponent('目前沒有可使用的隊伍工作區。')}`);

  const { error } = await supabase.from('equipment_guide_prices').upsert({
    team_id: teamId,
    guide_kind: guideKind,
    item_key: itemKey,
    min_price: minPrice,
    max_price: maxPrice,
    currency: 'TWD',
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'team_id,guide_kind,item_key' });

  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(returnTo);
  redirect(`${returnTo}?message=${encodeURIComponent('參考價格已更新。')}`);
}
