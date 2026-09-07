import {
    command,
    element,
    text,
    when,
    type Json,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { WorkbenchApi } from '../contract.js';

export function renderEditorView(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
    const app = vx.app;
    const fileIdParam = typeof vx.params['fileId'] === 'string' ? vx.params['fileId'] : 'main.ts';

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-editor-pane',
            gap: 8,
            style: {
                padding: '12px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#ffffff',
                color: '#1f2328',
                'font-family': 'system-ui, -apple-system, sans-serif',
                'font-size': '13px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'editor-header-bar',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': '1px solid #e1e4e8',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            element('Heading', {
                                props: {
                                    class: 'editor-file-title',
                                    style: { margin: '0', 'font-size': '14px', 'font-weight': '600' },
                                },
                                children: [
                                    text(() => {
                                        const d = app.documents().find((doc) => doc.id === fileIdParam);
                                        return d ? d.title : fileIdParam;
                                    }),
                                ],
                            }),
                            element('Badge', {
                                props: {
                                    class: 'badge editor-lang-badge',
                                    style: {
                                        'background-color': '#ddf4ff',
                                        color: '#0969da',
                                        padding: '2px 6px',
                                        'border-radius': '6px',
                                        'font-size': '11px',
                                        'font-weight': '600',
                                    },
                                },
                                children: [
                                    text(() => {
                                        const d = app.documents().find((doc) => doc.id === fileIdParam);
                                        return d ? d.language : 'Text';
                                    }),
                                ],
                            }),
                            when(
                                () => {
                                    const d = app.documents().find((doc) => doc.id === fileIdParam);
                                    return d ? d.isDirty : false;
                                },
                                () => element('Badge', {
                                    props: {
                                        class: 'badge editor-dirty-indicator',
                                        style: {
                                            'background-color': '#fff8c5',
                                            color: '#9a6700',
                                            padding: '2px 6px',
                                            'border-radius': '6px',
                                            'font-size': '11px',
                                            'font-weight': 'bold',
                                        },
                                    },
                                    children: [text('Unsaved Changes')],
                                }),
                            ),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '6px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-save-document',
                                    style: {
                                        padding: '4px 10px',
                                        'font-size': '12px',
                                        'font-weight': '600',
                                        'border-radius': '4px',
                                        border: '1px solid #1f883d',
                                        background: '#1f883d',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.saveDoc', fileIdParam) } },
                                children: [text('Save (ctrl+s)')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-revert-document',
                                    style: {
                                        padding: '4px 8px',
                                        'font-size': '12px',
                                        'border-radius': '4px',
                                        border: '1px solid #d0d7de',
                                        background: '#f6f8fa',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.revertDoc', fileIdParam) } },
                                children: [text('Revert')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-open-copy',
                                    style: {
                                        padding: '4px 8px',
                                        'font-size': '12px',
                                        'border-radius': '4px',
                                        border: '1px solid #d0d7de',
                                        background: '#f6f8fa',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.openFile', fileIdParam) } },
                                children: [text('New Window')],
                            }),
                        ],
                    }),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'editor-body-area',
                    style: { flex: '1', display: 'flex', 'flex-direction': 'column' },
                },
                children: [
                    element('Input', {
                        props: {
                            class: 'editor-text-input',
                            placeholder: 'Type content...',
                            value: () => {
                                const d = app.documents().find((doc) => doc.id === fileIdParam);
                                return d ? d.content : '';
                            },
                            style: {
                                width: '100%',
                                flex: '1',
                                'min-height': '180px',
                                padding: '8px',
                                'box-sizing': 'border-box',
                                'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
                                'font-size': '12px',
                                'line-height': '1.5',
                                border: '1px solid #d0d7de',
                                'border-radius': '4px',
                                background: '#ffffff',
                                resize: 'none',
                            },
                        },
                        intents: {
                            change: { action: command('workbench.updateDocContent', fileIdParam) },
                        },
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'editor-status-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'font-size': '11px',
                        color: '#57606a',
                        'padding-top': '4px',
                        'border-top': '1px solid #e1e4e8',
                    },
                },
                children: [
                    element('Text', {
                        props: { class: 'editor-stats-text' },
                        children: [
                            text(() => {
                                const d = app.documents().find((doc) => doc.id === fileIdParam);
                                if (!d) return 'No document';
                                return `${String(d.lineCount)} lines, ${String(d.wordCount)} words, ${String(d.content.length)} chars`;
                            }),
                        ],
                    }),
                    element('Text', {
                        props: { class: 'editor-file-badge' },
                        children: [text(`File: ${fileIdParam} [tile: editor]`)],
                    }),
                ],
            }),
        ],
    });
}
