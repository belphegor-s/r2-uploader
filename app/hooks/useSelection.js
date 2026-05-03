'use client';

import { useCallback, useMemo, useState } from 'react';

// Generic selection state keyed by stable id (file key OR `folder:<prefix>`).
export default function useSelection() {
  const [selected, setSelected] = useState(() => new Set());
  const [lastIndex, setLastIndex] = useState(null);

  const isSelected = useCallback((id) => selected.has(id), [selected]);
  const size = selected.size;

  const clear = useCallback(() => {
    setSelected(new Set());
    setLastIndex(null);
  }, []);

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setOnly = useCallback((id) => {
    setSelected(new Set(id ? [id] : []));
  }, []);

  const setAll = useCallback((ids) => {
    setSelected(new Set(ids));
  }, []);

  const click = useCallback((id, index, ids, e) => {
    if (e?.shiftKey && lastIndex != null) {
      const [a, b] = [Math.min(lastIndex, index), Math.max(lastIndex, index)];
      const range = ids.slice(a, b + 1);
      setSelected((prev) => {
        const next = new Set(prev);
        range.forEach((x) => next.add(x));
        return next;
      });
    } else if (e?.metaKey || e?.ctrlKey) {
      toggle(id);
      setLastIndex(index);
    } else {
      setOnly(id);
      setLastIndex(index);
    }
  }, [lastIndex, toggle, setOnly]);

  const ids = useMemo(() => Array.from(selected), [selected]);

  return { selected, ids, size, isSelected, toggle, clear, setOnly, setAll, click };
}
