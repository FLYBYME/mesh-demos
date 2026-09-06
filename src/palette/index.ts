import {
    command,
    consumes,
    each,
    element,
    needs,
    provider,
    text,
    tiles,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ProviderToken,
    type Signal,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';
import {
    DARK_TOKENS,
    HIGH_CONTRAST_TOKENS,
    LIGHT_TOKENS,
    THEME_TOKEN,
    THEME_TOKEN_NAMES,
    isThemeTokenName,
    type ThemeMode,
    type ThemeTokenName,
    type ThemeTokens,
} from '../shared/theme.js';

// ---------------------------------------------------------------------------- contract & API

export interface PaletteApi {
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

const NEEDS = needs('state', 'commands', 'windows', 'log');
const CONSUMES = consumes(THEME_TOKEN);

// ---------------------------------------------------------------------------- views

function renderTokensView(vx: ViewContext<Record<string, never>, PaletteApi>): Node {
    return element('Stack', {
        props: {
            class: 'palette-pane tokens-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                overflow: 'auto',
            },
        },
        children: [
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: { class: 'palette-title', style: { margin: '0', 'font-size': '16px' } },
                        children: [text('Theme Tokens')],
                    }),
                    element('Badge', {
                        props: {
                            class: 'palette-mode-badge',
                            style: {
                                padding: '3px 8px',
                                'border-radius': '12px',
                                'font-size': '11px',
                                'font-weight': '600',
                                'text-transform': 'uppercase',
                                border: '1px solid var(--accent)',
                                color: 'var(--accent)',
                            },
                        },
                        children: [text(() => vx.app.activeMode())],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'preset-buttons-row',
                    style: { display: 'flex', gap: '8px', 'flex-wrap': 'wrap' },
                },
                children: [
                    element('Button', {
                        props: { class: 'btn-mode-dark' },
                        intents: { activate: { action: command('palette.setDark') } },
                        children: [text('Dark')],
                    }),
                    element('Button', {
                        props: { class: 'btn-mode-light' },
                        intents: { activate: { action: command('palette.setLight') } },
                        children: [text('Light')],
                    }),
                    element('Button', {
                        props: { class: 'btn-mode-hc' },
                        intents: { activate: { action: command('palette.setHighContrast') } },
                        children: [text('High Contrast')],
                    }),
                    element('Button', {
                        props: { class: 'btn-mode-reset' },
                        intents: { activate: { action: command('palette.reset') } },
                        children: [text('Reset All')],
                    }),
                ],
            }),
            element('List', {
                props: {
                    class: 'token-list',
                    style: {
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '6px',
                        padding: '0',
                        margin: '8px 0 0 0',
                    },
                },
                children: [
                    each(
                        () => THEME_TOKEN_NAMES,
                        (tokenName) => tokenName,
                        (tokenName) => {
                            const name = tokenName();
                            const suffix = name.startsWith('--') ? name.slice(2) : name;
                            return element('ListItem', {
                                props: {
                                    class: `token-item token-row-${suffix}`,
                                    style: {
                                        display: 'flex',
                                        'align-items': 'center',
                                        'justify-content': 'space-between',
                                        padding: '8px 10px',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--edge)',
                                        'border-radius': '6px',
                                    },
                                },
                                children: [
                                    element('Row', {
                                        props: {
                                            style: {
                                                display: 'flex',
                                                'align-items': 'center',
                                                gap: '10px',
                                            },
                                        },
                                        children: [
                                            element('Row', {
                                                props: {
                                                    class: `token-swatch swatch-${suffix}`,
                                                    style: () => ({
                                                        width: '20px',
                                                        height: '20px',
                                                        'border-radius': '4px',
                                                        border: '1px solid var(--edge)',
                                                        background: vx.app.tokens()[tokenName()],
                                                        'flex-shrink': '0',
                                                    }),
                                                },
                                            }),
                                            element('Stack', {
                                                children: [
                                                    element('Text', {
                                                        props: {
                                                            class: 'token-name',
                                                            style: {
                                                                'font-family': 'monospace',
                                                                'font-weight': '600',
                                                                'font-size': '13px',
                                                            },
                                                        },
                                                        children: [text(name)],
                                                    }),
                                                    element('Text', {
                                                        props: {
                                                            class: 'token-value',
                                                            style: {
                                                                'font-size': '12px',
                                                                color: 'var(--ink-dim)',
                                                                'font-family': 'monospace',
                                                            },
                                                        },
                                                        children: [text(() => vx.app.tokens()[tokenName()])],
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                                    element('Button', {
                                        props: {
                                            class: `btn-select-token btn-select-${suffix}`,
                                            style: { padding: '4px 8px', 'font-size': '12px' },
                                        },
                                        intents: { activate: { action: command('palette.selectToken', name) } },
                                        children: [text('Edit')],
                                    }),
                                ],
                            });
                        },
                    ),
                ],
            }),
        ],
    });
}

function renderEditorView(vx: ViewContext<Record<string, never>, PaletteApi>): Node {
    const quickColors: readonly string[] = [
        '#58a6ff',
        '#0969da',
        '#ffff00',
        '#f85149',
        '#3fb950',
        '#a371f7',
        '#f0883e',
        '#ffffff',
        '#0d1117',
    ];

    return element('Stack', {
        props: {
            class: 'palette-pane editor-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
            },
        },
        children: [
            element('Heading', {
                props: { class: 'editor-title', style: { margin: '0', 'font-size': '16px' } },
                children: [text('Token Editor')],
            }),
            element('Card', {
                props: {
                    class: 'editor-card',
                    style: {
                        padding: '12px',
                        display: 'flex',
                        'flex-direction': 'column',
                        gap: '10px',
                    },
                },
                children: [
                    element('Row', {
                        props: {
                            style: {
                                display: 'flex',
                                'align-items': 'center',
                                'justify-content': 'space-between',
                            },
                        },
                        children: [
                            element('Stack', {
                                children: [
                                    element('Text', {
                                        props: {
                                            style: {
                                                'font-size': '11px',
                                                color: 'var(--ink-dim)',
                                                'text-transform': 'uppercase',
                                                'font-weight': '600',
                                            },
                                        },
                                        children: [text('Selected Token')],
                                    }),
                                    element('Text', {
                                        props: {
                                            class: 'selected-token-name',
                                            style: {
                                                'font-family': 'monospace',
                                                'font-weight': 'bold',
                                                'font-size': '15px',
                                                color: 'var(--accent)',
                                            },
                                        },
                                        children: [text(() => vx.app.selectedToken())],
                                    }),
                                ],
                            }),
                            element('Row', {
                                props: {
                                    class: 'editor-swatch',
                                    style: () => ({
                                        width: '32px',
                                        height: '32px',
                                        'border-radius': '6px',
                                        border: '1px solid var(--edge)',
                                        background: vx.app.tokens()[vx.app.selectedToken()],
                                    }),
                                },
                            }),
                        ],
                    }),
                    element('Row', {
                        children: [
                            element('Text', {
                                props: { style: { 'font-size': '12px', color: 'var(--ink-dim)' } },
                                children: [text('Current Value: ')],
                            }),
                            element('Text', {
                                props: {
                                    class: 'selected-token-value',
                                    style: {
                                        'font-family': 'monospace',
                                        'font-size': '12px',
                                        'margin-left': '6px',
                                    },
                                },
                                children: [text(() => vx.app.tokens()[vx.app.selectedToken()])],
                            }),
                        ],
                    }),
                    element('Form', {
                        props: { class: 'palette-edit-form' },
                        intents: { commit: { action: command('palette.apply'), preventDefault: true } },
                        children: [
                            element('Stack', {
                                props: { gap: 6, style: { display: 'flex', 'flex-direction': 'column', gap: '6px' } },
                                children: [
                                    element('Text', {
                                        props: { style: { 'font-size': '12px', 'font-weight': '500' } },
                                        children: [text('New Token Value:')],
                                    }),
                                    each(
                                        () => [vx.app.draftRevision()],
                                        (rev) => rev,
                                        () => element('Input', {
                                            props: {
                                                class: 'input-token-value',
                                                placeholder: 'e.g. #58a6ff or rgba(...)',
                                                value: () => vx.app.draftValue(),
                                                style: { padding: '6px 8px', 'font-size': '13px' },
                                            },
                                            intents: { change: { action: command('palette.setDraftValue') } },
                                        }),
                                    ),
                                    element('Row', {
                                        props: { style: { display: 'flex', gap: '8px', 'margin-top': '8px' } },
                                        children: [
                                            element('Button', {
                                                props: { class: 'btn-apply-token', type: 'submit' },
                                                intents: { activate: { action: command('palette.apply') } },
                                                children: [text('Apply Token')],
                                            }),
                                            element('Button', {
                                                props: { class: 'btn-reset-selected', type: 'button' },
                                                intents: { activate: { action: command('palette.resetSelected') } },
                                                children: [text('Reset Token')],
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                    element('Stack', {
                        props: { gap: 6, style: { display: 'flex', 'flex-direction': 'column', gap: '6px', 'margin-top': '8px' } },
                        children: [
                            element('Text', {
                                props: { style: { 'font-size': '11px', color: 'var(--ink-dim)' } },
                                children: [text('Quick color samples:')],
                            }),
                            element('Row', {
                                props: {
                                    class: 'quick-colors-row',
                                    style: { display: 'flex', gap: '6px', 'flex-wrap': 'wrap' },
                                },
                                children: [
                                    each(
                                        () => quickColors,
                                        (colorHex) => colorHex,
                                        (colorHex) => {
                                            const hex = colorHex();
                                            return element('Button', {
                                                props: {
                                                    class: 'btn-quick-color',
                                                    style: {
                                                        width: '24px',
                                                        height: '24px',
                                                        padding: '0',
                                                        background: hex,
                                                        border: '1px solid var(--edge)',
                                                        'border-radius': '4px',
                                                    },
                                                },
                                                intents: { activate: { action: command('palette.setDraftValue', hex) } },
                                            });
                                        },
                                    ),
                                ],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}

function renderPreviewView(_vx: ViewContext<Record<string, never>, PaletteApi>): Node {
    return element('Stack', {
        props: {
            class: 'palette-pane preview-pane',
            gap: 12,
            style: {
                padding: '16px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                overflow: 'auto',
            },
        },
        children: [
            element('Heading', {
                props: { class: 'preview-title', style: { margin: '0', 'font-size': '16px' } },
                children: [text('Live Theme Preview')],
            }),
            element('Card', {
                props: {
                    class: 'preview-window-mock',
                    style: {
                        padding: '0',
                        overflow: 'hidden',
                        'border-radius': '6px',
                        border: '1px solid var(--edge)',
                        background: 'var(--surface)',
                        'box-shadow': '0 4px 12px var(--shadow)',
                    },
                },
                children: [
                    element('Row', {
                        props: {
                            class: 'preview-chrome-titlebar',
                            style: {
                                padding: '6px 10px',
                                background: 'var(--chrome)',
                                'border-bottom': '1px solid var(--edge)',
                                display: 'flex',
                                'align-items': 'center',
                                'justify-content': 'space-between',
                            },
                        },
                        children: [
                            element('Text', {
                                props: { style: { 'font-weight': '600', 'font-size': '13px' } },
                                children: [text('Sample Window Chrome')],
                            }),
                            element('Badge', {
                                props: {
                                    class: 'preview-badge-accent',
                                    style: {
                                        padding: '2px 6px',
                                        'border-radius': '4px',
                                        'font-size': '11px',
                                        background: 'var(--accent)',
                                        color: 'var(--on-accent)',
                                    },
                                },
                                children: [text('Active')],
                            }),
                        ],
                    }),
                    element('Stack', {
                        props: {
                            gap: 10,
                            style: { padding: '12px', display: 'flex', 'flex-direction': 'column', gap: '10px' },
                        },
                        children: [
                            element('Text', {
                                props: {
                                    class: 'preview-text-primary',
                                    style: { color: 'var(--ink)', 'font-size': '14px', 'font-weight': '500' },
                                },
                                children: [text('Primary text colored with var(--ink)')],
                            }),
                            element('Text', {
                                props: {
                                    class: 'preview-text-muted',
                                    style: { color: 'var(--ink-dim)', 'font-size': '13px' },
                                },
                                children: [text('Subtle muted text colored with var(--ink-dim)')],
                            }),
                            element('Row', {
                                props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                                children: [
                                    element('Button', {
                                        props: { class: 'preview-btn-default' },
                                        children: [text('Surface Button')],
                                    }),
                                    element('Button', {
                                        props: {
                                            class: 'preview-btn-accent',
                                            style: { background: 'var(--accent)', color: 'var(--on-accent)' },
                                        },
                                        children: [text('Accent Button')],
                                    }),
                                ],
                            }),
                            element('Row', {
                                props: {
                                    class: 'preview-notice-info',
                                    style: {
                                        padding: '6px 10px',
                                        border: '1px solid var(--info)',
                                        'border-radius': '4px',
                                        background: 'var(--surface)',
                                        'font-size': '12px',
                                    },
                                },
                                children: [text('Info alert styled with var(--info)')],
                            }),
                            element('Row', {
                                props: {
                                    class: 'preview-notice-warn',
                                    style: {
                                        padding: '6px 10px',
                                        border: '1px solid var(--warn)',
                                        'border-radius': '4px',
                                        background: 'var(--surface)',
                                        'font-size': '12px',
                                    },
                                },
                                children: [text('Warning alert styled with var(--warn)')],
                            }),
                            element('Row', {
                                props: {
                                    class: 'preview-notice-error',
                                    style: {
                                        padding: '6px 10px',
                                        border: '1px solid var(--error)',
                                        'border-radius': '4px',
                                        background: 'var(--surface)',
                                        'font-size': '12px',
                                    },
                                },
                                children: [text('Error alert styled with var(--error)')],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}

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
