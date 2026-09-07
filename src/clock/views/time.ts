import {
    command,
    element,
    text,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { ClockApi } from '../contract.js';

export function renderTimeView(vx: ViewContext<Record<string, never>, ClockApi>): Node {
    return element('Stack', {
        props: {
            class: 'clock-pane time-pane',
            gap: 16,
            style: {
                padding: '20px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                'justify-content': 'space-between',
            },
        },
        children: [
            element('Stack', {
                props: { gap: 8 },
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
                                props: { class: 'clock-title' },
                                children: [text('Current Time')],
                            }),
                            element('Badge', {
                                props: { class: 'badge format-badge' },
                                children: [text(() => (vx.app.is24Hour() ? '24H Format' : '12H Format'))],
                            }),
                        ],
                    }),
                    element('Card', {
                        props: {
                            class: 'clock-display-card',
                            style: {
                                padding: '24px',
                                background: '#161b22',
                                'border-radius': '8px',
                                'text-align': 'center',
                                display: 'flex',
                                'flex-direction': 'column',
                                gap: '8px',
                                'align-items': 'center',
                            },
                        },
                        children: [
                            element('Heading', {
                                props: {
                                    class: 'digital-time',
                                    style: {
                                        'font-size': '38px',
                                        'font-family': 'monospace',
                                        margin: '0',
                                        color: '#58a6ff',
                                    },
                                },
                                children: [text(() => vx.app.currentTime())],
                            }),
                            element('Text', {
                                props: { class: 'digital-date', style: { opacity: '0.8' } },
                                children: [text(() => vx.app.currentDate())],
                            }),
                            element('Text', {
                                props: { class: 'digital-timezone', style: { opacity: '0.6', 'font-size': '12px' } },
                                children: [text(() => vx.app.timezone())],
                            }),
                        ],
                    }),
                ],
            }),
            element('Stack', {
                props: { gap: 8 },
                children: [
                    element('Button', {
                        props: { class: 'btn-toggle-format', style: { padding: '8px 14px' } },
                        intents: { activate: { action: command('clock.toggleFormat') } },
                        children: [text(() => (vx.app.is24Hour() ? 'Switch to 12-Hour' : 'Switch to 24-Hour'))],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px' } },
                        children: [
                            element('Button', {
                                props: { class: 'btn-open-stopwatch', style: { flex: '1', padding: '6px 10px' } },
                                intents: { activate: { action: command('clock.openStopwatch') } },
                                children: [text('Stopwatch')],
                            }),
                            element('Button', {
                                props: { class: 'btn-open-countdown', style: { flex: '1', padding: '6px 10px' } },
                                intents: { activate: { action: command('clock.openCountdown') } },
                                children: [text('Countdown')],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}
