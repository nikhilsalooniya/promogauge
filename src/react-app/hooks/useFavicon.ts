import { useEffect } from 'react';

export function useFavicon(faviconUrl: string | null | undefined) {
  useEffect(() => {
    if (!faviconUrl) return;

    // Find existing favicon link or create new one
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    
    // Update favicon
    link.href = faviconUrl;
    
    // Also update apple-touch-icon if it exists
    const appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (appleTouchIcon && faviconUrl) {
      appleTouchIcon.href = faviconUrl;
    }
  }, [faviconUrl]);
}
