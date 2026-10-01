function isMobileDevice() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const touch = navigator.maxTouchPoints || 0;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (platform === 'MacIntel' && touch > 1);
}

export async function saveOrShareBlob(blob: Blob, filename: string, title?: string) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (isMobileDevice() && typeof nav.share === 'function') {
    const shareData: ShareData = { files: [file], title: title ?? filename };
    const canShareFiles = typeof nav.canShare !== 'function' || nav.canShare(shareData);
    if (canShareFiles) {
      try {
        await nav.share(shareData);
        return 'shared' as const;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled' as const;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded' as const;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('無法產生圖片檔案'));
    }, type, quality);
  });
}
