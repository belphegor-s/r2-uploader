'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '@/app/components/Modal';
import { driveApi } from '@/app/lib/driveClient';
import { ChevronRight, ChevronDown, HardDrive } from 'lucide-react';
import { FolderIcon } from './fileIcons';

function PickerNode({ scope, node, depth, selected, onSelect, disabledPrefixes }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState(null);
  const isSelected = selected === node.prefix;
  const disabled = disabledPrefixes?.some((p) => node.prefix === p || node.prefix.startsWith(p + '/'));

  const load = useCallback(async () => {
    try {
      const res = await driveApi.tree(scope, node.prefix);
      setChildren(res.folders || []);
    } catch { setChildren([]); }
  }, [scope, node.prefix]);

  useEffect(() => { if (open && children === null) load(); }, [open, children, load]);

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-md text-sm select-none ${
          isSelected ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-[#2a2a2a] border-l-2 border-transparent'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} className="p-1 text-gray-400 hover:text-white">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(node.prefix)}
          className="flex-1 flex items-center gap-2 py-1.5 text-left truncate"
        >
          <FolderIcon size={14} />
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {open && children?.map((c) => (
        <PickerNode key={c.prefix} scope={scope} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} disabledPrefixes={disabledPrefixes} />
      ))}
    </div>
  );
}

export default function MoveCopyDialog({ open, scope, mode = 'move', sourcePrefixes = [], onClose, onSubmit, busy }) {
  // mode: 'move' | 'copy'
  const [roots, setRoots] = useState([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected('');
    driveApi.tree(scope, '').then((res) => setRoots(res.folders || [])).catch(() => setRoots([]));
  }, [open, scope]);

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} maxWidth="max-w-lg">
      <div className="p-6">
        <h3 className="text-lg font-semibold capitalize">{mode} to…</h3>
        <p className="text-xs text-gray-400 mt-1">Pick a destination folder.</p>

        <div className="mt-4 max-h-[50vh] overflow-y-auto custom-scrollbar bg-[#141414] border border-gray-800 rounded-md py-1">
          <div
            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm select-none ${
              selected === '' ? 'bg-blue-600/15 border-l-2 border-blue-500' : 'hover:bg-[#2a2a2a] border-l-2 border-transparent'
            }`}
            onClick={() => setSelected('')}
            style={{ paddingLeft: 12 }}
          >
            <HardDrive size={14} className="text-blue-400" />
            <span>Home</span>
          </div>
          {roots.map((r) => (
            <PickerNode
              key={r.prefix}
              scope={scope}
              node={r}
              depth={0}
              selected={selected}
              onSelect={setSelected}
              disabledPrefixes={mode === 'move' ? sourcePrefixes : []}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-neutral" disabled={busy}>Cancel</button>
          <button
            onClick={() => onSubmit(selected)}
            disabled={busy}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm disabled:opacity-50 capitalize"
          >
            {busy ? 'Working…' : mode}
          </button>
        </div>
      </div>
    </Modal>
  );
}
