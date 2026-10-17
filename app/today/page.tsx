import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DailyTrainingWorkspace from '@/components/DailyTrainingWorkspace';
import type { TrainingItem } from '@/lib/training-items';
import type { TrainingLevelId } from '@/lib/training-levels';

const taipeiDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; student?: string; skills?: string; source?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role,display_name').eq('id', userId).single();
  if (!profile || !['admin','coach'].includes(profile.role)) {
    return <main className="shell"><section className="card"><h1>帳號等待核准</h1><p className="muted">目前帳號尚未取得教練權限。</p></section></main>;
  }

  const { data: teamId } = await supabase.rpc('current_team_id');
  const todayDate=taipeiDate();
  const [{ data: students }, { data: customSkillRows }, { data: groups }, { data: presets }, {data:checkins}, {data:devices}] = await Promise.all([
    supabase
      .from('students')
      .select('id,display_name,grade,class_name,seat_number,gender,training_group_id')
      .eq('active', true)
      .order('grade', { ascending: true, nullsFirst: false })
      .order('class_name', { ascending: true, nullsFirst: false })
      .order('seat_number', { ascending: true, nullsFirst: false })
      .order('display_name'),
    supabase
      .from('skills')
      .select('id,name,domain,subcategory,recommended_levels')
      .eq('is_custom', true)
      .eq('is_active', true)
      .order('domain')
      .order('name'),
    supabase
      .from('training_groups')
      .select('id,name,sort_order')
      .eq('team_id', teamId)
      .eq('active', true)
      .order('sort_order')
      .order('name'),
    supabase
      .from('group_training_presets')
      .select('group_id,skill_id,sort_order')
      .order('sort_order'),
    supabase
      .from('student_checkins')
      .select('id,student_id,device_id,attendance_date,first_checkin_at,last_scan_at,scan_count,source')
      .eq('team_id',teamId)
      .eq('attendance_date',todayDate)
      .order('first_checkin_at',{ascending:true}),
    supabase
      .from('team_devices')
      .select('id,name')
      .eq('team_id',teamId),
  ]);

  const customItems: TrainingItem[] = (customSkillRows ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    domain: item.domain,
    subcategory: item.subcategory ?? '自訂',
    recommendedLevels: ((item.recommended_levels ?? []).filter((level: string) => ['A','B','C','D','E','F'].includes(level))) as TrainingLevelId[],
  }));

  const studentMap=new Map((students??[]).map(student=>[student.id,student]));
  const deviceMap=new Map((devices??[]).map(device=>[device.id,device.name]));
  const todayCheckins=(checkins??[]).map(row=>({
    ...row,
    student:studentMap.get(row.student_id),
    deviceName:row.device_id?deviceMap.get(row.device_id)??'NFC 裝置':'手動',
  })).filter(row=>row.student);

  const suggestedSkillIds = (params.skills ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const sourceStudent = params.student ? (students ?? []).find((student) => student.id === params.student) : null;

  return (
    <main className="shell">
      <section className="hero compactHero">
        <div className="eyebrow">TABLE TENNIS SYSTEM V01</div>
        <h1>今日訓練</h1>
        <p>先完成全隊點名，再選擇今天要規劃全隊或哪一組的訓練內容。</p>
        <div className="topNav"><Link href="/students">學生名單</Link><Link href="/history">歷史訓練</Link><Link href="/training-groups">隊內分組</Link><Link href="/training-items">自訂訓練項目</Link><Link href="/">原型規劃器</Link></div>
      </section>

      {params.source === 'ability' ? <div className="notice successNotice"><b>已帶入能力建議：</b>{sourceStudent ? `${sourceStudent.display_name} 的` : ''}低評量技能已預先加入今日訓練，可再自行增減。</div> : null}
      {params.saved ? <div className="notice successNotice"><b>已儲存：</b>本次訓練已寫入 Supabase。</div> : null}
      {params.error ? <div className="notice errorNotice"><b>儲存失敗：</b>{params.error}</div> : null}
      <section className="card nfcTodayCard">
        <div className="sectionTitle"><div><span>NFC</span><h2>今日刷卡到場</h2></div><strong>{todayCheckins.length} 人</strong></div>
        <div className="nfcTodaySummary">
          <div><span>今日日期</span><b>{todayDate}</b></div>
          <div><span>已刷卡</span><b>{todayCheckins.length} 人</b></div>
          <div><span>有效裝置</span><b>{(devices??[]).length} 台</b></div>
          <Link href="/devices">裝置管理</Link>
        </div>
        {!todayCheckins.length?<div className="nfcEmpty"><b>目前尚無 NFC 簽到</b><span>學生刷卡後會立即出現在這裡。</span></div>:<div className="nfcCheckinGrid">
          {todayCheckins.map(row=>{
            const student=row.student!;
            return <article key={row.id}>
              <div className="nfcStudentBadge">{String(student.seat_number??'—').padStart(2,'0')}</div>
              <div className="nfcStudentInfo">
                <b>{student.display_name}</b>
                <small>{student.grade?student.grade+'年級':''}{student.class_name?' · '+student.class_name:''}{student.seat_number?' · '+student.seat_number+'號':''}</small>
              </div>
              <div className="nfcCheckinTime">
                <b>{new Date(row.first_checkin_at).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Taipei'})}</b>
                <small>{row.deviceName}{row.scan_count>1?' · 已刷 '+row.scan_count+' 次':''}</small>
              </div>
            </article>;
          })}
        </div>}
      </section>

      <DailyTrainingWorkspace
        students={students ?? []}
        initialItemIds={suggestedSkillIds}
        customItems={customItems}
        trainingGroups={groups ?? []}
        groupPresets={presets ?? []}
      />
      <style>{'.nfcTodayCard{margin-bottom:14px}.nfcTodaySummary{display:grid;grid-template-columns:repeat(3,1fr) auto;gap:8px;align-items:center;margin-bottom:12px}.nfcTodaySummary>div{padding:10px 11px;border-radius:12px;background:var(--theme-soft,#f5f7fa)}.nfcTodaySummary span,.nfcTodaySummary b{display:block}.nfcTodaySummary span{font-size:10px;color:#7a8797}.nfcTodaySummary b{font-size:14px;margin-top:2px}.nfcTodaySummary>a{text-decoration:none;color:var(--theme-primary,#263244);font-weight:900;font-size:11px}.nfcEmpty{display:flex;flex-direction:column;gap:3px;padding:18px;border:1px dashed #dbe1e7;border-radius:14px;text-align:center;color:#7b8795}.nfcEmpty b{color:#4c596a}.nfcCheckinGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.nfcCheckinGrid article{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid #e3e8ed;border-radius:13px;background:#fff}.nfcStudentBadge{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--theme-soft,#f5f3ff);color:var(--theme-primary,#263244);font-weight:950}.nfcStudentInfo b,.nfcStudentInfo small,.nfcCheckinTime b,.nfcCheckinTime small{display:block}.nfcStudentInfo small,.nfcCheckinTime small{font-size:10px;color:#7a8797;margin-top:2px}.nfcCheckinTime{text-align:right}.nfcCheckinTime b{font-size:14px}@media(max-width:680px){.nfcTodaySummary{grid-template-columns:1fr 1fr}.nfcTodaySummary>a{grid-column:1/-1}.nfcCheckinGrid{grid-template-columns:1fr}}'}</style>
    </main>
  );
}
