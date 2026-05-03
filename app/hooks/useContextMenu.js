'use client';

import { useCallback, useEffect, useState } from 'react';

export default function useContextMenu() {
  const [menu, setMenu] = useState(null); // { x, y, target }

  const open = useCallback((e, target) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, target });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    const onDown = () => close();
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onScroll = () => close();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [menu, close]);

  return { menu, open, close };
}
