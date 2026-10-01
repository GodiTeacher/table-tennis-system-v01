'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AirconGroupFeeExport from '@/components/AirconGroupFeeExport';

type Row = {
  name: string;
  monthlyFee: number;
  members: number;
  personHours: number;
  theoreticalShare: number;
  groupCoolingFee: number;
  coolingPerPerson: number;
  totalPerPerson: number;
};

type Data = {
  month: string;
  totalCost: number;
  rows: Row[];
  unclassified: { personHours: number; groupCoolingFee: number } | null;
  rounding: string;
};

function Results({ data }: { data: Data }) {
  return (
    <div className="ceilFeeResults">
      <div className="ceilNotice">
        <b>實際收費採無條件進位。</b> 每人冷氣費先無條件進位到整元，再乘以收費人數。
      </div>

      <div className="ceilGrid">
        {data.rows.map((r) => (
          <article key={r.name}>
            <header>
              <div>
                <b>{r.name}</b>
                <span>原月費 ${Math.round(r.monthlyFee).toLocaleString()}｜{r.members} 人</span>
              </div>
              <strong>{r.personHours.toFixed(1)} 人時</strong>
            </header>
            <div className="ceilMetrics">
              <div><span>群組應收冷氣費</span><b>${r.groupCoolingFee.toLocaleString()}</b></div>
              <div><span>每人冷氣費</span><b>{r.members > 0 ? `$${r.coolingPerPerson.toLocaleString()}` : '請填人數'}</b></div>
              <div><span>每人本月應收</span><b>{r.members > 0 ? `$${Math.round(r.totalPerPerson).toLocaleString()}` : '—'}</b></div>
            </div>
          </article>
        ))}

        {data.unclassified && data.unclassified.groupCoolingFee > 0 ? (
          <article>
            <header>
              <div>
                <b>未分類／其他</b>
                <span>尚未指定到月費群組</span>
              </div>
              <strong>{data.unclassified.personHours.toFixed(1)} 人時</strong>
            </header>
            <div className="ceilMetrics">
              <div><span>應分攤冷氣費</span><b>${data.unclassified.groupCoolingFee.toLocaleString()}</b></div>
            </div>
          </article>
        ) : null}
      </div>

      <div className="ceilExport">
        <b>匯出冷氣費通知</b>
        <AirconGroupFeeExport
          month={data.month}
          totalCost={data.totalCost}
          rows={data.rows}
          unclassified={data.unclassified}
        />
      </div>

      <style jsx>{`
        .ceilNotice{padding:11px 12px;border-radius:12px;background:#f1fbf6;color:#286747;font-size:12px}
        .ceilGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
        .ceilGrid article{border:1px solid #e1e6eb;border-radius:14px;background:#fff;padding:13px}
        .ceilGrid header{display:flex;justify-content:space-between;gap:10px}
        .ceilGrid header>div{display:flex;flex-direction:column}
        .ceilGrid header span{font-size:12px;color:#748191}
        .ceilGrid header>strong{color:var(--theme-accent,#7c3aed)}
        .ceilMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}
        .ceilMetrics div{padding:10px;border-radius:10px;background:var(--theme-soft,#f4f7fa)}
        .ceilMetrics span{display:block;font-size:10px;color:#748191}
        .ceilMetrics b{font-size:15px}
        .ceilExport{margin-top:12px;padding:12px;border-radius:13px;background:var(--theme-soft,#f4f7fa)}
        .ceilExport>b{display:block;font-size:13px;margin-bottom:4px}
        @media(max-width:700px){.ceilGrid{grid-template-columns:1fr}.ceilMetrics{grid-template-columns:1fr 1fr 1fr}}
        @media(max-width:520px){.ceilMetrics{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}

export default function AirconGroupFeeEnhancer() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (window.location.pathname !== '/aircon') return;

    const qs = new URLSearchParams(window.location.search);
    if (qs.get('allocate') !== '1') return;

    const month = qs.get('month');
    if (!month) return;

    setVisible(true);

    const host = document.getElementById('group-results');
    let mount: HTMLElement | null = null;
    let oldGrid: HTMLElement | null = null;
    let oldNotice: HTMLElement | null = null;

    if (host) {
      mount = host.querySelector<HTMLElement>('[data-ceil-results]');
      if (!mount) {
        mount = document.createElement('div');
        mount.dataset.ceilResults = '1';
        host.appendChild(mount);
      }
      setTarget(mount);
      oldGrid = host.querySelector<HTMLElement>('.groupResultGrid');
      oldNotice = oldGrid?.nextElementSibling as HTMLElement | null;
    }

    const allow = qs.get('allow_unclassified') === '1' ? '&allow_unclassified=1' : '';
    const url = `/api/aircon/group-fees?month=${encodeURIComponent(month)}${allow}`;

    fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || '冷氣費匯出資料讀取失敗');
        return j as Data;
      })
      .then((j) => {
        setData(j);
        setError('');
        if (oldGrid) oldGrid.style.display = 'none';
        if (oldNotice?.classList.contains('notice')) oldNotice.style.display = 'none';
      })
      .catch((e) => setError(e instanceof Error ? e.message : '冷氣費匯出資料讀取失敗'));

    return () => {
      if (oldGrid) oldGrid.style.display = '';
      if (oldNotice?.classList.contains('notice')) oldNotice.style.display = '';
      mount?.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {target && data ? createPortal(<Results data={data} />, target) : null}

      <aside className="airconExportDock">
        <div className="airconExportHead">
          <div><small>冷氣月結</small><b>冷氣費匯出</b></div>
          <span>{data?.month ?? '讀取中'}</span>
        </div>

        {error ? (
          <div className="airconExportError">{error}</div>
        ) : data ? (
          <>
            <div className="airconExportSummary">
              學校冷氣費 <b>${Math.ceil(data.totalCost).toLocaleString()}</b>｜實際收費採無條件進位
            </div>
            <AirconGroupFeeExport
              month={data.month}
              totalCost={data.totalCost}
              rows={data.rows}
              unclassified={data.unclassified}
            />
          </>
        ) : (
          <div className="airconExportLoading">正在準備匯出資料…</div>
        )}

        <style jsx>{`
          .airconExportDock{position:fixed;right:18px;bottom:92px;z-index:38;width:min(390px,calc(100vw - 28px));padding:14px;border-radius:18px;background:rgba(255,255,255,.96);border:1px solid color-mix(in srgb,var(--theme-accent,#7c3aed) 25%,#dfe5ea);box-shadow:0 16px 36px rgba(28,38,65,.16);backdrop-filter:blur(14px)}
          .airconExportHead{display:flex;justify-content:space-between;align-items:center;gap:10px}
          .airconExportHead>div{display:flex;flex-direction:column}
          .airconExportHead small{font-size:10px;color:#7a8594}
          .airconExportHead b{font-size:16px;color:#263244}
          .airconExportHead>span{font-size:11px;font-weight:900;color:var(--theme-accent,#7c3aed);background:var(--theme-soft,#f4f1ff);padding:4px 8px;border-radius:999px}
          .airconExportSummary{margin-top:9px;padding:9px 10px;border-radius:11px;background:var(--theme-soft,#f6f4ff);font-size:12px;color:#596577}
          .airconExportError{margin-top:9px;padding:10px;border-radius:10px;background:#fff1f0;color:#ad3d35;font-size:12px}
          .airconExportLoading{margin-top:9px;color:#7a8594;font-size:12px}
          @media(max-width:650px){.airconExportDock{left:10px;right:10px;bottom:78px;width:auto}}
        `}</style>
      </aside>
    </>
  );
}
