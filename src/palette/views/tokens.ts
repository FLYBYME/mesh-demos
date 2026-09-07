import {
    command,
    each,
    element,
    text,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import {
    THEME_TOKEN_NAMES,
} from '../../contracts/theme.js';
import type { PaletteApi } from '../contract.js';

export function renderTokensView(vx: ViewContext<Record<string, never>, PaletteApi>): Node {
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
