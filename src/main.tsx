import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { queryClient } from './lib/queryClient';
import './index.css';

function syncAppViewportHeight() {
  const setHeight = () => {
    const vvHeight = window.visualViewport?.height;
    const h = vvHeight && Number.isFinite(vvHeight) ? vvHeight : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);
  };

  setHeight();
  window.addEventListener('resize', setHeight);
  window.visualViewport?.addEventListener('resize', setHeight);
}

syncAppViewportHeight();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
