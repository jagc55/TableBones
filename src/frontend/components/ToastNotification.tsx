import React, { useState, useEffect, useCallback } from 'react';
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

const ToastItem: React.FC<{
  toast: ToastData;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const triggerDismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    // Allow smooth fade-out animation before removing from parent state
    setTimeout(() => {
      onDismiss(toast.id);
    }, 450);
  }, [isExiting, onDismiss, toast.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerDismiss();
    }, 4200);

    return () => clearTimeout(timer);
  }, [triggerDismiss]);

  return (
    <div
      className={`toast-card toast-${toast.type} ${isExiting ? 'toast-exiting' : ''}`}
      role="status"
    >
      <div className="toast-icon-badge">
        {toast.type === 'achievement' && <Trophy size={18} strokeWidth={2.8} />}
        {toast.type === 'alert' && <AlertCircle size={18} strokeWidth={2.8} />}
        {toast.type === 'info' && <Info size={18} strokeWidth={2.8} />}
      </div>
      <div className="toast-body">
        <span className="toast-eyebrow">
          {toast.type === 'achievement' ? 'ACHIEVEMENT UNLOCKED!' : 'GAME NOTICE'}
        </span>
        <h4 className="toast-title">{toast.title}</h4>
        <p className="toast-msg">{toast.message}</p>
      </div>
      <button
        onClick={triggerDismiss}
        className="toast-close-btn"
        aria-label="Dismiss toast"
      >
        <X size={15} strokeWidth={3} />
      </button>
    </div>
  );
};

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}

      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1200;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 360px;
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
          animation: toastPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transition: opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .toast-card.toast-exiting {
          opacity: 0;
          transform: translateY(-10px) scale(0.96);
          pointer-events: none;
        }
        .toast-achievement {
          border-color: var(--color-ink-stroke);
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
        }
        .toast-achievement .toast-title {
          color: #1c1511;
        }
        .toast-achievement .toast-msg {
          color: #2b1e17;
        }
        .toast-alert {
          border-color: var(--color-ink-stroke);
          background-color: var(--color-status-error-bg);
          color: var(--color-status-error-text);
        }
        .toast-icon-badge {
          background-color: var(--color-canvas-parchment);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 7px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 1.5px 1.5px 0 var(--color-ink-stroke);
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
          font-size: 9.5px;
          letter-spacing: 0.1em;
          color: var(--color-cuphead-red);
          display: block;
        }
        .toast-title {
          font-family: var(--font-luckiest-guy);
          font-size: 15px;
          letter-spacing: 0.04em;
          color: var(--color-text-main);
          line-height: 1.1;
          margin: 2px 0;
        }
        .toast-msg {
          font-family: var(--font-comic-fredoka);
          font-size: 12.5px;
          font-weight: 500;
          line-height: 1.3;
          color: var(--color-text-lead);
        }
        .toast-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-main);
          padding: 2px;
          opacity: 0.7;
          transition: opacity 0.1s ease;
        }
        .toast-close-btn:hover {
          opacity: 1;
        }
        @keyframes toastPop {
          0% {
            transform: translateY(12px) scale(0.96);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
