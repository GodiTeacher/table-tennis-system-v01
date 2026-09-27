import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveSkillAssessment } from './actions';

type SkillProgress = {
  skill_id: string;
  level_value: number | null;
  status: string | null;
  observation: string | null;
  assessed_at: string;
};

type SkillRow = {
  id: string;
  name: string;
  domain: string;
  subcategory: string | null;
  stage: string | null;
};

const STATUS_TEXT: Record<string, string> = {
  learning: '學習中',
  developing: '發展中',
  stable: '穩定',
  mastered: '已掌握',
};

const ABILITY_DOMAINS = [
  '控球與擊球',
  '移動與銜接',
  '旋轉發接發',
  '實戰與戰術',
  '打法與專項發展',
  '身體與比賽習慣',
] as const;

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || !['admin', 'coach'].includes(profile.role)) redirect('/today');

  const { data: student } = await supabase
    .from('students')
    .select('id,display_name,grade,class_name,gender,active,created_at')
    .eq('id', id)
    .single();
  if (!student) notFound();

  const [{ data: attendanceRows }, { data: progressRows }, { data: allSkills }] = await Promise.all([
    supabase.from('session_students').select('session_id,table_no,group_no').eq('student_id', id),
    supabase.from('student_skill_progress').select('skill_id,level_value,status,observation,assessed_at').eq('student_id', id).order('assessed_at', { ascending: false }),
    supabase.from('skills').select('id,name,domain,subcategory,stage').eq('is_active', true),
  ]);

  const sessionIds = [...new Set((attendanceRows ?? []).map((row) => row.session_id))];
  const [{ data: sessions }, { data: itemRows }] = await Promise.all([
    sessionIds.length
      ? supabase.from('training_sessions').select('id,session_date,focus_level,duration_minutes,table_count,created_at').in('id', sessionIds).order('session_date', { ascending: false }).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as Array<{ id: string; session_date: string; focus_level: string; duration_minutes: number; table_count: number; created_at: string }> }),
    sessionIds.length
      ? supabase.from('training_session_items').select('session_id,skill_id,planned_minutes').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as Array<{ session_id: string; skill_id: string; planned_minutes: number | null }> }),
  ]);

  const skills = (allSkills ?? []) as SkillRow[];
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const latestProgress = new Map<string, SkillProgress>();
  for (const row of (progressRows ?? []) as SkillProgress[]) {
    if (!latestProgress.has(row.skill_id)) latestProgress.set(row.skill_id, row);
  }

  const practiceMap = new Map<string, { count: number; minutes: number }>();
  for (const row of itemRows ?? []) {
    const current = practiceMap.get(row.skill_id) ?? { count: 0, minutes: 0 };
    current.count += 1;
    current.minutes += row.planned_minutes ?? 0;
    practiceMap.set(row.skill_id, current);
  }

  const practicedSkills = [...practiceMap.entries()]
    .map(([skillId, stats]) => ({ skillId, stats, skill: skillMap.get(skillId), progress: latestProgress.get(skillId) }))
    .sort((a, b) => b.stats.count - a.stats.count || b.stats.minutes - a.stats.minutes || (a.skill?.name ?? a.skillId).localeCompare(b.skill?.name ?? b.skillId, 'zh-Hant'));

  const abilityMetrics = ABILITY_DOMAINS.map((domain) => {
    const domainSkills = skills.filter((skill) => skill.domain === domain);
    const assessed = domainSkills
      .map((skill) => latestProgress.get(skill.id))
      .filter((progress): progress is SkillProgress => Boolean(progress?.level_value));
    const average = assessed.length
      ? assessed.reduce((sum, progress) => sum + (progress.level_value ?? 0), 0) / assessed.length
      : null;
    const mastered = assessed.filter((progress) => progress.status === 'mastered').length;
    return {
      domain,
      total: domainSkills.length,
      assessed: assessed.length,
      mastered,
      average,
    };
  });

  const ratedDomains = abilityMetrics.filter((metric) => metric.average != null);
  const weakestDomain = ratedDomains.length
    ? [...ratedDomains].sort((a, b) => (a.average ?? 99) - (b.average ?? 99))[0]
    : null;
  const incompleteDomains = abilityMetrics.filter((metric) => metric.total > 0 && metric.assessed < metric.total);

  const totalSessions = sessions?.length ?? 0;
  const totalMinutes = (sessions ?? []).reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0);
  const meta = [student.grade ? `${student.grade} 年級` : '年級未設定', student.class_name || '班級未設定', student.gender || '性別未設定'].join(' · ');

  return (
    <>
      <style>{`
        .studentStatsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.statCard{background:#fff;border:1px solid #e5e9ef;border-radius:18px;padding:18px;box-shadow:0 8px 24px rgba(24,33,47,.045)}.statCard span{display:block;color:#6b7789;font-size:13px;font-weight:800}.statCard strong{font-size:34px;line-height:1.2;margin-top:6px;display:inline-block}.statCard small{margin-left:5px;color:#718096}.skillProgressList{display:flex;flex-direction:column;gap:9px}.skillProgressRow{display:grid;grid-template-columns:minmax(0,1fr) 90px 120px;align-items:start;gap:14px;border:1px solid #e2e7ee;border-radius:15px;padding:13px 14px}.skillProgressMain b{display:block}.skillProgressMain small,.skillPracticeStats small,.skillStatus small{display:block;color:#738093;margin-top:4px}.skillPracticeStats{text-align:center;padding-top:4px}.skillPracticeStats strong{font-size:22px}.skillPracticeStats span{font-size:12px;margin-left:3px;color:#718096}.skillStatus{border-radius:11px;background:#f4f6f8;padding:9px 10px;text-align:center}.skillStatus.assessed{background:#edf8f2;color:#286846}.historyRowRight{display:flex;align-items:center;gap:14px}.historyRowRight span{color:#526276;font-weight:800}.assessmentDetails{margin-top:10px;border-top:1px solid #e7ebf0;padding-top:10px}.assessmentDetails summary{cursor:pointer;font-weight:800;color:#273444;list-style:none;display:inline-flex;align-items:center;gap:6px}.assessmentDetails summary::-webkit-details-marker{display:none}.assessmentForm{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.assessmentForm label{font-size:12px;font-weight:800;color:#647184}.assessmentForm select,.assessmentForm textarea{width:100%;margin-top:6px;border:1px solid #dce2ea;border-radius:10px;padding:10px;font:inherit;background:#fff}.assessmentForm textarea{grid-column:1/-1;resize:vertical;min-height:72px}.assessmentForm button{grid-column:1/-1}.assessmentObservation{margin-top:7px;color:#667386;font-size:13px;line-height:1.5}.abilityGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.abilityCard{border:1px solid #e2e7ee;border-radius:16px;padding:15px;background:#fbfcfe}.abilityCard.empty{opacity:.6}.abilityCardTop{display:flex;justify-content:space-between;gap:10px;align-items:start}.abilityCardTop b{font-size:16px}.abilityScore{text-align:right}.abilityScore strong{font-size:26px}.abilityScore span{font-size:12px;color:#718096}.abilityBar{height:9px;background:#edf1f5;border-radius:999px;overflow:hidden;margin:12px 0 9px}.abilityBar>i{display:block;height:100%;background:#273444;border-radius:999px}.abilityMeta{display:flex;justify-content:space-between;gap:8px;color:#6b7789;font-size:12px}.nextStepGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.nextStepBox{border:1px solid #e2e7ee;border-radius:15px;padding:14px;background:#f8fafc}.nextStepBox b{display:block;margin-bottom:6px}.nextStepBox p{margin:0;color:#657184;line-height:1.6}.nextStepBox strong{color:#18212f}@media(max-width:900px){.abilityGrid{grid-template-columns:1fr 1fr}}@media(max-width:780px){.studentStatsGrid{grid-template-columns:1fr 1fr}.skillProgressRow{grid-template-columns:minmax(0,1fr) 75px}.skillStatus{grid-column:1/-1;text-align:left}.nextStepGrid{grid-template-columns:1fr}}@media(max-width:520px){.studentStatsGrid{grid-template-columns:1fr 1fr}.statCard{padding:14px}.statCard strong{font-size:28px}.skillProgressRow{grid-template-columns:minmax(0,1fr) 66px}.historyRowRight{flex-direction:column;align-items:flex-end;gap:3px}.assessmentForm{grid-template-columns:1fr}.assessmentForm textarea,.assessmentForm button{grid-column:auto}.abilityGrid{grid-template-columns:1fr}}
      `}</style>
      <main className="shell">
        <section className="hero compactHero">
          <div className="eyebrow">STUDENT PROFILE</div>
          <h1>{student.display_name}</h1>
          <p>{meta} · {student.active ? '啟用中' : '已停用'}</p>
          <div className="topNav"><Link href="/students">學生管理</Link><Link href="/today">今日訓練</Link><Link href="/history">歷史訓練</Link></div>
        </section>

        {query.error ? <div className="notice errorNotice"><b>評量儲存失敗：</b>{query.error}</div> : null}

        <section className="studentStatsGrid">
          <div className="statCard"><span>訓練出席</span><strong>{totalSessions}</strong><small>次</small></div>
          <div className="statCard"><span>累積課程時間</span><strong>{totalMinutes}</strong><small>分鐘</small></div>
          <div className="statCard"><span>練過技能</span><strong>{practiceMap.size}</strong><small>項</small></div>
          <div className="statCard"><span>已有評量</span><strong>{latestProgress.size}</strong><small>項</small></div>
        </section>

        <section className="card">
          <div className="sectionTitle"><div><span>01</span><h2>六大面向能力地圖</h2></div><strong>V1</strong></div>
          <div className="notice"><b>計算方式：</b>以各面向最新技能評量的 1～5 級平均計算；尚未評量不計入平均。第六面向目前尚未匯入正式技能，因此保留位置但不產生分數。</div>
          <div className="abilityGrid">
            {abilityMetrics.map((metric) => {
              const percent = metric.average == null ? 0 : Math.max(0, Math.min(100, (metric.average / 5) * 100));
              return <div className={`abilityCard ${metric.total === 0 ? 'empty' : ''}`} key={metric.domain}>
                <div className="abilityCardTop">
                  <b>{metric.domain}</b>
                  <div className="abilityScore">{metric.average == null ? <strong>—</strong> : <><strong>{metric.average.toFixed(1)}</strong><span> / 5</span></>}</div>
                </div>
                <div className="abilityBar"><i style={{ width: `${percent}%` }} /></div>
                <div className="abilityMeta">
                  <span>{metric.total === 0 ? '技能庫尚未建置' : `已評量 ${metric.assessed}/${metric.total}`}</span>
                  <span>{metric.mastered > 0 ? `已掌握 ${metric.mastered}` : metric.total > 0 ? '持續累積' : '—'}</span>
                </div>
              </div>;
            })}
          </div>
        </section>

        <section className="card">
          <div className="sectionTitle"><div><span>02</span><h2>下一步建議</h2></div></div>
          <div className="nextStepGrid">
            <div className="nextStepBox">
              <b>目前優先加強面向</b>
              {weakestDomain ? <p><strong>{weakestDomain.domain}</strong>目前平均 {weakestDomain.average?.toFixed(1)} / 5。可優先從這個面向已練過、但評量較低的技能安排下一輪訓練。</p> : <p>目前還沒有足夠的技能評量，先完成至少 1～2 個技能評量後再產生加強建議。</p>}
            </div>
            <div className="nextStepBox">
              <b>評量完整度</b>
              {incompleteDomains.length ? <p>目前仍有 <strong>{incompleteDomains.length}</strong> 個面向尚未完成評量。建議先補：{incompleteDomains.slice(0, 3).map((item) => item.domain).join('、')}。</p> : <p>目前已有技能的面向都完成評量，可開始用能力圖追蹤變化。</p>}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="sectionTitle"><div><span>03</span><h2>技能訓練累積</h2></div><strong>{practicedSkills.length} 項</strong></div>
          <div className="notice"><b>教練評量：</b>展開技能即可設定「學習狀態、1～5 等級、觀察紀錄」。每次儲存都會保留歷史評量，個人頁顯示最新一次。</div>
          {!practicedSkills.length ? <p className="muted">目前還沒有訓練紀錄。學生參加課程後，技能累積會自動出現在這裡。</p> : (
            <div className="skillProgressList">
              {practicedSkills.map(({ skillId, skill, stats, progress }) => (
                <div className="skillProgressRow" key={skillId}>
                  <div className="skillProgressMain">
                    <b>{skill?.name ?? skillId}</b>
                    <small>{skill ? `${skill.domain}${skill.subcategory ? ` · ${skill.subcategory}` : ''}` : '技能資料未找到'}</small>
                    {progress?.observation ? <div className="assessmentObservation">最近觀察：{progress.observation}</div> : null}
                    <details className="assessmentDetails">
                      <summary>✎ {progress ? '更新評量' : '新增評量'}</summary>
                      <form action={saveSkillAssessment} className="assessmentForm">
                        <input type="hidden" name="student_id" value={student.id} />
                        <input type="hidden" name="skill_id" value={skillId} />
                        <label>學習狀態
                          <select name="status" defaultValue={progress?.status ?? 'learning'}>
                            <option value="learning">學習中</option>
                            <option value="developing">發展中</option>
                            <option value="stable">穩定</option>
                            <option value="mastered">已掌握</option>
                          </select>
                        </label>
                        <label>能力等級
                          <select name="level_value" defaultValue={progress?.level_value ?? 1}>
                            {[1,2,3,4,5].map((level) => <option value={level} key={level}>{level} 級</option>)}
                          </select>
                        </label>
                        <textarea name="observation" defaultValue={progress?.observation ?? ''} placeholder="教練觀察，例如：定點穩定，但移動後擊球成功率下降。" maxLength={500} />
                        <button className="primaryButton">儲存此技能評量</button>
                      </form>
                    </details>
                  </div>
                  <div className="skillPracticeStats"><strong>{stats.count}</strong><span>次</span><small>{stats.minutes} 分</small></div>
                  <div className={progress ? 'skillStatus assessed' : 'skillStatus'}>
                    <b>{progress?.status ? (STATUS_TEXT[progress.status] ?? progress.status) : '尚未評量'}</b>
                    {progress?.level_value != null ? <small>等級 {progress.level_value}</small> : <small>—</small>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="sectionTitle"><div><span>04</span><h2>最近訓練</h2></div><strong>{totalSessions} 筆</strong></div>
          {!sessions?.length ? <p className="muted">目前尚無訓練紀錄。</p> : (
            <div className="historyList">
              {sessions.slice(0, 10).map((session) => {
                const attendance = (attendanceRows ?? []).find((row) => row.session_id === session.id);
                return <Link className="historyRow" href={`/history/${session.id}`} key={session.id}>
                  <div><b>{session.session_date}</b><small>{session.focus_level} 級 · {attendance?.table_no ? `${attendance.table_no} 號桌` : '未分桌'}</small></div>
                  <div className="historyRowRight"><strong>{session.duration_minutes} 分鐘</strong><span>查看 ›</span></div>
                </Link>;
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
