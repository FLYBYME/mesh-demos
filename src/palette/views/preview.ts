import {
    element,
    text,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { PaletteApi, PaletteInternal } from '../contract.js';

export function renderPreviewView(_vx: ViewContext<Record<string, never>, PaletteApi, PaletteInternal>): Node {
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
