import {
    command,
    each,
    element,
    needs,
    provider,
    text,
    tiles,
    when,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ProviderToken,
    type Signal,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types & contract

export interface ChartDataPoint {
    readonly id: string;
    readonly label: string;
    readonly value: number;
}

export interface ChartSeries {
    readonly id: string;
    readonly title: string;
    readonly unit: string;
    readonly color: string;
    readonly points: readonly ChartDataPoint[];
}

export interface ChartApi {
    readonly seriesList: Signal<readonly ChartSeries[]>;
    readonly activeSeriesId: Signal<string>;
    readonly chartOrientation: Signal<'vertical' | 'horizontal'>;
    readonly draftLabel: Signal<string>;
    readonly draftValue: Signal<string>;
    readonly draftRevision: Signal<number>;

    readonly activeSeries: () => ChartSeries;
    readonly maxValue: () => number;
    readonly minValue: () => number;
    readonly averageValue: () => number;
    readonly totalValue: () => number;

    selectSeries(seriesId: string): void;
    toggleOrientation(): void;
    addDataPoint(label: string, value: number): void;
    deleteDataPoint(pointId: string): void;
    setDraftLabel(label: string): void;
    setDraftValue(val: string): void;
    submitDraft(): void;
    resetDefaults(): void;
}

export const CHART: ProviderToken<ChartApi> = provider<ChartApi>('mesh-chart');

const NEEDS = needs('state', 'commands', 'windows', 'log');

export const DEFAULT_SERIES: readonly ChartSeries[] = [
    {
        id: 'revenue',
        title: 'Monthly Revenue',
        unit: '$k',
        color: '#388bfd',
        points: [
            { id: 'p1', label: 'Jan', value: 45 },
            { id: 'p2', label: 'Feb', value: 75 },
            { id: 'p3', label: 'Mar', value: 60 },
            { id: 'p4', label: 'Apr', value: 95 },
            { id: 'p5', label: 'May', value: 130 },
            { id: 'p6', label: 'Jun', value: 110 },
        ],
    },
    {
        id: 'users',
        title: 'Active Users',
        unit: 'k',
        color: '#2ea043',
        points: [
            { id: 'p1', label: 'Jan', value: 20 },
            { id: 'p2', label: 'Feb', value: 38 },
            { id: 'p3', label: 'Mar', value: 55 },
            { id: 'p4', label: 'Apr', value: 90 },
            { id: 'p5', label: 'May', value: 145 },
            { id: 'p6', label: 'Jun', value: 220 },
        ],
    },
    {
        id: 'defects',
        title: 'Open Defects',
        unit: 'bugs',
        color: '#f85149',
        points: [
            { id: 'p1', label: 'Jan', value: 50 },
            { id: 'p2', label: 'Feb', value: 35 },
            { id: 'p3', label: 'Mar', value: 24 },
            { id: 'p4', label: 'Apr', value: 18 },
            { id: 'p5', label: 'May', value: 10 },
            { id: 'p6', label: 'Jun', value: 4 },
        ],
    },
];

// ---------------------------------------------------------------------------- views

function renderChartView(vx: ViewContext<Record<string, never>, ChartApi>): Node {
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

function renderVerticalChart(vx: ViewContext<Record<string, never>, ChartApi>): Node {
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

function renderHorizontalChart(vx: ViewContext<Record<string, never>, ChartApi>): Node {
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

function renderDataEditorView(vx: ViewContext<Record<string, never>, ChartApi>): Node {
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
                                        () => [vx.app.draftRevision()],
                                        (rev) => rev,
                                        () => element('Input', {
                                            props: {
                                                placeholder: 'e.g. Jul, Q3, Sprint 4...',
                                                class: 'input-point-label',
                                                value: () => vx.app.draftLabel(),
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
                                        () => [vx.app.draftRevision()],
                                        (rev) => rev,
                                        () => element('Input', {
                                            props: {
                                                type: 'number',
                                                placeholder: 'e.g. 85',
                                                class: 'input-point-value',
                                                value: () => vx.app.draftValue(),
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

// ---------------------------------------------------------------------------- application

export default class ChartApp implements Application<typeof NEEDS, readonly [], typeof CHART> {
    readonly needs = NEEDS;
    readonly provides = CHART;

    readonly commands: readonly CommandDecl[] = [
        { id: 'chart.selectSeries', title: 'Chart: Pick Series' },
        { id: 'chart.toggleOrientation', title: 'Chart: Toggle Orientation' },
        { id: 'chart.addPoint', title: 'Chart: Add Data Point' },
        { id: 'chart.deletePoint', title: 'Chart: Delete Data Point' },
        { id: 'chart.setDraftLabel', title: 'Chart: Set Point Label' },
        { id: 'chart.setDraftValue', title: 'Chart: Set Point Value' },
        { id: 'chart.submitPoint', title: 'Chart: Submit Point' },
        { id: 'chart.resetDefaults', title: 'Chart: Reset Defaults' },
        { id: 'chart.openChart', title: 'Chart: Open Visualizer Window' },
        { id: 'chart.openData', title: 'Chart: Open Data Window' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'chart.toggleOrientation', keys: 'ctrl+o' },
    ];

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'chart' }, size: 2 },
            { node: { tile: 'data' }, size: 1 },
        ],
    });

    readonly views: readonly ViewDecl<Record<string, never>, ChartApi>[] = [
        {
            id: 'chart',
            title: 'Chart Visualizer',
            tile: 'chart',
            instances: 'one',
            defaultSize: { width: 560, height: 500 },
            minSize: { width: 340, height: 300 },
            render(vx: ViewContext<Record<string, never>, ChartApi>): Node {
                return renderChartView(vx);
            },
        },
        {
            id: 'data',
            title: 'Chart Data',
            tile: 'data',
            instances: 'one',
            defaultSize: { width: 320, height: 500 },
            minSize: { width: 260, height: 300 },
            render(vx: ViewContext<Record<string, never>, ChartApi>): Node {
                return renderDataEditorView(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<ChartApi> {
        cx.log.info('ChartApp starting');

        const seriesList = cx.state.signal<readonly ChartSeries[]>(DEFAULT_SERIES);
        const activeSeriesId = cx.state.signal<string>('revenue');
        const chartOrientation = cx.state.signal<'vertical' | 'horizontal'>('vertical');

        const draftLabel = cx.state.signal<string>('');
        const draftValue = cx.state.signal<string>('');
        const draftRevision = cx.state.signal<number>(0);

        let nextPointId = 20;

        const activeSeries = cx.state.computed<ChartSeries>(() => {
            const current = seriesList().find((s) => s.id === activeSeriesId());
            return current ?? DEFAULT_SERIES[0]!;
        });

        const maxValue = cx.state.computed(() => {
            const points = activeSeries().points;
            if (points.length === 0) return 0;
            return Math.max(...points.map((p) => p.value));
        });

        const minValue = cx.state.computed(() => {
            const points = activeSeries().points;
            if (points.length === 0) return 0;
            return Math.min(...points.map((p) => p.value));
        });

        const totalValue = cx.state.computed(() => {
            return activeSeries().points.reduce((acc, p) => acc + p.value, 0);
        });

        const averageValue = cx.state.computed(() => {
            const points = activeSeries().points;
            if (points.length === 0) return 0;
            return Math.round((totalValue() / points.length) * 10) / 10;
        });

        const selectSeries = (seriesId: string): void => {
            activeSeriesId.set(seriesId);
        };

        const toggleOrientation = (): void => {
            chartOrientation.set(chartOrientation() === 'vertical' ? 'horizontal' : 'vertical');
        };

        const addDataPoint = (label: string, value: number): void => {
            const trimmedLabel = label.trim();
            if (trimmedLabel.length === 0 || isNaN(value)) return;

            const newPoint: ChartDataPoint = {
                id: `point-${String(++nextPointId)}`,
                label: trimmedLabel,
                value,
            };

            seriesList.set(
                seriesList().map((s) =>
                    s.id === activeSeriesId()
                        ? { ...s, points: [...s.points, newPoint] }
                        : s,
                ),
            );

            draftLabel.set('');
            draftValue.set('');
            draftRevision.set(draftRevision() + 1);
        };

        const deleteDataPoint = (pointId: string): void => {
            seriesList.set(
                seriesList().map((s) =>
                    s.id === activeSeriesId()
                        ? { ...s, points: s.points.filter((p) => p.id !== pointId) }
                        : s,
                ),
            );
        };

        const setDraftLabel = (label: string): void => {
            draftLabel.set(label);
        };

        const setDraftValue = (val: string): void => {
            draftValue.set(val);
        };

        const submitDraft = (): void => {
            const num = Number(draftValue());
            if (!isNaN(num) && draftLabel().trim().length > 0) {
                addDataPoint(draftLabel(), num);
            }
        };

        const resetDefaults = (): void => {
            seriesList.set(DEFAULT_SERIES);
            draftLabel.set('');
            draftValue.set('');
            draftRevision.set(draftRevision() + 1);
        };

        // Commands
        cx.commands.implement('chart.selectSeries', (val?: Json) => {
            if (typeof val === 'string') selectSeries(val);
        });
        cx.commands.implement('chart.toggleOrientation', () => {
            toggleOrientation();
        });
        cx.commands.implement('chart.addPoint', () => {
            submitDraft();
        });
        cx.commands.implement('chart.deletePoint', (val?: Json) => {
            if (typeof val === 'string') deleteDataPoint(val);
        });
        cx.commands.implement('chart.setDraftLabel', (val?: Json) => {
            setDraftLabel(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('chart.setDraftValue', (val?: Json) => {
            setDraftValue(typeof val === 'string' ? val : typeof val === 'number' ? String(val) : '');
        });
        cx.commands.implement('chart.submitPoint', () => {
            submitDraft();
        });
        cx.commands.implement('chart.resetDefaults', () => {
            resetDefaults();
        });
        cx.commands.implement('chart.openChart', () => {
            cx.windows.open({ view: 'chart' });
        });
        cx.commands.implement('chart.openData', () => {
            cx.windows.open({ view: 'data' });
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'chart' });
                cx.windows.open({ view: 'data' });
            }
        });

        return {
            seriesList,
            activeSeriesId,
            chartOrientation,
            draftLabel,
            draftValue,
            draftRevision,
            activeSeries,
            maxValue,
            minValue,
            averageValue,
            totalValue,
            selectSeries,
            toggleOrientation,
            addDataPoint,
            deleteDataPoint,
            setDraftLabel,
            setDraftValue,
            submitDraft,
            resetDefaults,
        };
    }
}
