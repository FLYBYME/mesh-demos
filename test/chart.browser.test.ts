import { describe, expect, it, afterEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import ChartApp, { CHART } from '../src/chart/index.js';

describe('ChartApp browser tests', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('boots, starts the Application, and provides the ChartApi', async () => {
        const site = await mountPart({
            parts: [{ id: 'chart', contribution: ChartApp }],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'chart');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        const api = site.kernel.provided(CHART);
        expect(api).toBeDefined();
        expect(api?.seriesList().length).toBe(3);
        expect(api?.activeSeriesId()).toBe('revenue');
        expect(api?.activeSeries().points.length).toBe(6);
        expect(api?.maxValue()).toBe(130);

        site.dispose();
    });

    it('renders chart visualizer and data editor views into the DOM', async () => {
        const site = await mountPart({
            parts: [{ id: 'chart', contribution: ChartApp }],
        });

        expect(site.manager.windows().length).toBe(2);
        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('chart');
        expect(views).toContain('data');

        // Visualizer view
        const chartTitle = document.querySelector<HTMLElement>('.chart-title');
        expect(chartTitle?.textContent).toBe('Monthly Revenue');

        const verticalBars = document.querySelectorAll<HTMLElement>('.chart-bar.bar-vertical');
        expect(verticalBars.length).toBe(6);

        // Stats cards
        const statMax = document.querySelector<HTMLElement>('.stat-val-max');
        expect(statMax?.textContent).toBe('130 $k');

        // Data editor view
        const dataTitle = document.querySelector<HTMLElement>('.data-editor-title');
        expect(dataTitle?.textContent).toBe('Enter Numbers & Data');

        const dataPoints = document.querySelectorAll<HTMLElement>('.data-point-item');
        expect(dataPoints.length).toBe(6);

        site.dispose();
    });

    it('switches active series via series selector buttons', async () => {
        const site = await mountPart({
            parts: [{ id: 'chart', contribution: ChartApp }],
        });

        const chartWin = site.manager.windows().find((w) => w.view === 'chart');
        if (chartWin) site.manager.focus(chartWin.id);

        const api = site.kernel.provided(CHART);
        if (!api) throw new Error('ChartApi missing');

        const usersBtn = document.querySelector<HTMLButtonElement>('.btn-series-users');
        if (!usersBtn) throw new Error('Users series button not found');

        await userEvent.click(usersBtn);

        expect(api.activeSeriesId()).toBe('users');
        expect(api.activeSeries().title).toBe('Active Users');

        const chartTitle = document.querySelector<HTMLElement>('.chart-title');
        expect(chartTitle?.textContent).toBe('Active Users');

        const statMax = document.querySelector<HTMLElement>('.stat-val-max');
        expect(statMax?.textContent).toBe('220 k');

        site.dispose();
    });

    it('toggles between vertical and horizontal bar chart orientations', async () => {
        const site = await mountPart({
            parts: [{ id: 'chart', contribution: ChartApp }],
        });

        const chartWin = site.manager.windows().find((w) => w.view === 'chart');
        if (chartWin) site.manager.focus(chartWin.id);

        const api = site.kernel.provided(CHART);
        if (!api) throw new Error('ChartApi missing');

        const toggleBtn = document.querySelector<HTMLButtonElement>('.btn-toggle-orientation');
        if (!toggleBtn) throw new Error('Orientation toggle button not found');

        // Toggle to horizontal
        await userEvent.click(toggleBtn);

        expect(api.chartOrientation()).toBe('horizontal');
        const horizontalContainer = document.querySelector<HTMLElement>('.chart-bars-horizontal-container');
        expect(horizontalContainer).not.toBeNull();
        const horizontalBars = document.querySelectorAll<HTMLElement>('.chart-bar.bar-horizontal');
        expect(horizontalBars.length).toBe(6);

        // Toggle back to vertical
        await userEvent.click(toggleBtn);
        expect(api.chartOrientation()).toBe('vertical');
        const verticalContainer = document.querySelector<HTMLElement>('.chart-bars-vertical-container');
        expect(verticalContainer).not.toBeNull();

        site.dispose();
    });

    it('enters numbers in the data form and updates the bar chart', async () => {
        const site = await mountPart({
            parts: [{ id: 'chart', contribution: ChartApp }],
        });

        const dataWin = site.manager.windows().find((w) => w.view === 'data');
        if (dataWin) site.manager.focus(dataWin.id);

        const api = site.kernel.provided(CHART);
        if (!api) throw new Error('ChartApi missing');

        const labelInput = document.querySelector<HTMLInputElement>('.input-point-label');
        const valueInput = document.querySelector<HTMLInputElement>('.input-point-value');
        const addBtn = document.querySelector<HTMLButtonElement>('.btn-add-point');

        if (!labelInput || !valueInput || !addBtn) throw new Error('Data form elements not found');

        await userEvent.type(labelInput, 'Jul');
        await userEvent.type(valueInput, '200');
        await userEvent.click(addBtn);

        // 7 data points now
        expect(api.activeSeries().points.length).toBe(7);
        expect(api.maxValue()).toBe(200);

        // Visualizer bar count updated
        const bars = document.querySelectorAll<HTMLElement>('.chart-bar.bar-vertical');
        expect(bars.length).toBe(7);

        // Max stat card updated
        const statMax = document.querySelector<HTMLElement>('.stat-val-max');
        expect(statMax?.textContent).toBe('200 $k');

        site.dispose();
    });

    it('deletes a data point and resets to defaults', async () => {
        const site = await mountPart({
            parts: [{ id: 'chart', contribution: ChartApp }],
        });

        const dataWin = site.manager.windows().find((w) => w.view === 'data');
        if (dataWin) site.manager.focus(dataWin.id);

        const api = site.kernel.provided(CHART);
        if (!api) throw new Error('ChartApi missing');

        // Delete first point
        const deleteBtn = document.querySelector<HTMLButtonElement>('.btn-delete-point[data-id="p1"]');
        if (!deleteBtn) throw new Error('Delete button for p1 not found');

        await userEvent.click(deleteBtn);

        expect(api.activeSeries().points.length).toBe(5);
        expect(api.activeSeries().points.some((p) => p.id === 'p1')).toBe(false);

        // Reset defaults
        const resetBtn = document.querySelector<HTMLButtonElement>('.btn-reset-defaults');
        if (!resetBtn) throw new Error('Reset defaults button not found');

        await userEvent.click(resetBtn);

        expect(api.activeSeries().points.length).toBe(6);
        expect(api.activeSeries().points.some((p) => p.id === 'p1')).toBe(true);

        site.dispose();
    });

    it('declares commands, keys, views, and layout statically on the class', () => {
        const app = new ChartApp();
        expect(app.commands.map((c) => c.id)).toContain('chart.selectSeries');
        expect(app.commands.map((c) => c.id)).toContain('chart.toggleOrientation');
        expect(app.commands.map((c) => c.id)).toContain('chart.addPoint');
        expect(app.commands.map((c) => c.id)).toContain('chart.deletePoint');
        expect(app.keys.map((k) => k.command)).toContain('chart.toggleOrientation');
        expect(app.views.map((v) => v.id)).toEqual(['chart', 'data']);
        expect(app.layout).toBeDefined();
    });
});
