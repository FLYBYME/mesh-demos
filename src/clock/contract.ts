/**
 * Contract and types for the clock demo application.
 */

import {
    AVAILABLE,
    needs,
    provider,
    schema,
    type Availability,
    type BoundCommand,
    type PartApi,
    type ProviderToken,
    type ReadonlySignal,
    type ViewContext,
} from '@flybyme/mesh-web';

export interface LapItem {
    readonly index: number;
    readonly lapMs: number;
    readonly totalMs: number;
}

export interface ClockCommands {
    readonly toggle24Hour: BoundCommand<void, void>;
    readonly startStopwatch: BoundCommand<void, void>;
    readonly pauseStopwatch: BoundCommand<void, void>;
    readonly lapStopwatch: BoundCommand<void, void>;
    readonly resetStopwatch: BoundCommand<void, void>;
    readonly startTimer: BoundCommand<void, void>;
    readonly pauseTimer: BoundCommand<void, void>;
    readonly resetTimer: BoundCommand<void, void>;
}

export const CLOCK: ProviderToken<PartApi> = provider<PartApi>('clock');

export const NEEDS = needs('state', 'commands', 'windows', 'log');

export const CONSUMES = [] as const;

export const PUBLISHES = {
    commands: [
        {
            action: 'toggle24Hour',
            description: 'Toggles between 12-hour and 24-hour time format.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'startStopwatch',
            description: 'Starts or resumes the stopwatch.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'pauseStopwatch',
            description: 'Pauses the stopwatch.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'lapStopwatch',
            description: 'Records a lap split time on the stopwatch.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'resetStopwatch',
            description: 'Resets the stopwatch to zero and clears laps.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'startTimer',
            description: 'Starts or resumes the countdown timer.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'pauseTimer',
            description: 'Pauses the countdown timer.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'resetTimer',
            description: 'Resets the countdown timer to its configured duration.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
    ],
    components: [],
    state: [],
} as const;

export interface ClockInternal {
    // Current time
    readonly time: ReadonlySignal<Date>;
    readonly is24Hour: ReadonlySignal<boolean>;
    readonly toggle24Hour: () => void;
    readonly timeZone: ReadonlySignal<string>;
    readonly setTimeZone: (tz: string) => void;

    // Stopwatch
    readonly stopwatchRunning: ReadonlySignal<boolean>;
    readonly stopwatchElapsedMs: ReadonlySignal<number>;
    readonly laps: ReadonlySignal<readonly LapItem[]>;
    readonly startStopwatch: () => void;
    readonly pauseStopwatch: () => void;
    readonly lapStopwatch: () => void;
    readonly resetStopwatch: () => void;

    // Countdown Timer
    readonly timerRunning: ReadonlySignal<boolean>;
    readonly timerTotalMs: ReadonlySignal<number>;
    readonly timerRemainingMs: ReadonlySignal<number>;
    readonly timerFinished: ReadonlySignal<boolean>;
    readonly setTimerDuration: (seconds: number) => void;
    readonly startTimer: () => void;
    readonly pauseTimer: () => void;
    readonly resetTimer: () => void;

    // Navigation between views
    readonly openTime: () => void;
    readonly openStopwatch: () => void;
    readonly openCountdown: () => void;

    readonly commands: ClockCommands;
}

export type ClockView = ViewContext<Record<string, never>, ClockInternal, PartApi>;
