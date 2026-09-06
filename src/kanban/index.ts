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

export type KanbanPriority = 'low' | 'medium' | 'high';

export interface KanbanColumn {
    readonly id: string;
    readonly title: string;
    readonly color: string;
}

export interface KanbanCard {
    readonly id: string;
    readonly columnId: string;
    readonly title: string;
    readonly description: string;
    readonly priority: KanbanPriority;
    readonly createdAt: number;
}

export interface KanbanApi {
    readonly columns: readonly KanbanColumn[];
    readonly cards: Signal<readonly KanbanCard[]>;
    readonly heldCardId: Signal<string | null>;
    readonly heldCard: () => KanbanCard | null;
    readonly filterText: Signal<string>;
    readonly filterRevision: Signal<number>;
    readonly draftTitle: Signal<string>;
    readonly draftDesc: Signal<string>;
    readonly draftColumn: Signal<string>;
    readonly draftPriority: Signal<KanbanPriority>;
    readonly draftRevision: Signal<number>;

    cardsInColumn(colId: string): readonly KanbanCard[];
    totalCards: () => number;
    addCard(title: string, description: string, colId: string, priority: KanbanPriority): void;
    deleteCard(id: string): void;
    moveCard(id: string, targetColId: string): void;
    moveCardNext(id: string): void;
    moveCardPrev(id: string): void;
    grabCard(id: string): void;
    dropCard(colId: string): void;
    cancelGrab(): void;
    setFilter(textVal: string): void;
    clearFilter(): void;
    setDraftTitle(titleVal: string): void;
    setDraftDesc(descVal: string): void;
    setDraftColumn(colId: string): void;
    setDraftPriority(priority: KanbanPriority): void;
    submitDraft(): void;
}

export const KANBAN: ProviderToken<KanbanApi> = provider<KanbanApi>('mesh-kanban');

const NEEDS = needs('state', 'commands', 'windows', 'log');

export const DEFAULT_COLUMNS: readonly KanbanColumn[] = [
    { id: 'todo', title: 'To Do', color: '#d29922' },
    { id: 'in_progress', title: 'In Progress', color: '#58a6ff' },
    { id: 'review', title: 'Review', color: '#bc8cff' },
    { id: 'done', title: 'Done', color: '#3fb950' },
];

export const SAMPLE_CARDS: readonly KanbanCard[] = [
    {
        id: 'card-1',
        columnId: 'todo',
        title: 'Design Component Vocabulary Audit',
        description: 'Enumerate what is missing and what had to be abused in 11 primitives.',
        priority: 'high',
        createdAt: 1000,
    },
    {
        id: 'card-2',
        columnId: 'todo',
        title: 'Document Surface Escape Hatch',
        description: 'Explain where Tier 3 dom capability is needed for Monaco and canvas.',
        priority: 'medium',
        createdAt: 2000,
    },
    {
        id: 'card-3',
        columnId: 'in_progress',
        title: 'Implement Four Applications',
        description: 'Build calculator, markdown viewer, kanban board, and chart.',
        priority: 'high',
        createdAt: 3000,
    },
    {
        id: 'card-4',
        columnId: 'review',
        title: 'Type Safety Verification',
        description: 'Verify zero casts and clean tsc compilation across all parts.',
        priority: 'medium',
        createdAt: 4000,
    },
    {
        id: 'card-5',
        columnId: 'done',
        title: 'Repository Architecture Scaffolding',
        description: 'Verified worktree structure and test runner setup.',
        priority: 'low',
        createdAt: 5000,
    },
];

// ---------------------------------------------------------------------------- helpers

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

// ---------------------------------------------------------------------------- views

function renderBoardPane(vx: ViewContext<Record<string, never>, KanbanApi>): Node {
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
                            background: '#1f6feb33',
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

function renderComposerPane(vx: ViewContext<Record<string, never>, KanbanApi>): Node {
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

// ---------------------------------------------------------------------------- application

export default class KanbanApp implements Application<typeof NEEDS, readonly [], typeof KANBAN> {
    readonly needs = NEEDS;
    readonly provides = KANBAN;

    readonly commands: readonly CommandDecl[] = [
        { id: 'kanban.addCard', title: 'Kanban: Add Card' },
        { id: 'kanban.deleteCard', title: 'Kanban: Delete Card' },
        { id: 'kanban.moveCardNext', title: 'Kanban: Move Card to Next Column' },
        { id: 'kanban.moveCardPrev', title: 'Kanban: Move Card to Previous Column' },
        { id: 'kanban.grabCard', title: 'Kanban: Grab / Pick Up Card' },
        { id: 'kanban.dropInColumn', title: 'Kanban: Drop Card in Column' },
        { id: 'kanban.cancelGrab', title: 'Kanban: Cancel Grab' },
        { id: 'kanban.setFilter', title: 'Kanban: Set Filter' },
        { id: 'kanban.commitFilter', title: 'Kanban: Commit Filter' },
        { id: 'kanban.clearFilter', title: 'Kanban: Clear Filter' },
        { id: 'kanban.setDraftTitle', title: 'Kanban: Set Draft Title' },
        { id: 'kanban.setDraftDesc', title: 'Kanban: Set Draft Description' },
        { id: 'kanban.setDraftCol', title: 'Kanban: Set Draft Column' },
        { id: 'kanban.setDraftPriority', title: 'Kanban: Set Draft Priority' },
        { id: 'kanban.submitDraft', title: 'Kanban: Submit Draft' },
        { id: 'kanban.openBoard', title: 'Kanban: Open Board Window' },
        { id: 'kanban.openComposer', title: 'Kanban: Open Composer Window' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'kanban.cancelGrab', keys: 'escape' },
    ];

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'board' }, size: 3 },
            { node: { tile: 'composer' }, size: 1 },
        ],
    });

    readonly views: readonly ViewDecl<Record<string, never>, KanbanApi>[] = [
        {
            id: 'board',
            title: 'Kanban Board',
            tile: 'board',
            instances: 'one',
            defaultSize: { width: 720, height: 540 },
            minSize: { width: 400, height: 320 },
            render(vx: ViewContext<Record<string, never>, KanbanApi>): Node {
                return renderBoardPane(vx);
            },
        },
        {
            id: 'composer',
            title: 'Card Composer',
            tile: 'composer',
            instances: 'one',
            defaultSize: { width: 340, height: 540 },
            minSize: { width: 260, height: 300 },
            render(vx: ViewContext<Record<string, never>, KanbanApi>): Node {
                return renderComposerPane(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<KanbanApi> {
        cx.log.info('KanbanApp starting');

        const cards = cx.state.signal<readonly KanbanCard[]>(SAMPLE_CARDS);
        const heldCardId = cx.state.signal<string | null>(null);
        const filterText = cx.state.signal<string>('');
        const filterRevision = cx.state.signal<number>(0);

        const draftTitle = cx.state.signal<string>('');
        const draftDesc = cx.state.signal<string>('');
        const draftColumn = cx.state.signal<string>('todo');
        const draftPriority = cx.state.signal<KanbanPriority>('medium');
        const draftRevision = cx.state.signal<number>(0);

        let nextCardId = 10;

        const totalCards = cx.state.computed(() => cards().length);

        const heldCard = cx.state.computed(() => {
            const id = heldCardId();
            if (id === null) return null;
            return cards().find((c) => c.id === id) ?? null;
        });

        const filteredCards = cx.state.computed(() => {
            const query = filterText().trim().toLowerCase();
            if (query.length === 0) return cards();
            return cards().filter(
                (c) => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query),
            );
        });

        const cardsInColumn = (colId: string): readonly KanbanCard[] => {
            return filteredCards().filter((c) => c.columnId === colId);
        };

        const addCard = (title: string, description: string, colId: string, priority: KanbanPriority): void => {
            const trimmedTitle = title.trim();
            if (trimmedTitle.length === 0) return;

            const newCard: KanbanCard = {
                id: `card-${String(++nextCardId)}`,
                columnId: colId,
                title: trimmedTitle,
                description: description.trim(),
                priority,
                createdAt: Date.now(),
            };

            cards.set([...cards(), newCard]);
            draftTitle.set('');
            draftDesc.set('');
            draftRevision.set(draftRevision() + 1);
        };

        const deleteCard = (id: string): void => {
            cards.set(cards().filter((c) => c.id !== id));
            if (heldCardId() === id) {
                heldCardId.set(null);
            }
        };

        const moveCard = (id: string, targetColId: string): void => {
            cards.set(
                cards().map((c) => (c.id === id ? { ...c, columnId: targetColId } : c)),
            );
        };

        const moveCardNext = (id: string): void => {
            const target = cards().find((c) => c.id === id);
            if (target === undefined) return;
            const curIdx = DEFAULT_COLUMNS.findIndex((col) => col.id === target.columnId);
            if (curIdx >= 0 && curIdx < DEFAULT_COLUMNS.length - 1) {
                const nextCol = DEFAULT_COLUMNS[curIdx + 1];
                if (nextCol !== undefined) {
                    moveCard(id, nextCol.id);
                }
            }
        };

        const moveCardPrev = (id: string): void => {
            const target = cards().find((c) => c.id === id);
            if (target === undefined) return;
            const curIdx = DEFAULT_COLUMNS.findIndex((col) => col.id === target.columnId);
            if (curIdx > 0) {
                const prevCol = DEFAULT_COLUMNS[curIdx - 1];
                if (prevCol !== undefined) {
                    moveCard(id, prevCol.id);
                }
            }
        };

        const grabCard = (id: string): void => {
            if (heldCardId() === id) {
                heldCardId.set(null);
            } else {
                heldCardId.set(id);
            }
        };

        const dropCard = (colId: string): void => {
            const id = heldCardId();
            if (id !== null) {
                moveCard(id, colId);
                heldCardId.set(null);
            }
        };

        const cancelGrab = (): void => {
            heldCardId.set(null);
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

        const setDraftDesc = (descVal: string): void => {
            draftDesc.set(descVal);
        };

        const setDraftColumn = (colId: string): void => {
            draftColumn.set(colId);
        };

        const setDraftPriority = (priority: KanbanPriority): void => {
            draftPriority.set(priority);
        };

        const submitDraft = (): void => {
            addCard(draftTitle(), draftDesc(), draftColumn(), draftPriority());
        };

        // Commands
        cx.commands.implement('kanban.addCard', () => {
            submitDraft();
        });
        cx.commands.implement('kanban.deleteCard', (id?: Json) => {
            if (typeof id === 'string') deleteCard(id);
        });
        cx.commands.implement('kanban.moveCardNext', (id?: Json) => {
            if (typeof id === 'string') moveCardNext(id);
        });
        cx.commands.implement('kanban.moveCardPrev', (id?: Json) => {
            if (typeof id === 'string') moveCardPrev(id);
        });
        cx.commands.implement('kanban.grabCard', (id?: Json) => {
            if (typeof id === 'string') grabCard(id);
        });
        cx.commands.implement('kanban.dropInColumn', (colId?: Json) => {
            if (typeof colId === 'string') dropCard(colId);
        });
        cx.commands.implement('kanban.cancelGrab', () => {
            cancelGrab();
        });
        cx.commands.implement('kanban.setFilter', (val?: Json) => {
            setFilter(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('kanban.commitFilter', () => {
            // filter is reactive
        });
        cx.commands.implement('kanban.clearFilter', () => {
            clearFilter();
        });
        cx.commands.implement('kanban.setDraftTitle', (val?: Json) => {
            setDraftTitle(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('kanban.setDraftDesc', (val?: Json) => {
            setDraftDesc(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('kanban.setDraftCol', (val?: Json) => {
            if (typeof val === 'string') setDraftColumn(val);
        });
        cx.commands.implement('kanban.setDraftPriority', (val?: Json) => {
            if (val === 'low' || val === 'medium' || val === 'high') {
                setDraftPriority(val);
            }
        });
        cx.commands.implement('kanban.submitDraft', () => {
            submitDraft();
        });
        cx.commands.implement('kanban.openBoard', () => {
            cx.windows.open({ view: 'board' });
        });
        cx.commands.implement('kanban.openComposer', () => {
            cx.windows.open({ view: 'composer' });
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'board' });
                cx.windows.open({ view: 'composer' });
            }
        });

        return {
            columns: DEFAULT_COLUMNS,
            cards,
            heldCardId,
            heldCard,
            filterText,
            filterRevision,
            draftTitle,
            draftDesc,
            draftColumn,
            draftPriority,
            draftRevision,
            cardsInColumn,
            totalCards,
            addCard,
            deleteCard,
            moveCard,
            moveCardNext,
            moveCardPrev,
            grabCard,
            dropCard,
            cancelGrab,
            setFilter,
            clearFilter,
            setDraftTitle,
            setDraftDesc,
            setDraftColumn,
            setDraftPriority,
            submitDraft,
        };
    }
}
