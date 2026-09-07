import {
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { MarkdownApi, MarkdownBlock, MarkdownSpan } from '../contract.js';

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

export function renderPreviewPane(vx: ViewContext<Record<string, never>, MarkdownApi>): Node {
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
