import {
    command,
    each,
    element,
    text,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { PaletteApi } from '../contract.js';

export function renderEditorView(vx: ViewContext<Record<string, never>, PaletteApi>): Node {
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
