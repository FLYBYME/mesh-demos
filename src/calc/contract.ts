/**
 * Contract, types, and schemas for the calculator demo application.
 */

import {
    AVAILABLE,
    needs,
    provider,
    schema,
    type Availability,
    type BoundCommand,
    type PartApi,
    type ProviderToken,
    type Signal,
    type ViewContext,
} from '@flybyme/mesh-web';

export interface CalcHistoryItem {
    readonly id: string;
    readonly expression: string;
    readonly result: string;
    readonly timestamp: number;
}

export interface CalcCommands {
    readonly digit: BoundCommand<{ digit: string }, void>;
    readonly op: BoundCommand<{ op: string }, void>;
    readonly calculate: BoundCommand<void, void>;
    readonly clear: BoundCommand<void, void>;
    readonly clearEntry: BoundCommand<void, void>;
    readonly toggleSign: BoundCommand<void, void>;
    readonly backspace: BoundCommand<void, void>;
    readonly recall: BoundCommand<{ id: string }, void>;
    readonly clearHistory: BoundCommand<void, void>;
}

export const CALC: ProviderToken<PartApi> = provider<PartApi>('calc');

export const NEEDS = needs('state', 'commands', 'windows', 'log');

export const CONSUMES = [] as const;

export const PUBLISHES = {
    commands: [
        {
            action: 'digit',
            description: 'Inputs a numeric digit into the calculator.',
            input: schema<{ digit: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'op',
            description: 'Sets an arithmetic operator (+, -, *, /).',
            input: schema<{ op: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'calculate',
            description: 'Evaluates the current arithmetic expression.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'clear',
            description: 'Resets the display, formula, and pending operation.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'clearEntry',
            description: 'Clears only the current display entry.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'toggleSign',
            description: 'Toggles between positive and negative value.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'backspace',
            description: 'Deletes the last entered character.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'recall',
            description: 'Recalls an expression and result from history tape.',
            input: schema<{ id: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'clearHistory',
            description: 'Clears all items from the history tape.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
    ],
    components: [],
    state: [],
} as const;

export interface CalcInternal {
    readonly display: Signal<string>;
    readonly formula: Signal<string>;
    readonly previousValue: Signal<string | null>;
    readonly operation: Signal<string | null>;
    readonly history: Signal<readonly CalcHistoryItem[]>;

    inputDigit(digit: string): void;
    inputDecimal(): void;
    setOperation(op: string): void;
    calculate(): void;
    clear(): void;
    clearEntry(): void;
    toggleSign(): void;
    backspace(): void;
    recallHistory(id: string): void;
    clearHistory(): void;

    openCalc(): void;
    openHistory(): void;

    commands: CalcCommands;
}

export type CalcView = ViewContext<Record<string, never>, CalcInternal, PartApi>;
