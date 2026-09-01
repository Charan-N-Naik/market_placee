import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n/config';
import App from './App.jsx';

// ─── One-time migration: remove legacy unscoped order cache ───────────────────
// The old 'kisan_orders' key was shared across all users causing data leakage.
// This cleans it from any browser that still has it, permanently.
if (!localStorage.getItem('kb_orders_migration_v1')) {
  localStorage.removeItem('kisan_orders');
  localStorage.setItem('kb_orders_migration_v1', '1');
}
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


