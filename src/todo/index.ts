/**
 * Todo demo application: Task management, filtering, and completion statistics.
 */

import {
    AVAILABLE,
    defineApi,
    type Application,
    type BoundCommand,
    type CommandDecl,
    type Context,
    type PartApi,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    NEEDS,
    CONSUMES,
    PUBLISHES,
    TODO,
    type TodoCommands,
    type TodoFilter,
    type TodoInternal,
    type TodoItem,
} from './contract.js';
import { renderStatsView } from './views/stats.js';
import { renderTodosView } from './views/todos.js';

import './todo.css';

export * from './contract.js';

export const todoApi = defineApi({
    id: 'todo',
    exposure: 'local',
    calls: {},
});

export default class TodoApp implements Application<
    typeof NEEDS,
    typeof CONSUMES,
    typeof TODO,
    typeof todoApi,
    TodoInternal
> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = TODO;
    readonly api = todoApi;
    readonly publishes = PUBLISHES;

    readonly commands: readonly CommandDecl[] = [
        { id: 'todo.openTodos', title: 'Todo: Show Tasks' },
        { id: 'todo.openStats', title: 'Todo: Show Statistics' },
        { id: 'todo.add', title: 'Todo: Add Task' },
        { id: 'todo.toggle', title: 'Todo: Toggle Task' },
        { id: 'todo.remove', title: 'Todo: Remove Task' },
        { id: 'todo.clearCompleted', title: 'Todo: Clear Completed Tasks' },
        { id: 'todo.markAllDone', title: 'Todo: Mark All as Done' },
        { id: 'todo.markAllActive', title: 'Todo: Mark All as Active' },
        { id: 'todo.setFilter', title: 'Todo: Change Filter' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, TodoInternal>[] = [
        {
            id: 'todos',
            title: 'Todos',
            instances: 'one',
            window: {
                defaultSize: { width: 440, height: 520 },
                minSize: { width: 320, height: 300 },
            },
            render: renderTodosView,
        },
        {
            id: 'stats',
            title: 'Todo Stats',
            instances: 'one',
            window: {
                defaultSize: { width: 340, height: 420 },
                minSize: { width: 280, height: 260 },
            },
            render: renderStatsView,
        },
    ];

    async start(
        cx: Context<typeof NEEDS, typeof CONSUMES, typeof todoApi>,
    ): Promise<{ api: PartApi; internal: TodoInternal }> {
        const items = cx.state.signal<readonly TodoItem[]>([]);
        const draft = cx.state.signal('');
        const filter = cx.state.signal<TodoFilter>('all');

        let nextId = 0;

        const totalCount = cx.state.computed(() => items().length);
        const activeCount = cx.state.computed(() => items().filter((i) => !i.done).length);
        const completedCount = cx.state.computed(() => items().filter((i) => i.done).length);
        const completionPercentage = cx.state.computed(() => {
            const total = totalCount();
            return total === 0 ? 0 : Math.round((completedCount() / total) * 100);
        });

        const filteredItems = cx.state.computed(() => {
            const currentFilter = filter();
            const currentItems = items();
            if (currentFilter === 'active') {
                return currentItems.filter((i) => !i.done);
            }
            if (currentFilter === 'completed') {
                return currentItems.filter((i) => i.done);
            }
            return currentItems;
        });

        const add = (explicitTitle?: string): void => {
            const title = (explicitTitle !== undefined && explicitTitle.trim().length > 0
                ? explicitTitle
                : draft()
            ).trim();

            if (title.length === 0) return;

            const newItem: TodoItem = {
                id: `todo-${String(++nextId)}`,
                title,
                done: false,
                createdAt: Date.now(),
            };

            items.set([...items(), newItem]);
            draft.set('');
        };

        const toggle = (id: string): void => {
            items.set(items().map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
        };

        const remove = (id: string): void => {
            items.set(items().filter((item) => item.id !== id));
        };

        const setDraft = (text: string): void => {
            draft.set(text);
        };

        const setFilter = (f: TodoFilter): void => {
            filter.set(f);
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

        const openTodos = (): void => {
            cx.windows.open({ view: 'todos' });
        };

        const openStats = (): void => {
            cx.windows.open({ view: 'stats' });
        };

        // Bound commands
        const boundAdd: BoundCommand<{ title: string }, void> = {
            ...PUBLISHES.commands[0],
            available: () => AVAILABLE,
            run: async ({ title }) => add(title),
        };

        const boundToggle: BoundCommand<{ id: string }, void> = {
            ...PUBLISHES.commands[1],
            available: () => AVAILABLE,
            run: async ({ id }) => toggle(id),
        };

        const boundRemove: BoundCommand<{ id: string }, void> = {
            ...PUBLISHES.commands[2],
            available: () => AVAILABLE,
            run: async ({ id }) => remove(id),
        };

        const boundClearCompleted: BoundCommand<void, void> = {
            ...PUBLISHES.commands[3],
            available: () => AVAILABLE,
            run: async () => clearCompleted(),
        };

        const boundMarkAllDone: BoundCommand<void, void> = {
            ...PUBLISHES.commands[4],
            available: () => AVAILABLE,
            run: async () => markAllDone(),
        };

        const boundMarkAllActive: BoundCommand<void, void> = {
            ...PUBLISHES.commands[5],
            available: () => AVAILABLE,
            run: async () => markAllActive(),
        };

        const boundSetFilter: BoundCommand<{ filter: TodoFilter }, void> = {
            ...PUBLISHES.commands[6],
            available: () => AVAILABLE,
            run: async ({ filter: f }) => setFilter(f),
        };

        const commands: TodoCommands = {
            add: boundAdd,
            toggle: boundToggle,
            remove: boundRemove,
            clearCompleted: boundClearCompleted,
            markAllDone: boundMarkAllDone,
            markAllActive: boundMarkAllActive,
            setFilter: boundSetFilter,
        };

        // Implement palette commands
        cx.commands.implement('todo.openTodos', openTodos);
        cx.commands.implement('todo.openStats', openStats);
        cx.commands.implement('todo.add', (arg) => {
            const title = typeof arg === 'object' && arg !== null && 'title' in arg && typeof arg.title === 'string'
                ? arg.title
                : typeof arg === 'string' ? arg : undefined;
            add(title);
        });
        cx.commands.implement('todo.toggle', (arg) => {
            const id = typeof arg === 'object' && arg !== null && 'id' in arg && typeof arg.id === 'string'
                ? arg.id
                : typeof arg === 'string' ? arg : '';
            toggle(id);
        });
        cx.commands.implement('todo.remove', (arg) => {
            const id = typeof arg === 'object' && arg !== null && 'id' in arg && typeof arg.id === 'string'
                ? arg.id
                : typeof arg === 'string' ? arg : '';
            remove(id);
        });
        cx.commands.implement('todo.clearCompleted', clearCompleted);
        cx.commands.implement('todo.markAllDone', markAllDone);
        cx.commands.implement('todo.markAllActive', markAllActive);
        cx.commands.implement('todo.setFilter', (arg) => {
            const f = typeof arg === 'object' && arg !== null && 'filter' in arg && typeof arg.filter === 'string'
                ? (arg.filter as TodoFilter)
                : (arg as TodoFilter);
            if (f === 'all' || f === 'active' || f === 'completed') {
                setFilter(f);
            }
        });

        // Defer default window opening
        setTimeout(() => {
            if (cx.windows.own().length === 0) {
                openTodos();
            }
        }, 0);

        const internal: TodoInternal = {
            items,
            draft,
            filter,

            filteredItems,
            totalCount,
            activeCount,
            completedCount,
            completionPercentage,

            add,
            toggle,
            remove,
            setDraft,
            setFilter,
            clearCompleted,
            markAllDone,
            markAllActive,

            openTodos,
            openStats,

            commands,
        };

        const api: PartApi = {
            commands: {
                add: boundAdd,
                toggle: boundToggle,
                remove: boundRemove,
                clearCompleted: boundClearCompleted,
                markAllDone: boundMarkAllDone,
                markAllActive: boundMarkAllActive,
                setFilter: boundSetFilter,
            },
            components: {},
            state: {},
        };

        return { api, internal };
    }
}
