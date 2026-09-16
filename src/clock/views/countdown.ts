/**
 * Countdown Timer view: Presets, countdown display, Start/Pause, Reset, and completion state.
 */

import { element, text, when, type Node } from '@flybyme/mesh-web';
import type { ClockView } from '../contract.js';
import { formatCountdown } from '../format.js';

export function renderCountdownView(vx: ClockView): Node {
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
                                props: { class: 'clock-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openStopwatch()) } },
                                children: [text('Stopwatch')],
                            }),
                            element('Button', {
                                props: { class: 'clock-nav-btn active' },
                                children: [text('Timer')],
                            }),
                        ],
                    }),
                ],
            }),

            // Presets
            element('Row', {
                props: { class: 'clock-presets' },
                children: [
                    element('Button', {
                        props: { class: 'clock-preset-btn' },
                        intents: { activate: { action: vx.on(() => app.setTimerDuration(60)) } },
                        children: [text('1 min')],
                    }),
                    element('Button', {
                        props: { class: 'clock-preset-btn' },
                        intents: { activate: { action: vx.on(() => app.setTimerDuration(300)) } },
                        children: [text('5 min')],
                    }),
                    element('Button', {
                        props: { class: 'clock-preset-btn' },
                        intents: { activate: { action: vx.on(() => app.setTimerDuration(900)) } },
                        children: [text('15 min')],
                    }),
                    element('Button', {
                        props: { class: 'clock-preset-btn' },
                        intents: { activate: { action: vx.on(() => app.setTimerDuration(1500)) } },
                        children: [text('25 min (Pomodoro)')],
                    }),
                ],
            }),

            // Display
            element('Stack', {
                props: { class: 'clock-display' },
                children: [
                    element('Text', {
                        props: { class: 'clock-digits' },
                        children: [
                            text(() => formatCountdown(app.timerRemainingMs())),
                        ],
                    }),

                    when(
                        () => app.timerFinished(),
                        () => element('Text', {
                            props: { class: 'clock-timer-alert' },
                            children: [text("Time's up!")],
                        }),
                    ),

                    // Controls
                    element('Row', {
                        props: { class: 'clock-controls' },
                        children: [
                            when(
                                () => !app.timerRunning(),
                                () => element('Button', {
                                    props: { class: 'clock-btn clock-btn-primary' },
                                    intents: { activate: { action: vx.on(() => app.startTimer()) } },
                                    children: [text('Start')],
                                }),
                                () => element('Button', {
                                    props: { class: 'clock-btn clock-btn-danger' },
                                    intents: { activate: { action: vx.on(() => app.pauseTimer()) } },
                                    children: [text('Pause')],
                                }),
                            ),
                            element('Button', {
                                props: { class: 'clock-btn clock-btn-subtle' },
                                intents: { activate: { action: vx.on(() => app.resetTimer()) } },
                                children: [text('Reset')],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}
