import {
    tiles,
    type Api,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';
import {
    CALC,
    NEEDS,
    type CalcApi,
    type CalcHistoryItem,
    type CalcInternal,
} from './contract.js';
import { evaluateMath, formatResult } from './math.js';
import { renderCalcView } from './views/calc.js';
import { renderHistoryView } from './views/history.js';

export {
    CALC,
    type CalcApi,
    type CalcHistoryItem,
    type CalcInternal,
} from './contract.js';

// ---------------------------------------------------------------------------- application

export default class CalcApp implements Application<
    typeof NEEDS,
    readonly [],
    typeof CALC,
    Api<Record<string, never>>,
    CalcInternal
> {
    readonly needs = NEEDS;
    readonly provides = CALC;

    readonly commands: readonly CommandDecl[] = [
        { id: 'calc.digit', title: 'Calculator: Input Digit' },
        { id: 'calc.decimal', title: 'Calculator: Input Decimal Point' },
        { id: 'calc.op', title: 'Calculator: Set Arithmetic Operation' },
        { id: 'calc.calculate', title: 'Calculator: Compute Equals' },
        { id: 'calc.clear', title: 'Calculator: Clear All' },
        { id: 'calc.clearEntry', title: 'Calculator: Clear Entry' },
        { id: 'calc.toggleSign', title: 'Calculator: Negate / Toggle Sign' },
        { id: 'calc.backspace', title: 'Calculator: Backspace' },
        { id: 'calc.setExpr', title: 'Calculator: Set Expression Text' },
        { id: 'calc.commitExpr', title: 'Calculator: Evaluate Expression' },
        { id: 'calc.recall', title: 'Calculator: Recall History Item' },
        { id: 'calc.clearHistory', title: 'Calculator: Clear History' },
        { id: 'calc.openKeypad', title: 'Calculator: Open Keypad Window' },
        { id: 'calc.openHistory', title: 'Calculator: Open History Window' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'calc.calculate', keys: 'enter' },
        { command: 'calc.clear', keys: 'escape' },
    ];

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'keypad' }, size: 3 },
            { node: { tile: 'history' }, size: 2 },
        ],
    });

    readonly views: readonly ViewDecl<Record<string, never>, CalcApi, CalcInternal>[] = [
        {
            id: 'calc',
            title: 'Calculator',
            tile: 'keypad',
            instances: 'one',
            defaultSize: { width: 360, height: 480 },
            minSize: { width: 280, height: 380 },
            render(vx: ViewContext<Record<string, never>, CalcApi, CalcInternal>): Node {
                return renderCalcView(vx);
            },
        },
        {
            id: 'history',
            title: 'Calculation History',
            tile: 'history',
            instances: 'one',
            defaultSize: { width: 300, height: 480 },
            minSize: { width: 240, height: 300 },
            render(vx: ViewContext<Record<string, never>, CalcApi, CalcInternal>): Node {
                return renderHistoryView(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<{
        readonly api: CalcApi;
        readonly internal: CalcInternal;
    }> {
        cx.log.info('CalcApp starting');

        const display = cx.state.signal<string>('0');
        const formula = cx.state.signal<string>('');
        const previousValue = cx.state.signal<string | null>(null);
        const operation = cx.state.signal<string | null>(null);
        let isNewEntry = true;

        const expressionText = cx.state.signal<string>('');
        const expressionRevision = cx.state.signal<number>(0);
        const history = cx.state.signal<readonly CalcHistoryItem[]>([]);
        let nextHistoryId = 0;

        const historyCount = cx.state.computed(() => history().length);

        const addHistory = (expr: string, res: string): void => {
            const item: CalcHistoryItem = {
                id: `calc-item-${String(++nextHistoryId)}`,
                expression: expr,
                result: res,
                timestamp: Date.now(),
            };
            history.set([item, ...history()]);
        };

        const inputDigit = (digit: string): void => {
            if (display() === 'Error' || isNewEntry) {
                display.set(digit);
                isNewEntry = false;
            } else {
                if (display() === '0') {
                    display.set(digit);
                } else {
                    display.set(display() + digit);
                }
            }
        };

        const inputDecimal = (): void => {
            if (display() === 'Error' || isNewEntry) {
                display.set('0.');
                isNewEntry = false;
            } else if (!display().includes('.')) {
                display.set(display() + '.');
            }
        };

        const executePending = (): boolean => {
            const op = operation();
            const prev = previousValue();
            if (op === null || prev === null) return true;

            const n1 = Number(prev);
            const n2 = Number(display());
            if (isNaN(n1) || isNaN(n2)) {
                display.set('Error');
                previousValue.set(null);
                operation.set(null);
                return false;
            }

            if (op === '/' && n2 === 0) {
                display.set('Error');
                previousValue.set(null);
                operation.set(null);
                return false;
            }

            let res = 0;
            if (op === '+') res = n1 + n2;
            else if (op === '-') res = n1 - n2;
            else if (op === '*') res = n1 * n2;
            else if (op === '/') res = n1 / n2;

            const formatted = formatResult(res);
            addHistory(`${prev} ${op} ${display()}`, formatted);
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

            const current = display();
            const n1 = Number(prev);
            const n2 = Number(current);

            if (isNaN(n1) || isNaN(n2)) {
                display.set('Error');
                formula.set('');
                previousValue.set(null);
                operation.set(null);
                isNewEntry = true;
                return;
            }

            if (op === '/' && n2 === 0) {
                display.set('Error');
                formula.set(`${prev} / 0 =`);
                previousValue.set(null);
                operation.set(null);
                isNewEntry = true;
                return;
            }

            let res = 0;
            if (op === '+') res = n1 + n2;
            else if (op === '-') res = n1 - n2;
            else if (op === '*') res = n1 * n2;
            else if (op === '/') res = n1 / n2;

            const formatted = formatResult(res);
            formula.set(`${prev} ${op} ${current} =`);
            addHistory(`${prev} ${op} ${current}`, formatted);
            display.set(formatted);
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
            if (display() === 'Error' || display() === '0') return;
            if (display().startsWith('-')) {
                display.set(display().slice(1));
            } else {
                display.set('-' + display());
            }
        };

        const backspace = (): void => {
            if (display() === 'Error' || isNewEntry) return;
            if (display().length <= 1 || (display().length === 2 && display().startsWith('-'))) {
                display.set('0');
                isNewEntry = true;
            } else {
                display.set(display().slice(0, -1));
            }
        };

        const evaluateExpression = (expr: string): void => {
            const res = evaluateMath(expr);
            if (res.success) {
                const formatted = formatResult(res.result);
                display.set(formatted);
                formula.set(`${expr} =`);
                addHistory(expr, formatted);
                previousValue.set(null);
                operation.set(null);
                isNewEntry = true;
                expressionText.set('');
                expressionRevision.set(expressionRevision() + 1);
            } else {
                display.set('Error');
                formula.set(res.error);
                isNewEntry = true;
            }
        };

        const setExpressionText = (textVal: string): void => {
            expressionText.set(textVal);
        };

        const recallHistory = (id: string): void => {
            const item = history().find((h) => h.id === id);
            if (item !== undefined) {
                display.set(item.result);
                formula.set(`Recalled: ${item.expression}`);
                previousValue.set(null);
                operation.set(null);
                isNewEntry = true;
            }
        };

        const clearHistory = (): void => {
            history.set([]);
        };

        // Commands
        cx.commands.implement('calc.digit', (val?: Json) => {
            if (typeof val === 'string') inputDigit(val);
        });
        cx.commands.implement('calc.decimal', () => {
            inputDecimal();
        });
        cx.commands.implement('calc.op', (val?: Json) => {
            if (typeof val === 'string') setOperation(val);
        });
        cx.commands.implement('calc.calculate', () => {
            calculate();
        });
        cx.commands.implement('calc.clear', () => {
            clear();
        });
        cx.commands.implement('calc.clearEntry', () => {
            clearEntry();
        });
        cx.commands.implement('calc.toggleSign', () => {
            toggleSign();
        });
        cx.commands.implement('calc.backspace', () => {
            backspace();
        });
        cx.commands.implement('calc.setExpr', (val?: Json) => {
            setExpressionText(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('calc.commitExpr', () => {
            const expr = expressionText().trim();
            if (expr.length > 0) {
                evaluateExpression(expr);
            }
        });
        cx.commands.implement('calc.recall', (val?: Json) => {
            if (typeof val === 'string') recallHistory(val);
        });
        cx.commands.implement('calc.clearHistory', () => {
            clearHistory();
        });
        cx.commands.implement('calc.openKeypad', () => {
            cx.windows.open({ view: 'calc' });
        });
        cx.commands.implement('calc.openHistory', () => {
            cx.windows.open({ view: 'history' });
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'calc' });
                cx.windows.open({ view: 'history' });
            }
        });

        const api: CalcApi = {
            display,
            formula,
            history,
            historyCount,
            evaluateExpression,
            clear,
            clearHistory,
        };

        const internal: CalcInternal = {
            display,
            formula,
            previousValue,
            operation,
            expressionText,
            expressionRevision,
            history,
            historyCount,
            inputDigit,
            inputDecimal,
            setOperation,
            calculate,
            clear,
            clearEntry,
            toggleSign,
            backspace,
            setExpressionText,
            evaluateExpression,
            recallHistory,
            clearHistory,
        };

        return { api, internal };
    }
}
