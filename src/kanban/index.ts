/**
 * Kanban demo application: multi-column workflow board with card movement and composer.
 */

import {
    defineApi,
    type Application,
    type ApplicationStartResult,
    type CommandDecl,
    type Context,
    type KeyDecl,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    CONSUMES,
    DEFAULT_COLUMNS,
    KANBAN,
    NEEDS,
    SAMPLE_CARDS,
    type KanbanApi,
    type KanbanCard,
    type KanbanInternal,
    type KanbanPriority,
} from './contract.js';
import { renderBoardView } from './views/board.js';
import { renderComposerView } from './views/composer.js';

import './kanban.css';

export * from './contract.js';

export const kanbanApi = defineApi({
    id: 'kanban',
    exposure: 'local',
    calls: {},
});

export default class KanbanApp implements Application<
    typeof NEEDS,
    typeof CONSUMES,
    typeof KANBAN,
    typeof kanbanApi,
    KanbanInternal
> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = KANBAN;
    readonly api = kanbanApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'kanban.addCard', title: 'Kanban: Add Card' },
        { id: 'kanban.deleteCard', title: 'Kanban: Delete Card' },
        { id: 'kanban.moveCardNext', title: 'Kanban: Move Card Right' },
        { id: 'kanban.moveCardPrev', title: 'Kanban: Move Card Left' },
        { id: 'kanban.grabCard', title: 'Kanban: Grab / Pick Up Card' },
        { id: 'kanban.dropInColumn', title: 'Kanban: Drop Card in Column' },
        { id: 'kanban.cancelGrab', title: 'Kanban: Cancel Held Card' },
        { id: 'kanban.setFilter', title: 'Kanban: Filter Cards' },
        { id: 'kanban.commitFilter', title: 'Kanban: Commit Filter' },
        { id: 'kanban.clearFilter', title: 'Kanban: Clear Filter' },
        { id: 'kanban.setDraftTitle', title: 'Kanban: Set Draft Title' },
        { id: 'kanban.setDraftDesc', title: 'Kanban: Set Draft Description' },
        { id: 'kanban.setDraftCol', title: 'Kanban: Set Draft Column' },
        { id: 'kanban.setDraftPriority', title: 'Kanban: Set Draft Priority' },
        { id: 'kanban.submitDraft', title: 'Kanban: Submit Draft Card' },
        { id: 'kanban.openBoard', title: 'Kanban: Open Board Window' },
        { id: 'kanban.openComposer', title: 'Kanban: Open Composer Window' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'kanban.cancelGrab', keys: 'escape' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, KanbanInternal>[] = [
        {
            id: 'board',
            title: 'Kanban Board',
            instances: 'one',
            window: {
                defaultSize: { width: 780, height: 560 },
                minSize: { width: 440, height: 320 },
            },
            render: renderBoardView,
        },
        {
            id: 'composer',
            title: 'Card Composer',
            instances: 'one',
            window: {
                defaultSize: { width: 380, height: 440 },
                minSize: { width: 280, height: 280 },
            },
            render: renderComposerView,
        },
    ];

    async start(
        cx: Context<typeof NEEDS, typeof CONSUMES, typeof kanbanApi>,
    ): Promise<ApplicationStartResult<KanbanApi, KanbanInternal>> {
        cx.log.info('KanbanApp starting');

        const cards = cx.state.signal<readonly KanbanCard[]>(SAMPLE_CARDS);
        const heldCardId = cx.state.signal<string | null>(null);

        const filterText = cx.state.signal<string>('');
        const draftTitle = cx.state.signal<string>('');
        const draftDesc = cx.state.signal<string>('');
        const draftColumn = cx.state.signal<string>('todo');
        const draftPriority = cx.state.signal<KanbanPriority>('medium');

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
                (c) =>
                    c.title.toLowerCase().includes(query) ||
                    c.description.toLowerCase().includes(query),
            );
        });

        const cardsInColumn = (colId: string): readonly KanbanCard[] => {
            return filteredCards().filter((c) => c.columnId === colId);
        };

        const addCard = (
            title: string,
            description: string,
            colId: string,
            priority: KanbanPriority,
        ): void => {
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

        const openBoard = (): void => {
            cx.windows.open({ view: 'board' });
        };

        const openComposer = (): void => {
            cx.windows.open({ view: 'composer' });
        };

        // Commands
        cx.commands.implement('kanban.addCard', () => {
            submitDraft();
        });
        cx.commands.implement('kanban.deleteCard', (id?: unknown) => {
            if (typeof id === 'string') deleteCard(id);
        });
        cx.commands.implement('kanban.moveCardNext', (id?: unknown) => {
            if (typeof id === 'string') moveCardNext(id);
        });
        cx.commands.implement('kanban.moveCardPrev', (id?: unknown) => {
            if (typeof id === 'string') moveCardPrev(id);
        });
        cx.commands.implement('kanban.grabCard', (id?: unknown) => {
            if (typeof id === 'string') grabCard(id);
        });
        cx.commands.implement('kanban.dropInColumn', (colId?: unknown) => {
            if (typeof colId === 'string') dropCard(colId);
        });
        cx.commands.implement('kanban.cancelGrab', () => {
            cancelGrab();
        });
        cx.commands.implement('kanban.setFilter', (val?: unknown) => {
            setFilter(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('kanban.commitFilter', () => {
            // reactive
        });
        cx.commands.implement('kanban.clearFilter', () => {
            clearFilter();
        });
        cx.commands.implement('kanban.setDraftTitle', (val?: unknown) => {
            setDraftTitle(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('kanban.setDraftDesc', (val?: unknown) => {
            setDraftDesc(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('kanban.setDraftCol', (val?: unknown) => {
            if (typeof val === 'string') setDraftColumn(val);
        });
        cx.commands.implement('kanban.setDraftPriority', (val?: unknown) => {
            if (val === 'low' || val === 'medium' || val === 'high') {
                setDraftPriority(val);
            }
        });
        cx.commands.implement('kanban.submitDraft', () => {
            submitDraft();
        });
        cx.commands.implement('kanban.openBoard', () => {
            openBoard();
        });
        cx.commands.implement('kanban.openComposer', () => {
            openComposer();
        });

        // Defer default window opening
        setTimeout(() => {
            if (cx.windows.own().length === 0) {
                openBoard();
                openComposer();
            }
        }, 0);

        const api: KanbanApi = {
            columns: DEFAULT_COLUMNS,
            cards,
            heldCardId,
            heldCard,
            cardsInColumn,
            totalCards,
            addCard,
            deleteCard,
            moveCard,
        };

        const internal: KanbanInternal = {
            columns: DEFAULT_COLUMNS,
            cards,
            heldCardId,
            heldCard,
            filterText,
            draftTitle,
            draftDesc,
            draftColumn,
            draftPriority,
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
            openBoard,
            openComposer,
        };

        return { api, internal };
    }
}
