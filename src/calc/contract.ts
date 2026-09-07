import {
    needs,
    provider,
    type ProviderToken,
    type Signal,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types & contract

export interface CalcHistoryItem {
    readonly id: string;
    readonly expression: string;
    readonly result: string;
    readonly timestamp: number;
}

export interface CalcApi {
    readonly display: Signal<string>;
    readonly formula: Signal<string>;
    readonly previousValue: Signal<string | null>;
    readonly operation: Signal<string | null>;
    readonly expressionText: Signal<string>;
    readonly expressionRevision: Signal<number>;
    readonly history: Signal<readonly CalcHistoryItem[]>;
    readonly historyCount: () => number;

    inputDigit(digit: string): void;
    inputDecimal(): void;
    setOperation(op: string): void;
    calculate(): void;
    clear(): void;
    clearEntry(): void;
    toggleSign(): void;
    backspace(): void;
    setExpressionText(expr: string): void;
    evaluateExpression(expr: string): void;
    recallHistory(id: string): void;
    clearHistory(): void;
}

export const CALC: ProviderToken<CalcApi> = provider<CalcApi>('mesh-calc');

export const NEEDS = needs('state', 'commands', 'windows', 'log');
