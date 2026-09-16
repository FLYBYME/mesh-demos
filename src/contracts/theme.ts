/**
 * Shared theme contract, tokens, and presets.
 */

import { provider, type ProviderToken, type Signal } from '@flybyme/mesh-web';

export type ThemeTokenName =
    | '--page'
    | '--chrome'
    | '--surface'
    | '--surface-hover'
    | '--ink'
    | '--ink-dim'
    | '--edge'
    | '--accent'
    | '--on-accent'
    | '--info'
    | '--warn'
    | '--error'
    | '--shadow';

export type ThemeMode = 'dark' | 'light' | 'high-contrast' | 'custom';

export type ThemeTokens = Readonly<Record<ThemeTokenName, string>>;

export const THEME_TOKEN_NAMES: readonly ThemeTokenName[] = [
    '--page',
    '--chrome',
    '--surface',
    '--surface-hover',
    '--ink',
    '--ink-dim',
    '--edge',
    '--accent',
    '--on-accent',
    '--info',
    '--warn',
    '--error',
    '--shadow',
];

export const DARK_TOKENS: ThemeTokens = {
    '--page': '#0d1117',
    '--chrome': '#161b22',
    '--surface': '#161b22',
    '--surface-hover': '#21262d',
    '--ink': '#e6edf3',
    '--ink-dim': '#8b949e',
    '--edge': '#30363d',
    '--accent': '#58a6ff',
    '--on-accent': '#0d1117',
    '--info': '#58a6ff',
    '--warn': '#d29922',
    '--error': '#f85149',
    '--shadow': 'rgba(0, 0, 0, 0.35)',
};

export const LIGHT_TOKENS: ThemeTokens = {
    '--page': '#f6f8fa',
    '--chrome': '#ffffff',
    '--surface': '#ffffff',
    '--surface-hover': '#f3f4f6',
    '--ink': '#1f2328',
    '--ink-dim': '#656d76',
    '--edge': '#d0d7de',
    '--accent': '#0969da',
    '--on-accent': '#ffffff',
    '--info': '#0969da',
    '--warn': '#9a6700',
    '--error': '#cf222e',
    '--shadow': 'rgba(31, 35, 40, 0.15)',
};

export const HIGH_CONTRAST_TOKENS: ThemeTokens = {
    '--page': '#000000',
    '--chrome': '#000000',
    '--surface': '#0a0a0a',
    '--surface-hover': '#262626',
    '--ink': '#ffffff',
    '--ink-dim': '#d0d0d0',
    '--edge': '#ffffff',
    '--accent': '#ffff00',
    '--on-accent': '#000000',
    '--info': '#00ffff',
    '--warn': '#ffaa00',
    '--error': '#ff5555',
    '--shadow': 'rgba(255, 255, 255, 0.4)',
};

export const THEME_PRESETS: Readonly<Record<'dark' | 'light' | 'high-contrast', ThemeTokens>> = {
    dark: DARK_TOKENS,
    light: LIGHT_TOKENS,
    'high-contrast': HIGH_CONTRAST_TOKENS,
};

export function isThemeTokenName(name: string): name is ThemeTokenName {
    for (const valid of THEME_TOKEN_NAMES) {
        if (valid === name) return true;
    }
    return false;
}

export function isThemeMode(mode: string): mode is ThemeMode {
    return mode === 'dark' || mode === 'light' || mode === 'high-contrast' || mode === 'custom';
}

export interface ThemeApi {
    readonly mode: Signal<ThemeMode>;
    readonly tokens: Signal<ThemeTokens>;
    setMode(mode: ThemeMode): Promise<void>;
    setToken(token: ThemeTokenName, value: string): Promise<void>;
    setTokens(tokens: Partial<Record<ThemeTokenName, string>>): Promise<void>;
    reset(): Promise<void>;
}

export const THEME_TOKEN: ProviderToken<ThemeApi> = provider<ThemeApi>('theme');
