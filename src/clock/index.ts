import {
    tiles,
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
    CLOCK,
    NEEDS,
    type ClockApi,
    type LapItem,
} from './contract.js';
import {
    formatCountdown,
    formatDate,
    formatStopwatch,
    formatTime,
    formatTimezone,
} from './format.js';
import { renderTimeView } from './views/time.js';
import { renderStopwatchView } from './views/stopwatch.js';
import { renderCountdownView } from './views/countdown.js';

export { CLOCK, type ClockApi, type LapItem } from './contract.js';

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
