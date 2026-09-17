/**
 * Compositions & Releases view: compose multi-part blueprints, inspect releases and pinned artifacts.
 */

import { each, element, text, type Node } from '@flybyme/mesh-web';
import type { CatalogView, CompositionRecord, ReleaseRecord } from '../contract.js';

function renderCompositionCard(comp: CompositionRecord, vx: CatalogView): Node {
    const app = vx.internal;
    const allNonKernelParts = () => app.parts().filter((p) => p.kind !== 'kernel');

    return element('Stack', {
        props: {
            class: 'catalog-card',
            'data-comp-id': comp.id,
        },
        children: [
            element('Row', {
                props: { class: 'catalog-card-header' },
                children: [
                    element('Text', {
                        props: { class: 'catalog-card-key' },
                        children: [text(`Composition: ${comp.key}`)],
                    }),
                    element('Text', {
                        props: { class: 'badge-kind badge-kernel' },
                        children: [text(comp.kernelPartKey)],
                    }),
                ],
            }),

            // Included parts management
            element('Stack', {
                props: { class: 'catalog-card-meta' },
                children: [
                    element('Text', {
                        props: { class: 'meta-label' },
                        children: [text(`Parts Included (${comp.parts.length}):`)],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '4px 0' } },
                        children: allNonKernelParts().map((p) => {
                            const isIncluded = () => comp.parts.includes(p.key);
                            return element('Button', {
                                props: {
                                    class: () =>
                                        isIncluded()
                                            ? 'filter-pill active'
                                            : 'filter-pill',
                                    'data-toggle-part': p.key,
                                },
                                intents: {
                                    activate: {
                                        action: vx.on(() => app.togglePartInComposition(comp.id, p.key)),
                                    },
                                },
                                children: [text(() => `${isIncluded() ? '✓ ' : '+ '}${p.key}`)],
                            });
                        }),
                    }),
                ],
            }),

            // Action footer
            element('Row', {
                props: { class: 'catalog-card-footer' },
                children: [
                    element('Text', {
                        props: { style: { fontSize: '11px', color: 'var(--ink-subtle)' } },
                        children: [text(`Drivers: ${comp.drivers.length > 0 ? comp.drivers.join(', ') : 'none'}`)],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-primary btn-compose',
                            'data-comp-id': comp.id,
                        },
                        intents: {
                            activate: {
                                action: vx.on(() => app.compose(comp.id)),
                            },
                        },
                        children: [text('⚡ Compose Release')],
                    }),
                ],
            }),
        ],
    });
}

function renderReleaseRow(rel: ReleaseRecord, vx: CatalogView): Node {
    return element('Row', {
        props: {
            class: 'catalog-card',
            'data-release-hash': rel.hash,
            style: { display: 'flex', flexDirection: 'column', gap: '6px' },
        },
        children: [
            element('Row', {
                props: { class: 'catalog-card-header' },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                        children: [
                            element('Text', {
                                props: { class: 'hash-code' },
                                children: [text(rel.hash)],
                            }),
                            element('Text', {
                                props: { class: 'badge-kind badge-application' },
                                children: [text(rel.compositionKey)],
                            }),
                        ],
                    }),
                    element('Text', {
                        props: { style: { fontSize: '11px', color: 'var(--ink-subtle)' } },
                        children: [text(new Date(rel.createdAt).toLocaleTimeString())],
                    }),
                ],
            }),

            element('Stack', {
                props: { class: 'catalog-card-meta' },
                children: [
                    element('Text', {
                        props: { class: 'meta-label' },
                        children: [text(`Pinned Parts (${rel.parts.length}):`)],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                        children: rel.parts.map((p) =>
                            element('Text', {
                                props: { class: 'filter-pill' },
                                children: [text(`${p.partKey} (${p.artifactHash.slice(0, 12)}...)`)],
                            }),
                        ),
                    }),
                ],
            }),

            element('Row', {
                props: { class: 'catalog-card-footer' },
                children: [
                    element('Text', {
                        props: { style: { fontSize: '11px', color: 'var(--ink-subtle)' } },
                        children: [text(`ID: ${rel.id}`)],
                    }),
                    element('Button', {
                        props: { class: 'btn-secondary btn-sm btn-deploy-to-site' },
                        intents: {
                            activate: {
                                action: vx.on(() => {
                                    const site = vx.internal.sites()[0];
                                    if (site) {
                                        vx.internal.deploy(site.id, rel.hash);
                                        vx.internal.setTab('sites');
                                    }
                                }),
                            },
                        },
                        children: [text('Deploy to Site →')],
                    }),
                ],
            }),
        ],
    });
}

export function renderCompositionsView(vx: CatalogView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'catalog-body' },
        children: [
            // Header / Info
            element('Row', {
                props: { class: 'catalog-toolbar' },
                children: [
                    element('Text', {
                        props: { style: { fontSize: '13px', color: 'var(--ink-subtle)' } },
                        children: [text('Compositions define blueprints of parts that compose into a site release.')],
                    }),
                ],
            }),

            // Compositions List
            element('Stack', {
                props: { class: 'catalog-grid' },
                children: [
                    each(
                        () => app.compositions(),
                        (c: CompositionRecord) => c.id,
                        (compAccessor: () => CompositionRecord) => renderCompositionCard(compAccessor(), vx),
                    ),
                ],
            }),

            // Releases section header
            element('Row', {
                props: { class: 'catalog-toolbar', style: { marginTop: '16px' } },
                children: [
                    element('Text', {
                        props: { class: 'catalog-title' },
                        children: [text(() => `Release History (${app.releases().length})`)],
                    }),
                ],
            }),

            // Releases List
            element('Stack', {
                props: { class: 'catalog-grid' },
                children: [
                    each(
                        () => app.releases(),
                        (r: ReleaseRecord) => r.id,
                        (relAccessor: () => ReleaseRecord) => renderReleaseRow(relAccessor(), vx),
                    ),
                ],
            }),
        ],
    });
}
