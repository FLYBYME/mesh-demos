/**
 * Catalog manager application contract, data structures, and initial state.
 */

import {
    needs,
    provider,
    type ProviderToken,
    type ReadonlySignal,
    type Signal,
    type ViewContext,
} from '@flybyme/mesh-web';

export type PartKind = 'kernel' | 'application' | 'extension' | 'driver' | 'theme' | 'service';

export type BuildStatus = 'pending' | 'running' | 'success' | 'failed';

export type CatalogTab = 'parts' | 'repos' | 'builds' | 'compositions' | 'sites';

export interface RepoRecord {
    readonly id: string;
    readonly tenantId: string;
    readonly url: string;
    readonly defaultBranch: string;
}

export interface PartRecord {
    readonly id: string;
    readonly tenantId: string;
    readonly repoId: string;
    readonly key: string; // e.g. "platform/kernel", "demos/clock"
    readonly kind: PartKind;
    readonly path: string;
    readonly entryPoint: string;
    readonly imports?: string | undefined;
    readonly wants: readonly string[];
    readonly description?: string | undefined;
}

export interface AssetRecord {
    readonly name: string;
    readonly url: string;
    readonly fileExtension?: string | undefined;
    readonly sizeBytes: number;
}

export interface ArtifactRecord {
    readonly id: string;
    readonly tenantId: string;
    readonly partId: string;
    readonly partKey: string;
    readonly ref: string;
    readonly drivers?: readonly string[] | undefined;
    readonly status: BuildStatus;
    readonly hash?: string | undefined;
    readonly duration?: number | undefined;
    readonly error?: string | undefined;
    readonly assets?: readonly AssetRecord[] | undefined;
    readonly createdAt: number;
}

export interface CompositionRecord {
    readonly id: string;
    readonly tenantId: string;
    readonly key: string;
    readonly kernelPartKey: string;
    readonly drivers: readonly string[];
    readonly theme?: string | undefined;
    readonly parts: readonly string[];
}

export interface PinnedPart {
    readonly partKey: string;
    readonly kind: PartKind;
    readonly artifactHash: string;
    readonly imports?: string | undefined;
}

export interface ReleaseRecord {
    readonly id: string;
    readonly compositionId: string;
    readonly compositionKey: string;
    readonly hash: string;
    readonly createdAt: number;
    readonly parts: readonly PinnedPart[];
}

export interface SiteRecord {
    readonly id: string;
    readonly tenantId: string;
    readonly host: string;
    readonly apiId: string;
    readonly application: string; // composition key
    readonly releaseHash: string;
    readonly title: string;
    readonly previousReleaseHash?: string | undefined;
}

export interface CatalogApi {
    readonly repos: ReadonlySignal<readonly RepoRecord[]>;
    readonly parts: ReadonlySignal<readonly PartRecord[]>;
    readonly artifacts: ReadonlySignal<readonly ArtifactRecord[]>;
    readonly compositions: ReadonlySignal<readonly CompositionRecord[]>;
    readonly releases: ReadonlySignal<readonly ReleaseRecord[]>;
    readonly sites: ReadonlySignal<readonly SiteRecord[]>;

    readonly selectedTab: ReadonlySignal<CatalogTab>;
    readonly selectedPartId: ReadonlySignal<string | null>;

    addPart(input: Omit<PartRecord, 'id' | 'tenantId'>): PartRecord;
    deletePart(id: string): void;
    addRepo(url: string, defaultBranch: string): RepoRecord;
    deleteRepo(id: string): void;
    requestBuild(partId: string, ref: string): ArtifactRecord;
    compose(compositionId: string): ReleaseRecord;
    deploy(siteId: string, releaseHash: string): SiteRecord;
    rollback(siteId: string): SiteRecord;
}

export interface CatalogInternal {
    // Reactive lists
    readonly repos: Signal<readonly RepoRecord[]>;
    readonly parts: Signal<readonly PartRecord[]>;
    readonly artifacts: Signal<readonly ArtifactRecord[]>;
    readonly compositions: Signal<readonly CompositionRecord[]>;
    readonly releases: Signal<readonly ReleaseRecord[]>;
    readonly sites: Signal<readonly SiteRecord[]>;

    // View state & navigation
    readonly selectedTab: Signal<CatalogTab>;
    readonly setTab: (tab: CatalogTab) => void;
    readonly selectedPartId: Signal<string | null>;
    readonly selectPart: (id: string | null) => void;

    // Filters & searches
    readonly partKindFilter: Signal<PartKind | 'all'>;
    readonly setPartKindFilter: (filter: PartKind | 'all') => void;
    readonly searchQuery: Signal<string>;
    readonly setSearchQuery: (q: string) => void;

    // Creation / edit forms state
    readonly isCreatingPart: Signal<boolean>;
    readonly draftPartKey: Signal<string>;
    readonly draftPartKind: Signal<PartKind>;
    readonly draftPartRepoId: Signal<string>;
    readonly draftPartPath: Signal<string>;
    readonly draftPartEntry: Signal<string>;
    readonly draftPartImports: Signal<string>;
    readonly draftPartDescription: Signal<string>;

    readonly isCreatingRepo: Signal<boolean>;
    readonly draftRepoUrl: Signal<string>;
    readonly draftRepoBranch: Signal<string>;

    readonly isCreatingComposition: Signal<boolean>;
    readonly draftCompKey: Signal<string>;
    readonly draftCompKernel: Signal<string>;

    readonly draftBuildRef: Signal<string>;

    // Domain operations
    addPart(input: Omit<PartRecord, 'id' | 'tenantId'>): PartRecord;
    updatePart(id: string, updates: Partial<Omit<PartRecord, 'id' | 'tenantId' | 'key'>>): PartRecord | null;
    deletePart(id: string): void;

    addRepo(url: string, defaultBranch: string): RepoRecord;
    deleteRepo(id: string): void;

    requestBuild(partId: string, ref: string): ArtifactRecord;
    compose(compositionId: string): ReleaseRecord;
    togglePartInComposition(compositionId: string, partKey: string): void;

    deploy(siteId: string, releaseHash: string): SiteRecord;
    rollback(siteId: string): SiteRecord;

    // Windows
    openTab(tab: CatalogTab): void;
}

export type CatalogView = ViewContext<Record<string, never>, CatalogInternal, CatalogApi>;

export const CATALOG: ProviderToken<CatalogApi> = provider<CatalogApi>('catalog');

export const NEEDS = needs('state', 'commands', 'windows', 'log');

export const CONSUMES = [] as const;

export const INITIAL_REPOS: readonly RepoRecord[] = [
    {
        id: 'repo-web',
        tenantId: 'platform',
        url: '/home/ubuntu/code/.git-remotes/mesh-web.git',
        defaultBranch: 'master',
    },
    {
        id: 'repo-demos',
        tenantId: 'platform',
        url: '/home/ubuntu/code/.git-remotes/mesh-demos.git',
        defaultBranch: 'rebuild',
    },
    {
        id: 'repo-core',
        tenantId: 'platform',
        url: '/home/ubuntu/code/.git-remotes/mesh-core.git',
        defaultBranch: 'master',
    },
];

export const INITIAL_PARTS: readonly PartRecord[] = [
    {
        id: 'part-kernel',
        tenantId: 'platform',
        repoId: 'repo-web',
        key: 'platform/kernel',
        kind: 'kernel',
        path: '.',
        entryPoint: 'src/index.ts',
        imports: '@flybyme/mesh-web',
        wants: [],
        description: 'Core mesh-web runtime and client bootloader.',
    },
    {
        id: 'part-clock',
        tenantId: 'platform',
        repoId: 'repo-demos',
        key: 'demos/clock',
        kind: 'application',
        path: '.',
        entryPoint: 'src/clock/index.ts',
        wants: [],
        description: 'Digital clock, stopwatch, and timer utility.',
    },
    {
        id: 'part-calc',
        tenantId: 'platform',
        repoId: 'repo-demos',
        key: 'demos/calc',
        kind: 'application',
        path: '.',
        entryPoint: 'src/calc/index.ts',
        wants: [],
        description: 'Expression calculator with tape history.',
    },
    {
        id: 'part-todo',
        tenantId: 'platform',
        repoId: 'repo-demos',
        key: 'demos/todo',
        kind: 'application',
        path: '.',
        entryPoint: 'src/todo/index.ts',
        wants: ['storage.get', 'storage.set'],
        description: 'Task tracker and productivity board.',
    },
    {
        id: 'part-theme',
        tenantId: 'platform',
        repoId: 'repo-demos',
        key: 'demos/theme',
        kind: 'extension',
        path: '.',
        entryPoint: 'src/theme/index.ts',
        imports: '@flybyme/mesh-demos/theme',
        wants: [],
        description: 'Dynamic CSS tokens and theme presets extension.',
    },
    {
        id: 'part-palette',
        tenantId: 'platform',
        repoId: 'repo-demos',
        key: 'demos/palette',
        kind: 'application',
        path: '.',
        entryPoint: 'src/palette/index.ts',
        wants: [],
        description: 'Live theme token editor and inspector.',
    },
];

export const INITIAL_ARTIFACTS: readonly ArtifactRecord[] = [
    {
        id: 'art-k1',
        tenantId: 'platform',
        partId: 'part-kernel',
        partKey: 'platform/kernel',
        ref: 'master',
        status: 'success',
        hash: 'art-hash-kernel-017',
        duration: 1.4,
        createdAt: 1773700000000,
        assets: [
            { name: 'main.js', url: '/assets/art-hash-kernel-017/main.js', fileExtension: '.js', sizeBytes: 52400 },
        ],
    },
    {
        id: 'art-c1',
        tenantId: 'platform',
        partId: 'part-clock',
        partKey: 'demos/clock',
        ref: 'rebuild',
        status: 'success',
        hash: 'art-hash-clock-030',
        duration: 0.8,
        createdAt: 1773701000000,
        assets: [
            { name: 'main.js', url: '/assets/art-hash-clock-030/main.js', fileExtension: '.js', sizeBytes: 18200 },
            { name: 'clock.css', url: '/assets/art-hash-clock-030/clock.css', fileExtension: '.css', sizeBytes: 3100 },
        ],
    },
    {
        id: 'art-t1',
        tenantId: 'platform',
        partId: 'part-theme',
        partKey: 'demos/theme',
        ref: 'rebuild',
        status: 'success',
        hash: 'art-hash-theme-030',
        duration: 0.5,
        createdAt: 1773702000000,
        assets: [
            { name: 'main.js', url: '/assets/art-hash-theme-030/main.js', fileExtension: '.js', sizeBytes: 12100 },
        ],
    },
    {
        id: 'art-calc1',
        tenantId: 'platform',
        partId: 'part-calc',
        partKey: 'demos/calc',
        ref: 'rebuild',
        status: 'success',
        hash: 'art-hash-calc-030',
        duration: 0.7,
        createdAt: 1773703000000,
        assets: [
            { name: 'main.js', url: '/assets/art-hash-calc-030/main.js', fileExtension: '.js', sizeBytes: 16400 },
            { name: 'calc.css', url: '/assets/art-hash-calc-030/calc.css', fileExtension: '.css', sizeBytes: 2800 },
        ],
    },
];

export const INITIAL_COMPOSITIONS: readonly CompositionRecord[] = [
    {
        id: 'comp-demos',
        tenantId: 'platform',
        key: 'demos',
        kernelPartKey: 'platform/kernel',
        drivers: [],
        parts: ['demos/clock', 'demos/calc', 'demos/theme'],
    },
];

export const INITIAL_RELEASES: readonly ReleaseRecord[] = [
    {
        id: 'rel-101',
        compositionId: 'comp-demos',
        compositionKey: 'demos',
        hash: 'rel-hash-demos-v1',
        createdAt: 1773705000000,
        parts: [
            { partKey: 'platform/kernel', kind: 'kernel', artifactHash: 'art-hash-kernel-017', imports: '@flybyme/mesh-web' },
            { partKey: 'demos/clock', kind: 'application', artifactHash: 'art-hash-clock-030' },
            { partKey: 'demos/calc', kind: 'application', artifactHash: 'art-hash-calc-030' },
            { partKey: 'demos/theme', kind: 'extension', artifactHash: 'art-hash-theme-030', imports: '@flybyme/mesh-demos/theme' },
        ],
    },
];

export const INITIAL_SITES: readonly SiteRecord[] = [
    {
        id: 'site-demos',
        tenantId: 'platform',
        host: 'demos.localhost',
        apiId: 'api.localhost',
        application: 'demos',
        releaseHash: 'rel-hash-demos-v1',
        title: 'Mesh Demos Portal',
    },
];
