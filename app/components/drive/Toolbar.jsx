'use client';

import { useRef } from 'react';
import { FolderPlus, Upload, FolderUp, LayoutGrid, List, ArrowUpDown, Menu, Search } from 'lucide-react';

export default function Toolbar({
  view,
  setView,
  sort,
  setSort,
  onNewFolder,
  onUploadFiles,
  onUploadFolder,
  onOpenSearch,
  onToggleSidebar,
}) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={onToggleSidebar} className="md:hidden p-2 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a]" aria-label="Toggle sidebar">
        <Menu size={18} />
      </button>

      <button onClick={onNewFolder} className="flex items-center gap-2 btn-neutral">
        <FolderPlus size={16} /> <span className="hidden sm:inline">New folder</span>
      </button>

      <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 btn-neutral">
        <Upload size={16} /> <span className="hidden sm:inline">Upload files</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onUploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <button onClick={() => folderInputRef.current?.click()} className="flex items-center gap-2 btn-neutral">
        <FolderUp size={16} /> <span className="hidden sm:inline">Upload folder</span>
      </button>
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onUploadFolder(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="ml-auto flex items-center gap-2">
        <button onClick={onOpenSearch} className="flex items-center gap-2 btn-neutral md:hidden">
          <Search size={16} />
        </button>

        <div className="hidden sm:flex items-center bg-[#2a2a2a] rounded-md p-0.5">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded ${view === 'grid' ? 'bg-[#3a3a3a] text-white' : 'text-gray-400 hover:text-white'}`}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded ${view === 'list' ? 'bg-[#3a3a3a] text-white' : 'text-gray-400 hover:text-white'}`}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>

        <div className="relative">
          <select
            value={`${sort.by}:${sort.dir}`}
            onChange={(e) => {
              const [by, dir] = e.target.value.split(':');
              setSort({ by, dir });
            }}
            className="custom-input pr-8 text-xs sm:text-sm"
            style={{ width: 'auto', minWidth: 140 }}
          >
            <option value="modified:desc">Newest first</option>
            <option value="modified:asc">Oldest first</option>
            <option value="name:asc">Name A → Z</option>
            <option value="name:desc">Name Z → A</option>
            <option value="size:desc">Size large → small</option>
            <option value="size:asc">Size small → large</option>
          </select>
          <ArrowUpDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
