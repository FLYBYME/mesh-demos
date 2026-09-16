/**
 * Clock demo application: Time, Stopwatch, and Countdown Timer.
 */

import {
    AVAILABLE,
    defineApi,
    type Application,
    type BoundCommand,
    type CommandDecl,
    type Context,
    type PartApi,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    CLOCK,
    CONSUMES,
    NEEDS,
    PUBLISHES,
    type ClockCommands,
    type ClockInternal,
    type LapItem,
} from './contract.js';
import { renderCountdownView } from './views/countdown.js';
import { renderStopwatchView } from './views/stopwatch.js';
import { renderTimeView } from './views/time.js';

import './clock.css';

export * from './contract.js';
export * from './format.js';

export const clockApi = defineApi({
    id: 'clock',
    exposure: 'local',
    calls: {},
});

export default class ClockApp implements Application<
    typeof NEEDS,
    typeof CONSUMES,
    typeof CLOCK,
    typeof clockApi,
    ClockInternal
> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = CLOCK;
    readonly api = clockApi;
    readonly publishes = PUBLISHES;

    readonly commands: readonly CommandDecl[] = [
        { id: 'clock.time', title: 'Clock: Show Time' },
        { id: 'clock.stopwatch', title: 'Clock: Show Stopwatch' },
        { id: 'clock.countdown', title: 'Clock: Show Timer' },
        { id: 'clock.toggle24Hour', title: 'Clock: Toggle 24-Hour Format' },
        { id: 'clock.startStopwatch', title: 'Clock: Start Stopwatch' },
        { id: 'clock.pauseStopwatch', title: 'Clock: Pause Stopwatch' },
        { id: 'clock.lapStopwatch', title: 'Clock: Record Lap' },
        { id: 'clock.resetStopwatch', title: 'Clock: Reset Stopwatch' },
        { id: 'clock.startTimer', title: 'Clock: Start Timer' },
        { id: 'clock.pauseTimer', title: 'Clock: Pause Timer' },
        { id: 'clock.resetTimer', title: 'Clock: Reset Timer' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, ClockInternal>[] = [
        {
            id: 'time',
            title: 'Clock',
            instances: 'one',
            window: {
                defaultSize: { width: 440, height: 300 },
                minSize: { width: 340, height: 240 },
            },
            render: renderTimeView,
        },
        {
            id: 'stopwatch',
            title: 'Stopwatch',
            instances: 'one',
            window: {
                defaultSize: { width: 440, height: 420 },
                minSize: { width: 340, height: 300 },
            },
            render: renderStopwatchView,
        },
        {
            id: 'countdown',
            title: 'Timer',
            instances: 'one',
            window: {
                defaultSize: { width: 440, height: 340 },
                minSize: { width: 340, height: 260 },
            },
            render: renderCountdownView,
        },
    ];

    async start(
        cx: Context<typeof NEEDS, typeof CONSUMES, typeof clockApi>,
    ): Promise<{ api: PartApi; internal: ClockInternal }> {
        // @ts-ignore
        window.cx = cx;
        // ------------------------------------------------------------------ 1. Live Clock
        const time = cx.state.signal(new Date());
        const is24Hour = cx.state.signal(false);
        const timeZone = cx.state.signal(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

        const clockInterval = setInterval(() => {
            time.set(new Date());
        }, 1000);
        cx.onDispose(() => clearInterval(clockInterval));

        const toggle24Hour = (): void => {
            is24Hour.set(!is24Hour());
        };

        const setTimeZone = (tz: string): void => {
            timeZone.set(tz);
        };

        // ------------------------------------------------------------------ 2. Stopwatch
        const stopwatchRunning = cx.state.signal(false);
        const stopwatchElapsedMs = cx.state.signal(0);
        const laps = cx.state.signal<readonly LapItem[]>([]);

        let stopwatchInterval: ReturnType<typeof setInterval> | null = null;
        let stopwatchStartTime = 0;

        const clearStopwatchTimer = (): void => {
            if (stopwatchInterval !== null) {
                clearInterval(stopwatchInterval);
                stopwatchInterval = null;
            }
        };
        cx.onDispose(clearStopwatchTimer);

        const startStopwatch = (): void => {
            if (stopwatchRunning()) return;
            stopwatchRunning.set(true);
            stopwatchStartTime = performance.now() - stopwatchElapsedMs();
            stopwatchInterval = setInterval(() => {
                stopwatchElapsedMs.set(Math.floor(performance.now() - stopwatchStartTime));
            }, 16);
        };

        const pauseStopwatch = (): void => {
            if (!stopwatchRunning()) return;
            stopwatchRunning.set(false);
            clearStopwatchTimer();
            stopwatchElapsedMs.set(Math.floor(performance.now() - stopwatchStartTime));
        };

        const lapStopwatch = (): void => {
            const currentTotal = stopwatchElapsedMs();
            const currentLaps = laps();
            const previousTotal = currentLaps.length > 0 ? currentLaps[0]!.totalMs : 0;
            const lapSplit = Math.max(0, currentTotal - previousTotal);

            const newLap: LapItem = {
                index: currentLaps.length + 1,
                lapMs: lapSplit,
                totalMs: currentTotal,
            };

            // Newest lap at the top
            laps.set([newLap, ...currentLaps]);
        };

        const resetStopwatch = (): void => {
            pauseStopwatch();
            stopwatchElapsedMs.set(0);
            laps.set([]);
        };

        // ------------------------------------------------------------------ 3. Countdown Timer
        const timerTotalMs = cx.state.signal(300 * 1000); // 5 minutes default
        const timerRemainingMs = cx.state.signal(300 * 1000);
        const timerRunning = cx.state.signal(false);
        const timerFinished = cx.state.signal(false);

        let timerInterval: ReturnType<typeof setInterval> | null = null;
        let timerTargetTime = 0;

        const clearCountdownTimer = (): void => {
            if (timerInterval !== null) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        };
        cx.onDispose(clearCountdownTimer);

        const setTimerDuration = (seconds: number): void => {
            clearCountdownTimer();
            timerRunning.set(false);
            timerFinished.set(false);
            const ms = Math.max(0, seconds * 1000);
            timerTotalMs.set(ms);
            timerRemainingMs.set(ms);
        };

        const startTimer = (): void => {
            if (timerRunning() || timerRemainingMs() <= 0) return;
            timerRunning.set(true);
            timerFinished.set(false);
            timerTargetTime = performance.now() + timerRemainingMs();

            timerInterval = setInterval(() => {
                const remaining = Math.max(0, Math.ceil(timerTargetTime - performance.now()));
                timerRemainingMs.set(remaining);

                if (remaining <= 0) {
                    clearCountdownTimer();
                    timerRunning.set(false);
                    timerFinished.set(true);
                }
            }, 100);
        };

        const pauseTimer = (): void => {
            if (!timerRunning()) return;
            timerRunning.set(false);
            clearCountdownTimer();
            const remaining = Math.max(0, Math.ceil(timerTargetTime - performance.now()));
            timerRemainingMs.set(remaining);
        };

        const resetTimer = (): void => {
            clearCountdownTimer();
            timerRunning.set(false);
            timerFinished.set(false);
            timerRemainingMs.set(timerTotalMs());
        };

        // ------------------------------------------------------------------ 4. Window Navigation
        const openTime = (): void => {
            cx.windows.open({ view: 'time' });
        };

        const openStopwatch = (): void => {
            cx.windows.open({ view: 'stopwatch' });
        };

        const openCountdown = (): void => {
            cx.windows.open({ view: 'countdown' });
        };

        // ------------------------------------------------------------------ 5. Commands
        const boundToggle24Hour: BoundCommand<void, void> = {
            ...PUBLISHES.commands[0],
            available: () => AVAILABLE,
            run: async () => toggle24Hour(),
        };

        const boundStartStopwatch: BoundCommand<void, void> = {
            ...PUBLISHES.commands[1],
            available: () => AVAILABLE,
            run: async () => startStopwatch(),
        };

        const boundPauseStopwatch: BoundCommand<void, void> = {
            ...PUBLISHES.commands[2],
            available: () => AVAILABLE,
            run: async () => pauseStopwatch(),
        };

        const boundLapStopwatch: BoundCommand<void, void> = {
            ...PUBLISHES.commands[3],
            available: () => AVAILABLE,
            run: async () => lapStopwatch(),
        };

        const boundResetStopwatch: BoundCommand<void, void> = {
            ...PUBLISHES.commands[4],
            available: () => AVAILABLE,
            run: async () => resetStopwatch(),
        };

        const boundStartTimer: BoundCommand<void, void> = {
            ...PUBLISHES.commands[5],
            available: () => AVAILABLE,
            run: async () => startTimer(),
        };

        const boundPauseTimer: BoundCommand<void, void> = {
            ...PUBLISHES.commands[6],
            available: () => AVAILABLE,
            run: async () => pauseTimer(),
        };

        const boundResetTimer: BoundCommand<void, void> = {
            ...PUBLISHES.commands[7],
            available: () => AVAILABLE,
            run: async () => resetTimer(),
        };

        const commands: ClockCommands = {
            toggle24Hour: boundToggle24Hour,
            startStopwatch: boundStartStopwatch,
            pauseStopwatch: boundPauseStopwatch,
            lapStopwatch: boundLapStopwatch,
            resetStopwatch: boundResetStopwatch,
            startTimer: boundStartTimer,
            pauseTimer: boundPauseTimer,
            resetTimer: boundResetTimer,
        };

        // Palette command implementations
        cx.commands.implement('clock.time', openTime);
        cx.commands.implement('clock.stopwatch', openStopwatch);
        cx.commands.implement('clock.countdown', openCountdown);
        cx.commands.implement('clock.toggle24Hour', toggle24Hour);
        cx.commands.implement('clock.startStopwatch', startStopwatch);
        cx.commands.implement('clock.pauseStopwatch', pauseStopwatch);
        cx.commands.implement('clock.lapStopwatch', lapStopwatch);
        cx.commands.implement('clock.resetStopwatch', resetStopwatch);
        cx.commands.implement('clock.startTimer', startTimer);
        cx.commands.implement('clock.pauseTimer', pauseTimer);
        cx.commands.implement('clock.resetTimer', resetTimer);

        // Open primary view if no views were opened by the composition
        setTimeout(() => {
            if (cx.windows.own().length === 0) {
                openTime();
            }
        }, 0);

        const internal: ClockInternal = {
            time,
            is24Hour,
            toggle24Hour,
            timeZone,
            setTimeZone,

            stopwatchRunning,
            stopwatchElapsedMs,
            laps,
            startStopwatch,
            pauseStopwatch,
            lapStopwatch,
            resetStopwatch,

            timerRunning,
            timerTotalMs,
            timerRemainingMs,
            timerFinished,
            setTimerDuration,
            startTimer,
            pauseTimer,
            resetTimer,

            openTime,
            openStopwatch,
            openCountdown,

            commands,
        };

        const api: PartApi = {
            commands: {
                toggle24Hour: boundToggle24Hour,
                startStopwatch: boundStartStopwatch,
                pauseStopwatch: boundPauseStopwatch,
                lapStopwatch: boundLapStopwatch,
                resetStopwatch: boundResetStopwatch,
                startTimer: boundStartTimer,
                pauseTimer: boundPauseTimer,
                resetTimer: boundResetTimer,
            },
            components: {},
            state: {},
        };

        return { api, internal };
    }
}
