import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

export function highlightCode(code: string, language: string): string {
  const lang = hljs.getLanguage(language) ? language : 'plaintext';
  return hljs.highlight(code, { language: lang }).value;
}

const FILE_EXT_LANG_MAP: Record<string, string> = {
  '.py': 'python',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.go': 'go',
  '.java': 'java',
  '.json': 'json',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.md': 'markdown',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.lua': 'lua',
  '.r': 'r',
};

export function guessLanguageFromPath(path: string): string {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return FILE_EXT_LANG_MAP[ext] || 'plaintext';
}

export function tryParseJSON(str: string): any | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function formatJSON(str: string): string {
  const parsed = tryParseJSON(str);
  if (parsed === null) return str;
  return JSON.stringify(parsed, null, 2);
}
