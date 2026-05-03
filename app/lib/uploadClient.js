// Walk DataTransferItem entries (folder drag-drop) into a flat list of {file, relativePath}.
export function readDataTransferItems(items) {
  const out = [];
  const promises = [];

  function traverseEntry(entry, path = '') {
    if (entry.isFile) {
      promises.push(new Promise((resolve) => {
        entry.file((file) => {
          out.push({ file, relativePath: path + file.name });
          resolve();
        });
      }));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const readAll = () => new Promise((resolve) => {
        const drained = [];
        const readBatch = () => {
          reader.readEntries((entries) => {
            if (!entries.length) {
              Promise.all(drained.map((e) => traverseEntry(e, path + entry.name + '/'))).then(resolve);
            } else {
              drained.push(...entries);
              readBatch();
            }
          });
        };
        readBatch();
      });
      promises.push(readAll());
    }
  }

  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) traverseEntry(entry);
    else if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) out.push({ file, relativePath: file.name });
    }
  }
  return Promise.all(promises).then(() => out);
}

// Convert <input webkitdirectory> FileList to {file, relativePath} array.
export function fileListToEntries(fileList) {
  return Array.from(fileList).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name,
  }));
}

// Upload entries to /api/drive/[scope]/upload via XHR for progress events.
// Returns: Promise<{ files: [...] }>
export function uploadEntries({ scope, prefix, entries, onProgress, onFileDone }) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('prefix', prefix || '');
    for (const { file, relativePath } of entries) {
      fd.append('relativePath', relativePath || file.name);
      fd.append('files', file, file.name);
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/drive/${scope}/upload`);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress({ loaded: ev.loaded, total: ev.total, percent: (ev.loaded / ev.total) * 100 });
      }
    };
    xhr.onload = () => {
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
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(fd);
  });
}
