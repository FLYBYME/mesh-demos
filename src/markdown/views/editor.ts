import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { MarkdownApi, MarkdownInternal } from '../contract.js';

export function renderEditorPane(vx: ViewContext<Record<string, never>, MarkdownApi, MarkdownInternal>): Node {
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
                                        () => [vx.internal.textRevision()],
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
