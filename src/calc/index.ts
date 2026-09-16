/**
 * Calculator demo application: Keypad, formula bar, and history tape.
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
    CALC,
    CONSUMES,
    NEEDS,
    PUBLISHES,
    type CalcCommands,
    type CalcHistoryItem,
    type CalcInternal,
} from './contract.js';
import { evaluateMath, formatResult } from './math.js';
import { renderCalcView } from './views/calc.js';
import { renderHistoryView } from './views/history.js';

import './calc.css';

export * from './contract.js';
export * from './math.js';

export const calcApi = defineApi({
    id: 'calc',
    exposure: 'local',
    calls: {},
});

export default class CalcApp implements Application<
    typeof NEEDS,
    typeof CONSUMES,
    typeof CALC,
    typeof calcApi,
    CalcInternal
> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = CALC;
    readonly api = calcApi;
    readonly publishes = PUBLISHES;

    readonly commands: readonly CommandDecl[] = [
        { id: 'calc.openCalc', title: 'Calculator: Show Keypad' },
        { id: 'calc.openHistory', title: 'Calculator: Show History' },
        { id: 'calc.digit', title: 'Calculator: Input Digit' },
        { id: 'calc.op', title: 'Calculator: Set Operation' },
        { id: 'calc.calculate', title: 'Calculator: Equals' },
        { id: 'calc.clear', title: 'Calculator: Clear All' },
        { id: 'calc.clearEntry', title: 'Calculator: Clear Entry' },
        { id: 'calc.toggleSign', title: 'Calculator: Toggle Sign' },
        { id: 'calc.backspace', title: 'Calculator: Backspace' },
        { id: 'calc.recall', title: 'Calculator: Recall Calculation' },
        { id: 'calc.clearHistory', title: 'Calculator: Clear History Tape' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, CalcInternal>[] = [
        {
            id: 'calc',
            title: 'Calculator',
            instances: 'one',
            window: {
                defaultSize: { width: 340, height: 480 },
                minSize: { width: 280, height: 380 },
            },
            render: renderCalcView,
        },
        {
            id: 'history',
            title: 'History Tape',
            instances: 'one',
            window: {
                defaultSize: { width: 360, height: 460 },
                minSize: { width: 280, height: 340 },
            },
            render: renderHistoryView,
        },
    ];

    async start(
        cx: Context<typeof NEEDS, typeof CONSUMES, typeof calcApi>,
    ): Promise<{ api: PartApi; internal: CalcInternal }> {
        // Signals
        const display = cx.state.signal('0');
        const formula = cx.state.signal('');
        const previousValue = cx.state.signal<string | null>(null);
        const operation = cx.state.signal<string | null>(null);
        const history = cx.state.signal<readonly CalcHistoryItem[]>([]);

        let isNewEntry = true;
        let historyCounter = 0;

        // Core Calculator Functions
        const inputDigit = (digit: string): void => {
            if (display() === 'Error' || isNewEntry) {
                display.set(digit);
                isNewEntry = false;
                return;
            }

            if (display() === '0') {
                display.set(digit);
            } else {
                display.set(display() + digit);
            }
        };

        const inputDecimal = (): void => {
            if (display() === 'Error' || isNewEntry) {
                display.set('0.');
                isNewEntry = false;
                return;
            }

            if (!display().includes('.')) {
                display.set(display() + '.');
            }
        };

        const executePending = (): boolean => {
            const op = operation();
            const prev = previousValue();
            if (op === null || prev === null) return true;

            const expr = `${prev} ${op} ${display()}`;
            const evaluated = evaluateMath(expr);
            if (!evaluated.success || evaluated.result === undefined) {
                display.set('Error');
                previousValue.set(null);
                operation.set(null);
                formula.set('');
                isNewEntry = true;
                return false;
            }

            const formatted = formatResult(evaluated.result);
            display.set(formatted);
            previousValue.set(formatted);
            return true;
        };

        const setOperation = (op: string): void => {
            if (display() === 'Error') return;

            if (operation() !== null && !isNewEntry) {
                const ok = executePending();
                if (!ok) return;
            } else {
                previousValue.set(display());
            }

            operation.set(op);
            formula.set(`${previousValue() ?? display()} ${op}`);
            isNewEntry = true;
        };

        const calculate = (): void => {
            const op = operation();
            const prev = previousValue();
            if (op === null || prev === null) return;

            const expr = `${prev} ${op} ${display()}`;
            const evaluated = evaluateMath(expr);

            if (!evaluated.success || evaluated.result === undefined) {
                display.set('Error');
                formula.set('');
                previousValue.set(null);
                operation.set(null);
                isNewEntry = true;
                return;
            }

            const formatted = formatResult(evaluated.result);
            formula.set(`${expr} =`);
            display.set(formatted);

            // Record to history tape
            const item: CalcHistoryItem = {
                id: `h-${++historyCounter}`,
                expression: expr,
                result: formatted,
                timestamp: Date.now(),
            };
            history.set([item, ...history()]);

            previousValue.set(null);
            operation.set(null);
            isNewEntry = true;
        };

        const clear = (): void => {
            display.set('0');
            formula.set('');
            previousValue.set(null);
            operation.set(null);
            isNewEntry = true;
        };

        const clearEntry = (): void => {
            display.set('0');
            isNewEntry = true;
        };

        const toggleSign = (): void => {
            const curr = display();
            if (curr === 'Error' || curr === '0') return;
            if (curr.startsWith('-')) {
                display.set(curr.slice(1));
            } else {
                display.set('-' + curr);
            }
        };

        const backspace = (): void => {
            const curr = display();
            if (curr === 'Error' || isNewEntry) return;
            if (curr.length <= 1 || (curr.length === 2 && curr.startsWith('-'))) {
                display.set('0');
                isNewEntry = true;
            } else {
                display.set(curr.slice(0, -1));
            }
        };

        const recallHistory = (id: string): void => {
            const item = history().find((h) => h.id === id);
            if (item !== undefined) {
                display.set(item.result);
                formula.set(`Recalled: ${item.expression}`);
                previousValue.set(null);
                operation.set(null);
                isNewEntry = true;
                openCalc();
            }
        };

        const clearHistory = (): void => {
            history.set([]);
        };

        // Window navigation
        const openCalc = (): void => {
            cx.windows.open({ view: 'calc' });
        };

        const openHistory = (): void => {
            cx.windows.open({ view: 'history' });
        };

        // Published bound commands
        const boundDigit: BoundCommand<{ digit: string }, void> = {
            ...PUBLISHES.commands[0],
            available: () => AVAILABLE,
            run: async ({ digit }) => inputDigit(digit),
        };

        const boundOp: BoundCommand<{ op: string }, void> = {
            ...PUBLISHES.commands[1],
            available: () => AVAILABLE,
            run: async ({ op }) => setOperation(op),
        };

        const boundCalculate: BoundCommand<void, void> = {
            ...PUBLISHES.commands[2],
            available: () => AVAILABLE,
            run: async () => calculate(),
        };

        const boundClear: BoundCommand<void, void> = {
            ...PUBLISHES.commands[3],
            available: () => AVAILABLE,
            run: async () => clear(),
        };

        const boundClearEntry: BoundCommand<void, void> = {
            ...PUBLISHES.commands[4],
            available: () => AVAILABLE,
            run: async () => clearEntry(),
        };

        const boundToggleSign: BoundCommand<void, void> = {
            ...PUBLISHES.commands[5],
            available: () => AVAILABLE,
            run: async () => toggleSign(),
        };

        const boundBackspace: BoundCommand<void, void> = {
            ...PUBLISHES.commands[6],
            available: () => AVAILABLE,
            run: async () => backspace(),
        };

        const boundRecall: BoundCommand<{ id: string }, void> = {
            ...PUBLISHES.commands[7],
            available: () => AVAILABLE,
            run: async ({ id }) => recallHistory(id),
        };

        const boundClearHistory: BoundCommand<void, void> = {
            ...PUBLISHES.commands[8],
            available: () => AVAILABLE,
            run: async () => clearHistory(),
        };

        const commands: CalcCommands = {
            digit: boundDigit,
            op: boundOp,
            calculate: boundCalculate,
            clear: boundClear,
            clearEntry: boundClearEntry,
            toggleSign: boundToggleSign,
            backspace: boundBackspace,
            recall: boundRecall,
            clearHistory: boundClearHistory,
        };

        // Implement palette commands
        cx.commands.implement('calc.openCalc', openCalc);
        cx.commands.implement('calc.openHistory', openHistory);
        cx.commands.implement('calc.digit', (arg) => {
            const d = typeof arg === 'object' && arg !== null && 'digit' in arg && typeof arg.digit === 'string'
                ? arg.digit
                : typeof arg === 'string' ? arg : '0';
            inputDigit(d);
        });
        cx.commands.implement('calc.op', (arg) => {
            const op = typeof arg === 'object' && arg !== null && 'op' in arg && typeof arg.op === 'string'
                ? arg.op
                : typeof arg === 'string' ? arg : '+';
            setOperation(op);
        });
        cx.commands.implement('calc.calculate', calculate);
        cx.commands.implement('calc.clear', clear);
        cx.commands.implement('calc.clearEntry', clearEntry);
        cx.commands.implement('calc.toggleSign', toggleSign);
        cx.commands.implement('calc.backspace', backspace);
        cx.commands.implement('calc.recall', (arg) => {
            const id = typeof arg === 'object' && arg !== null && 'id' in arg && typeof arg.id === 'string'
                ? arg.id
                : typeof arg === 'string' ? arg : '';
            recallHistory(id);
        });
        cx.commands.implement('calc.clearHistory', clearHistory);

        // Defer opening default view if not opened by composition
        setTimeout(() => {
            if (cx.windows.own().length === 0) {
                openCalc();
            }
        }, 0);

        const internal: CalcInternal = {
            display,
            formula,
            previousValue,
            operation,
            history,

            inputDigit,
            inputDecimal,
            setOperation,
            calculate,
            clear,
            clearEntry,
            toggleSign,
            backspace,
            recallHistory,
            clearHistory,

            openCalc,
            openHistory,

            commands,
        };

        const api: PartApi = {
            commands: {
                digit: boundDigit,
                op: boundOp,
                calculate: boundCalculate,
                clear: boundClear,
                clearEntry: boundClearEntry,
                toggleSign: boundToggleSign,
                backspace: boundBackspace,
                recall: boundRecall,
                clearHistory: boundClearHistory,
            },
            components: {},
            state: {},
        };

        return { api, internal };
    }
}
