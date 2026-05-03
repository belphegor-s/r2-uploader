'use client';

import { useCallback, useRef } from 'react';

export default function useLongPress(onLongPress, { delay = 500 } = {}) {
  const timer = useRef(null);
  const triggered = useRef(false);
  const startCoord = useRef({ x: 0, y: 0 });

  const start = useCallback((e) => {
    triggered.current = false;
    const touch = e.touches ? e.touches[0] : e;
    startCoord.current = { x: touch.clientX, y: touch.clientY };
    timer.current = setTimeout(() => {
      triggered.current = true;
      onLongPress({ ...startCoord.current, originalEvent: e });
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const move = useCallback((e) => {
    if (!timer.current) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - startCoord.current.x;
    const dy = touch.clientY - startCoord.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) cancel();
  }, [cancel]);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: move,
    onTouchCancel: cancel,
    wasTriggered: () => triggered.current,
  };
}
