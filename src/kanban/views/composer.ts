/**
 * Kanban Composer view: form to create a new task card.
 */

import {
    element,
    text,
    type Node,
} from '@flybyme/mesh-web';
import type { KanbanPriority, KanbanView } from '../contract.js';

export function renderComposerView(vx: KanbanView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'kanban-pane' },
        children: [
            element('Text', {
                props: { class: 'composer-title' },
                children: [text('Create Task Card')],
            }),

            element('Stack', {
                props: { class: 'composer-card' },
                children: [
                    // Title input
                    element('Stack', {
                        props: { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                        children: [
                            element('Text', {
                                props: { style: { fontWeight: '600', fontSize: '12px', color: 'var(--ink-dim)' } },
                                children: [text('Card Title:')],
                            }),
                            element('Input', {
                                props: {
                                    class: 'input-card-title',
                                    placeholder: 'Task summary...',
                                    value: () => app.draftTitle(),
                                },
                                intents: {
                                    change: {
                                        action: vx.on((val?: unknown) =>
                                            app.setDraftTitle(typeof val === 'string' ? val : String(val ?? '')),
                                        ),
                                    },
                                },
                            }),
                        ],
                    }),

                    // Description input
                    element('Stack', {
                        props: { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
                        children: [
                            element('Text', {
                                props: { style: { fontWeight: '600', fontSize: '12px', color: 'var(--ink-dim)' } },
                                children: [text('Description:')],
                            }),
                            element('Input', {
                                props: {
                                    class: 'input-card-desc',
                                    placeholder: 'Detailed task description...',
                                    value: () => app.draftDesc(),
                                },
                                intents: {
                                    change: {
                                        action: vx.on((val?: unknown) =>
                                            app.setDraftDesc(typeof val === 'string' ? val : String(val ?? '')),
                                        ),
                                    },
                                },
                            }),
                        ],
                    }),

                    // Column selection
                    element('Stack', {
                        props: { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                        children: [
                            element('Text', {
                                props: { style: { fontWeight: '600', fontSize: '12px', color: 'var(--ink-dim)' } },
                                children: [text('Target Column:')],
                            }),
                            element('Row', {
                                props: { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                                children: app.columns.map((c) =>
                                    element('Button', {
                                        props: {
                                            class: `btn-select-col btn-select-col-${c.id}`,
                                            style: () => ({
                                                backgroundColor: app.draftColumn() === c.id ? '#1f6feb' : '#21262d',
                                                borderColor: app.draftColumn() === c.id ? '#58a6ff' : '#30363d',
                                            }),
                                        },
                                        intents: { activate: { action: vx.on(() => app.setDraftColumn(c.id)) } },
                                        children: [text(c.title)],
                                    }),
                                ),
                            }),
                        ],
                    }),

                    // Priority selection
                    element('Stack', {
                        props: { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                        children: [
                            element('Text', {
                                props: { style: { fontWeight: '600', fontSize: '12px', color: 'var(--ink-dim)' } },
                                children: [text('Priority:')],
                            }),
                            element('Row', {
                                props: { style: { display: 'flex', gap: '6px' } },
                                children: (['low', 'medium', 'high'] as const).map((p: KanbanPriority) =>
                                    element('Button', {
                                        props: {
                                            class: `btn-select-priority btn-priority-${p}`,
                                            style: () => ({
                                                backgroundColor: app.draftPriority() === p ? '#30363d' : '#21262d',
                                                borderColor: app.draftPriority() === p ? '#58a6ff' : '#30363d',
                                                color: p === 'high' ? '#f85149' : p === 'medium' ? '#d29922' : '#3fb950',
                                            }),
                                        },
                                        intents: { activate: { action: vx.on(() => app.setDraftPriority(p)) } },
                                        children: [text(p)],
                                    }),
                                ),
                            }),
                        ],
                    }),

                    // Submit button
                    element('Button', {
                        props: { class: 'btn-create-card' },
                        intents: { activate: { action: vx.on(() => app.submitDraft()) } },
                        children: [text('+ Create Card')],
                    }),
                ],
            }),
        ],
    });
}
