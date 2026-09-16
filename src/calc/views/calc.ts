/**
 * Calculator main view: Display and keypad.
 */

import { element, text, type Node } from '@flybyme/mesh-web';
import type { CalcView } from '../contract.js';

export function renderCalcView(vx: CalcView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'calc-container' },
        children: [
            // Header / Navigation
            element('Row', {
                props: { class: 'calc-header' },
                children: [
                    element('Row', {
                        props: { class: 'calc-nav' },
                        children: [
                            element('Button', {
                                props: { class: 'calc-nav-btn active' },
                                children: [text('Calculator')],
                            }),
                            element('Button', {
                                props: { class: 'calc-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openHistory()) } },
                                children: [text('History')],
                            }),
                        ],
                    }),
                ],
            }),

            // Display
            element('Stack', {
                props: { class: 'calc-display' },
                children: [
                    element('Text', {
                        props: { class: 'calc-formula' },
                        children: [text(() => app.formula())],
                    }),
                    element('Text', {
                        props: { class: 'calc-digits' },
                        children: [text(() => app.display())],
                    }),
                ],
            }),

            // Keypad Grid
            element('Stack', {
                props: { class: 'calc-grid' },
                children: [
                    // Row 1: C, CE, +/-, ÷
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-action calc-btn-clear' },
                        intents: { activate: { action: vx.on(() => app.clear()) } },
                        children: [text('C')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-action' },
                        intents: { activate: { action: vx.on(() => app.clearEntry()) } },
                        children: [text('CE')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-action' },
                        intents: { activate: { action: vx.on(() => app.toggleSign()) } },
                        children: [text('+/-')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-op' },
                        intents: { activate: { action: vx.on(() => app.setOperation('/')) } },
                        children: [text('÷')],
                    }),

                    // Row 2: 7, 8, 9, ×
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('7')) } },
                        children: [text('7')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('8')) } },
                        children: [text('8')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('9')) } },
                        children: [text('9')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-op' },
                        intents: { activate: { action: vx.on(() => app.setOperation('*')) } },
                        children: [text('×')],
                    }),

                    // Row 3: 4, 5, 6, −
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('4')) } },
                        children: [text('4')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('5')) } },
                        children: [text('5')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('6')) } },
                        children: [text('6')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-op' },
                        intents: { activate: { action: vx.on(() => app.setOperation('-')) } },
                        children: [text('−')],
                    }),

                    // Row 4: 1, 2, 3, +
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('1')) } },
                        children: [text('1')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('2')) } },
                        children: [text('2')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('3')) } },
                        children: [text('3')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-op' },
                        intents: { activate: { action: vx.on(() => app.setOperation('+')) } },
                        children: [text('+')],
                    }),

                    // Row 5: 0, ., ⌫, =
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDigit('0')) } },
                        children: [text('0')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-digit' },
                        intents: { activate: { action: vx.on(() => app.inputDecimal()) } },
                        children: [text('.')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-action' },
                        intents: { activate: { action: vx.on(() => app.backspace()) } },
                        children: [text('⌫')],
                    }),
                    element('Button', {
                        props: { class: 'calc-btn calc-btn-equals' },
                        intents: { activate: { action: vx.on(() => app.calculate()) } },
                        children: [text('=')],
                    }),
                ],
            }),
        ],
    });
}
