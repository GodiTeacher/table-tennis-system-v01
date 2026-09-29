'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function adjustRubberInventory(formData: FormData) {
  const catalogId = String(formData.get('catalog_id') ?? '');
  const mode = String(formData.get('mode') ?? 'in');
  const quantity = Math.max(0, Math.floor(Number(formData.get('quantity') ?? 0)));
  const note = String(formData.get('note') ?? '').trim();
  if (!catalogId || !quantity) redirect('/rubber-inventory?error=' + encodeURIComponent('請選球皮並填寫異動片數。'));

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/login');

  const delta = mode === 'in' || mode === 'adjust_plus' ? quantity : -quantity;
  const movementType = mode === 'in' ? 'in' : mode === 'out' ? 'out' : 'adjustment';
  const { error } = await supabase.rpc('adjust_rubber_stock', {
    p_catalog_id: catalogId,
    p_delta: delta,
    p_movement_type: movementType,
    p_note: note || null,
  });
  if (error) redirect('/rubber-inventory?error=' + encodeURIComponent(error.message));
  revalidatePath('/rubber-inventory');
  revalidatePath('/rubber-catalog');
  redirect('/rubber-inventory?updated=1');
}
