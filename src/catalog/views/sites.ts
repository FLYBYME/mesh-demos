/**
 * Sites & CDN Deployments view: view live sites, deploy releases, and perform instant rollbacks.
 */

import { each, element, text, when, type Node } from '@flybyme/mesh-web';
import type { CatalogView, SiteRecord } from '../contract.js';

function renderSiteCard(site: SiteRecord, vx: CatalogView): Node {
    const app = vx.internal;
    const canRollback = () =>
        site.previousReleaseHash !== undefined && site.previousReleaseHash !== site.releaseHash;

    return element('Stack', {
        props: {
            class: 'catalog-card',
            'data-site-id': site.id,
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
                                children: [text(site.host)],
                            }),
                            element('Text', {
                                props: { class: 'badge-kind badge-application' },
                                children: [text(site.application)],
                            }),
                        ],
                    }),
                    element('Text', {
                        props: { class: 'badge-status status-success' },
                        children: [text('LIVE')],
                    }),
                ],
            }),

            element('Text', {
                props: { class: 'catalog-card-desc' },
                children: [text(site.title)],
            }),

            element('Stack', {
                props: { class: 'catalog-card-meta' },
                children: [
                    element('Row', {
                        props: { class: 'meta-row' },
                        children: [
                            element('Text', { props: { class: 'meta-label' }, children: [text('Active Release:')] }),
                            element('Text', { props: { class: 'hash-code' }, children: [text(site.releaseHash)] }),
                        ],
                    }),
                    when(
                        () => site.previousReleaseHash !== undefined,
                        () => element('Row', {
                            props: { class: 'meta-row' },
                            children: [
                                element('Text', { props: { class: 'meta-label' }, children: [text('Previous Release:')] }),
                                element('Text', { props: { class: 'hash-code' }, children: [text(site.previousReleaseHash ?? '')] }),
                            ],
                        }),
                    ),
                    element('Row', {
                        props: { class: 'meta-row' },
                        children: [
                            element('Text', { props: { class: 'meta-label' }, children: [text('API Host:')] }),
                            element('Text', { children: [text(site.apiId)] }),
                        ],
                    }),
                ],
            }),

            // Deploy & Rollback Actions
            element('Row', {
                props: { class: 'catalog-card-footer' },
                children: [
                    when(
                        () => canRollback(),
                        () => element('Button', {
                            props: {
                                class: 'btn-secondary btn-rollback',
                                'data-site-id': site.id,
                            },
                            intents: {
                                activate: {
                                    action: vx.on(() => app.rollback(site.id)),
                                },
                            },
                            children: [text('↺ Rollback to Previous')],
                        }),
                    ),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '6px', marginLeft: 'auto' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-primary btn-deploy-latest',
                                    'data-site-id': site.id,
                                },
                                intents: {
                                    activate: {
                                        action: vx.on(() => {
                                            const latestRelease = app.releases()[app.releases().length - 1];
                                            if (latestRelease) {
                                                app.deploy(site.id, latestRelease.hash);
                                            }
                                        }),
                                    },
                                },
                                children: [text('Deploy Latest Release')],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}

export function renderSitesView(vx: CatalogView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'catalog-body' },
        children: [
            element('Row', {
                props: { class: 'catalog-toolbar' },
                children: [
                    element('Text', {
                        props: { style: { fontSize: '13px', color: 'var(--ink-subtle)' } },
                        children: [text('CDN Sites point hostnames to immutable release hashes with zero-overhead rollback.')],
                    }),
                ],
            }),

            element('Stack', {
                props: { class: 'catalog-grid' },
                children: [
                    each(
                        () => app.sites(),
                        (s: SiteRecord) => s.id,
                        (siteAccessor: () => SiteRecord) => renderSiteCard(siteAccessor(), vx),
                    ),
                ],
            }),
        ],
    });
}
