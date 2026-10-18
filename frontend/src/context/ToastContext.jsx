import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, options = {}) => {
      const id = ++toastId;
      const toast = {
        id,
        message,
        type: options.type || 'info',
        duration: options.duration ?? 4000
      };
      setToasts((prev) => [...prev.slice(-4), toast]);
      if (toast.duration > 0) {
        setTimeout(() => dismiss(id), toast.duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      push,
      success: (message, opts) => push(message, { ...opts, type: 'success' }),
      error: (message, opts) => push(message, { ...opts, type: 'error' }),
      info: (message, opts) => push(message, { ...opts, type: 'info' }),
      dismiss
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fs-toast-viewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`fs-toast fs-toast--${t.type}`} role="status">
            <span>{t.message}</span>
            <button type="button" className="fs-toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {}
    };
  }
  return ctx;
}
