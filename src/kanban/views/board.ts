/**
 * Kanban Board view: multi-column workflow board with grab/drop and quick card movement.
 */

import {
    each,
    element,
    text,
    when,
    type Node,
} from '@flybyme/mesh-web';
import type {
    KanbanCard,
    KanbanColumn,
    KanbanPriority,
    KanbanView,
} from '../contract.js';

function getPriorityColor(priority: KanbanPriority): { bg: string; text: string } {
    switch (priority) {
        case 'high':
            return { bg: 'rgba(248, 81, 73, 0.15)', text: '#f85149' };
        case 'medium':
            return { bg: 'rgba(210, 153, 34, 0.15)', text: '#d29922' };
        case 'low':
        default:
            return { bg: 'rgba(63, 185, 80, 0.15)', text: '#3fb950' };
    }
}

function renderCardItem(card: KanbanCard, col: KanbanColumn, vx: KanbanView): Node {
    const app = vx.internal;
    const priorityColor = getPriorityColor(card.priority);
    const colIndex = app.columns.findIndex((c) => c.id === col.id);
    const isFirst = colIndex === 0;
    const isLast = colIndex === app.columns.length - 1;

    return element('Stack', {
        props: {
            class: 'kanban-card-item',
            'data-id': card.id,
            style: () => ({
                backgroundColor: app.heldCardId() === card.id ? 'rgba(31, 111, 235, 0.15)' : '#21262d',
                borderColor: app.heldCardId() === card.id ? '#58a6ff' : '#30363d',
            }),
        },
        children: [
            // Card Title and Priority
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    },
                },
                children: [
                    element('Text', {
                        props: { class: 'card-title' },
                        children: [text(card.title)],
                    }),
                    element('Text', {
                        props: {
                            class: `priority-badge priority-${card.priority}`,
                            style: {
                                backgroundColor: priorityColor.bg,
                                color: priorityColor.text,
                            },
                        },
                        children: [text(card.priority)],
                    }),
                ],
            }),

            // Card Description
            element('Text', {
                props: { class: 'card-desc' },
                children: [text(card.description)],
            }),

            // Card Actions
            element('Row', {
                props: { class: 'card-actions' },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '4px' } },
                        children: [
                            when(
                                () => !isFirst,
                                () =>
                                    element('Button', {
                                        props: {
                                            class: 'btn-move-prev',
                                            'data-id': card.id,
                                        },
                                        intents: { activate: { action: vx.on(() => app.moveCardPrev(card.id)) } },
                                        children: [text('←')],
                                    }),
                            ),
                            element('Button', {
                                props: {
                                    class: 'btn-grab-card',
                                    'data-id': card.id,
                                },
                                intents: { activate: { action: vx.on(() => app.grabCard(card.id)) } },
                                children: [
                                    text(() => (app.heldCardId() === card.id ? 'Holding...' : 'Grab')),
                                ],
                            }),
                            when(
                                () => !isLast,
                                () =>
                                    element('Button', {
                                        props: {
                                            class: 'btn-move-next',
                                            'data-id': card.id,
                                        },
                                        intents: { activate: { action: vx.on(() => app.moveCardNext(card.id)) } },
                                        children: [text('→')],
                                    }),
                            ),
                        ],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-delete-card',
                            'data-id': card.id,
                        },
                        intents: { activate: { action: vx.on(() => app.deleteCard(card.id)) } },
                        children: [text('✕')],
                    }),
                ],
            }),
        ],
    });
}

function renderColumn(col: KanbanColumn, vx: KanbanView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: {
            class: `kanban-column kanban-column-${col.id}`,
            'data-column': col.id,
        },
        children: [
            // Column Header
            element('Row', {
                props: {
                    class: 'column-header',
                    style: { borderBottom: `2px solid ${col.color}` },
                },
                children: [
                    element('Text', {
                        props: { class: 'column-title', style: { color: col.color } },
                        children: [text(col.title)],
                    }),
                    element('Text', {
                        props: { class: 'column-count-badge' },
                        children: [text(() => String(app.cardsInColumn(col.id).length))],
                    }),
                ],
            }),

            // Drop zone
            when(
                () => app.heldCardId() !== null,
                () =>
                    element('Button', {
                        props: {
                            class: `btn-drop-zone btn-drop-${col.id}`,
                            'data-column': col.id,
                        },
                        intents: { activate: { action: vx.on(() => app.dropCard(col.id)) } },
                        children: [text(`⬇ Drop in ${col.title}`)],
                    }),
            ),

            // Card list
            element('Stack', {
                props: { class: 'column-card-list' },
                children: [
                    each(
                        () => app.cardsInColumn(col.id),
                        (c: KanbanCard) => c.id,
                        (card: () => KanbanCard) => renderCardItem(card(), col, vx),
                    ),
                ],
            }),

            // Empty state
            when(
                () => app.cardsInColumn(col.id).length === 0,
                () =>
                    element('Text', {
                        props: { class: 'empty-column-card' },
                        children: [text('No cards')],
                    }),
            ),
        ],
    });
}

export function renderBoardView(vx: KanbanView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'kanban-pane' },
        children: [
            // Top Bar
            element('Row', {
                props: { class: 'kanban-top-bar' },
                children: [
                    element('Row', {
                        props: { class: 'kanban-filter-row' },
                        children: [
                            element('Input', {
                                props: {
                                    class: 'kanban-filter-input',
                                    placeholder: 'Filter tasks...',
                                    value: () => app.filterText(),
                                },
                                intents: {
                                    change: {
                                        action: vx.on((val?: unknown) =>
                                            app.setFilter(typeof val === 'string' ? val : String(val ?? '')),
                                        ),
                                    },
                                },
                            }),
                            element('Button', {
                                props: { class: 'btn-clear-kanban-filter' },
                                intents: { activate: { action: vx.on(() => app.clearFilter()) } },
                                children: [text('Clear')],
                            }),
                        ],
                    }),
                    element('Button', {
                        props: { class: 'btn-open-composer' },
                        intents: { activate: { action: vx.on(() => app.openComposer()) } },
                        children: [text('+ New Card')],
                    }),
                ],
            }),

            // Grab banner
            when(
                () => app.heldCardId() !== null,
                () =>
                    element('Row', {
                        props: { class: 'grab-banner' },
                        children: [
                            element('Text', {
                                children: [
                                    text(() => `Holding "${app.heldCard()?.title ?? ''}" — click any drop zone to place`),
                                ],
                            }),
                            element('Button', {
                                props: { class: 'btn-cancel-grab' },
                                intents: { activate: { action: vx.on(() => app.cancelGrab()) } },
                                children: [text('Cancel')],
                            }),
                        ],
                    }),
            ),

            // Columns container
            element('Row', {
                props: { class: 'kanban-columns-container' },
                children: app.columns.map((col) => renderColumn(col, vx)),
            }),
        ],
    });
}
