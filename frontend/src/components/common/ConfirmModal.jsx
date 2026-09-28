import { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

/**
 * Reusable ConfirmModal / AlertModal component.
 *
 * Props:
 *  isOpen       {boolean}  - show/hide the modal
 *  onClose      {fn}       - called when modal is dismissed (Cancel / backdrop / Escape)
 *  onConfirm    {fn}       - called when the primary action button is clicked
 *  title        {string}   - modal heading
 *  message      {string}   - body text / description
 *  confirmText  {string}   - primary button label (default: "Confirm")
 *  cancelText   {string}   - secondary button label (default: "Cancel")
 *  variant      {'danger'|'warning'|'success'|'info'|'default'}
 *  isAlert      {boolean}  - when true, shows only one button (no Cancel / no onClose from button)
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isAlert = false,
}) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ---- Variant config ----
  const configs = {
    danger: {
      icon: <XCircle size={28} />,
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      confirmBg: 'linear-gradient(135deg, #dc2626, #b91c1c)',
      confirmHover: '#b91c1c',
      confirmShadow: 'rgba(220,38,38,0.35)',
    },
    warning: {
      icon: <AlertTriangle size={28} />,
      iconBg: '#fff7ed',
      iconColor: '#ea580c',
      confirmBg: 'linear-gradient(135deg, #ea580c, #c2410c)',
      confirmHover: '#c2410c',
      confirmShadow: 'rgba(234,88,12,0.35)',
    },
    success: {
      icon: <CheckCircle size={28} />,
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      confirmBg: 'linear-gradient(135deg, #22c55e, #16a34a)',
      confirmHover: '#15803d',
      confirmShadow: 'rgba(34,197,94,0.35)',
    },
    info: {
      icon: <Info size={28} />,
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      confirmBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      confirmHover: '#1d4ed8',
      confirmShadow: 'rgba(59,130,246,0.35)',
    },
    default: {
      icon: <CheckCircle size={28} />,
      iconBg: '#e8f5e9',
      iconColor: '#1f7a4d',
      confirmBg: 'linear-gradient(135deg, #22c55e, #1f7a4d)',
      confirmHover: '#166534',
      confirmShadow: 'rgba(34,197,94,0.35)',
    },
  };

  const cfg = configs[variant] || configs.default;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => !isAlert && onClose?.()}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'cmFadeIn 0.18s ease',
        }}
      />

      {/* Modal Card */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            padding: '2rem 2rem 1.75rem',
            maxWidth: 420,
            width: '100%',
            pointerEvents: 'auto',
            animation: 'cmSlideIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close X button (only non-alert) */}
          {!isAlert && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 14, right: 14,
                background: '#f3f4f6', border: 'none', borderRadius: '50%',
                width: 30, height: 30, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6b7280', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
            >
              <X size={15} />
            </button>
          )}

          {/* Icon badge */}
          <div style={{
            width: 54, height: 54, borderRadius: 16,
            background: cfg.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: cfg.iconColor,
            marginBottom: '1.1rem',
          }}>
            {cfg.icon}
          </div>

          {/* Title */}
          <h3 style={{
            margin: '0 0 0.5rem',
            fontSize: '1.1rem', fontWeight: 800,
            color: '#111827', lineHeight: 1.3,
          }}>{title}</h3>

          {/* Message */}
          {message && (
            <p style={{
              margin: '0 0 1.5rem',
              fontSize: '0.88rem', color: '#6b7280',
              lineHeight: 1.6,
            }}>{message}</p>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            {!isAlert && (
              <button
                onClick={onClose}
                style={{
                  padding: '0.6rem 1.3rem',
                  borderRadius: 99,
                  border: '1.5px solid #e5e7eb',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => { onConfirm?.(); if (!isAlert) onClose?.(); }}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: 99,
                border: 'none',
                background: cfg.confirmBg,
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${cfg.confirmShadow}`,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.9)'; e.currentTarget.style.boxShadow = `0 6px 20px ${cfg.confirmShadow}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.boxShadow = `0 4px 14px ${cfg.confirmShadow}`; }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes cmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cmSlideIn { from { opacity: 0; transform: scale(0.88) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </>
  );
}
