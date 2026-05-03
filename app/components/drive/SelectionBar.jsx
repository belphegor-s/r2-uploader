'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Move, Copy, Download, X } from 'lucide-react';

export default function SelectionBar({ count, onClear, onDelete, onMove, onCopy, onDownloadZip, busy }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(calc(100%-1rem),720px)]"
        >
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl bg-[#1c1c1c] border border-gray-700 shadow-2xl">
            <button onClick={onClear} className="p-2 rounded-md hover:bg-[#2a2a2a]" aria-label="Clear">
              <X size={16} />
            </button>
            <span className="text-sm font-medium whitespace-nowrap">{count} selected</span>
            <div className="flex-1" />
            <button onClick={onDownloadZip} disabled={busy} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a] text-sm disabled:opacity-50">
              <Download size={14} /><span className="hidden sm:inline">Download ZIP</span>
            </button>
            <button onClick={onMove} disabled={busy} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a] text-sm disabled:opacity-50">
              <Move size={14} /><span className="hidden sm:inline">Move</span>
            </button>
            <button onClick={onCopy} disabled={busy} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a] text-sm disabled:opacity-50">
              <Copy size={14} /><span className="hidden sm:inline">Copy</span>
            </button>
            <button onClick={onDelete} disabled={busy} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-[#7a1f1f] hover:bg-[#b22222] text-sm disabled:opacity-50">
              <Trash2 size={14} /><span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
