/**
 * Notes demo application: Searchable note list, markdown-friendly text editor, and word metrics.
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
    CONSUMES,
    NEEDS,
    NOTES,
    PUBLISHES,
    type Note,
    type NotesCommands,
    type NotesInternal,
} from './contract.js';
import { countWords, formatNoteDate } from './format.js';
import { renderNotesView } from './views/notes.js';
import { renderStatsView } from './views/stats.js';

import './notes.css';

export * from './contract.js';
export * from './format.js';

export const notesApi = defineApi({
    id: 'notes',
    exposure: 'local',
    calls: {},
});

export default class NotesApp implements Application<
    typeof NEEDS,
    typeof CONSUMES,
    typeof NOTES,
    typeof notesApi,
    NotesInternal
> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = NOTES;
    readonly api = notesApi;
    readonly publishes = PUBLISHES;

    readonly commands: readonly CommandDecl[] = [
        { id: 'notes.openNotes', title: 'Notes: Show Notes' },
        { id: 'notes.openStats', title: 'Notes: Show Stats' },
        { id: 'notes.create', title: 'Notes: Create Note' },
        { id: 'notes.update', title: 'Notes: Update Note' },
        { id: 'notes.delete', title: 'Notes: Delete Note' },
        { id: 'notes.select', title: 'Notes: Select Note' },
        { id: 'notes.setFilter', title: 'Notes: Search Notes' },
        { id: 'notes.clearAll', title: 'Notes: Clear All Notes' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, NotesInternal>[] = [
        {
            id: 'notes',
            title: 'Notes',
            instances: 'one',
            window: {
                defaultSize: { width: 680, height: 500 },
                minSize: { width: 440, height: 320 },
            },
            render: renderNotesView,
        },
        {
            id: 'stats',
            title: 'Notes Stats',
            instances: 'one',
            window: {
                defaultSize: { width: 340, height: 380 },
                minSize: { width: 280, height: 260 },
            },
            render: renderStatsView,
        },
    ];

    async start(
        cx: Context<typeof NEEDS, typeof CONSUMES, typeof notesApi>,
    ): Promise<{ api: PartApi; internal: NotesInternal }> {
        const notes = cx.state.signal<readonly Note[]>([]);
        const filterQuery = cx.state.signal('');
        const selectedId = cx.state.signal<string | null>(null);
        const draftTitle = cx.state.signal('');
        const draftBody = cx.state.signal('');

        let nextId = 0;

        const totalCount = cx.state.computed(() => notes().length);
        const totalWords = cx.state.computed(() => {
            let count = 0;
            for (const n of notes()) {
                count += countWords(n.title) + countWords(n.body);
            }
            return count;
        });

        const selectedNote = cx.state.computed(() => {
            const sel = selectedId();
            if (sel === null) return null;
            return notes().find((n) => n.id === sel) ?? null;
        });

        const filteredNotes = cx.state.computed(() => {
            const q = filterQuery().toLowerCase().trim();
            const all = notes();
            if (q.length === 0) return all;
            return all.filter(
                (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
            );
        });

        const selectNote = (id: string | null): void => {
            selectedId.set(id);
            if (id === null) {
                draftTitle.set('');
                draftBody.set('');
            } else {
                const target = notes().find((n) => n.id === id);
                if (target !== undefined) {
                    draftTitle.set(target.title);
                    draftBody.set(target.body);
                }
            }
        };

        const createNote = (title: string, body: string): void => {
            const trimmedTitle = title.trim();
            const trimmedBody = body.trim();
            if (trimmedTitle.length === 0 && trimmedBody.length === 0) return;

            const now = Date.now();
            const newNoteItem: Note = {
                id: `note-${String(++nextId)}`,
                title: trimmedTitle.length > 0 ? trimmedTitle : 'Untitled Note',
                body: trimmedBody,
                updatedAt: now,
                formattedDate: formatNoteDate(now),
            };

            notes.set([newNoteItem, ...notes()]);
            selectedId.set(newNoteItem.id);
            draftTitle.set(newNoteItem.title);
            draftBody.set(newNoteItem.body);
        };

        const updateNote = (id: string, title: string, body: string): void => {
            const trimmedTitle = title.trim();
            const trimmedBody = body.trim();
            const now = Date.now();

            notes.set(
                notes().map((n) =>
                    n.id === id
                        ? {
                              ...n,
                              title: trimmedTitle.length > 0 ? trimmedTitle : 'Untitled Note',
                              body: trimmedBody,
                              updatedAt: now,
                              formattedDate: formatNoteDate(now),
                          }
                        : n,
                ),
            );
        };

        const deleteNote = (id: string): void => {
            notes.set(notes().filter((n) => n.id !== id));
            if (selectedId() === id) {
                selectedId.set(null);
                draftTitle.set('');
                draftBody.set('');
            }
        };

        const saveCurrent = (): void => {
            const currentSelected = selectedId();
            const title = draftTitle();
            const body = draftBody();

            if (currentSelected !== null) {
                updateNote(currentSelected, title, body);
            } else {
                createNote(title, body);
            }
        };

        const newNote = (): void => {
            selectedId.set(null);
            draftTitle.set('');
            draftBody.set('');
        };

        const setFilter = (query: string): void => {
            filterQuery.set(query);
        };

        const clearFilter = (): void => {
            filterQuery.set('');
        };

        const clearAll = (): void => {
            notes.set([]);
            selectedId.set(null);
            draftTitle.set('');
            draftBody.set('');
            filterQuery.set('');
        };

        const openNotes = (): void => {
            cx.windows.open({ view: 'notes' });
        };

        const openStats = (): void => {
            cx.windows.open({ view: 'stats' });
        };

        // Bound commands
        const boundCreate: BoundCommand<{ title: string; body: string }, void> = {
            ...PUBLISHES.commands[0],
            available: () => AVAILABLE,
            run: async ({ title, body }) => createNote(title, body),
        };

        const boundUpdate: BoundCommand<{ id: string; title: string; body: string }, void> = {
            ...PUBLISHES.commands[1],
            available: () => AVAILABLE,
            run: async ({ id, title, body }) => updateNote(id, title, body),
        };

        const boundDelete: BoundCommand<{ id: string }, void> = {
            ...PUBLISHES.commands[2],
            available: () => AVAILABLE,
            run: async ({ id }) => deleteNote(id),
        };

        const boundSelect: BoundCommand<{ id: string | null }, void> = {
            ...PUBLISHES.commands[3],
            available: () => AVAILABLE,
            run: async ({ id }) => selectNote(id),
        };

        const boundSetFilter: BoundCommand<{ query: string }, void> = {
            ...PUBLISHES.commands[4],
            available: () => AVAILABLE,
            run: async ({ query }) => setFilter(query),
        };

        const boundClearAll: BoundCommand<void, void> = {
            ...PUBLISHES.commands[5],
            available: () => AVAILABLE,
            run: async () => clearAll(),
        };

        const commands: NotesCommands = {
            create: boundCreate,
            update: boundUpdate,
            delete: boundDelete,
            select: boundSelect,
            setFilter: boundSetFilter,
            clearAll: boundClearAll,
        };

        // Palette commands
        cx.commands.implement('notes.openNotes', openNotes);
        cx.commands.implement('notes.openStats', openStats);
        cx.commands.implement('notes.create', (arg) => {
            if (typeof arg === 'object' && arg !== null && 'title' in arg && 'body' in arg) {
                createNote(String(arg.title), String(arg.body));
            }
        });
        cx.commands.implement('notes.update', (arg) => {
            if (typeof arg === 'object' && arg !== null && 'id' in arg && 'title' in arg && 'body' in arg) {
                updateNote(String(arg.id), String(arg.title), String(arg.body));
            }
        });
        cx.commands.implement('notes.delete', (arg) => {
            if (typeof arg === 'object' && arg !== null && 'id' in arg) {
                deleteNote(String(arg.id));
            } else if (typeof arg === 'string') {
                deleteNote(arg);
            }
        });
        cx.commands.implement('notes.select', (arg) => {
            if (typeof arg === 'object' && arg !== null && 'id' in arg) {
                selectNote(arg.id === null ? null : String(arg.id));
            } else if (typeof arg === 'string' || arg === null) {
                selectNote(arg);
            }
        });
        cx.commands.implement('notes.setFilter', (arg) => {
            if (typeof arg === 'object' && arg !== null && 'query' in arg) {
                setFilter(String(arg.query));
            } else if (typeof arg === 'string') {
                setFilter(arg);
            }
        });
        cx.commands.implement('notes.clearAll', clearAll);

        // Defer default window opening
        setTimeout(() => {
            if (cx.windows.own().length === 0) {
                openNotes();
            }
        }, 0);

        const internal: NotesInternal = {
            notes,
            filterQuery,
            selectedId,
            draftTitle,
            draftBody,

            selectedNote,
            filteredNotes,
            totalCount,
            totalWords,

            createNote,
            updateNote,
            deleteNote,
            selectNote,
            setFilter,
            clearFilter,

            setDraftTitle: (t) => draftTitle.set(t),
            setDraftBody: (b) => draftBody.set(b),
            saveCurrent,
            newNote,
            clearAll,

            openNotes,
            openStats,

            commands,
        };

        const api: PartApi = {
            commands: {
                create: boundCreate,
                update: boundUpdate,
                delete: boundDelete,
                select: boundSelect,
                setFilter: boundSetFilter,
                clearAll: boundClearAll,
            },
            components: {},
            state: {},
        };

        return { api, internal };
    }
}
