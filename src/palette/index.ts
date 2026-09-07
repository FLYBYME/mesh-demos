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
    DARK_TOKENS,
    HIGH_CONTRAST_TOKENS,
    LIGHT_TOKENS,
    THEME_TOKEN,
    isThemeTokenName,
    type ThemeMode,
    type ThemeTokenName,
    type ThemeTokens,
} from '../contracts/theme.js';
import {
    CONSUMES,
    NEEDS,
    PALETTE,
    type PaletteApi,
} from './contract.js';
import { renderTokensView } from './views/tokens.js';
import { renderEditorView } from './views/editor.js';
import { renderPreviewView } from './views/preview.js';

export { PALETTE, type PaletteApi } from './contract.js';

// ---------------------------------------------------------------------------- application

export default class PaletteApp implements Application<typeof NEEDS, typeof CONSUMES, typeof PALETTE> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = PALETTE;

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'main' }, size: 2 },
            {
                node: {
                    split: 'column',
                    children: [
                        { node: { tile: 'editor' }, size: 1 },
                        { node: { tile: 'preview' }, size: 1 },
                    ],
                },
                size: 2,
            },
        ],
    });

    readonly views: readonly ViewDecl<Record<string, never>, PaletteApi>[] = [
        {
            id: 'tokens',
            title: 'Theme Tokens',
            tile: 'main',
            instances: 'one',
            defaultSize: { width: 440, height: 500 },
            minSize: { width: 320, height: 300 },
            render(vx: ViewContext<Record<string, never>, PaletteApi>): Node {
                return renderTokensView(vx);
            },
        },
        {
            id: 'editor',
            title: 'Token Editor',
            tile: 'editor',
            instances: 'one',
            defaultSize: { width: 380, height: 400 },
            minSize: { width: 280, height: 260 },
            render(vx: ViewContext<Record<string, never>, PaletteApi>): Node {
                return renderEditorView(vx);
            },
        },
        {
            id: 'preview',
            title: 'Live Preview',
            tile: 'preview',
            instances: 'one',
            defaultSize: { width: 380, height: 400 },
            minSize: { width: 280, height: 260 },
            render(vx: ViewContext<Record<string, never>, PaletteApi>): Node {
                return renderPreviewView(vx);
            },
        },
    ];

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

    readonly keys: readonly KeyDecl[] = [
        { command: 'palette.setDark', keys: 'ctrl+1' },
        { command: 'palette.setLight', keys: 'ctrl+2' },
        { command: 'palette.setHighContrast', keys: 'ctrl+3' },
        { command: 'palette.reset', keys: 'ctrl+r' },
    ];

    async start(cx: Context<typeof NEEDS, typeof CONSUMES>): Promise<PaletteApi> {
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

        cx.commands.implement('palette.selectToken', (name?: Json) => {
            if (typeof name === 'string' && isThemeTokenName(name)) {
                selectToken(name);
            }
        });

        cx.commands.implement('palette.setDraftValue', (val?: Json) => {
            if (typeof val === 'string') {
                setDraftValue(val);
            }
        });

        cx.commands.implement('palette.apply', async () => {
            await applyToken();
        });

        cx.commands.implement('palette.resetSelected', async () => {
            const tokenName = selectedToken();
            const mode = activeMode();
            const presetTokens = mode === 'light'
                ? LIGHT_TOKENS
                : mode === 'high-contrast'
                    ? HIGH_CONTRAST_TOKENS
                    : DARK_TOKENS;
            const defaultVal = presetTokens[tokenName];
            await theme.setToken(tokenName, defaultVal);
            draftValue.set(defaultVal);
            draftRevision.set(draftRevision() + 1);
        });

        cx.commands.implement('palette.openTokens', () => {
            cx.windows.open({ view: 'tokens' });
        });

        cx.commands.implement('palette.openEditor', () => {
            cx.windows.open({ view: 'editor' });
        });

        cx.commands.implement('palette.openPreview', () => {
            cx.windows.open({ view: 'preview' });
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'tokens' });
                cx.windows.open({ view: 'editor' });
                cx.windows.open({ view: 'preview' });
            }
        });

        return {
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
        };
    }
}
