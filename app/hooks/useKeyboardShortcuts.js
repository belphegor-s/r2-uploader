'use client';

import { useEffect } from 'react';

export default function useKeyboardShortcuts({ onDelete, onSelectAll, onSearch, onEsc, enabled = true }) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      const target = e.target;
      const tag = target?.tagName;
      const editing = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;

      if (e.key === 'Escape') { onEsc?.(e); return; }
      if (editing) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        onSelectAll?.(e);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        onSearch?.(e);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        onDelete?.(e);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDelete, onSelectAll, onSearch, onEsc, enabled]);
}
