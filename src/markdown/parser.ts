import type { MarkdownBlock, MarkdownSpan } from './contract.js';

// ---------------------------------------------------------------------------- parser

export function parseInlineSpans(raw: string): readonly MarkdownSpan[] {
    const spans: MarkdownSpan[] = [];
    let i = 0;

    while (i < raw.length) {
        // Bold: **text**
        if (raw.slice(i, i + 2) === '**') {
            const end = raw.indexOf('**', i + 2);
            if (end !== -1) {
                spans.push({ type: 'bold', content: raw.slice(i + 2, end) });
                i = end + 2;
                continue;
            }
        }

        // Inline code: `code`
        if (raw[i] === '`') {
            const end = raw.indexOf('`', i + 1);
            if (end !== -1) {
                spans.push({ type: 'code', content: raw.slice(i + 1, end) });
                i = end + 1;
                continue;
            }
        }

        // Italic: *text*
        if (raw[i] === '*') {
            const end = raw.indexOf('*', i + 1);
            if (end !== -1) {
                spans.push({ type: 'italic', content: raw.slice(i + 1, end) });
                i = end + 1;
                continue;
            }
        }

        // Link: [label](url)
        if (raw[i] === '[') {
            const closingBracket = raw.indexOf(']', i + 1);
            if (closingBracket !== -1 && raw[closingBracket + 1] === '(') {
                const closingParen = raw.indexOf(')', closingBracket + 2);
                if (closingParen !== -1) {
                    const label = raw.slice(i + 1, closingBracket);
                    const url = raw.slice(closingBracket + 2, closingParen);
                    spans.push({ type: 'link', content: label, target: url });
                    i = closingParen + 1;
                    continue;
                }
            }
        }

        // Plain text run until next special character
        let j = i + 1;
        while (j < raw.length && raw[j] !== '*' && raw[j] !== '`' && raw[j] !== '[') {
            j++;
        }
        spans.push({ type: 'text', content: raw.slice(i, j) });
        i = j;
    }

    return spans;
}

export function parseMarkdownDocument(source: string): readonly MarkdownBlock[] {
    const lines = source.split('\n');
    const blocks: MarkdownBlock[] = [];
    let idx = 0;
    let blockId = 0;

    while (idx < lines.length) {
        const line = lines[idx] ?? '';
        const trimmed = line.trim();

        // Empty line
        if (trimmed.length === 0) {
            idx++;
            continue;
        }

        // Code block: ```
        if (trimmed.startsWith('```')) {
            const language = trimmed.slice(3).trim();
            const codeLines: string[] = [];
            idx++;
            while (idx < lines.length) {
                const codeLine = lines[idx] ?? '';
                if (codeLine.trim().startsWith('```')) {
                    idx++;
                    break;
                }
                codeLines.push(codeLine);
                idx++;
            }
            blocks.push({
                id: `block-${String(++blockId)}`,
                kind: 'code',
                codeLanguage: language.length > 0 ? language : 'text',
                rawText: codeLines.join('\n'),
            });
            continue;
        }

        // Horizontal rule: ---
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            blocks.push({
                id: `block-${String(++blockId)}`,
                kind: 'hr',
                rawText: trimmed,
            });
            idx++;
            continue;
        }

        // Headings: #, ##, ###
        if (trimmed.startsWith('### ')) {
            blocks.push({
                id: `block-${String(++blockId)}`,
                kind: 'heading',
                level: 3,
                rawText: trimmed.slice(4).trim(),
            });
            idx++;
            continue;
        }
        if (trimmed.startsWith('## ')) {
            blocks.push({
                id: `block-${String(++blockId)}`,
                kind: 'heading',
                level: 2,
                rawText: trimmed.slice(3).trim(),
            });
            idx++;
            continue;
        }
        if (trimmed.startsWith('# ')) {
            blocks.push({
                id: `block-${String(++blockId)}`,
                kind: 'heading',
                level: 1,
                rawText: trimmed.slice(2).trim(),
            });
            idx++;
            continue;
        }

        // Blockquote: >
        if (trimmed.startsWith('>')) {
            const quoteLines: string[] = [trimmed.replace(/^>\s*/, '')];
            idx++;
            while (idx < lines.length) {
                const nextLine = lines[idx] ?? '';
                if (!nextLine.trim().startsWith('>')) break;
                quoteLines.push(nextLine.trim().replace(/^>\s*/, ''));
                idx++;
            }
            blocks.push({
                id: `block-${String(++blockId)}`,
                kind: 'quote',
                rawText: quoteLines.join(' '),
            });
            continue;
        }

        // List item: - or * or 1.
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^[0-9]+\.\s/.test(trimmed)) {
            const listItems: string[] = [];
            while (idx < lines.length) {
                const nextLine = (lines[idx] ?? '').trim();
                if (nextLine.startsWith('- ') || nextLine.startsWith('* ')) {
                    listItems.push(nextLine.slice(2).trim());
                } else if (/^[0-9]+\.\s/.test(nextLine)) {
                    listItems.push(nextLine.replace(/^[0-9]+\.\s/, '').trim());
                } else {
                    break;
                }
                idx++;
            }
            blocks.push({
                id: `block-${String(++blockId)}`,
                kind: 'list',
                items: listItems,
                rawText: listItems.join('\n'),
            });
            continue;
        }

        // Default: Paragraph
        const paraLines: string[] = [trimmed];
        idx++;
        while (idx < lines.length) {
            const nextLine = (lines[idx] ?? '').trim();
            if (
                nextLine.length === 0 ||
                nextLine.startsWith('#') ||
                nextLine.startsWith('>') ||
                nextLine.startsWith('```') ||
                nextLine.startsWith('- ') ||
                nextLine.startsWith('* ') ||
                nextLine === '---'
            ) {
                break;
            }
            paraLines.push(nextLine);
            idx++;
        }
        const fullPara = paraLines.join(' ');
        blocks.push({
            id: `block-${String(++blockId)}`,
            kind: 'paragraph',
            spans: parseInlineSpans(fullPara),
            rawText: fullPara,
        });
    }

    return blocks;
}
