'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const STEPS = [
  { href: '/attendance-settings', label: '學生出勤', icon: '●' },
  { href: '/aircon', label: '冷氣費用', icon: '❄' },
  { href: '/payroll', label: '教練薪酬', icon: '◎' },
  { href: '/operations-close', label: '營運月結', icon: '▦' },
];

export default function OperationsFlowNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visible = STEPS.some((step) => pathname === step.href || pathname.startsWith(`${step.href}/`));
  if (!visible) return null;
  const month = searchParams.get('month');

  return (
    <nav className="opsFlow" aria-label="球隊營運流程">
      <div className="opsFlowInner">
        {STEPS.map((step) => {
          const active = pathname === step.href || pathname.startsWith(`${step.href}/`);
          const href = month ? `${step.href}?month=${encodeURIComponent(month)}` : step.href;
          return (
            <Link className={`opsFlowTab ${active ? 'active' : ''}`} href={href} key={step.href}>
              <span className="opsNavIcon" aria-hidden="true">{step.icon}</span>
              <b>{step.label}</b>
            </Link>
          );
        })}
      </div>
      <style jsx>{`
        .opsFlow{position:sticky;top:0;z-index:45;padding:8px 12px 0;pointer-events:none}
        .opsFlowInner{width:min(520px,calc(100% - 4px));margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:7px;background:rgba(255,255,255,.95);border:1px solid #e1e6ec;border-radius:22px;box-shadow:0 12px 34px rgba(24,33,47,.13);backdrop-filter:blur(18px);pointer-events:auto}
        .opsFlowTab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;min-height:52px;border-radius:16px;text-decoration:none;color:#7a8594;font-size:11px;transition:.18s ease}
        .opsFlowTab b{font-size:11px;line-height:1;white-space:nowrap}
        .opsNavIcon{height:18px;display:flex;align-items:center;font-size:15px;font-weight:900;letter-spacing:-.08em}
        .opsFlowTab.active{background:#273444;color:#fff}
        @media(hover:hover){.opsFlowTab:not(.active):hover{background:#f2f4f7;color:#394556}}
        @media(max-width:600px){.opsFlow{padding:6px 7px 0}.opsFlowInner{width:calc(100% - 2px);padding:6px;border-radius:20px}.opsFlowTab{min-height:50px}.opsFlowTab b{font-size:10.5px}}
      `}</style>
    </nav>
  );
}
