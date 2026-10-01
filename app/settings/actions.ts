'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const THEMES = new Set(['current', 'clean', 'teaching', 'competitive', 'sunset', 'berry', 'pingpong', 'equipment', 'candy', 'neon']);

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
