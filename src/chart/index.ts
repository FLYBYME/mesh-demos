import {
    tiles,
    type Api,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';
import {
    CHART,
    DEFAULT_SERIES,
    NEEDS,
    type ChartApi,
    type ChartDataPoint,
    type ChartInternal,
    type ChartSeries,
} from './contract.js';
import { renderChartView } from './views/chart.js';
import { renderDataEditorView } from './views/data.js';

export {
    CHART,
    DEFAULT_SERIES,
    type ChartApi,
    type ChartDataPoint,
    type ChartInternal,
    type ChartSeries,
} from './contract.js';

// ---------------------------------------------------------------------------- application

export default class ChartApp implements Application<
    typeof NEEDS,
    readonly [],
    typeof CHART,
    Api<Record<string, never>>,
    ChartInternal
> {
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

    readonly views: readonly ViewDecl<Record<string, never>, ChartApi, ChartInternal>[] = [
        {
            id: 'chart',
            title: 'Chart Visualizer',
            tile: 'chart',
            instances: 'one',
            defaultSize: { width: 560, height: 500 },
            minSize: { width: 340, height: 300 },
            render(vx: ViewContext<Record<string, never>, ChartApi, ChartInternal>): Node {
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
            render(vx: ViewContext<Record<string, never>, ChartApi, ChartInternal>): Node {
                return renderDataEditorView(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<{
        readonly api: ChartApi;
        readonly internal: ChartInternal;
    }> {
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

        const api: ChartApi = {
            seriesList,
            activeSeriesId,
            chartOrientation,
            activeSeries,
            maxValue,
            minValue,
            averageValue,
            totalValue,
            selectSeries,
            addDataPoint,
            deleteDataPoint,
        };

        const internal: ChartInternal = {
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

        return { api, internal };
    }
}
