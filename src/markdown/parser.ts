/**
 * Safe, zero-dependency markdown parser for MarkdownApp.
 *
 * Converts markdown text into structured blocks and inline spans.
 */

import type { MarkdownBlock, MarkdownSpan } from './contract.js';

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

function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

export function parseMarkdownDocument(source: string): readonly MarkdownBlock[] {
    const lines = source.split('\n');
    const blocks: MarkdownBlock[] = [];
    let idx = 0;
    let blockId = 0;

    const makeId = (kind: string, text: string): string =>
        `block-${String(++blockId)}-${kind}-${hashString(text)}`;

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
            const codeText = codeLines.join('\n');
            blocks.push({
                id: makeId('code', codeText),
                kind: 'code',
                codeLanguage: language.length > 0 ? language : 'text',
                rawText: codeText,
            });
            continue;
        }

        // Horizontal rule: ---
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            blocks.push({
                id: makeId('hr', trimmed),
                kind: 'hr',
                rawText: trimmed,
            });
            idx++;
            continue;
        }

        // Headings: #, ##, ###
        if (trimmed.startsWith('### ')) {
            const hText = trimmed.slice(4).trim();
            blocks.push({
                id: makeId('h3', hText),
                kind: 'heading',
                level: 3,
                rawText: hText,
            });
            idx++;
            continue;
        }
        if (trimmed.startsWith('## ')) {
            const hText = trimmed.slice(3).trim();
            blocks.push({
                id: makeId('h2', hText),
                kind: 'heading',
                level: 2,
                rawText: hText,
            });
            idx++;
            continue;
        }
        if (trimmed.startsWith('# ')) {
            const hText = trimmed.slice(2).trim();
            blocks.push({
                id: makeId('h1', hText),
                kind: 'heading',
                level: 1,
                rawText: hText,
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
            const qText = quoteLines.join(' ');
            blocks.push({
                id: makeId('quote', qText),
                kind: 'quote',
                rawText: qText,
            });
            continue;
        }

        // List items: - or * or 1.
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
            const listText = listItems.join('\n');
            blocks.push({
                id: makeId('list', listText),
                kind: 'list',
                items: listItems,
                rawText: listText,
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
            id: makeId('para', fullPara),
            kind: 'paragraph',
            spans: parseInlineSpans(fullPara),
            rawText: fullPara,
        });
    }

    return blocks;
}
