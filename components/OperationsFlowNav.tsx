'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const ITEMS = [
  { href: '/attendance-settings', label: '學生出勤', icon: '●' },
  { href: '/aircon', label: '冷氣費用', icon: '❄' },
  { href: '/payroll', label: '教練薪酬', icon: '◎' },
  { href: '/operations-close', label: '營運月結', icon: '▤' },
];

export default function OperationsFlowNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visible = ITEMS.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!visible) return null;

  const month = searchParams.get('month');

  return (
    <nav className="appBottomNav opsFlowTop" aria-label="球隊營運快捷鍵">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const href = month ? `${item.href}?month=${encodeURIComponent(month)}` : item.href;
        return (
          <Link key={item.href} href={href} className={active ? 'active' : ''}>
            <span className="appNavIcon" aria-hidden="true">{item.icon}</span>
            <b>{item.label}</b>
          </Link>
        );
      })}
    </nav>
  );
}
