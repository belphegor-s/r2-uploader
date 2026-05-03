'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Ban } from 'lucide-react';

export default function UploadProgress({ batches, onDismiss, onCancel, lift = false }) {
  return (
    <div
      className="fixed right-4 z-50 space-y-2 w-[min(360px,calc(100%-2rem))] transition-all"
      style={{ bottom: lift ? 92 : 16 }}
    >
      <AnimatePresence>
        {batches.map((b) => {
          const inflight = b.status === 'uploading';
          const terminal = b.status === 'done' || b.status === 'error' || b.status === 'cancelled';
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="rounded-xl bg-[#1c1c1c] border border-gray-700 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
                {b.status === 'done' && <CheckCircle2 size={16} className="text-emerald-400" />}
                {b.status === 'error' && <AlertCircle size={16} className="text-red-400" />}
                {b.status === 'cancelled' && <Ban size={16} className="text-gray-400" />}
                {inflight && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                <span className="text-sm font-medium flex-1 truncate">{b.label}</span>

                {inflight && onCancel && (
                  <button
                    onClick={() => onCancel(b.id)}
                    className="px-2 py-0.5 text-[11px] rounded bg-[#7a1f1f] hover:bg-[#b22222] text-white"
                    title="Cancel"
                  >
                    Cancel
                  </button>
                )}
                {terminal && (
                  <button onClick={() => onDismiss(b.id)} className="text-gray-400 hover:text-white" title="Dismiss">
                    <X size={14} />
                  </button>
                )}
              </div>

              {inflight && (
                <div className="h-1 bg-[#2a2a2a]">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${b.percent || 0}%` }} />
                </div>
              )}

              {b.message && (
                <div className={`px-3 py-1.5 text-[11px] ${b.status === 'error' ? 'text-red-400' : b.status === 'cancelled' ? 'text-gray-400' : 'text-gray-400'}`}>
                  {b.message}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
