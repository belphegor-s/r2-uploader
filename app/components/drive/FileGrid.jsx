'use client';

import { Check } from 'lucide-react';
import { FolderIcon, FileTypeIcon } from './fileIcons';
import { formatFileSize } from '@/utils/formatFileSize';
import { categoryOf } from '@/app/lib/fileTypes';
import useLongPress from '@/app/hooks/useLongPress';

function GridItem({ id, item, isFolder, isSelected, onClick, onDoubleClick, onContextMenu, thumbUrl }) {
  const longPress = useLongPress((coords) => {
    onContextMenu({ clientX: coords.x, clientY: coords.y, preventDefault() {}, stopPropagation() {} });
  });
  const cat = isFolder ? null : categoryOf(item.mime || '', item.name);
  const showThumb = !isFolder && cat === 'image' && thumbUrl;

  return (
    <div
      className={`group relative rounded-xl border transition cursor-pointer overflow-hidden select-none ${
        isSelected
          ? 'border-blue-500 bg-blue-600/10 ring-1 ring-blue-500/40'
          : 'border-gray-800 bg-[#1c1c1c] hover:border-gray-600 hover:bg-[#222]'
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onTouchStart={longPress.onTouchStart}
      onTouchEnd={longPress.onTouchEnd}
      onTouchMove={longPress.onTouchMove}
      onTouchCancel={longPress.onTouchCancel}
    >
      <div className="aspect-square bg-[#141414] flex items-center justify-center overflow-hidden">
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        ) : isFolder ? (
          <FolderIcon size={56} />
        ) : (
          <FileTypeIcon name={item.name} mime={item.mime} size={48} />
        )}
      </div>
      <div className="px-3 py-2">
        <div className="text-sm font-medium truncate" title={isFolder ? item.name : item.name}>
          {item.name}
        </div>
        <div className="text-[11px] text-gray-500 truncate">
          {isFolder ? 'Folder' : formatFileSize(item.size)}
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
          <Check size={12} strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

export default function FileGrid({ folders, files, selection, onItemClick, onItemOpen, onItemContext, thumbCache }) {
  const allIds = [
    ...folders.map((f) => `folder:${f.prefix}`),
    ...files.map((f) => f.key),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {folders.map((f, i) => {
        const id = `folder:${f.prefix}`;
        return (
          <GridItem
            key={id}
            id={id}
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
          <GridItem
            key={id}
            id={id}
            item={f}
            isFolder={false}
            isSelected={selection.isSelected(id)}
            thumbUrl={thumbCache?.[f.key] || (f.url && categoryOf(f.mime || '', f.name) === 'image' ? f.url : null)}
            onClick={(e) => onItemClick({ id, index: fullIdx, ids: allIds, kind: 'file', item: f, e })}
            onDoubleClick={() => onItemOpen({ kind: 'file', item: f })}
            onContextMenu={(e) => onItemContext({ e, kind: 'file', item: f, id })}
          />
        );
      })}
    </div>
  );
}
