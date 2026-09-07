import {
    needs,
    provider,
    type ProviderToken,
    type Signal,
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

export const NEEDS = needs('state', 'commands', 'windows', 'log');

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
