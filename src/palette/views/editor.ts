/**
 * Palette Editor view: lets users tweak, test, and apply specific token values.
 */

import {
    each,
    element,
    text,
    type Node,
} from '@flybyme/mesh-web';
import { QUICK_COLORS, type PaletteView } from '../contract.js';

export function renderEditorView(vx: PaletteView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'palette-pane' },
        children: [
            element('Text', {
                props: { class: 'editor-title', style: { marginBottom: '14px' } },
                children: [text('Token Editor')],
            }),

            element('Stack', {
                props: { class: 'editor-card' },
                children: [
                    // Selected token info & swatch
                    element('Row', {
                        props: {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            },
                        },
                        children: [
                            element('Stack', {
                                children: [
                                    element('Text', {
                                        props: {
                                            style: {
                                                fontSize: '11px',
                                                color: 'var(--ink-dim)',
                                                textTransform: 'uppercase',
                                                fontWeight: '600',
                                            },
                                        },
                                        children: [text('Selected Token')],
                                    }),
                                    element('Text', {
                                        props: { class: 'selected-token-name' },
                                        children: [text(() => app.selectedToken())],
                                    }),
                                ],
                            }),
                            element('Row', {
                                props: {
                                    class: 'editor-swatch',
                                    style: () => ({
                                        backgroundColor: app.tokens()[app.selectedToken()],
                                    }),
                                },
                            }),
                        ],
                    }),

                    // Current Value
                    element('Row', {
                        children: [
                            element('Text', {
                                props: { style: { fontSize: '12px', color: 'var(--ink-dim)' } },
                                children: [text('Current Value: ')],
                            }),
                            element('Text', {
                                props: { class: 'selected-token-value' },
                                children: [text(() => app.tokens()[app.selectedToken()])],
                            }),
                        ],
                    }),

                    // Edit Input and Apply
                    element('Stack', {
                        props: { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' } },
                        children: [
                            element('Text', {
                                props: { style: { fontSize: '12px', fontWeight: '600' } },
                                children: [text('New Token Value:')],
                            }),
                            each(
                                () => [app.draftRevision()],
                                (rev: number) => rev,
                                () =>
                                    element('Input', {
                                        props: {
                                            class: 'input-token-value',
                                            placeholder: 'e.g. #58a6ff or rgba(...)',
                                            value: app.draftValue(),
                                        },
                                        intents: {
                                            change: {
                                                action: vx.on((val?: unknown) =>
                                                    app.setDraftValue(typeof val === 'string' ? val : String(val ?? '')),
                                                ),
                                            },
                                        },
                                    }),
                            ),
                            element('Row', {
                                props: { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
                                children: [
                                    element('Button', {
                                        props: { class: 'btn-apply-token' },
                                        intents: { activate: { action: vx.on(() => app.applyToken()) } },
                                        children: [text('Apply Token')],
                                    }),
                                    element('Button', {
                                        props: { class: 'btn-reset-selected' },
                                        intents: { activate: { action: vx.on(() => app.resetSelected()) } },
                                        children: [text('Reset Token')],
                                    }),
                                ],
                            }),
                        ],
                    }),

                    // Quick color swatches
                    element('Stack', {
                        props: { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' } },
                        children: [
                            element('Text', {
                                props: { style: { fontSize: '11px', color: 'var(--ink-dim)' } },
                                children: [text('Quick color samples:')],
                            }),
                            element('Row', {
                                props: { class: 'quick-colors-row' },
                                children: [
                                    each(
                                        () => QUICK_COLORS,
                                        (colorHex: string) => colorHex,
                                        (colorHex: () => string) => {
                                            const hex = colorHex();
                                            return element('Button', {
                                                props: {
                                                    class: 'btn-quick-color',
                                                    style: { backgroundColor: hex },
                                                },
                                                intents: {
                                                    activate: {
                                                        action: vx.on(() => {
                                                            app.setDraftValue(hex);
                                                        }),
                                                    },
                                                },
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
