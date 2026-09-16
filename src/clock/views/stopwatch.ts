/**
 * Stopwatch view: Millisecond counter, Start/Pause, Lap recording, and Reset.
 */

import { each, element, text, when, type Node } from '@flybyme/mesh-web';
import type { ClockView, LapItem } from '../contract.js';
import { formatStopwatch } from '../format.js';

export function renderStopwatchView(vx: ClockView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'clock-container' },
        children: [
            // Header / Navigation
            element('Row', {
                props: { class: 'clock-header' },
                children: [
                    element('Row', {
                        props: { class: 'clock-nav' },
                        children: [
                            element('Button', {
                                props: { class: 'clock-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openTime()) } },
                                children: [text('Clock')],
                            }),
                            element('Button', {
                                props: { class: 'clock-nav-btn active' },
                                children: [text('Stopwatch')],
                            }),
                            element('Button', {
                                props: { class: 'clock-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openCountdown()) } },
                                children: [text('Timer')],
                            }),
                        ],
                    }),
                ],
            }),

            // Display
            element('Stack', {
                props: { class: 'clock-display' },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'center' } },
                        children: [
                            element('Text', {
                                props: { class: 'clock-digits' },
                                children: [
                                    text(() => formatStopwatch(app.stopwatchElapsedMs()).main),
                                ],
                            }),
                            element('Text', {
                                props: { class: 'clock-digits clock-ms' },
                                children: [
                                    text(() => `.${formatStopwatch(app.stopwatchElapsedMs()).msStr}`),
                                ],
                            }),
                        ],
                    }),

                    // Controls
                    element('Row', {
                        props: { class: 'clock-controls' },
                        children: [
                            when(
                                () => !app.stopwatchRunning(),
                                () => element('Button', {
                                    props: { class: 'clock-btn clock-btn-primary' },
                                    intents: { activate: { action: vx.on(() => app.startStopwatch()) } },
                                    children: [text('Start')],
                                }),
                                () => element('Button', {
                                    props: { class: 'clock-btn clock-btn-danger' },
                                    intents: { activate: { action: vx.on(() => app.pauseStopwatch()) } },
                                    children: [text('Pause')],
                                }),
                            ),
                            when(
                                () => app.stopwatchRunning(),
                                () => element('Button', {
                                    props: { class: 'clock-btn' },
                                    intents: { activate: { action: vx.on(() => app.lapStopwatch()) } },
                                    children: [text('Lap')],
                                }),
                            ),
                            when(
                                () => !app.stopwatchRunning() && app.stopwatchElapsedMs() > 0,
                                () => element('Button', {
                                    props: { class: 'clock-btn clock-btn-subtle' },
                                    intents: { activate: { action: vx.on(() => app.resetStopwatch()) } },
                                    children: [text('Reset')],
                                }),
                            ),
                        ],
                    }),
                ],
            }),

            // Laps table
            when(
                () => app.laps().length > 0,
                () => element('Stack', {
                    props: { class: 'clock-laps-container' },
                    children: [
                        each(
                            () => app.laps(),
                            (lap: LapItem) => lap.index,
                            (lap: () => LapItem) => element('Row', {
                                props: { class: 'clock-lap-row' },
                                children: [
                                    element('Text', {
                                        props: { class: 'clock-lap-number' },
                                        children: [text(() => `Lap ${String(lap().index)}`)],
                                    }),
                                    element('Text', {
                                        props: { class: 'clock-lap-split' },
                                        children: [text(() => {
                                            const f = formatStopwatch(lap().lapMs);
                                            return `+${f.main}.${f.msStr}`;
                                        })],
                                    }),
                                    element('Text', {
                                        props: { class: 'clock-lap-total' },
                                        children: [text(() => {
                                            const f = formatStopwatch(lap().totalMs);
                                            return `${f.main}.${f.msStr}`;
                                        })],
                                    }),
                                ],
                            }),
                        ),
                    ],
                }),
            ),
        ],
    });
}
