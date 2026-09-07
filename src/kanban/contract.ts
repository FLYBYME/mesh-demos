import {
    needs,
    provider,
    type ProviderToken,
    type Signal,
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

export const NEEDS = needs('state', 'commands', 'windows', 'log');

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
