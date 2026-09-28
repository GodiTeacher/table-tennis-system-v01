'use client';

import { useMemo, useState } from 'react';
import { saveQuickAssessments } from '@/app/history/[id]/assess/actions';

type Student = { id: string; display_name: string; grade: number | null; class_name: string | null };
type Skill = { id: string; name: string; domain: string; subcategory: string | null };
type Latest = Record<string, Record<string, number | null>>;

export default function QuickAssessmentGrid({
  sessionId,
  students,
  skills,
  latest,
}: {
  sessionId: string;
  students: Student[];
  skills: Skill[];
  latest: Latest;
}) {
  const [values, setValues] = useState<Record<string, number>>({});

  const changedCount = Object.keys(values).length;
  const payload = useMemo(
    () => Object.entries(values).map(([key, levelValue]) => {
      const [studentId, skillId] = key.split('::');
      return { studentId, skillId, levelValue };
    }),
    [values]
  );

  function update(studentId: string, skillId: string, raw: string) {
    const key = `${studentId}::${skillId}`;
    setValues((previous) => {
      const next = { ...previous };
      if (!raw) delete next[key];
      else next[key] = Number(raw);
      return next;
    });
  }

  return (
    <>
      <style>{`
        .quickAssessmentTableWrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #e2e7ee;border-radius:16px;background:#fff}.quickAssessmentTable{width:100%;border-collapse:separate;border-spacing:0;min-width:680px}.quickAssessmentTable th,.quickAssessmentTable td{padding:12px;border-bottom:1px solid #edf0f4;border-right:1px solid #edf0f4;text-align:left;vertical-align:middle}.quickAssessmentTable th:last-child,.quickAssessmentTable td:last-child{border-right:0}.quickAssessmentTable tbody tr:last-child td{border-bottom:0}.quickAssessmentTable th{font-size:12px;color:#5f6d7e;background:#f7f9fb;position:sticky;top:0;z-index:2}.quickAssessmentTable th:first-child,.quickAssessmentTable td:first-child{position:sticky;left:0;background:#fff;z-index:1;min-width:145px}.quickAssessmentTable th:first-child{z-index:3;background:#f7f9fb}.quickAssessmentTable td b{display:block}.quickAssessmentTable td small{display:block;color:#738093;margin-top:3px}.quickAssessmentTable select{width:100%;min-width:105px;border:1px solid #d9e0e8;border-radius:10px;padding:9px 10px;background:#fff;font:inherit}.quickAssessmentSave{margin-top:14px;padding:14px 0 0;border-top:1px solid #edf0f4}.staticChip{display:inline-flex;border-radius:999px;background:#273444;color:#fff;padding:8px 11px;font-size:13px;font-weight:800}@media(max-width:520px){.quickAssessmentTable{min-width:620px}.quickAssessmentTable th,.quickAssessmentTable td{padding:10px}.quickAssessmentTable th:first-child,.quickAssessmentTable td:first-child{min-width:125px}}
      `}</style>
      <form action={saveQuickAssessments} className="quickAssessmentForm">
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="payload" value={JSON.stringify(payload)} />

        <div className="notice"><b>快速評量：</b>只要更新有變化的格子即可；沒選的技能不會新增紀錄。1～5 級會自動轉成學習狀態。</div>

        <div className="quickAssessmentTableWrap">
          <table className="quickAssessmentTable">
            <thead>
              <tr>
                <th>學生</th>
                {skills.map((skill) => <th key={skill.id}>{skill.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <b>{student.display_name}</b>
                    <small>{student.grade ? `${student.grade}年級` : '年級未設定'}{student.class_name ? ` · ${student.class_name}` : ''}</small>
                  </td>
                  {skills.map((skill) => {
                    const key = `${student.id}::${skill.id}`;
                    const current = latest[student.id]?.[skill.id] ?? null;
                    return (
                      <td key={skill.id}>
                        <select value={values[key] ?? ''} onChange={(e) => update(student.id, skill.id, e.target.value)} aria-label={`${student.display_name} ${skill.name} 評量`}>
                          <option value="">{current ? `目前 ${current}` : '不更新'}</option>
                          {[1,2,3,4,5].map((level) => <option value={level} key={level}>{level} 級</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="saveCard quickAssessmentSave">
          <div><b>本次將更新 {changedCount} 格評量</b><p className="muted smallText">建議只記錄今天有明顯進步、退步或需要追蹤的項目。</p></div>
          <button className="primaryButton saveButton" disabled={!changedCount}>儲存快速評量</button>
        </div>
      </form>
    </>
  );
}
