import {
    tiles,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';
import {
    NEEDS,
    NOTES,
    type Note,
    type NotesApi,
    type NotesInternal,
} from './contract.js';
import { countWords, formatNoteDate } from './format.js';
import { renderNotesListView } from './views/notes.js';
import { renderEditorView } from './views/editor.js';
import { renderStatsView } from './views/stats.js';

export { NOTES, type Note, type NotesApi, type NotesInternal } from './contract.js';

// ---------------------------------------------------------------------------- application

export default class NotesApp implements Application<typeof NEEDS, readonly [], typeof NOTES, Record<string, never>, NotesInternal> {
    readonly needs = NEEDS;
    readonly provides = NOTES;

    readonly commands: readonly CommandDecl[] = [
        { id: 'notes.setFilter', title: 'Notes: Set Search Filter' },
        { id: 'notes.commitFilter', title: 'Notes: Commit Filter' },
        { id: 'notes.clearFilter', title: 'Notes: Clear Filter' },
        { id: 'notes.select', title: 'Notes: Select Note for Editing' },
        { id: 'notes.delete', title: 'Notes: Delete Note' },
        { id: 'notes.deleteSelected', title: 'Notes: Delete Selected Note' },
        { id: 'notes.setDraftTitle', title: 'Notes: Set Draft Title' },
        { id: 'notes.setDraftBody', title: 'Notes: Set Draft Body' },
        { id: 'notes.save', title: 'Notes: Save Note' },
        { id: 'notes.newNote', title: 'Notes: New Note / Clear Form' },
        { id: 'notes.clearAll', title: 'Notes: Clear All Notes' },
        { id: 'notes.addSample', title: 'Notes: Add Sample Note' },
        { id: 'notes.openNotes', title: 'Notes: Open Notes List Window' },
        { id: 'notes.openEditor', title: 'Notes: Open Editor Window' },
        { id: 'notes.openStats', title: 'Notes: Open Stats Window' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'notes.save', keys: 'ctrl+s' },
        { command: 'notes.newNote', keys: 'ctrl+n' },
    ];

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'list' }, size: 2 },
            { node: { tile: 'editor' }, size: 2 },
            { node: { tile: 'stats' }, size: 1 },
        ],
    });

    readonly views: readonly ViewDecl<Record<string, never>, NotesApi, NotesInternal>[] = [
        {
            id: 'notes',
            title: 'Notes List',
            tile: 'list',
            instances: 'one',
            defaultSize: { width: 420, height: 520 },
            minSize: { width: 300, height: 260 },
            render(vx: ViewContext<Record<string, never>, NotesApi, NotesInternal>): Node {
                return renderNotesListView(vx);
            },
        },
        {
            id: 'editor',
            title: 'Note Editor',
            tile: 'editor',
            instances: 'one',
            defaultSize: { width: 440, height: 520 },
            minSize: { width: 320, height: 260 },
            render(vx: ViewContext<Record<string, never>, NotesApi, NotesInternal>): Node {
                return renderEditorView(vx);
            },
        },
        {
            id: 'stats',
            title: 'Notes Overview',
            tile: 'stats',
            instances: 'one',
            defaultSize: { width: 320, height: 420 },
            minSize: { width: 240, height: 220 },
            render(vx: ViewContext<Record<string, never>, NotesApi, NotesInternal>): Node {
                return renderStatsView(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<{ api: NotesApi; internal: NotesInternal }> {
        cx.log.info('NotesApp starting');

        const notes = cx.state.signal<readonly Note[]>([]);
        const filterText = cx.state.signal<string>('');
        const filterRevision = cx.state.signal<number>(0);
        const selectedId = cx.state.signal<string | null>(null);
        const draftTitle = cx.state.signal<string>('');
        const draftBody = cx.state.signal<string>('');
        const draftRevision = cx.state.signal<number>(0);

        let nextId = 0;

        const filteredNotes = cx.state.computed(() => {
            const query = filterText().trim().toLowerCase();
            if (query.length === 0) return notes();
            return notes().filter(
                (n) => n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query),
            );
        });

        const totalCount = cx.state.computed(() => notes().length);
        const filteredCount = cx.state.computed(() => filteredNotes().length);
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
            draftRevision.set(draftRevision() + 1);
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
            selectedId.set(null);
            draftTitle.set('');
            draftBody.set('');
            draftRevision.set(draftRevision() + 1);
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
            draftRevision.set(draftRevision() + 1);
        };

        const deleteNote = (id: string): void => {
            notes.set(notes().filter((n) => n.id !== id));
            if (selectedId() === id) {
                selectedId.set(null);
                draftTitle.set('');
                draftBody.set('');
                draftRevision.set(draftRevision() + 1);
            }
        };

        const save = (): void => {
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
            draftRevision.set(draftRevision() + 1);
        };

        const setFilter = (textVal: string): void => {
            filterText.set(textVal);
        };

        const clearFilter = (): void => {
            filterText.set('');
            filterRevision.set(filterRevision() + 1);
        };

        const setDraftTitle = (titleVal: string): void => {
            draftTitle.set(titleVal);
        };

        const setDraftBody = (bodyVal: string): void => {
            draftBody.set(bodyVal);
        };

        const clearAll = (): void => {
            notes.set([]);
            selectedId.set(null);
            draftTitle.set('');
            draftBody.set('');
            filterText.set('');
            draftRevision.set(draftRevision() + 1);
            filterRevision.set(filterRevision() + 1);
        };

        let sampleIndex = 0;
        const addSample = (): void => {
            sampleIndex++;
            const samples: readonly { title: string; body: string }[] = [
                { title: 'Project Roadmap', body: 'Finish dispatch 1, test with vitest browser, verify mesh.json.' },
                { title: 'Meeting Notes', body: 'Discuss architecture boundary versus sandbox in kernel capability design.' },
                { title: 'Ideas for Themes', body: 'Dark slate palette with accent borders and high-contrast tokens.' },
            ];
            const sample = samples[(sampleIndex - 1) % samples.length];
            if (sample !== undefined) {
                createNote(sample.title, sample.body);
            }
        };

        // Commands
        cx.commands.implement('notes.setFilter', (val?: Json) => {
            setFilter(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('notes.commitFilter', () => {
            // no-op, filter is reactive
        });
        cx.commands.implement('notes.clearFilter', () => {
            clearFilter();
        });
        cx.commands.implement('notes.select', (id?: Json) => {
            selectNote(typeof id === 'string' ? id : null);
        });
        cx.commands.implement('notes.delete', (id?: Json) => {
            if (typeof id === 'string') deleteNote(id);
        });
        cx.commands.implement('notes.deleteSelected', () => {
            const sel = selectedId();
            if (sel !== null) deleteNote(sel);
        });
        cx.commands.implement('notes.setDraftTitle', (val?: Json) => {
            setDraftTitle(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('notes.setDraftBody', (val?: Json) => {
            setDraftBody(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('notes.save', () => {
            save();
        });
        cx.commands.implement('notes.newNote', () => {
            newNote();
        });
        cx.commands.implement('notes.clearAll', () => {
            clearAll();
        });
        cx.commands.implement('notes.addSample', () => {
            addSample();
        });
        cx.commands.implement('notes.openNotes', () => {
            cx.windows.open({ view: 'notes' });
        });
        cx.commands.implement('notes.openEditor', () => {
            cx.windows.open({ view: 'editor' });
        });
        cx.commands.implement('notes.openStats', () => {
            cx.windows.open({ view: 'stats' });
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'notes' });
                cx.windows.open({ view: 'editor' });
                cx.windows.open({ view: 'stats' });
            }
        });

        const api: NotesApi = {
            notes,
            filterText,
            selectedId,
            selectedNote,
            totalCount,
            totalWords,
            createNote,
            updateNote,
            deleteNote,
            selectNote,
        };

        const internal: NotesInternal = {
            notes,
            filterText,
            filterRevision,
            selectedId,
            selectedNote,
            draftTitle,
            draftBody,
            draftRevision,
            filteredNotes,
            totalCount,
            filteredCount,
            totalWords,
            createNote,
            updateNote,
            deleteNote,
            selectNote,
            setFilter,
            clearFilter,
            setDraftTitle,
            setDraftBody,
            save,
            newNote,
            clearAll,
            addSample,
        };

        return { api, internal };
    }
}
