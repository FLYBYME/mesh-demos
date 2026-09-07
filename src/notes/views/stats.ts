import {
    command,
    element,
    text,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { NotesApi, NotesInternal } from '../contract.js';

export function renderStatsView(vx: ViewContext<Record<string, never>, NotesApi, NotesInternal>): Node {
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
                                children: [text(() => String(vx.internal.filteredCount()))],
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
