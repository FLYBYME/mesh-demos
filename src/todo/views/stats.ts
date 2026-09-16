/**
 * Stats view: Progress bar, metrics, and batch actions.
 */

import { element, text, when, type Node } from '@flybyme/mesh-web';
import type { TodoView } from '../contract.js';

export function renderStatsView(vx: TodoView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'todo-container' },
        children: [
            // Header / Navigation
            element('Row', {
                props: { class: 'todo-header' },
                children: [
                    element('Row', {
                        props: { class: 'todo-nav' },
                        children: [
                            element('Button', {
                                props: { class: 'todo-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openTodos()) } },
                                children: [text('Todos')],
                            }),
                            element('Button', {
                                props: { class: 'todo-nav-btn active' },
                                children: [text('Stats')],
                            }),
                        ],
                    }),
                ],
            }),

            // Overview Card
            element('Stack', {
                props: { class: 'todo-stats-card' },
                children: [
                    element('Row', {
                        props: { class: 'todo-metric-row' },
                        children: [
                            element('Text', { children: [text('Completion')] }),
                            element('Text', {
                                props: { class: 'todo-metric-value' },
                                children: [text(() => `${String(app.completionPercentage())}%`)],
                            }),
                        ],
                    }),
                    element('Stack', {
                        props: { class: 'todo-progress-track' },
                        children: [
                            element('Stack', {
                                props: {
                                    class: 'todo-progress-fill',
                                    style: () => ({ width: `${String(app.completionPercentage())}%` }),
                                },
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { class: 'todo-metric-row' },
                        children: [
                            element('Text', { children: [text('Total items')] }),
                            element('Text', {
                                props: { class: 'todo-metric-value' },
                                children: [text(() => String(app.totalCount()))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { class: 'todo-metric-row' },
                        children: [
                            element('Text', { children: [text('Active items')] }),
                            element('Text', {
                                props: { class: 'todo-metric-value' },
                                children: [text(() => String(app.activeCount()))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { class: 'todo-metric-row' },
                        children: [
                            element('Text', { children: [text('Completed items')] }),
                            element('Text', {
                                props: { class: 'todo-metric-value' },
                                children: [text(() => String(app.completedCount()))],
                            }),
                        ],
                    }),
                ],
            }),

            // Batch Actions
            element('Stack', {
                props: { class: 'todo-actions-stack' },
                children: [
                    element('Button', {
                        props: { class: 'todo-action-btn' },
                        intents: { activate: { action: vx.on(() => app.markAllDone()) } },
                        children: [text('Mark All Done')],
                    }),
                    element('Button', {
                        props: { class: 'todo-action-btn' },
                        intents: { activate: { action: vx.on(() => app.markAllActive()) } },
                        children: [text('Mark All Active')],
                    }),
                    when(
                        () => app.completedCount() > 0,
                        () => element('Button', {
                            props: { class: 'todo-action-btn' },
                            intents: { activate: { action: vx.on(() => app.clearCompleted()) } },
                            children: [text('Clear Completed')],
                        }),
                    ),
                ],
            }),
        ],
    });
}
