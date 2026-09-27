'use client';

import { useMemo, useState } from 'react';
import { TRAINING_LEVELS, type TrainingLevelId } from '@/lib/training-levels';
import { TRAINING_ITEMS, getItemsForLevel } from '@/lib/training-items';
import { saveTrainingSession } from '@/app/today/actions';

type Student = { id: string; display_name: string };
type PlannedItem = { id: string; minutes: number };

export default function DailyTrainingWorkspace({ students }: { students: Student[] }) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(() => new Set(students.map((s) => s.id)));
  const [activeLevel, setActiveLevel] = useState<TrainingLevelId>('B');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set(['T03','T04','F02']));
  const [planOrder, setPlanOrder] = useState<string[]>(['T03','T04','F02']);
  const [minutes, setMinutes] = useState(90);
  const [tables, setTables] = useState(3);
  const [showAll, setShowAll] = useState(false);

  const attendance = students.filter((student) => selectedStudents.has(student.id));
  const people = attendance.length;
  const visibleItems = useMemo(() => showAll ? TRAINING_ITEMS : getItemsForLevel(activeLevel), [activeLevel, showAll]);
  const selectedItems = planOrder
    .filter((id) => selectedItemIds.has(id))
    .map((id) => TRAINING_ITEMS.find((item) => item.id === id))
    .filter(Boolean) as typeof TRAINING_ITEMS;

  const tablePlan = useMemo(() => {
    if (!people || tables <= 0) return [];
    const usedTables = Math.min(tables, people);
    const base = Math.floor(people / usedTables);
    const extra = people % usedTables;
    return Array.from({ length: usedTables }, (_, index) => base + (index < extra ? 1 : 0));
  }, [people, tables]);

  const warmupMinutes = minutes >= 60 ? 10 : 5;
  const cooldownMinutes = minutes >= 60 ? 5 : 0;
  const trainingMinutes = Math.max(0, minutes - warmupMinutes - cooldownMinutes);
  const plannedItems: PlannedItem[] = useMemo(() => {
    if (!selectedItems.length) return [];
    const base = Math.floor(trainingMinutes / selectedItems.length);
    const extra = trainingMinutes % selectedItems.length;
    return selectedItems.map((item, index) => ({ id: item.id, minutes: base + (index < extra ? 1 : 0) }));
  }, [selectedItems, trainingMinutes]);

  function toggleStudent(id: string) {
    setSelectedStudents((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleItem(id: string) {
    setSelectedItemIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
        setPlanOrder((order) => order.filter((itemId) => itemId !== id));
      } else {
        next.add(id);
        setPlanOrder((order) => order.includes(id) ? order : [...order, id]);
      }
      return next;
    });
  }

  function moveItem(id: string, direction: -1 | 1) {
    setPlanOrder((order) => {
      const current = order.indexOf(id);
      const target = current + direction;
      if (current < 0 || target < 0 || target >= order.length) return order;
      const next = [...order];
      [next[current], next[target]] = [next[target], next[current]];
      return next;
    });
  }

  return (
    <form action={saveTrainingSession}>
      <input type="hidden" name="focus_level" value={activeLevel} />
      <input type="hidden" name="duration_minutes" value={minutes} />
      <input type="hidden" name="table_count" value={tables} />
      <input type="hidden" name="student_ids" value={JSON.stringify(attendance.map((s) => s.id))} />
      <input type="hidden" name="plan_items" value={JSON.stringify(plannedItems)} />

      <section className="card">
        <div className="sectionTitle"><div><span>01</span><h2>今日到課</h2></div><strong>{people} 人</strong></div>
        {!students.length ? <p className="muted">學生名單目前是空的，請先到學生名單新增學生。</p> : (
          <div className="attendanceGrid">
            {students.map((student) => {
              const checked = selectedStudents.has(student.id);
              return <button type="button" key={student.id} className={checked ? 'attendance checked' : 'attendance'} onClick={() => toggleStudent(student.id)}>
                <span>{checked ? '✓' : '+'}</span><b>{student.display_name}</b>
              </button>;
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>02</span><h2>程度與訓練項目</h2></div><strong>{selectedItems.length} 項</strong></div>
        <div className="levelGrid">
          {TRAINING_LEVELS.map((level) => <button type="button" key={level.id} className={activeLevel === level.id ? 'level active' : 'level'} onClick={() => setActiveLevel(level.id)}>
            <b>{level.id}</b><span>{level.name}</span><small>{level.description}</small>
          </button>)}
        </div>
        <label className="switchRow roomy"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />顯示全部程度</label>
        <div className="notice"><b>跨程度共用：</b>切換 A～F 不會清除已選項目。</div>
        <div className="itemGrid">
          {visibleItems.map((item) => {
            const checked = selectedItemIds.has(item.id);
            return <button type="button" key={item.id} className={checked ? 'item checked' : 'item'} onClick={() => toggleItem(item.id)}>
              <span className="checkbox">{checked ? '✓' : '+'}</span><div><b>{item.name}</b><small>{item.domain} · {item.subcategory}</small></div>
            </button>;
          })}
        </div>
      </section>

      <section className="twoCol">
        <section className="card">
          <div className="sectionTitle"><div><span>03</span><h2>課程條件</h2></div></div>
          <div className="inputs twoInputs">
            <label>訓練時間<input type="number" min="15" value={minutes} onChange={(e) => setMinutes(Math.max(15, Number(e.target.value) || 15))}/><em>分鐘</em></label>
            <label>可用球桌<input type="number" min="1" value={tables} onChange={(e) => setTables(Math.max(1, Number(e.target.value) || 1))}/><em>桌</em></label>
          </div>
          <p className="muted">參與人數由「今日到課」自動計算，目前 {people} 人。</p>
        </section>
        <section className="card">
          <div className="sectionTitle"><div><span>04</span><h2>分桌建議</h2></div></div>
          <div className="tables">{tablePlan.map((count, index) => <div key={index}><b>{index + 1} 號桌</b><span>{count} 人</span></div>)}</div>
        </section>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>05</span><h2>今日課表</h2></div><strong>{minutes} 分鐘</strong></div>
        {!selectedItems.length ? <p className="muted">先選擇至少一個訓練項目。</p> : <div className="scheduleList">
          <div className="scheduleRow fixed"><span className="orderBadge">暖身</span><div><b>動態暖身＋球感啟動</b><small>固定流程</small></div><strong>{warmupMinutes} 分</strong></div>
          {selectedItems.map((item, index) => {
            const allocation = plannedItems.find((planned) => planned.id === item.id);
            return <div className="scheduleRow" key={item.id}>
              <span className="orderBadge">{index + 1}</span>
              <div><b>{item.name}</b><small>{item.domain} · {item.subcategory}</small></div>
              <div className="reorderButtons"><button type="button" disabled={index === 0} onClick={() => moveItem(item.id, -1)}>↑</button><button type="button" disabled={index === selectedItems.length - 1} onClick={() => moveItem(item.id, 1)}>↓</button></div>
              <strong>{allocation?.minutes ?? 0} 分</strong>
            </div>;
          })}
          {cooldownMinutes > 0 && <div className="scheduleRow fixed"><span className="orderBadge">收操</span><div><b>緩和＋身體回報</b><small>固定流程</small></div><strong>{cooldownMinutes} 分</strong></div>}
        </div>}
      </section>

      <section className="card saveCard">
        <div><b>今日訓練摘要</b><p className="muted">{people} 人 · {tables} 桌 · {minutes} 分鐘 · {selectedItems.length} 個訓練項目</p></div>
        <button className="primaryButton saveButton" disabled={!people || !selectedItems.length}>儲存本次訓練</button>
      </section>
    </form>
  );
}
