import {
    needs,
    provider,
    type ProviderToken,
    type Signal,
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

export const NEEDS = needs('state', 'commands', 'windows', 'log');
