// Client-side type detection (avoids importing 'mime' into client bundle).

const EXT = (name = '') => {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
};

const IMAGE = new Set(['jpg','jpeg','png','gif','webp','svg','avif','bmp','ico','heic','heif']);
const VIDEO = new Set(['mp4','webm','mov','m4v','mkv','avi','ogv']);
const AUDIO = new Set(['mp3','wav','ogg','m4a','flac','aac','opus']);
const PDF = new Set(['pdf']);
const ZIP_LIKE = new Set(['zip','rar','7z','tar','gz','tgz','bz2','xz']);
const CODE = new Set([
  'js','jsx','ts','tsx','mjs','cjs','json','json5','yaml','yml','toml','xml','html','htm','css','scss','sass','less',
  'md','mdx','txt','log','env','sh','bash','zsh','ps1','bat','cmd','py','rb','go','rs','java','kt','swift','c','h',
  'cpp','hpp','cs','php','sql','graphql','gql','ini','conf','dockerfile','makefile','vue','svelte','astro',
]);
const DOC = new Set(['doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp']);

export function categoryOf(nameOrMime, fallbackName = '') {
  const v = (nameOrMime || '').toLowerCase();
  if (v.startsWith('image/')) return 'image';
  if (v.startsWith('video/')) return 'video';
  if (v.startsWith('audio/')) return 'audio';
  if (v === 'application/pdf') return 'pdf';
  const ext = EXT(fallbackName) || EXT(nameOrMime);
  if (IMAGE.has(ext)) return 'image';
  if (VIDEO.has(ext)) return 'video';
  if (AUDIO.has(ext)) return 'audio';
  if (PDF.has(ext)) return 'pdf';
  if (ZIP_LIKE.has(ext)) return 'archive';
  if (CODE.has(ext)) return 'text';
  if (DOC.has(ext)) return 'doc';
  if (v.startsWith('text/')) return 'text';
  return 'other';
}

export function langForExt(name) {
  const map = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx', mjs: 'javascript', cjs: 'javascript',
    json: 'json', md: 'markdown', mdx: 'markdown', html: 'markup', htm: 'markup', xml: 'markup',
    css: 'css', scss: 'scss', sass: 'sass', less: 'less', py: 'python', rb: 'ruby', go: 'go',
    rs: 'rust', java: 'java', kt: 'kotlin', swift: 'swift', c: 'c', cpp: 'cpp', hpp: 'cpp',
    h: 'c', cs: 'csharp', php: 'php', sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash',
    yml: 'yaml', yaml: 'yaml', toml: 'toml', graphql: 'graphql', gql: 'graphql',
  };
  return map[EXT(name)] || 'plain';
}
