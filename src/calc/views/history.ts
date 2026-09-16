/**
 * Calculator history view: Tape of past calculations with recall capability.
 */

import { each, element, text, when, type Node } from '@flybyme/mesh-web';
import type { CalcHistoryItem, CalcView } from '../contract.js';

export function renderHistoryView(vx: CalcView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'calc-container calc-history-container' },
        children: [
            // Header / Navigation
            element('Row', {
                props: { class: 'calc-header' },
                children: [
                    element('Row', {
                        props: { class: 'calc-nav' },
                        children: [
                            element('Button', {
                                props: { class: 'calc-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openCalc()) } },
                                children: [text('Calculator')],
                            }),
                            element('Button', {
                                props: { class: 'calc-nav-btn active' },
                                children: [text('History')],
                            }),
                        ],
                    }),
                    when(
                        () => app.history().length > 0,
                        () => element('Button', {
                            props: { class: 'calc-btn calc-btn-action calc-btn-clear', style: { padding: '6px 12px', fontSize: '13px', minHeight: '32px' } },
                            intents: { activate: { action: vx.on(() => app.clearHistory()) } },
                            children: [text('Clear Tape')],
                        }),
                    ),
                ],
            }),

            // List of items
            when(
                () => app.history().length === 0,
                () => element('Text', {
                    props: { class: 'calc-history-empty' },
                    children: [text('No calculations in tape yet.')],
                }),
                () => element('Stack', {
                    props: { class: 'calc-history-list' },
                    children: [
                        each(
                            () => app.history(),
                            (item: CalcHistoryItem) => item.id,
                            (item: () => CalcHistoryItem) => element('Stack', {
                                props: { class: 'calc-history-item' },
                                intents: { activate: { action: vx.on(() => app.recallHistory(item().id)) } },
                                children: [
                                    element('Text', {
                                        props: { class: 'calc-history-expr' },
                                        children: [text(() => `${item().expression} =`)],
                                    }),
                                    element('Text', {
                                        props: { class: 'calc-history-res' },
                                        children: [text(() => item().result)],
                                    }),
                                ],
                            }),
                        ),
                    ],
                }),
            ),
        ],
    });
}
