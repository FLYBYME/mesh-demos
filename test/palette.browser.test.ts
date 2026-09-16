import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import userEvent from '@testing-library/user-event';
import ThemeExtension from '../src/theme/index.js';
import PaletteApp from '../src/palette/index.js';
import { THEME_TOKEN, THEME_TOKEN_NAMES } from '../src/contracts/theme.js';
import { PALETTE } from '../src/palette/contract.js';

describe('PaletteApp browser integration', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        cleanup();
        localStorage.clear();
        document.body.innerHTML = '';
        for (const name of THEME_TOKEN_NAMES) {
            document.documentElement.style.removeProperty(name);
        }
    });

    it('boots palette application alongside theme extension and opens all 3 windows', async () => {
        const site = await mountPart({
            parts: [
                { id: 'theme', contribution: ThemeExtension },
                { id: 'palette', contribution: PaletteApp },
            ],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'palette');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        const themeApi = site.kernel.provided(THEME_TOKEN);
        expect(themeApi).toBeDefined();
        expect(themeApi?.mode()).toBe('dark');

        const paletteApi = site.kernel.provided(PALETTE);
        expect(paletteApi).toBeDefined();
        expect(paletteApi?.selectedToken()).toBe('--accent');
        expect(paletteApi?.activeMode()).toBe('dark');

        await new Promise((r) => setTimeout(r, 40));

        // All 3 windows opened
        expect(site.manager.windows().length).toBe(3);
        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('tokens');
        expect(views).toContain('editor');
        expect(views).toContain('preview');

        site.dispose();
    });

    it('renders all 13 theme tokens into the tokens list', async () => {
        const site = await mountPart({
            parts: [
                { id: 'theme', contribution: ThemeExtension },
                { id: 'palette', contribution: PaletteApp },
            ],
        });

        await new Promise((r) => setTimeout(r, 40));

        const items = document.querySelectorAll<HTMLElement>('.token-item');
        expect(items.length).toBe(13);

        const title = document.querySelector<HTMLElement>('.palette-title');
        expect(title?.textContent).toBe('Theme Tokens');

        const badge = document.querySelector<HTMLElement>('.palette-mode-badge');
        expect(badge?.textContent).toBe('dark');

        site.dispose();
    });

    it('switches themes via UI buttons and updates CSS variables', async () => {
        const site = await mountPart({
            parts: [
                { id: 'theme', contribution: ThemeExtension },
                { id: 'palette', contribution: PaletteApp },
            ],
        });

        await new Promise((r) => setTimeout(r, 40));

        const lightBtn = document.querySelector<HTMLButtonElement>('.btn-mode-light');
        const hcBtn = document.querySelector<HTMLButtonElement>('.btn-mode-hc');
        const darkBtn = document.querySelector<HTMLButtonElement>('.btn-mode-dark');
        const badge = document.querySelector<HTMLElement>('.palette-mode-badge');

        expect(lightBtn).not.toBeNull();
        expect(hcBtn).not.toBeNull();
        expect(darkBtn).not.toBeNull();
        if (!lightBtn || !hcBtn || !darkBtn) throw new Error('Preset buttons not found');

        // Switch to Light
        await userEvent.click(lightBtn);
        expect(badge?.textContent).toBe('light');
        expect(document.documentElement.style.getPropertyValue('--page')).toBe('#f6f8fa');
        expect(document.documentElement.style.getPropertyValue('--surface')).toBe('#ffffff');

        // Switch to High Contrast
        await userEvent.click(hcBtn);
        expect(badge?.textContent).toBe('high-contrast');
        expect(document.documentElement.style.getPropertyValue('--page')).toBe('#000000');
        expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#ffff00');

        // Switch to Dark
        await userEvent.click(darkBtn);
        expect(badge?.textContent).toBe('dark');
        expect(document.documentElement.style.getPropertyValue('--page')).toBe('#0d1117');
        expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#58a6ff');

        site.dispose();
    });

    it('selects and edits a token via the editor UI', async () => {
        const site = await mountPart({
            parts: [
                { id: 'theme', contribution: ThemeExtension },
                { id: 'palette', contribution: PaletteApp },
            ],
        });

        await new Promise((r) => setTimeout(r, 40));

        // Select --surface token in tokens view
        const selectSurfaceBtn = document.querySelector<HTMLButtonElement>('.btn-select-surface');
        expect(selectSurfaceBtn).not.toBeNull();
        if (!selectSurfaceBtn) throw new Error('btn-select-surface not found');

        await userEvent.click(selectSurfaceBtn);

        const selectedName = document.querySelector<HTMLElement>('.selected-token-name');
        expect(selectedName?.textContent).toBe('--surface');

        const input = document.querySelector<HTMLInputElement>('.input-token-value');
        const applyBtn = document.querySelector<HTMLButtonElement>('.btn-apply-token');
        if (!input || !applyBtn) throw new Error('Editor input or apply button not found');

        await userEvent.clear(input);
        await userEvent.type(input, '#334455');
        await userEvent.click(applyBtn);

        expect(document.documentElement.style.getPropertyValue('--surface')).toBe('#334455');
        const badge = document.querySelector<HTMLElement>('.palette-mode-badge');
        expect(badge?.textContent).toBe('custom');

        site.dispose();
    });

    it('renders the live preview view with themed elements', async () => {
        const site = await mountPart({
            parts: [
                { id: 'theme', contribution: ThemeExtension },
                { id: 'palette', contribution: PaletteApp },
            ],
        });

        await new Promise((r) => setTimeout(r, 40));

        const previewTitle = document.querySelector<HTMLElement>('.preview-title');
        expect(previewTitle?.textContent).toBe('Live Theme Preview');

        const primaryText = document.querySelector<HTMLElement>('.preview-text-primary');
        expect(primaryText?.textContent).toContain('Primary text');

        const badgeAccent = document.querySelector<HTMLElement>('.preview-badge-accent');
        expect(badgeAccent?.textContent).toBe('Active');

        const noticeInfo = document.querySelector<HTMLElement>('.preview-notice-info');
        expect(noticeInfo?.textContent).toContain('Info alert');

        site.dispose();
    });

    it('fails cleanly with a legible error when theme is absent', async () => {
        // Mount palette alone WITHOUT theme extension
        const site = await mountPart({
            parts: [{ id: 'palette', contribution: PaletteApp }],
        });

        site.assertSingleFramework();

        // Process should exist in process table with state 'failed'
        const process = site.kernel.processes.find((p) => p.applicationId === 'palette');
        expect(process).toBeDefined();
        expect(process?.state).toBe('failed');
        expect(process?.error).toBeDefined();
        expect(process?.error?.message).toContain('asked for provider "theme", which is not available');
        expect(process?.error?.message).toContain('Its Extension may have failed to activate');

        // No windows should be opened for the failed application
        expect(site.manager.windows().length).toBe(0);

        site.dispose();
    });

    it('declares commands, views statically on the class', () => {
        const app = new PaletteApp();
        expect(app.needs).toEqual(['state', 'commands', 'windows', 'log']);
        expect(app.consumes).toBeDefined();
        expect(app.consumes?.[0]?.id).toBe('theme');
        expect(app.commands?.map((c) => c.id)).toContain('palette.setDark');
        expect(app.commands?.map((c) => c.id)).toContain('palette.setLight');
        expect(app.commands?.map((c) => c.id)).toContain('palette.selectToken');
        expect(app.commands?.map((c) => c.id)).toContain('palette.apply');
        expect(app.views?.map((v) => v.id)).toEqual(['tokens', 'editor', 'preview']);
    });
});
