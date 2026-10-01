'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { href: '/attendance-settings', label: '學生出勤', short: '出勤', icon: '●' },
  { href: '/aircon', label: '冷氣登記與費用', short: '冷氣', icon: '❄' },
  { href: '/payroll', label: '教練薪酬', short: '薪酬', icon: '◎' },
  { href: '/operations-close', label: '營運月結', short: '月結', icon: '▦' },
];

export default function OperationsFlowNav() {
  const pathname = usePathname();
  const visible = STEPS.some((step) => pathname === step.href || pathname.startsWith(`${step.href}/`));
  if (!visible) return null;

  return (
    <nav className="opsFlow" aria-label="球隊營運流程">
      <div className="opsFlowInner">
        {STEPS.map((step) => {
          const active = pathname === step.href || pathname.startsWith(`${step.href}/`);
          return (
            <Link className={`opsFlowTab ${active ? 'active' : ''}`} href={step.href} key={step.href}>
              <span className="icon" aria-hidden="true">{step.icon}</span>
              <span className="fullLabel">{step.label}</span>
              <span className="shortLabel">{step.short}</span>
            </Link>
          );
        })}
      </div>
      <style jsx>{`
        .opsFlow{position:sticky;top:0;z-index:45;padding:8px 12px 0;pointer-events:none}
        .opsFlowInner{max-width:860px;margin:0 auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;border:1px solid color-mix(in srgb,var(--theme-accent,#7c3aed) 22%,#e1e6eb);border-radius:22px;background:rgba(255,255,255,.97);box-shadow:0 8px 24px rgba(25,30,55,.08);backdrop-filter:blur(12px);overflow:hidden;pointer-events:auto}
        .opsFlowTab{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;padding:9px 4px 8px;text-decoration:none;color:#6f7b8c;background:transparent;border-right:1px solid #edf0f3;box-sizing:border-box;transition:.16s ease}
        .opsFlowTab:last-child{border-right:0}
        .opsFlowTab .icon{font-size:15px;line-height:1;color:#8793a2}
        .opsFlowTab .fullLabel,.opsFlowTab .shortLabel{font-size:11px;font-weight:900;line-height:1.15;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
        .opsFlowTab .shortLabel{display:none}
        .opsFlowTab.active{color:#fff;background:linear-gradient(135deg,var(--theme-accent,#7c3aed),#ec4899 65%,#14b8a6)}
        .opsFlowTab.active .icon{color:#fff}
        .opsFlowTab.active:after{content:'';position:absolute;left:22%;right:22%;bottom:4px;height:2px;border-radius:999px;background:rgba(255,255,255,.88)}
        @media(hover:hover){.opsFlowTab:not(.active):hover{background:#f7f8fb;color:#394556}}
        @media(max-width:700px){.opsFlow{padding:5px 7px 0}.opsFlowInner{border-radius:18px}.opsFlowTab{padding:8px 2px 7px;gap:4px}.opsFlowTab .icon{font-size:14px}.opsFlowTab .fullLabel{display:none}.opsFlowTab .shortLabel{display:block;font-size:11px}.opsFlowTab.active:after{left:28%;right:28%;bottom:3px}}
        @media(max-width:370px){.opsFlowTab .shortLabel{font-size:10px}}
      `}</style>
    </nav>
  );
}
