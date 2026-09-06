import { describe, expect, it, afterEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import ClockApp, { CLOCK } from '../src/clock/index.js';

describe('ClockApp browser tests', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('boots, starts the Application, and provides the ClockApi', async () => {
        const site = await mountPart({
            parts: [{ id: 'clock', contribution: ClockApp }],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'clock');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        const api = site.kernel.provided(CLOCK);
        expect(api).toBeDefined();
        expect(api?.currentTime()).toBeDefined();
        expect(api?.is24Hour()).toBe(false);
        expect(api?.stopwatchRunning()).toBe(false);
        expect(api?.countdownRunning()).toBe(false);

        site.dispose();
    });

    it('renders all three views (time, stopwatch, countdown) into the DOM', async () => {
        const site = await mountPart({
            parts: [{ id: 'clock', contribution: ClockApp }],
        });

        expect(site.manager.windows().length).toBe(3);
        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('time');
        expect(views).toContain('stopwatch');
        expect(views).toContain('countdown');

        // Time view
        const timeHeading = document.querySelector<HTMLElement>('.clock-title');
        expect(timeHeading?.textContent).toBe('Current Time');
        const digitalTime = document.querySelector<HTMLElement>('.digital-time');
        expect(digitalTime).not.toBeNull();
        expect(digitalTime?.textContent?.length).toBeGreaterThan(0);

        // Stopwatch view
        const swHeading = document.querySelector<HTMLElement>('.stopwatch-title');
        expect(swHeading?.textContent).toBe('Stopwatch');
        const swTime = document.querySelector<HTMLElement>('.stopwatch-time');
        expect(swTime?.textContent).toBe('00:00.00');

        // Countdown view
        const cdHeading = document.querySelector<HTMLElement>('.countdown-title');
        expect(cdHeading?.textContent).toBe('Countdown');
        const cdTime = document.querySelector<HTMLElement>('.countdown-time');
        expect(cdTime?.textContent).toBe('05:00');

        site.dispose();
    });

    it('toggles 12-hour and 24-hour time format', async () => {
        const site = await mountPart({
            parts: [{ id: 'clock', contribution: ClockApp }],
        });

        // Focus the time window so it is at the front in windowed mode
        const timeWin = site.manager.windows().find((w) => w.view === 'time');
        if (timeWin) site.manager.focus(timeWin.id);

        const toggleBtn = document.querySelector<HTMLButtonElement>('.btn-toggle-format');
        expect(toggleBtn).not.toBeNull();
        if (!toggleBtn) throw new Error('toggleBtn not found');

        const badge = document.querySelector<HTMLElement>('.format-badge');
        expect(badge?.textContent).toBe('12H Format');

        await userEvent.click(toggleBtn);
        expect(badge?.textContent).toBe('24H Format');

        await userEvent.click(toggleBtn);
        expect(badge?.textContent).toBe('12H Format');

        site.dispose();
    });

    it('controls the stopwatch: start, lap, stop, and reset', async () => {
        const site = await mountPart({
            parts: [{ id: 'clock', contribution: ClockApp }],
        });

        // Focus stopwatch window so it is at the front
        const swWin = site.manager.windows().find((w) => w.view === 'stopwatch');
        if (swWin) site.manager.focus(swWin.id);

        const startBtn = document.querySelector<HTMLButtonElement>('.btn-stopwatch-start');
        expect(startBtn).not.toBeNull();
        if (!startBtn) throw new Error('startBtn not found');

        // Start stopwatch
        await userEvent.click(startBtn);

        const runningBadge = document.querySelector<HTMLElement>('.badge.running-badge');
        expect(runningBadge?.textContent).toBe('Running');

        // Take a lap
        const lapBtn = document.querySelector<HTMLButtonElement>('.btn-stopwatch-lap');
        expect(lapBtn).not.toBeNull();
        if (!lapBtn) throw new Error('lapBtn not found');

        await userEvent.click(lapBtn);

        const lapItems = document.querySelectorAll<HTMLElement>('.lap-item');
        expect(lapItems.length).toBe(1);
        const lapNum = document.querySelector<HTMLElement>('.lap-num');
        expect(lapNum?.textContent).toBe('Lap 1');

        // Stop stopwatch
        const stopBtn = document.querySelector<HTMLButtonElement>('.btn-stopwatch-stop');
        expect(stopBtn).not.toBeNull();
        if (!stopBtn) throw new Error('stopBtn not found');

        await userEvent.click(stopBtn);
        const stoppedBadge = document.querySelector<HTMLElement>('.badge.stopped-badge');
        expect(stoppedBadge?.textContent).toBe('Stopped');

        // Reset stopwatch
        const resetBtn = document.querySelector<HTMLButtonElement>('.btn-stopwatch-reset');
        expect(resetBtn).not.toBeNull();
        if (!resetBtn) throw new Error('resetBtn not found');

        await userEvent.click(resetBtn);
        const swTime = document.querySelector<HTMLElement>('.stopwatch-time');
        expect(swTime?.textContent).toBe('00:00.00');
        expect(document.querySelectorAll<HTMLElement>('.lap-item').length).toBe(0);

        site.dispose();
    });

    it('controls the countdown timer: preset buttons, custom minutes input, and reset', async () => {
        const site = await mountPart({
            parts: [{ id: 'clock', contribution: ClockApp }],
        });

        // Focus countdown window
        const cdWin = site.manager.windows().find((w) => w.view === 'countdown');
        if (cdWin) site.manager.focus(cdWin.id);

        const cdTime = document.querySelector<HTMLElement>('.countdown-time');
        expect(cdTime?.textContent).toBe('05:00');

        // Add 1 minute with preset button
        const plus1Btn = document.querySelector<HTMLButtonElement>('.btn-preset-plus1');
        expect(plus1Btn).not.toBeNull();
        if (!plus1Btn) throw new Error('plus1Btn not found');

        await userEvent.click(plus1Btn);
        expect(cdTime?.textContent).toBe('06:00');

        // Subtract 1 minute
        const minus1Btn = document.querySelector<HTMLButtonElement>('.btn-preset-minus1');
        expect(minus1Btn).not.toBeNull();
        if (!minus1Btn) throw new Error('minus1Btn not found');

        await userEvent.click(minus1Btn);
        expect(cdTime?.textContent).toBe('05:00');

        // Set custom minutes via Input and Form
        const input = document.querySelector<HTMLInputElement>('.countdown-input');
        expect(input).not.toBeNull();
        if (!input) throw new Error('input not found');

        const setBtn = document.querySelector<HTMLButtonElement>('.btn-set-minutes');
        expect(setBtn).not.toBeNull();
        if (!setBtn) throw new Error('setBtn not found');

        await userEvent.type(input, '2');
        await userEvent.click(setBtn);
        expect(cdTime?.textContent).toBe('02:00');

        // Start countdown
        const startBtn = document.querySelector<HTMLButtonElement>('.btn-countdown-start');
        expect(startBtn).not.toBeNull();
        if (!startBtn) throw new Error('startBtn not found');

        await userEvent.click(startBtn);
        const statusBadge = document.querySelector<HTMLElement>('.countdown-pane .badge');
        expect(statusBadge?.textContent).toBe('Running');

        // Pause countdown
        const pauseBtn = document.querySelector<HTMLButtonElement>('.btn-countdown-pause');
        expect(pauseBtn).not.toBeNull();
        if (!pauseBtn) throw new Error('pauseBtn not found');

        await userEvent.click(pauseBtn);
        const pausedBadge = document.querySelector<HTMLElement>('.countdown-pane .badge');
        expect(pausedBadge?.textContent).toBe('Ready');

        // Reset countdown
        const resetBtn = document.querySelector<HTMLButtonElement>('.btn-countdown-reset');
        expect(resetBtn).not.toBeNull();
        if (!resetBtn) throw new Error('resetBtn not found');

        await userEvent.click(resetBtn);
        expect(cdTime?.textContent).toBe('05:00');

        site.dispose();
    });

    it('declares commands, keys, views, and layout statically on the class', () => {
        const app = new ClockApp();
        expect(app.needs).toEqual(['state', 'commands', 'windows', 'log']);
        expect(app.commands.map((c) => c.id)).toContain('clock.toggleFormat');
        expect(app.commands.map((c) => c.id)).toContain('clock.startStopwatch');
        expect(app.commands.map((c) => c.id)).toContain('clock.startCountdown');
        expect(app.views.map((v) => v.id)).toEqual(['time', 'stopwatch', 'countdown']);
        expect(app.layout).toBeDefined();
    });
});
