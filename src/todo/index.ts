import {
    tiles,
    type Api,
    type Application,
    type Context,
    type Json,
    type Node,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';
import {
    NEEDS,
    TODO,
    type TodoApi,
    type TodoInternal,
    type TodoItem,
} from './contract.js';
import { renderTodosView } from './views/todos.js';
import { renderStatsView } from './views/stats.js';

export { TODO, type TodoApi, type TodoInternal, type TodoItem } from './contract.js';

// ---------------------------------------------------------------------------- application

export default class TodoApp implements Application<
    typeof NEEDS,
    readonly [],
    typeof TODO,
    Api<Record<string, never>>,
    TodoInternal
> {
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

    readonly views: readonly ViewDecl<never, never, never>[] = [
        {
            id: 'todos',
            title: 'Todo List',
            tile: 'main',
            instances: 'one',
            defaultSize: { width: 440, height: 500 },
            minSize: { width: 320, height: 260 },
            render(vx: ViewContext<Record<string, never>, TodoApi, TodoInternal>): Node {
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
            render(vx: ViewContext<Record<string, never>, TodoApi, TodoInternal>): Node {
                return renderStatsView(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<{
        readonly api: TodoApi;
        readonly internal: TodoInternal;
    }> {
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

        const api: TodoApi = {
            items,
            totalCount,
            outstandingCount,
            completedCount,
            add,
            toggle,
            remove,
            clearCompleted,
        };

        const internal: TodoInternal = {
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

        return { api, internal };
    }
}
