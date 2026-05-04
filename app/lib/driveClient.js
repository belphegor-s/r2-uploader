// Client-side API wrappers for /api/drive/[scope]/*

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error(body?.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

const base = (scope) => `/api/drive/${scope}`;

export const driveApi = {
  list: (scope, prefix = '') => {
    const u = new URL(`${base(scope)}/list`, window.location.origin);
    if (prefix) u.searchParams.set('prefix', prefix);
    return jsonFetch(u.toString());
  },
  tree: (scope, prefix = '') => {
    const u = new URL(`${base(scope)}/tree`, window.location.origin);
    if (prefix) u.searchParams.set('prefix', prefix);
    return jsonFetch(u.toString());
  },
  createFolder: (scope, prefix, name) =>
    jsonFetch(`${base(scope)}/folder`, { method: 'POST', body: JSON.stringify({ prefix, name }) }),
  deleteFolder: (scope, prefix) =>
    jsonFetch(`${base(scope)}/folder`, { method: 'DELETE', body: JSON.stringify({ prefix }) }),
  deleteKeys: (scope, keys) =>
    jsonFetch(`${base(scope)}/delete`, { method: 'POST', body: JSON.stringify({ keys }) }),
  move: (scope, keys, destPrefix) =>
    jsonFetch(`${base(scope)}/move`, { method: 'POST', body: JSON.stringify({ keys, destPrefix }) }),
  copy: (scope, keys, destPrefix) =>
    jsonFetch(`${base(scope)}/copy`, { method: 'POST', body: JSON.stringify({ keys, destPrefix }) }),
  rename: (scope, payload) =>
    jsonFetch(`${base(scope)}/rename`, { method: 'POST', body: JSON.stringify(payload) }),
  search: (scope, q, prefix = '') => {
    const u = new URL(`${base(scope)}/search`, window.location.origin);
    u.searchParams.set('q', q);
    if (prefix) u.searchParams.set('prefix', prefix);
    return jsonFetch(u.toString());
  },
  previewUrl: (scope, key) => {
    const u = new URL(`${base(scope)}/preview-url`, window.location.origin);
    u.searchParams.set('key', key);
    return jsonFetch(u.toString());
  },
  zipUrl: (scope) => `${base(scope)}/zip`,
};

// Streams a single file through the server-side download proxy, reporting progress,
// then triggers a browser save via blob URL. Supports cancel via AbortSignal.
// Content-Length is forwarded from R2, enabling determinate progress bars.
export async function downloadFileWithProgress(scope, key, filename, { signal, onProgress } = {}) {
  const url = new URL(`/api/drive/${scope}/download`, window.location.origin);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString(), { signal, cache: 'no-store' });

  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const text = await res.text();
      if (text) msg = text.slice(0, 300);
    } catch {}
    throw new Error(msg);
  }

  const totalHeader = res.headers.get('content-length');
  const total = totalHeader ? Number(totalHeader) : 0;

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Streaming not supported in this browser');

  const chunks = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        if (onProgress) {
          onProgress({
            loaded: received,
            total,
            percent: total ? Math.min(100, (received / total) * 100) : null,
          });
        }
      }
    }
  } catch (err) {
    try { await reader.cancel(); } catch {}
    throw err;
  }

  const blob = new Blob(chunks, { type: res.headers.get('content-type') || 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  return { bytes: received };
}

// Streams the zip response into memory, reporting progress, then triggers a
// browser save via blob URL. Supports cancel via AbortSignal.
//
// Note: the server streams the zip without a Content-Length, so total size is
// unknown until completion. Progress is reported in received bytes; the UI
// renders an indeterminate bar in that case.
export async function downloadZipWithProgress(scope, payload, filename = 'download.zip', { signal, onProgress } = {}) {
  const body = { ...(payload || {}), filename };
  const res = await fetch(`/api/drive/${scope}/zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
    cache: 'no-store',
  });

  if (!res.ok) {
    let msg = `Zip failed (${res.status})`;
    try {
      const text = await res.text();
      if (text) msg = text.slice(0, 300);
    } catch {}
    throw new Error(msg);
  }

  const totalHeader = res.headers.get('content-length');
  const total = totalHeader ? Number(totalHeader) : 0;

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Streaming not supported in this browser');

  const chunks = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        if (onProgress) {
          onProgress({
            loaded: received,
            total,
            percent: total ? Math.min(100, (received / total) * 100) : null,
          });
        }
      }
    }
  } catch (err) {
    try { await reader.cancel(); } catch {}
    throw err;
  }

  const blob = new Blob(chunks, { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { bytes: received };
}
