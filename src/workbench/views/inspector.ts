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

// ---------------------------------------------------------------------------- views

export function renderInspectorView(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
    const app = vx.app;

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-inspector-pane',
            gap: 10,
            style: {
                padding: '12px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#f6f8fa',
                color: '#1f2328',
                'font-family': 'system-ui, -apple-system, sans-serif',
                'font-size': '12px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'inspector-header-row',
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
                            class: 'inspector-heading',
                            style: { margin: '0', 'font-size': '14px', 'font-weight': '600' },
                        },
                        children: [text('Window Inspector')],
                    }),
                    element('Badge', {
                        props: {
                            class: 'badge inspector-mode-badge',
                            style: {
                                'background-color': '#ddf4ff',
                                color: '#0969da',
                                padding: '2px 6px',
                                'border-radius': '6px',
                                'font-weight': '600',
                            },
                        },
                        children: [text(() => `Mode: ${app.getMode()}`)],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'inspector-controls-bar',
                    style: { display: 'flex', gap: '6px' },
                },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-cycle-next',
                            style: {
                                flex: '1',
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.nextWindow') } },
                        children: [text('Next (ctrl+] )')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-cycle-prev',
                            style: {
                                flex: '1',
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.prevWindow') } },
                        children: [text('Prev (ctrl+[ )')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-cascade-all',
                            style: {
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.cascadeWindows') } },
                        children: [text('Cascade')],
                    }),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'inspector-summary-card',
                    gap: 4,
                    style: {
                        padding: '8px',
                        border: '1px solid #d0d7de',
                        'border-radius': '4px',
                        background: '#ffffff',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { props: { style: { color: '#57606a' } }, children: [text('Focused:')] }),
                            element('Text', {
                                props: { class: 'inspector-focused-id', style: { 'font-weight': '600' } },
                                children: [text(() => app.focusedWindowId() ?? 'none')],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { props: { style: { color: '#57606a' } }, children: [text('Total Windows:')] }),
                            element('Text', {
                                props: { class: 'inspector-total-count', style: { 'font-weight': '600' } },
                                children: [text(() => String(app.windows().length))],
                            }),
                        ],
                    }),
                ],
            }),
            element('Heading', {
                props: {
                    style: { margin: '4px 0 0 0', 'font-size': '12px', color: '#57606a', 'font-weight': '600' },
                },
                children: [text('Live Window Records (Back to Front):')],
            }),
            element('Stack', {
                props: {
                    class: 'inspector-window-list',
                    gap: 4,
                    style: { flex: '1', overflow: 'auto' },
                },
                children: [
                    each(
                        () => app.windows(),
                        (w) => w.id,
                        (w) => element('Card', {
                            props: {
                                class: () => `inspector-window-card inspector-window-${w().id}`,
                                style: {
                                    padding: '6px',
                                    border: '1px solid #d0d7de',
                                    'border-radius': '4px',
                                    background: '#ffffff',
                                    display: 'flex',
                                    'flex-direction': 'column',
                                    gap: '4px',
                                },
                            },
                            children: [
                                element('Row', {
                                    props: { style: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' } },
                                    children: [
                                        element('Row', {
                                            props: { style: { display: 'flex', gap: '6px', 'align-items': 'center' } },
                                            children: [
                                                element('Badge', {
                                                    props: {
                                                        style: {
                                                            background: '#afb8c1',
                                                            color: '#24292f',
                                                            padding: '1px 4px',
                                                            'border-radius': '3px',
                                                            'font-size': '10px',
                                                            'font-weight': 'bold',
                                                        },
                                                    },
                                                    children: [text(() => w().id)],
                                                }),
                                                element('Text', {
                                                    props: { style: { 'font-weight': '600' } },
                                                    children: [text(() => w().title)],
                                                }),
                                            ],
                                        }),
                                        element('Badge', {
                                            props: {
                                                style: () => ({
                                                    background: w().tile ? '#ddf4ff' : '#ffebe9',
                                                    color: w().tile ? '#0969da' : '#cf222e',
                                                    padding: '1px 4px',
                                                    'border-radius': '3px',
                                                    'font-size': '10px',
                                                }),
                                            },
                                            children: [text(() => (w().tile ? `tile: ${w().tile ?? ''}` : 'floating only'))],
                                        }),
                                    ],
                                }),
                                element('Row', {
                                    props: {
                                        style: {
                                            display: 'flex',
                                            'justify-content': 'space-between',
                                            'font-size': '11px',
                                            color: '#57606a',
                                        },
                                    },
                                    children: [
                                        element('Text', {
                                            children: [text(() => `pos: (${String(Math.round(w().x))}, ${String(Math.round(w().y))}) size: ${String(Math.round(w().width))}x${String(Math.round(w().height))}`)],
                                        }),
                                        element('Text', {
                                            children: [text(() => `pid: ${w().owner}`)],
                                        }),
                                    ],
                                }),
                                element('Row', {
                                    props: { style: { display: 'flex', gap: '4px', 'padding-top': '2px' } },
                                    children: [
                                        element('Button', {
                                            props: {
                                                class: 'btn-inspect-focus',
                                                style: {
                                                    flex: '1',
                                                    padding: '2px 4px',
                                                    'font-size': '10px',
                                                    border: '1px solid #d0d7de',
                                                    background: '#f6f8fa',
                                                    cursor: 'pointer',
                                                },
                                            },
                                            intents: { activate: { action: command('workbench.focusWindow', w().id) } },
                                            children: [text('Focus')],
                                        }),
                                        element('Button', {
                                            props: {
                                                class: 'btn-inspect-max',
                                                style: {
                                                    flex: '1',
                                                    padding: '2px 4px',
                                                    'font-size': '10px',
                                                    border: '1px solid #d0d7de',
                                                    background: '#f6f8fa',
                                                    cursor: 'pointer',
                                                },
                                            },
                                            intents: { activate: { action: command('workbench.maximizeWindow', w().id) } },
                                            children: [text('Max')],
                                        }),
                                        element('Button', {
                                            props: {
                                                class: 'btn-inspect-min',
                                                style: {
                                                    flex: '1',
                                                    padding: '2px 4px',
                                                    'font-size': '10px',
                                                    border: '1px solid #d0d7de',
                                                    background: '#f6f8fa',
                                                    cursor: 'pointer',
                                                },
                                            },
                                            intents: { activate: { action: command('workbench.minimizeWindow', w().id) } },
                                            children: [text('Min')],
                                        }),
                                        when(
                                            () => w().closable,
                                            () => element('Button', {
                                                props: {
                                                    class: 'btn-inspect-close',
                                                    style: {
                                                        flex: '1',
                                                        padding: '2px 4px',
                                                        'font-size': '10px',
                                                        border: '1px solid #cf222e',
                                                        background: '#ffebe9',
                                                        color: '#cf222e',
                                                        cursor: 'pointer',
                                                    },
                                                },
                                                intents: { activate: { action: command('workbench.closeWindow', w().id) } },
                                                children: [text('Close')],
                                            }),
                                        ),
                                    ],
                                }),
                            ],
                        }),
                    ),
                ],
            }),
        ],
    });
}
