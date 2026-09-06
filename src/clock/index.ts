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

export interface LapItem {
    readonly id: string;
    readonly lapNumber: number;
    readonly lapTimeMs: number;
    readonly totalTimeMs: number;
    readonly formattedLap: string;
    readonly formattedTotal: string;
}

export interface ClockApi {
    // Current time
    readonly currentTime: Signal<string>;
    readonly currentDate: Signal<string>;
    readonly timezone: Signal<string>;
    readonly is24Hour: Signal<boolean>;
    toggleFormat(): void;

    // Stopwatch
    readonly stopwatchFormatted: Signal<string>;
    readonly stopwatchRunning: Signal<boolean>;
    readonly stopwatchLaps: Signal<readonly LapItem[]>;
    readonly lapCount: () => number;
    startStopwatch(): void;
    stopStopwatch(): void;
    resetStopwatch(): void;
    lapStopwatch(): void;

    // Countdown
    readonly countdownFormatted: Signal<string>;
    readonly countdownSeconds: Signal<number>;
    readonly countdownRunning: Signal<boolean>;
    readonly countdownFinished: Signal<boolean>;
    readonly countdownInputRevision: Signal<number>;
    startCountdown(): void;
    pauseCountdown(): void;
    resetCountdown(): void;
    addCountdownSeconds(seconds: number): void;
    setInputMinutes(minutesStr: string): void;
    applyMinutes(): void;
}

export const CLOCK: ProviderToken<ClockApi> = provider<ClockApi>('mesh-clock');

const NEEDS = needs('state', 'commands', 'windows', 'log');

// ---------------------------------------------------------------------------- formatting

function formatTime(date: Date, is24h: boolean): string {
    if (is24h) {
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }
    const hours = date.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const hStr = String(h12).padStart(2, '0');
    const mStr = String(date.getMinutes()).padStart(2, '0');
    const sStr = String(date.getSeconds()).padStart(2, '0');
    return `${hStr}:${mStr}:${sStr} ${period}`;
}

function formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
}

function formatTimezone(date: Date): string {
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatStopwatch(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');
    const hStr = String(hundredths).padStart(2, '0');
    return `${mStr}:${sStr}.${hStr}`;
}

function formatCountdown(sec: number): string {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');
    return `${mStr}:${sStr}`;
}

// ---------------------------------------------------------------------------- views

function renderTimeView(vx: ViewContext<Record<string, never>, ClockApi>): Node {
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

function renderStopwatchView(vx: ViewContext<Record<string, never>, ClockApi>): Node {
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

function renderCountdownView(vx: ViewContext<Record<string, never>, ClockApi>): Node {
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

// ---------------------------------------------------------------------------- application

export default class ClockApp implements Application<typeof NEEDS, readonly [], typeof CLOCK> {
    readonly needs = NEEDS;
    readonly provides = CLOCK;

    readonly commands: readonly CommandDecl[] = [
        { id: 'clock.toggleFormat', title: 'Clock: Toggle 12h/24h Format' },
        { id: 'clock.startStopwatch', title: 'Stopwatch: Start' },
        { id: 'clock.stopStopwatch', title: 'Stopwatch: Stop' },
        { id: 'clock.resetStopwatch', title: 'Stopwatch: Reset' },
        { id: 'clock.lapStopwatch', title: 'Stopwatch: Record Lap' },
        { id: 'clock.startCountdown', title: 'Countdown: Start' },
        { id: 'clock.pauseCountdown', title: 'Countdown: Pause' },
        { id: 'clock.resetCountdown', title: 'Countdown: Reset' },
        { id: 'clock.addCountdown', title: 'Countdown: Add Time' },
        { id: 'clock.setInputMinutes', title: 'Countdown: Set Minutes Input' },
        { id: 'clock.applyMinutes', title: 'Countdown: Apply Custom Minutes' },
        { id: 'clock.openTime', title: 'Clock: Open Current Time Window' },
        { id: 'clock.openStopwatch', title: 'Clock: Open Stopwatch Window' },
        { id: 'clock.openCountdown', title: 'Clock: Open Countdown Window' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'clock.toggleFormat', keys: 'ctrl+t' },
        { command: 'clock.startStopwatch', keys: 'ctrl+s' },
        { command: 'clock.startCountdown', keys: 'ctrl+c' },
    ];

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'main' }, size: 2 },
            { node: { tile: 'tools' }, size: 1 },
        ],
    });

    readonly views: readonly ViewDecl<Record<string, never>, ClockApi>[] = [
        {
            id: 'time',
            title: 'Current Time',
            tile: 'main',
            instances: 'one',
            defaultSize: { width: 440, height: 360 },
            minSize: { width: 300, height: 240 },
            render(vx: ViewContext<Record<string, never>, ClockApi>): Node {
                return renderTimeView(vx);
            },
        },
        {
            id: 'stopwatch',
            title: 'Stopwatch',
            tile: 'tools',
            instances: 'one',
            defaultSize: { width: 380, height: 460 },
            minSize: { width: 280, height: 260 },
            render(vx: ViewContext<Record<string, never>, ClockApi>): Node {
                return renderStopwatchView(vx);
            },
        },
        {
            id: 'countdown',
            title: 'Countdown Timer',
            tile: 'tools',
            instances: 'one',
            defaultSize: { width: 380, height: 420 },
            minSize: { width: 280, height: 260 },
            render(vx: ViewContext<Record<string, never>, ClockApi>): Node {
                return renderCountdownView(vx);
            },
        },
    ];

    private timeIntervalId: number | undefined;
    private stopwatchIntervalId: number | undefined;
    private countdownIntervalId: number | undefined;

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<ClockApi> {
        cx.log.info('ClockApp starting');

        // Current Time state
        const initialDate = new Date();
        const is24Hour = cx.state.signal<boolean>(false);
        const currentTime = cx.state.signal<string>(formatTime(initialDate, false));
        const currentDate = cx.state.signal<string>(formatDate(initialDate));
        const timezone = cx.state.signal<string>(formatTimezone(initialDate));

        const updateClock = (): void => {
            const now = new Date();
            currentTime.set(formatTime(now, is24Hour()));
            currentDate.set(formatDate(now));
            timezone.set(formatTimezone(now));
        };

        const toggleFormat = (): void => {
            const next = !is24Hour();
            is24Hour.set(next);
            currentTime.set(formatTime(new Date(), next));
        };

        this.timeIntervalId = window.setInterval(updateClock, 1000);

        // Stopwatch state
        const stopwatchFormatted = cx.state.signal<string>('00:00.00');
        const stopwatchRunning = cx.state.signal<boolean>(false);
        const stopwatchLaps = cx.state.signal<readonly LapItem[]>([]);
        let stopwatchElapsedMs = 0;
        let stopwatchStartEpoch = 0;
        let nextLapId = 0;
        let lastLapEpoch = 0;

        const tickStopwatch = (): void => {
            const now = Date.now();
            const currentTotal = stopwatchElapsedMs + (now - stopwatchStartEpoch);
            stopwatchFormatted.set(formatStopwatch(currentTotal));
        };

        const startStopwatch = (): void => {
            if (stopwatchRunning()) return;
            stopwatchStartEpoch = Date.now();
            if (lastLapEpoch === 0) lastLapEpoch = stopwatchStartEpoch;
            stopwatchRunning.set(true);
            this.stopwatchIntervalId = window.setInterval(tickStopwatch, 50);
        };

        const stopStopwatch = (): void => {
            if (!stopwatchRunning()) return;
            const now = Date.now();
            stopwatchElapsedMs += now - stopwatchStartEpoch;
            stopwatchRunning.set(false);
            if (this.stopwatchIntervalId !== undefined) {
                window.clearInterval(this.stopwatchIntervalId);
                this.stopwatchIntervalId = undefined;
            }
            stopwatchFormatted.set(formatStopwatch(stopwatchElapsedMs));
        };

        const resetStopwatch = (): void => {
            if (this.stopwatchIntervalId !== undefined) {
                window.clearInterval(this.stopwatchIntervalId);
                this.stopwatchIntervalId = undefined;
            }
            stopwatchRunning.set(false);
            stopwatchElapsedMs = 0;
            stopwatchStartEpoch = 0;
            lastLapEpoch = 0;
            stopwatchFormatted.set('00:00.00');
            stopwatchLaps.set([]);
        };

        const lapStopwatch = (): void => {
            if (!stopwatchRunning() && stopwatchElapsedMs === 0) return;
            const now = Date.now();
            const totalMs = stopwatchRunning()
                ? stopwatchElapsedMs + (now - stopwatchStartEpoch)
                : stopwatchElapsedMs;
            const previousTotal = stopwatchLaps().length > 0
                ? stopwatchLaps()[0]?.totalTimeMs ?? 0
                : 0;
            const lapMs = Math.max(0, totalMs - previousTotal);
            const lapNumber = stopwatchLaps().length + 1;
            const item: LapItem = {
                id: `lap-${String(++nextLapId)}`,
                lapNumber,
                lapTimeMs: lapMs,
                totalTimeMs: totalMs,
                formattedLap: formatStopwatch(lapMs),
                formattedTotal: formatStopwatch(totalMs),
            };
            stopwatchLaps.set([item, ...stopwatchLaps()]);
        };

        const lapCount = cx.state.computed(() => stopwatchLaps().length);

        // Countdown state
        const initialCountdown = 300; // 5 minutes default
        const countdownSeconds = cx.state.signal<number>(initialCountdown);
        const countdownFormatted = cx.state.signal<string>(formatCountdown(initialCountdown));
        const countdownRunning = cx.state.signal<boolean>(false);
        const countdownFinished = cx.state.signal<boolean>(false);
        const countdownInputRevision = cx.state.signal<number>(0);
        let draftMinutes = '';

        const tickCountdown = (): void => {
            const current = countdownSeconds();
            if (current <= 1) {
                countdownSeconds.set(0);
                countdownFormatted.set('00:00');
                countdownRunning.set(false);
                countdownFinished.set(true);
                if (this.countdownIntervalId !== undefined) {
                    window.clearInterval(this.countdownIntervalId);
                    this.countdownIntervalId = undefined;
                }
                return;
            }
            const next = current - 1;
            countdownSeconds.set(next);
            countdownFormatted.set(formatCountdown(next));
        };

        const startCountdown = (): void => {
            if (countdownRunning()) return;
            if (countdownSeconds() <= 0) return;
            countdownFinished.set(false);
            countdownRunning.set(true);
            this.countdownIntervalId = window.setInterval(tickCountdown, 1000);
        };

        const pauseCountdown = (): void => {
            if (!countdownRunning()) return;
            countdownRunning.set(false);
            if (this.countdownIntervalId !== undefined) {
                window.clearInterval(this.countdownIntervalId);
                this.countdownIntervalId = undefined;
            }
        };

        const resetCountdown = (): void => {
            if (this.countdownIntervalId !== undefined) {
                window.clearInterval(this.countdownIntervalId);
                this.countdownIntervalId = undefined;
            }
            countdownRunning.set(false);
            countdownFinished.set(false);
            countdownSeconds.set(initialCountdown);
            countdownFormatted.set(formatCountdown(initialCountdown));
            draftMinutes = '';
            countdownInputRevision.set(countdownInputRevision() + 1);
        };

        const addCountdownSeconds = (secs: number): void => {
            const current = countdownSeconds();
            const next = Math.max(0, current + secs);
            countdownSeconds.set(next);
            countdownFormatted.set(formatCountdown(next));
            if (next > 0) countdownFinished.set(false);
        };

        const setInputMinutes = (minutesStr: string): void => {
            draftMinutes = minutesStr;
        };

        const applyMinutes = (): void => {
            const parsed = parseInt(draftMinutes.trim(), 10);
            if (!isNaN(parsed) && parsed > 0) {
                if (countdownRunning()) pauseCountdown();
                const secs = parsed * 60;
                countdownSeconds.set(secs);
                countdownFormatted.set(formatCountdown(secs));
                countdownFinished.set(false);
                draftMinutes = '';
                countdownInputRevision.set(countdownInputRevision() + 1);
            }
        };

        // Command bindings
        cx.commands.implement('clock.toggleFormat', () => {
            toggleFormat();
        });
        cx.commands.implement('clock.startStopwatch', () => {
            startStopwatch();
        });
        cx.commands.implement('clock.stopStopwatch', () => {
            stopStopwatch();
        });
        cx.commands.implement('clock.resetStopwatch', () => {
            resetStopwatch();
        });
        cx.commands.implement('clock.lapStopwatch', () => {
            lapStopwatch();
        });
        cx.commands.implement('clock.startCountdown', () => {
            startCountdown();
        });
        cx.commands.implement('clock.pauseCountdown', () => {
            pauseCountdown();
        });
        cx.commands.implement('clock.resetCountdown', () => {
            resetCountdown();
        });
        cx.commands.implement('clock.addCountdown', (arg?: Json) => {
            const secs = typeof arg === 'number' ? arg : 60;
            addCountdownSeconds(secs);
        });
        cx.commands.implement('clock.setInputMinutes', (arg?: Json) => {
            const str = typeof arg === 'string' ? arg : '';
            setInputMinutes(str);
        });
        cx.commands.implement('clock.applyMinutes', () => {
            applyMinutes();
        });
        cx.commands.implement('clock.openTime', () => {
            cx.windows.open({ view: 'time' });
        });
        cx.commands.implement('clock.openStopwatch', () => {
            cx.windows.open({ view: 'stopwatch' });
        });
        cx.commands.implement('clock.openCountdown', () => {
            cx.windows.open({ view: 'countdown' });
        });

        // Cleanup on dispose
        cx.onDispose(() => {
            if (this.timeIntervalId !== undefined) {
                window.clearInterval(this.timeIntervalId);
                this.timeIntervalId = undefined;
            }
            if (this.stopwatchIntervalId !== undefined) {
                window.clearInterval(this.stopwatchIntervalId);
                this.stopwatchIntervalId = undefined;
            }
            if (this.countdownIntervalId !== undefined) {
                window.clearInterval(this.countdownIntervalId);
                this.countdownIntervalId = undefined;
            }
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'time' });
                cx.windows.open({ view: 'stopwatch' });
                cx.windows.open({ view: 'countdown' });
            }
        });

        return {
            currentTime,
            currentDate,
            timezone,
            is24Hour,
            toggleFormat,
            stopwatchFormatted,
            stopwatchRunning,
            stopwatchLaps,
            lapCount,
            startStopwatch,
            stopStopwatch,
            resetStopwatch,
            lapStopwatch,
            countdownFormatted,
            countdownSeconds,
            countdownRunning,
            countdownFinished,
            countdownInputRevision,
            startCountdown,
            pauseCountdown,
            resetCountdown,
            addCountdownSeconds,
            setInputMinutes,
            applyMinutes,
        };
    }

    async stop(): Promise<void> {
        if (this.timeIntervalId !== undefined) {
            window.clearInterval(this.timeIntervalId);
            this.timeIntervalId = undefined;
        }
        if (this.stopwatchIntervalId !== undefined) {
            window.clearInterval(this.stopwatchIntervalId);
            this.stopwatchIntervalId = undefined;
        }
        if (this.countdownIntervalId !== undefined) {
            window.clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = undefined;
        }
    }
}
