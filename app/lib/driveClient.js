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

// Triggers a browser download of a POST stream by submitting an invisible form? No — fetch + blob.
// For potentially huge zips, use anchor + form submission? We use fetch + reading via response stream is heavy.
// Simpler approach: open a hidden iframe with a temporary form POST.
export async function downloadZip(scope, payload, filename = 'download.zip', signal) {
  const res = await fetch(`/api/drive/${scope}/zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, filename }),
    signal,
  });
  if (!res.ok) throw new Error(`Zip failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
