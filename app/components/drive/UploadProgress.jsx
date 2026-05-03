'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function UploadProgress({ batches, onDismiss, lift = false }) {
  return (
    <div
      className="fixed right-4 z-50 space-y-2 w-[min(360px,calc(100%-2rem))] transition-all"
      style={{ bottom: lift ? 92 : 16 }}
    >
      <AnimatePresence>
        {batches.map((b) => (
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
              {b.status === 'uploading' && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
              <span className="text-sm font-medium flex-1 truncate">{b.label}</span>
              {(b.status === 'done' || b.status === 'error') && (
                <button onClick={() => onDismiss(b.id)} className="text-gray-400 hover:text-white"><X size={14} /></button>
              )}
            </div>
            {b.status === 'uploading' && (
              <div className="h-1 bg-[#2a2a2a]">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${b.percent || 0}%` }} />
              </div>
            )}
            {b.message && <div className="px-3 py-1.5 text-[11px] text-gray-400">{b.message}</div>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
