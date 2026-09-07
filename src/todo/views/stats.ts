import {
    command,
    element,
    text,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { TodoApi } from '../contract.js';

export function renderStatsView(vx: ViewContext<Record<string, never>, TodoApi>): Node {
    return element('Stack', {
        props: {
            class: 'todo-stats-pane',
            gap: 12,
            style: { padding: '16px', display: 'flex', 'flex-direction': 'column', gap: '12px' },
        },
        children: [
            element('Heading', {
                props: { class: 'stats-heading' },
                children: [text('Todo Overview')],
            }),
            element('Card', {
                props: {
                    class: 'stats-card',
                    style: {
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '6px',
                        padding: '10px',
                        background: '#161b22',
                        'border-radius': '4px',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { children: [text('Total items:')] }),
                            element('Badge', {
                                props: { class: 'badge total-count' },
                                children: [text(() => String(vx.app.totalCount()))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { children: [text('Outstanding:')] }),
                            element('Badge', {
                                props: { class: 'badge outstanding-count' },
                                children: [text(() => String(vx.app.outstandingCount()))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { children: [text('Completed:')] }),
                            element('Badge', {
                                props: { class: 'badge completed-count' },
                                children: [text(() => String(vx.app.completedCount()))],
                            }),
                        ],
                    }),
                ],
            }),
            element('Heading', {
                props: { class: 'actions-heading' },
                children: [text('Quick Actions')],
            }),
            element('Stack', {
                props: { gap: 8, style: { display: 'flex', 'flex-direction': 'column', gap: '8px' } },
                children: [
                    element('Button', {
                        props: { class: 'btn-mark-all-done' },
                        intents: { activate: { action: command('todo.markAllDone') } },
                        children: [text('Mark All Done')],
                    }),
                    element('Button', {
                        props: { class: 'btn-mark-all-active' },
                        intents: { activate: { action: command('todo.markAllActive') } },
                        children: [text('Mark All Active')],
                    }),
                    element('Button', {
                        props: { class: 'btn-clear-completed' },
                        intents: { activate: { action: command('todo.clearCompleted') } },
                        children: [text('Clear Completed')],
                    }),
                    element('Button', {
                        props: { class: 'btn-open-todos' },
                        intents: { activate: { action: command('todo.openTodos') } },
                        children: [text('Open Todos Window')],
                    }),
                ],
            }),
        ],
    });
}
