import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { ClockApi } from '../contract.js';

export function renderCountdownView(vx: ViewContext<Record<string, never>, ClockApi>): Node {
    return element('Stack', {
        props: {
            class: 'clock-pane countdown-pane',
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
                        props: { class: 'countdown-title' },
                        children: [text('Countdown')],
                    }),
                    when(
                        () => vx.app.countdownFinished(),
                        () => element('Badge', {
                            props: { class: 'badge finished-badge' },
                            children: [text('Finished!')],
                        }),
                        () => when(
                            () => vx.app.countdownRunning(),
                            () => element('Badge', {
                                props: { class: 'badge running-badge' },
                                children: [text('Running')],
                            }),
                            () => element('Badge', {
                                props: { class: 'badge ready-badge' },
                                children: [text('Ready')],
                            }),
                        ),
                    ),
                ],
            }),
            element('Card', {
                props: {
                    class: 'countdown-display-card',
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
                            class: 'countdown-time',
                            style: {
                                'font-size': '36px',
                                'font-family': 'monospace',
                                margin: '0',
                                color: '#ffa657',
                            },
                        },
                        children: [text(() => vx.app.countdownFormatted())],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'countdown-presets',
                    style: { display: 'flex', gap: '6px' },
                },
                children: [
                    element('Button', {
                        props: { class: 'btn-preset-plus1', style: { flex: '1', padding: '4px 6px' } },
                        intents: { activate: { action: command('clock.addCountdown', 60) } },
                        children: [text('+1m')],
                    }),
                    element('Button', {
                        props: { class: 'btn-preset-plus5', style: { flex: '1', padding: '4px 6px' } },
                        intents: { activate: { action: command('clock.addCountdown', 300) } },
                        children: [text('+5m')],
                    }),
                    element('Button', {
                        props: { class: 'btn-preset-plus10', style: { flex: '1', padding: '4px 6px' } },
                        intents: { activate: { action: command('clock.addCountdown', 600) } },
                        children: [text('+10m')],
                    }),
                    element('Button', {
                        props: { class: 'btn-preset-minus1', style: { flex: '1', padding: '4px 6px' } },
                        intents: { activate: { action: command('clock.addCountdown', -60) } },
                        children: [text('-1m')],
                    }),
                ],
            }),
            element('Form', {
                props: { class: 'countdown-form' },
                intents: { commit: { action: command('clock.applyMinutes'), preventDefault: true } },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            each(
                                () => [vx.app.countdownInputRevision()],
                                (rev) => rev,
                                () => element('Input', {
                                    props: {
                                        placeholder: 'Custom minutes...',
                                        class: 'countdown-input',
                                        style: { flex: '1', padding: '6px 8px' },
                                    },
                                    intents: {
                                        change: { action: command('clock.setInputMinutes') },
                                    },
                                }),
                            ),
                            element('Button', {
                                props: { class: 'btn-set-minutes', style: { padding: '6px 12px' } },
                                intents: { activate: { action: command('clock.applyMinutes') } },
                                children: [text('Set')],
                            }),
                        ],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'countdown-controls',
                    style: { display: 'flex', gap: '8px' },
                },
                children: [
                    when(
                        () => vx.app.countdownRunning(),
                        () => element('Button', {
                            props: { class: 'btn-countdown-pause', style: { flex: '1', padding: '8px 12px' } },
                            intents: { activate: { action: command('clock.pauseCountdown') } },
                            children: [text('Pause')],
                        }),
                        () => element('Button', {
                            props: { class: 'btn-countdown-start', style: { flex: '1', padding: '8px 12px' } },
                            intents: { activate: { action: command('clock.startCountdown') } },
                            children: [text('Start')],
                        }),
                    ),
                    element('Button', {
                        props: { class: 'btn-countdown-reset', style: { flex: '1', padding: '8px 12px' } },
                        intents: { activate: { action: command('clock.resetCountdown') } },
                        children: [text('Reset')],
                    }),
                ],
            }),
        ],
    });
}
