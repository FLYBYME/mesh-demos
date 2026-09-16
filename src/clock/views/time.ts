/**
 * Time view: Digital clock with live seconds, 12/24h toggle, date, and navigation.
 */

import { element, text, when, type Node } from '@flybyme/mesh-web';
import type { ClockView } from '../contract.js';
import { formatDate, formatTime } from '../format.js';

export function renderTimeView(vx: ClockView): Node {
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
                                props: { class: 'clock-nav-btn active' },
                                children: [text('Clock')],
                            }),
                            element('Button', {
                                props: { class: 'clock-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openStopwatch()) } },
                                children: [text('Stopwatch')],
                            }),
                            element('Button', {
                                props: { class: 'clock-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openCountdown()) } },
                                children: [text('Timer')],
                            }),
                        ],
                    }),
                    element('Button', {
                        props: { class: 'clock-btn-subtle clock-btn' },
                        intents: { activate: { action: vx.on(() => app.toggle24Hour()) } },
                        children: [
                            text(() => (app.is24Hour() ? 'Switch to 12h' : 'Switch to 24h')),
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
                                    text(() => formatTime(app.time(), app.is24Hour(), app.timeZone()).time),
                                ],
                            }),
                            when(
                                () => !app.is24Hour(),
                                () => element('Text', {
                                    props: { class: 'clock-ampm' },
                                    children: [
                                        text(() => formatTime(app.time(), false, app.timeZone()).ampm),
                                    ],
                                }),
                            ),
                        ],
                    }),
                    element('Text', {
                        props: { class: 'clock-date' },
                        children: [
                            text(() => formatDate(app.time(), app.timeZone())),
                        ],
                    }),
                ],
            }),
        ],
    });
}
