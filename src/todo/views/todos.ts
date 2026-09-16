/**
 * Main Todos view: Task creation, filtering, toggling, and deletion.
 */

import { each, element, text, when, type Node } from '@flybyme/mesh-web';
import type { TodoItem, TodoView } from '../contract.js';

export function renderTodosView(vx: TodoView): Node {
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
                                props: { class: 'todo-nav-btn active' },
                                children: [text('Todos')],
                            }),
                            element('Button', {
                                props: { class: 'todo-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openStats()) } },
                                children: [text('Stats')],
                            }),
                        ],
                    }),
                ],
            }),

            // Add Input Row
            element('Row', {
                props: { class: 'todo-input-row' },
                children: [
                    element('Input', {
                        props: {
                            class: 'todo-input',
                            placeholder: 'What needs to be done?',
                            value: () => app.draft(),
                        },
                        intents: {
                            change: { action: vx.on((value?: unknown) => app.setDraft(typeof value === 'string' ? value : '')) },
                            commit: { action: vx.on(() => app.add()) },
                        },
                    }),
                    element('Button', {
                        props: { class: 'todo-btn-add' },
                        intents: { activate: { action: vx.on(() => app.add()) } },
                        children: [text('Add')],
                    }),
                ],
            }),

            // Filter Tabs
            element('Row', {
                props: { class: 'todo-filters' },
                children: [
                    element('Button', {
                        props: {
                            class: () => (app.filter() === 'all' ? 'todo-filter-btn active' : 'todo-filter-btn'),
                        },
                        intents: { activate: { action: vx.on(() => app.setFilter('all')) } },
                        children: [
                            text('All'),
                            element('Text', {
                                props: { class: 'todo-filter-badge' },
                                children: [text(() => String(app.totalCount()))],
                            }),
                        ],
                    }),
                    element('Button', {
                        props: {
                            class: () => (app.filter() === 'active' ? 'todo-filter-btn active' : 'todo-filter-btn'),
                        },
                        intents: { activate: { action: vx.on(() => app.setFilter('active')) } },
                        children: [
                            text('Active'),
                            element('Text', {
                                props: { class: 'todo-filter-badge' },
                                children: [text(() => String(app.activeCount()))],
                            }),
                        ],
                    }),
                    element('Button', {
                        props: {
                            class: () => (app.filter() === 'completed' ? 'todo-filter-btn active' : 'todo-filter-btn'),
                        },
                        intents: { activate: { action: vx.on(() => app.setFilter('completed')) } },
                        children: [
                            text('Completed'),
                            element('Text', {
                                props: { class: 'todo-filter-badge' },
                                children: [text(() => String(app.completedCount()))],
                            }),
                        ],
                    }),
                ],
            }),

            // List
            when(
                () => app.filteredItems().length === 0,
                () => element('Text', {
                    props: { class: 'todo-empty' },
                    children: [text(() => (app.totalCount() === 0 ? 'No tasks yet. Add one above!' : 'No tasks match this filter.'))],
                }),
                () => element('Stack', {
                    props: { class: 'todo-list' },
                    children: [
                        each(
                            () => app.filteredItems(),
                            (item: TodoItem) => item.id,
                            (item: () => TodoItem) => element('Row', {
                                props: {
                                    class: () => (item().done ? 'todo-item done' : 'todo-item'),
                                    'data-id': () => item().id,
                                },
                                children: [
                                    element('Button', {
                                        props: {
                                            class: () => (item().done ? 'todo-checkbox checked' : 'todo-checkbox'),
                                            title: () => (item().done ? 'Mark active' : 'Mark done'),
                                        },
                                        intents: { activate: { action: vx.on(() => app.toggle(item().id)) } },
                                        children: [text(() => (item().done ? '✓' : ''))],
                                    }),
                                    element('Text', {
                                        props: { class: 'todo-title' },
                                        children: [text(() => item().title)],
                                    }),
                                    element('Button', {
                                        props: { class: 'todo-btn-delete', title: 'Delete todo' },
                                        intents: { activate: { action: vx.on(() => app.remove(item().id)) } },
                                        children: [text('✕')],
                                    }),
                                ],
                            }),
                        ),
                    ],
                }),
            ),

            // Footer
            element('Row', {
                props: { class: 'todo-footer' },
                children: [
                    element('Text', {
                        props: { class: 'todo-count' },
                        children: [
                            text(() => `${String(app.activeCount())} item${app.activeCount() === 1 ? '' : 's'} left`),
                        ],
                    }),
                    when(
                        () => app.completedCount() > 0,
                        () => element('Button', {
                            props: { class: 'todo-btn-clear' },
                            intents: { activate: { action: vx.on(() => app.clearCompleted()) } },
                            children: [text('Clear completed')],
                        }),
                    ),
                ],
            }),
        ],
    });
}
