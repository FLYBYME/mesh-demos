import {
    command,
    each,
    element,
    text,
    when,
    type Json,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { WorkbenchApi } from '../contract.js';

export function renderExplorerView(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
    const app = vx.app;

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-explorer-pane',
            gap: 10,
            style: {
                padding: '12px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#fbfcfe',
                color: '#1f2328',
                'font-family': 'system-ui, -apple-system, sans-serif',
                'font-size': '13px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'explorer-header-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': '1px solid #d0d7de',
                    },
                },
                children: [
                    element('Heading', {
                        props: {
                            class: 'explorer-heading',
                            style: { margin: '0', 'font-size': '14px', 'font-weight': '600' },
                        },
                        children: [text('Explorer')],
                    }),
                    element('Badge', {
                        props: {
                            class: 'badge explorer-file-count',
                            style: {
                                'background-color': '#eaeef2',
                                color: '#24292f',
                                padding: '2px 6px',
                                'border-radius': '10px',
                                'font-size': '11px',
                                'font-weight': '600',
                            },
                        },
                        children: [text(() => `${String(app.documents().length)} files`)],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'explorer-mode-bar',
                    style: {
                        display: 'flex',
                        gap: '6px',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-toggle-mode',
                            style: {
                                flex: '1',
                                padding: '5px 8px',
                                'font-size': '11px',
                                'font-weight': '600',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#f3f4f6',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.toggleMode') } },
                        children: [
                            text(() => `Layout: ${app.getMode() === 'tiled' ? 'Tiled (split)' : 'Windowed (cascade)'}`),
                        ],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-open-inspector',
                            style: {
                                padding: '5px 8px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#f3f4f6',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.openInspector') } },
                        children: [text('Inspector')],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'explorer-actions-bar',
                    style: { display: 'flex', gap: '6px' },
                },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-new-file',
                            style: {
                                flex: '1',
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #0969da',
                                background: '#0969da',
                                color: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.newSampleFile') } },
                        children: [text('+ File')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-new-terminal',
                            style: {
                                flex: '1',
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #2da44e',
                                background: '#2da44e',
                                color: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.openTerminal') } },
                        children: [text('+ Terminal')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-open-monitor',
                            style: {
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#f6f8fa',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.openMonitor') } },
                        children: [text('Monitor')],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'explorer-search-bar',
                    style: { display: 'flex', 'align-items': 'center' },
                },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-filter-files',
                            placeholder: 'Filter files...',
                            value: () => app.searchFilter(),
                            style: {
                                width: '100%',
                                padding: '4px 8px',
                                'box-sizing': 'border-box',
                                border: '1px solid #d0d7de',
                                'border-radius': '4px',
                                'font-size': '12px',
                            },
                        },
                        intents: {
                            change: { action: command('workbench.setFilter') },
                        },
                    }),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'explorer-file-list',
                    gap: 4,
                    style: {
                        flex: '1',
                        overflow: 'auto',
                        padding: '4px 0',
                    },
                },
                children: [
                    each(
                        () => {
                            const q = app.searchFilter().trim().toLowerCase();
                            const docs = app.documents();
                            if (q.length === 0) return docs;
                            return docs.filter((d) => d.title.toLowerCase().includes(q) || d.path.toLowerCase().includes(q));
                        },
                        (doc) => doc.id,
                        (doc) => element('Card', {
                            props: {
                                class: 'file-item-card',
                                style: {
                                    padding: '6px 8px',
                                    border: '1px solid #e1e4e8',
                                    'border-radius': '4px',
                                    background: '#ffffff',
                                    display: 'flex',
                                    'justify-content': 'space-between',
                                    'align-items': 'center',
                                    cursor: 'pointer',
                                },
                            },
                            children: [
                                element('Stack', {
                                    props: { gap: 2, style: { flex: '1', overflow: 'hidden' } },
                                    children: [
                                        element('Row', {
                                            props: { style: { display: 'flex', gap: '6px', 'align-items': 'center' } },
                                            children: [
                                                element('Text', {
                                                    props: {
                                                        class: 'file-item-name',
                                                        style: { 'font-weight': '600', color: '#0969da' },
                                                    },
                                                    children: [text(() => doc().title)],
                                                }),
                                                when(
                                                    () => doc().isDirty,
                                                    () => element('Badge', {
                                                        props: {
                                                            class: 'badge dirty-badge',
                                                            style: {
                                                                color: '#b08800',
                                                                'font-size': '10px',
                                                                'font-weight': 'bold',
                                                            },
                                                        },
                                                        children: [text('● edited')],
                                                    }),
                                                ),
                                            ],
                                        }),
                                        element('Text', {
                                            props: {
                                                class: 'file-item-path',
                                                style: { 'font-size': '11px', color: '#57606a' },
                                            },
                                            children: [text(() => doc().path)],
                                        }),
                                    ],
                                }),
                                element('Button', {
                                    props: {
                                        class: 'btn-open-file',
                                        style: {
                                            padding: '3px 8px',
                                            'font-size': '11px',
                                            border: '1px solid #d0d7de',
                                            'border-radius': '4px',
                                            background: '#f6f8fa',
                                            cursor: 'pointer',
                                        },
                                    },
                                    intents: { activate: { action: command('workbench.openFile', doc().id) } },
                                    children: [text('Edit')],
                                }),
                            ],
                        }),
                    ),
                ],
            }),
            element('Row', {
                props: {
                    class: 'explorer-footer-row',
                    style: {
                        'padding-top': '6px',
                        'border-top': '1px solid #d0d7de',
                        display: 'flex',
                        'justify-content': 'space-between',
                        'font-size': '11px',
                        color: '#57606a',
                    },
                },
                children: [
                    element('Text', {
                        props: { class: 'explorer-status-text' },
                        children: [text('Explorer [tile: sidebar]')],
                    }),
                    element('Text', {
                        props: { class: 'explorer-windows-stat' },
                        children: [text(() => `${String(app.windows().length)} windows`)],
                    }),
                ],
            }),
        ],
    });
}
