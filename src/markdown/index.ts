import {
    command,
    each,
    element,
    needs,
    provider,
    text,
    tiles,
    when,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ProviderToken,
    type Signal,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types & contract

export interface MarkdownSpan {
    readonly type: 'text' | 'bold' | 'italic' | 'code' | 'link';
    readonly content: string;
    readonly target?: string;
}

export interface MarkdownBlock {
    readonly id: string;
    readonly kind: 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'hr';
    readonly level?: 1 | 2 | 3;
    readonly items?: readonly string[];
    readonly spans?: readonly MarkdownSpan[];
    readonly codeLanguage?: string;
    readonly rawText: string;
}

export interface MarkdownApi {
    readonly markdownText: Signal<string>;
    readonly textRevision: Signal<number>;
    readonly lineDraft: Signal<string>;
    readonly parsedBlocks: () => readonly MarkdownBlock[];
    readonly charCount: () => number;
    readonly wordCount: () => number;
    readonly lineCount: () => number;

    setText(content: string): void;
    appendLine(line: string): void;
    insertSyntax(template: string): void;
    loadSample(): void;
    clear(): void;
    setLineDraft(line: string): void;
    submitLineDraft(): void;
}

export const MARKDOWN: ProviderToken<MarkdownApi> = provider<MarkdownApi>('mesh-markdown');

const NEEDS = needs('state', 'commands', 'windows', 'log');

// ---------------------------------------------------------------------------- sample text

const SAMPLE_MARKDOWN = `# Project Overview

A collaborative workspace built on fine-grained reactive primitives.

## Key Features

- Pure functional view declarations
- No virtual DOM and no diffing
- Directional focus and non-pointer paths throughout

> "What is shown and the logic for what is shown are two different things."

### Code Architecture

\`\`\`typescript
interface ComponentDefinition {
    readonly name: string;
    create(): Element;
}
\`\`\`

---

Try editing this markdown text or adding new blocks on the left.`;

// ---------------------------------------------------------------------------- parser

function parseInlineSpans(raw: string): readonly MarkdownSpan[] {
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

function parseMarkdownDocument(source: string): readonly MarkdownBlock[] {
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

// ---------------------------------------------------------------------------- views

function renderEditorPane(vx: ViewContext<Record<string, never>, MarkdownApi>): Node {
    const toolbarBtnStyle = {
        padding: '4px 8px',
        'font-size': '12px',
        background: '#21262d',
        border: '1px solid #30363d',
        color: '#c9d1d9',
        'border-radius': '4px',
        cursor: 'pointer',
    };

    return element('Stack', {
        props: {
            class: 'markdown-pane markdown-editor-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                background: '#0d1117',
                color: '#e6edf3',
            },
        },
        children: [
            // Header bar
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: { class: 'markdown-editor-title', style: { margin: '0', 'font-size': '16px' } },
                        children: [text('Markdown Editor')],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '6px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-load-sample',
                                    style: { ...toolbarBtnStyle, color: '#58a6ff' },
                                },
                                intents: { activate: { action: command('markdown.loadSample') } },
                                children: [text('Sample')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-clear-markdown',
                                    style: { ...toolbarBtnStyle, color: '#f85149' },
                                },
                                intents: { activate: { action: command('markdown.clear') } },
                                children: [text('Clear')],
                            }),
                        ],
                    }),
                ],
            }),

            // Syntax helper toolbar (Buttons for inserting markdown syntax without raw textarea)
            element('Row', {
                props: {
                    class: 'markdown-toolbar',
                    style: {
                        display: 'flex',
                        gap: '6px',
                        'flex-wrap': 'wrap',
                        padding: '6px',
                        background: '#161b22',
                        border: '1px solid #30363d',
                        'border-radius': '6px',
                    },
                },
                children: [
                    element('Button', {
                        props: { class: 'btn-syntax-h1', style: toolbarBtnStyle },
                        intents: { activate: { action: command('markdown.insertSyntax', '# Heading 1') } },
                        children: [text('# H1')],
                    }),
                    element('Button', {
                        props: { class: 'btn-syntax-h2', style: toolbarBtnStyle },
                        intents: { activate: { action: command('markdown.insertSyntax', '## Heading 2') } },
                        children: [text('## H2')],
                    }),
                    element('Button', {
                        props: { class: 'btn-syntax-bold', style: toolbarBtnStyle },
                        intents: { activate: { action: command('markdown.insertSyntax', '**Bold Text**') } },
                        children: [text('**B**')],
                    }),
                    element('Button', {
                        props: { class: 'btn-syntax-italic', style: toolbarBtnStyle },
                        intents: { activate: { action: command('markdown.insertSyntax', '*Italic Text*') } },
                        children: [text('*I*')],
                    }),
                    element('Button', {
                        props: { class: 'btn-syntax-list', style: toolbarBtnStyle },
                        intents: { activate: { action: command('markdown.insertSyntax', '- List item') } },
                        children: [text('• List')],
                    }),
                    element('Button', {
                        props: { class: 'btn-syntax-quote', style: toolbarBtnStyle },
                        intents: { activate: { action: command('markdown.insertSyntax', '> Quote line') } },
                        children: [text('❝ Quote')],
                    }),
                    element('Button', {
                        props: { class: 'btn-syntax-code', style: toolbarBtnStyle },
                        intents: { activate: { action: command('markdown.insertSyntax', '```typescript\nconst x = 1;\n```') } },
                        children: [text('<Code/>')],
                    }),
                    element('Button', {
                        props: { class: 'btn-syntax-hr', style: toolbarBtnStyle },
                        intents: { activate: { action: command('markdown.insertSyntax', '---') } },
                        children: [text('— Divider')],
                    }),
                ],
            }),

            // Text entry input inside Form (Commit on enter / change on input)
            // Uses revision counter each to satisfy controlled Input workaround (A7.0)
            element('Form', {
                props: { class: 'markdown-input-form' },
                intents: { commit: { action: command('markdown.submitLineDraft'), preventDefault: true } },
                children: [
                    element('Stack', {
                        props: { gap: 6, style: { display: 'flex', 'flex-direction': 'column', gap: '6px' } },
                        children: [
                            element('Text', {
                                props: { style: { 'font-size': '12px', color: '#8b949e' } },
                                children: [text('Type a line or block of markdown and press Enter to append:')],
                            }),
                            element('Row', {
                                props: { style: { display: 'flex', gap: '8px' } },
                                children: [
                                    each(
                                        () => [vx.app.textRevision()],
                                        (rev) => rev,
                                        () => element('Input', {
                                            props: {
                                                placeholder: 'e.g. ## Architecture or - Important task...',
                                                class: 'markdown-line-input',
                                                style: {
                                                    flex: '1',
                                                    padding: '8px 10px',
                                                    'font-size': '13px',
                                                    background: '#161b22',
                                                    border: '1px solid #30363d',
                                                    color: '#e6edf3',
                                                    'border-radius': '6px',
                                                },
                                            },
                                            intents: {
                                                change: { action: command('markdown.setDraft') },
                                            },
                                        }),
                                    ),
                                    element('Button', {
                                        props: {
                                            class: 'btn-append-line',
                                            style: {
                                                padding: '8px 14px',
                                                'font-size': '13px',
                                                'font-weight': '600',
                                                background: '#238636',
                                                border: '1px solid #2ea043',
                                                color: '#ffffff',
                                                'border-radius': '6px',
                                                cursor: 'pointer',
                                            },
                                        },
                                        intents: { activate: { action: command('markdown.submitLineDraft') } },
                                        children: [text('+ Append')],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            }),

            // Raw document viewer / editor card (Shows current document text)
            element('Card', {
                props: {
                    class: 'markdown-raw-card',
                    style: {
                        flex: '1',
                        padding: '12px',
                        background: '#161b22',
                        border: '1px solid #30363d',
                        'border-radius': '6px',
                        'font-family': 'monospace',
                        'font-size': '12px',
                        'white-space': 'pre-wrap',
                        'overflow-y': 'auto',
                        color: '#c9d1d9',
                    },
                },
                children: [
                    when(
                        () => vx.app.markdownText().trim().length > 0,
                        () => element('Text', {
                            props: { class: 'raw-markdown-content' },
                            children: [text(() => vx.app.markdownText())],
                        }),
                        () => element('Text', {
                            props: { style: { color: '#8b949e', 'font-style': 'italic' } },
                            children: [text('Document is currently empty. Use the input or toolbar to add content.')],
                        }),
                    ),
                ],
            }),
        ],
    });
}

function renderPreviewPane(vx: ViewContext<Record<string, never>, MarkdownApi>): Node {
    return element('Stack', {
        props: {
            class: 'markdown-pane markdown-preview-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                background: '#0d1117',
                color: '#e6edf3',
            },
        },
        children: [
            // Preview Header with document stats
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: { class: 'markdown-preview-title', style: { margin: '0', 'font-size': '16px' } },
                        children: [text('Rendered Preview')],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '6px' } },
                        children: [
                            element('Badge', {
                                props: { class: 'badge stat-words-badge', style: { 'font-size': '11px' } },
                                children: [text(() => `${String(vx.app.wordCount())} words`)],
                            }),
                            element('Badge', {
                                props: { class: 'badge stat-chars-badge', style: { 'font-size': '11px' } },
                                children: [text(() => `${String(vx.app.charCount())} chars`)],
                            }),
                            element('Badge', {
                                props: { class: 'badge stat-lines-badge', style: { 'font-size': '11px' } },
                                children: [text(() => `${String(vx.app.lineCount())} lines`)],
                            }),
                        ],
                    }),
                ],
            }),

            // Rendered Content Card (Abusing Stack with overflow-y to simulate scroll container)
            element('Card', {
                props: {
                    class: 'markdown-render-card',
                    style: {
                        flex: '1',
                        padding: '16px',
                        background: '#161b22',
                        border: '1px solid #30363d',
                        'border-radius': '6px',
                        'overflow-y': 'auto',
                    },
                },
                children: [
                    when(
                        () => vx.app.parsedBlocks().length > 0,
                        () => element('Stack', {
                            props: {
                                class: 'markdown-rendered-blocks',
                                gap: 10,
                                style: { display: 'flex', 'flex-direction': 'column', gap: '10px' },
                            },
                            children: [
                                each(
                                    () => vx.app.parsedBlocks(),
                                    (block: MarkdownBlock, index: number) => `${String(index)}-${block.kind}-${block.rawText}`,
                                    (block: () => MarkdownBlock) => renderMarkdownBlock(block()),
                                ),
                            ],
                        }),
                        () => element('Card', {
                            props: {
                                class: 'empty-preview-card',
                                style: {
                                    padding: '24px',
                                    'text-align': 'center',
                                    color: '#8b949e',
                                    'font-style': 'italic',
                                },
                            },
                            children: [text('Nothing to preview yet. Type markdown on the left to see it rendered.')],
                        }),
                    ),
                ],
            }),
        ],
    });
}

function renderMarkdownBlock(block: MarkdownBlock): Node {
    switch (block.kind) {
        case 'heading': {
            const level = block.level ?? 1;
            const size = level === 1 ? '22px' : level === 2 ? '18px' : '15px';
            const color = level === 1 ? '#58a6ff' : level === 2 ? '#79c0ff' : '#a5d6ff';
            return element('Heading', {
                props: {
                    class: `markdown-h${String(level)}`,
                    style: {
                        margin: '8px 0 4px 0',
                        'font-size': size,
                        color,
                        'border-bottom': level === 1 ? '1px solid #30363d' : 'none',
                        'padding-bottom': level === 1 ? '6px' : '0',
                    },
                },
                children: [text(block.rawText)],
            });
        }

        case 'paragraph': {
            const spans = block.spans ?? [{ type: 'text', content: block.rawText }];
            return element('Row', {
                props: {
                    class: 'markdown-paragraph',
                    style: {
                        display: 'block',
                        margin: '4px 0',
                        'line-height': '1.6',
                        'font-size': '14px',
                        color: '#e6edf3',
                    },
                },
                children: spans.map((span) => renderSpan(span)),
            });
        }

        case 'list': {
            const items = block.items ?? [];
            return element('List', {
                props: {
                    class: 'markdown-list',
                    style: {
                        margin: '4px 0',
                        padding: '0 0 0 20px',
                        'list-style-type': 'disc',
                    },
                },
                children: items.map((item, i) =>
                    element('ListItem', {
                        props: {
                            class: 'markdown-list-item',
                            key: `li-${String(i)}`,
                            style: { margin: '2px 0', 'font-size': '14px', color: '#e6edf3' },
                        },
                        children: [text(item)],
                    }),
                ),
            });
        }

        case 'quote': {
            return element('Card', {
                props: {
                    class: 'markdown-blockquote',
                    style: {
                        padding: '8px 12px',
                        margin: '6px 0',
                        background: '#0d1117',
                        'border-left': '4px solid #58a6ff',
                        'border-radius': '0 4px 4px 0',
                        color: '#8b949e',
                        'font-style': 'italic',
                        'font-size': '14px',
                    },
                },
                children: [element('Text', { children: [text(block.rawText)] })],
            });
        }

        case 'code': {
            return element('Card', {
                props: {
                    class: 'markdown-code-block',
                    style: {
                        padding: '12px',
                        margin: '8px 0',
                        background: '#0d1117',
                        border: '1px solid #30363d',
                        'border-radius': '6px',
                        'font-family': 'monospace',
                        'font-size': '13px',
                        color: '#7ee787',
                        'white-space': 'pre-wrap',
                        display: 'block',
                    },
                },
                children: [
                    element('Row', {
                        props: {
                            style: {
                                display: 'flex',
                                'justify-content': 'space-between',
                                'margin-bottom': '6px',
                                opacity: '0.6',
                                'font-size': '11px',
                            },
                        },
                        children: [
                            element('Text', { children: [text(block.codeLanguage ?? 'code')] }),
                        ],
                    }),
                    element('Text', {
                        props: { class: 'code-block-content' },
                        children: [text(block.rawText)],
                    }),
                ],
            });
        }

        case 'hr': {
            return element('Row', {
                props: {
                    class: 'markdown-hr',
                    style: {
                        margin: '12px 0',
                        'border-bottom': '1px solid #30363d',
                        height: '1px',
                    },
                },
            });
        }
    }
}

function renderSpan(span: MarkdownSpan): Node {
    switch (span.type) {
        case 'bold':
            return element('Text', {
                props: { class: 'span-bold', style: { 'font-weight': 'bold', color: '#ffffff' } },
                children: [text(span.content)],
            });
        case 'italic':
            return element('Text', {
                props: { class: 'span-italic', style: { 'font-style': 'italic', color: '#d2a8ff' } },
                children: [text(span.content)],
            });
        case 'code':
            return element('Badge', {
                props: {
                    class: 'span-code badge',
                    style: {
                        padding: '1px 5px',
                        background: '#0d1117',
                        border: '1px solid #30363d',
                        'border-radius': '4px',
                        'font-family': 'monospace',
                        'font-size': '12px',
                        color: '#7ee787',
                    },
                },
                children: [text(span.content)],
            });
        case 'link':
            return element('Text', {
                props: {
                    class: 'span-link',
                    style: { color: '#58a6ff', 'text-decoration': 'underline' },
                },
                children: [text(span.content)],
            });
        case 'text':
        default:
            return element('Text', { children: [text(span.content)] });
    }
}

// ---------------------------------------------------------------------------- application

export default class MarkdownApp implements Application<typeof NEEDS, readonly [], typeof MARKDOWN> {
    readonly needs = NEEDS;
    readonly provides = MARKDOWN;

    readonly commands: readonly CommandDecl[] = [
        { id: 'markdown.setDraft', title: 'Markdown: Update Draft Input' },
        { id: 'markdown.submitLineDraft', title: 'Markdown: Append Line Draft' },
        { id: 'markdown.insertSyntax', title: 'Markdown: Insert Syntax Template' },
        { id: 'markdown.loadSample', title: 'Markdown: Load Sample Document' },
        { id: 'markdown.clear', title: 'Markdown: Clear Document' },
        { id: 'markdown.openEditor', title: 'Markdown: Open Editor Window' },
        { id: 'markdown.openPreview', title: 'Markdown: Open Preview Window' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'markdown.loadSample', keys: 'ctrl+l' },
        { command: 'markdown.clear', keys: 'ctrl+k' },
    ];

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'editor' }, size: 1 },
            { node: { tile: 'preview' }, size: 1 },
        ],
    });

    readonly views: readonly ViewDecl<Record<string, never>, MarkdownApi>[] = [
        {
            id: 'editor',
            title: 'Markdown Editor',
            tile: 'editor',
            instances: 'one',
            defaultSize: { width: 440, height: 520 },
            minSize: { width: 320, height: 300 },
            render(vx: ViewContext<Record<string, never>, MarkdownApi>): Node {
                return renderEditorPane(vx);
            },
        },
        {
            id: 'preview',
            title: 'Markdown Preview',
            tile: 'preview',
            instances: 'one',
            defaultSize: { width: 440, height: 520 },
            minSize: { width: 320, height: 300 },
            render(vx: ViewContext<Record<string, never>, MarkdownApi>): Node {
                return renderPreviewPane(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<MarkdownApi> {
        cx.log.info('MarkdownApp starting');

        const markdownText = cx.state.signal<string>(SAMPLE_MARKDOWN);
        const textRevision = cx.state.signal<number>(0);
        const lineDraft = cx.state.signal<string>('');

        const parsedBlocks = cx.state.computed(() => parseMarkdownDocument(markdownText()));

        const charCount = cx.state.computed(() => markdownText().length);
        const lineCount = cx.state.computed(() => (markdownText().length === 0 ? 0 : markdownText().split('\n').length));
        const wordCount = cx.state.computed(() => {
            const trimmed = markdownText().trim();
            if (trimmed.length === 0) return 0;
            return trimmed.split(/\s+/).length;
        });

        const setText = (content: string): void => {
            markdownText.set(content);
        };

        const appendLine = (line: string): void => {
            const current = markdownText();
            if (current.length === 0) {
                markdownText.set(line);
            } else {
                markdownText.set(current + '\n' + line);
            }
        };

        const insertSyntax = (template: string): void => {
            appendLine(template);
        };

        const loadSample = (): void => {
            markdownText.set(SAMPLE_MARKDOWN);
            lineDraft.set('');
            textRevision.set(textRevision() + 1);
        };

        const clear = (): void => {
            markdownText.set('');
            lineDraft.set('');
            textRevision.set(textRevision() + 1);
        };

        const setLineDraft = (line: string): void => {
            lineDraft.set(line);
        };

        const submitLineDraft = (): void => {
            const draft = lineDraft().trim();
            if (draft.length > 0) {
                appendLine(draft);
                lineDraft.set('');
                textRevision.set(textRevision() + 1);
            }
        };

        // Commands
        cx.commands.implement('markdown.setDraft', (val?: Json) => {
            setLineDraft(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('markdown.submitLineDraft', () => {
            submitLineDraft();
        });
        cx.commands.implement('markdown.insertSyntax', (val?: Json) => {
            if (typeof val === 'string') insertSyntax(val);
        });
        cx.commands.implement('markdown.loadSample', () => {
            loadSample();
        });
        cx.commands.implement('markdown.clear', () => {
            clear();
        });
        cx.commands.implement('markdown.openEditor', () => {
            cx.windows.open({ view: 'editor' });
        });
        cx.commands.implement('markdown.openPreview', () => {
            cx.windows.open({ view: 'preview' });
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'editor' });
                cx.windows.open({ view: 'preview' });
            }
        });

        return {
            markdownText,
            textRevision,
            lineDraft,
            parsedBlocks,
            charCount,
            wordCount,
            lineCount,
            setText,
            appendLine,
            insertSyntax,
            loadSample,
            clear,
            setLineDraft,
            submitLineDraft,
        };
    }
}
