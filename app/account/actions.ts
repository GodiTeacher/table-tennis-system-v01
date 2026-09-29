'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireVerifiedUser(currentPassword: string) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user?.email) redirect('/login');

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (passwordError) redirect('/account?error=' + encodeURIComponent('目前密碼不正確。'));

  return { supabase, user };
}

export async function changePassword(formData: FormData) {
  const currentPassword = String(formData.get('current_password') ?? '');
  const newPassword = String(formData.get('new_password') ?? '');
  const newPasswordConfirm = String(formData.get('new_password_confirm') ?? '');

  if (newPassword.length < 6) redirect('/account?error=' + encodeURIComponent('新密碼至少需要 6 個字元。'));
  if (newPassword !== newPasswordConfirm) redirect('/account?error=' + encodeURIComponent('兩次輸入的新密碼不一致。'));
  if (currentPassword === newPassword) redirect('/account?error=' + encodeURIComponent('新密碼不可與目前密碼相同。'));

  const { supabase } = await requireVerifiedUser(currentPassword);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) redirect('/account?error=' + encodeURIComponent(error.message));

  redirect('/account?message=' + encodeURIComponent('密碼已更新。'));
}

export async function deleteAccount(formData: FormData) {
  const currentPassword = String(formData.get('delete_current_password') ?? '');
  const confirmation = String(formData.get('delete_confirmation') ?? '').trim();
  if (confirmation !== '刪除帳號') {
    redirect('/account?error=' + encodeURIComponent('請正確輸入「刪除帳號」後再確認。'));
  }

  const { supabase, user } = await requireVerifiedUser(currentPassword);

  const { data: ownerMemberships, error: ownerError } = await supabase
    .from('team_members')
    .select('team_id,member_role')
    .eq('user_id', user.id)
    .eq('member_role', 'owner');
  if (ownerError) redirect('/account?error=' + encodeURIComponent(ownerError.message));
  if ((ownerMemberships ?? []).length > 0) {
    redirect('/account?error=' + encodeURIComponent('你目前仍是某個隊伍的擁有者。請先把隊伍擁有權交給其他管理員後，再刪除帳號。'));
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirect('/account?error=' + encodeURIComponent('刪除帳號功能尚未完成伺服器設定，請聯絡平台管理員。'));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) redirect('/account?error=' + encodeURIComponent(error.message));

  await supabase.auth.signOut();
  redirect('/login?message=' + encodeURIComponent('帳號已刪除。'));
}
