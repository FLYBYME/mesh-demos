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
    type Context,
    type Json,
    type Node,
    type ProviderToken,
    type Signal,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types & contract

export interface TodoItem {
    readonly id: string;
    readonly title: string;
    readonly done: boolean;
}

export interface TodoApi {
    readonly items: Signal<readonly TodoItem[]>;
    readonly draft: Signal<string>;
    readonly draftRevision: Signal<number>;
    readonly totalCount: () => number;
    readonly outstandingCount: () => number;
    readonly completedCount: () => number;
    add(title?: string): void;
    toggle(id: string): void;
    remove(id: string): void;
    setDraft(text: string): void;
    clearCompleted(): void;
    markAllDone(): void;
    markAllActive(): void;
}

export const TODO: ProviderToken<TodoApi> = provider<TodoApi>('mesh-todo');

const NEEDS = needs('state', 'commands', 'windows', 'log');

// ---------------------------------------------------------------------------- views

function renderTodosView(vx: ViewContext<Record<string, never>, TodoApi>): Node {
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

function renderStatsView(vx: ViewContext<Record<string, never>, TodoApi>): Node {
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

// ---------------------------------------------------------------------------- application

export default class TodoApp implements Application<typeof NEEDS, readonly [], typeof TODO> {
    readonly needs = NEEDS;
    readonly provides = TODO;

    readonly commands = [
        { id: 'todo.add', title: 'Todo: Add Item' },
        { id: 'todo.toggle', title: 'Todo: Toggle Item' },
        { id: 'todo.remove', title: 'Todo: Remove Item' },
        { id: 'todo.setDraft', title: 'Todo: Set Input Draft' },
        { id: 'todo.clearCompleted', title: 'Todo: Clear Completed Items' },
        { id: 'todo.markAllDone', title: 'Todo: Mark All as Done' },
        { id: 'todo.markAllActive', title: 'Todo: Mark All as Active' },
        { id: 'todo.openTodos', title: 'Todo: Open Todos Window' },
        { id: 'todo.openStats', title: 'Todo: Open Stats Window' },
    ] as const;

    readonly keys = [
        { command: 'todo.add', keys: 'ctrl+enter' },
        { command: 'todo.clearCompleted', keys: 'ctrl+shift+c' },
    ];

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'main' }, size: 2 },
            { node: { tile: 'sidebar' }, size: 1 },
        ],
    });

    readonly views: readonly ViewDecl<never, never>[] = [
        {
            id: 'todos',
            title: 'Todo List',
            tile: 'main',
            instances: 'one',
            defaultSize: { width: 440, height: 500 },
            minSize: { width: 320, height: 260 },
            render(vx: ViewContext<Record<string, never>, TodoApi>): Node {
                return renderTodosView(vx);
            },
        },
        {
            id: 'stats',
            title: 'Todo Stats',
            tile: 'sidebar',
            instances: 'one',
            defaultSize: { width: 320, height: 420 },
            minSize: { width: 240, height: 220 },
            render(vx: ViewContext<Record<string, never>, TodoApi>): Node {
                return renderStatsView(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<TodoApi> {
        cx.log.info('TodoApp starting');

        const items = cx.state.signal<readonly TodoItem[]>([]);
        const draft = cx.state.signal<string>('');
        const draftRevision = cx.state.signal<number>(0);

        let nextId = 0;

        const add = (explicitTitle?: Json): void => {
            const title =
                typeof explicitTitle === 'string' && explicitTitle.trim().length > 0
                    ? explicitTitle.trim()
                    : draft().trim();
            if (title.length === 0) return;
            items.set([...items(), { id: `todo-${String(++nextId)}`, title, done: false }]);
            draft.set('');
            draftRevision.set(draftRevision() + 1);
        };

        const toggle = (id: Json): void => {
            const idStr = String(id);
            items.set(items().map((item) => (item.id === idStr ? { ...item, done: !item.done } : item)));
        };

        const remove = (id: Json): void => {
            const idStr = String(id);
            items.set(items().filter((item) => item.id !== idStr));
        };

        const setDraft = (textVal: Json): void => {
            draft.set(typeof textVal === 'string' ? textVal : '');
        };

        const clearCompleted = (): void => {
            items.set(items().filter((item) => !item.done));
        };

        const markAllDone = (): void => {
            items.set(items().map((item) => (item.done ? item : { ...item, done: true })));
        };

        const markAllActive = (): void => {
            items.set(items().map((item) => (!item.done ? item : { ...item, done: false })));
        };

        const totalCount = cx.state.computed(() => items().length);
        const outstandingCount = cx.state.computed(() => items().filter((i) => !i.done).length);
        const completedCount = cx.state.computed(() => items().filter((i) => i.done).length);

        cx.commands.implement('todo.add', (title) => {
            add(title);
        });
        cx.commands.implement('todo.toggle', (id) => {
            toggle(id);
        });
        cx.commands.implement('todo.remove', (id) => {
            remove(id);
        });
        cx.commands.implement('todo.setDraft', (textVal) => {
            setDraft(textVal);
        });
        cx.commands.implement('todo.clearCompleted', () => {
            clearCompleted();
        });
        cx.commands.implement('todo.markAllDone', () => {
            markAllDone();
        });
        cx.commands.implement('todo.markAllActive', () => {
            markAllActive();
        });
        cx.commands.implement('todo.openTodos', () => {
            cx.windows.open({ view: 'todos' });
        });
        cx.commands.implement('todo.openStats', () => {
            cx.windows.open({ view: 'stats' });
        });

        // Open initial windows after start() resolves so entry.api is populated
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'todos' });
                cx.windows.open({ view: 'stats' });
            }
        });

        return {
            items,
            draft,
            draftRevision,
            totalCount,
            outstandingCount,
            completedCount,
            add,
            toggle,
            remove,
            setDraft,
            clearCompleted,
            markAllDone,
            markAllActive,
        };
    }
}
