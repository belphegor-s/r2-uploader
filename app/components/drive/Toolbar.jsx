'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { FolderPlus, Upload, FolderUp, LayoutGrid, List, ArrowUpDown, Menu, Search } from 'lucide-react';

const tap = { whileTap: { scale: 0.96 }, whileHover: { y: -1 } };

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
      <motion.button {...tap} onClick={onToggleSidebar} className="md:hidden p-2 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a]" aria-label="Toggle sidebar">
        <Menu size={18} />
      </motion.button>

      <motion.button {...tap} onClick={onNewFolder} className="flex items-center gap-2 btn-neutral">
        <FolderPlus size={16} /> <span className="hidden sm:inline">New folder</span>
      </motion.button>

      <motion.button {...tap} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 btn-neutral">
        <Upload size={16} /> <span className="hidden sm:inline">Upload files</span>
      </motion.button>
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

      <motion.button {...tap} onClick={() => folderInputRef.current?.click()} className="flex items-center gap-2 btn-neutral">
        <FolderUp size={16} /> <span className="hidden sm:inline">Upload folder</span>
      </motion.button>
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
        <motion.button {...tap} onClick={onOpenSearch} className="flex items-center gap-2 btn-neutral md:hidden">
          <Search size={16} />
        </motion.button>

        <div className="hidden sm:flex items-center bg-[#2a2a2a] rounded-md p-0.5 relative">
          {['grid', 'list'].map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`relative z-10 p-1.5 rounded transition-colors ${view === mode ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              aria-label={`${mode} view`}
            >
              {mode === 'grid' ? <LayoutGrid size={16} /> : <List size={16} />}
              {view === mode && (
                <motion.span
                  layoutId="viewModeIndicator"
                  className="absolute inset-0 bg-[#3a3a3a] rounded -z-0"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={`${sort.by}:${sort.dir}`}
            onChange={(e) => {
              const [by, dir] = e.target.value.split(':');
              setSort({ by, dir });
            }}
            className="custom-input pl-3 pr-9 text-xs sm:text-sm appearance-none"
            style={{ width: 'auto', minWidth: 180 }}
          >
            <option value="modified:desc">Newest first</option>
            <option value="modified:asc">Oldest first</option>
            <option value="name:asc">Name A → Z</option>
            <option value="name:desc">Name Z → A</option>
            <option value="size:desc">Size large → small</option>
            <option value="size:asc">Size small → large</option>
          </select>
          <ArrowUpDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
