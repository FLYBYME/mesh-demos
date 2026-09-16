import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import { memoryProvider } from '@flybyme/mesh-web';
import ThemeExtension from '../src/theme/index.js';
import {
    DARK_TOKENS,
    LIGHT_TOKENS,
    HIGH_CONTRAST_TOKENS,
    THEME_TOKEN,
    THEME_TOKEN_NAMES,
} from '../src/contracts/theme.js';

describe('ThemeExtension browser tests', () => {
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

    it('boots as an extension alone, provides ThemeApi, and injects CSS tokens', async () => {
        const site = await mountPart({
            parts: [{ id: 'theme', contribution: ThemeExtension }],
        });

        site.assertSingleFramework();

        const api = site.kernel.provided(THEME_TOKEN);
        expect(api).toBeDefined();
        expect(api?.mode()).toBe('dark');
        expect(api?.tokens()).toEqual(DARK_TOKENS);

        // Check CSS variables on document.documentElement
        expect(document.documentElement.style.getPropertyValue('--page')).toBe('#0d1117');
        expect(document.documentElement.style.getPropertyValue('--surface')).toBe('#161b22');
        expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#58a6ff');
        expect(document.documentElement.style.getPropertyValue('--ink')).toBe('#e6edf3');

        site.dispose();
    });

    it('switches between presets (light, high-contrast, dark) and restyles document', async () => {
        const site = await mountPart({
            parts: [{ id: 'theme', contribution: ThemeExtension }],
        });

        const api = site.kernel.provided(THEME_TOKEN);
        expect(api).toBeDefined();
        if (!api) throw new Error('ThemeApi not provided');

        // Switch to light
        await api.setMode('light');
        expect(api.mode()).toBe('light');
        expect(api.tokens()).toEqual(LIGHT_TOKENS);
        expect(document.documentElement.style.getPropertyValue('--page')).toBe('#f6f8fa');
        expect(document.documentElement.style.getPropertyValue('--surface')).toBe('#ffffff');
        expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#0969da');

        // Switch to high-contrast
        await api.setMode('high-contrast');
        expect(api.mode()).toBe('high-contrast');
        expect(api.tokens()).toEqual(HIGH_CONTRAST_TOKENS);
        expect(document.documentElement.style.getPropertyValue('--page')).toBe('#000000');
        expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#ffff00');

        // Switch back to dark
        await api.setMode('dark');
        expect(api.mode()).toBe('dark');
        expect(api.tokens()).toEqual(DARK_TOKENS);
        expect(document.documentElement.style.getPropertyValue('--page')).toBe('#0d1117');
        expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#58a6ff');

        site.dispose();
    });

    it('edits individual tokens, sets custom mode, and resets to defaults', async () => {
        const site = await mountPart({
            parts: [{ id: 'theme', contribution: ThemeExtension }],
        });

        const api = site.kernel.provided(THEME_TOKEN);
        expect(api).toBeDefined();
        if (!api) throw new Error('ThemeApi not provided');

        // Edit single token
        await api.setToken('--accent', '#e06c75');
        expect(api.mode()).toBe('custom');
        expect(api.tokens()['--accent']).toBe('#e06c75');
        expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#e06c75');

        // Patch multiple tokens
        await api.setTokens({
            '--surface': '#252525',
            '--page': '#181818',
        });
        expect(api.tokens()['--surface']).toBe('#252525');
        expect(api.tokens()['--page']).toBe('#181818');
        expect(document.documentElement.style.getPropertyValue('--surface')).toBe('#252525');
        expect(document.documentElement.style.getPropertyValue('--page')).toBe('#181818');

        // Reset
        await api.reset();
        expect(api.mode()).toBe('dark');
        expect(api.tokens()).toEqual(DARK_TOKENS);
        expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#58a6ff');

        site.dispose();
    });

    it('persists theme configuration across restarts via StorageProvider', async () => {
        const sharedStorage = memoryProvider('test-storage');

        // First session: change theme and token
        const site1 = await mountPart({
            parts: [
                {
                    id: 'theme',
                    contribution: new ThemeExtension({ storage: sharedStorage }),
                },
            ],
        });

        const api1 = site1.kernel.provided(THEME_TOKEN);
        expect(api1).toBeDefined();
        if (!api1) throw new Error('ThemeApi 1 not provided');

        await api1.setMode('light');
        await api1.setToken('--accent', '#a371f7');

        site1.dispose();

        // Second session: boot with same storage instance
        const site2 = await mountPart({
            parts: [
                {
                    id: 'theme',
                    contribution: new ThemeExtension({ storage: sharedStorage }),
                },
            ],
        });

        const api2 = site2.kernel.provided(THEME_TOKEN);
        expect(api2).toBeDefined();
        if (!api2) throw new Error('ThemeApi 2 not provided');

        // Await async restore from storage
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(api2.mode()).toBe('custom');
        expect(api2.tokens()['--accent']).toBe('#a371f7');
        expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#a371f7');

        site2.dispose();
    });

    it('executes declared commands: toggleMode, setMode, and reset', async () => {
        const site = await mountPart({
            parts: [{ id: 'theme', contribution: ThemeExtension }],
        });

        const api = site.kernel.provided(THEME_TOKEN);
        expect(api).toBeDefined();
        if (!api) throw new Error('ThemeApi not provided');

        // Toggle from dark to light
        const toggleCmd = site.kernel.services.commands.get('theme.toggleMode');
        expect(toggleCmd).toBeDefined();
        await toggleCmd?.run();
        expect(api.mode()).toBe('light');

        // Set mode command to high-contrast
        const setModeCmd = site.kernel.services.commands.get('theme.setMode');
        expect(setModeCmd).toBeDefined();
        await setModeCmd?.run('high-contrast');
        expect(api.mode()).toBe('high-contrast');

        // Reset command
        const resetCmd = site.kernel.services.commands.get('theme.reset');
        expect(resetCmd).toBeDefined();
        await resetCmd?.run();
        expect(api.mode()).toBe('dark');

        site.dispose();
    });
});
