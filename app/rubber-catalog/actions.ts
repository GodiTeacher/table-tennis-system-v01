'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function getContext() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect('/login');
  const { data: teamId } = await supabase.rpc('current_team_id');
  if (!teamId) redirect('/more');
  return { supabase, teamId };
}

function num(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export async function createRubberCatalogItem(formData: FormData) {
  const brand = String(formData.get('brand') ?? '').trim();
  const model = String(formData.get('model') ?? '').trim();
  if (!brand || !model) redirect('/rubber-catalog?error=' + encodeURIComponent('品牌與型號為必填'));
  const { supabase, teamId } = await getContext();
  const { error } = await supabase.from('rubber_catalog').insert({
    team_id: teamId,
    brand,
    model,
    sponge_thickness: String(formData.get('sponge_thickness') ?? '').trim() || null,
    color: String(formData.get('color') ?? '').trim() || null,
    sku: String(formData.get('sku') ?? '').trim() || null,
    stock_quantity: Math.floor(num(formData, 'stock_quantity')),
    min_stock: Math.floor(num(formData, 'min_stock')),
    cost_price: num(formData, 'cost_price'),
    sale_price: num(formData, 'sale_price'),
    notes: String(formData.get('notes') ?? '').trim() || null,
  });
  if (error) redirect('/rubber-catalog?error=' + encodeURIComponent(error.message));
  revalidatePath('/rubber-catalog');
  redirect('/rubber-catalog?created=1');
}

export async function updateRubberCatalogItem(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const brand = String(formData.get('brand') ?? '').trim();
  const model = String(formData.get('model') ?? '').trim();
  if (!id || !brand || !model) return;
  const { supabase } = await getContext();
  const { error } = await supabase.from('rubber_catalog').update({
    brand,
    model,
    sponge_thickness: String(formData.get('sponge_thickness') ?? '').trim() || null,
    color: String(formData.get('color') ?? '').trim() || null,
    sku: String(formData.get('sku') ?? '').trim() || null,
    stock_quantity: Math.floor(num(formData, 'stock_quantity')),
    min_stock: Math.floor(num(formData, 'min_stock')),
    cost_price: num(formData, 'cost_price'),
    sale_price: num(formData, 'sale_price'),
    active: formData.get('active') === 'on',
    notes: String(formData.get('notes') ?? '').trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) redirect('/rubber-catalog?error=' + encodeURIComponent(error.message));
  revalidatePath('/rubber-catalog');
  redirect('/rubber-catalog?updated=1');
}

export async function deleteRubberCatalogItem(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const { supabase } = await getContext();
  const { error } = await supabase.from('rubber_catalog').delete().eq('id', id);
  if (error) redirect('/rubber-catalog?error=' + encodeURIComponent(error.message));
  revalidatePath('/rubber-catalog');
}
