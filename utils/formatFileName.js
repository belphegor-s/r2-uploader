// Strip scope rootPrefix and any nested folder path, then UUID prefix.
// Backwards-compatible with old `prefix` arg ('uploads' | 'private').
export function formatFileName(key, prefix = 'uploads') {
  if (!key) return '';
  const root = prefix === 'private' ? 'private' : 'uploads';
  const stripped = key.startsWith(`${root}/`) ? key.slice(root.length + 1) : key;
  const last = stripped.split('/').pop() || stripped;
  return last.replace(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-/i, '');
}
