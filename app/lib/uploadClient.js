// Walk DataTransferItem entries (folder drag-drop) into a flat list of {file, relativePath}.
// Uses a fully-awaited recursive walk so deeply-nested directories are not lost.

function readAllEntries(reader) {
  return new Promise((resolve, reject) => {
    const drained = [];
    const pump = () => {
      reader.readEntries(
        (entries) => {
          if (!entries.length) {
            resolve(drained);
          } else {
            drained.push(...entries);
            pump();
          }
        },
        (err) => reject(err),
      );
    };
    pump();
  });
}

function entryToFile(fileEntry) {
  return new Promise((resolve, reject) => fileEntry.file(resolve, reject));
}

async function walkEntry(entry, basePath, out) {
  if (!entry) return;
  if (entry.isFile) {
    const file = await entryToFile(entry);
    out.push({ file, relativePath: basePath + file.name });
    return;
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const children = await readAllEntries(reader);
    const nextBase = basePath + entry.name + '/';
    for (const child of children) {
      // eslint-disable-next-line no-await-in-loop
      await walkEntry(child, nextBase, out);
    }
  }
}

// IMPORTANT: call this from inside the drop handler synchronously up to the
// point of grabbing entries — the DataTransferItemList is invalidated after
// the dispatch returns, so any later access yields nulls.
export function snapshotDataTransferEntries(items) {
  const entries = [];
  const looseFiles = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) entries.push(entry);
    else if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) looseFiles.push(file);
    }
  }
  return { entries, looseFiles };
}

export async function readDataTransferItems(items) {
  const { entries, looseFiles } = snapshotDataTransferEntries(items);
  const out = looseFiles.map((file) => ({ file, relativePath: file.name }));
  await Promise.all(entries.map((entry) => walkEntry(entry, '', out)));
  return out;
}

// Two-phase variant for callers that already grabbed the snapshot synchronously.
export async function walkSnapshot({ entries, looseFiles }) {
  const out = looseFiles.map((file) => ({ file, relativePath: file.name }));
  await Promise.all(entries.map((entry) => walkEntry(entry, '', out)));
  return out;
}

// Convert <input webkitdirectory> FileList to {file, relativePath} array.
export function fileListToEntries(fileList) {
  return Array.from(fileList).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name,
  }));
}

// Upload entries to /api/drive/[scope]/upload via XHR for progress events.
// Pass an AbortSignal to cancel — promise rejects with err.name === 'AbortError'.
export function uploadEntries({ scope, prefix, entries, onProgress, onFileDone, signal }) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('prefix', prefix || '');
    for (const { file, relativePath } of entries) {
      fd.append('relativePath', relativePath || file.name);
      fd.append('files', file, file.name);
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/drive/${scope}/upload`);

    let aborted = false;
    const onAbort = () => {
      aborted = true;
      try { xhr.abort(); } catch {}
      const err = new Error('Upload cancelled');
      err.name = 'AbortError';
      reject(err);
    };
    if (signal) {
      if (signal.aborted) { onAbort(); return; }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress({ loaded: ev.loaded, total: ev.total, percent: (ev.loaded / ev.total) * 100 });
      }
    };
    xhr.onload = () => {
      signal?.removeEventListener?.('abort', onAbort);
      if (aborted) return;
      try {
        const body = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onFileDone) onFileDone(body);
          resolve(body);
        } else reject(new Error(body?.error || xhr.responseText || 'Upload failed'));
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => {
      signal?.removeEventListener?.('abort', onAbort);
      if (aborted) return;
      reject(new Error('Network error'));
    };
    xhr.onabort = () => {
      signal?.removeEventListener?.('abort', onAbort);
      if (!aborted) {
        const err = new Error('Upload cancelled');
        err.name = 'AbortError';
        reject(err);
      }
    };
    xhr.send(fd);
  });
}
