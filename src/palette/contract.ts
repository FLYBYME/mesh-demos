import {
    consumes,
    needs,
    provider,
    type ProviderToken,
    type ReadonlySignal,
    type Signal,
} from '@flybyme/mesh-web';
import {
    THEME_TOKEN,
    type ThemeMode,
    type ThemeTokenName,
    type ThemeTokens,
} from '../contracts/theme.js';

// ---------------------------------------------------------------------------- contract & API

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
}

export const PALETTE: ProviderToken<PaletteApi> = provider<PaletteApi>('palette');

export const NEEDS = needs('state', 'commands', 'windows', 'log');
export const CONSUMES = consumes(THEME_TOKEN);
