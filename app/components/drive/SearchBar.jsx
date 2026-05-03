'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { driveApi } from '@/app/lib/driveClient';
import { FileTypeIcon } from './fileIcons';
import { formatFileSize } from '@/utils/formatFileSize';

export default function SearchBar({ scope, prefix, onJump, autoFocus = false }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setTruncated(false); return; }
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await driveApi.search(scope, q.trim(), '');
        if (!alive) return;
        setResults(res.results || []);
        setTruncated(Boolean(res.truncated));
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q, scope]);

  useEffect(() => {
    const onClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative w-full max-w-md" ref={wrapperRef}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        placeholder={`Search in ${scope}…`}
        className="w-full pl-9 pr-8 py-2 rounded-md bg-[#2a2a2a] border border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
      />
      {q && (
        <button
          type="button"
          onClick={() => { setQ(''); setResults([]); inputRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}

      {open && q && (
        <div className="absolute mt-2 left-0 right-0 z-30 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[#1c1c1c] border border-gray-700 rounded-xl shadow-2xl">
          {loading && <div className="p-3 text-xs text-gray-400">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="p-3 text-xs text-gray-400">No results.</div>
          )}
          {results.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => { onJump(r); setOpen(false); }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2a] border-b border-gray-800 last:border-b-0"
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
          {truncated && <div className="p-2 text-[11px] text-amber-400">First 500 results shown — refine your query.</div>}
        </div>
      )}
    </div>
  );
}
