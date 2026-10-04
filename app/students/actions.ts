'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { friendlyPlanError } from '@/lib/subscription-server';

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

function parseSeatNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const seat = Number(text.replace(/號/g, ''));
  return Number.isInteger(seat) && seat >= 1 && seat <= 99 ? seat : null;
}

function parseGender(value: FormDataEntryValue | null) {
  const gender = String(value ?? '').trim();
  return VALID_GENDERS.has(gender) ? gender : null;
}

function normalizeImportedStudent(raw:any) {
  const name = String(raw.display_name ?? raw['姓名'] ?? raw.name ?? '').trim();
  const gradeRaw = raw.grade ?? raw['年級'] ?? '';
  const gradeNumber = Number(String(gradeRaw).replace(/年級|年/g,''));
  const seatRaw = raw.seat_number ?? raw['座號'] ?? raw.seatNumber ?? '';
  const seatNumber = Number(String(seatRaw).replace(/號/g,''));
  const genderRaw = String(raw.gender ?? raw['性別'] ?? '').trim();
  return {
    display_name: name,
    grade: Number.isInteger(gradeNumber) && gradeNumber >= 1 && gradeNumber <= 6 ? gradeNumber : null,
    class_name: String(raw.class_name ?? raw['班級'] ?? raw.className ?? '').trim() || null,
    seat_number: Number.isInteger(seatNumber) && seatNumber >= 1 && seatNumber <= 99 ? seatNumber : null,
    gender: VALID_GENDERS.has(genderRaw) ? genderRaw : null,
    active: raw.active === false || String(raw['狀態'] ?? '').includes('停用') ? false : true,
  };
}

function studentError(message:string){
  return `/students?error=${encodeURIComponent(friendlyPlanError(message))}`;
}

async function ensureStudentCapacity(supabase:any,incomingActive:number){
  if(incomingActive<=0)return;
  const {data:teamId,error:teamError}=await supabase.rpc('current_team_id');
  if(teamError)redirect(studentError(teamError.message));
  if(!teamId)return;

  const {data:entitlements,error:entitlementError}=await supabase.rpc('get_team_entitlements',{target_team:teamId});
  if(entitlementError)redirect(studentError(entitlementError.message));
  const limit=entitlements?.student_limit as number|null|undefined;
  if(limit==null)return;

  const {count,error:countError}=await supabase
    .from('students')
    .select('id',{count:'exact',head:true})
    .eq('team_id',teamId)
    .eq('active',true);
  if(countError)redirect(studentError(countError.message));

  const current=count??0;
  const remaining=Math.max(0,limit-current);
  if(current+incomingActive>limit){
    const message=remaining===0
      ? `免費版最多可使用 ${limit} 位啟用中的學生，目前已達上限。可先停用不使用的學生，或升級菁英版。`
      : `免費版最多可使用 ${limit} 位啟用中的學生，目前已有 ${current} 位，這次要新增 ${incomingActive} 位；最多還可新增 ${remaining} 位。`;
    redirect(`/students?error=${encodeURIComponent(message)}`);
  }
}

export async function addStudent(formData: FormData) {
  const displayName = String(formData.get('display_name') ?? '').trim();
  if (!displayName) return;
  const supabase = await requireUser();
  await ensureStudentCapacity(supabase,1);
  const { error } = await supabase.from('students').insert({
    display_name: displayName,
    grade: parseGrade(formData.get('grade')),
    class_name: String(formData.get('class_name') ?? '').trim() || null,
    seat_number: parseSeatNumber(formData.get('seat_number')),
    gender: parseGender(formData.get('gender')),
  });
  if (error) redirect(studentError(error.message));
  revalidatePath('/students');
  revalidatePath('/today');
}

export async function batchAddStudents(formData: FormData) {
  const raw = String(formData.get('batch_text') ?? '').trim();
  if (!raw) return;

  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(/[,，]/);
      const values = parts.map((part) => part.trim());
      const nameRaw = values[0] ?? '';
      const gradeRaw = values[1] ?? '';
      const classRaw = values[2] ?? '';
      const fourth = values[3] ?? '';
      const fifth = values[4] ?? '';
      const oldFourColumn = values.length === 4 && VALID_GENDERS.has(fourth);
      const seatRaw = oldFourColumn ? '' : fourth;
      const genderRaw = oldFourColumn ? fourth : fifth;
      const gradeNumber = Number(gradeRaw.replace(/年級|年/g, ''));
      const seatNumber = Number(seatRaw.replace(/號/g, ''));
      return {
        display_name: nameRaw,
        grade: Number.isInteger(gradeNumber) && gradeNumber >= 1 && gradeNumber <= 6 ? gradeNumber : null,
        class_name: classRaw || null,
        seat_number: Number.isInteger(seatNumber) && seatNumber >= 1 && seatNumber <= 99 ? seatNumber : null,
        gender: VALID_GENDERS.has(genderRaw) ? genderRaw : null,
      };
    })
    .filter((row) => row.display_name && row.display_name !== '姓名');

  if (!rows.length) redirect('/students?error=' + encodeURIComponent('沒有讀到可新增的學生資料'));

  const supabase = await requireUser();
  await ensureStudentCapacity(supabase,rows.length);
  const { error } = await supabase.from('students').insert(rows);
  if (error) redirect(studentError(error.message));
  revalidatePath('/students');
  revalidatePath('/today');
}

export async function importStudentsData(formData: FormData) {
  const raw = String(formData.get('import_payload') ?? '').trim();
  if (!raw) return;
  let parsed:any[] = [];
  try { parsed = JSON.parse(raw); } catch { redirect('/students?error=' + encodeURIComponent('匯入檔案格式錯誤')); }
  const rows = (Array.isArray(parsed) ? parsed : []).map(normalizeImportedStudent).filter(row => row.display_name && row.display_name !== '姓名');
  if (!rows.length) redirect('/students?error=' + encodeURIComponent('匯入檔案中沒有可新增的學生'));
  const supabase = await requireUser();
  await ensureStudentCapacity(supabase,rows.filter(row=>row.active!==false).length);
  const { error } = await supabase.from('students').insert(rows);
  if (error) redirect(studentError(error.message));
  revalidatePath('/students');
  revalidatePath('/today');
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
    seat_number: parseSeatNumber(formData.get('seat_number')),
    gender: parseGender(formData.get('gender')),
  }).eq('id', id);

  if (error) redirect(studentError(error.message));
  revalidatePath('/students');
  revalidatePath('/today');
}

export async function setStudentActive(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';
  if (!id) return;
  const supabase = await requireUser();
  if(active)await ensureStudentCapacity(supabase,1);
  const { error } = await supabase.from('students').update({ active }).eq('id', id);
  if (error) redirect(studentError(error.message));
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

  if (countError) redirect(studentError(countError.message));
  if ((count ?? 0) > 0) {
    redirect('/students?error=' + encodeURIComponent('此學生已有歷史訓練紀錄，為避免破壞紀錄不能永久刪除；請改用「停用」。'));
  }

  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) redirect(studentError(error.message));
  revalidatePath('/students');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
