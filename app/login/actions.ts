'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  const userId = data.user?.id;
  if (userId) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (profile?.role === 'pending') redirect('/access-request');
  }
  redirect('/students');
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const passwordConfirm = String(formData.get('password_confirm') ?? '');

  if (password.length < 6) redirect('/login?error=' + encodeURIComponent('密碼至少需要 6 個字元。'));
  if (password !== passwordConfirm) redirect('/login?error=' + encodeURIComponent('兩次輸入的密碼不一致，請重新確認。'));

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'https://table-tennis-system-v01.cramtabletennis.workers.dev/auth/confirm',
    },
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect('/login?message=已寄出確認信，請先完成信箱驗證。驗證後登入即可選擇學校與隊伍申請權限。');
}
