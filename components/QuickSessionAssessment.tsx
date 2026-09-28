'use client';

import { useMemo, useState } from 'react';
import { saveQuickAssessments } from '@/app/history/[id]/review/actions';

type Student = { id:string; display_name:string; grade:number|null; class_name:string|null; gender:string|null };
type Skill = { id:string; name:string; domain:string; subcategory:string|null };
type Existing = { student_id:string; skill_id:string; status:string|null; level_value:number|null; observation:string|null };
type Draft = { enabled:boolean; status:string; level:number; observation:string };

export default function QuickSessionAssessment({
  sessionId, students, skills, existing,
}: {
  sessionId:string;
  students:Student[];
  skills:Skill[];
  existing:Existing[];
}) {
  const existingMap = useMemo(() => new Map(existing.map((row) => [`${row.student_id}:${row.skill_id}`, row])), [existing]);
  const [activeStudent, setActiveStudent] = useState(students[0]?.id ?? '');
  const [drafts, setDrafts] = useState<Record<string,Draft>>({});

  function key(studentId:string, skillId:string){ return `${studentId}:${skillId}`; }
  function getDraft(studentId:string, skillId:string):Draft {
    const k = key(studentId, skillId);
    const stored = drafts[k];
    if (stored) return stored;
    const prior = existingMap.get(k);
    return { enabled:false, status:prior?.status ?? 'learning', level:prior?.level_value ?? 1, observation:prior?.observation ?? '' };
  }
  function patch(studentId:string, skillId:string, patchValue:Partial<Draft>){
    const k = key(studentId, skillId);
    setDrafts((prev) => ({ ...prev, [k]: { ...getDraft(studentId, skillId), ...patchValue } }));
  }

  const payload = Object.entries(drafts)
    .filter(([,draft]) => draft.enabled)
    .map(([compound,draft]) => {
      const [student_id, skill_id] = compound.split(':');
      return { student_id, skill_id, status:draft.status, level_value:draft.level, observation:draft.observation };
    });
  const currentStudent = students.find((student) => student.id === activeStudent) ?? students[0];

  return (
    <form action={saveQuickAssessments.bind(null, sessionId)}>
      <input type="hidden" name="assessments" value={JSON.stringify(payload)} />
      <style>{`
        .quickAssessTabs{display:flex;gap:8px;overflow:auto;padding-bottom:6px}.quickAssessTabs button{white-space:nowrap;border:1px solid #dce2ea;background:#fff;border-radius:999px;padding:9px 12px;font-weight:800}.quickAssessTabs button.active{background:#273444;color:#fff;border-color:#273444}.quickAssessGrid{display:flex;flex-direction:column;gap:10px;margin-top:14px}.quickAssessRow{border:1px solid #e2e7ee;border-radius:16px;padding:14px;background:#fff}.quickAssessHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.quickAssessHead small{display:block;color:#738093;margin-top:3px}.quickAssessToggle{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800}.quickAssessControls{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.quickAssessControls label{font-size:12px;font-weight:800;color:#647184}.quickAssessControls select,.quickAssessControls input{width:100%;margin-top:6px;border:1px solid #dce2ea;border-radius:10px;padding:10px;background:#fff;font:inherit}.quickAssessNote{grid-column:1/-1}.quickAssessSummary{position:sticky;bottom:92px;z-index:20;margin-top:16px;background:#273444;color:#fff;border-radius:16px;padding:12px 14px;display:flex;justify-content:space-between;gap:12px;align-items:center}.quickAssessSummary button{background:#fff;color:#273444;border:0;border-radius:10px;padding:10px 14px;font-weight:900}.quickAssessSummary button:disabled{opacity:.5}@media(max-width:560px){.quickAssessControls{grid-template-columns:1fr}.quickAssessNote{grid-column:auto}.quickAssessSummary{align-items:flex-start;flex-direction:column}.quickAssessSummary button{width:100%}}
      `}</style>
      <div className="quickAssessTabs">
        {students.map((student) => <button type="button" key={student.id} className={student.id===currentStudent?.id?'active':''} onClick={() => setActiveStudent(student.id)}>{student.display_name}</button>)}
      </div>

      {currentStudent ? <>
        <div className="notice"><b>{currentStudent.display_name}</b> · {[currentStudent.grade ? `${currentStudent.grade}年級` : null,currentStudent.class_name,currentStudent.gender].filter(Boolean).join(' · ')}。只勾選本次要更新的技能即可。</div>
        <div className="quickAssessGrid">
          {skills.map((skill) => {
            const draft = getDraft(currentStudent.id, skill.id);
            const prior = existingMap.get(key(currentStudent.id, skill.id));
            return <div className="quickAssessRow" key={skill.id}>
              <div className="quickAssessHead">
                <div><b>{skill.name}</b><small>{skill.domain}{skill.subcategory ? ` · ${skill.subcategory}` : ''}{prior?.level_value ? ` · 上次 ${prior.level_value}級` : ' · 尚無評量'}</small></div>
                <label className="quickAssessToggle"><input type="checkbox" checked={draft.enabled} onChange={(e)=>patch(currentStudent.id,skill.id,{enabled:e.target.checked})}/>本次評量</label>
              </div>
              {draft.enabled ? <div className="quickAssessControls">
                <label>學習狀態<select value={draft.status} onChange={(e)=>patch(currentStudent.id,skill.id,{status:e.target.value})}><option value="learning">學習中</option><option value="developing">發展中</option><option value="stable">穩定</option><option value="mastered">已掌握</option></select></label>
                <label>能力等級<select value={draft.level} onChange={(e)=>patch(currentStudent.id,skill.id,{level:Number(e.target.value)})}>{[1,2,3,4,5].map((level)=><option value={level} key={level}>{level} 級</option>)}</select></label>
                <label className="quickAssessNote">教練備註<input value={draft.observation} onChange={(e)=>patch(currentStudent.id,skill.id,{observation:e.target.value})} placeholder="可留空，例如：移動後擊球仍不穩" maxLength={300}/></label>
              </div> : null}
            </div>;
          })}
        </div>
      </> : null}

      <div className="quickAssessSummary"><span>本次共勾選 <b>{payload.length}</b> 筆評量，可跨學生一起儲存。</span><button disabled={!payload.length}>儲存課後評量</button></div>
    </form>
  );
}
