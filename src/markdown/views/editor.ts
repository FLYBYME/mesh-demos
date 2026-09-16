/**
 * Markdown Editor view: Syntax insertion toolbar and text editing area.
 */

import { element, text, type Node } from '@flybyme/mesh-web';
import type { MarkdownView } from '../contract.js';

export function renderEditorView(vx: MarkdownView): Node {
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
                                props: { class: 'markdown-nav-btn active' },
                                children: [text('Editor')],
                            }),
                            element('Button', {
                                props: { class: 'markdown-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openPreview()) } },
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
                                children: [text(() => `${String(app.lineCount())} lines`)],
                            }),
                        ],
                    }),
                ],
            }),

            // Toolbar
            element('Row', {
                props: { class: 'markdown-toolbar' },
                children: [
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.insertSyntax('# ')) } },
                        children: [text('H1')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.insertSyntax('## ')) } },
                        children: [text('H2')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.insertSyntax('**bold**')) } },
                        children: [text('Bold')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.insertSyntax('*italic*')) } },
                        children: [text('Italic')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.insertSyntax('`code`')) } },
                        children: [text('Code')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.insertSyntax('> quote\n')) } },
                        children: [text('Quote')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.insertSyntax('- item\n')) } },
                        children: [text('List')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.insertSyntax('[link](https://example.com)')) } },
                        children: [text('Link')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.insertSyntax('---\n')) } },
                        children: [text('HR')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn' },
                        intents: { activate: { action: vx.on(() => app.loadSample()) } },
                        children: [text('Sample')],
                    }),
                    element('Button', {
                        props: { class: 'markdown-toolbar-btn markdown-btn-clear' },
                        intents: { activate: { action: vx.on(() => app.clear()) } },
                        children: [text('Clear')],
                    }),
                ],
            }),

            // Text Input
            element('Input', {
                props: {
                    class: 'markdown-editor-input',
                    placeholder: 'Type markdown content here...',
                    value: () => app.markdownText(),
                },
                intents: {
                    change: { action: vx.on((v?: unknown) => app.setText(typeof v === 'string' ? v : '')) },
                },
            }),
        ],
    });
}
