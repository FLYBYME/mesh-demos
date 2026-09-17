/**
 * Catalog manager demo application.
 */

import {
    defineApi,
    type Application,
    type ApplicationStartResult,
    type CommandDecl,
    type Context,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    CATALOG,
    CONSUMES,
    INITIAL_ARTIFACTS,
    INITIAL_COMPOSITIONS,
    INITIAL_PARTS,
    INITIAL_RELEASES,
    INITIAL_REPOS,
    INITIAL_SITES,
    NEEDS,
    type ArtifactRecord,
    type CatalogApi,
    type CatalogInternal,
    type CatalogTab,
    type CompositionRecord,
    type PartKind,
    type PartRecord,
    type ReleaseRecord,
    type RepoRecord,
    type SiteRecord,
} from './contract.js';

import { renderBuildsView } from './views/builds.js';
import { renderCompositionsView } from './views/compositions.js';
import { renderMainView } from './views/main.js';
import { renderPartsView } from './views/parts.js';
import { renderReposView } from './views/repos.js';
import { renderSitesView } from './views/sites.js';

import './catalog.css';

export * from './contract.js';

export const catalogApi = defineApi({
    id: 'catalog',
    exposure: 'local',
    calls: {},
});

export default class CatalogApp implements Application<
    typeof NEEDS,
    typeof CONSUMES,
    typeof CATALOG,
    typeof catalogApi,
    CatalogInternal
> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = CATALOG;
    readonly api = catalogApi;

    readonly commands: readonly CommandDecl[] = [
        { id: 'catalog.setTab', title: 'Catalog: Switch Tab' },
        { id: 'catalog.addPart', title: 'Catalog: Register Part' },
        { id: 'catalog.deletePart', title: 'Catalog: Delete Part' },
        { id: 'catalog.addRepo', title: 'Catalog: Add Repository' },
        { id: 'catalog.deleteRepo', title: 'Catalog: Delete Repository' },
        { id: 'catalog.requestBuild', title: 'Catalog: Request Build' },
        { id: 'catalog.compose', title: 'Catalog: Compose Release' },
        { id: 'catalog.deploy', title: 'Catalog: Deploy Release' },
        { id: 'catalog.rollback', title: 'Catalog: Rollback Deployment' },
        { id: 'catalog.openWorkbench', title: 'Catalog: Open Workbench Window' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, CatalogInternal>[] = [
        {
            id: 'catalog',
            title: 'Catalog Manager',
            instances: 'one',
            window: {
                defaultSize: { width: 920, height: 680 },
                minSize: { width: 500, height: 400 },
            },
            render: renderMainView,
        },
        {
            id: 'parts',
            title: 'Parts Browser',
            instances: 'one',
            window: {
                defaultSize: { width: 800, height: 600 },
                minSize: { width: 440, height: 350 },
            },
            render: renderPartsView,
        },
        {
            id: 'repos',
            title: 'Repositories',
            instances: 'one',
            window: {
                defaultSize: { width: 680, height: 500 },
                minSize: { width: 400, height: 300 },
            },
            render: renderReposView,
        },
        {
            id: 'builds',
            title: 'Builds & Artifacts',
            instances: 'one',
            window: {
                defaultSize: { width: 800, height: 600 },
                minSize: { width: 440, height: 350 },
            },
            render: renderBuildsView,
        },
        {
            id: 'compositions',
            title: 'Compositions & Releases',
            instances: 'one',
            window: {
                defaultSize: { width: 840, height: 640 },
                minSize: { width: 480, height: 380 },
            },
            render: renderCompositionsView,
        },
        {
            id: 'sites',
            title: 'Deployments',
            instances: 'one',
            window: {
                defaultSize: { width: 720, height: 520 },
                minSize: { width: 420, height: 320 },
            },
            render: renderSitesView,
        },
    ];

    async start(
        cx: Context<typeof NEEDS, typeof CONSUMES, typeof catalogApi>,
    ): Promise<ApplicationStartResult<CatalogApi, CatalogInternal>> {
        cx.log.info('CatalogApp starting');

        // Reactive collections
        const repos = cx.state.signal<readonly RepoRecord[]>(INITIAL_REPOS);
        const parts = cx.state.signal<readonly PartRecord[]>(INITIAL_PARTS);
        const artifacts = cx.state.signal<readonly ArtifactRecord[]>(INITIAL_ARTIFACTS);
        const compositions = cx.state.signal<readonly CompositionRecord[]>(INITIAL_COMPOSITIONS);
        const releases = cx.state.signal<readonly ReleaseRecord[]>(INITIAL_RELEASES);
        const sites = cx.state.signal<readonly SiteRecord[]>(INITIAL_SITES);

        // View state
        const selectedTab = cx.state.signal<CatalogTab>('parts');
        const selectedPartId = cx.state.signal<string | null>(null);
        const partKindFilter = cx.state.signal<PartKind | 'all'>('all');
        const searchQuery = cx.state.signal<string>('');

        // Form drafts
        const isCreatingPart = cx.state.signal<boolean>(false);
        const draftPartKey = cx.state.signal<string>('');
        const draftPartKind = cx.state.signal<PartKind>('application');
        const draftPartRepoId = cx.state.signal<string>('');
        const draftPartPath = cx.state.signal<string>('.');
        const draftPartEntry = cx.state.signal<string>('src/index.ts');
        const draftPartImports = cx.state.signal<string>('');
        const draftPartDescription = cx.state.signal<string>('');

        const isCreatingRepo = cx.state.signal<boolean>(false);
        const draftRepoUrl = cx.state.signal<string>('');
        const draftRepoBranch = cx.state.signal<string>('master');

        const isCreatingComposition = cx.state.signal<boolean>(false);
        const draftCompKey = cx.state.signal<string>('');
        const draftCompKernel = cx.state.signal<string>('platform/kernel');

        const draftBuildRef = cx.state.signal<string>('master');

        let idCounter = 100;

        // Navigation
        const setTab = (tab: CatalogTab): void => {
            selectedTab.set(tab);
        };

        const selectPart = (id: string | null): void => {
            selectedPartId.set(id);
        };

        const setPartKindFilter = (filter: PartKind | 'all'): void => {
            partKindFilter.set(filter);
        };

        const setSearchQuery = (q: string): void => {
            searchQuery.set(q);
        };

        const openTab = (tab: CatalogTab): void => {
            selectedTab.set(tab);
            cx.windows.open({ view: 'catalog' });
        };

        // Domain Operations
        const addPart = (input: Omit<PartRecord, 'id' | 'tenantId'>): PartRecord => {
            idCounter++;
            const newPart: PartRecord = {
                id: `part-${idCounter}`,
                tenantId: 'platform',
                repoId: input.repoId,
                key: input.key,
                kind: input.kind,
                path: input.path,
                entryPoint: input.entryPoint,
                ...(input.imports !== undefined ? { imports: input.imports } : {}),
                wants: input.wants,
                ...(input.description !== undefined ? { description: input.description } : {}),
            };
            parts.set([...parts(), newPart]);
            return newPart;
        };

        const updatePart = (
            id: string,
            updates: Partial<Omit<PartRecord, 'id' | 'tenantId' | 'key'>>,
        ): PartRecord | null => {
            let updated: PartRecord | null = null;
            parts.set(
                parts().map((p) => {
                    if (p.id !== id) return p;
                    updated = {
                        ...p,
                        ...updates,
                    };
                    return updated;
                }),
            );
            return updated;
        };

        const deletePart = (id: string): void => {
            parts.set(parts().filter((p) => p.id !== id));
            if (selectedPartId() === id) {
                selectedPartId.set(null);
            }
        };

        const addRepo = (url: string, defaultBranch: string): RepoRecord => {
            idCounter++;
            const newRepo: RepoRecord = {
                id: `repo-${idCounter}`,
                tenantId: 'platform',
                url,
                defaultBranch: defaultBranch || 'master',
            };
            repos.set([...repos(), newRepo]);
            return newRepo;
        };

        const deleteRepo = (id: string): void => {
            repos.set(repos().filter((r) => r.id !== id));
        };

        const requestBuild = (partId: string, ref: string): ArtifactRecord => {
            idCounter++;
            const part = parts().find((p) => p.id === partId);
            const partKey = part?.key ?? `part-${partId}`;
            const cleanKey = partKey.replace('/', '-');
            const newHash = `art-hash-${cleanKey}-${ref}-${idCounter}`;

            const newArtifact: ArtifactRecord = {
                id: `art-${idCounter}`,
                tenantId: 'platform',
                partId,
                partKey,
                ref,
                status: 'success',
                hash: newHash,
                duration: 0.9,
                createdAt: Date.now(),
                assets: [
                    { name: 'main.js', url: `/assets/${newHash}/main.js`, fileExtension: '.js', sizeBytes: 24500 },
                ],
            };

            artifacts.set([newArtifact, ...artifacts()]);
            return newArtifact;
        };

        const compose = (compositionId: string): ReleaseRecord => {
            idCounter++;
            const comp = compositions().find((c) => c.id === compositionId);
            const compKey = comp?.key ?? 'default';

            const pinnedParts = (comp?.parts ?? []).map((partKey) => {
                const p = parts().find((item) => item.key === partKey);
                const art = artifacts().find((a) => a.partKey === partKey && a.status === 'success');
                return {
                    partKey,
                    kind: p?.kind ?? ('application' as PartKind),
                    artifactHash: art?.hash ?? 'art-hash-fallback',
                    ...(p?.imports !== undefined ? { imports: p.imports } : {}),
                };
            });

            // Include kernel
            const kernelArt = artifacts().find((a) => a.partKey === comp?.kernelPartKey && a.status === 'success');
            pinnedParts.unshift({
                partKey: comp?.kernelPartKey ?? 'platform/kernel',
                kind: 'kernel',
                artifactHash: kernelArt?.hash ?? 'art-hash-kernel-fallback',
                imports: '@flybyme/mesh-web',
            });

            const newRelease: ReleaseRecord = {
                id: `rel-${idCounter}`,
                compositionId,
                compositionKey: compKey,
                hash: `rel-hash-${compKey}-v${idCounter}`,
                createdAt: Date.now(),
                parts: pinnedParts,
            };

            releases.set([newRelease, ...releases()]);
            return newRelease;
        };

        const togglePartInComposition = (compositionId: string, partKey: string): void => {
            compositions.set(
                compositions().map((c) => {
                    if (c.id !== compositionId) return c;
                    const exists = c.parts.includes(partKey);
                    const newParts = exists
                        ? c.parts.filter((k) => k !== partKey)
                        : [...c.parts, partKey];
                    return {
                        ...c,
                        parts: newParts,
                    };
                }),
            );
        };

        const deploy = (siteId: string, releaseHash: string): SiteRecord => {
            let deployedSite: SiteRecord | null = null;
            sites.set(
                sites().map((s) => {
                    if (s.id !== siteId) return s;
                    deployedSite = {
                        ...s,
                        previousReleaseHash: s.releaseHash,
                        releaseHash,
                    };
                    return deployedSite;
                }),
            );
            return deployedSite ?? sites()[0]!;
        };

        const rollback = (siteId: string): SiteRecord => {
            let updatedSite: SiteRecord | null = null;
            sites.set(
                sites().map((s) => {
                    if (s.id !== siteId || s.previousReleaseHash === undefined) return s;
                    const prev = s.previousReleaseHash;
                    updatedSite = {
                        ...s,
                        previousReleaseHash: s.releaseHash,
                        releaseHash: prev,
                    };
                    return updatedSite;
                }),
            );
            return updatedSite ?? sites()[0]!;
        };

        // Commands implementation
        cx.commands.implement('catalog.setTab', (arg?: unknown) => {
            if (typeof arg === 'string') {
                setTab(arg as CatalogTab);
            }
        });

        cx.commands.implement('catalog.addPart', (arg?: unknown) => {
            if (typeof arg === 'object' && arg !== null && 'key' in arg) {
                addPart(arg as Omit<PartRecord, 'id' | 'tenantId'>);
            }
        });

        cx.commands.implement('catalog.deletePart', (arg?: unknown) => {
            if (typeof arg === 'string') {
                deletePart(arg);
            }
        });

        cx.commands.implement('catalog.addRepo', (arg?: unknown) => {
            if (typeof arg === 'object' && arg !== null && 'url' in arg) {
                const typed = arg as { url: string; defaultBranch?: string };
                addRepo(typed.url, typed.defaultBranch ?? 'master');
            }
        });

        cx.commands.implement('catalog.deleteRepo', (arg?: unknown) => {
            if (typeof arg === 'string') {
                deleteRepo(arg);
            }
        });

        cx.commands.implement('catalog.requestBuild', (arg?: unknown) => {
            if (typeof arg === 'object' && arg !== null && 'partId' in arg) {
                const typed = arg as { partId: string; ref?: string };
                requestBuild(typed.partId, typed.ref ?? 'master');
            }
        });

        cx.commands.implement('catalog.compose', (arg?: unknown) => {
            if (typeof arg === 'string') {
                compose(arg);
            }
        });

        cx.commands.implement('catalog.deploy', (arg?: unknown) => {
            if (typeof arg === 'object' && arg !== null && 'siteId' in arg && 'releaseHash' in arg) {
                const typed = arg as { siteId: string; releaseHash: string };
                deploy(typed.siteId, typed.releaseHash);
            }
        });

        cx.commands.implement('catalog.rollback', (arg?: unknown) => {
            if (typeof arg === 'string') {
                rollback(arg);
            }
        });

        cx.commands.implement('catalog.openWorkbench', () => {
            cx.windows.open({ view: 'catalog' });
        });

        // Open default window deferred
        setTimeout(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'catalog' });
            }
        }, 0);

        const api: CatalogApi = {
            repos,
            parts,
            artifacts,
            compositions,
            releases,
            sites,
            selectedTab,
            selectedPartId,
            addPart,
            deletePart,
            addRepo,
            deleteRepo,
            requestBuild,
            compose,
            deploy,
            rollback,
        };

        const internal: CatalogInternal = {
            repos,
            parts,
            artifacts,
            compositions,
            releases,
            sites,
            selectedTab,
            setTab,
            selectedPartId,
            selectPart,
            partKindFilter,
            setPartKindFilter,
            searchQuery,
            setSearchQuery,
            isCreatingPart,
            draftPartKey,
            draftPartKind,
            draftPartRepoId,
            draftPartPath,
            draftPartEntry,
            draftPartImports,
            draftPartDescription,
            isCreatingRepo,
            draftRepoUrl,
            draftRepoBranch,
            isCreatingComposition,
            draftCompKey,
            draftCompKernel,
            draftBuildRef,
            addPart,
            updatePart,
            deletePart,
            addRepo,
            deleteRepo,
            requestBuild,
            compose,
            togglePartInComposition,
            deploy,
            rollback,
            openTab,
        };

        return { api, internal };
    }
}
