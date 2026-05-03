'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { driveApi } from '@/app/lib/driveClient';
import { categoryOf } from '@/app/lib/fileTypes';
import { formatFileSize } from '@/utils/formatFileSize';
import TextPreview from './preview/TextPreview';

export default function PreviewModal({ scope, files, startIndex, onClose, onAfterAction }) {
  const [index, setIndex] = useState(startIndex);
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { setIndex(startIndex); }, [startIndex]);

  const file = files[index];
  const cat = file ? categoryOf(file.mime || '', file.name) : null;

  const loadUrl = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await driveApi.previewUrl(scope, file.key);
      setUrl(res.url);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [scope, file]);

  useEffect(() => { loadUrl(); }, [loadUrl]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, files.length - 1)), [files.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, next, prev]);

  if (!file) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={`preview-${file.key}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col"
      >
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 border-b border-gray-800">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{file.name}</div>
            <div className="text-[11px] text-gray-400 truncate">{formatFileSize(file.size)} · {cat}</div>
          </div>

          <button onClick={prev} disabled={index === 0} className="p-2 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-30" aria-label="Prev">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-gray-400 hidden sm:inline">{index + 1} / {files.length}</span>
          <button onClick={next} disabled={index === files.length - 1} className="p-2 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-30" aria-label="Next">
            <ChevronRight size={16} />
          </button>

          {url && (
            <>
              <a href={url} download={file.name} className="p-2 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a]" aria-label="Download" title="Download">
                <Download size={16} />
              </a>
              <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a] hidden sm:inline-flex" aria-label="Open" title="Open in new tab">
                <ExternalLink size={16} />
              </a>
            </>
          )}
          <button onClick={onClose} className="p-2 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a]" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading && <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading…</div>}
          {error && <div className="h-full flex items-center justify-center text-red-400 text-sm">Failed to load preview.</div>}
          {!loading && !error && url && (
            <PreviewContent cat={cat} file={file} url={url} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PreviewContent({ cat, file, url }) {
  if (cat === 'image') {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={file.name} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }
  if (cat === 'video') {
    return (
      <div className="h-full w-full flex items-center justify-center p-4 bg-black">
        <video src={url} controls className="max-h-full max-w-full" />
      </div>
    );
  }
  if (cat === 'audio') {
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <audio src={url} controls className="w-full max-w-md" />
      </div>
    );
  }
  if (cat === 'pdf') {
    return <iframe src={url} title={file.name} className="w-full h-full bg-white" />;
  }
  if (cat === 'text') {
    return <TextPreview url={url} name={file.name} />;
  }
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-gray-400 text-sm p-6">
      <p>No inline preview for this file type.</p>
      <a href={url} download={file.name} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white">Download</a>
    </div>
  );
}
