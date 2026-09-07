import { needs, type StorageProvider } from '@flybyme/mesh-web';
import { type ThemeMode } from '../contracts/theme.js';

export {
    DARK_TOKENS,
    HIGH_CONTRAST_TOKENS,
    LIGHT_TOKENS,
    THEME_PRESETS,
    THEME_TOKEN,
    THEME_TOKEN_NAMES,
    isThemeMode,
    isThemeTokenName,
    type ThemeApi,
    type ThemeMode,
    type ThemeTokenName,
    type ThemeTokens,
} from '../contracts/theme.js';

export interface ThemeOptions {
    readonly storage?: StorageProvider;
    readonly initialMode?: ThemeMode;
}

export const NEEDS = needs('state', 'log', 'commands');
