/**
 * Palette demo application contract, types, and schema.
 */

import {
    consumes,
    needs,
    provider,
    type ProviderToken,
    type ReadonlySignal,
    type Signal,
    type ViewContext,
} from '@flybyme/mesh-web';
import {
    THEME_TOKEN,
    THEME_TOKEN_NAMES,
    type ThemeMode,
    type ThemeTokenName,
    type ThemeTokens,
} from '../contracts/theme.js';

export {
    THEME_TOKEN,
    THEME_TOKEN_NAMES,
    type ThemeMode,
    type ThemeTokenName,
    type ThemeTokens,
};

export interface PaletteApi {
    readonly selectedToken: ReadonlySignal<ThemeTokenName>;
    readonly activeMode: () => ThemeMode;
    selectToken(token: ThemeTokenName): void;
}

export interface PaletteInternal {
    readonly selectedToken: Signal<ThemeTokenName>;
    readonly draftValue: Signal<string>;
    readonly draftRevision: Signal<number>;
    readonly activeMode: () => ThemeMode;
    readonly tokens: () => ThemeTokens;
    selectToken(token: ThemeTokenName): void;
    setDraftValue(val: string): void;
    applyToken(): Promise<void>;
    switchMode(mode: ThemeMode): Promise<void>;
    reset(): Promise<void>;
    resetSelected(): Promise<void>;
    openTokens(): void;
    openEditor(): void;
    openPreview(): void;
}

export type PaletteView = ViewContext<Record<string, never>, PaletteInternal, PaletteApi>;

export const PALETTE: ProviderToken<PaletteApi> = provider<PaletteApi>('palette');

export const NEEDS = needs('state', 'commands', 'windows', 'log');
export const CONSUMES = consumes(THEME_TOKEN);

export const QUICK_COLORS = [
    '#58a6ff',
    '#2ea043',
    '#d29922',
    '#f85149',
    '#a371f7',
    '#f0883e',
    '#56d364',
    '#79c0ff',
    '#ffffff',
    '#0d1117',
    '#161b22',
    '#30363d',
] as const;

