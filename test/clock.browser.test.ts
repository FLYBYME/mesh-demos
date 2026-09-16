/**
 * Browser integration tests for ClockApp.
 *
 * Runs in a real Chromium browser via vitest.browser.config.ts.
 * Verifies:
 * - Booting ClockApp into the kernel via mountPart().
 * - Live clock view rendering, AM/PM, formatted date, and 12/24-hour toggling.
 * - View switching across Clock, Stopwatch, and Timer.
 * - Stopwatch operation: start, lap recording, pause, and reset.
 * - Countdown Timer operation: duration presets, start, pause, and reset.
 * - Published commands and API surface.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import type { PartApi } from '@flybyme/mesh-web';

import ClockApp, { type ClockInternal } from '../src/clock/index.js';

let site: Awaited<ReturnType<typeof bootClock>> | undefined;

afterEach(() => {
    site?.dispose();
    site = undefined;
    cleanup();
    for (const el of document.querySelectorAll('.clock-container')) {
        el.remove();
    }
});

async function bootClock(views?: readonly string[]) {
    const options = views
        ? {
              parts: [{ id: 'clock', contribution: ClockApp }],
              open: [{ application: 'clock', views }],
          }
        : {
              parts: [{ id: 'clock', contribution: ClockApp }],
          };

    const s = await mountPart(options);
    await s.ready;
    await new Promise((r) => setTimeout(r, 30));
    return s;
}

function getClockInternal(s: NonNullable<typeof site>): ClockInternal {
    const process = s.kernel.processes.find((p) => p.applicationId === 'clock');
    if (!process || !process.internal) {
        throw new Error('Clock process or internal not found');
    }
    return process.internal as ClockInternal;
}

describe('ClockApp browser integration', () => {
    it('boots into a window and renders the live clock', async () => {
        site = await bootClock();

        // 1. Single window opened by default with view 'time'
        const windows = site.manager.windows();
        expect(windows).toHaveLength(1);
        expect(windows[0]?.view).toBe('time');

        // 2. Digits, AM/PM, and date elements rendered
        const digits = document.querySelector('.clock-digits');
        expect(digits).not.toBeNull();
        expect(digits?.textContent?.trim()).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);

        const ampm = document.querySelector('.clock-ampm');
        expect(ampm).not.toBeNull();
        expect(ampm?.textContent?.trim()).toMatch(/^(AM|PM)$/);

        const date = document.querySelector('.clock-date');
        expect(date).not.toBeNull();
        expect(date?.textContent?.length).toBeGreaterThan(5);

        // 3. Navigation buttons rendered
        const navBtns = Array.from(document.querySelectorAll('.clock-nav-btn'));
        expect(navBtns.map((b) => b.textContent?.trim())).toEqual(['Clock', 'Stopwatch', 'Timer']);
    });

    it('toggles 12-hour and 24-hour display format', async () => {
        site = await bootClock();
        const internal = getClockInternal(site);

        expect(internal.is24Hour()).toBe(false);
        expect(document.querySelector('.clock-ampm')).not.toBeNull();

        // Find toggle button
        const toggleBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.clock-btn')).find(
            (btn) => btn.textContent?.includes('Switch to 24h'),
        );
        expect(toggleBtn).toBeDefined();

        // Click to switch to 24h
        toggleBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.is24Hour()).toBe(true);
        expect(document.querySelector('.clock-ampm')).toBeNull();
        expect(toggleBtn?.textContent).toContain('Switch to 12h');

        // Click to switch back to 12h
        toggleBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.is24Hour()).toBe(false);
        expect(document.querySelector('.clock-ampm')).not.toBeNull();
    });

    it('switches views via navigation tabs', async () => {
        site = await bootClock();

        // Initially on 'time'
        expect(site.manager.windows().map((w) => w.view)).toEqual(['time']);

        // Click 'Stopwatch' tab
        const stopwatchTab = Array.from(document.querySelectorAll<HTMLButtonElement>('.clock-nav-btn')).find(
            (b) => b.textContent?.trim() === 'Stopwatch',
        );
        expect(stopwatchTab).toBeDefined();
        stopwatchTab?.click();
        await new Promise((r) => setTimeout(r, 30));

        // Stopwatch window should now be open
        const viewsAfterStopwatch = site.manager.windows().map((w) => w.view);
        expect(viewsAfterStopwatch).toContain('stopwatch');

        // Click 'Timer' tab
        const timerTab = Array.from(document.querySelectorAll<HTMLButtonElement>('.clock-nav-btn')).find(
            (b) => b.textContent?.trim() === 'Timer',
        );
        expect(timerTab).toBeDefined();
        timerTab?.click();
        await new Promise((r) => setTimeout(r, 30));

        const viewsAfterTimer = site.manager.windows().map((w) => w.view);
        expect(viewsAfterTimer).toContain('countdown');
    });

    it('operates the stopwatch: start, lap, pause, and reset', async () => {
        site = await bootClock(['stopwatch']);
        const internal = getClockInternal(site);

        expect(site.manager.windows()[0]?.view).toBe('stopwatch');
        expect(internal.stopwatchRunning()).toBe(false);
        expect(internal.stopwatchElapsedMs()).toBe(0);

        // Find Start button
        const startBtn = document.querySelector<HTMLButtonElement>('.clock-btn-primary');
        expect(startBtn).not.toBeNull();
        expect(startBtn?.textContent?.trim()).toBe('Start');

        // Start stopwatch
        startBtn?.click();
        await new Promise((r) => setTimeout(r, 60));

        expect(internal.stopwatchRunning()).toBe(true);
        expect(internal.stopwatchElapsedMs()).toBeGreaterThan(0);

        // Record laps
        const lapBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.clock-btn')).find(
            (b) => b.textContent?.trim() === 'Lap',
        );
        expect(lapBtn).toBeDefined();
        lapBtn?.click();
        await new Promise((r) => setTimeout(r, 50));
        lapBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.laps().length).toBe(2);
        const lapElements = document.querySelectorAll('.clock-lap-row');
        expect(lapElements.length).toBe(2);

        // Pause stopwatch
        const pauseBtn = document.querySelector<HTMLButtonElement>('.clock-btn-danger');
        expect(pauseBtn).not.toBeNull();
        expect(pauseBtn?.textContent?.trim()).toBe('Pause');
        pauseBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.stopwatchRunning()).toBe(false);
        const pausedElapsed = internal.stopwatchElapsedMs();

        // Wait to confirm it stays paused
        await new Promise((r) => setTimeout(r, 40));
        expect(internal.stopwatchElapsedMs()).toBe(pausedElapsed);

        // Reset stopwatch
        const resetBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.clock-btn')).find(
            (b) => b.textContent?.trim() === 'Reset',
        );
        expect(resetBtn).toBeDefined();
        resetBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.stopwatchElapsedMs()).toBe(0);
        expect(internal.laps().length).toBe(0);
        expect(document.querySelectorAll('.clock-lap-row').length).toBe(0);
    });

    it('operates the countdown timer: presets, start, pause, and reset', async () => {
        site = await bootClock(['countdown']);
        const internal = getClockInternal(site);

        expect(site.manager.windows()[0]?.view).toBe('countdown');
        // Default 5m = 300,000ms
        expect(internal.timerTotalMs()).toBe(300000);
        expect(internal.timerRemainingMs()).toBe(300000);

        // Select 15 min preset
        const preset15 = Array.from(document.querySelectorAll<HTMLButtonElement>('.clock-preset-btn')).find(
            (b) => b.textContent?.includes('15 min'),
        );
        expect(preset15).toBeDefined();
        preset15?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.timerTotalMs()).toBe(900000);
        expect(internal.timerRemainingMs()).toBe(900000);

        const digits = document.querySelector('.clock-digits');
        expect(digits?.textContent?.trim()).toBe('15:00');

        // Start timer
        const startBtn = document.querySelector<HTMLButtonElement>('.clock-btn-primary');
        expect(startBtn).not.toBeNull();
        startBtn?.click();
        await new Promise((r) => setTimeout(r, 200));

        expect(internal.timerRunning()).toBe(true);
        expect(internal.timerRemainingMs()).toBeLessThan(900000);

        // Pause timer
        const pauseBtn = document.querySelector<HTMLButtonElement>('.clock-btn-danger');
        expect(pauseBtn).not.toBeNull();
        pauseBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.timerRunning()).toBe(false);
        const remainingAfterPause = internal.timerRemainingMs();
        expect(remainingAfterPause).toBeLessThan(900000);

        // Reset timer
        const resetBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.clock-btn')).find(
            (b) => b.textContent?.trim() === 'Reset',
        );
        expect(resetBtn).toBeDefined();
        resetBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.timerRemainingMs()).toBe(900000);
        expect(internal.timerRunning()).toBe(false);
        expect(digits?.textContent?.trim()).toBe('15:00');
    });

    it('exposes published commands via API and internal', async () => {
        site = await bootClock();
        const process = site.kernel.processes.find((p) => p.applicationId === 'clock');
        expect(process).toBeDefined();

        const api = process?.api as PartApi | undefined;
        expect(api).toBeDefined();
        expect(api?.commands).toBeDefined();

        // Check command bindings
        const commandNames = Object.keys(api?.commands ?? {});
        expect(commandNames).toContain('toggle24Hour');
        expect(commandNames).toContain('startStopwatch');
        expect(commandNames).toContain('pauseStopwatch');
        expect(commandNames).toContain('lapStopwatch');
        expect(commandNames).toContain('resetStopwatch');
        expect(commandNames).toContain('startTimer');
        expect(commandNames).toContain('pauseTimer');
        expect(commandNames).toContain('resetTimer');

        const internal = getClockInternal(site);
        expect(internal.is24Hour()).toBe(false);

        // Execute command via API
        await api?.commands.toggle24Hour?.run(undefined);
        expect(internal.is24Hour()).toBe(true);

        await api?.commands.toggle24Hour?.run(undefined);
        expect(internal.is24Hour()).toBe(false);
    });
});
