import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DataPortTools from '@/components/DataPortTools';
import StudentRosterClient from '@/components/StudentRosterClient';
import { addStudent, batchAddStudents, deleteStudent, importStudentsData, setStudentActive, signOut, updateStudent } from './actions';

type StudentRow = { id:string; display_name:string; grade:number|null; class_name:string|null; seat_number:number|null; gender:string|null; active:boolean; created_at:string };
type StudentQuery = { error?:string; q?:string; grade?:string; class_name?:string; gender?:string; status?:string; sort?:string; sort1?:string; sort2?:string; sort3?:string };

type SortKey = 'grade_asc'|'grade_desc'|'class_asc'|'class_desc'|'seat_asc'|'seat_desc'|'name_asc'|'name_desc'|'gender_asc'|'created_asc'|'created_desc';
const SORT_OPTIONS: Array<{value:SortKey;label:string}> = [
  {value:'grade_asc',label:'年級低 → 高'},
  {value:'grade_desc',label:'年級高 → 低'},
  {value:'class_asc',label:'班級 A → Z'},
  {value:'class_desc',label:'班級 Z → A'},
  {value:'seat_asc',label:'座號小 → 大'},
  {value:'seat_desc',label:'座號大 → 小'},
  {value:'name_asc',label:'姓名 A → Z'},
  {value:'name_desc',label:'姓名 Z → A'},
  {value:'gender_asc',label:'性別'},
  {value:'created_desc',label:'最新加入'},
  {value:'created_asc',label:'最早加入'},
];
const VALID_SORTS = new Set(SORT_OPTIONS.map(option=>option.value));

function compareNullableNumber(a:number|null,b:number|null,descending=false){
  if(a==null&&b==null)return 0; if(a==null)return 1; if(b==null)return -1; return descending?b-a:a-b;
}
function compareNullableText(a:string|null,b:string|null,descending=false){
  if(!a&&!b)return 0; if(!a)return 1; if(!b)return -1; const result=a.localeCompare(b,'zh-Hant'); return descending?-result:result;
}
function compareByKey(a:StudentRow,b:StudentRow,key:SortKey){
  if(key==='grade_asc') return compareNullableNumber(a.grade,b.grade);
  if(key==='grade_desc') return compareNullableNumber(a.grade,b.grade,true);
  if(key==='class_asc') return compareNullableText(a.class_name,b.class_name);
  if(key==='class_desc') return compareNullableText(a.class_name,b.class_name,true);
  if(key==='seat_asc') return compareNullableNumber(a.seat_number,b.seat_number);
  if(key==='seat_desc') return compareNullableNumber(a.seat_number,b.seat_number,true);
  if(key==='name_asc') return a.display_name.localeCompare(b.display_name,'zh-Hant');
  if(key==='name_desc') return b.display_name.localeCompare(a.display_name,'zh-Hant');
  if(key==='gender_asc'){ const order:Record<string,number>={'男':0,'女':1,'其他':2}; return (order[a.gender??'']??9)-(order[b.gender??'']??9); }
  if(key==='created_asc') return new Date(a.created_at).getTime()-new Date(b.created_at).getTime();
  if(key==='created_desc') return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
  return 0;
}
function normalizeSort(value:string|undefined,fallback:SortKey):SortKey { return VALID_SORTS.has(value as SortKey) ? value as SortKey : fallback; }
function compareStudents(a:StudentRow,b:StudentRow,sorts:SortKey[]){
  const used=new Set<SortKey>();
  for(const key of sorts){ if(used.has(key))continue; used.add(key); const result=compareByKey(a,b,key); if(result!==0)return result; }
  return a.display_name.localeCompare(b.display_name,'zh-Hant')||a.id.localeCompare(b.id);
}

export default async function StudentsPage({searchParams}:{searchParams:Promise<StudentQuery>}){
  const params=await searchParams; const supabase=await createClient(); const {data:claims}=await supabase.auth.getClaims(); if(!claims?.claims?.sub) redirect('/login');
  const {data:studentData,error}=await supabase.from('students').select('id,display_name,grade,class_name,seat_number,gender,active,created_at');
  const students=(studentData??[]) as StudentRow[]; const activeCount=students.filter(s=>s.active).length; const classOptions=[...new Set(students.map(s=>s.class_name).filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
  const keyword=(params.q??'').trim().toLocaleLowerCase('zh-Hant'); const selectedGrade=params.grade??''; const selectedClass=params.class_name??''; const selectedGender=params.gender??''; const selectedStatus=params.status??'active';
  const selectedSort1=normalizeSort(params.sort1??params.sort,'grade_asc'); const selectedSort2=normalizeSort(params.sort2,'class_asc'); const selectedSort3=normalizeSort(params.sort3,'seat_asc');
  const sortKeys=[selectedSort1,selectedSort2,selectedSort3];
  const filteredStudents=students.filter(student=>{ if(keyword&&!`${student.display_name} ${student.class_name??''} ${student.seat_number??''}`.toLocaleLowerCase('zh-Hant').includes(keyword))return false; if(selectedGrade&&String(student.grade??'')!==selectedGrade)return false; if(selectedClass&&(student.class_name??'')!==selectedClass)return false; if(selectedGender&&(student.gender??'')!==selectedGender)return false; if(selectedStatus==='active'&&!student.active)return false; if(selectedStatus==='inactive'&&student.active)return false; return true; }).sort((a,b)=>compareStudents(a,b,sortKeys));
  const exportRows=filteredStudents.map(s=>({姓名:s.display_name,年級:s.grade??'',班級:s.class_name??'',座號:s.seat_number??'',性別:s.gender??'',狀態:s.active?'啟用中':'已停用'}));

  const sortSelect=(name:string,value:SortKey,label:string)=><label>{label}<select name={name} defaultValue={value}>{SORT_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;

  return <><style>{`.studentFilterForm{display:grid;grid-template-columns:1.35fr repeat(4,minmax(110px,.75fr)) auto;gap:9px;align-items:end}.studentSortPriority{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:9px;margin-top:10px;padding-top:10px;border-top:1px solid #edf0f4}.studentFilterForm label,.studentSortPriority label{font-size:12px;font-weight:800;color:#647184}.studentFilterForm input,.studentFilterForm select,.studentSortPriority select{width:100%;margin-top:6px;border:1px solid #dce2ea;border-radius:11px;padding:10px 11px;font:inherit;background:#fff}.studentFilterActions{display:flex;gap:7px}.studentFilterActions a{display:inline-flex;align-items:center;text-decoration:none}.filterSummary{margin-top:10px;color:#6b7789;font-size:13px}@media(max-width:1000px){.studentFilterForm{grid-template-columns:repeat(3,1fr)}.studentFilterActions{grid-column:1/-1}}@media(max-width:700px){.studentFilterForm{grid-template-columns:1fr 1fr}.studentFilterForm label:first-child,.studentFilterActions{grid-column:1/-1}.studentSortPriority{grid-template-columns:1fr}}`}</style><main className="shell">
    <section className="hero compactHero"><div className="eyebrow">TABLE TENNIS SYSTEM V01</div><h1>學生管理</h1><p>管理姓名、年級、班級、座號、性別與啟用狀態，也可以直接從 Excel 批次貼上整隊名單。</p><div className="topNav"><Link href="/today">今日訓練</Link><Link href="/history">歷史訓練</Link><Link href="/">訓練規劃</Link><form action={signOut}><button className="linkButton">登出</button></form></div></section>
    {(params.error||error)?<div className="notice errorNotice">{params.error??error?.message}</div>:null}
    <section className="card"><div className="sectionTitle"><div><span>ROSTER</span><h2>單筆新增</h2></div><strong>{activeCount} 位啟用中</strong></div><form action={addStudent} className="studentCreateGrid"><input name="display_name" placeholder="學生姓名" required maxLength={30}/><select name="grade" defaultValue=""><option value="">年級</option>{[1,2,3,4,5,6].map(g=><option key={g} value={g}>{g} 年級</option>)}</select><input name="class_name" placeholder="班級，例如 甲／3班" maxLength={20}/><input name="seat_number" type="number" min="1" max="99" inputMode="numeric" placeholder="座號"/><select name="gender" defaultValue=""><option value="">性別</option><option value="男">男</option><option value="女">女</option><option value="其他">其他</option></select><button className="primaryButton">＋ 新增學生</button></form></section>
    <section className="card"><div className="sectionTitle"><div><span>BATCH</span><h2>批次加入</h2></div></div><p className="muted">可直接從 Excel 複製五欄貼上：姓名、年級、班級、座號、性別。原本四欄「姓名、年級、班級、性別」格式仍可使用，也可以只貼姓名，一行一位。</p><form action={batchAddStudents} className="batchForm"><textarea name="batch_text" rows={8} placeholder={'範例：\n王小明\t3\t甲\t12\t男\n陳小美\t4\t2班\t7\t女\n李小華'} required/><button className="primaryButton">一次加入全部學生</button></form></section>
    <section className="card"><div className="sectionTitle"><div><span>DATA</span><h2>匯入／匯出</h2></div><strong>{filteredStudents.length} 人</strong></div><DataPortTools title="學生名單" filename="學生名單" lineTitle="📋 學生名單" columns={[{key:'姓名',label:'姓名'},{key:'年級',label:'年級'},{key:'班級',label:'班級'},{key:'座號',label:'座號'},{key:'性別',label:'性別'},{key:'狀態',label:'狀態'}]} rows={exportRows} importAction={importStudentsData} importHelp="可匯入本頁匯出的 CSV 或 JSON；座號會一起匯入，匯入會新增學生，不覆蓋既有資料。"/></section>
    <section className="card"><div className="sectionTitle"><div><span>FILTER</span><h2>篩選與排序</h2></div><strong>{filteredStudents.length} / {students.length} 人</strong></div><form method="get"><div className="studentFilterForm"><label>搜尋姓名／班級／座號<input name="q" defaultValue={params.q??''} placeholder="輸入關鍵字"/></label><label>年級<select name="grade" defaultValue={selectedGrade}><option value="">全部</option>{[1,2,3,4,5,6].map(g=><option key={g} value={g}>{g} 年級</option>)}</select></label><label>班級<select name="class_name" defaultValue={selectedClass}><option value="">全部</option>{classOptions.map(c=><option value={c} key={c}>{c}</option>)}</select></label><label>性別<select name="gender" defaultValue={selectedGender}><option value="">全部</option><option value="男">男</option><option value="女">女</option><option value="其他">其他</option></select></label><label>狀態<select name="status" defaultValue={selectedStatus}><option value="active">啟用中</option><option value="inactive">已停用</option><option value="all">全部</option></select></label><div className="studentFilterActions"><button className="primaryButton">套用</button><Link className="secondaryButton" href="/students">清除</Link></div></div><div className="studentSortPriority">{sortSelect('sort1',selectedSort1,'第一排序')}{sortSelect('sort2',selectedSort2,'第二排序')}{sortSelect('sort3',selectedSort3,'第三排序')}</div></form><div className="filterSummary">排序會依第一 → 第二 → 第三優先度逐層比較；例如「座號小→大」放第一，就會真正先依座號排列。未設定的資料會自動排到最後。</div></section>
    <section className="card"><div className="sectionTitle"><div><span>STUDENTS</span><h2>目前名單</h2></div><strong>{filteredStudents.length} 人</strong></div><StudentRosterClient students={filteredStudents} updateStudent={updateStudent} setStudentActive={setStudentActive} deleteStudent={deleteStudent}/></section>
  </main></>;
}
