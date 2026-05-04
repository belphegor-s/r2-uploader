'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = forwardRef(function SearchBar({ scope, onSubmit, onClearActive, activeQuery, autoFocus = false }, ref) {
  const [q, setQ] = useState(activeQuery || '');
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    select: () => inputRef.current?.select(),
    clear: () => {
      onClearActive?.();
    },
  }));

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    setQ(activeQuery || '');
  }, [activeQuery]);

  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = useCallback(() => {
    const query = q.trim();
    if (!query) return;

    onSubmit?.({ q: query });
  }, [q, onSubmit]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    } else if (e.key === 'Escape') {
      if (q) {
        onClearActive?.();
      }
    }
  };

  const clear = () => {
    onClearActive?.();
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-md">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDownCapture={onKeyDown}
        placeholder={`Search in ${scope}…`}
        className="w-full pl-9 pr-16 py-2 rounded-md bg-[#2a2a2a] border border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      {!q && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 border border-gray-600 rounded px-2 py-[1px]">/</div>}

      {q && (
        <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
          <X size={14} />
        </button>
      )}
    </div>
  );
});

export default SearchBar;
