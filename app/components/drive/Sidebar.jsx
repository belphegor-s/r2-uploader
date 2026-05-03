'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, HardDrive } from 'lucide-react';
import { driveApi } from '@/app/lib/driveClient';
import { FolderIcon, FileTypeIcon } from './fileIcons';

function FileLeaf({ file, depth, onClick, currentPrefix }) {
  return (
    <button
      type="button"
      onClick={() => onClick(file)}
      className="w-full group flex items-center gap-2 rounded-md hover:bg-[#2a2a2a] py-1.5 text-sm text-left truncate transition select-none"
      style={{ paddingLeft: 8 + depth * 12 + 22 /* indent past chevron column */ }}
      title={file.name}
    >
      <FileTypeIcon name={file.name} mime={file.mime} size={14} />
      <span className="truncate text-gray-300 group-hover:text-white">{file.name}</span>
    </button>
  );
}

function TreeNode({ scope, node, currentPrefix, onNavigate, onFileOpen, depth = 0, refreshKey }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null); // { folders, files }
  const [loading, setLoading] = useState(false);

  const isActive = currentPrefix === node.prefix;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await driveApi.list(scope, node.prefix);
      setData({ folders: res.folders || [], files: res.files || [] });
    } catch (err) {
      console.error(err);
      setData({ folders: [], files: [] });
    } finally {
      setLoading(false);
    }
  }, [scope, node.prefix]);

  useEffect(() => {
    if (open && data === null) load();
  }, [open, data, load]);

  // Auto-expand when current path goes through this node
  useEffect(() => {
    if (currentPrefix && (currentPrefix === node.prefix || currentPrefix.startsWith(node.prefix + '/'))) {
      setOpen(true);
    }
  }, [currentPrefix, node.prefix]);

  // Refresh when external mutation occurs
  useEffect(() => {
    if (open && refreshKey) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div>
      <div
        className={`group flex items-center gap-1 cursor-pointer rounded-md transition select-none ${
          isActive ? 'bg-blue-600/20 text-white' : 'hover:bg-[#2a2a2a]'
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          className="p-1 text-gray-400 hover:text-white"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <button
          type="button"
          onClick={() => onNavigate(node.prefix)}
          className="flex-1 flex items-center gap-2 py-1.5 text-sm text-left truncate"
        >
          <FolderIcon size={15} />
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {open && (
        <div>
          {loading && <div className="text-xs text-gray-500 pl-8 py-1">Loading…</div>}
          {!loading && data && data.folders.length === 0 && data.files.length === 0 && (
            <div className="text-xs text-gray-600 pl-8 py-1 italic">empty</div>
          )}
          {data?.folders.map((c) => (
            <TreeNode
              key={c.prefix}
              scope={scope}
              node={c}
              currentPrefix={currentPrefix}
              onNavigate={onNavigate}
              onFileOpen={onFileOpen}
              depth={depth + 1}
              refreshKey={refreshKey}
            />
          ))}
          {data?.files.map((f) => (
            <FileLeaf key={f.key} file={f} depth={depth + 1} onClick={onFileOpen} currentPrefix={currentPrefix} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ scope, currentPrefix, onNavigate, onFileOpen, refreshKey, onClose }) {
  const [roots, setRoots] = useState(null);
  const [rootFiles, setRootFiles] = useState([]);

  const loadRoots = useCallback(async () => {
    try {
      const res = await driveApi.list(scope, '');
      setRoots(res.folders || []);
      setRootFiles(res.files || []);
    } catch (err) {
      console.error(err);
      setRoots([]);
      setRootFiles([]);
    }
  }, [scope]);

  useEffect(() => { loadRoots(); }, [loadRoots, refreshKey]);

  return (
    <aside className="h-full bg-[#1c1c1c] border-r border-gray-800 flex flex-col w-64 shrink-0">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <HardDrive size={16} className="text-blue-400" />
          <span className="capitalize">{scope} Drive</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white text-xl leading-none px-2">×</button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm select-none transition ${
            !currentPrefix ? 'bg-blue-600/20 text-white' : 'hover:bg-[#2a2a2a]'
          }`}
          onClick={() => onNavigate('')}
          style={{ paddingLeft: 12 }}
        >
          <HardDrive size={14} className="text-blue-400" />
          <span>Home</span>
        </div>
        {roots?.map((r) => (
          <TreeNode
            key={r.prefix}
            scope={scope}
            node={r}
            currentPrefix={currentPrefix}
            onNavigate={onNavigate}
            onFileOpen={onFileOpen}
            refreshKey={refreshKey}
          />
        ))}
        {rootFiles.map((f) => (
          <FileLeaf key={f.key} file={f} depth={0} onClick={onFileOpen} currentPrefix={currentPrefix} />
        ))}
      </div>
    </aside>
  );
}
