/**
 * Chart Data view: input numbers, add points, delete points, and reset defaults.
 */

import {
    each,
    element,
    text,
    type Node,
} from '@flybyme/mesh-web';
import type { ChartDataPoint, ChartView } from '../contract.js';

export function renderDataEditorView(vx: ChartView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'chart-pane' },
        children: [
            element('Text', {
                props: { class: 'data-editor-title' },
                children: [text('Enter Numbers & Data')],
            }),

            // Data input form
            element('Stack', {
                props: { class: 'data-form-card' },
                children: [
                    element('Stack', {
                        props: { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                        children: [
                            element('Text', {
                                props: { style: { fontSize: '12px', color: 'var(--ink-dim)' } },
                                children: [text('Point Label:')],
                            }),
                            element('Input', {
                                props: {
                                    class: 'input-point-label',
                                    placeholder: 'e.g. Jul, Q3, Team Alpha',
                                    value: () => app.draftLabel(),
                                },
                                intents: {
                                    change: {
                                        action: vx.on((val?: unknown) =>
                                            app.setDraftLabel(typeof val === 'string' ? val : String(val ?? '')),
                                        ),
                                    },
                                },
                            }),
                        ],
                    }),

                    element('Stack', {
                        props: { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                        children: [
                            element('Text', {
                                props: { style: { fontSize: '12px', color: 'var(--ink-dim)' } },
                                children: [text('Numeric Value:')],
                            }),
                            element('Input', {
                                props: {
                                    class: 'input-point-value',
                                    type: 'number',
                                    placeholder: 'e.g. 150',
                                    value: () => app.draftValue(),
                                },
                                intents: {
                                    change: {
                                        action: vx.on((val?: unknown) =>
                                            app.setDraftValue(typeof val === 'string' ? val : String(val ?? '')),
                                        ),
                                    },
                                },
                            }),
                        ],
                    }),

                    element('Button', {
                        props: { class: 'btn-add-point' },
                        intents: { activate: { action: vx.on(() => app.submitDraft()) } },
                        children: [text('+ Add Data Point')],
                    }),
                ],
            }),

            // List of data points
            element('Stack', {
                props: { style: { display: 'flex', flexDirection: 'column', gap: '8px', flex: '1' } },
                children: [
                    element('Row', {
                        props: {
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            },
                        },
                        children: [
                            element('Text', {
                                props: { style: { fontSize: '13px', fontWeight: '600' } },
                                children: [text('Current Series Points:')],
                            }),
                            element('Button', {
                                props: { class: 'btn-reset-defaults' },
                                intents: { activate: { action: vx.on(() => app.resetDefaults()) } },
                                children: [text('Reset Defaults')],
                            }),
                        ],
                    }),

                    element('Stack', {
                        props: { class: 'chart-data-list' },
                        children: [
                            each(
                                () => app.activeSeries().points,
                                (p: ChartDataPoint) => p.id,
                                (point: () => ChartDataPoint) =>
                                    element('Row', {
                                        props: {
                                            class: 'data-point-item',
                                            'data-id': point().id,
                                        },
                                        children: [
                                            element('Row', {
                                                props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                                                children: [
                                                    element('Text', {
                                                        props: { class: 'point-label-text' },
                                                        children: [text(() => point().label)],
                                                    }),
                                                    element('Text', {
                                                        props: { class: 'point-value-badge' },
                                                        children: [text(() => `${String(point().value)} ${app.activeSeries().unit}`)],
                                                    }),
                                                ],
                                            }),
                                            element('Button', {
                                                props: {
                                                    class: 'btn-delete-point',
                                                    'data-id': point().id,
                                                },
                                                intents: { activate: { action: vx.on(() => app.deleteDataPoint(point().id)) } },
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
