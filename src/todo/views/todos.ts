import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { TodoApi, TodoItem } from '../contract.js';

export function renderTodosView(vx: ViewContext<Record<string, never>, TodoApi>): Node {
    return element('Stack', {
        props: {
            class: 'todo-app-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
            },
        },
        children: [
            element('Heading', {
                props: { class: 'todo-title' },
                children: [text('Todos')],
            }),
            element('Form', {
                props: { class: 'todo-form' },
                intents: { commit: { action: command('todo.add'), preventDefault: true } },
                children: [
                    element('Row', {
                        props: {
                            class: 'todo-input-row',
                            style: { display: 'flex', gap: '8px', 'align-items': 'center' },
                        },
                        children: [
                            each(
                                () => [vx.app.draftRevision()],
                                (rev) => rev,
                                () =>
                                    element('Input', {
                                        props: {
                                            placeholder: 'What needs to be done?',
                                            class: 'todo-input',
                                            style: { flex: '1', padding: '6px 8px' },
                                        },
                                        intents: {
                                            change: { action: command('todo.setDraft') },
                                        },
                                    }),
                            ),
                            element('Button', {
                                props: { class: 'btn-add', style: { padding: '6px 12px' } },
                                intents: { activate: { action: command('todo.add') } },
                                children: [text('Add')],
                            }),
                        ],
                    }),
                ],
            }),
            element('List', {
                props: {
                    class: 'todo-list',
                    style: {
                        margin: '0',
                        padding: '0',
                        'list-style': 'none',
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '6px',
                        flex: '1',
                        'overflow-y': 'auto',
                    },
                },
                children: [
                    each(
                        () => vx.app.items(),
                        (item: TodoItem) => item.id,
                        (item: () => TodoItem) =>
                            element('ListItem', {
                                props: {
                                    class: 'todo-item',
                                    'data-id': () => item().id,
                                    style: {
                                        display: 'flex',
                                        'align-items': 'center',
                                        gap: '8px',
                                        padding: '4px 0',
                                    },
                                },
                                children: [
                                    element('Button', {
                                        props: {
                                            class: 'btn-toggle',
                                            'data-id': () => item().id,
                                            title: () => (item().done ? 'Mark active' : 'Mark done'),
                                        },
                                        intents: { activate: { action: command('todo.toggle', item().id) } },
                                        children: [text(() => (item().done ? '☑' : '☐'))],
                                    }),
                                    element('Text', {
                                        props: {
                                            class: 'todo-label',
                                            style: () => ({
                                                flex: '1',
                                                'text-decoration': item().done ? 'line-through' : 'none',
                                                opacity: item().done ? '0.6' : '1',
                                            }),
                                        },
                                        children: [text(() => item().title)],
                                    }),
                                    when(
                                        () => item().done,
                                        () =>
                                            element('Badge', {
                                                props: { class: 'badge done' },
                                                children: [text('done')],
                                            }),
                                        () =>
                                            element('Badge', {
                                                props: { class: 'badge active' },
                                                children: [text('active')],
                                            }),
                                    ),
                                    element('Button', {
                                        props: {
                                            class: 'btn-remove',
                                            'data-id': () => item().id,
                                            title: 'Remove todo',
                                        },
                                        intents: { activate: { action: command('todo.remove', item().id) } },
                                        children: [text('✕')],
                                    }),
                                ],
                            }),
                    ),
                ],
            }),
            element('Row', {
                props: {
                    class: 'todo-footer',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'border-top': '1px solid #30363d',
                        'padding-top': '8px',
                    },
                },
                children: [
                    element('Text', {
                        props: { class: 'todo-counter' },
                        children: [
                            text(
                                () =>
                                    `${String(vx.app.outstandingCount())} item${vx.app.outstandingCount() === 1 ? '' : 's'} left`,
                            ),
                        ],
                    }),
                    element('Button', {
                        props: { class: 'btn-clear-completed' },
                        intents: { activate: { action: command('todo.clearCompleted') } },
                        children: [text('Clear completed')],
                    }),
                ],
            }),
        ],
    });
}
