import {
    needs,
    provider,
    type ProviderToken,
    type ReadonlySignal,
    type Signal,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types & contract

export interface TodoItem {
    readonly id: string;
    readonly title: string;
    readonly done: boolean;
}

export interface TodoApi {
    readonly items: ReadonlySignal<readonly TodoItem[]>;
    readonly totalCount: () => number;
    readonly outstandingCount: () => number;
    readonly completedCount: () => number;
    add(title?: string): void;
    toggle(id: string): void;
    remove(id: string): void;
    clearCompleted(): void;
}

export interface TodoInternal {
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

export const NEEDS = needs('state', 'commands', 'windows', 'log');
