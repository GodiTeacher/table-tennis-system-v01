'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { href: '/attendance-settings', label: '學生出勤', short: '出勤', no: '01', icon: '👥' },
  { href: '/aircon', label: '冷氣登記與費用', short: '冷氣', no: '02', icon: '❄️' },
  { href: '/payroll', label: '教練薪酬', short: '薪酬', no: '03', icon: '🧑‍🏫' },
  { href: '/operations-close', label: '營運月結', short: '月結', no: '04', icon: '📊' },
];

export default function OperationsFlowNav() {
  const pathname = usePathname();
  const visible = STEPS.some((step) => pathname === step.href || pathname.startsWith(`${step.href}/`));
  if (!visible) return null;

  return (
    <nav className="opsFlow" aria-label="球隊營運流程">
      <div className="opsFlowInner">
        <div className="opsFlowHeader">
          <b>球隊營運流程</b>
          <span>4 STEPS</span>
        </div>
        <div className="opsFlowSteps">
          {STEPS.map((step, index) => {
            const active = pathname === step.href || pathname.startsWith(`${step.href}/`);
            return (
              <div className="opsFlowCell" key={step.href}>
                <Link className={`opsFlowStep ${active ? 'active' : ''}`} href={step.href}>
                  <span className="opsFlowIcon">{step.icon}</span>
                  <span className="opsFlowText">
                    <small>STEP {step.no}</small>
                    <b className="desktopLabel">{step.label}</b>
                    <b className="mobileLabel">{step.short}</b>
                  </span>
                </Link>
                {index < STEPS.length - 1 ? <span className="opsFlowArrow" aria-hidden="true">›</span> : null}
              </div>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .opsFlow{position:sticky;top:0;z-index:45;padding:8px 14px 0;pointer-events:none}
        .opsFlowInner{max-width:1020px;margin:0 auto;padding:10px 12px;border:1px solid color-mix(in srgb,var(--theme-accent,#7c3aed) 22%,#dfe5ea);border-radius:18px;background:rgba(255,255,255,.96);box-shadow:0 8px 24px rgba(20,30,55,.08);backdrop-filter:blur(12px);pointer-events:auto;overflow:hidden}
        .opsFlowHeader{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:#536071}.opsFlowHeader b{font-size:13px;color:#273244}.opsFlowHeader span{padding:3px 8px;border-radius:999px;background:var(--theme-soft,#f5f3ff);font-size:11px;font-weight:900;color:var(--theme-accent,#7c3aed)}
        .opsFlowSteps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .opsFlowCell{position:relative;min-width:0}.opsFlowStep{display:flex;align-items:center;gap:9px;width:100%;min-width:0;min-height:58px;padding:9px 12px;border-radius:13px;text-decoration:none;color:#596577;background:#fff;border:1px solid #e6e9ee;box-shadow:0 2px 6px rgba(20,30,55,.03);box-sizing:border-box}.opsFlowStep.active{background:linear-gradient(120deg,var(--theme-accent,#7c3aed),#ec4899 62%,#14b8a6);color:#fff;border-color:transparent;box-shadow:0 6px 16px rgba(124,58,237,.20)}
        .opsFlowIcon{font-size:20px;line-height:1;flex:0 0 auto}.opsFlowText{display:flex;flex-direction:column;min-width:0;line-height:1.15}.opsFlowText small{font-size:9px;letter-spacing:.05em;opacity:.75}.opsFlowText b{font-size:12px;white-space:normal;overflow-wrap:anywhere}.opsFlowArrow{position:absolute;right:-9px;top:50%;transform:translate(50%,-50%);z-index:2;width:18px;height:18px;display:grid;place-items:center;border-radius:999px;background:#fff;color:#9aa4b2;font-size:16px;box-shadow:0 1px 4px rgba(20,30,55,.10)}.mobileLabel{display:none}
        @media(max-width:760px){.opsFlow{padding:5px 6px 0}.opsFlowInner{padding:6px;border-radius:14px}.opsFlowHeader{display:none}.opsFlowSteps{gap:5px}.opsFlowStep{min-height:50px;padding:7px 4px;justify-content:center;gap:4px;border-radius:10px;text-align:center}.opsFlowIcon{font-size:15px}.opsFlowText small{font-size:7px}.opsFlowText b{font-size:10px;line-height:1.1}.desktopLabel{display:none}.mobileLabel{display:block}.opsFlowArrow{right:-4px;width:13px;height:13px;font-size:11px}}
        @media(max-width:390px){.opsFlowStep{min-height:47px}.opsFlowIcon{font-size:14px}.opsFlowText b{font-size:9px}}
      `}</style>
    </nav>
  );
}
