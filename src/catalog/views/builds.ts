/**
 * Build & Artifact engine view: view build status, history, content hashes, and trigger builds.
 */

import { each, element, text, when, type Node } from '@flybyme/mesh-web';
import type { ArtifactRecord, CatalogView } from '../contract.js';

function renderArtifactRow(art: ArtifactRecord, vx: CatalogView): Node {
    const statusClass = `status-${art.status}`;

    return element('Row', {
        props: {
            class: 'catalog-card',
            'data-artifact-id': art.id,
            style: { display: 'flex', flexDirection: 'column', gap: '8px' },
        },
        children: [
            element('Row', {
                props: { class: 'catalog-card-header' },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                        children: [
                            element('Text', {
                                props: { class: 'catalog-card-key' },
                                children: [text(art.partKey)],
                            }),
                            element('Text', {
                                props: { class: 'badge-driver' },
                                children: [text(`@${art.ref}`)],
                            }),
                        ],
                    }),
                    element('Text', {
                        props: { class: `badge-status ${statusClass}` },
                        children: [text(art.status.toUpperCase())],
                    }),
                ],
            }),

            element('Stack', {
                props: { class: 'catalog-card-meta' },
                children: [
                    when(
                        () => art.hash !== undefined,
                        () => element('Row', {
                            props: { class: 'meta-row' },
                            children: [
                                element('Text', { props: { class: 'meta-label' }, children: [text('Content Hash:')] }),
                                element('Text', { props: { class: 'hash-code' }, children: [text(art.hash ?? '')] }),
                            ],
                        }),
                    ),
                    when(
                        () => art.duration !== undefined,
                        () => element('Row', {
                            props: { class: 'meta-row' },
                            children: [
                                element('Text', { props: { class: 'meta-label' }, children: [text('Duration:')] }),
                                element('Text', { children: [text(`${art.duration}s`)] }),
                            ],
                        }),
                    ),
                    when(
                        () => (art.assets?.length ?? 0) > 0,
                        () => element('Row', {
                            props: { class: 'meta-row' },
                            children: [
                                element('Text', { props: { class: 'meta-label' }, children: [text('Assets:')] }),
                                element('Text', { children: [text(`${art.assets?.length ?? 0} files`)] }),
                            ],
                        }),
                    ),
                    when(
                        () => art.error !== undefined,
                        () => element('Row', {
                            props: { class: 'meta-row' },
                            children: [
                                element('Text', { props: { class: 'meta-label', style: { color: '#f85149' } }, children: [text('Error:')] }),
                                element('Text', { props: { style: { color: '#f85149' } }, children: [text(art.error ?? '')] }),
                            ],
                        }),
                    ),
                ],
            }),

            element('Row', {
                props: { class: 'catalog-card-footer' },
                children: [
                    element('Text', {
                        props: { style: { fontSize: '11px', color: 'var(--ink-subtle)' } },
                        children: [text(new Date(art.createdAt).toLocaleTimeString())],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-secondary btn-sm',
                            'data-part-id': art.partId,
                        },
                        intents: {
                            activate: {
                                action: vx.on(() => vx.internal.requestBuild(art.partId, art.ref)),
                            },
                        },
                        children: [text('Re-build')],
                    }),
                ],
            }),
        ],
    });
}

export function renderBuildsView(vx: CatalogView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'catalog-body' },
        children: [
            // Quick Build Request Form
            element('Stack', {
                props: { class: 'catalog-form-card' },
                children: [
                    element('Text', {
                        props: { class: 'catalog-form-title' },
                        children: [text('Trigger Artifact Build')],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
                        children: [
                            element('Stack', {
                                props: { class: 'form-group', style: { flex: '1', minWidth: '220px' } },
                                children: [
                                    element('Text', { props: { class: 'form-label' }, children: [text('Select Part:')] }),
                                    element('Row', {
                                        props: { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                                        children: app.parts().map((p) =>
                                            element('Button', {
                                                props: {
                                                    class: () =>
                                                        app.selectedPartId() === p.id
                                                            ? 'filter-pill active'
                                                            : 'filter-pill',
                                                    'data-part-select': p.id,
                                                },
                                                intents: {
                                                    activate: {
                                                        action: vx.on(() => app.selectPart(p.id)),
                                                    },
                                                },
                                                children: [text(p.key)],
                                            }),
                                        ),
                                    }),
                                ],
                            }),
                            element('Stack', {
                                props: { class: 'form-group', style: { width: '160px' } },
                                children: [
                                    element('Text', { props: { class: 'form-label' }, children: [text('Git Ref:')] }),
                                    element('Input', {
                                        props: {
                                            class: 'catalog-input input-build-ref',
                                            placeholder: 'master',
                                            value: () => app.draftBuildRef(),
                                        },
                                        intents: {
                                            change: {
                                                action: vx.on((v?: unknown) =>
                                                    app.draftBuildRef.set(typeof v === 'string' ? v : String(v ?? '')),
                                                ),
                                            },
                                        },
                                    }),
                                ],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-primary btn-submit-build',
                                    style: { marginTop: '16px' },
                                },
                                intents: {
                                    activate: {
                                        action: vx.on(() => {
                                            const partId = app.selectedPartId() ?? app.parts()[0]?.id;
                                            if (!partId) return;
                                            const ref = app.draftBuildRef().trim() || 'master';
                                            app.requestBuild(partId, ref);
                                        }),
                                    },
                                },
                                children: [text('Request Build')],
                            }),
                        ],
                    }),
                ],
            }),

            // Header info
            element('Row', {
                props: { class: 'catalog-toolbar' },
                children: [
                    element('Text', {
                        props: { style: { fontSize: '13px', color: 'var(--ink-subtle)' } },
                        children: [text(() => `Build Artifacts (${app.artifacts().length})`)],
                    }),
                ],
            }),

            // Artifacts List
            element('Stack', {
                props: { class: 'catalog-grid' },
                children: [
                    each(
                        () => app.artifacts(),
                        (a: ArtifactRecord) => a.id,
                        (artAccessor: () => ArtifactRecord) => renderArtifactRow(artAccessor(), vx),
                    ),
                ],
            }),
        ],
    });
}
