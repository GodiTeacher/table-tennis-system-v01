import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TRAINING_ITEMS } from '@/lib/training-items';
import { assignStudentGroup, createTrainingGroup, deleteTrainingGroup, saveGroupPreset } from './actions';

export default async function TrainingGroupsPage({searchParams}:{searchParams:Promise<{created?:string;deleted?:string;saved?:string;error?:string}>}){
  const query=await searchParams;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims?.sub) redirect('/login');
  const {data:teamId}=await supabase.rpc('current_team_id');
  if(!teamId) redirect('/more');

  const [{data:groups},{data:students},{data:customSkills},{data:presets}]=await Promise.all([
    supabase.from('training_groups').select('id,name,sort_order,active').eq('team_id',teamId).order('sort_order').order('name'),
    supabase.from('students').select('id,display_name,grade,class_name,gender,training_group_id').eq('team_id',teamId).eq('active',true).order('grade',{ascending:true,nullsFirst:false}).order('display_name'),
    supabase.from('skills').select('id,name,domain,subcategory,recommended_levels').eq('is_custom',true).eq('is_active',true).order('domain').order('name'),
    supabase.from('group_training_presets').select('group_id,skill_id,sort_order').order('sort_order'),
  ]);

  const allItems=[...TRAINING_ITEMS,...(customSkills??[]).map((s:any)=>({id:s.id,name:s.name,domain:s.domain,subcategory:s.subcategory??'自訂',recommendedLevels:s.recommended_levels??[]}))];
  const presetMap=new Map<string,Set<string>>();
  for(const p of presets??[]){ const set=presetMap.get(p.group_id)??new Set<string>(); set.add(p.skill_id); presetMap.set(p.group_id,set); }

  return <main className="shell">
    <section className="hero compactHero">
      <div className="eyebrow">TRAINING GROUPS</div><h1>隊內訓練分組</h1>
      <p>同一球隊可建立 A 組、B 組、C 組或自訂組別；每組可有自己的學生與預設訓練項目。</p>
      <div className="topNav"><Link href="/today">今日訓練</Link><Link href="/training-items">自訂訓練項目</Link><Link href="/students">學生管理</Link></div>
    </section>
    {query.created?<div className="notice successNotice">已新增組別。</div>:null}
    {query.deleted?<div className="notice successNotice">已刪除組別。</div>:null}
    {query.saved?<div className="notice successNotice">該組預設訓練項目已儲存。</div>:null}
    {query.error?<div className="notice errorNotice">{query.error}</div>:null}

    <section className="card"><div className="sectionTitle"><div><span>01</span><h2>組別管理</h2></div></div>
      <form action={createTrainingGroup} style={{display:'flex',gap:8,flexWrap:'wrap'}}><input name="name" required placeholder="例如：D組／競賽組／培育組" style={{flex:'1 1 240px',padding:12,border:'1px solid #dce2ea',borderRadius:10}}/><button className="primaryButton">＋ 新增組別</button></form>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>{(groups??[]).map((g:any)=><div key={g.id} style={{padding:'10px 12px',border:'1px solid #dce2ea',borderRadius:12,display:'flex',alignItems:'center',gap:10}}><b>{g.name}</b><form action={deleteTrainingGroup}><input type="hidden" name="group_id" value={g.id}/><button className="secondaryButton">刪除</button></form></div>)}</div>
    </section>

    <section className="card"><div className="sectionTitle"><div><span>02</span><h2>學生分組</h2></div><strong>{students?.length??0} 人</strong></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>{(students??[]).map((s:any)=><form action={assignStudentGroup} key={s.id} style={{padding:12,border:'1px solid #e1e6ec',borderRadius:12}}><input type="hidden" name="student_id" value={s.id}/><b>{s.display_name}</b><small style={{display:'block',color:'#738093',margin:'4px 0 8px'}}>{[s.grade?`${s.grade}年級`:null,s.class_name,s.gender].filter(Boolean).join(' · ')}</small><select name="group_id" defaultValue={s.training_group_id??''} style={{width:'100%',padding:9,border:'1px solid #dce2ea',borderRadius:9}}><option value="">未分組</option>{(groups??[]).map((g:any)=><option value={g.id} key={g.id}>{g.name}</option>)}</select><button className="secondaryButton" style={{marginTop:8,width:'100%'}}>儲存組別</button></form>)}</div>
    </section>

    {(groups??[]).map((g:any)=>{const selected=presetMap.get(g.id)??new Set<string>(); return <section className="card" key={g.id}><div className="sectionTitle"><div><span>03</span><h2>{g.name}｜預設訓練項目</h2></div><strong>{selected.size} 項</strong></div><p className="muted">進入今日訓練選擇「{g.name}」時，會自動帶入這些項目；現場仍可自由增減。</p><form action={saveGroupPreset}><input type="hidden" name="group_id" value={g.id}/><div className="itemGrid">{allItems.map((item:any)=><label className="item" key={item.id} style={{cursor:'pointer'}}><input type="checkbox" name="skill_ids" value={item.id} defaultChecked={selected.has(item.id)} style={{marginRight:8}}/><div><b>{item.name}</b><small>{item.domain} · {item.subcategory}</small></div></label>)}</div><button className="primaryButton" style={{marginTop:12}}>儲存 {g.name} 預設項目</button></form></section>})}
  </main>;
}
