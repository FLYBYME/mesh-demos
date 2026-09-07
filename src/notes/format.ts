// ---------------------------------------------------------------------------- formatting & helpers

export function formatNoteDate(epochMs: number): string {
    const d = new Date(epochMs);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}/${day} ${h}:${min}`;
}

export function countWords(str: string): number {
    const trimmed = str.trim();
    if (trimmed.length === 0) return 0;
    return trimmed.split(/\s+/).length;
}
