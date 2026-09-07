// ---------------------------------------------------------------------------- helpers

export function countLines(content: string): number {
    if (content.length === 0) return 1;
    return content.split('\n').length;
}

export function countWords(content: string): number {
    const trimmed = content.trim();
    if (trimmed.length === 0) return 0;
    return trimmed.split(/\s+/).length;
}

export function detectLanguage(path: string): string {
    if (path.endsWith('.ts')) return 'TypeScript';
    if (path.endsWith('.json')) return 'JSON';
    if (path.endsWith('.css')) return 'CSS';
    if (path.endsWith('.md')) return 'Markdown';
    if (path.endsWith('.sql')) return 'SQL';
    return 'Plain Text';
}

export function timestampStr(): string {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}
