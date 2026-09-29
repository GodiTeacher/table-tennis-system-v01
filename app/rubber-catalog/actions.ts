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
function safeNum(value:any){ const n=Number(value??0); return Number.isFinite(n)&&n>=0?n:0; }
function normalizeColor(value:any){ const text=String(value??'').trim().toLowerCase(); if(['red','紅'].includes(text))return 'red'; if(['black','黑'].includes(text))return 'black'; if(['other','其他'].includes(text))return 'other'; return null; }

export async function createRubberCatalogItem(formData: FormData) {
  const brand = String(formData.get('brand') ?? '').trim();
  const model = String(formData.get('model') ?? '').trim();
  if (!brand || !model) redirect('/rubber-catalog?error=' + encodeURIComponent('品牌與型號為必填'));
  const { supabase, teamId } = await getContext();
  const { error } = await supabase.from('rubber_catalog').insert({
    team_id: teamId, brand, model,
    sponge_thickness: String(formData.get('sponge_thickness') ?? '').trim() || null,
    color: String(formData.get('color') ?? '').trim() || null,
    sku: String(formData.get('sku') ?? '').trim() || null,
    stock_quantity: Math.floor(num(formData, 'stock_quantity')),
    min_stock: Math.floor(num(formData, 'min_stock')),
    cost_price: num(formData, 'cost_price'), sale_price: num(formData, 'sale_price'),
    notes: String(formData.get('notes') ?? '').trim() || null,
  });
  if (error) redirect('/rubber-catalog?error=' + encodeURIComponent(error.message));
  revalidatePath('/rubber-catalog'); redirect('/rubber-catalog?created=1');
}

export async function importRubberCatalogData(formData:FormData){
  const raw=String(formData.get('import_payload')??'').trim(); if(!raw)return;
  let parsed:any[]=[]; try{parsed=JSON.parse(raw);}catch{redirect('/rubber-catalog?error='+encodeURIComponent('匯入檔案格式錯誤'));}
  const {supabase,teamId}=await getContext();
  const rows=(Array.isArray(parsed)?parsed:[]).map((r:any)=>({
    team_id:teamId,
    brand:String(r.brand??r['品牌']??'').trim(), model:String(r.model??r['型號']??'').trim(),
    sponge_thickness:String(r.sponge_thickness??r['厚度']??'').trim()||null,
    color:normalizeColor(r.color??r['顏色']), sku:String(r.sku??r['SKU']??r['SKU／代碼']??'').trim()||null,
    stock_quantity:Math.floor(safeNum(r.stock_quantity??r['庫存']??r['目前庫存'])), min_stock:Math.floor(safeNum(r.min_stock??r['安全庫存'])),
    cost_price:safeNum(r.cost_price??r['成本']), sale_price:safeNum(r.sale_price??r['售價']),
    notes:String(r.notes??r['備註']??'').trim()||null,
    active:!(r.active===false||String(r['狀態']??'').includes('停用')),
  })).filter((r:any)=>r.brand&&r.model);
  if(!rows.length)redirect('/rubber-catalog?error='+encodeURIComponent('匯入檔案沒有可新增的球皮'));
  const {error}=await supabase.from('rubber_catalog').insert(rows); if(error)redirect('/rubber-catalog?error='+encodeURIComponent(error.message));
  revalidatePath('/rubber-catalog'); redirect('/rubber-catalog?created=1');
}

export async function updateRubberCatalogItem(formData: FormData) {
  const id = String(formData.get('id') ?? ''); const brand = String(formData.get('brand') ?? '').trim(); const model = String(formData.get('model') ?? '').trim(); if (!id || !brand || !model) return;
  const { supabase } = await getContext();
  const { error } = await supabase.from('rubber_catalog').update({
    brand, model, sponge_thickness: String(formData.get('sponge_thickness') ?? '').trim() || null,
    color: String(formData.get('color') ?? '').trim() || null, sku: String(formData.get('sku') ?? '').trim() || null,
    stock_quantity: Math.floor(num(formData, 'stock_quantity')), min_stock: Math.floor(num(formData, 'min_stock')),
    cost_price: num(formData, 'cost_price'), sale_price: num(formData, 'sale_price'), active: formData.get('active') === 'on',
    notes: String(formData.get('notes') ?? '').trim() || null, updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) redirect('/rubber-catalog?error=' + encodeURIComponent(error.message)); revalidatePath('/rubber-catalog'); redirect('/rubber-catalog?updated=1');
}

export async function deleteRubberCatalogItem(formData: FormData) {
  const id = String(formData.get('id') ?? ''); if (!id) return; const { supabase } = await getContext(); const { error } = await supabase.from('rubber_catalog').delete().eq('id', id);
  if (error) redirect('/rubber-catalog?error=' + encodeURIComponent(error.message)); revalidatePath('/rubber-catalog');
}
