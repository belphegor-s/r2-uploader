'use client';

import { format } from 'date-fns';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { FolderIcon, FileTypeIcon } from './fileIcons';
import { formatFileSize } from '@/utils/formatFileSize';
import useLongPress from '@/app/hooks/useLongPress';

function Row({ item, isFolder, isSelected, onClick, onDoubleClick, onContextMenu, index = 0 }) {
  const longPress = useLongPress((coords) => {
    onContextMenu({ clientX: coords.x, clientY: coords.y, preventDefault() {}, stopPropagation() {} });
  });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.012, 0.2), ease: 'easeOut' }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onTouchStart={longPress.onTouchStart}
      onTouchEnd={longPress.onTouchEnd}
      onTouchMove={longPress.onTouchMove}
      onTouchCancel={longPress.onTouchCancel}
      className={`grid grid-cols-[24px_1fr_auto_auto] items-center gap-3 px-3 py-2 cursor-pointer border-b border-gray-800 last:border-0 select-none transition-colors ${
        isSelected ? 'bg-blue-600/10' : 'hover:bg-[#222]'
      }`}
    >
      <div className="flex items-center justify-center">
        {isSelected ? (
          <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center"><Check size={10} strokeWidth={3} /></div>
        ) : (
          <div className="w-4 h-4 rounded border border-gray-600" />
        )}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        {isFolder ? <FolderIcon size={18} /> : <FileTypeIcon name={item.name} mime={item.mime} />}
        <span className="text-sm truncate">{item.name}</span>
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {isFolder ? '—' : formatFileSize(item.size)}
      </span>
      <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">
        {item.lastModified ? format(new Date(item.lastModified), 'PP p') : ''}
      </span>
    </motion.div>
  );
}

export default function FileList({ folders, files, selection, onItemClick, onItemOpen, onItemContext }) {
  const allIds = [
    ...folders.map((f) => `folder:${f.prefix}`),
    ...files.map((f) => f.key),
  ];

  return (
    <div className="rounded-xl border border-gray-800 bg-[#1c1c1c] overflow-hidden">
      <div className="hidden sm:grid grid-cols-[24px_1fr_auto_auto] gap-3 px-3 py-2 border-b border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
        <div></div>
        <div>Name</div>
        <div>Size</div>
        <div>Modified</div>
      </div>
      {folders.map((f, i) => {
        const id = `folder:${f.prefix}`;
        return (
          <Row
            key={id}
            index={i}
            item={f}
            isFolder
            isSelected={selection.isSelected(id)}
            onClick={(e) => onItemClick({ id, index: i, ids: allIds, kind: 'folder', item: f, e })}
            onDoubleClick={() => onItemOpen({ kind: 'folder', item: f })}
            onContextMenu={(e) => onItemContext({ e, kind: 'folder', item: f, id })}
          />
        );
      })}
      {files.map((f, i) => {
        const id = f.key;
        const fullIdx = folders.length + i;
        return (
          <Row
            key={id}
            index={fullIdx}
            item={f}
            isFolder={false}
            isSelected={selection.isSelected(id)}
            onClick={(e) => onItemClick({ id, index: fullIdx, ids: allIds, kind: 'file', item: f, e })}
            onDoubleClick={() => onItemOpen({ kind: 'file', item: f })}
            onContextMenu={(e) => onItemContext({ e, kind: 'file', item: f, id })}
          />
        );
      })}
    </div>
  );
}
