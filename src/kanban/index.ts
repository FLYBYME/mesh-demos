import {
    tiles,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';
import {
    DEFAULT_COLUMNS,
    KANBAN,
    NEEDS,
    SAMPLE_CARDS,
    type KanbanApi,
    type KanbanCard,
    type KanbanPriority,
} from './contract.js';
import { renderBoardPane } from './views/board.js';
import { renderComposerPane } from './views/composer.js';

export {
    DEFAULT_COLUMNS,
    KANBAN,
    SAMPLE_CARDS,
    type KanbanApi,
    type KanbanCard,
    type KanbanColumn,
    type KanbanPriority,
} from './contract.js';

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
