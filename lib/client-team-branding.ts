export type TeamBranding = {
  name: string;
  shortName: string | null;
  logoDataUrl: string | null;
  brandColor: string;
  tagline: string | null;
  schoolName: string | null;
  sportName: string | null;
};

let cachedBranding: TeamBranding | null | undefined;

export async function getTeamBranding(): Promise<TeamBranding | null> {
  if (cachedBranding !== undefined) return cachedBranding;
  try {
    const response = await fetch('/api/team-branding', { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) return (cachedBranding = null);
    const data = await response.json();
    return (cachedBranding = data?.team ?? null);
  } catch {
    return (cachedBranding = null);
  }
}

export async function loadBrandLogo(src?: string | null): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export function teamDisplayName(team: TeamBranding | null) {
  return team?.shortName || team?.name || '桌球隊';
}
