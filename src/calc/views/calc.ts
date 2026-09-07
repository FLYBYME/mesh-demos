import {
    command,
    each,
    element,
    text,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { CalcApi, CalcInternal } from '../contract.js';

export function renderCalcView(vx: ViewContext<Record<string, never>, CalcApi, CalcInternal>): Node {
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
                                () => [vx.internal.expressionRevision()],
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
