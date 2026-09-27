'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const VALID_GENDERS = new Set(['男', '女', '其他']);

async function requireUser() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect('/login');
  return supabase;
}

function parseGrade(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const grade = Number(text);
  return Number.isInteger(grade) && grade >= 1 && grade <= 6 ? grade : null;
}

function parseGender(value: FormDataEntryValue | null) {
  const gender = String(value ?? '').trim();
  return VALID_GENDERS.has(gender) ? gender : null;
}

export async function addStudent(formData: FormData) {
  const displayName = String(formData.get('display_name') ?? '').trim();
  if (!displayName) return;
  const supabase = await requireUser();
  const { error } = await supabase.from('students').insert({
    display_name: displayName,
    grade: parseGrade(formData.get('grade')),
    class_name: String(formData.get('class_name') ?? '').trim() || null,
    gender: parseGender(formData.get('gender')),
  });
  if (error) redirect(`/students?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/students');
}

export async function batchAddStudents(formData: FormData) {
  const raw = String(formData.get('batch_text') ?? '').trim();
  if (!raw) return;

  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.split(/[,，]/);
      const [nameRaw, gradeRaw = '', classRaw = '', genderRaw = ''] = parts.map((part) => part.trim());
      const gradeNumber = Number(gradeRaw.replace(/年級|年/g, ''));
      return {
        display_name: nameRaw,
        grade: Number.isInteger(gradeNumber) && gradeNumber >= 1 && gradeNumber <= 6 ? gradeNumber : null,
        class_name: classRaw || null,
        gender: VALID_GENDERS.has(genderRaw) ? genderRaw : null,
      };
    })
    .filter((row) => row.display_name && row.display_name !== '姓名');

  if (!rows.length) redirect('/students?error=' + encodeURIComponent('沒有讀到可新增的學生資料'));

  const supabase = await requireUser();
  const { error } = await supabase.from('students').insert(rows);
  if (error) redirect(`/students?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/students');
}

export async function updateStudent(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const displayName = String(formData.get('display_name') ?? '').trim();
  if (!id || !displayName) return;

  const supabase = await requireUser();
  const { error } = await supabase.from('students').update({
    display_name: displayName,
    grade: parseGrade(formData.get('grade')),
    class_name: String(formData.get('class_name') ?? '').trim() || null,
    gender: parseGender(formData.get('gender')),
  }).eq('id', id);

  if (error) redirect(`/students?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/students');
}

export async function setStudentActive(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  if (!id) return;
  const supabase = await requireUser();
  const { error } = await supabase.from('students').update({ active }).eq('id', id);
  if (error) redirect(`/students?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/students');
}

export async function deleteStudent(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await requireUser();

  const { count, error: countError } = await supabase
    .from('session_students')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', id);

  if (countError) redirect(`/students?error=${encodeURIComponent(countError.message)}`);
  if ((count ?? 0) > 0) {
    redirect('/students?error=' + encodeURIComponent('此學生已有歷史訓練紀錄，為避免破壞紀錄不能永久刪除；請改用「停用」。'));
  }

  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) redirect(`/students?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/students');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
