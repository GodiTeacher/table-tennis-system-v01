'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const THEMES = new Set(['current', 'clean', 'teaching', 'competitive', 'sunset', 'berry', 'pingpong', 'equipment', 'candy', 'neon']);
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_LOGO_BYTES = 450 * 1024;

export async function setTheme(formData: FormData) {
  const theme = String(formData.get('theme') ?? '');
  if (!THEMES.has(theme)) redirect('/settings?error=' + encodeURIComponent('無效的主題設定。'));

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/login');

  const { error } = await supabase.rpc('set_my_theme', { target_theme: theme });
  if (error) redirect('/settings?error=' + encodeURIComponent(error.message));

  const cookieStore = await cookies();
  cookieStore.set('ui-theme', theme, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
    secure: true,
  });
  redirect('/settings?message=' + encodeURIComponent('介面主題已更新。'));
}

export async function saveTeamBranding(formData: FormData) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect('/login');

  const { data: teamId } = await supabase.rpc('current_team_id');
  if (!teamId) redirect('/settings?error=' + encodeURIComponent('目前沒有可管理的隊伍。'));

  const { data: currentTeam } = await supabase
    .from('teams')
    .select('logo_data_url')
    .eq('id', teamId)
    .single();

  const name = String(formData.get('team_name') ?? '').trim();
  const shortName = String(formData.get('short_name') ?? '').trim();
  const tagline = String(formData.get('tagline') ?? '').trim();
  const brandColor = String(formData.get('brand_color') ?? '#7c3aed').trim();
  const removeLogo = String(formData.get('remove_logo') ?? '') === '1';
  const file = formData.get('logo');

  if (!name) redirect('/settings?error=' + encodeURIComponent('團隊名稱不可空白。'));
  if (!/^#[0-9A-Fa-f]{6}$/.test(brandColor)) redirect('/settings?error=' + encodeURIComponent('品牌主題色格式不正確。'));

  let logoDataUrl = removeLogo ? '' : String(currentTeam?.logo_data_url ?? '');
  if (file instanceof File && file.size > 0) {
    if (!LOGO_TYPES.has(file.type)) redirect('/settings?error=' + encodeURIComponent('Logo 僅支援 PNG、JPG、WebP。'));
    if (file.size > MAX_LOGO_BYTES) redirect('/settings?error=' + encodeURIComponent('Logo 請控制在 450KB 以內。'));
    const buffer = Buffer.from(await file.arrayBuffer());
    logoDataUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
  }

  const { error } = await supabase.rpc('update_current_team_branding', {
    target_name: name,
    target_short_name: shortName,
    target_logo_data_url: logoDataUrl,
    target_brand_color: brandColor,
    target_tagline: tagline,
  });

  if (error) redirect('/settings?error=' + encodeURIComponent(error.message));
  redirect('/settings?message=' + encodeURIComponent('團隊品牌設定已更新。'));
}
