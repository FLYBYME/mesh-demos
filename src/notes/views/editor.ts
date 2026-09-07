import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { NotesApi } from '../contract.js';

export function renderEditorView(vx: ViewContext<Record<string, never>, NotesApi>): Node {
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
