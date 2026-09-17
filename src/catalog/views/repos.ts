/**
 * Repositories management view: list, register, and delete git repositories.
 */

import { each, element, text, when, type Node } from '@flybyme/mesh-web';
import type { CatalogView, RepoRecord } from '../contract.js';

function renderRepoCard(repo: RepoRecord, vx: CatalogView): Node {
    const app = vx.internal;
    const partsCount = () => app.parts().filter((p) => p.repoId === repo.id).length;

    return element('Stack', {
        props: {
            class: 'catalog-card',
            'data-repo-id': repo.id,
        },
        children: [
            element('Row', {
                props: { class: 'catalog-card-header' },
                children: [
                    element('Text', {
                        props: { class: 'catalog-card-key' },
                        children: [text(repo.url)],
                    }),
                    element('Text', {
                        props: { class: 'badge-kind badge-driver' },
                        children: [text(repo.defaultBranch)],
                    }),
                ],
            }),

            element('Stack', {
                props: { class: 'catalog-card-meta' },
                children: [
                    element('Row', {
                        props: { class: 'meta-row' },
                        children: [
                            element('Text', { props: { class: 'meta-label' }, children: [text('ID:')] }),
                            element('Text', { props: { class: 'hash-code' }, children: [text(repo.id)] }),
                        ],
                    }),
                    element('Row', {
                        props: { class: 'meta-row' },
                        children: [
                            element('Text', { props: { class: 'meta-label' }, children: [text('Tenant:')] }),
                            element('Text', { children: [text(repo.tenantId)] }),
                        ],
                    }),
                    element('Row', {
                        props: { class: 'meta-row' },
                        children: [
                            element('Text', { props: { class: 'meta-label' }, children: [text('Parts Linked:')] }),
                            element('Text', { children: [text(() => `${partsCount()} parts`)] }),
                        ],
                    }),
                ],
            }),

            element('Row', {
                props: { class: 'catalog-card-footer' },
                children: [
                    element('Text', {
                        props: { style: { fontSize: '11px', color: 'var(--ink-subtle)' } },
                        children: [text(`Branch: ${repo.defaultBranch}`)],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-danger btn-delete-repo',
                            'data-repo-id': repo.id,
                        },
                        intents: {
                            activate: {
                                action: vx.on(() => app.deleteRepo(repo.id)),
                            },
                        },
                        children: [text('Delete')],
                    }),
                ],
            }),
        ],
    });
}

export function renderReposView(vx: CatalogView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'catalog-body' },
        children: [
            // Toolbar
            element('Row', {
                props: { class: 'catalog-toolbar' },
                children: [
                    element('Text', {
                        props: { style: { fontSize: '13px', color: 'var(--ink-subtle)' } },
                        children: [text(() => `${app.repos().length} Git Repositories Configured`)],
                    }),
                    element('Button', {
                        props: { class: 'btn-primary btn-toggle-new-repo' },
                        intents: {
                            activate: {
                                action: vx.on(() => app.isCreatingRepo.set(!app.isCreatingRepo())),
                            },
                        },
                        children: [
                            text(() => (app.isCreatingRepo() ? 'Cancel' : '+ Add Repository')),
                        ],
                    }),
                ],
            }),

            // Create New Repo Form
            when(
                () => app.isCreatingRepo(),
                () =>
                    element('Stack', {
                        props: { class: 'catalog-form-card form-new-repo' },
                        children: [
                            element('Text', {
                                props: { class: 'catalog-form-title' },
                                children: [text('Connect Source Repository')],
                            }),
                            element('Stack', {
                                props: { class: 'form-grid' },
                                children: [
                                    element('Stack', {
                                        props: { class: 'form-group' },
                                        children: [
                                            element('Text', { props: { class: 'form-label' }, children: [text('Git Remote URL / Path:')] }),
                                            element('Input', {
                                                props: {
                                                    class: 'catalog-input input-repo-url',
                                                    placeholder: 'e.g. https://github.com/FLYBYME/my-app.git',
                                                    value: () => app.draftRepoUrl(),
                                                },
                                                intents: {
                                                    change: {
                                                        action: vx.on((v?: unknown) =>
                                                            app.draftRepoUrl.set(typeof v === 'string' ? v : String(v ?? '')),
                                                        ),
                                                    },
                                                },
                                            }),
                                        ],
                                    }),
                                    element('Stack', {
                                        props: { class: 'form-group' },
                                        children: [
                                            element('Text', { props: { class: 'form-label' }, children: [text('Default Branch / Ref:')] }),
                                            element('Input', {
                                                props: {
                                                    class: 'catalog-input input-repo-branch',
                                                    placeholder: 'master',
                                                    value: () => app.draftRepoBranch(),
                                                },
                                                intents: {
                                                    change: {
                                                        action: vx.on((v?: unknown) =>
                                                            app.draftRepoBranch.set(typeof v === 'string' ? v : String(v ?? '')),
                                                        ),
                                                    },
                                                },
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            element('Row', {
                                props: { class: 'form-actions' },
                                children: [
                                    element('Button', {
                                        props: { class: 'btn-primary btn-submit-repo' },
                                        intents: {
                                            activate: {
                                                action: vx.on(() => {
                                                    const url = app.draftRepoUrl().trim();
                                                    if (!url) return;
                                                    const branch = app.draftRepoBranch().trim() || 'master';
                                                    app.addRepo(url, branch);
                                                    app.draftRepoUrl.set('');
                                                    app.draftRepoBranch.set('');
                                                    app.isCreatingRepo.set(false);
                                                }),
                                            },
                                        },
                                        children: [text('Save Repository')],
                                    }),
                                ],
                            }),
                        ],
                    }),
            ),

            // Repos Cards Grid
            element('Stack', {
                props: { class: 'catalog-grid' },
                children: [
                    each(
                        () => app.repos(),
                        (r: RepoRecord) => r.id,
                        (repoAccessor: () => RepoRecord) => renderRepoCard(repoAccessor(), vx),
                    ),
                ],
            }),
        ],
    });
}
