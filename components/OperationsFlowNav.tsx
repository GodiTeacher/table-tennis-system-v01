'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { href: '/attendance-settings', label: '學生出勤', short: '出勤', no: '01' },
  { href: '/aircon', label: '冷氣登記與費用', short: '冷氣', no: '02' },
  { href: '/payroll', label: '教練薪酬與月結', short: '薪酬', no: '03' },
];

export default function OperationsFlowNav() {
  const pathname = usePathname();
  const visible = STEPS.some((step) => pathname === step.href || pathname.startsWith(`${step.href}/`));
  if (!visible) return null;

  return (
    <nav className="opsFlow" aria-label="球隊營運流程">
      <div className="opsFlowInner">
        <span className="opsFlowTitle">營運流程</span>
        <div className="opsFlowSteps">
          {STEPS.map((step, index) => {
            const active = pathname === step.href || pathname.startsWith(`${step.href}/`);
            return (
              <div className="opsFlowStepWrap" key={step.href}>
                <Link className={`opsFlowStep ${active ? 'active' : ''}`} href={step.href}>
                  <span className="opsFlowNo">{step.no}</span>
                  <span className="opsFlowLabel"><span className="desktopLabel">{step.label}</span><span className="mobileLabel">{step.short}</span></span>
                </Link>
                {index < STEPS.length - 1 ? <span className="opsFlowArrow">→</span> : null}
              </div>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .opsFlow{position:sticky;top:0;z-index:45;padding:8px 14px 0;pointer-events:none}
        .opsFlowInner{max-width:980px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:8px 10px;border:1px solid color-mix(in srgb,var(--theme-accent,#7c3aed) 22%,#dfe5ea);border-radius:16px;background:color-mix(in srgb,#fff 92%,var(--theme-soft,#f5f3ff));box-shadow:0 8px 24px rgba(20,30,55,.08);backdrop-filter:blur(12px);pointer-events:auto}
        .opsFlowTitle{font-size:12px;font-weight:900;color:#6d7785;white-space:nowrap}
        .opsFlowSteps{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
        .opsFlowStepWrap{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
        .opsFlowStep{display:flex;align-items:center;justify-content:center;gap:7px;min-width:0;flex:1;padding:8px 10px;border-radius:11px;text-decoration:none;color:#556274;background:var(--theme-soft,#f5f6f8);font-size:13px;font-weight:800;transition:.15s ease}
        .opsFlowStep:hover{transform:translateY(-1px)}
        .opsFlowStep.active{background:linear-gradient(90deg,var(--theme-accent,#7c3aed),#ec4899);color:#fff;box-shadow:0 5px 14px rgba(124,58,237,.18)}
        .opsFlowNo{font-size:10px;font-weight:900;opacity:.82}
        .opsFlowLabel{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .opsFlowArrow{font-size:15px;color:#9aa3af;flex:0 0 auto}
        .mobileLabel{display:none}
        @media(max-width:650px){
          .opsFlow{padding:6px 8px 0}.opsFlowInner{gap:7px;padding:7px 8px}.opsFlowTitle{display:none}.opsFlowSteps,.opsFlowStepWrap{gap:4px}.opsFlowStep{padding:8px 5px;gap:4px;font-size:12px}.opsFlowArrow{font-size:12px}.desktopLabel{display:none}.mobileLabel{display:inline}
        }
      `}</style>
    </nav>
  );
}
