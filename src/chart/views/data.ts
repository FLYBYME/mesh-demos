import {
    command,
    each,
    element,
    text,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { ChartApi, ChartDataPoint, ChartInternal } from '../contract.js';

export function renderDataEditorView(vx: ViewContext<Record<string, never>, ChartApi, ChartInternal>): Node {
    return element('Stack', {
        props: {
            class: 'chart-pane chart-data-pane',
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
            element('Heading', {
                props: { class: 'data-editor-title', style: { margin: '0', 'font-size': '16px' } },
                children: [text('Enter Numbers & Data')],
            }),

            // Number entry form
            element('Form', {
                props: { class: 'chart-data-form' },
                intents: { commit: { action: command('chart.submitPoint'), preventDefault: true } },
                children: [
                    element('Stack', {
                        props: { gap: 10, style: { display: 'flex', 'flex-direction': 'column', gap: '10px' } },
                        children: [
                            element('Stack', {
                                props: { gap: 4, style: { display: 'flex', 'flex-direction': 'column', gap: '4px' } },
                                children: [
                                    element('Text', {
                                        props: { style: { 'font-weight': '600', 'font-size': '12px' } },
                                        children: [text('Category / Label:')],
                                    }),
                                    each(
                                        () => [vx.internal.draftRevision()],
                                        (rev) => rev,
                                        () => element('Input', {
                                            props: {
                                                placeholder: 'e.g. Jul, Q3, Sprint 4...',
                                                class: 'input-point-label',
                                                value: () => vx.internal.draftLabel(),
                                                style: {
                                                    padding: '8px',
                                                    'font-size': '13px',
                                                    background: '#161b22',
                                                    border: '1px solid #30363d',
                                                    color: '#e6edf3',
                                                    'border-radius': '6px',
                                                },
                                            },
                                            intents: {
                                                change: { action: command('chart.setDraftLabel') },
                                            },
                                        }),
                                    ),
                                ],
                            }),

                            element('Stack', {
                                props: { gap: 4, style: { display: 'flex', 'flex-direction': 'column', gap: '4px' } },
                                children: [
                                    element('Text', {
                                        props: { style: { 'font-weight': '600', 'font-size': '12px' } },
                                        children: [text('Value (number):')],
                                    }),
                                    each(
                                        () => [vx.internal.draftRevision()],
                                        (rev) => rev,
                                        () => element('Input', {
                                            props: {
                                                type: 'number',
                                                placeholder: 'e.g. 85',
                                                class: 'input-point-value',
                                                value: () => vx.internal.draftValue(),
                                                style: {
                                                    padding: '8px',
                                                    'font-size': '13px',
                                                    background: '#161b22',
                                                    border: '1px solid #30363d',
                                                    color: '#e6edf3',
                                                    'border-radius': '6px',
                                                },
                                            },
                                            intents: {
                                                change: { action: command('chart.setDraftValue') },
                                            },
                                        }),
                                    ),
                                ],
                            }),

                            element('Button', {
                                props: {
                                    class: 'btn-add-point',
                                    style: {
                                        'margin-top': '6px',
                                        padding: '10px',
                                        'font-size': '13px',
                                        'font-weight': '600',
                                        background: '#238636',
                                        border: '1px solid #2ea043',
                                        color: '#ffffff',
                                        'border-radius': '6px',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('chart.submitPoint') } },
                                children: [text('+ Add Data Point')],
                            }),
                        ],
                    }),
                ],
            }),

            // List of existing data points
            element('Stack', {
                props: { gap: 8, style: { display: 'flex', 'flex-direction': 'column', gap: '8px', flex: '1' } },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' } },
                        children: [
                            element('Text', {
                                props: { style: { 'font-size': '13px', 'font-weight': '600' } },
                                children: [text('Current Series Points:')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-reset-defaults',
                                    style: {
                                        padding: '2px 8px',
                                        'font-size': '11px',
                                        background: '#21262d',
                                        border: '1px solid #30363d',
                                        color: '#f85149',
                                        'border-radius': '4px',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('chart.resetDefaults') } },
                                children: [text('Reset Defaults')],
                            }),
                        ],
                    }),

                    element('List', {
                        props: {
                            class: 'chart-data-list',
                            style: {
                                margin: '0',
                                padding: '0',
                                'list-style': 'none',
                                display: 'flex',
                                'flex-direction': 'column',
                                gap: '6px',
                                flex: '1',
                                'overflow-y': 'auto',
                            },
                        },
                        children: [
                            each(
                                () => vx.app.activeSeries().points,
                                (p: ChartDataPoint) => p.id,
                                (point: () => ChartDataPoint) =>
                                    element('ListItem', {
                                        props: {
                                            class: 'data-point-item',
                                            'data-id': () => point().id,
                                            style: {
                                                padding: '8px 10px',
                                                background: '#161b22',
                                                border: '1px solid #30363d',
                                                'border-radius': '6px',
                                                display: 'flex',
                                                'justify-content': 'space-between',
                                                'align-items': 'center',
                                            },
                                        },
                                        children: [
                                            element('Row', {
                                                props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                                                children: [
                                                    element('Text', {
                                                        props: { class: 'point-label-text', style: { 'font-weight': '600' } },
                                                        children: [text(() => point().label)],
                                                    }),
                                                    element('Badge', {
                                                        props: { class: 'point-value-badge badge' },
                                                        children: [text(() => `${String(point().value)} ${vx.app.activeSeries().unit}`)],
                                                    }),
                                                ],
                                            }),
                                            element('Button', {
                                                props: {
                                                    class: 'btn-delete-point',
                                                    'data-id': () => point().id,
                                                    style: {
                                                        padding: '2px 6px',
                                                        'font-size': '11px',
                                                        background: '#21262d',
                                                        border: '1px solid #30363d',
                                                        color: '#f85149',
                                                        'border-radius': '4px',
                                                        cursor: 'pointer',
                                                    },
                                                },
                                                intents: { activate: { action: command('chart.deletePoint', point().id) } },
                                                children: [text('✕')],
                                            }),
                                        ],
                                    }),
                            ),
                        ],
                    }),
                ],
            }),
        ],
    });
}
