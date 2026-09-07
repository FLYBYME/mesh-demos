import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { CalcApi, CalcHistoryItem } from '../contract.js';

export function renderHistoryView(vx: ViewContext<Record<string, never>, CalcApi>): Node {
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
