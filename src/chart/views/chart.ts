import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { ChartApi, ChartDataPoint, ChartInternal } from '../contract.js';

function renderVerticalChart(vx: ViewContext<Record<string, never>, ChartApi, ChartInternal>): Node {
    const series = vx.app.activeSeries();
    const max = vx.app.maxValue() || 1;

    return element('Stack', {
        props: {
            class: 'chart-bars-vertical-container',
            gap: 16,
            style: {
                height: '240px',
                display: 'flex',
                'align-items': 'flex-end',
                'justify-content': 'space-around',
                'border-bottom': '2px solid #30363d',
                'border-left': '2px solid #30363d',
                padding: '16px 12px 0 12px',
                position: 'relative',
                background: '#0d1117',
                'border-radius': '4px',
            },
        },
        children: [
            each(
                () => vx.app.activeSeries().points,
                (p: ChartDataPoint) => p.id,
                (point: () => ChartDataPoint) => {
                    const p = point();
                    const heightPercent = Math.max(4, Math.round((p.value / max) * 180));
                    return element('Stack', {
                        props: {
                            class: 'chart-bar-column',
                            'data-id': p.id,
                            gap: 4,
                            style: {
                                display: 'flex',
                                'flex-direction': 'column',
                                'align-items': 'center',
                                'justify-content': 'flex-end',
                                height: '100%',
                                flex: '1',
                                'max-width': '60px',
                            },
                        },
                        children: [
                            element('Badge', {
                                props: {
                                    class: 'bar-value-badge',
                                    style: {
                                        'font-size': '11px',
                                        'font-weight': 'bold',
                                        color: '#e6edf3',
                                        'margin-bottom': '4px',
                                    },
                                },
                                children: [text(String(p.value))],
                            }),
                            element('Stack', {
                                props: {
                                    class: 'chart-bar bar-vertical',
                                    style: {
                                        height: `${String(heightPercent)}px`,
                                        width: '36px',
                                        background: series.color,
                                        'border-radius': '4px 4px 0 0',
                                        transition: 'height 0.2s ease',
                                    },
                                },
                            }),
                            element('Text', {
                                props: {
                                    class: 'bar-label',
                                    style: {
                                        'font-size': '12px',
                                        color: '#8b949e',
                                        'margin-top': '8px',
                                        'white-space': 'nowrap',
                                    },
                                },
                                children: [text(p.label)],
                            }),
                        ],
                    });
                },
            ),
        ],
    });
}

function renderHorizontalChart(vx: ViewContext<Record<string, never>, ChartApi, ChartInternal>): Node {
    const series = vx.app.activeSeries();
    const max = vx.app.maxValue() || 1;

    return element('Stack', {
        props: {
            class: 'chart-bars-horizontal-container',
            gap: 12,
            style: {
                display: 'flex',
                'flex-direction': 'column',
                gap: '12px',
                padding: '12px',
                background: '#0d1117',
                'border-radius': '4px',
            },
        },
        children: [
            each(
                () => vx.app.activeSeries().points,
                (p: ChartDataPoint) => p.id,
                (point: () => ChartDataPoint) => {
                    const p = point();
                    const widthPercent = Math.max(2, Math.round((p.value / max) * 100));
                    return element('Row', {
                        props: {
                            class: 'chart-bar-row',
                            'data-id': p.id,
                            style: {
                                display: 'flex',
                                'align-items': 'center',
                                gap: '10px',
                            },
                        },
                        children: [
                            element('Text', {
                                props: {
                                    class: 'bar-label',
                                    style: {
                                        width: '60px',
                                        'font-size': '12px',
                                        color: '#8b949e',
                                        'text-align': 'right',
                                    },
                                },
                                children: [text(p.label)],
                            }),
                            element('Stack', {
                                props: {
                                    style: {
                                        flex: '1',
                                        background: '#21262d',
                                        'border-radius': '4px',
                                        height: '24px',
                                        display: 'flex',
                                        'align-items': 'center',
                                    },
                                },
                                children: [
                                    element('Stack', {
                                        props: {
                                            class: 'chart-bar bar-horizontal',
                                            style: {
                                                width: `${String(widthPercent)}%`,
                                                height: '24px',
                                                background: series.color,
                                                'border-radius': '4px',
                                                transition: 'width 0.2s ease',
                                            },
                                        },
                                    }),
                                ],
                            }),
                            element('Badge', {
                                props: {
                                    class: 'bar-value-badge',
                                    style: {
                                        width: '45px',
                                        'font-size': '12px',
                                        'font-weight': 'bold',
                                        color: '#e6edf3',
                                    },
                                },
                                children: [text(String(p.value))],
                            }),
                        ],
                    });
                },
            ),
        ],
    });
}

export function renderChartView(vx: ViewContext<Record<string, never>, ChartApi, ChartInternal>): Node {
    return element('Stack', {
        props: {
            class: 'chart-pane chart-visualizer-pane',
            gap: 16,
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
            // Header Bar: Title, Series Selector, Orientation Toggle
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
                        props: { class: 'chart-title', style: { margin: '0', 'font-size': '18px' } },
                        children: [text(() => vx.app.activeSeries().title)],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-toggle-orientation',
                                    style: {
                                        padding: '4px 10px',
                                        'font-size': '12px',
                                        background: '#21262d',
                                        border: '1px solid #30363d',
                                        color: '#c9d1d9',
                                        'border-radius': '6px',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('chart.toggleOrientation') } },
                                children: [
                                    text(() => (vx.app.chartOrientation() === 'vertical' ? '⇄ Horizontal' : '⇅ Vertical')),
                                ],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-open-data',
                                    style: {
                                        padding: '4px 10px',
                                        'font-size': '12px',
                                        background: '#238636',
                                        border: '1px solid #2ea043',
                                        color: '#ffffff',
                                        'border-radius': '6px',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('chart.openData') } },
                                children: [text('+ Enter Numbers')],
                            }),
                        ],
                    }),
                ],
            }),

            // Series Selector Badges/Buttons (Pick a Series)
            element('Row', {
                props: {
                    class: 'chart-series-selector',
                    style: { display: 'flex', gap: '8px', 'align-items': 'center' },
                },
                children: [
                    element('Text', {
                        props: { style: { 'font-size': '12px', color: '#8b949e', 'font-weight': '600' } },
                        children: [text('Pick Series:')],
                    }),
                    ...vx.app.seriesList().map((s) =>
                        element('Button', {
                            props: {
                                class: `btn-select-series btn-series-${s.id}`,
                                'data-series': s.id,
                                style: () => ({
                                    padding: '4px 10px',
                                    'font-size': '12px',
                                    'font-weight': '600',
                                    'border-radius': '6px',
                                    cursor: 'pointer',
                                    background: vx.app.activeSeriesId() === s.id ? s.color : '#21262d',
                                    border: vx.app.activeSeriesId() === s.id ? `1px solid ${s.color}` : '1px solid #30363d',
                                    color: '#ffffff',
                                }),
                            },
                            intents: { activate: { action: command('chart.selectSeries', s.id) } },
                            children: [text(s.title)],
                        }),
                    ),
                ],
            }),

            // Summary Stats Row (Max, Min, Avg, Total)
            element('Row', {
                props: {
                    class: 'chart-stats-row',
                    style: { display: 'flex', gap: '8px' },
                },
                children: [
                    element('Card', {
                        props: {
                            class: 'stat-card stat-max',
                            style: { flex: '1', padding: '8px 12px', background: '#161b22', border: '1px solid #30363d', 'border-radius': '6px' },
                        },
                        children: [
                            element('Text', { props: { style: { 'font-size': '11px', color: '#8b949e' } }, children: [text('Peak / Max:')] }),
                            element('Heading', {
                                props: { class: 'stat-val-max', style: { margin: '2px 0 0 0', 'font-size': '16px', color: '#58a6ff' } },
                                children: [text(() => `${String(vx.app.maxValue())} ${vx.app.activeSeries().unit}`)],
                            }),
                        ],
                    }),
                    element('Card', {
                        props: {
                            class: 'stat-card stat-min',
                            style: { flex: '1', padding: '8px 12px', background: '#161b22', border: '1px solid #30363d', 'border-radius': '6px' },
                        },
                        children: [
                            element('Text', { props: { style: { 'font-size': '11px', color: '#8b949e' } }, children: [text('Floor / Min:')] }),
                            element('Heading', {
                                props: { class: 'stat-val-min', style: { margin: '2px 0 0 0', 'font-size': '16px', color: '#79c0ff' } },
                                children: [text(() => `${String(vx.app.minValue())} ${vx.app.activeSeries().unit}`)],
                            }),
                        ],
                    }),
                    element('Card', {
                        props: {
                            class: 'stat-card stat-avg',
                            style: { flex: '1', padding: '8px 12px', background: '#161b22', border: '1px solid #30363d', 'border-radius': '6px' },
                        },
                        children: [
                            element('Text', { props: { style: { 'font-size': '11px', color: '#8b949e' } }, children: [text('Average:')] }),
                            element('Heading', {
                                props: { class: 'stat-val-avg', style: { margin: '2px 0 0 0', 'font-size': '16px', color: '#d2a8ff' } },
                                children: [text(() => `${String(vx.app.averageValue())} ${vx.app.activeSeries().unit}`)],
                            }),
                        ],
                    }),
                    element('Card', {
                        props: {
                            class: 'stat-card stat-total',
                            style: { flex: '1', padding: '8px 12px', background: '#161b22', border: '1px solid #30363d', 'border-radius': '6px' },
                        },
                        children: [
                            element('Text', { props: { style: { 'font-size': '11px', color: '#8b949e' } }, children: [text('Total Sum:')] }),
                            element('Heading', {
                                props: { class: 'stat-val-total', style: { margin: '2px 0 0 0', 'font-size': '16px', color: '#3fb950' } },
                                children: [text(() => `${String(vx.app.totalValue())} ${vx.app.activeSeries().unit}`)],
                            }),
                        ],
                    }),
                ],
            }),

            // The Chart Canvas Area (Vocabulary audit: abusing Stack & Row because no SVG / Canvas exists)
            element('Card', {
                props: {
                    class: 'chart-display-card',
                    style: {
                        flex: '1',
                        padding: '20px',
                        background: '#161b22',
                        border: '1px solid #30363d',
                        'border-radius': '8px',
                        display: 'flex',
                        'flex-direction': 'column',
                        'justify-content': 'center',
                        'overflow-y': 'auto',
                    },
                },
                children: [
                    when(
                        () => vx.app.activeSeries().points.length > 0,
                        () => when(
                            () => vx.app.chartOrientation() === 'vertical',
                            () => renderVerticalChart(vx),
                            () => renderHorizontalChart(vx),
                        ),
                        () => element('Card', {
                            props: {
                                class: 'empty-chart-card',
                                style: { padding: '24px', 'text-align': 'center', color: '#8b949e' },
                            },
                            children: [text('No data points in this series. Enter numbers in the Data window to plot.')],
                        }),
                    ),
                ],
            }),
        ],
    });
}
