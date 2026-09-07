import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { Note, NotesApi, NotesInternal } from '../contract.js';

export function renderNotesListView(vx: ViewContext<Record<string, never>, NotesApi, NotesInternal>): Node {
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
                                () => [vx.internal.filterRevision()],
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
                            text(() => `Showing ${String(vx.internal.filteredCount())} of ${String(vx.app.totalCount())} notes`),
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
                        () => vx.internal.filteredNotes(),
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
                () => vx.internal.filteredCount() === 0,
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
