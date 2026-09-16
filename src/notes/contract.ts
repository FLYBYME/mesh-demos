/**
 * Contract, types, and schemas for the Notes demo application.
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

export interface Note {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly updatedAt: number;
    readonly formattedDate: string;
}

export interface NotesCommands {
    readonly create: BoundCommand<{ title: string; body: string }, void>;
    readonly update: BoundCommand<{ id: string; title: string; body: string }, void>;
    readonly delete: BoundCommand<{ id: string }, void>;
    readonly select: BoundCommand<{ id: string | null }, void>;
    readonly setFilter: BoundCommand<{ query: string }, void>;
    readonly clearAll: BoundCommand<void, void>;
}

export const NOTES: ProviderToken<PartApi> = provider<PartApi>('notes');

export const NEEDS = needs('state', 'commands', 'windows', 'log');

export const CONSUMES = [] as const;

export const PUBLISHES = {
    commands: [
        {
            action: 'create',
            description: 'Creates a new note.',
            input: schema<{ title: string; body: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'update',
            description: 'Updates an existing note title and content.',
            input: schema<{ id: string; title: string; body: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'delete',
            description: 'Deletes a note by its identifier.',
            input: schema<{ id: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'select',
            description: 'Selects a note to view or edit.',
            input: schema<{ id: string | null }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'setFilter',
            description: 'Filters the note list by search term.',
            input: schema<{ query: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'clearAll',
            description: 'Deletes all notes.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
    ],
    components: [],
    state: [],
} as const;

export interface NotesInternal {
    readonly notes: Signal<readonly Note[]>;
    readonly filterQuery: Signal<string>;
    readonly selectedId: Signal<string | null>;

    readonly draftTitle: Signal<string>;
    readonly draftBody: Signal<string>;

    readonly selectedNote: () => Note | null;
    readonly filteredNotes: () => readonly Note[];
    readonly totalCount: () => number;
    readonly totalWords: () => number;

    createNote(title: string, body: string): void;
    updateNote(id: string, title: string, body: string): void;
    deleteNote(id: string): void;
    selectNote(id: string | null): void;
    setFilter(query: string): void;
    clearFilter(): void;

    setDraftTitle(title: string): void;
    setDraftBody(body: string): void;
    saveCurrent(): void;
    newNote(): void;
    clearAll(): void;

    openNotes(): void;
    openStats(): void;

    commands: NotesCommands;
}

export type NotesView = ViewContext<Record<string, never>, NotesInternal, PartApi>;
