/**
 * Palette Preview view: live preview window reflecting current active theme.
 */

import {
    element,
    text,
    type Node,
} from '@flybyme/mesh-web';
import type { PaletteView } from '../contract.js';

export function renderPreviewView(_vx: PaletteView): Node {
    return element('Stack', {
        props: { class: 'palette-pane' },
        children: [
            element('Text', {
                props: { class: 'preview-title', style: { marginBottom: '14px' } },
                children: [text('Live Theme Preview')],
            }),

            element('Stack', {
                props: { class: 'preview-window-mock' },
                children: [
                    // Mock window chrome
                    element('Row', {
                        props: { class: 'preview-chrome-titlebar' },
                        children: [
                            element('Text', {
                                props: { style: { fontWeight: '600', fontSize: '13px' } },
                                children: [text('Sample Window Chrome')],
                            }),
                            element('Text', {
                                props: { class: 'preview-badge-accent' },
                                children: [text('Active')],
                            }),
                        ],
                    }),

                    // Themed UI elements container
                    element('Stack', {
                        props: { style: { padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' } },
                        children: [
                            element('Text', {
                                props: { class: 'preview-text-primary' },
                                children: [text('Primary text colored with var(--ink)')],
                            }),
                            element('Text', {
                                props: { class: 'preview-text-muted' },
                                children: [text('Subtle muted text colored with var(--ink-dim)')],
                            }),
                            element('Row', {
                                props: { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                                children: [
                                    element('Button', {
                                        props: { class: 'preview-btn-default' },
                                        children: [text('Surface Button')],
                                    }),
                                    element('Button', {
                                        props: { class: 'preview-btn-accent' },
                                        children: [text('Accent Button')],
                                    }),
                                ],
                            }),
                            element('Row', {
                                props: { class: 'preview-notice-info' },
                                children: [text('Info alert styled with var(--info)')],
                            }),
                            element('Row', {
                                props: { class: 'preview-notice-warn' },
                                children: [text('Warning alert styled with var(--warn)')],
                            }),
                            element('Row', {
                                props: { class: 'preview-notice-error' },
                                children: [text('Error alert styled with var(--error)')],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}
