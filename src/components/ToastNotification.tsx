import React, { useEffect } from 'react';
import { Trophy, AlertCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'achievement' | 'alert' | 'info';
  title: string;
  message: string;
}

interface ToastNotificationProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    const timer = setTimeout(() => {
      onDismiss(latest.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-card toast-${toast.type}`}>
          <div className="toast-icon-badge">
            {toast.type === 'achievement' && <Trophy size={20} strokeWidth={2.8} />}
            {toast.type === 'alert' && <AlertCircle size={20} strokeWidth={2.8} />}
            {toast.type === 'info' && <Info size={20} strokeWidth={2.8} />}
          </div>
          <div className="toast-body">
            <span className="toast-eyebrow">
              {toast.type === 'achievement' ? 'ACHIEVEMENT UNLOCKED!' : 'PARLOR DISPATCH'}
            </span>
            <h4 className="toast-title">{toast.title}</h4>
            <p className="toast-msg">{toast.message}</p>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="toast-close-btn"
            aria-label="Dismiss toast"
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>
      ))}

      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1200;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 380px;
          pointer-events: none;
        }
        .toast-card {
          pointer-events: auto;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-thick);
          border-radius: var(--radius-cel-box);
          box-shadow: var(--shadow-cel-lg);
          padding: 12px 14px;
          animation: toastPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .toast-achievement {
          border-color: var(--color-ink-black);
          background-color: var(--color-golden-buttercup);
        }
        .toast-alert {
          border-color: var(--color-ink-black);
          background-color: #fce8e6;
        }
        .toast-icon-badge {
          background-color: var(--color-canvas-parchment);
          border: 2px solid var(--color-ink-black);
          border-radius: 8px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 2px 2px 0 var(--color-ink-black);
        }
        .toast-achievement .toast-icon-badge {
          background-color: var(--color-cuphead-red);
          color: var(--color-glove-ivory);
        }
        .toast-alert .toast-icon-badge {
          background-color: var(--color-cuphead-red);
          color: var(--color-glove-ivory);
        }
        .toast-body {
          flex: 1;
        }
        .toast-eyebrow {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--color-cuphead-red);
          display: block;
        }
        .toast-title {
          font-family: var(--font-luckiest-guy);
          font-size: 16px;
          letter-spacing: 0.04em;
          color: var(--color-ink-black);
          line-height: 1.1;
          margin: 2px 0;
        }
        .toast-msg {
          font-family: var(--font-comic-fredoka);
          font-size: 13px;
          font-weight: 500;
          line-height: 1.3;
          color: var(--color-ink-stroke);
        }
        .toast-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-ink-black);
          padding: 2px;
          opacity: 0.7;
          transition: opacity 0.1s ease;
        }
        .toast-close-btn:hover {
          opacity: 1;
        }
        @keyframes toastPop {
          0% { transform: translateY(20px) scale(0.9); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
