'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Eye, Download, Pencil, Move, Copy, Trash2, Share2, Link as LinkIcon, FolderOpen, Archive,
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Loader from '@/app/components/Loader';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import Toolbar from './Toolbar';
import SearchBar from './SearchBar';
import FileGrid from './FileGrid';
import FileList from './FileList';
import ContextMenu from './ContextMenu';
import SelectionBar from './SelectionBar';
import PreviewModal from './PreviewModal';
import NewFolderModal from './NewFolderModal';
import RenameDialog from './RenameDialog';
import ConfirmDialog from './ConfirmDialog';
import MoveCopyDialog from './MoveCopyDialog';
import ShareDialog from './ShareDialog';
import UploadProgress from './UploadProgress';
import useDriveData from '@/app/hooks/useDriveData';
import useSelection from '@/app/hooks/useSelection';
import useContextMenu from '@/app/hooks/useContextMenu';
import useKeyboardShortcuts from '@/app/hooks/useKeyboardShortcuts';
import { driveApi, downloadZip } from '@/app/lib/driveClient';
import { uploadEntries, fileListToEntries, snapshotDataTransferEntries, walkSnapshot } from '@/app/lib/uploadClient';
import { categoryOf } from '@/app/lib/fileTypes';
import copyToClipboard from '@/utils/copyToClipboard';

function sortItems({ folders, files }, sort) {
  const f = [...folders];
  const fs = [...files];
  const dir = sort.dir === 'asc' ? 1 : -1;
  const cmp = (a, b, by) => {
    if (by === 'name') return a.name.localeCompare(b.name) * dir;
    if (by === 'size') return ((a.size ?? 0) - (b.size ?? 0)) * dir;
    return (new Date(a.lastModified || 0) - new Date(b.lastModified || 0)) * dir;
  };
  f.sort((a, b) => a.name.localeCompare(b.name));
  fs.sort((a, b) => cmp(a, b, sort.by));
  return { folders: f, files: fs };
}

export default function DrivePage({ scope }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefix = searchParams.get('path') || '';

  const { data, loading, refresh } = useDriveData(scope, prefix);

  const [view, setView] = useState('grid');
  const [sort, setSort] = useState({ by: 'modified', dir: 'desc' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);

  const selection = useSelection();
  const ctxMenu = useContextMenu();

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [renameTarget, setRenameTarget] = useState(null); // { kind, item }
  const [renaming, setRenaming] = useState(false);

  const [confirm, setConfirm] = useState(null); // { title, message, action, danger }
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [moveDialog, setMoveDialog] = useState(null); // { mode: 'move'|'copy', items }
  const [moveBusy, setMoveBusy] = useState(false);

  const [shareKey, setShareKey] = useState(null);
  const [previewState, setPreviewState] = useState(null); // { startIndex }

  const [batches, setBatches] = useState([]); // upload batches
  const [searchOverlay, setSearchOverlay] = useState(false);
  const [busy, setBusy] = useState(false);
  const dragCounter = useRef(0);
  const [dropOver, setDropOver] = useState(false);
  const [activeSearch, setActiveSearch] = useState(null); // { q, results, truncated }

  // Persist view preference
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('drive.view') : null;
    if (saved === 'grid' || saved === 'list') setView(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('drive.view', view);
  }, [view]);

  // Reset selection + clear search on path change
  useEffect(() => { selection.clear(); setActiveSearch(null); }, [prefix, scope]); // eslint-disable-line

  const sorted = useMemo(() => {
    if (activeSearch) {
      // In search mode, only files from results.
      const fakeData = { folders: [], files: activeSearch.results };
      return sortItems(fakeData, sort);
    }
    return sortItems(data, sort);
  }, [data, sort, activeSearch]);

  const navigate = useCallback((newPrefix) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (newPrefix) params.set('path', newPrefix);
    else params.delete('path');
    const qs = params.toString();
    router.push(qs ? `?${qs}` : '?');
  }, [router, searchParams]);

  const refreshAll = useCallback(async () => {
    await refresh();
    setTreeRefreshKey((k) => k + 1);
  }, [refresh]);

  // ─── Context menu items ────────────────────────────────────────────────
  const contextItems = useCallback((target) => {
    const sel = selection.ids;
    const isSelected = target ? sel.includes(target.id) : false;
    const operatingIds = isSelected && sel.length > 1 ? sel : (target ? [target.id] : sel);
    const operatingItems = operatingIds.map((id) => {
      if (id.startsWith('folder:')) {
        const p = id.slice(7);
        const f = sorted.folders.find((x) => x.prefix === p);
        return f ? { kind: 'folder', item: f, id } : null;
      }
      const file = sorted.files.find((x) => x.key === id);
      return file ? { kind: 'file', item: file, id } : null;
    }).filter(Boolean);

    const single = operatingItems.length === 1 ? operatingItems[0] : null;
    const items = [];

    if (single?.kind === 'file') {
      items.push({ label: 'Preview', icon: <Eye size={14} />, onClick: () => openPreview(single.item) });
      items.push({ label: 'Download', icon: <Download size={14} />, onClick: () => downloadOne(single.item) });
      if (scope === 'public' && single.item.url) {
        items.push({ label: 'Copy link', icon: <LinkIcon size={14} />, onClick: () => copyLink(single.item.url) });
      }
      if (scope === 'private') {
        items.push({ label: 'Share (pre-signed)', icon: <Share2 size={14} />, onClick: () => setShareKey(single.item.key) });
      }
      items.push({ divider: true });
      items.push({ label: 'Rename', icon: <Pencil size={14} />, onClick: () => setRenameTarget(single) });
    }

    if (single?.kind === 'folder') {
      items.push({ label: 'Open', icon: <FolderOpen size={14} />, onClick: () => navigate(single.item.prefix) });
      items.push({ label: 'Download as ZIP', icon: <Archive size={14} />, onClick: () => zipFolder(single.item) });
      items.push({ divider: true });
      items.push({ label: 'Rename', icon: <Pencil size={14} />, onClick: () => setRenameTarget(single) });
    }

    if (operatingItems.length > 1) {
      items.push({ label: `Download ${operatingItems.length} as ZIP`, icon: <Archive size={14} />, onClick: () => zipMultiple(operatingItems) });
    }

    if (operatingItems.length >= 1) {
      items.push({ label: 'Move…', icon: <Move size={14} />, onClick: () => setMoveDialog({ mode: 'move', items: operatingItems }) });
      items.push({ label: 'Copy…', icon: <Copy size={14} />, onClick: () => setMoveDialog({ mode: 'copy', items: operatingItems }) });
      items.push({ divider: true });
      items.push({
        label: 'Delete',
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: () => askDelete(operatingItems),
      });
    }

    return items;
  }, [selection.ids, sorted, scope, navigate]); // eslint-disable-line

  // ─── Actions ────────────────────────────────────────────────────────────
  const previewableFiles = useMemo(
    () => sorted.files.filter((f) => ['image','video','audio','pdf','text'].includes(categoryOf(f.mime || '', f.name))),
    [sorted.files],
  );

  const openPreview = useCallback((file) => {
    const idx = previewableFiles.findIndex((f) => f.key === file.key);
    if (idx === -1) {
      // File is in another folder OR non-previewable. If previewable mime, open in standalone single-file preview.
      const cat = categoryOf(file.mime || '', file.name);
      if (['image','video','audio','pdf','text'].includes(cat)) {
        setPreviewState({ startIndex: 0, files: [file] });
        return;
      }
      driveApi.previewUrl(scope, file.key).then(({ url }) => window.open(url, '_blank'));
      return;
    }
    setPreviewState({ startIndex: idx });
  }, [previewableFiles, scope]);

  const downloadOne = useCallback(async (file) => {
    try {
      const { url } = await driveApi.previewUrl(scope, file.key);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error('Failed to start download');
    }
  }, [scope]);

  const copyLink = useCallback(async (url) => {
    const ok = await copyToClipboard(url);
    if (ok) toast.success('Link copied');
    else toast.error('Failed to copy');
  }, []);

  const zipFolder = useCallback(async (folder) => {
    const id = `zip-${Date.now()}`;
    setBatches((b) => [...b, { id, label: `Zipping ${folder.name}`, status: 'uploading', percent: 0 }]);
    try {
      await downloadZip(scope, { folderPrefix: folder.prefix }, `${folder.name}.zip`);
      setBatches((b) => b.map((x) => x.id === id ? { ...x, status: 'done', percent: 100 } : x));
    } catch (err) {
      setBatches((b) => b.map((x) => x.id === id ? { ...x, status: 'error', message: err.message } : x));
    }
  }, [scope]);

  const zipMultiple = useCallback(async (items) => {
    const fileItems = items.filter((x) => x.kind === 'file').map((x) => x.item);
    const folderItems = items.filter((x) => x.kind === 'folder').map((x) => x.item);
    if (fileItems.length === 0 && folderItems.length === 0) return;

    if (folderItems.length === 0) {
      const id = `zip-${Date.now()}`;
      setBatches((b) => [...b, { id, label: `Zipping ${fileItems.length} files`, status: 'uploading' }]);
      try {
        await downloadZip(scope, { keys: fileItems.map((f) => f.key) }, `files-${Date.now()}.zip`);
        setBatches((b) => b.map((x) => x.id === id ? { ...x, status: 'done' } : x));
      } catch (err) {
        setBatches((b) => b.map((x) => x.id === id ? { ...x, status: 'error', message: err.message } : x));
      }
    } else {
      // Mixed selection: zip each folder individually + one for the loose files.
      for (const folder of folderItems) await zipFolder(folder);
      if (fileItems.length) await zipMultiple(fileItems.map((f) => ({ kind: 'file', item: f })));
    }
  }, [scope, zipFolder]);

  const askDelete = useCallback((items) => {
    const fileCount = items.filter((x) => x.kind === 'file').length;
    const folderCount = items.filter((x) => x.kind === 'folder').length;
    const parts = [];
    if (folderCount) parts.push(`${folderCount} folder${folderCount > 1 ? 's' : ''}`);
    if (fileCount) parts.push(`${fileCount} file${fileCount > 1 ? 's' : ''}`);
    setConfirm({
      title: 'Delete?',
      message: `Permanently delete ${parts.join(' and ')}?\n\nThis cannot be undone.`,
      danger: true,
      confirmLabel: 'Delete',
      action: async () => {
        setConfirmBusy(true);
        try {
          // Folders: recursive delete each. Files: batch delete.
          const fileKeys = items.filter((x) => x.kind === 'file').map((x) => x.item.key);
          if (fileKeys.length) await driveApi.deleteKeys(scope, fileKeys);
          for (const f of items.filter((x) => x.kind === 'folder')) {
            await driveApi.deleteFolder(scope, f.item.prefix);
          }
          toast.success('Deleted');
          selection.clear();
          await refreshAll();
          setConfirm(null);
        } catch (err) {
          toast.error(err.message || 'Delete failed');
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  }, [scope, selection, refreshAll]);

  // ─── Upload handling ───────────────────────────────────────────────────
  const handleUpload = useCallback(async (entries, label) => {
    if (!entries.length) return;
    const id = `up-${Date.now()}`;
    setBatches((b) => [...b, { id, label, status: 'uploading', percent: 0 }]);
    try {
      await uploadEntries({
        scope,
        prefix,
        entries,
        onProgress: ({ percent }) => {
          setBatches((b) => b.map((x) => x.id === id ? { ...x, percent } : x));
        },
      });
      setBatches((b) => b.map((x) => x.id === id ? { ...x, status: 'done', percent: 100 } : x));
      await refreshAll();
    } catch (err) {
      setBatches((b) => b.map((x) => x.id === id ? { ...x, status: 'error', message: err.message } : x));
      toast.error(err.message || 'Upload failed');
    }
  }, [scope, prefix, refreshAll]);

  const onUploadFiles = useCallback((fileList) => {
    const entries = Array.from(fileList).map((file) => ({ file, relativePath: file.name }));
    handleUpload(entries, `Uploading ${entries.length} file${entries.length > 1 ? 's' : ''}`);
  }, [handleUpload]);

  const onUploadFolder = useCallback((fileList) => {
    const entries = fileListToEntries(fileList);
    const folderName = entries[0]?.relativePath?.split('/')[0] || 'folder';
    handleUpload(entries, `Uploading folder “${folderName}” (${entries.length} files)`);
  }, [handleUpload]);

  // ─── Drag and drop on page ─────────────────────────────────────────────
  const onDragEnter = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragCounter.current += 1;
    setDropOver(true);
  };
  const onDragLeave = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) { dragCounter.current = 0; setDropOver(false); }
  };
  const onDragOver = (e) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDrop = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    setDropOver(false);
    dragCounter.current = 0;
    // Snapshot synchronously while DataTransferItemList is still valid,
    // then walk + upload async.
    const items = e.dataTransfer.items;
    if (items?.length) {
      const snap = snapshotDataTransferEntries(items);
      walkSnapshot(snap).then((entries) => {
        if (entries.length) handleUpload(entries, `Uploading ${entries.length} item${entries.length > 1 ? 's' : ''}`);
      });
    } else if (e.dataTransfer.files?.length) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────
  const allCurrentIds = useMemo(
    () => [...sorted.folders.map((f) => `folder:${f.prefix}`), ...sorted.files.map((f) => f.key)],
    [sorted],
  );
  useKeyboardShortcuts({
    onSelectAll: () => selection.setAll(allCurrentIds),
    onDelete: () => {
      if (selection.size === 0) return;
      const items = selection.ids.map((id) => {
        if (id.startsWith('folder:')) {
          const p = id.slice(7);
          const f = sorted.folders.find((x) => x.prefix === p);
          return f ? { kind: 'folder', item: f } : null;
        }
        const file = sorted.files.find((x) => x.key === id);
        return file ? { kind: 'file', item: file } : null;
      }).filter(Boolean);
      askDelete(items);
    },
    onSearch: () => setSearchOverlay(true),
    onEsc: () => { selection.clear(); ctxMenu.close(); setActiveSearch(null); },
    enabled: !previewState && !confirm && !renameTarget && !moveDialog && !shareKey && !newFolderOpen,
  });

  // ─── Item handlers ─────────────────────────────────────────────────────
  const onItemClick = ({ id, index, ids, e }) => {
    selection.click(id, index, ids, e);
  };
  const onItemOpen = ({ kind, item }) => {
    if (kind === 'folder') navigate(item.prefix);
    else openPreview(item);
  };
  const onItemContext = ({ e, kind, item, id }) => {
    if (!selection.isSelected(id)) selection.setOnly(id);
    ctxMenu.open(e, { kind, item, id });
  };

  // ─── Selection bar handlers ─────────────────────────────────────────────
  const selectionItems = () => selection.ids.map((id) => {
    if (id.startsWith('folder:')) {
      const p = id.slice(7);
      const f = sorted.folders.find((x) => x.prefix === p);
      return f ? { kind: 'folder', item: f, id } : null;
    }
    const file = sorted.files.find((x) => x.key === id);
    return file ? { kind: 'file', item: file, id } : null;
  }).filter(Boolean);

  // ─── Dialog submit handlers ─────────────────────────────────────────────
  const submitNewFolder = async (name) => {
    setCreatingFolder(true);
    try {
      await driveApi.createFolder(scope, prefix, name);
      toast.success('Folder created');
      setNewFolderOpen(false);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setCreatingFolder(false);
    }
  };

  const submitRename = async (newName) => {
    if (!renameTarget) return;
    setRenaming(true);
    try {
      const payload = renameTarget.kind === 'folder'
        ? { prefix: renameTarget.item.prefix, newName }
        : { key: renameTarget.item.key, newName };
      await driveApi.rename(scope, payload);
      toast.success('Renamed');
      setRenameTarget(null);
      await refreshAll();
    } catch (err) {
      toast.error(err.message || 'Rename failed');
    } finally {
      setRenaming(false);
    }
  };

  const submitMoveCopy = async (destPrefix) => {
    if (!moveDialog) return;
    setMoveBusy(true);
    try {
      // Move/copy individual files via /move|/copy. Folders → recursive copy/move via per-key transfer is heavy;
      // for simplicity treat folders by selecting their files server-side.
      const fileItems = moveDialog.items.filter((x) => x.kind === 'file').map((x) => x.item.key);
      const folderItems = moveDialog.items.filter((x) => x.kind === 'folder');
      if (fileItems.length) {
        if (moveDialog.mode === 'move') await driveApi.move(scope, fileItems, destPrefix);
        else await driveApi.copy(scope, fileItems, destPrefix);
      }
      if (folderItems.length) {
        // Folder moves via rename if same parent OR copy+delete via list+per-file. We use rename when
        // possible; for cross-folder, fall back to telling user it's not supported in bulk yet.
        for (const f of folderItems) {
          const segments = f.item.prefix.split('/');
          const last = segments.pop();
          const newParent = destPrefix;
          // Build target full prefix
          const targetPrefix = newParent ? `${newParent}/${last}` : last;
          if (targetPrefix === f.item.prefix) continue;
          if (moveDialog.mode === 'move') {
            // Use rename API with newName=last by passing prefix and newName. But our rename is sibling-only.
            // For cross-parent move, we'd need a dedicated endpoint; not exposed yet → toast error.
            const oldParent = segments.join('/');
            if (oldParent !== newParent) {
              toast.error(`Folder "${f.item.name}" can only be moved within the same parent for now.`);
              continue;
            }
            await driveApi.rename(scope, { prefix: f.item.prefix, newName: last });
          } else {
            toast.error(`Folder copy not supported in bulk yet.`);
          }
        }
      }
      toast.success(moveDialog.mode === 'move' ? 'Moved' : 'Copied');
      setMoveDialog(null);
      selection.clear();
      await refreshAll();
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setMoveBusy(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#272727] text-[#f5f5f5] flex flex-col">
      <Navbar />

      <div
        className="flex-1 flex relative"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* Sidebar — desktop */}
        <div className="hidden md:block">
          <Sidebar
            scope={scope}
            currentPrefix={prefix}
            onNavigate={(p) => { navigate(p); }}
            onFileOpen={(file) => openPreview(file)}
            refreshKey={treeRefreshKey}
          />
        </div>

        {/* Sidebar — mobile drawer */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="bg-black/60 absolute inset-0" onClick={() => setSidebarOpen(false)} />
            <div className="relative">
              <Sidebar
                scope={scope}
                currentPrefix={prefix}
                onNavigate={(p) => { navigate(p); setSidebarOpen(false); }}
                onFileOpen={(file) => { openPreview(file); setSidebarOpen(false); }}
                refreshKey={treeRefreshKey}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="px-3 sm:px-6 pt-4 pb-2 flex flex-col gap-3 border-b border-gray-800 bg-[#272727] sticky top-0 z-20">
            <div className="hidden md:flex items-center gap-3">
              <SearchBar
                scope={scope}
                prefix={prefix}
                onJump={(r) => navigate(r.folder)}
                onSubmit={({ q, results, truncated }) => { setActiveSearch({ q, results, truncated }); selection.clear(); }}
                onClearActive={() => setActiveSearch(null)}
                activeQuery={activeSearch?.q}
              />
              <div className="flex-1" />
            </div>
            <Toolbar
              view={view}
              setView={setView}
              sort={sort}
              setSort={setSort}
              onNewFolder={() => setNewFolderOpen(true)}
              onUploadFiles={onUploadFiles}
              onUploadFolder={onUploadFolder}
              onOpenSearch={() => setSearchOverlay(true)}
              onToggleSidebar={() => setSidebarOpen(true)}
            />
            {activeSearch ? (
              <div className="flex items-center gap-2 text-sm bg-blue-600/10 border border-blue-600/30 text-blue-200 rounded-md px-3 py-2">
                <span className="font-medium truncate">
                  Results for “{activeSearch.q}”: {sorted.files.length}{activeSearch.truncated ? '+' : ''}
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setActiveSearch(null)}
                  className="text-xs px-2 py-1 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-200"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <Breadcrumbs scope={scope} prefix={prefix} onNavigate={navigate} />
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 pb-32">
            {loading ? (
              <Loader />
            ) : sorted.folders.length === 0 && sorted.files.length === 0 ? (
              activeSearch
                ? <SearchEmpty q={activeSearch.q} onClear={() => setActiveSearch(null)} />
                : <EmptyState onUploadFiles={onUploadFiles} />
            ) : view === 'grid' ? (
              <FileGrid
                folders={sorted.folders}
                files={sorted.files}
                selection={selection}
                onItemClick={onItemClick}
                onItemOpen={onItemOpen}
                onItemContext={onItemContext}
              />
            ) : (
              <FileList
                folders={sorted.folders}
                files={sorted.files}
                selection={selection}
                onItemClick={onItemClick}
                onItemOpen={onItemOpen}
                onItemContext={onItemContext}
              />
            )}
          </div>
        </main>

        {/* Drag overlay */}
        {dropOver && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-blue-600/10 border-4 border-dashed border-blue-500/60">
            <div className="bg-[#1c1c1c] border border-blue-500 rounded-2xl px-6 py-4 text-blue-300 font-medium shadow-xl">
              Drop to upload to <span className="text-white">/{prefix || ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile search overlay */}
      {searchOverlay && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col p-4 md:hidden" onClick={() => setSearchOverlay(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-[#1c1c1c] rounded-xl p-3 border border-gray-800">
            <SearchBar
              scope={scope}
              prefix={prefix}
              onJump={(r) => { navigate(r.folder); setSearchOverlay(false); }}
              onSubmit={({ q, results, truncated }) => { setActiveSearch({ q, results, truncated }); selection.clear(); setSearchOverlay(false); }}
              onClearActive={() => setActiveSearch(null)}
              activeQuery={activeSearch?.q}
              autoFocus
            />
            <button onClick={() => setSearchOverlay(false)} className="mt-2 w-full btn-neutral">Close</button>
          </div>
        </div>
      )}

      {/* Selection bar */}
      <SelectionBar
        count={selection.size}
        totalCount={allCurrentIds.length}
        onClear={selection.clear}
        onSelectAll={() => selection.setAll(allCurrentIds)}
        busy={busy}
        onDelete={() => askDelete(selectionItems())}
        onMove={() => setMoveDialog({ mode: 'move', items: selectionItems() })}
        onCopy={() => setMoveDialog({ mode: 'copy', items: selectionItems() })}
        onDownloadZip={() => zipMultiple(selectionItems())}
      />

      {/* Context menu */}
      <ContextMenu
        menu={ctxMenu.menu}
        items={ctxMenu.menu ? contextItems(ctxMenu.menu.target) : []}
        onClose={ctxMenu.close}
      />

      {/* Modals */}
      <NewFolderModal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onSubmit={submitNewFolder}
        busy={creatingFolder}
      />
      <RenameDialog
        open={Boolean(renameTarget)}
        initialName={renameTarget?.item?.name || ''}
        title={renameTarget?.kind === 'folder' ? 'Rename folder' : 'Rename file'}
        onClose={() => setRenameTarget(null)}
        onSubmit={submitRename}
        busy={renaming}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm?.action()}
        busy={confirmBusy}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
      />
      <MoveCopyDialog
        open={Boolean(moveDialog)}
        scope={scope}
        mode={moveDialog?.mode}
        sourcePrefixes={moveDialog?.items?.filter((x) => x.kind === 'folder').map((x) => x.item.prefix) || []}
        onClose={() => setMoveDialog(null)}
        onSubmit={submitMoveCopy}
        busy={moveBusy}
      />
      {scope === 'private' && (
        <ShareDialog open={Boolean(shareKey)} fileKey={shareKey} onClose={() => setShareKey(null)} />
      )}
      {previewState && (
        <PreviewModal
          scope={scope}
          files={previewState.files || previewableFiles}
          startIndex={previewState.startIndex}
          onClose={() => setPreviewState(null)}
        />
      )}

      <UploadProgress
        batches={batches}
        onDismiss={(id) => setBatches((b) => b.filter((x) => x.id !== id))}
        lift={selection.size > 0}
      />
    </div>
  );
}

function EmptyState({ onUploadFiles }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400">
      <div className="w-16 h-16 rounded-full bg-[#1c1c1c] border border-gray-800 flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7.8C3 6.12 3 5.28 3.327 4.638a3 3 0 0 1 1.311-1.311C5.28 3 6.12 3 7.8 3h1.6l2 2H16.2c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C21 7.28 21 8.12 21 9.8V14.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C18.72 19 17.88 19 16.2 19H7.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C3 16.72 3 15.88 3 14.2z"/></svg>
      </div>
      <p className="text-sm font-medium">This folder is empty</p>
      <p className="text-xs mt-1 max-w-xs">Drag and drop files here, or use the upload buttons above.</p>
    </div>
  );
}

function SearchEmpty({ q, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400">
      <p className="text-sm font-medium">No matches for “{q}”</p>
      <p className="text-xs mt-1">Try a different keyword or clear the filter.</p>
      <button onClick={onClear} className="mt-4 btn-neutral">Clear search</button>
    </div>
  );
}
