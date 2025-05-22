export function formatFileName(key, prefix = 'uploads') {
  return prefix === 'private' ? key.replace(/^private\/[a-f0-9\-]+-/, '') : key.replace(/^uploads\/[a-f0-9\-]+-/, '');
}
