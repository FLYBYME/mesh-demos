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
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ProviderToken,
    type Signal,
    type ViewContext,
    type ViewDecl,
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

const NEEDS = needs('state', 'commands', 'windows', 'log');

// ---------------------------------------------------------------------------- formatting & helpers

function formatNoteDate(epochMs: number): string {
    const d = new Date(epochMs);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}/${day} ${h}:${min}`;
}

function countWords(str: string): number {
    const trimmed = str.trim();
    if (trimmed.length === 0) return 0;
    return trimmed.split(/\s+/).length;
}

// ---------------------------------------------------------------------------- views

function renderNotesListView(vx: ViewContext<Record<string, never>, NotesApi>): Node {
    return element('Stack', {
        props: {
            class: 'notes-pane notes-list-pane',
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
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: { class: 'notes-title' },
                        children: [text('Notes')],
                    }),
                    element('Badge', {
                        props: { class: 'badge notes-count-badge' },
                        children: [text(() => `${String(vx.app.totalCount())} notes`)],
                    }),
                ],
            }),
            element('Form', {
                props: { class: 'notes-filter-form' },
                intents: { commit: { action: command('notes.commitFilter'), preventDefault: true } },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            each(
                                () => [vx.app.filterRevision()],
                                (rev) => rev,
                                () => element('Input', {
                                    props: {
                                        placeholder: 'Filter notes by title or content...',
                                        class: 'notes-filter-input',
                                        style: { flex: '1', padding: '6px 8px' },
                                    },
                                    intents: {
                                        change: { action: command('notes.setFilter') },
                                    },
                                }),
                            ),
                            element('Button', {
                                props: { class: 'btn-clear-filter', style: { padding: '6px 10px' } },
                                intents: { activate: { action: command('notes.clearFilter') } },
                                children: [text('Clear')],
                            }),
                        ],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'font-size': '12px',
                        opacity: '0.8',
                    },
                },
                children: [
                    element('Text', {
                        props: { class: 'filter-status-text' },
                        children: [
                            text(() => `Showing ${String(vx.app.filteredCount())} of ${String(vx.app.totalCount())} notes`),
                        ],
                    }),
                    element('Button', {
                        props: { class: 'btn-new-note', style: { padding: '4px 8px', 'font-size': '12px' } },
                        intents: { activate: { action: command('notes.newNote') } },
                        children: [text('+ New Note')],
                    }),
                ],
            }),
            element('List', {
                props: {
                    class: 'notes-list',
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
                        () => vx.app.filteredNotes(),
                        (note: Note) => note.id,
                        (note: () => Note) =>
                            element('ListItem', {
                                props: {
                                    class: 'note-item',
                                    'data-id': () => note().id,
                                    style: () => ({
                                        display: 'flex',
                                        'flex-direction': 'column',
                                        gap: '4px',
                                        padding: '8px 10px',
                                        background: vx.app.selectedId() === note().id ? '#1f6feb22' : '#161b22',
                                        border: vx.app.selectedId() === note().id ? '1px solid #58a6ff' : '1px solid #30363d',
                                        'border-radius': '6px',
                                    }),
                                },
                                children: [
                                    element('Row', {
                                        props: {
                                            style: {
                                                display: 'flex',
                                                'justify-content': 'space-between',
                                                'align-items': 'center',
                                            },
                                        },
                                        children: [
                                            element('Text', {
                                                props: {
                                                    class: 'note-title',
                                                    style: { 'font-weight': 'bold', color: '#e6edf3' },
                                                },
                                                children: [text(() => note().title)],
                                            }),
                                            element('Badge', {
                                                props: { class: 'badge note-date', style: { 'font-size': '11px' } },
                                                children: [text(() => note().formattedDate)],
                                            }),
                                        ],
                                    }),
                                    element('Text', {
                                        props: {
                                            class: 'note-body-preview',
                                            style: {
                                                'font-size': '13px',
                                                color: '#8b949e',
                                                'white-space': 'nowrap',
                                                overflow: 'hidden',
                                                'text-overflow': 'ellipsis',
                                            },
                                        },
                                        children: [text(() => note().body)],
                                    }),
                                    element('Row', {
                                        props: {
                                            style: {
                                                display: 'flex',
                                                gap: '6px',
                                                'justify-content': 'flex-end',
                                                'margin-top': '4px',
                                            },
                                        },
                                        children: [
                                            element('Button', {
                                                props: {
                                                    class: 'btn-edit-note',
                                                    'data-id': () => note().id,
                                                    style: { padding: '2px 8px', 'font-size': '12px' },
                                                },
                                                intents: { activate: { action: command('notes.select', note().id) } },
                                                children: [text('Edit')],
                                            }),
                                            element('Button', {
                                                props: {
                                                    class: 'btn-delete-note',
                                                    'data-id': () => note().id,
                                                    style: { padding: '2px 8px', 'font-size': '12px', color: '#f85149' },
                                                },
                                                intents: { activate: { action: command('notes.delete', note().id) } },
                                                children: [text('Delete')],
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                    ),
                ],
            }),
            when(
                () => vx.app.filteredCount() === 0,
                () => element('Card', {
                    props: {
                        class: 'empty-notes-card',
                        style: {
                            padding: '16px',
                            background: '#161b22',
                            'border-radius': '6px',
                            'text-align': 'center',
                            color: '#8b949e',
                        },
                    },
                    children: [text('No notes match the current filter.')],
                }),
            ),
        ],
    });
}

function renderEditorView(vx: ViewContext<Record<string, never>, NotesApi>): Node {
    return element('Stack', {
        props: {
            class: 'notes-pane notes-editor-pane',
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
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: { class: 'editor-heading' },
                        children: [text('Note Editor')],
                    }),
                    when(
                        () => vx.app.selectedId() !== null,
                        () => element('Badge', {
                            props: { class: 'badge editing-badge' },
                            children: [text('Editing Note')],
                        }),
                        () => element('Badge', {
                            props: { class: 'badge new-badge' },
                            children: [text('New Note')],
                        }),
                    ),
                ],
            }),
            element('Form', {
                props: { class: 'note-edit-form' },
                intents: { commit: { action: command('notes.save'), preventDefault: true } },
                children: [
                    element('Stack', {
                        props: { gap: 10, style: { display: 'flex', 'flex-direction': 'column', gap: '10px' } },
                        children: [
                            element('Text', {
                                props: { class: 'label-title', style: { 'font-weight': 'bold', 'font-size': '13px' } },
                                children: [text('Title:')],
                            }),
                            each(
                                () => [vx.app.draftRevision()],
                                (rev) => rev,
                                () => element('Input', {
                                    props: {
                                        placeholder: 'Note title...',
                                        class: 'input-note-title',
                                        value: () => vx.app.draftTitle(),
                                        style: { padding: '8px', 'font-size': '14px' },
                                    },
                                    intents: {
                                        change: { action: command('notes.setDraftTitle') },
                                    },
                                }),
                            ),
                            element('Text', {
                                props: { class: 'label-body', style: { 'font-weight': 'bold', 'font-size': '13px' } },
                                children: [text('Content:')],
                            }),
                            each(
                                () => [vx.app.draftRevision()],
                                (rev) => rev,
                                () => element('Input', {
                                    props: {
                                        placeholder: 'Write your note here...',
                                        class: 'input-note-body',
                                        value: () => vx.app.draftBody(),
                                        style: { padding: '8px', 'font-size': '14px' },
                                    },
                                    intents: {
                                        change: { action: command('notes.setDraftBody') },
                                    },
                                }),
                            ),
                            element('Row', {
                                props: { style: { display: 'flex', gap: '8px', 'margin-top': '8px' } },
                                children: [
                                    element('Button', {
                                        props: { class: 'btn-save-note', style: { flex: '1', padding: '8px 14px' } },
                                        intents: { activate: { action: command('notes.save') } },
                                        children: [
                                            text(() => (vx.app.selectedId() !== null ? 'Update Note' : 'Create Note')),
                                        ],
                                    }),
                                    element('Button', {
                                        props: { class: 'btn-cancel-edit', style: { padding: '8px 14px' } },
                                        intents: { activate: { action: command('notes.newNote') } },
                                        children: [text('Clear / New')],
                                    }),
                                ],
                            }),
                            when(
                                () => vx.app.selectedId() !== null,
                                () => element('Button', {
                                    props: {
                                        class: 'btn-delete-current',
                                        style: { padding: '6px 12px', color: '#f85149', 'margin-top': '4px' },
                                    },
                                    intents: { activate: { action: command('notes.deleteSelected') } },
                                    children: [text('Delete this note')],
                                }),
                            ),
                        ],
                    }),
                ],
            }),
        ],
    });
}

function renderStatsView(vx: ViewContext<Record<string, never>, NotesApi>): Node {
    return element('Stack', {
        props: {
            class: 'notes-pane notes-stats-pane',
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
                props: { class: 'stats-heading' },
                children: [text('Notes Overview')],
            }),
            element('Card', {
                props: {
                    class: 'stats-card',
                    style: {
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '8px',
                        padding: '12px',
                        background: '#161b22',
                        'border-radius': '6px',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { children: [text('Total notes:')] }),
                            element('Badge', {
                                props: { class: 'badge stat-total-count' },
                                children: [text(() => String(vx.app.totalCount()))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { children: [text('Matching filter:')] }),
                            element('Badge', {
                                props: { class: 'badge stat-filtered-count' },
                                children: [text(() => String(vx.app.filteredCount()))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { children: [text('Total words:')] }),
                            element('Badge', {
                                props: { class: 'badge stat-total-words' },
                                children: [text(() => String(vx.app.totalWords()))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { children: [text('Selected:')] }),
                            element('Badge', {
                                props: { class: 'badge stat-selected-note' },
                                children: [
                                    text(() => (vx.app.selectedNote() ? vx.app.selectedNote()?.title ?? 'None' : 'None')),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
            element('Heading', {
                props: { class: 'actions-heading', style: { 'font-size': '15px', 'margin-top': '8px' } },
                children: [text('Quick Actions')],
            }),
            element('Stack', {
                props: { gap: 8, style: { display: 'flex', 'flex-direction': 'column', gap: '8px' } },
                children: [
                    element('Button', {
                        props: { class: 'btn-add-sample' },
                        intents: { activate: { action: command('notes.addSample') } },
                        children: [text('Add Sample Note')],
                    }),
                    element('Button', {
                        props: { class: 'btn-clear-all', style: { color: '#f85149' } },
                        intents: { activate: { action: command('notes.clearAll') } },
                        children: [text('Clear All Notes')],
                    }),
                    element('Button', {
                        props: { class: 'btn-open-list' },
                        intents: { activate: { action: command('notes.openNotes') } },
                        children: [text('Open Notes Window')],
                    }),
                    element('Button', {
                        props: { class: 'btn-open-editor' },
                        intents: { activate: { action: command('notes.openEditor') } },
                        children: [text('Open Editor Window')],
                    }),
                ],
            }),
        ],
    });
}

// ---------------------------------------------------------------------------- application

export default class NotesApp implements Application<typeof NEEDS, readonly [], typeof NOTES> {
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

    readonly views: readonly ViewDecl<Record<string, never>, NotesApi>[] = [
        {
            id: 'notes',
            title: 'Notes List',
            tile: 'list',
            instances: 'one',
            defaultSize: { width: 420, height: 520 },
            minSize: { width: 300, height: 260 },
            render(vx: ViewContext<Record<string, never>, NotesApi>): Node {
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
            render(vx: ViewContext<Record<string, never>, NotesApi>): Node {
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
            render(vx: ViewContext<Record<string, never>, NotesApi>): Node {
                return renderStatsView(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<NotesApi> {
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

        return {
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
    }
}
