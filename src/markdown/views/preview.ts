/**
 * Markdown Preview view: Live rendered presentation of parsed markdown blocks.
 */

import { each, element, text, when, type Node } from '@flybyme/mesh-web';
import type { MarkdownBlock, MarkdownSpan, MarkdownView } from '../contract.js';

function renderSpan(span: MarkdownSpan): Node {
    switch (span.type) {
        case 'bold':
            return element('Text', {
                props: { class: 'markdown-span-bold' },
                children: [text(span.content)],
            });
        case 'italic':
            return element('Text', {
                props: { class: 'markdown-span-italic' },
                children: [text(span.content)],
            });
        case 'code':
            return element('Text', {
                props: { class: 'markdown-span-code' },
                children: [text(span.content)],
            });
        case 'link':
            return element('Text', {
                props: { class: 'markdown-span-link' },
                children: [text(span.content)],
            });
        default:
            return element('Text', {
                children: [text(span.content)],
            });
    }
}

function renderBlock(block: MarkdownBlock): Node {
    switch (block.kind) {
        case 'heading': {
            const cls = block.level === 1 ? 'markdown-h1' : block.level === 2 ? 'markdown-h2' : 'markdown-h3';
            return element('Text', {
                props: { class: cls },
                children: [text(block.rawText)],
            });
        }
        case 'paragraph': {
            const spans = block.spans ?? [{ type: 'text', content: block.rawText }];
            return element('Row', {
                props: { class: 'markdown-p', style: { flexWrap: 'wrap', gap: '2px' } },
                children: spans.map(renderSpan),
            });
        }
        case 'list': {
            const items = block.items ?? [];
            return element('Stack', {
                props: { class: 'markdown-list' },
                children: items.map((item) =>
                    element('Row', {
                        props: { class: 'markdown-list-item', style: { gap: '6px' } },
                        children: [
                            element('Text', { children: [text('•')] }),
                            element('Text', { children: [text(item)] }),
                        ],
                    }),
                ),
            });
        }
        case 'quote': {
            return element('Text', {
                props: { class: 'markdown-quote' },
                children: [text(block.rawText)],
            });
        }
        case 'code': {
            return element('Stack', {
                props: { class: 'markdown-code-block' },
                children: [
                    element('Text', {
                        props: { class: 'markdown-code-lang' },
                        children: [text(block.codeLanguage ?? 'code')],
                    }),
                    element('Text', {
                        children: [text(block.rawText)],
                    }),
                ],
            });
        }
        case 'hr': {
            return element('Row', {
                props: { class: 'markdown-hr' },
            });
        }
    }
}

export function renderPreviewView(vx: MarkdownView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'markdown-container' },
        children: [
            // Header
            element('Row', {
                props: { class: 'markdown-header' },
                children: [
                    element('Row', {
                        props: { class: 'markdown-nav' },
                        children: [
                            element('Button', {
                                props: { class: 'markdown-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openEditor()) } },
                                children: [text('Editor')],
                            }),
                            element('Button', {
                                props: { class: 'markdown-nav-btn active' },
                                children: [text('Preview')],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { class: 'markdown-metrics' },
                        children: [
                            element('Text', {
                                props: { class: 'markdown-badge' },
                                children: [text(() => `${String(app.wordCount())} words`)],
                            }),
                            element('Text', {
                                props: { class: 'markdown-badge' },
                                children: [text(() => `${String(app.charCount())} chars`)],
                            }),
                        ],
                    }),
                ],
            }),

            // Rendered Content
            element('Stack', {
                props: { class: 'markdown-preview-pane' },
                children: [
                    when(
                        () => app.parsedBlocks().length === 0,
                        () => element('Text', {
                            props: { class: 'markdown-empty-preview' },
                            children: [text('Nothing to preview yet. Open Editor to write markdown.')],
                        }),
                        () => element('Stack', {
                            props: { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                            children: [
                                each(
                                    () => app.parsedBlocks(),
                                    (b: MarkdownBlock) => b.id,
                                    (b: () => MarkdownBlock) => renderBlock(b()),
                                ),
                            ],
                        }),
                    ),
                ],
            }),
        ],
    });
}
