'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { href: '/attendance-settings', label: '學生出勤', short: '出勤', no: '01', icon:'👥' },
  { href: '/aircon', label: '冷氣登記與費用', short: '冷氣', no: '02', icon:'❄️' },
  { href: '/payroll', label: '教練薪酬', short: '薪酬', no: '03', icon:'🧑‍🏫' },
  { href: '/operations-close', label: '營運月結', short: '月結', no: '04', icon:'📊' },
];

export default function OperationsFlowNav() {
  const pathname = usePathname();
  const visible = STEPS.some((step) => pathname === step.href || pathname.startsWith(`${step.href}/`));
  if (!visible) return null;

  return (
    <nav className="opsFlow" aria-label="球隊營運流程">
      <div className="opsFlowInner">
        <div className="opsFlowHeader"><b>球隊營運流程</b><span>4 STEPS</span></div>
        <div className="opsFlowSteps">
          {STEPS.map((step, index) => {
            const active = pathname === step.href || pathname.startsWith(`${step.href}/`);
            return (
              <div className="opsFlowStepWrap" key={step.href}>
                <Link className={`opsFlowStep ${active ? 'active' : ''}`} href={step.href}>
                  <span className="opsFlowIcon">{step.icon}</span>
                  <span className="opsFlowText"><small>STEP {step.no}</small><b className="desktopLabel">{step.label}</b><b className="mobileLabel">{step.short}</b></span>
                </Link>
                {index < STEPS.length - 1 ? <span className="opsFlowArrow">›</span> : null}
              </div>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .opsFlow{position:sticky;top:0;z-index:45;padding:10px 14px 0;pointer-events:none}
        .opsFlowInner{max-width:1020px;margin:0 auto;padding:10px;border:1px solid color-mix(in srgb,var(--theme-accent,#7c3aed) 22%,#dfe5ea);border-radius:20px;background:color-mix(in srgb,#fff 94%,var(--theme-soft,#f5f3ff));box-shadow:0 10px 30px rgba(20,30,55,.10);backdrop-filter:blur(14px);pointer-events:auto}
        .opsFlowHeader{display:flex;align-items:center;justify-content:space-between;padding:0 4px 8px;color:#536071;font-size:12px}.opsFlowHeader b{font-size:13px;color:#273244}.opsFlowHeader span{padding:3px 8px;border-radius:999px;background:var(--theme-soft,#f5f3ff);font-weight:800;color:var(--theme-accent,#7c3aed)}
        .opsFlowSteps{display:flex;align-items:center;gap:7px}.opsFlowStepWrap{display:flex;align-items:center;gap:7px;min-width:0;flex:1}.opsFlowStep{display:flex;align-items:center;gap:9px;min-width:0;flex:1;padding:9px 11px;border-radius:14px;text-decoration:none;color:#596577;background:#fff;border:1px solid #e6e9ee;transition:.15s ease;box-shadow:0 2px 6px rgba(20,30,55,.03)}.opsFlowStep:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--theme-accent,#7c3aed) 30%,#e6e9ee)}.opsFlowStep.active{background:linear-gradient(120deg,var(--theme-accent,#7c3aed),#ec4899 62%,#14b8a6);color:#fff;border-color:transparent;box-shadow:0 6px 16px rgba(124,58,237,.20)}.opsFlowIcon{font-size:19px;line-height:1}.opsFlowText{display:flex;flex-direction:column;min-width:0;line-height:1.15}.opsFlowText small{font-size:9px;letter-spacing:.06em;opacity:.74}.opsFlowText b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.opsFlowArrow{font-size:22px;color:#a5adba;flex:0 0 auto}.mobileLabel{display:none}
        @media(max-width:760px){.opsFlow{padding:6px 7px 0}.opsFlowInner{padding:7px;border-radius:16px}.opsFlowHeader{display:none}.opsFlowSteps,.opsFlowStepWrap{gap:3px}.opsFlowStep{justify-content:center;padding:8px 5px;gap:4px;border-radius:11px}.opsFlowIcon{font-size:15px}.opsFlowText small{font-size:8px}.opsFlowText b{font-size:11px}.opsFlowArrow{font-size:15px}.desktopLabel{display:none}.mobileLabel{display:block}}
      `}</style>
    </nav>
  );
}
