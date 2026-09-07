import {
    command,
    each,
    element,
    text,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { KanbanApi } from '../contract.js';

export function renderComposerPane(vx: ViewContext<Record<string, never>, KanbanApi>): Node {
    return element('Stack', {
        props: {
            class: 'kanban-pane kanban-composer-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                background: '#0d1117',
                color: '#e6edf3',
            },
        },
        children: [
            element('Heading', {
                props: { class: 'composer-title', style: { margin: '0', 'font-size': '16px' } },
                children: [text('Create Task Card')],
            }),

            element('Form', {
                props: { class: 'kanban-composer-form' },
                intents: { commit: { action: command('kanban.submitDraft'), preventDefault: true } },
                children: [
                    element('Stack', {
                        props: { gap: 10, style: { display: 'flex', 'flex-direction': 'column', gap: '10px' } },
                        children: [
                            // Title input
                            element('Stack', {
                                props: { gap: 4, style: { display: 'flex', 'flex-direction': 'column', gap: '4px' } },
                                children: [
                                    element('Text', {
                                        props: { style: { 'font-weight': '600', 'font-size': '12px' } },
                                        children: [text('Title:')],
                                    }),
                                    each(
                                        () => [vx.app.draftRevision()],
                                        (rev) => rev,
                                        () => element('Input', {
                                            props: {
                                                placeholder: 'Task title...',
                                                class: 'input-card-title',
                                                value: () => vx.app.draftTitle(),
                                                style: {
                                                    padding: '8px',
                                                    'font-size': '13px',
                                                    background: '#161b22',
                                                    border: '1px solid #30363d',
                                                    color: '#e6edf3',
                                                    'border-radius': '6px',
                                                },
                                            },
                                            intents: {
                                                change: { action: command('kanban.setDraftTitle') },
                                            },
                                        }),
                                    ),
                                ],
                            }),

                            // Description input
                            element('Stack', {
                                props: { gap: 4, style: { display: 'flex', 'flex-direction': 'column', gap: '4px' } },
                                children: [
                                    element('Text', {
                                        props: { style: { 'font-weight': '600', 'font-size': '12px' } },
                                        children: [text('Description:')],
                                    }),
                                    each(
                                        () => [vx.app.draftRevision()],
                                        (rev) => rev,
                                        () => element('Input', {
                                            props: {
                                                placeholder: 'Detailed task description...',
                                                class: 'input-card-desc',
                                                value: () => vx.app.draftDesc(),
                                                style: {
                                                    padding: '8px',
                                                    'font-size': '13px',
                                                    background: '#161b22',
                                                    border: '1px solid #30363d',
                                                    color: '#e6edf3',
                                                    'border-radius': '6px',
                                                },
                                            },
                                            intents: {
                                                change: { action: command('kanban.setDraftDesc') },
                                            },
                                        }),
                                    ),
                                ],
                            }),

                            // Column selection buttons
                            element('Stack', {
                                props: { gap: 4, style: { display: 'flex', 'flex-direction': 'column', gap: '4px' } },
                                children: [
                                    element('Text', {
                                        props: { style: { 'font-weight': '600', 'font-size': '12px' } },
                                        children: [text('Target Column:')],
                                    }),
                                    element('Row', {
                                        props: { style: { display: 'flex', gap: '6px', 'flex-wrap': 'wrap' } },
                                        children: vx.app.columns.map((c) =>
                                            element('Button', {
                                                props: {
                                                    type: 'button',
                                                    class: `btn-select-col btn-select-col-${c.id}`,
                                                    style: () => ({
                                                        padding: '4px 8px',
                                                        'font-size': '11px',
                                                        'border-radius': '4px',
                                                        cursor: 'pointer',
                                                        background: vx.app.draftColumn() === c.id ? '#1f6feb' : '#21262d',
                                                        border: vx.app.draftColumn() === c.id ? '1px solid #58a6ff' : '1px solid #30363d',
                                                        color: '#ffffff',
                                                    }),
                                                },
                                                intents: { activate: { action: command('kanban.setDraftCol', c.id) } },
                                                children: [text(c.title)],
                                            }),
                                        ),
                                    }),
                                ],
                            }),

                            // Priority selection buttons
                            element('Stack', {
                                props: { gap: 4, style: { display: 'flex', 'flex-direction': 'column', gap: '4px' } },
                                children: [
                                    element('Text', {
                                        props: { style: { 'font-weight': '600', 'font-size': '12px' } },
                                        children: [text('Priority:')],
                                    }),
                                    element('Row', {
                                        props: { style: { display: 'flex', gap: '6px' } },
                                        children: (['low', 'medium', 'high'] as const).map((p) =>
                                            element('Button', {
                                                props: {
                                                    type: 'button',
                                                    class: `btn-select-priority btn-priority-${p}`,
                                                    style: () => ({
                                                        padding: '4px 8px',
                                                        'font-size': '11px',
                                                        'border-radius': '4px',
                                                        cursor: 'pointer',
                                                        background: vx.app.draftPriority() === p ? '#30363d' : '#21262d',
                                                        border: vx.app.draftPriority() === p ? '1px solid #58a6ff' : '1px solid #30363d',
                                                        color: p === 'high' ? '#f85149' : p === 'medium' ? '#d29922' : '#3fb950',
                                                        'font-weight': 'bold',
                                                        'text-transform': 'capitalize',
                                                    }),
                                                },
                                                intents: { activate: { action: command('kanban.setDraftPriority', p) } },
                                                children: [text(p)],
                                            }),
                                        ),
                                    }),
                                ],
                            }),

                            // Submit Button
                            element('Button', {
                                props: {
                                    class: 'btn-create-card',
                                    style: {
                                        'margin-top': '8px',
                                        padding: '10px',
                                        'font-size': '13px',
                                        'font-weight': '600',
                                        background: '#238636',
                                        border: '1px solid #2ea043',
                                        color: '#ffffff',
                                        'border-radius': '6px',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('kanban.submitDraft') } },
                                children: [text('+ Create Card')],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}
