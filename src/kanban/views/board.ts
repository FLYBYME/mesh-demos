import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type {
    KanbanApi,
    KanbanCard,
    KanbanColumn,
    KanbanPriority,
} from '../contract.js';

function getPriorityColor(priority: KanbanPriority): { bg: string; text: string } {
    switch (priority) {
        case 'high':
            return { bg: '#f8514922', text: '#f85149' };
        case 'medium':
            return { bg: '#d2992222', text: '#d29922' };
        case 'low':
        default:
            return { bg: '#3fb95022', text: '#3fb950' };
    }
}

function renderCardItem(
    card: KanbanCard,
    col: KanbanColumn,
    vx: ViewContext<Record<string, never>, KanbanApi>,
): Node {
    const priorityColor = getPriorityColor(card.priority);
    const colIndex = vx.app.columns.findIndex((c) => c.id === col.id);
    const isFirst = colIndex === 0;
    const isLast = colIndex === vx.app.columns.length - 1;

    const actionBtnStyle = {
        padding: '2px 6px',
        'font-size': '11px',
        background: '#21262d',
        border: '1px solid #30363d',
        color: '#c9d1d9',
        'border-radius': '4px',
        cursor: 'pointer',
    };

    return element('ListItem', {
        props: {
            class: 'kanban-card-item',
            'data-id': card.id,
            style: () => ({
                padding: '10px',
                background: vx.app.heldCardId() === card.id ? '#1f6feb22' : '#21262d',
                border: vx.app.heldCardId() === card.id ? '1px solid #58a6ff' : '1px solid #30363d',
                'border-radius': '6px',
                display: 'flex',
                'flex-direction': 'column',
                gap: '6px',
            }),
        },
        children: [
            // Card Title and Priority
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'flex-start',
                    },
                },
                children: [
                    element('Text', {
                        props: {
                            class: 'card-title',
                            style: { 'font-weight': '600', 'font-size': '13px', color: '#e6edf3', flex: '1' },
                        },
                        children: [text(card.title)],
                    }),
                    element('Badge', {
                        props: {
                            class: `badge priority-badge priority-${card.priority}`,
                            style: {
                                'font-size': '10px',
                                padding: '2px 5px',
                                'border-radius': '4px',
                                background: priorityColor.bg,
                                color: priorityColor.text,
                                'text-transform': 'uppercase',
                                'font-weight': 'bold',
                            },
                        },
                        children: [text(card.priority)],
                    }),
                ],
            }),

            // Card Description
            element('Text', {
                props: {
                    class: 'card-desc',
                    style: { 'font-size': '12px', color: '#8b949e', 'line-height': '1.4' },
                },
                children: [text(card.description)],
            }),

            // Card Action Buttons (Move left, Grab/Pick up, Move right, Delete)
            element('Row', {
                props: {
                    class: 'card-actions',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'margin-top': '4px',
                        'padding-top': '4px',
                        'border-top': '1px solid #30363d55',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '4px' } },
                        children: [
                            when(
                                () => !isFirst,
                                () => element('Button', {
                                    props: {
                                        class: 'btn-move-prev',
                                        'data-id': card.id,
                                        style: actionBtnStyle,
                                    },
                                    intents: { activate: { action: command('kanban.moveCardPrev', card.id) } },
                                    children: [text('←')],
                                }),
                            ),
                            element('Button', {
                                props: {
                                    class: 'btn-grab-card',
                                    'data-id': card.id,
                                    style: {
                                        ...actionBtnStyle,
                                        color: '#58a6ff',
                                        'font-weight': '600',
                                    },
                                },
                                intents: { activate: { action: command('kanban.grabCard', card.id) } },
                                children: [
                                    text(() => (vx.app.heldCardId() === card.id ? 'Holding...' : 'Grab')),
                                ],
                            }),
                            when(
                                () => !isLast,
                                () => element('Button', {
                                    props: {
                                        class: 'btn-move-next',
                                        'data-id': card.id,
                                        style: actionBtnStyle,
                                    },
                                    intents: { activate: { action: command('kanban.moveCardNext', card.id) } },
                                    children: [text('→')],
                                }),
                            ),
                        ],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-delete-card',
                            'data-id': card.id,
                            style: { ...actionBtnStyle, color: '#f85149' },
                        },
                        intents: { activate: { action: command('kanban.deleteCard', card.id) } },
                        children: [text('✕')],
                    }),
                ],
            }),
        ],
    });
}

function renderColumn(col: KanbanColumn, vx: ViewContext<Record<string, never>, KanbanApi>): Node {
    return element('Stack', {
        props: {
            class: `kanban-column kanban-column-${col.id}`,
            'data-column': col.id,
            gap: 8,
            style: {
                flex: '1',
                'min-width': '220px',
                background: '#161b22',
                border: '1px solid #30363d',
                'border-radius': '8px',
                padding: '12px',
                display: 'flex',
                'flex-direction': 'column',
            },
        },
        children: [
            // Column Header
            element('Row', {
                props: {
                    class: 'column-header',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': `2px solid ${col.color}`,
                    },
                },
                children: [
                    element('Heading', {
                        props: {
                            class: 'column-title',
                            style: { margin: '0', 'font-size': '14px', 'font-weight': '600', color: col.color },
                        },
                        children: [text(col.title)],
                    }),
                    element('Badge', {
                        props: {
                            class: 'column-count-badge',
                            style: {
                                'font-size': '11px',
                                padding: '2px 6px',
                                background: '#21262d',
                                'border-radius': '10px',
                            },
                        },
                        children: [text(() => String(vx.app.cardsInColumn(col.id).length))],
                    }),
                ],
            }),

            // Drop zone target (Shown when holding a card)
            when(
                () => vx.app.heldCardId() !== null,
                () => element('Button', {
                    props: {
                        class: `btn-drop-zone btn-drop-${col.id}`,
                        'data-column': col.id,
                        style: {
                            padding: '10px',
                            'font-size': '12px',
                            'font-weight': '600',
                            background: '#1f6feb22',
                            border: '2px dashed #58a6ff',
                            color: '#58a6ff',
                            'border-radius': '6px',
                            cursor: 'pointer',
                            'text-align': 'center',
                        },
                    },
                    intents: { activate: { action: command('kanban.dropInColumn', col.id) } },
                    children: [text(`⬇ Drop in ${col.title}`)],
                }),
            ),

            // Card list
            element('List', {
                props: {
                    class: 'column-card-list',
                    style: {
                        margin: '0',
                        padding: '0',
                        'list-style': 'none',
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '8px',
                        flex: '1',
                        'overflow-y': 'auto',
                    },
                },
                children: [
                    each(
                        () => vx.app.cardsInColumn(col.id),
                        (card: KanbanCard) => card.id,
                        (card: () => KanbanCard) => renderCardItem(card(), col, vx),
                    ),
                ],
            }),

            // Empty state card if no cards in column
            when(
                () => vx.app.cardsInColumn(col.id).length === 0,
                () => element('Card', {
                    props: {
                        class: 'empty-column-card',
                        style: {
                            padding: '12px',
                            'text-align': 'center',
                            color: '#8b949e',
                            'font-size': '12px',
                            'font-style': 'italic',
                        },
                    },
                    children: [text('No cards')],
                }),
            ),
        ],
    });
}

export function renderBoardPane(vx: ViewContext<Record<string, never>, KanbanApi>): Node {
    return element('Stack', {
        props: {
            class: 'kanban-pane kanban-board-pane',
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
            // Top Header: Title, Search, Status
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
                        props: { class: 'kanban-title', style: { margin: '0', 'font-size': '18px' } },
                        children: [text('Project Board')],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            element('Badge', {
                                props: { class: 'badge total-cards-badge' },
                                children: [text(() => `${String(vx.app.totalCards())} tasks`)],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-open-composer',
                                    style: {
                                        padding: '4px 10px',
                                        'font-size': '12px',
                                        background: '#238636',
                                        border: '1px solid #2ea043',
                                        color: '#ffffff',
                                        'border-radius': '6px',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('kanban.openComposer') } },
                                children: [text('+ New Card')],
                            }),
                        ],
                    }),
                ],
            }),

            // Filter input form
            element('Form', {
                props: { class: 'kanban-filter-form' },
                intents: { commit: { action: command('kanban.commitFilter'), preventDefault: true } },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            each(
                                () => [vx.app.filterRevision()],
                                (rev) => rev,
                                () => element('Input', {
                                    props: {
                                        placeholder: 'Filter cards by title or description...',
                                        class: 'kanban-filter-input',
                                        style: {
                                            flex: '1',
                                            padding: '6px 10px',
                                            'font-size': '12px',
                                            background: '#161b22',
                                            border: '1px solid #30363d',
                                            color: '#e6edf3',
                                            'border-radius': '6px',
                                        },
                                    },
                                    intents: {
                                        change: { action: command('kanban.setFilter') },
                                    },
                                }),
                            ),
                            element('Button', {
                                props: {
                                    class: 'btn-clear-kanban-filter',
                                    style: {
                                        padding: '6px 10px',
                                        'font-size': '12px',
                                        background: '#21262d',
                                        border: '1px solid #30363d',
                                        color: '#c9d1d9',
                                        'border-radius': '6px',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('kanban.clearFilter') } },
                                children: [text('Clear')],
                            }),
                        ],
                    }),
                ],
            }),

            // Drag-and-drop state banner (Shown when a card is grabbed / picked up)
            when(
                () => vx.app.heldCardId() !== null,
                () => element('Row', {
                    props: {
                        class: 'grab-banner',
                        style: {
                            display: 'flex',
                            'justify-content': 'space-between',
                            'align-items': 'center',
                            padding: '8px 12px',
                            background: '#1f6feb22',
                            border: '1px solid #58a6ff',
                            'border-radius': '6px',
                        },
                    },
                    children: [
                        element('Text', {
                            props: { class: 'grab-banner-text', style: { 'font-size': '13px', color: '#58a6ff' } },
                            children: [
                                text(() => {
                                    const c = vx.app.heldCard();
                                    return c ? `Holding "${c.title}" — click "Drop Here" in target column` : 'Holding card...';
                                }),
                            ],
                        }),
                        element('Button', {
                            props: {
                                class: 'btn-cancel-grab',
                                style: {
                                    padding: '4px 8px',
                                    'font-size': '11px',
                                    background: '#21262d',
                                    border: '1px solid #30363d',
                                    color: '#f85149',
                                    'border-radius': '4px',
                                    cursor: 'pointer',
                                },
                            },
                            intents: { activate: { action: command('kanban.cancelGrab') } },
                            children: [text('Cancel')],
                        }),
                    ],
                }),
            ),

            // Columns Grid: Row containing each Column Stack
            element('Row', {
                props: {
                    class: 'kanban-columns-container',
                    style: {
                        display: 'flex',
                        gap: '12px',
                        flex: '1',
                        'overflow-x': 'auto',
                    },
                },
                children: vx.app.columns.map((col) => renderColumn(col, vx)),
            }),
        ],
    });
}
