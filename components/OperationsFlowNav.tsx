'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { href: '/attendance-settings', label: '學生出勤', no: '01' },
  { href: '/aircon', label: '冷氣登記與費用', no: '02' },
  { href: '/payroll', label: '教練薪酬', no: '03' },
  { href: '/operations-close', label: '營運月結', no: '04' },
];

export default function OperationsFlowNav() {
  const pathname = usePathname();
  const visible = STEPS.some((step) => pathname === step.href || pathname.startsWith(`${step.href}/`));
  if (!visible) return null;

  return (
    <nav className="opsFlow" aria-label="球隊營運流程">
      <div className="opsFlowInner">
        <div className="opsFlowTitle">球隊營運流程</div>
        <div className="opsFlowTabs">
          {STEPS.map((step) => {
            const active = pathname === step.href || pathname.startsWith(`${step.href}/`);
            return (
              <Link className={`opsFlowTab ${active ? 'active' : ''}`} href={step.href} key={step.href}>
                <span>{step.no}</span>
                <b>{step.label}</b>
              </Link>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .opsFlow{position:sticky;top:0;z-index:45;padding:8px 12px 0;pointer-events:none}
        .opsFlowInner{max-width:1020px;margin:0 auto;padding:8px 10px 10px;border:1px solid color-mix(in srgb,var(--theme-accent,#7c3aed) 22%,#dfe5ea);border-radius:16px;background:rgba(255,255,255,.97);box-shadow:0 8px 24px rgba(20,30,55,.08);backdrop-filter:blur(12px);pointer-events:auto}
        .opsFlowTitle{font-size:12px;font-weight:900;color:#273244;margin:0 2px 7px}
        .opsFlowTabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
        .opsFlowTab{display:flex;align-items:center;justify-content:center;gap:7px;min-width:0;padding:9px 8px;border-radius:10px;text-decoration:none;color:#657183;background:#f7f8fa;border:1px solid #e6e9ee;box-sizing:border-box;white-space:nowrap;overflow:hidden}
        .opsFlowTab span{display:grid;place-items:center;min-width:24px;height:24px;padding:0 5px;border-radius:7px;background:#fff;border:1px solid #e3e7ec;font-size:9px;font-weight:900;color:#8a94a3}
        .opsFlowTab b{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:12px}
        .opsFlowTab.active{background:linear-gradient(120deg,var(--theme-accent,#7c3aed),#ec4899 66%,#14b8a6);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(124,58,237,.18)}
        .opsFlowTab.active span{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.22);color:#fff}
        @media(max-width:700px){.opsFlow{padding:5px 6px 0}.opsFlowInner{padding:6px;border-radius:13px}.opsFlowTitle{display:none}.opsFlowTabs{gap:4px}.opsFlowTab{padding:8px 3px;gap:3px;border-radius:9px;flex-direction:column}.opsFlowTab span{min-width:0;width:20px;height:18px;padding:0;font-size:8px}.opsFlowTab b{font-size:10px;max-width:100%}}
        @media(max-width:390px){.opsFlowTab b{font-size:9px}}
      `}</style>
    </nav>
  );
}
