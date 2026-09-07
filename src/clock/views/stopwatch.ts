import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { ClockApi, LapItem } from '../contract.js';

export function renderStopwatchView(vx: ViewContext<Record<string, never>, ClockApi>): Node {
    return element('Stack', {
        props: {
            class: 'clock-pane stopwatch-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
            },
        },
        children: [
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
                        props: { class: 'stopwatch-title' },
                        children: [text('Stopwatch')],
                    }),
                    when(
                        () => vx.app.stopwatchRunning(),
                        () => element('Badge', {
                            props: { class: 'badge running-badge' },
                            children: [text('Running')],
                        }),
                        () => element('Badge', {
                            props: { class: 'badge stopped-badge' },
                            children: [text('Stopped')],
                        }),
                    ),
                ],
            }),
            element('Card', {
                props: {
                    class: 'stopwatch-display-card',
                    style: {
                        padding: '18px',
                        background: '#161b22',
                        'border-radius': '6px',
                        'text-align': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: {
                            class: 'stopwatch-time',
                            style: {
                                'font-size': '34px',
                                'font-family': 'monospace',
                                margin: '0',
                                color: '#7ee787',
                            },
                        },
                        children: [text(() => vx.app.stopwatchFormatted())],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'stopwatch-controls',
                    style: { display: 'flex', gap: '8px' },
                },
                children: [
                    when(
                        () => vx.app.stopwatchRunning(),
                        () => element('Button', {
                            props: { class: 'btn-stopwatch-stop', style: { flex: '1', padding: '8px 12px' } },
                            intents: { activate: { action: command('clock.stopStopwatch') } },
                            children: [text('Stop')],
                        }),
                        () => element('Button', {
                            props: { class: 'btn-stopwatch-start', style: { flex: '1', padding: '8px 12px' } },
                            intents: { activate: { action: command('clock.startStopwatch') } },
                            children: [text('Start')],
                        }),
                    ),
                    element('Button', {
                        props: { class: 'btn-stopwatch-lap', style: { flex: '1', padding: '8px 12px' } },
                        intents: { activate: { action: command('clock.lapStopwatch') } },
                        children: [text('Lap')],
                    }),
                    element('Button', {
                        props: { class: 'btn-stopwatch-reset', style: { flex: '1', padding: '8px 12px' } },
                        intents: { activate: { action: command('clock.resetStopwatch') } },
                        children: [text('Reset')],
                    }),
                ],
            }),
            element('Heading', {
                props: { class: 'laps-heading', style: { 'font-size': '15px', margin: '4px 0 0 0' } },
                children: [
                    text(() => `Laps (${String(vx.app.lapCount())})`),
                ],
            }),
            element('List', {
                props: {
                    class: 'lap-list',
                    style: {
                        margin: '0',
                        padding: '0',
                        'list-style': 'none',
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '4px',
                        flex: '1',
                        'overflow-y': 'auto',
                    },
                },
                children: [
                    each(
                        () => vx.app.stopwatchLaps(),
                        (lap: LapItem) => lap.id,
                        (lap: () => LapItem) =>
                            element('ListItem', {
                                props: {
                                    class: 'lap-item',
                                    'data-id': () => lap().id,
                                    style: {
                                        display: 'flex',
                                        'justify-content': 'space-between',
                                        padding: '4px 8px',
                                        background: '#21262d',
                                        'border-radius': '4px',
                                        'font-family': 'monospace',
                                        'font-size': '13px',
                                    },
                                },
                                children: [
                                    element('Text', {
                                        props: { class: 'lap-num' },
                                        children: [text(() => `Lap ${String(lap().lapNumber)}`)],
                                    }),
                                    element('Text', {
                                        props: { class: 'lap-split' },
                                        children: [text(() => `+${lap().formattedLap}`)],
                                    }),
                                    element('Text', {
                                        props: { class: 'lap-total', style: { opacity: '0.7' } },
                                        children: [text(() => lap().formattedTotal)],
                                    }),
                                ],
                            }),
                    ),
                ],
            }),
        ],
    });
}
