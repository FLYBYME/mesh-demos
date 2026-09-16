/**
 * Theme extension: provides dynamic CSS tokens and theming across parts.
 */

import {
    localProvider,
    type CommandDecl,
    type Context,
    type Extension,
    type StorageProvider,
} from '@flybyme/mesh-web';
import {
    DARK_TOKENS,
    HIGH_CONTRAST_TOKENS,
    LIGHT_TOKENS,
    NEEDS,
    PUBLISHES,
    THEME_PRESETS,
    THEME_TOKEN,
    THEME_TOKEN_NAMES,
    isThemeMode,
    type ThemeApi,
    type ThemeMode,
    type ThemeOptions,
    type ThemeTokenName,
    type ThemeTokens,
} from './contract.js';

export * from './contract.js';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function applyTokensToDocument(tokens: ThemeTokens): void {
    if (typeof document === 'undefined' || !document.documentElement) return;
    for (const name of THEME_TOKEN_NAMES) {
        const val = tokens[name];
        document.documentElement.style.setProperty(name, val);
    }
}

export default class ThemeExtension implements Extension<typeof NEEDS, readonly [], typeof THEME_TOKEN> {
    readonly needs = NEEDS;
    readonly provides = THEME_TOKEN;
    readonly publishes = PUBLISHES;

    readonly commands: readonly CommandDecl[] = [
        { id: 'theme.setMode', title: 'Theme: Set Mode' },
        { id: 'theme.toggleMode', title: 'Theme: Toggle Dark/Light Mode' },
        { id: 'theme.reset', title: 'Theme: Reset to Defaults' },
    ];

    private readonly storage: StorageProvider;
    private readonly initialMode: ThemeMode | undefined;

    constructor(options?: ThemeOptions) {
        this.storage = options?.storage ?? localProvider();
        this.initialMode = options?.initialMode;
    }

    activate(cx: Context<typeof NEEDS, readonly []>): ThemeApi {
        cx.log.info('ThemeExtension activating');

        const initialPresetName: ThemeMode = this.initialMode ?? 'dark';
        const initialPreset =
            initialPresetName === 'light'
                ? LIGHT_TOKENS
                : initialPresetName === 'high-contrast'
                    ? HIGH_CONTRAST_TOKENS
                    : DARK_TOKENS;

        const mode = cx.state.signal<ThemeMode>(initialPresetName);
        const tokens = cx.state.signal<ThemeTokens>(initialPreset);

        // Immediately apply initial tokens to document so page restyles synchronously
        applyTokensToDocument(initialPreset);

        const saveToStorage = async (modeVal: ThemeMode, tokensVal: ThemeTokens): Promise<void> => {
            try {
                await this.storage.write('theme', 'config', {
                    mode: modeVal,
                    tokens: tokensVal,
                });
            } catch (err) {
                cx.log.warn('ThemeExtension failed to persist configuration', err);
            }
        };

        const setMode = async (modeVal: ThemeMode): Promise<void> => {
            if (modeVal === 'dark' || modeVal === 'light' || modeVal === 'high-contrast') {
                const preset = THEME_PRESETS[modeVal];
                mode.set(modeVal);
                tokens.set(preset);
                applyTokensToDocument(preset);
                await saveToStorage(modeVal, preset);
            } else if (modeVal === 'custom') {
                mode.set('custom');
                await saveToStorage('custom', tokens());
            }
        };

        const setToken = async (token: ThemeTokenName, value: string): Promise<void> => {
            const current = tokens();
            const next: ThemeTokens = {
                ...current,
                [token]: value,
            };
            mode.set('custom');
            tokens.set(next);
            if (typeof document !== 'undefined' && document.documentElement) {
                document.documentElement.style.setProperty(token, value);
            }
            await saveToStorage('custom', next);
        };

        const setTokens = async (tokensPatch: Partial<Record<ThemeTokenName, string>>): Promise<void> => {
            const current = tokens();
            const next: ThemeTokens = {
                ...current,
                ...tokensPatch,
            };
            mode.set('custom');
            tokens.set(next);
            applyTokensToDocument(next);
            await saveToStorage('custom', next);
        };

        const reset = async (): Promise<void> => {
            mode.set('dark');
            tokens.set(DARK_TOKENS);
            applyTokensToDocument(DARK_TOKENS);
            try {
                await this.storage.delete('theme', 'config');
            } catch {
                // Ignore storage deletion error on reset
            }
        };

        // Restore persisted theme asynchronously via StorageProvider
        void this.storage.read('theme', 'config').then((entry) => {
            if (entry === undefined || !isRecord(entry.value)) return;
            const data = entry.value;

            let restoredTokens = initialPreset;
            if (isRecord(data.tokens)) {
                const patch: Partial<Record<ThemeTokenName, string>> = {};
                for (const name of THEME_TOKEN_NAMES) {
                    const candidate = data.tokens[name];
                    if (typeof candidate === 'string') {
                        patch[name] = candidate;
                    }
                }
                restoredTokens = {
                    ...restoredTokens,
                    ...patch,
                };
            }

            let restoredMode = initialPresetName;
            if (typeof data.mode === 'string' && isThemeMode(data.mode)) {
                restoredMode = data.mode;
            }

            mode.set(restoredMode);
            tokens.set(restoredTokens);
            applyTokensToDocument(restoredTokens);
        });

        // Command implementations
        cx.commands.implement('theme.setMode', async (arg?: unknown) => {
            if (typeof arg === 'string' && isThemeMode(arg)) {
                await setMode(arg);
            } else if (typeof arg === 'object' && arg !== null && 'mode' in arg) {
                const m = (arg as { mode: unknown }).mode;
                if (typeof m === 'string' && isThemeMode(m)) {
                    await setMode(m);
                }
            }
        });

        cx.commands.implement('theme.toggleMode', async () => {
            const current = mode();
            const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
            await setMode(next);
        });

        cx.commands.implement('theme.reset', async () => {
            await reset();
        });

        // Cleanup on dispose: remove CSS custom properties from document root
        cx.onDispose(() => {
            if (typeof document !== 'undefined' && document.documentElement) {
                for (const name of THEME_TOKEN_NAMES) {
                    document.documentElement.style.removeProperty(name);
                }
            }
        });

        return {
            mode,
            tokens,
            setMode,
            setToken,
            setTokens,
            reset,
        };
    }
}
