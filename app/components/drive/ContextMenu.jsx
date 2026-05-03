'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ContextMenu({ menu, items, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0, ready: false });

  useEffect(() => {
    if (!menu) { setPos({ x: 0, y: 0, ready: false }); return; }
    // Defer to next frame to measure
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pad = 8;
      const x = Math.min(menu.x, window.innerWidth - rect.width - pad);
      const y = Math.min(menu.y, window.innerHeight - rect.height - pad);
      setPos({ x: Math.max(pad, x), y: Math.max(pad, y), ready: true });
    });
  }, [menu]);

  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            zIndex: 60,
            visibility: pos.ready ? 'visible' : 'hidden',
          }}
          className="min-w-[200px] bg-[#1c1c1c] border border-gray-700 rounded-lg shadow-2xl py-1"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {items.map((it, i) =>
            it.divider ? (
              <div key={`d-${i}`} className="my-1 border-t border-gray-800" />
            ) : (
              <button
                key={it.label}
                disabled={it.disabled}
                onClick={() => { it.onClick(); onClose(); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition ${
                  it.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-200 hover:bg-[#2a2a2a]'
                } ${it.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {it.icon && <span className="text-gray-400">{it.icon}</span>}
                <span className="flex-1">{it.label}</span>
                {it.shortcut && <span className="text-[11px] text-gray-500">{it.shortcut}</span>}
              </button>
            ),
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
