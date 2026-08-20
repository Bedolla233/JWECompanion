import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register';

// This will log to your browser console so you know it actually worked
const updateSW = registerSW({
  onOfflineReady() {
    console.log("✅ PWA is fully cached and ready to work offline!");
  },
  onRegisterError(error) {
    console.error("❌ PWA registration failed:", error);
  }
});

registerSW({ immediate: true });
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
