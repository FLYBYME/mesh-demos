import {
    command,
    each,
    element,
    needs,
    provider,
    text,
    tiles,
    when,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ProviderToken,
    type Signal,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types & contract

export interface CalcHistoryItem {
    readonly id: string;
    readonly expression: string;
    readonly result: string;
    readonly timestamp: number;
}

export interface CalcApi {
    readonly display: Signal<string>;
    readonly formula: Signal<string>;
    readonly previousValue: Signal<string | null>;
    readonly operation: Signal<string | null>;
    readonly expressionText: Signal<string>;
    readonly expressionRevision: Signal<number>;
    readonly history: Signal<readonly CalcHistoryItem[]>;
    readonly historyCount: () => number;

    inputDigit(digit: string): void;
    inputDecimal(): void;
    setOperation(op: string): void;
    calculate(): void;
    clear(): void;
    clearEntry(): void;
    toggleSign(): void;
    backspace(): void;
    setExpressionText(expr: string): void;
    evaluateExpression(expr: string): void;
    recallHistory(id: string): void;
    clearHistory(): void;
}

export const CALC: ProviderToken<CalcApi> = provider<CalcApi>('mesh-calc');

const NEEDS = needs('state', 'commands', 'windows', 'log');

// ---------------------------------------------------------------------------- arithmetic parser

/**
 * Safely evaluates simple math expressions (numbers, +, -, *, /, decimals, parens).
 * Avoids eval/Function for complete safety across sandboxes.
 */
function evaluateMath(expression: string): { success: true; result: number } | { success: false; error: string } {
    const cleaned = expression.replace(/\s+/g, '');
    if (cleaned.length === 0) {
        return { success: false, error: 'Empty expression' };
    }

    // Tokenize
    const tokens: string[] = [];
    let i = 0;
    while (i < cleaned.length) {
        const c = cleaned[i];
        if (c === undefined) break;

        if (c === '+' || c === '-' || c === '*' || c === '/' || c === '(' || c === ')') {
            // Handle negative numbers at start or after operator
            if (c === '-' && (tokens.length === 0 || tokens[tokens.length - 1] === '(' || ['+', '-', '*', '/'].includes(tokens[tokens.length - 1] ?? ''))) {
                let numStr = '-';
                i++;
                while (i < cleaned.length && /[0-9.]/.test(cleaned[i] ?? '')) {
                    numStr += cleaned[i] ?? '';
                    i++;
                }
                if (numStr === '-') return { success: false, error: 'Invalid negative number' };
                tokens.push(numStr);
                continue;
            }
            tokens.push(c);
            i++;
        } else if (/[0-9.]/.test(c)) {
            let numStr = '';
            while (i < cleaned.length && /[0-9.]/.test(cleaned[i] ?? '')) {
                numStr += cleaned[i] ?? '';
                i++;
            }
            tokens.push(numStr);
        } else {
            return { success: false, error: `Invalid character: ${c}` };
        }
    }

    // Shunting-yard algorithm to RPN
    const outputQueue: string[] = [];
    const operatorStack: string[] = [];
    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

    for (const token of tokens) {
        if (!isNaN(Number(token))) {
            outputQueue.push(token);
        } else if (token in precedence) {
            const tokenPrec = precedence[token] ?? 0;
            while (operatorStack.length > 0) {
                const top = operatorStack[operatorStack.length - 1] ?? '';
                const topPrec = precedence[top] ?? 0;
                if (top !== '(' && topPrec >= tokenPrec) {
                    outputQueue.push(operatorStack.pop() ?? '');
                } else {
                    break;
                }
            }
            operatorStack.push(token);
        } else if (token === '(') {
            operatorStack.push(token);
        } else if (token === ')') {
            let foundParen = false;
            while (operatorStack.length > 0) {
                const op = operatorStack.pop() ?? '';
                if (op === '(') {
                    foundParen = true;
                    break;
                }
                outputQueue.push(op);
            }
            if (!foundParen) return { success: false, error: 'Mismatched parentheses' };
        }
    }

    while (operatorStack.length > 0) {
        const op = operatorStack.pop() ?? '';
        if (op === '(' || op === ')') return { success: false, error: 'Mismatched parentheses' };
        outputQueue.push(op);
    }

    // Evaluate RPN
    const evalStack: number[] = [];
    for (const token of outputQueue) {
        if (!isNaN(Number(token))) {
            evalStack.push(Number(token));
        } else if (token in precedence) {
            const b = evalStack.pop();
            const a = evalStack.pop();
            if (a === undefined || b === undefined) return { success: false, error: 'Malformed expression' };

            let res: number;
            if (token === '+') res = a + b;
            else if (token === '-') res = a - b;
            else if (token === '*') res = a * b;
            else if (token === '/') {
                if (b === 0) return { success: false, error: 'Division by zero' };
                res = a / b;
            } else {
                return { success: false, error: 'Unknown operator' };
            }
            evalStack.push(res);
        }
    }

    if (evalStack.length !== 1) return { success: false, error: 'Evaluation failed' };
    const finalResult = evalStack[0];
    if (finalResult === undefined || isNaN(finalResult)) return { success: false, error: 'Invalid result' };

    return { success: true, result: finalResult };
}

function formatResult(val: number): string {
    const rounded = Math.round(val * 1e10) / 1e10;
    return String(rounded);
}

// ---------------------------------------------------------------------------- views

function renderKeypadView(vx: ViewContext<Record<string, never>, CalcApi>): Node {
    const btnStyle = {
        padding: '12px 8px',
        'font-size': '16px',
        'font-weight': '600',
        'border-radius': '6px',
        border: '1px solid #30363d',
        background: '#21262d',
        color: '#e6edf3',
        cursor: 'pointer',
        'text-align': 'center',
        flex: '1',
    };

    const opBtnStyle = {
        ...btnStyle,
        background: '#1f6feb',
        border: '1px solid #388bfd',
        color: '#ffffff',
    };

    const funcBtnStyle = {
        ...btnStyle,
        background: '#30363d',
        color: '#f0f6fc',
    };

    return element('Stack', {
        props: {
            class: 'calc-pane calc-keypad-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                background: '#0d1117',
                color: '#e6edf3',
            },
        },
        children: [
            // Title & Status
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: { class: 'calc-title', style: { margin: '0', 'font-size': '18px' } },
                        children: [text('Calculator')],
                    }),
                    element('Badge', {
                        props: { class: 'calc-history-badge', style: { 'font-size': '12px' } },
                        children: [text(() => `${String(vx.app.historyCount())} calculations`)],
                    }),
                ],
            }),

            // Display Screen Card
            element('Card', {
                props: {
                    class: 'calc-screen',
                    style: {
                        padding: '12px 16px',
                        background: '#161b22',
                        border: '1px solid #30363d',
                        'border-radius': '8px',
                        display: 'flex',
                        'flex-direction': 'column',
                        'align-items': 'flex-end',
                        'justify-content': 'center',
                        'min-height': '70px',
                    },
                },
                children: [
                    element('Text', {
                        props: {
                            class: 'calc-formula-display',
                            style: {
                                'font-size': '13px',
                                color: '#8b949e',
                                'min-height': '18px',
                                'word-break': 'break-all',
                            },
                        },
                        children: [text(() => vx.app.formula() || ' ')],
                    }),
                    element('Heading', {
                        props: {
                            class: 'calc-main-display',
                            style: {
                                margin: '0',
                                'font-size': '32px',
                                'font-family': 'monospace',
                                'font-weight': 'bold',
                                color: '#58a6ff',
                                'word-break': 'break-all',
                            },
                        },
                        children: [text(() => vx.app.display())],
                    }),
                ],
            }),

            // Direct keyboard expression input (Form commit)
            element('Form', {
                props: { class: 'calc-expr-form' },
                intents: { commit: { action: command('calc.commitExpr'), preventDefault: true } },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            each(
                                () => [vx.app.expressionRevision()],
                                (rev) => rev,
                                () => element('Input', {
                                    props: {
                                        placeholder: 'Type formula (e.g. 25 * 4 + 10) & press Enter...',
                                        class: 'calc-expr-input',
                                        style: {
                                            flex: '1',
                                            padding: '8px 10px',
                                            'font-size': '13px',
                                            background: '#161b22',
                                            border: '1px solid #30363d',
                                            color: '#e6edf3',
                                            'border-radius': '6px',
                                        },
                                    },
                                    intents: {
                                        change: { action: command('calc.setExpr') },
                                    },
                                }),
                            ),
                            element('Button', {
                                props: {
                                    class: 'btn-calc-eval-expr',
                                    style: {
                                        padding: '8px 14px',
                                        'font-size': '13px',
                                        'font-weight': '600',
                                        background: '#238636',
                                        border: '1px solid #2ea043',
                                        color: '#ffffff',
                                        'border-radius': '6px',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('calc.commitExpr') } },
                                children: [text('Eval =')],
                            }),
                        ],
                    }),
                ],
            }),

            // Keypad Rows (Abusing Stack & Rows to construct grid of buttons)
            element('Stack', {
                props: {
                    class: 'calc-keypad-grid',
                    gap: 8,
                    style: {
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '8px',
                        flex: '1',
                    },
                },
                children: [
                    // Row 1: C, CE, +/-, /
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-calc-clear',
                                    style: { ...funcBtnStyle, color: '#f85149', 'border-color': '#da363388' },
                                },
                                intents: { activate: { action: command('calc.clear') } },
                                children: [text('C')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-clear-entry', style: funcBtnStyle },
                                intents: { activate: { action: command('calc.clearEntry') } },
                                children: [text('CE')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-toggle-sign', style: funcBtnStyle },
                                intents: { activate: { action: command('calc.toggleSign') } },
                                children: [text('+/-')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-op-div', style: opBtnStyle },
                                intents: { activate: { action: command('calc.op', '/') } },
                                children: [text('÷')],
                            }),
                        ],
                    }),

                    // Row 2: 7, 8, 9, *
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px' } },
                        children: [
                            element('Button', {
                                props: { class: 'btn-calc-digit-7', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '7') } },
                                children: [text('7')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-digit-8', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '8') } },
                                children: [text('8')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-digit-9', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '9') } },
                                children: [text('9')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-op-mul', style: opBtnStyle },
                                intents: { activate: { action: command('calc.op', '*') } },
                                children: [text('×')],
                            }),
                        ],
                    }),

                    // Row 3: 4, 5, 6, -
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px' } },
                        children: [
                            element('Button', {
                                props: { class: 'btn-calc-digit-4', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '4') } },
                                children: [text('4')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-digit-5', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '5') } },
                                children: [text('5')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-digit-6', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '6') } },
                                children: [text('6')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-op-sub', style: opBtnStyle },
                                intents: { activate: { action: command('calc.op', '-') } },
                                children: [text('−')],
                            }),
                        ],
                    }),

                    // Row 4: 1, 2, 3, +
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px' } },
                        children: [
                            element('Button', {
                                props: { class: 'btn-calc-digit-1', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '1') } },
                                children: [text('1')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-digit-2', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '2') } },
                                children: [text('2')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-digit-3', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '3') } },
                                children: [text('3')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-op-add', style: opBtnStyle },
                                intents: { activate: { action: command('calc.op', '+') } },
                                children: [text('+')],
                            }),
                        ],
                    }),

                    // Row 5: 0, ., Del, =
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px' } },
                        children: [
                            element('Button', {
                                props: { class: 'btn-calc-digit-0', style: btnStyle },
                                intents: { activate: { action: command('calc.digit', '0') } },
                                children: [text('0')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-decimal', style: btnStyle },
                                intents: { activate: { action: command('calc.decimal') } },
                                children: [text('.')],
                            }),
                            element('Button', {
                                props: { class: 'btn-calc-backspace', style: funcBtnStyle },
                                intents: { activate: { action: command('calc.backspace') } },
                                children: [text('⌫')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-calc-calculate',
                                    style: {
                                        ...btnStyle,
                                        background: '#238636',
                                        border: '1px solid #2ea043',
                                        color: '#ffffff',
                                    },
                                },
                                intents: { activate: { action: command('calc.calculate') } },
                                children: [text('=')],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}

function renderHistoryView(vx: ViewContext<Record<string, never>, CalcApi>): Node {
    return element('Stack', {
        props: {
            class: 'calc-pane calc-history-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                background: '#0d1117',
                color: '#e6edf3',
            },
        },
        children: [
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: { class: 'history-title', style: { margin: '0', 'font-size': '18px' } },
                        children: [text('History')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-calc-clear-history',
                            style: {
                                padding: '4px 10px',
                                'font-size': '12px',
                                background: '#21262d',
                                border: '1px solid #30363d',
                                color: '#f85149',
                                'border-radius': '6px',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('calc.clearHistory') } },
                        children: [text('Clear History')],
                    }),
                ],
            }),
            element('List', {
                props: {
                    class: 'calc-history-list',
                    style: {
                        margin: '0',
                        padding: '0',
                        'list-style': 'none',
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '8px',
                        flex: '1',
                        'overflow-y': 'auto',
                    },
                },
                children: [
                    each(
                        () => vx.app.history(),
                        (item: CalcHistoryItem) => item.id,
                        (item: () => CalcHistoryItem) =>
                            element('ListItem', {
                                props: {
                                    class: 'calc-history-item',
                                    'data-id': () => item().id,
                                    style: {
                                        padding: '10px 12px',
                                        background: '#161b22',
                                        border: '1px solid #30363d',
                                        'border-radius': '6px',
                                        display: 'flex',
                                        'justify-content': 'space-between',
                                        'align-items': 'center',
                                    },
                                },
                                children: [
                                    element('Stack', {
                                        props: { gap: 4, style: { display: 'flex', 'flex-direction': 'column', gap: '2px' } },
                                        children: [
                                            element('Text', {
                                                props: {
                                                    class: 'history-item-expression',
                                                    style: { 'font-size': '12px', color: '#8b949e' },
                                                },
                                                children: [text(() => item().expression)],
                                            }),
                                            element('Text', {
                                                props: {
                                                    class: 'history-item-result',
                                                    style: { 'font-size': '16px', 'font-weight': 'bold', color: '#58a6ff' },
                                                },
                                                children: [text(() => `= ${item().result}`)],
                                            }),
                                        ],
                                    }),
                                    element('Button', {
                                        props: {
                                            class: 'btn-calc-recall',
                                            'data-id': () => item().id,
                                            style: {
                                                padding: '4px 8px',
                                                'font-size': '12px',
                                                background: '#21262d',
                                                border: '1px solid #30363d',
                                                color: '#c9d1d9',
                                                'border-radius': '4px',
                                                cursor: 'pointer',
                                            },
                                        },
                                        intents: { activate: { action: command('calc.recall', item().id) } },
                                        children: [text('Recall')],
                                    }),
                                ],
                            }),
                    ),
                ],
            }),
            when(
                () => vx.app.historyCount() === 0,
                () => element('Card', {
                    props: {
                        class: 'empty-history-card',
                        style: {
                            padding: '16px',
                            background: '#161b22',
                            'border-radius': '6px',
                            'text-align': 'center',
                            color: '#8b949e',
                        },
                    },
                    children: [text('No calculations yet.')],
                }),
            ),
        ],
    });
}

// ---------------------------------------------------------------------------- application

export default class CalcApp implements Application<typeof NEEDS, readonly [], typeof CALC> {
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

    readonly views: readonly ViewDecl<Record<string, never>, CalcApi>[] = [
        {
            id: 'calc',
            title: 'Calculator',
            tile: 'keypad',
            instances: 'one',
            defaultSize: { width: 360, height: 480 },
            minSize: { width: 280, height: 380 },
            render(vx: ViewContext<Record<string, never>, CalcApi>): Node {
                return renderKeypadView(vx);
            },
        },
        {
            id: 'history',
            title: 'Calculation History',
            tile: 'history',
            instances: 'one',
            defaultSize: { width: 300, height: 480 },
            minSize: { width: 240, height: 300 },
            render(vx: ViewContext<Record<string, never>, CalcApi>): Node {
                return renderHistoryView(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<CalcApi> {
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

        return {
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
    }
}
