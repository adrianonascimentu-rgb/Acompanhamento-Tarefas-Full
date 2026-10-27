'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { SystemSettingsModal } from '@/components/SystemSettingsModal';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastInputObject {
  title?: string;
  message: string;
  type?: ToastType;
}

interface Toast {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
}

interface ModalOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: 'danger' | 'info';
}

interface UIContextType {
  showToast: (messageOrOptions: string | ToastInputObject, type?: ToastType) => void;
  showConfirm: (options: ModalOptions) => void;
  showSettingsModal: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('sidebar_collapsed') === 'true';
      } catch {}
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sidebar_collapsed', String(next));
        } catch {}
      }
      return next;
    });
  };

  const showToast = (messageOrOptions: string | ToastInputObject, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    let resolvedTitle: string | undefined;
    let resolvedMessage: string;
    let resolvedType: ToastType = type;

    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      resolvedTitle = typeof messageOrOptions.title === 'string' ? messageOrOptions.title : undefined;
      resolvedMessage =
        typeof messageOrOptions.message === 'string'
          ? messageOrOptions.message
          : JSON.stringify(messageOrOptions);
      if (messageOrOptions.type) {
        resolvedType = messageOrOptions.type;
      }
    } else {
      resolvedMessage = String(messageOrOptions ?? '');
    }

    setToasts((prev) => [
      ...prev,
      { id, title: resolvedTitle, message: resolvedMessage, type: resolvedType },
    ]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const showConfirm = (options: ModalOptions) => {
    setModal(options);
  };

  const showSettingsModal = () => {
    setSettingsModalOpen(true);
  };

  const handleConfirm = () => {
    if (modal) {
      modal.onConfirm();
      setModal(null);
    }
  };

  const handleCancel = () => {
    if (modal) {
      if (modal.onCancel) modal.onCancel();
      setModal(null);
    }
  };

  return (
    <UIContext.Provider value={{ showToast, showConfirm, showSettingsModal, isSidebarCollapsed, toggleSidebar }}>
      {children}
      <SystemSettingsModal 
        isOpen={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
      />
      {/* Toasts Container */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-xl border min-w-[300px] max-w-md ${
                toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                toast.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' :
                toast.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                'bg-blue-50 border-blue-100 text-blue-800'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 size={20} className="shrink-0" />}
              {toast.type === 'error' && <AlertCircle size={20} className="shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle size={20} className="shrink-0" />}
              {toast.type === 'info' && <Info size={20} className="shrink-0" />}
              <div className="flex-1 min-w-0">
                {typeof toast.title === 'string' && toast.title && (
                  <p className="text-sm font-bold leading-snug">{toast.title}</p>
                )}
                <p className="text-sm font-medium leading-snug">
                  {typeof toast.message === 'string'
                    ? toast.message
                    : String((toast.message as any)?.message || '')}
                </p>
              </div>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="opacity-50 hover:opacity-100 shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${modal.type === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                    {modal.type === 'danger' ? <AlertTriangle size={24} /> : <Info size={24} />}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{modal.title}</h3>
                </div>
                <p className="text-slate-600 mb-8">{modal.message}</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    {modal.cancelLabel || 'Cancelar'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 h-12 text-white font-bold rounded-xl transition-all ${
                      modal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {modal.confirmLabel || 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    return {
      showToast: () => {},
      showConfirm: () => {},
      showSettingsModal: () => {},
      setShowSettingsModal: () => {},
      isSidebarCollapsed: false,
      toggleSidebar: () => {}
    };
  }
  return context;
}
