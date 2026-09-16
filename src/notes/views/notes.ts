/**
 * Main Notes view: Searchable list and master-detail editor.
 */

import { each, element, text, when, type Node } from '@flybyme/mesh-web';
import type { Note, NotesView } from '../contract.js';

export function renderNotesView(vx: NotesView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'notes-container' },
        children: [
            // Header / Navigation
            element('Row', {
                props: { class: 'notes-header' },
                children: [
                    element('Row', {
                        props: { class: 'notes-nav' },
                        children: [
                            element('Button', {
                                props: { class: 'notes-nav-btn active' },
                                children: [text('Notes')],
                            }),
                            element('Button', {
                                props: { class: 'notes-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openStats()) } },
                                children: [text('Stats')],
                            }),
                        ],
                    }),
                ],
            }),

            // Workspace
            element('Row', {
                props: { class: 'notes-workspace' },
                children: [
                    // Sidebar
                    element('Stack', {
                        props: { class: 'notes-sidebar' },
                        children: [
                            element('Row', {
                                props: { class: 'notes-search-row' },
                                children: [
                                    element('Input', {
                                        props: {
                                            class: 'notes-search-input',
                                            placeholder: 'Search notes...',
                                            value: () => app.filterQuery(),
                                        },
                                        intents: {
                                            change: { action: vx.on((v?: unknown) => app.setFilter(typeof v === 'string' ? v : '')) },
                                        },
                                    }),
                                    element('Button', {
                                        props: { class: 'notes-btn-new' },
                                        intents: { activate: { action: vx.on(() => app.newNote()) } },
                                        children: [text('+ New')],
                                    }),
                                ],
                            }),
                            when(
                                () => app.filteredNotes().length === 0,
                                () => element('Text', {
                                    props: { class: 'notes-empty-list' },
                                    children: [text(() => (app.totalCount() === 0 ? 'No notes yet. Click + New to create one.' : 'No notes match your search.'))],
                                }),
                                () => element('Stack', {
                                    props: { class: 'notes-list' },
                                    children: [
                                        each(
                                            () => app.filteredNotes(),
                                            (note: Note) => note.id,
                                            (note: () => Note) => element('Stack', {
                                                props: {
                                                    class: () => (app.selectedId() === note().id ? 'notes-card selected' : 'notes-card'),
                                                    'data-id': () => note().id,
                                                },
                                                intents: { activate: { action: vx.on(() => app.selectNote(note().id)) } },
                                                children: [
                                                    element('Text', {
                                                        props: { class: 'notes-card-title' },
                                                        children: [text(() => note().title)],
                                                    }),
                                                    element('Text', {
                                                        props: { class: 'notes-card-snippet' },
                                                        children: [text(() => note().body.slice(0, 50) || '(empty note)')],
                                                    }),
                                                    element('Text', {
                                                        props: { class: 'notes-card-date' },
                                                        children: [text(() => note().formattedDate)],
                                                    }),
                                                ],
                                            }),
                                        ),
                                    ],
                                }),
                            ),
                        ],
                    }),

                    // Editor Pane
                    element('Stack', {
                        props: { class: 'notes-editor' },
                        children: [
                            element('Input', {
                                props: {
                                    class: 'notes-editor-title',
                                    placeholder: 'Note title...',
                                    value: () => app.draftTitle(),
                                },
                                intents: {
                                    change: { action: vx.on((v?: unknown) => app.setDraftTitle(typeof v === 'string' ? v : '')) },
                                },
                            }),
                            element('Input', {
                                props: {
                                    class: 'notes-editor-body',
                                    placeholder: 'Start writing your note here...',
                                    value: () => app.draftBody(),
                                },
                                intents: {
                                    change: { action: vx.on((v?: unknown) => app.setDraftBody(typeof v === 'string' ? v : '')) },
                                },
                            }),
                            element('Row', {
                                props: { class: 'notes-editor-footer' },
                                children: [
                                    element('Button', {
                                        props: { class: 'notes-btn-save' },
                                        intents: { activate: { action: vx.on(() => app.saveCurrent()) } },
                                        children: [text(() => (app.selectedId() !== null ? 'Update Note' : 'Save Note'))],
                                    }),
                                    when(
                                        () => app.selectedId() !== null,
                                        () => element('Button', {
                                            props: { class: 'notes-btn-delete' },
                                            intents: { activate: { action: vx.on(() => {
                                                const id = app.selectedId();
                                                if (id !== null) app.deleteNote(id);
                                            }) } },
                                            children: [text('Delete')],
                                        }),
                                    ),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}
