/**
 * Contract, types, and schemas for the Todo demo application.
 */

import {
    AVAILABLE,
    needs,
    provider,
    schema,
    type Availability,
    type BoundCommand,
    type PartApi,
    type ProviderToken,
    type Signal,
    type ViewContext,
} from '@flybyme/mesh-web';

export type TodoFilter = 'all' | 'active' | 'completed';

export interface TodoItem {
    readonly id: string;
    readonly title: string;
    readonly done: boolean;
    readonly createdAt: number;
}

export interface TodoCommands {
    readonly add: BoundCommand<{ title: string }, void>;
    readonly toggle: BoundCommand<{ id: string }, void>;
    readonly remove: BoundCommand<{ id: string }, void>;
    readonly clearCompleted: BoundCommand<void, void>;
    readonly markAllDone: BoundCommand<void, void>;
    readonly markAllActive: BoundCommand<void, void>;
    readonly setFilter: BoundCommand<{ filter: TodoFilter }, void>;
}

export const TODO: ProviderToken<PartApi> = provider<PartApi>('todo');

export const NEEDS = needs('state', 'commands', 'windows', 'log');

export const CONSUMES = [] as const;

export const PUBLISHES = {
    commands: [
        {
            action: 'add',
            description: 'Adds a new todo item.',
            input: schema<{ title: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'toggle',
            description: 'Toggles a todo item between completed and active.',
            input: schema<{ id: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'remove',
            description: 'Deletes a todo item by id.',
            input: schema<{ id: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'clearCompleted',
            description: 'Removes all completed todo items.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'markAllDone',
            description: 'Marks all todo items as completed.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'markAllActive',
            description: 'Marks all todo items as active (uncompleted).',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'setFilter',
            description: 'Sets the visible filter (all, active, completed).',
            input: schema<{ filter: TodoFilter }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
    ],
    components: [],
    state: [],
} as const;

export interface TodoInternal {
    readonly items: Signal<readonly TodoItem[]>;
    readonly draft: Signal<string>;
    readonly filter: Signal<TodoFilter>;

    readonly filteredItems: () => readonly TodoItem[];
    readonly totalCount: () => number;
    readonly activeCount: () => number;
    readonly completedCount: () => number;
    readonly completionPercentage: () => number;

    add(title?: string): void;
    toggle(id: string): void;
    remove(id: string): void;
    setDraft(text: string): void;
    setFilter(filter: TodoFilter): void;
    clearCompleted(): void;
    markAllDone(): void;
    markAllActive(): void;

    openTodos(): void;
    openStats(): void;

    commands: TodoCommands;
}

export type TodoView = ViewContext<Record<string, never>, TodoInternal, PartApi>;
