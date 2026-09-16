/**
 * Palette demo application: Inspect and edit theme tokens live.
 */

import {
    defineApi,
    type Application,
    type ApplicationStartResult,
    type CommandDecl,
    type Context,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    CONSUMES,
    NEEDS,
    PALETTE,
    type PaletteApi,
    type PaletteInternal,
} from './contract.js';
import {
    DARK_TOKENS,
    HIGH_CONTRAST_TOKENS,
    LIGHT_TOKENS,
    THEME_TOKEN,
    isThemeTokenName,
    type ThemeMode,
    type ThemeTokenName,
    type ThemeTokens,
} from '../contracts/theme.js';
import { renderEditorView } from './views/editor.js';
import { renderPreviewView } from './views/preview.js';
import { renderTokensView } from './views/tokens.js';

import './palette.css';

export * from './contract.js';

export const paletteApi = defineApi({
    id: 'palette',
    exposure: 'local',
    calls: {},
});

export default class PaletteApp implements Application<
    typeof NEEDS,
    typeof CONSUMES,
    typeof PALETTE,
    typeof paletteApi,
    PaletteInternal
> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = PALETTE;
    readonly api = paletteApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'palette.setDark', title: 'Palette: Switch to Dark Theme' },
        { id: 'palette.setLight', title: 'Palette: Switch to Light Theme' },
        { id: 'palette.setHighContrast', title: 'Palette: Switch to High Contrast Theme' },
        { id: 'palette.reset', title: 'Palette: Reset Theme' },
        { id: 'palette.selectToken', title: 'Palette: Select Token to Edit' },
        { id: 'palette.setDraftValue', title: 'Palette: Set Draft Token Value' },
        { id: 'palette.apply', title: 'Palette: Apply Token Value' },
        { id: 'palette.resetSelected', title: 'Palette: Reset Selected Token' },
        { id: 'palette.openTokens', title: 'Palette: Open Tokens View' },
        { id: 'palette.openEditor', title: 'Palette: Open Editor View' },
        { id: 'palette.openPreview', title: 'Palette: Open Preview View' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, PaletteInternal>[] = [
        {
            id: 'tokens',
            title: 'Theme Tokens',
            instances: 'one',
            window: {
                defaultSize: { width: 440, height: 500 },
                minSize: { width: 320, height: 300 },
            },
            render: renderTokensView,
        },
        {
            id: 'editor',
            title: 'Token Editor',
            instances: 'one',
            window: {
                defaultSize: { width: 380, height: 420 },
                minSize: { width: 280, height: 260 },
            },
            render: renderEditorView,
        },
        {
            id: 'preview',
            title: 'Live Preview',
            instances: 'one',
            window: {
                defaultSize: { width: 380, height: 420 },
                minSize: { width: 280, height: 260 },
            },
            render: renderPreviewView,
        },
    ];

    async start(
        cx: Context<typeof NEEDS, typeof CONSUMES, typeof paletteApi>,
    ): Promise<ApplicationStartResult<PaletteApi, PaletteInternal>> {
        cx.log.info('PaletteApp starting');

        // Resolve theme Extension provider from kernel context
        const theme = cx.use(THEME_TOKEN);

        const selectedToken = cx.state.signal<ThemeTokenName>('--accent');
        const draftValue = cx.state.signal<string>(theme.tokens()['--accent']);
        const draftRevision = cx.state.signal<number>(0);

        const activeMode = (): ThemeMode => theme.mode();
        const tokens = (): ThemeTokens => theme.tokens();

        const selectToken = (name: ThemeTokenName): void => {
            selectedToken.set(name);
            draftValue.set(theme.tokens()[name]);
            draftRevision.set(draftRevision() + 1);
        };

        const setDraftValue = (val: string): void => {
            draftValue.set(val);
        };

        const applyToken = async (): Promise<void> => {
            const currentSelected = selectedToken();
            const val = draftValue().trim();
            if (val.length > 0) {
                await theme.setToken(currentSelected, val);
            }
        };

        const switchMode = async (m: ThemeMode): Promise<void> => {
            await theme.setMode(m);
            draftValue.set(theme.tokens()[selectedToken()]);
            draftRevision.set(draftRevision() + 1);
        };

        const reset = async (): Promise<void> => {
            await theme.reset();
            draftValue.set(theme.tokens()[selectedToken()]);
            draftRevision.set(draftRevision() + 1);
        };

        const resetSelected = async (): Promise<void> => {
            const tokenName = selectedToken();
            const mode = activeMode();
            const presetTokens =
                mode === 'light'
                    ? LIGHT_TOKENS
                    : mode === 'high-contrast'
                        ? HIGH_CONTRAST_TOKENS
                        : DARK_TOKENS;
            const defaultVal = presetTokens[tokenName];
            await theme.setToken(tokenName, defaultVal);
            draftValue.set(defaultVal);
            draftRevision.set(draftRevision() + 1);
        };

        const openTokens = (): void => {
            cx.windows.open({ view: 'tokens' });
        };

        const openEditor = (): void => {
            cx.windows.open({ view: 'editor' });
        };

        const openPreview = (): void => {
            cx.windows.open({ view: 'preview' });
        };

        // Command implementations
        cx.commands.implement('palette.setDark', async () => {
            await switchMode('dark');
        });

        cx.commands.implement('palette.setLight', async () => {
            await switchMode('light');
        });

        cx.commands.implement('palette.setHighContrast', async () => {
            await switchMode('high-contrast');
        });

        cx.commands.implement('palette.reset', async () => {
            await reset();
        });

        cx.commands.implement('palette.selectToken', (arg?: unknown) => {
            if (typeof arg === 'string' && isThemeTokenName(arg)) {
                selectToken(arg);
            } else if (typeof arg === 'object' && arg !== null && 'token' in arg) {
                const tok = String((arg as { token: unknown }).token);
                if (isThemeTokenName(tok)) selectToken(tok);
            }
        });

        cx.commands.implement('palette.setDraftValue', (arg?: unknown) => {
            if (typeof arg === 'string') {
                setDraftValue(arg);
            } else if (typeof arg === 'object' && arg !== null && 'value' in arg) {
                setDraftValue(String((arg as { value: unknown }).value));
            }
        });

        cx.commands.implement('palette.apply', async () => {
            await applyToken();
        });

        cx.commands.implement('palette.resetSelected', async () => {
            await resetSelected();
        });

        cx.commands.implement('palette.openTokens', () => {
            openTokens();
        });

        cx.commands.implement('palette.openEditor', () => {
            openEditor();
        });

        cx.commands.implement('palette.openPreview', () => {
            openPreview();
        });

        // Defer default window opening
        setTimeout(() => {
            if (cx.windows.own().length === 0) {
                openTokens();
                openEditor();
                openPreview();
            }
        }, 0);

        const api: PaletteApi = {
            selectedToken,
            activeMode,
            selectToken,
        };

        const internal: PaletteInternal = {
            selectedToken,
            draftValue,
            draftRevision,
            activeMode,
            tokens,
            selectToken,
            setDraftValue,
            applyToken,
            switchMode,
            reset,
            resetSelected,
            openTokens,
            openEditor,
            openPreview,
        };

        return { api, internal };
    }
}
