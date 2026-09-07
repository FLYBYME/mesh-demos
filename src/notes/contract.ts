import {
    needs,
    provider,
    type ProviderToken,
    type Signal,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types & contract

export interface Note {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly updatedAt: number;
    readonly formattedDate: string;
}

export interface NotesApi {
    readonly notes: Signal<readonly Note[]>;
    readonly filterText: Signal<string>;
    readonly filterRevision: Signal<number>;
    readonly selectedId: Signal<string | null>;
    readonly selectedNote: () => Note | null;
    readonly draftTitle: Signal<string>;
    readonly draftBody: Signal<string>;
    readonly draftRevision: Signal<number>;
    readonly filteredNotes: () => readonly Note[];
    readonly totalCount: () => number;
    readonly filteredCount: () => number;
    readonly totalWords: () => number;
    createNote(title: string, body: string): void;
    updateNote(id: string, title: string, body: string): void;
    deleteNote(id: string): void;
    selectNote(id: string | null): void;
    setFilter(textVal: string): void;
    clearFilter(): void;
    setDraftTitle(titleVal: string): void;
    setDraftBody(bodyVal: string): void;
    save(): void;
    newNote(): void;
    clearAll(): void;
    addSample(): void;
}

export const NOTES: ProviderToken<NotesApi> = provider<NotesApi>('mesh-notes');

export const NEEDS = needs('state', 'commands', 'windows', 'log');
