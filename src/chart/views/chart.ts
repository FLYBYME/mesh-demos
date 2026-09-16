/**
 * Chart Visualizer view: interactive bar chart with vertical and horizontal projections.
 */

import {
    each,
    element,
    text,
    when,
    type Node,
} from '@flybyme/mesh-web';
import type { ChartDataPoint, ChartView } from '../contract.js';

function renderVerticalChart(vx: ChartView): Node {
    const app = vx.internal;
    const series = app.activeSeries();
    const max = app.maxValue() || 1;

    return element('Stack', {
        props: {
            class: 'chart-bars-vertical-container',
        },
        children: [
            each(
                () => app.activeSeries().points,
                (p: ChartDataPoint) => p.id,
                (point: () => ChartDataPoint) => {
                    const p = point();
                    const heightPercent = Math.max(4, Math.round((p.value / max) * 180));
                    return element('Stack', {
                        props: {
                            class: 'chart-bar-column',
                            'data-id': p.id,
                        },
                        children: [
                            element('Text', {
                                props: { class: 'bar-value-badge' },
                                children: [text(String(p.value))],
                            }),
                            element('Stack', {
                                props: {
                                    class: 'chart-bar bar-vertical',
                                    style: {
                                        height: `${String(heightPercent)}px`,
                                        backgroundColor: series.color,
                                    },
                                },
                            }),
                            element('Text', {
                                props: { class: 'bar-label' },
                                children: [text(p.label)],
                            }),
                        ],
                    });
                },
            ),
        ],
    });
}

function renderHorizontalChart(vx: ChartView): Node {
    const app = vx.internal;
    const series = app.activeSeries();
    const max = app.maxValue() || 1;

    return element('Stack', {
        props: {
            class: 'chart-bars-horizontal-container',
        },
        children: [
            each(
                () => app.activeSeries().points,
                (p: ChartDataPoint) => p.id,
                (point: () => ChartDataPoint) => {
                    const p = point();
                    const widthPercent = Math.max(4, Math.round((p.value / max) * 260));
                    return element('Row', {
                        props: {
                            class: 'chart-bar-row',
                            'data-id': p.id,
                        },
                        children: [
                            element('Text', {
                                props: {
                                    class: 'bar-label',
                                    style: { width: '40px', textAlign: 'right' },
                                },
                                children: [text(p.label)],
                            }),
                            element('Stack', {
                                props: {
                                    class: 'chart-bar bar-horizontal',
                                    style: {
                                        width: `${String(widthPercent)}px`,
                                        backgroundColor: series.color,
                                    },
                                },
                            }),
                            element('Text', {
                                props: { class: 'bar-value-badge' },
                                children: [text(String(p.value))],
                            }),
                        ],
                    });
                },
            ),
        ],
    });
}

export function renderChartView(vx: ChartView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'chart-pane' },
        children: [
            // Header
            element('Row', {
                props: { class: 'chart-header' },
                children: [
                    element('Text', {
                        props: { class: 'chart-title' },
                        children: [text(() => app.activeSeries().title)],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                        children: [
                            element('Button', {
                                props: { class: 'btn-toggle-orientation' },
                                intents: { activate: { action: vx.on(() => app.toggleOrientation()) } },
                                children: [
                                    text(() =>
                                        app.chartOrientation() === 'vertical'
                                            ? 'Switch to Horizontal'
                                            : 'Switch to Vertical',
                                    ),
                                ],
                            }),
                            element('Button', {
                                props: { class: 'btn-open-data' },
                                intents: { activate: { action: vx.on(() => app.openData()) } },
                                children: [text('+ Enter Numbers')],
                            }),
                        ],
                    }),
                ],
            }),

            // Series Selector
            element('Row', {
                props: { class: 'chart-series-selector' },
                children: [
                    element('Text', {
                        props: { style: { fontSize: '12px', color: 'var(--ink-dim)', fontWeight: '600' } },
                        children: [text('Pick Series:')],
                    }),
                    ...app.seriesList().map((s) =>
                        element('Button', {
                            props: {
                                class: `btn-select-series btn-series-${s.id}`,
                                'data-series': s.id,
                                style: () => ({
                                    backgroundColor: app.activeSeriesId() === s.id ? s.color : '#21262d',
                                    border: app.activeSeriesId() === s.id ? `1px solid ${s.color}` : '1px solid #30363d',
                                    color: '#ffffff',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                }),
                            },
                            intents: { activate: { action: vx.on(() => app.selectSeries(s.id)) } },
                            children: [text(s.title)],
                        }),
                    ),
                ],
            }),

            // Stats Row
            element('Row', {
                props: { class: 'chart-stats-row' },
                children: [
                    element('Stack', {
                        props: { class: 'stat-card stat-max' },
                        children: [
                            element('Text', { props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } }, children: [text('Peak / Max:')] }),
                            element('Text', {
                                props: { class: 'stat-val-max' },
                                children: [text(() => `${String(app.maxValue())} ${app.activeSeries().unit}`)],
                            }),
                        ],
                    }),
                    element('Stack', {
                        props: { class: 'stat-card stat-min' },
                        children: [
                            element('Text', { props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } }, children: [text('Floor / Min:')] }),
                            element('Text', {
                                props: { class: 'stat-val-min' },
                                children: [text(() => `${String(app.minValue())} ${app.activeSeries().unit}`)],
                            }),
                        ],
                    }),
                    element('Stack', {
                        props: { class: 'stat-card stat-avg' },
                        children: [
                            element('Text', { props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } }, children: [text('Average:')] }),
                            element('Text', {
                                props: { class: 'stat-val-avg' },
                                children: [text(() => `${String(app.averageValue())} ${app.activeSeries().unit}`)],
                            }),
                        ],
                    }),
                    element('Stack', {
                        props: { class: 'stat-card stat-total' },
                        children: [
                            element('Text', { props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } }, children: [text('Total Sum:')] }),
                            element('Text', {
                                props: { class: 'stat-val-total' },
                                children: [text(() => `${String(app.totalValue())} ${app.activeSeries().unit}`)],
                            }),
                        ],
                    }),
                ],
            }),

            // Chart Canvas Card
            element('Stack', {
                props: { class: 'chart-display-card' },
                children: [
                    when(
                        () => app.activeSeries().points.length > 0,
                        () =>
                            when(
                                () => app.chartOrientation() === 'vertical',
                                () => renderVerticalChart(vx),
                                () => renderHorizontalChart(vx),
                            ),
                        () =>
                            element('Text', {
                                props: { style: { padding: '24px', textAlign: 'center', color: 'var(--ink-dim)' } },
                                children: [text('No data points in this series. Enter numbers in the Data window to plot.')],
                            }),
                    ),
                ],
            }),
        ],
    });
}
