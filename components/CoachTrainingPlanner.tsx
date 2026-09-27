"use client";

import { useMemo, useState } from "react";
import { TRAINING_LEVELS, type TrainingLevelId } from "@/lib/training-levels";
import { TRAINING_ITEMS, getItemsForLevel } from "@/lib/training-items";

type PlannedItem = { id: string; minutes: number };

export default function CoachTrainingPlanner() {
  const [activeLevel, setActiveLevel] = useState<TrainingLevelId>("B");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(["T03", "T04", "F02"])
  );
  const [planOrder, setPlanOrder] = useState<string[]>(["T03", "T04", "F02"]);
  const [minutes, setMinutes] = useState(90);
  const [people, setPeople] = useState(6);
  const [tables, setTables] = useState(3);
  const [showAll, setShowAll] = useState(false);

  const visibleItems = useMemo(
    () => (showAll ? TRAINING_ITEMS : getItemsForLevel(activeLevel)),
    [activeLevel, showAll]
  );

  const selectedItems = planOrder
    .filter((id) => selectedItemIds.has(id))
    .map((id) => TRAINING_ITEMS.find((item) => item.id === id))
    .filter(Boolean) as typeof TRAINING_ITEMS;

  function toggleItem(id: string) {
    setSelectedItemIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
        setPlanOrder((order) => order.filter((itemId) => itemId !== id));
      } else {
        next.add(id);
        setPlanOrder((order) => (order.includes(id) ? order : [...order, id]));
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

  const tablePlan = useMemo(() => {
    if (tables <= 0 || people <= 0) return [];
    const usedTables = Math.min(tables, people);
    const base = Math.floor(people / usedTables);
    const extra = people % usedTables;
    return Array.from({ length: usedTables }, (_, index) => base + (index < extra ? 1 : 0));
  }, [people, tables]);

  const plannedItems: PlannedItem[] = useMemo(() => {
    if (!selectedItems.length) return [];
    const warmup = minutes >= 60 ? 10 : 5;
    const cooldown = minutes >= 60 ? 5 : 0;
    const usable = Math.max(selectedItems.length * 5, minutes - warmup - cooldown);
    const base = Math.floor(usable / selectedItems.length);
    const extra = usable % selectedItems.length;
    return selectedItems.map((item, index) => ({
      id: item.id,
      minutes: base + (index < extra ? 1 : 0),
    }));
  }, [minutes, selectedItems]);

  const warmupMinutes = minutes >= 60 ? 10 : 5;
  const cooldownMinutes = minutes >= 60 ? 5 : 0;

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">桌球系統 App V01 · Phase 3B</p>
        <h1>教練訓練規劃器</h1>
        <p>程度只負責推薦與篩選；今日已選訓練跨 A–F 共用。選完項目後，系統會依總時間產生可調整順序的今日課表。</p>
      </section>

      <section className="card">
        <div className="sectionTitle">
          <div><span>01</span><h2>教練程度選擇器</h2></div>
          <strong>{selectedItems.length} 項已選</strong>
        </div>
        <div className="levelGrid">
          {TRAINING_LEVELS.map((level) => (
            <button key={level.id} className={activeLevel === level.id ? "level active" : "level"} onClick={() => setActiveLevel(level.id)}>
              <b>{level.id}</b><span>{level.name}</span><small>{level.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="sectionTitle">
          <div><span>02</span><h2>選擇訓練項目</h2></div>
          <label className="switchRow"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />顯示全部程度</label>
        </div>
        <div className="notice"><b>跨程度共用已啟用：</b>你在 B 選好的內容，切到 A、C～F 都會保留；程度不再擁有獨立勾選狀態。</div>
        <div className="itemGrid">
          {visibleItems.map((item) => {
            const checked = selectedItemIds.has(item.id);
            return (
              <button key={item.id} className={checked ? "item checked" : "item"} onClick={() => toggleItem(item.id)}>
                <span className="checkbox">{checked ? "✓" : "+"}</span>
                <div><b>{item.name}</b><small>{item.domain} · {item.subcategory}</small></div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="twoCol">
        <section className="card">
          <div className="sectionTitle"><div><span>03</span><h2>課程條件</h2></div></div>
          <div className="inputs">
            <label>訓練時間<input type="number" min="15" value={minutes} onChange={(e)=>setMinutes(Math.max(15, Number(e.target.value) || 15))}/><em>分鐘</em></label>
            <label>參與人數<input type="number" min="1" value={people} onChange={(e)=>setPeople(Math.max(1, Number(e.target.value) || 1))}/><em>人</em></label>
            <label>可用球桌<input type="number" min="1" value={tables} onChange={(e)=>setTables(Math.max(1, Number(e.target.value) || 1))}/><em>桌</em></label>
          </div>
        </section>
        <section className="card">
          <div className="sectionTitle"><div><span>04</span><h2>分桌建議</h2></div></div>
          <div className="tables">{tablePlan.map((count, index) => <div key={index}><b>{index+1} 號桌</b><span>{count} 人</span></div>)}</div>
          <p className="muted">{people} 人 / {tables} 桌 / {minutes} 分鐘。下一階段會加入學生姓名、程度與輪替規則。</p>
        </section>
      </section>

      <section className="card">
        <div className="sectionTitle"><div><span>05</span><h2>今日自動課表</h2></div><strong>{minutes} 分鐘</strong></div>
        {!selectedItems.length ? <p className="muted">先選擇至少一個訓練項目。</p> : (
          <div className="scheduleList">
            <div className="scheduleRow fixed"><span className="orderBadge">暖身</span><div><b>動態暖身＋球感啟動</b><small>固定流程</small></div><strong>{warmupMinutes} 分</strong></div>
            {selectedItems.map((item, index) => {
              const allocation = plannedItems.find((planned) => planned.id === item.id);
              return (
                <div className="scheduleRow" key={item.id}>
                  <span className="orderBadge">{index + 1}</span>
                  <div><b>{item.name}</b><small>{item.domain} · {item.subcategory}</small></div>
                  <div className="reorderButtons">
                    <button disabled={index === 0} onClick={() => moveItem(item.id, -1)}>↑</button>
                    <button disabled={index === selectedItems.length - 1} onClick={() => moveItem(item.id, 1)}>↓</button>
                  </div>
                  <strong>{allocation?.minutes ?? 0} 分</strong>
                </div>
              );
            })}
            {cooldownMinutes > 0 && <div className="scheduleRow fixed"><span className="orderBadge">收操</span><div><b>緩和＋身體回報</b><small>固定流程</small></div><strong>{cooldownMinutes} 分</strong></div>}
          </div>
        )}
        <p className="muted">時間目前採平均分配作為 V01 預設；教練可先調整項目順序，下一版再加入每項分鐘數手動微調與智慧權重。</p>
      </section>

      <section className="card selected">
        <div className="sectionTitle"><div><span>06</span><h2>今日已選訓練</h2></div><strong>{selectedItems.length} 項</strong></div>
        {selectedItems.length === 0 ? <p className="muted">尚未選擇訓練項目。</p> : <div className="chips">{selectedItems.map((item) => <button key={item.id} onClick={() => toggleItem(item.id)}>{item.name} <span>×</span></button>)}</div>}
      </section>
    </main>
  );
}
