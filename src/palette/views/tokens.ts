/**
 * Palette Tokens view: displays all theme tokens and preset mode switchers.
 */

import {
    each,
    element,
    text,
    type Node,
} from '@flybyme/mesh-web';
import { THEME_TOKEN_NAMES, type ThemeTokenName } from '../contract.js';
import type { PaletteView } from '../contract.js';

export function renderTokensView(vx: PaletteView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'palette-pane' },
        children: [
            // Header with mode badge
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                    },
                },
                children: [
                    element('Text', {
                        props: { class: 'palette-title' },
                        children: [text('Theme Tokens')],
                    }),
                    element('Text', {
                        props: { class: 'palette-mode-badge' },
                        children: [text(() => app.activeMode())],
                    }),
                ],
            }),

            // Preset switcher buttons
            element('Row', {
                props: { class: 'preset-buttons-row' },
                children: [
                    element('Button', {
                        props: { class: 'btn-mode-dark' },
                        intents: { activate: { action: vx.on(() => app.switchMode('dark')) } },
                        children: [text('Dark')],
                    }),
                    element('Button', {
                        props: { class: 'btn-mode-light' },
                        intents: { activate: { action: vx.on(() => app.switchMode('light')) } },
                        children: [text('Light')],
                    }),
                    element('Button', {
                        props: { class: 'btn-mode-hc' },
                        intents: { activate: { action: vx.on(() => app.switchMode('high-contrast')) } },
                        children: [text('High Contrast')],
                    }),
                    element('Button', {
                        props: { class: 'btn-mode-reset' },
                        intents: { activate: { action: vx.on(() => app.reset()) } },
                        children: [text('Reset All')],
                    }),
                ],
            }),

            // List of tokens
            element('Stack', {
                props: { class: 'token-list' },
                children: [
                    each(
                        () => THEME_TOKEN_NAMES,
                        (tokenName: ThemeTokenName) => tokenName,
                        (tokenName: () => ThemeTokenName) => {
                            const name = tokenName();
                            const suffix = name.startsWith('--') ? name.slice(2) : name;
                            return element('Row', {
                                props: { class: `token-item token-row-${suffix}` },
                                children: [
                                    element('Row', {
                                        props: { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                                        children: [
                                            element('Row', {
                                                props: {
                                                    class: `token-swatch swatch-${suffix}`,
                                                    style: () => ({
                                                        backgroundColor: app.tokens()[tokenName()],
                                                    }),
                                                },
                                            }),
                                            element('Stack', {
                                                children: [
                                                    element('Text', {
                                                        props: { class: 'token-name' },
                                                        children: [text(name)],
                                                    }),
                                                    element('Text', {
                                                        props: { class: 'token-value' },
                                                        children: [text(() => app.tokens()[tokenName()])],
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                                    element('Button', {
                                        props: { class: `btn-select-token btn-select-${suffix}` },
                                        intents: { activate: { action: vx.on(() => app.selectToken(name)) } },
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
