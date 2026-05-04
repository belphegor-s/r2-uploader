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

// Triggers a native browser download using a hidden form POST.
// This allows the browser to handle the stream directly, avoiding memory issues and showing immediate progress.
export function downloadZip(scope, payload, filename = 'download.zip') {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `/api/drive/${scope}/zip`;
  form.target = '_self'; // Ensure download happens in the current tab

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}
