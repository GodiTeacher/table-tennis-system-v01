'use client';

import { useEffect } from 'react';

export default function ThemeCookieBootstrap({ theme }: { theme: string }) {
  useEffect(() => {
    document.cookie = `ui-theme=${encodeURIComponent(theme)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    const classes = Array.from(document.body.classList).filter((name) => name.startsWith('theme-'));
    for (const name of classes) document.body.classList.remove(name);
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);
  return null;
}
