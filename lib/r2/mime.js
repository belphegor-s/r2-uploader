import mime from 'mime';

export function mimeFromName(name) {
  return mime.getType(name) || 'application/octet-stream';
}

export function mimeCategory(mimeType, name = '') {
  const m = (mimeType || '').toLowerCase();
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (m.startsWith('text/') || isCodeExt(ext) || isTextLikeMime(m)) return 'text';
  if (m === 'application/zip' || ext === 'zip') return 'zip';
  return 'other';
}

const CODE_EXTS = new Set([
  'js','jsx','ts','tsx','mjs','cjs','json','json5','yaml','yml','toml','xml','html','htm','css','scss','sass','less',
  'md','mdx','txt','log','env','sh','bash','zsh','ps1','bat','cmd','py','rb','go','rs','java','kt','swift','c','h',
  'cpp','hpp','cs','php','sql','graphql','gql','ini','conf','dockerfile','makefile','vue','svelte','astro'
]);

function isCodeExt(ext) {
  return CODE_EXTS.has(ext);
}

function isTextLikeMime(m) {
  return m === 'application/json' || m === 'application/xml' || m === 'application/javascript' || m === 'application/x-yaml';
}

export const langFromExt = (ext) => {
  const map = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx', mjs: 'javascript', cjs: 'javascript',
    json: 'json', md: 'markdown', mdx: 'markdown', html: 'markup', htm: 'markup', xml: 'markup',
    css: 'css', scss: 'scss', sass: 'sass', less: 'less', py: 'python', rb: 'ruby', go: 'go',
    rs: 'rust', java: 'java', kt: 'kotlin', swift: 'swift', c: 'c', cpp: 'cpp', hpp: 'cpp',
    h: 'c', cs: 'csharp', php: 'php', sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash',
    yml: 'yaml', yaml: 'yaml', toml: 'toml', graphql: 'graphql', gql: 'graphql',
  };
  return map[ext] || 'plain';
};
