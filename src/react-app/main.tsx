import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";

function AppWrapper() {
  useEffect(() => {
    // Fetch homepage config to get custom favicon
    fetch('/api/homepage-config')
      .then(res => res.json())
      .then(data => {
        const faviconUrl = data.config?.header?.favicon_url;
        if (faviconUrl) {
          // Update favicon
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'shortcut icon';
            document.head.appendChild(link);
          }
          link.href = faviconUrl;
          
          // Also update apple-touch-icon
          const appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
          if (appleTouchIcon) {
            appleTouchIcon.href = faviconUrl;
          }
        }
      })
      .catch(err => console.error('Failed to load custom favicon:', err));
  }, []);

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>
);
