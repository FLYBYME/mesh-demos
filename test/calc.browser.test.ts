import { describe, expect, it, afterEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { flushSync } from '@flybyme/mesh-web';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import CalcApp, { CALC } from '../src/calc/index.js';

describe('CalcApp browser tests', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('boots, starts the Application, and provides the CalcApi', async () => {
        const site = await mountPart({
            parts: [{ id: 'calc', contribution: CalcApp }],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'calc');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        const api = site.kernel.provided(CALC);
        expect(api).toBeDefined();
        expect(api?.display()).toBe('0');
        expect(api?.formula()).toBe('');
        expect(api?.history()).toEqual([]);
        expect(api?.historyCount()).toBe(0);

        site.dispose();
    });

    it('renders keypad and history views into the DOM', async () => {
        const site = await mountPart({
            parts: [{ id: 'calc', contribution: CalcApp }],
        });

        expect(site.manager.windows().length).toBe(2);
        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('calc');
        expect(views).toContain('history');

        // Keypad view
        const title = document.querySelector<HTMLElement>('.calc-title');
        expect(title?.textContent).toBe('Calculator');
        const mainDisplay = document.querySelector<HTMLElement>('.calc-main-display');
        expect(mainDisplay?.textContent).toBe('0');

        // History view
        const historyTitle = document.querySelector<HTMLElement>('.history-title');
        expect(historyTitle?.textContent).toBe('History');
        const emptyCard = document.querySelector<HTMLElement>('.empty-history-card');
        expect(emptyCard?.textContent).toBe('No calculations yet.');

        site.dispose();
    });

    it('performs basic arithmetic via keypad buttons', async () => {
        const site = await mountPart({
            parts: [{ id: 'calc', contribution: CalcApp }],
        });

        const calcWin = site.manager.windows().find((w) => w.view === 'calc');
        if (calcWin) site.manager.focus(calcWin.id);

        const btn7 = document.querySelector<HTMLButtonElement>('.btn-calc-digit-7');
        const btnAdd = document.querySelector<HTMLButtonElement>('.btn-calc-op-add');
        const btn8 = document.querySelector<HTMLButtonElement>('.btn-calc-digit-8');
        const btnEq = document.querySelector<HTMLButtonElement>('.btn-calc-calculate');

        if (!btn7 || !btnAdd || !btn8 || !btnEq) throw new Error('Keypad buttons not found');

        await userEvent.click(btn7);
        const displayAfter7 = document.querySelector<HTMLElement>('.calc-main-display');
        expect(displayAfter7?.textContent).toBe('7');

        await userEvent.click(btnAdd);
        const formulaAfterAdd = document.querySelector<HTMLElement>('.calc-formula-display');
        expect(formulaAfterAdd?.textContent).toBe('7 +');

        await userEvent.click(btn8);
        const displayAfter8 = document.querySelector<HTMLElement>('.calc-main-display');
        expect(displayAfter8?.textContent).toBe('8');

        await userEvent.click(btnEq);
        const displayResult = document.querySelector<HTMLElement>('.calc-main-display');
        expect(displayResult?.textContent).toBe('15');

        // Check history updated
        const historyItems = document.querySelectorAll<HTMLElement>('.calc-history-item');
        expect(historyItems.length).toBe(1);
        const expr = document.querySelector<HTMLElement>('.history-item-expression');
        expect(expr?.textContent).toBe('7 + 8');
        const res = document.querySelector<HTMLElement>('.history-item-result');
        expect(res?.textContent).toBe('= 15');

        site.dispose();
    });

    it('handles decimal inputs and backspace', async () => {
        const site = await mountPart({
            parts: [{ id: 'calc', contribution: CalcApp }],
        });

        const calcWin = site.manager.windows().find((w) => w.view === 'calc');
        if (calcWin) site.manager.focus(calcWin.id);

        const btn4 = document.querySelector<HTMLButtonElement>('.btn-calc-digit-4');
        const btnDot = document.querySelector<HTMLButtonElement>('.btn-calc-decimal');
        const btn5 = document.querySelector<HTMLButtonElement>('.btn-calc-digit-5');
        const btnBack = document.querySelector<HTMLButtonElement>('.btn-calc-backspace');

        if (!btn4 || !btnDot || !btn5 || !btnBack) throw new Error('Buttons not found');

        await userEvent.click(btn4);
        await userEvent.click(btnDot);
        await userEvent.click(btn5);
        const display = document.querySelector<HTMLElement>('.calc-main-display');
        expect(display?.textContent).toBe('4.5');

        await userEvent.click(btnBack);
        expect(display?.textContent).toBe('4.');

        await userEvent.click(btnBack);
        expect(display?.textContent).toBe('4');

        site.dispose();
    });

    it('supports direct keyboard expression evaluation via form commit', async () => {
        const site = await mountPart({
            parts: [{ id: 'calc', contribution: CalcApp }],
        });

        const calcWin = site.manager.windows().find((w) => w.view === 'calc');
        if (calcWin) site.manager.focus(calcWin.id);

        const exprInput = document.querySelector<HTMLInputElement>('.calc-expr-input');
        const evalBtn = document.querySelector<HTMLButtonElement>('.btn-calc-eval-expr');
        if (!exprInput || !evalBtn) throw new Error('Expression elements not found');

        await userEvent.type(exprInput, '(10 + 5) * 4 - 2');
        await userEvent.click(evalBtn);

        const display = document.querySelector<HTMLElement>('.calc-main-display');
        expect(display?.textContent).toBe('58');

        const historyItems = document.querySelectorAll<HTMLElement>('.calc-history-item');
        expect(historyItems.length).toBe(1);

        site.dispose();
    });

    it('handles division by zero and sign toggling', async () => {
        const site = await mountPart({
            parts: [{ id: 'calc', contribution: CalcApp }],
        });

        const calcWin = site.manager.windows().find((w) => w.view === 'calc');
        if (calcWin) site.manager.focus(calcWin.id);

        const btn9 = document.querySelector<HTMLButtonElement>('.btn-calc-digit-9');
        const btnSign = document.querySelector<HTMLButtonElement>('.btn-calc-toggle-sign');
        const btnDiv = document.querySelector<HTMLButtonElement>('.btn-calc-op-div');
        const btn0 = document.querySelector<HTMLButtonElement>('.btn-calc-digit-0');
        const btnEq = document.querySelector<HTMLButtonElement>('.btn-calc-calculate');

        if (!btn9 || !btnSign || !btnDiv || !btn0 || !btnEq) throw new Error('Buttons not found');

        await userEvent.click(btn9);
        await userEvent.click(btnSign);
        const display = document.querySelector<HTMLElement>('.calc-main-display');
        expect(display?.textContent).toBe('-9');

        await userEvent.click(btnDiv);
        await userEvent.click(btn0);
        await userEvent.click(btnEq);
        expect(display?.textContent).toBe('Error');

        site.dispose();
    });

    it('recalls past calculation from history into current display and clears history', async () => {
        const site = await mountPart({
            parts: [{ id: 'calc', contribution: CalcApp }],
        });

        const api = site.kernel.provided(CALC);
        if (!api) throw new Error('CalcApi missing');

        // Add 2 calculations
        api.evaluateExpression('100 * 2');
        api.evaluateExpression('50 + 25');
        flushSync();

        expect(api.historyCount()).toBe(2);

        // Focus history window
        const histWin = site.manager.windows().find((w) => w.view === 'history');
        if (histWin) site.manager.focus(histWin.id);

        const recallButtons = document.querySelectorAll<HTMLButtonElement>('.btn-calc-recall');
        expect(recallButtons.length).toBe(2);

        // Recall the first calculation (item 2: 100 * 2 = 200)
        const secondRecallBtn = recallButtons[1];
        if (!secondRecallBtn) throw new Error('Second recall button missing');
        await userEvent.click(secondRecallBtn);

        expect(api.display()).toBe('200');

        // Clear history
        const clearHistBtn = document.querySelector<HTMLButtonElement>('.btn-calc-clear-history');
        if (!clearHistBtn) throw new Error('Clear history button missing');
        await userEvent.click(clearHistBtn);

        expect(api.historyCount()).toBe(0);
        const emptyCard = document.querySelector<HTMLElement>('.empty-history-card');
        expect(emptyCard?.textContent).toBe('No calculations yet.');

        site.dispose();
    });

    it('declares commands, keys, views, and layout statically on the class', () => {
        const app = new CalcApp();
        expect(app.commands.map((c) => c.id)).toContain('calc.calculate');
        expect(app.commands.map((c) => c.id)).toContain('calc.clear');
        expect(app.commands.map((c) => c.id)).toContain('calc.digit');
        expect(app.keys.map((k) => k.command)).toContain('calc.calculate');
        expect(app.keys.map((k) => k.command)).toContain('calc.clear');
        expect(app.views.map((v) => v.id)).toEqual(['calc', 'history']);
        expect(app.layout).toBeDefined();
    });
});
