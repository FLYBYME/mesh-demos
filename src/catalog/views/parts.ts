/**
 * Parts management view: browse, filter, create, and delete parts.
 */

import { each, element, text, when, type Node } from '@flybyme/mesh-web';
import type { CatalogView, PartKind, PartRecord } from '../contract.js';

const KINDS: readonly (PartKind | 'all')[] = [
    'all',
    'kernel',
    'application',
    'extension',
    'driver',
    'theme',
    'service',
];

function renderPartCard(part: PartRecord, vx: CatalogView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: {
            class: 'catalog-card',
            'data-part-key': part.key,
        },
        children: [
            // Card Header
            element('Row', {
                props: { class: 'catalog-card-header' },
                children: [
                    element('Text', {
                        props: { class: 'catalog-card-key' },
                        children: [text(part.key)],
                    }),
                    element('Text', {
                        props: { class: `badge-kind badge-${part.kind}` },
                        children: [text(part.kind)],
                    }),
                ],
            }),

            // Description
            element('Text', {
                props: { class: 'catalog-card-desc' },
                children: [text(part.description ?? 'No description provided.')],
            }),

            // Metadata
            element('Stack', {
                props: { class: 'catalog-card-meta' },
                children: [
                    element('Row', {
                        props: { class: 'meta-row' },
                        children: [
                            element('Text', { props: { class: 'meta-label' }, children: [text('Repo:')] }),
                            element('Text', { children: [text(part.repoId)] }),
                        ],
                    }),
                    element('Row', {
                        props: { class: 'meta-row' },
                        children: [
                            element('Text', { props: { class: 'meta-label' }, children: [text('Entry:')] }),
                            element('Text', { children: [text(`${part.path}/${part.entryPoint}`)] }),
                        ],
                    }),
                    when(
                        () => part.imports !== undefined,
                        () => element('Row', {
                            props: { class: 'meta-row' },
                            children: [
                                element('Text', { props: { class: 'meta-label' }, children: [text('Imports:')] }),
                                element('Text', { props: { class: 'hash-code' }, children: [text(part.imports ?? '')] }),
                            ],
                        }),
                    ),
                    when(
                        () => part.wants.length > 0,
                        () => element('Row', {
                            props: { class: 'meta-row' },
                            children: [
                                element('Text', { props: { class: 'meta-label' }, children: [text('Wants:')] }),
                                element('Text', { children: [text(part.wants.join(', '))] }),
                            ],
                        }),
                    ),
                ],
            }),

            // Actions footer
            element('Row', {
                props: { class: 'catalog-card-footer' },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-secondary btn-sm btn-build-part',
                            'data-part-id': part.id,
                        },
                        intents: {
                            activate: {
                                action: vx.on(() => {
                                    app.requestBuild(part.id, 'HEAD');
                                    app.setTab('builds');
                                }),
                            },
                        },
                        children: [text('🔨 Build')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-danger btn-delete-part',
                            'data-part-id': part.id,
                        },
                        intents: {
                            activate: {
                                action: vx.on(() => app.deletePart(part.id)),
                            },
                        },
                        children: [text('Delete')],
                    }),
                ],
            }),
        ],
    });
}

export function renderPartsView(vx: CatalogView): Node {
    const app = vx.internal;

    const filteredParts = () => {
        const query = app.searchQuery().trim().toLowerCase();
        const kind = app.partKindFilter();
        return app.parts().filter((p) => {
            const matchesKind = kind === 'all' || p.kind === kind;
            const matchesQuery =
                query.length === 0 ||
                p.key.toLowerCase().includes(query) ||
                (p.description ?? '').toLowerCase().includes(query) ||
                p.kind.toLowerCase().includes(query);
            return matchesKind && matchesQuery;
        });
    };

    return element('Stack', {
        props: { class: 'catalog-body' },
        children: [
            // Toolbar
            element('Row', {
                props: { class: 'catalog-toolbar' },
                children: [
                    // Search & Kind Filter Pills
                    element('Row', {
                        props: { class: 'catalog-filters' },
                        children: [
                            element('Input', {
                                props: {
                                    class: 'catalog-input input-search-parts',
                                    placeholder: 'Filter parts...',
                                    value: () => app.searchQuery(),
                                },
                                intents: {
                                    change: {
                                        action: vx.on((val?: unknown) =>
                                            app.setSearchQuery(typeof val === 'string' ? val : String(val ?? '')),
                                        ),
                                    },
                                },
                            }),
                            ...KINDS.map((k) =>
                                element('Button', {
                                    props: {
                                        class: () =>
                                            app.partKindFilter() === k
                                                ? `filter-pill active pill-${k}`
                                                : `filter-pill pill-${k}`,
                                    },
                                    intents: {
                                        activate: {
                                            action: vx.on(() => app.setPartKindFilter(k)),
                                        },
                                    },
                                    children: [text(k)],
                                }),
                            ),
                        ],
                    }),

                    // Toggle New Part Form
                    element('Button', {
                        props: { class: 'btn-primary btn-toggle-new-part' },
                        intents: {
                            activate: {
                                action: vx.on(() => app.isCreatingPart.set(!app.isCreatingPart())),
                            },
                        },
                        children: [
                            text(() => (app.isCreatingPart() ? 'Cancel' : '+ Register Part')),
                        ],
                    }),
                ],
            }),

            // Create New Part Form Panel
            when(
                () => app.isCreatingPart(),
                () =>
                    element('Stack', {
                        props: { class: 'catalog-form-card form-new-part' },
                        children: [
                            element('Text', {
                                props: { class: 'catalog-form-title' },
                                children: [text('Register New Part')],
                            }),
                            element('Stack', {
                                props: { class: 'form-grid' },
                                children: [
                                    // Part Key
                                    element('Stack', {
                                        props: { class: 'form-group' },
                                        children: [
                                            element('Text', { props: { class: 'form-label' }, children: [text('Part Key (org/name):')] }),
                                            element('Input', {
                                                props: {
                                                    class: 'catalog-input input-part-key',
                                                    placeholder: 'e.g. demos/metrics',
                                                    value: () => app.draftPartKey(),
                                                },
                                                intents: {
                                                    change: {
                                                        action: vx.on((v?: unknown) =>
                                                            app.draftPartKey.set(typeof v === 'string' ? v : String(v ?? '')),
                                                        ),
                                                    },
                                                },
                                            }),
                                        ],
                                    }),

                                    // Entry Point
                                    element('Stack', {
                                        props: { class: 'form-group' },
                                        children: [
                                            element('Text', { props: { class: 'form-label' }, children: [text('Entry Point:')] }),
                                            element('Input', {
                                                props: {
                                                    class: 'catalog-input input-part-entry',
                                                    placeholder: 'e.g. src/index.ts',
                                                    value: () => app.draftPartEntry(),
                                                },
                                                intents: {
                                                    change: {
                                                        action: vx.on((v?: unknown) =>
                                                            app.draftPartEntry.set(typeof v === 'string' ? v : String(v ?? '')),
                                                        ),
                                                    },
                                                },
                                            }),
                                        ],
                                    }),

                                    // Description
                                    element('Stack', {
                                        props: { class: 'form-group' },
                                        children: [
                                            element('Text', { props: { class: 'form-label' }, children: [text('Description:')] }),
                                            element('Input', {
                                                props: {
                                                    class: 'catalog-input input-part-desc',
                                                    placeholder: 'Short description...',
                                                    value: () => app.draftPartDescription(),
                                                },
                                                intents: {
                                                    change: {
                                                        action: vx.on((v?: unknown) =>
                                                            app.draftPartDescription.set(typeof v === 'string' ? v : String(v ?? '')),
                                                        ),
                                                    },
                                                },
                                            }),
                                        ],
                                    }),
                                ],
                            }),

                            // Submit Action
                            element('Row', {
                                props: { class: 'form-actions' },
                                children: [
                                    element('Button', {
                                        props: { class: 'btn-primary btn-submit-part' },
                                        intents: {
                                            activate: {
                                                action: vx.on(() => {
                                                    const key = app.draftPartKey().trim();
                                                    if (!key) return;
                                                    app.addPart({
                                                        repoId: app.draftPartRepoId() || (app.repos()[0]?.id ?? 'repo-demos'),
                                                        key,
                                                        kind: app.draftPartKind(),
                                                        path: app.draftPartPath() || '.',
                                                        entryPoint: app.draftPartEntry() || 'src/index.ts',
                                                        imports: app.draftPartImports() || undefined,
                                                        wants: [],
                                                        description: app.draftPartDescription() || undefined,
                                                    });
                                                    app.draftPartKey.set('');
                                                    app.draftPartDescription.set('');
                                                    app.isCreatingPart.set(false);
                                                }),
                                            },
                                        },
                                        children: [text('Save Part')],
                                    }),
                                ],
                            }),
                        ],
                    }),
            ),

            // Parts Cards Grid
            element('Stack', {
                props: { class: 'catalog-grid' },
                children: [
                    each(
                        () => filteredParts(),
                        (p: PartRecord) => p.id,
                        (partAccessor: () => PartRecord) => renderPartCard(partAccessor(), vx),
                    ),
                ],
            }),

            // Empty State
            when(
                () => filteredParts().length === 0,
                () =>
                    element('Text', {
                        props: { style: { textAlign: 'center', padding: '32px', color: 'var(--ink-subtle)' } },
                        children: [text('No parts match the current filter.')],
                    }),
            ),
        ],
    });
}
