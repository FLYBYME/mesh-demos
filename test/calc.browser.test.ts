/**
 * Browser integration tests for CalcApp.
 *
 * Runs in a real Chromium browser via vitest.browser.config.ts.
 * Verifies:
 * - Booting CalcApp into the kernel via mountPart().
 * - Keypad rendering, digit entry, and operator handling.
 * - Basic and chained arithmetic operations (+, -, *, /).
 * - Floating-point precision formatting (0.1 + 0.2 = 0.3).
 * - Division by zero protection.
 * - Action buttons: Clear (C), Clear Entry (CE), Toggle Sign (+/-), and Backspace (⌫).
 * - Calculation history tape and click-to-recall.
 * - Published commands and API surface.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import type { PartApi } from '@flybyme/mesh-web';

import CalcApp, { type CalcInternal } from '../src/calc/index.js';

let site: Awaited<ReturnType<typeof bootCalc>> | undefined;

afterEach(() => {
    site?.dispose();
    site = undefined;
    cleanup();
    for (const el of document.querySelectorAll('.calc-container')) {
        el.remove();
    }
});

async function bootCalc(views?: readonly string[]) {
    const options = views
        ? {
              parts: [{ id: 'calc', contribution: CalcApp }],
              open: [{ application: 'calc', views }],
          }
        : {
              parts: [{ id: 'calc', contribution: CalcApp }],
          };

    const s = await mountPart(options);
    await s.ready;
    await new Promise((r) => setTimeout(r, 30));
    return s;
}

function getCalcInternal(s: NonNullable<typeof site>): CalcInternal {
    const process = s.kernel.processes.find((p) => p.applicationId === 'calc');
    if (!process || !process.internal) {
        throw new Error('Calc process or internal not found');
    }
    return process.internal as CalcInternal;
}

function findButtonByText(container: Element | Document, label: string): HTMLButtonElement {
    const btns = Array.from(container.querySelectorAll<HTMLButtonElement>('.calc-btn, .calc-nav-btn'));
    const found = btns.find((b) => b.textContent?.trim() === label);
    if (!found) {
        throw new Error(`Button with label "${label}" not found`);
    }
    return found;
}

describe('CalcApp browser integration', () => {
    it('boots into a window and renders calculator screen', async () => {
        site = await bootCalc();

        // 1. Single window opened by default with view 'calc'
        const windows = site.manager.windows();
        expect(windows).toHaveLength(1);
        expect(windows[0]?.view).toBe('calc');

        // 2. Display elements
        const digits = document.querySelector('.calc-digits');
        expect(digits).not.toBeNull();
        expect(digits?.textContent?.trim()).toBe('0');

        const formula = document.querySelector('.calc-formula');
        expect(formula).not.toBeNull();
        expect(formula?.textContent?.trim()).toBe('');

        // 3. Keypad buttons
        const allButtons = document.querySelectorAll('.calc-btn');
        expect(allButtons.length).toBe(20);
    });

    it('performs basic arithmetic: addition and multiplication', async () => {
        site = await bootCalc();
        const digits = document.querySelector('.calc-digits');
        const formula = document.querySelector('.calc-formula');

        // Input 4 2
        findButtonByText(document, '4').click();
        findButtonByText(document, '2').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('42');

        // Operator +
        findButtonByText(document, '+').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(formula?.textContent?.trim()).toBe('42 +');
        expect(digits?.textContent?.trim()).toBe('42');

        // Input 5 8
        findButtonByText(document, '5').click();
        findButtonByText(document, '8').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('58');

        // Equals
        findButtonByText(document, '=').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('100');
        expect(formula?.textContent?.trim()).toBe('42 + 58 =');

        // Chain with × 3
        findButtonByText(document, '×').click();
        findButtonByText(document, '3').click();
        findButtonByText(document, '=').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('300');
        expect(formula?.textContent?.trim()).toBe('100 * 3 =');
    });

    it('handles floating point precision and decimals', async () => {
        site = await bootCalc();
        const digits = document.querySelector('.calc-digits');

        // 0.1 + 0.2 = 0.3
        findButtonByText(document, '0').click();
        findButtonByText(document, '.').click();
        findButtonByText(document, '1').click();
        findButtonByText(document, '+').click();
        findButtonByText(document, '0').click();
        findButtonByText(document, '.').click();
        findButtonByText(document, '2').click();
        findButtonByText(document, '=').click();
        await new Promise((r) => setTimeout(r, 20));

        expect(digits?.textContent?.trim()).toBe('0.3');
    });

    it('safely handles division by zero', async () => {
        site = await bootCalc();
        const digits = document.querySelector('.calc-digits');

        findButtonByText(document, '9').click();
        findButtonByText(document, '÷').click();
        findButtonByText(document, '0').click();
        findButtonByText(document, '=').click();
        await new Promise((r) => setTimeout(r, 20));

        expect(digits?.textContent?.trim()).toBe('Error');
    });

    it('operates action buttons: sign toggle, backspace, and clear', async () => {
        site = await bootCalc();
        const digits = document.querySelector('.calc-digits');
        const formula = document.querySelector('.calc-formula');

        // Input 1 2 5
        findButtonByText(document, '1').click();
        findButtonByText(document, '2').click();
        findButtonByText(document, '5').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('125');

        // Toggle sign to negative
        findButtonByText(document, '+/-').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('-125');

        // Toggle sign back to positive
        findButtonByText(document, '+/-').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('125');

        // Backspace
        findButtonByText(document, '⌫').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('12');

        // Clear Entry
        findButtonByText(document, 'CE').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('0');

        // Clear All
        findButtonByText(document, '9').click();
        findButtonByText(document, '+').click();
        findButtonByText(document, 'C').click();
        await new Promise((r) => setTimeout(r, 20));
        expect(digits?.textContent?.trim()).toBe('0');
        expect(formula?.textContent?.trim()).toBe('');
    });

    it('records calculations to history tape and recalls them', async () => {
        site = await bootCalc();
        const internal = getCalcInternal(site);

        // Perform calculation: 15 * 4 = 60
        findButtonByText(document, '1').click();
        findButtonByText(document, '5').click();
        findButtonByText(document, '×').click();
        findButtonByText(document, '4').click();
        findButtonByText(document, '=').click();
        await new Promise((r) => setTimeout(r, 20));

        // Check history state
        expect(internal.history().length).toBe(1);
        expect(internal.history()[0]?.expression).toBe('15 * 4');
        expect(internal.history()[0]?.result).toBe('60');

        // Switch to History tab
        findButtonByText(document, 'History').click();
        await new Promise((r) => setTimeout(r, 30));

        // Check history window opened
        const historyWindow = site.manager.windows().find((w) => w.view === 'history');
        expect(historyWindow).toBeDefined();

        // Check history item in DOM
        const historyItem = document.querySelector('.calc-history-item');
        expect(historyItem).not.toBeNull();
        expect(historyItem?.textContent).toContain('15 * 4 =');
        expect(historyItem?.textContent).toContain('60');

        // Click to recall item
        (historyItem as HTMLElement)?.click();
        await new Promise((r) => setTimeout(r, 30));

        // Recall should have set display to 60
        expect(internal.display()).toBe('60');
        expect(internal.formula()).toContain('Recalled: 15 * 4');

        // Clear tape
        findButtonByText(document, 'History').click();
        await new Promise((r) => setTimeout(r, 30));
        const clearTapeBtn = findButtonByText(document, 'Clear Tape');
        clearTapeBtn.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.history().length).toBe(0);
        expect(document.querySelector('.calc-history-empty')).not.toBeNull();
    });

    it('exposes published commands through API', async () => {
        site = await bootCalc();
        const process = site.kernel.processes.find((p) => p.applicationId === 'calc');
        expect(process).toBeDefined();

        const api = process?.api as PartApi | undefined;
        expect(api).toBeDefined();
        expect(api?.commands).toBeDefined();

        const internal = getCalcInternal(site);

        // Call commands via API
        await api?.commands.digit?.run({ digit: '7' });
        expect(internal.display()).toBe('7');

        await api?.commands.op?.run({ op: '+' });
        expect(internal.formula()).toBe('7 +');

        await api?.commands.digit?.run({ digit: '8' });
        await api?.commands.calculate?.run(undefined);
        expect(internal.display()).toBe('15');

        await api?.commands.clear?.run(undefined);
        expect(internal.display()).toBe('0');
        expect(internal.formula()).toBe('');
    });
});
