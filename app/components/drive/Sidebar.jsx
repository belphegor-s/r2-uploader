'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, HardDrive } from 'lucide-react';
import { driveApi } from '@/app/lib/driveClient';
import { FolderIcon } from './fileIcons';

function TreeNode({ scope, node, currentPrefix, onNavigate, depth = 0, refreshKey }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);

  const isActive = currentPrefix === node.prefix;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await driveApi.tree(scope, node.prefix);
      setChildren(res.folders || []);
    } catch (err) {
      console.error(err);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [scope, node.prefix]);

  useEffect(() => {
    if (open && children === null) load();
  }, [open, children, load]);

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
          isActive ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-[#2a2a2a] border-l-2 border-transparent'
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
          {!loading && children?.length === 0 && (
            <div className="text-xs text-gray-600 pl-8 py-1 italic">empty</div>
          )}
          {children?.map((c) => (
            <TreeNode
              key={c.prefix}
              scope={scope}
              node={c}
              currentPrefix={currentPrefix}
              onNavigate={onNavigate}
              depth={depth + 1}
              refreshKey={refreshKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ scope, currentPrefix, onNavigate, refreshKey, onClose }) {
  const [roots, setRoots] = useState(null);

  const loadRoots = useCallback(async () => {
    try {
      const res = await driveApi.tree(scope, '');
      setRoots(res.folders || []);
    } catch (err) {
      console.error(err);
      setRoots([]);
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
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm select-none ${
            !currentPrefix ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-[#2a2a2a] border-l-2 border-transparent'
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
            refreshKey={refreshKey}
          />
        ))}
      </div>
    </aside>
  );
}
