'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/today', label: '今日', icon: '●' },
  { href: '/students', label: '學生', icon: '◎' },
  { href: '/history', label: '紀錄', icon: '▤' },
  { href: '/more', label: '更多', icon: '•••' },
];

export default function AppBottomNav() {
  const pathname = usePathname();
  if (!pathname || pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname.startsWith('/p/')) return null;

  return (
    <nav className="appBottomNav" aria-label="主要功能">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
            <span className="appNavIcon" aria-hidden="true">{item.icon}</span>
            <b>{item.label}</b>
          </Link>
        );
      })}
    </nav>
  );
}
