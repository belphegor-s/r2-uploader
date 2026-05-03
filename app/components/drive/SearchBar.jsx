'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { driveApi } from '@/app/lib/driveClient';
import { FileTypeIcon } from './fileIcons';
import { formatFileSize } from '@/utils/formatFileSize';

export default function SearchBar({ scope, onJump, onSubmit, onClearActive, activeQuery, autoFocus = false }) {
  const [q, setQ] = useState(activeQuery || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  // Keep latest values in refs so the document-level keydown handler is never stale.
  const stateRef = useRef({ open, results, highlight, q, activeQuery });
  stateRef.current = { open, results, highlight, q, activeQuery };

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Sync external activeQuery into input
  useEffect(() => {
    if (activeQuery !== undefined && activeQuery !== q) setQ(activeQuery || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery]);

  // Reset highlight when query string changes (so a fresh search starts at top).
  useEffect(() => {
    setHighlight(q.trim() ? 0 : -1);
  }, [q]);

  // Debounced search fetch
  useEffect(() => {
    if (!q.trim()) { setResults([]); setTruncated(false); return; }
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await driveApi.search(scope, q.trim(), '');
        if (!alive) return;
        const list = res.results || [];
        setResults(list);
        setTruncated(Boolean(res.truncated));
        // Clamp highlight to the new bounds without forcibly resetting to 0 on every fetch.
        setHighlight((h) => {
          if (list.length === 0) return -1;
          if (h < 0 || h >= list.length) return 0;
          return h;
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q, scope]);

  // Outside-click closes the dropdown
  useEffect(() => {
    const onClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlight < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlight}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const submitFilter = useCallback(() => {
    const query = stateRef.current.q.trim();
    if (!query) return;
    onSubmit?.({ q: query, results: stateRef.current.results, truncated });
    setOpen(false);
    inputRef.current?.blur();
  }, [onSubmit, truncated]);

  // Keydown handler shared between input.onKeyDown and document listener (failsafe).
  const handleKey = useCallback((e) => {
    const { open: isOpen, results: resList, highlight: hi, q: query, activeQuery: aq } = stateRef.current;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!resList.length) { setOpen(true); return; }
      setOpen(true);
      setHighlight((h) => (h + 1) % resList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!resList.length) { setOpen(true); return; }
      setOpen(true);
      setHighlight((h) => (h <= 0 ? resList.length - 1 : h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && hi >= 0 && resList[hi]) {
        onJump(resList[hi]);
        setOpen(false);
        inputRef.current?.blur();
      } else {
        submitFilter();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isOpen) setOpen(false);
      else if (aq) {
        onClearActive?.();
        setQ('');
      } else {
        setQ('');
      }
    }
  }, [onJump, onClearActive, submitFilter]);

  // Document-level capture listener as failsafe — fires only when the input is focused.
  useEffect(() => {
    const onDocKey = (e) => {
      if (document.activeElement !== inputRef.current) return;
      if (!['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) return;
      handleKey(e);
    };
    document.addEventListener('keydown', onDocKey, true);
    return () => document.removeEventListener('keydown', onDocKey, true);
  }, [handleKey]);

  const clear = () => {
    setQ('');
    setResults([]);
    setHighlight(-1);
    onClearActive?.();
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-md" ref={wrapperRef}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={handleKey}
        placeholder={`Search in ${scope}…`}
        className="w-full pl-9 pr-9 py-2 rounded-md bg-[#2a2a2a] border border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {q && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}

      {open && q && (
        <div
          ref={listRef}
          className="absolute mt-2 left-0 right-0 z-30 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#1c1c1c] border border-gray-700 rounded-xl shadow-2xl"
        >
          {loading && results.length === 0 && (
            <div className="p-3 text-xs text-gray-400">Searching…</div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-3 text-xs text-gray-400">No matches in suggestions.</div>
          )}

          {results.map((r, i) => (
            <button
              key={r.key}
              data-idx={i}
              type="button"
              tabIndex={-1}
              onMouseMove={() => { if (highlight !== i) setHighlight(i); }}
              onMouseDown={(e) => e.preventDefault() /* keep focus in input */}
              onClick={() => { onJump(r); setOpen(false); }}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 border-b border-gray-800 last:border-b-0 transition ${
                highlight === i ? 'bg-[#2a2a2a]' : ''
              }`}
            >
              <FileTypeIcon name={r.name} mime={r.mime} size={16} />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{r.name}</div>
                <div className="text-[11px] text-gray-500 truncate">
                  {r.folder || '/'} · {formatFileSize(r.size)}
                </div>
              </div>
            </button>
          ))}

          {truncated && <div className="p-2 text-[11px] text-amber-400">First 500 results — refine your query.</div>}

          <div className="border-t border-gray-800 px-3 py-2 flex items-center justify-between text-[11px] text-gray-500 bg-[#181818] sticky bottom-0">
            <span>↑↓ navigate · Enter to {highlight >= 0 ? 'open' : 'filter'} · Esc to close</span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={submitFilter}
              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white"
            >
              <CornerDownLeft size={11} /> Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
