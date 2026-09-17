import { describe, expect, it, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import CatalogApp, { CATALOG } from '../src/catalog/index.js';

describe('CatalogApp browser tests', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('boots, starts the Application, and provides the CatalogApi', async () => {
        const site = await mountPart({
            parts: [{ id: 'catalog', contribution: CatalogApp }],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'catalog');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        const api = site.kernel.provided(CATALOG);
        expect(api).toBeDefined();
        expect(api?.parts().length).toBe(6);
        expect(api?.repos().length).toBe(3);
        expect(api?.artifacts().length).toBe(4);
        expect(api?.compositions().length).toBe(1);
        expect(api?.releases().length).toBe(1);
        expect(api?.sites().length).toBe(1);

        site.dispose();
    });

    it('renders the catalog workbench view into the DOM with navigation tabs', async () => {
        const site = await mountPart({
            parts: [{ id: 'catalog', contribution: CatalogApp }],
        });

        await new Promise((r) => setTimeout(r, 40));

        expect(site.manager.windows().length).toBe(1);
        const win = site.manager.windows()[0];
        expect(win?.view).toBe('catalog');

        const title = document.querySelector<HTMLElement>('.catalog-title');
        expect(title?.textContent).toBe('Mesh Catalog Manager');

        const tabs = document.querySelectorAll<HTMLElement>('.catalog-tab-btn');
        expect(tabs.length).toBe(5);

        // Initial tab is 'parts'
        const activeTab = document.querySelector<HTMLElement>('.catalog-tab-btn.active');
        expect(activeTab?.textContent).toBe('Parts');

        // Initial 6 part cards rendered
        const cards = document.querySelectorAll<HTMLElement>('.catalog-card');
        expect(cards.length).toBe(6);

        site.dispose();
    });

    it('filters parts by kind and search query', async () => {
        const site = await mountPart({
            parts: [{ id: 'catalog', contribution: CatalogApp }],
        });

        await new Promise((r) => setTimeout(r, 40));

        const user = userEvent.setup();

        // Filter by kind: kernel
        const kernelPill = document.querySelector<HTMLButtonElement>('.pill-kernel');
        expect(kernelPill).toBeDefined();
        if (kernelPill) await user.click(kernelPill);

        let cards = document.querySelectorAll<HTMLElement>('.catalog-card');
        expect(cards.length).toBe(1);
        expect(cards[0]?.textContent).toContain('platform/kernel');

        // Reset to all
        const allPill = document.querySelector<HTMLButtonElement>('.pill-all');
        if (allPill) await user.click(allPill);

        cards = document.querySelectorAll<HTMLElement>('.catalog-card');
        expect(cards.length).toBe(6);

        // Filter by search query
        const searchInput = document.querySelector<HTMLInputElement>('.input-search-parts');
        expect(searchInput).toBeDefined();
        if (searchInput) {
            await user.type(searchInput, 'clock');
        }

        cards = document.querySelectorAll<HTMLElement>('.catalog-card');
        expect(cards.length).toBe(1);
        expect(cards[0]?.textContent).toContain('demos/clock');

        site.dispose();
    });

    it('registers a new part and deletes an existing part', async () => {
        const site = await mountPart({
            parts: [{ id: 'catalog', contribution: CatalogApp }],
        });

        await new Promise((r) => setTimeout(r, 40));

        const api = site.kernel.provided(CATALOG);
        expect(api).toBeDefined();

        // Add part via API
        const added = api!.addPart({
            repoId: 'repo-demos',
            key: 'demos/analytics',
            kind: 'application',
            path: '.',
            entryPoint: 'src/analytics/index.ts',
            wants: [],
            description: 'Metrics visualizer',
        });

        expect(api!.parts().length).toBe(7);
        expect(added.key).toBe('demos/analytics');

        await new Promise((r) => setTimeout(r, 20));

        const deleteBtn = document.querySelector<HTMLButtonElement>(`button.btn-delete-part[data-part-id="${added.id}"]`);
        expect(deleteBtn).not.toBeNull();
        deleteBtn?.click();
        await new Promise((r) => setTimeout(r, 40));

        expect(api!.parts().length).toBe(6);
        expect(api!.parts().find((p) => p.id === added.id)).toBeUndefined();

        site.dispose();
    });

    it('navigates to Repositories tab and manages repos', async () => {
        const site = await mountPart({
            parts: [{ id: 'catalog', contribution: CatalogApp }],
        });

        await new Promise((r) => setTimeout(r, 40));

        const user = userEvent.setup();
        const reposTab = document.querySelector<HTMLButtonElement>('button[data-tab="repos"]');
        expect(reposTab).toBeDefined();
        if (reposTab) await user.click(reposTab);

        const api = site.kernel.provided(CATALOG);
        expect(api?.selectedTab()).toBe('repos');

        // Add repo
        const newRepo = api!.addRepo('https://github.com/FLYBYME/mesh-new.git', 'main');
        expect(api!.repos().length).toBe(4);

        await new Promise((r) => setTimeout(r, 20));

        // Delete repo
        api!.deleteRepo(newRepo.id);
        expect(api!.repos().length).toBe(3);

        site.dispose();
    });

    it('requests an artifact build and generates a content-addressed hash', async () => {
        const site = await mountPart({
            parts: [{ id: 'catalog', contribution: CatalogApp }],
        });

        const api = site.kernel.provided(CATALOG);
        expect(api).toBeDefined();

        const initialArtifacts = api!.artifacts().length;
        const newArt = api!.requestBuild('part-clock', 'v1.0.0');

        expect(api!.artifacts().length).toBe(initialArtifacts + 1);
        expect(newArt.status).toBe('success');
        expect(newArt.hash).toContain('art-hash-demos-clock-v1.0.0');
        expect(newArt.assets?.length).toBeGreaterThan(0);

        site.dispose();
    });

    it('composes a new release and deploys it to a site with rollback support', async () => {
        const site = await mountPart({
            parts: [{ id: 'catalog', contribution: CatalogApp }],
        });

        const api = site.kernel.provided(CATALOG);
        expect(api).toBeDefined();

        // 1. Compose release
        const initialReleases = api!.releases().length;
        const release = api!.compose('comp-demos');

        expect(api!.releases().length).toBe(initialReleases + 1);
        expect(release.hash).toContain('rel-hash-demos-v');
        expect(release.parts.length).toBeGreaterThan(1);

        // 2. Deploy release to site
        const targetSite = api!.sites()[0]!;
        const initialReleaseHash = targetSite.releaseHash;

        const deployed = api!.deploy(targetSite.id, release.hash);
        expect(deployed.releaseHash).toBe(release.hash);
        expect(deployed.previousReleaseHash).toBe(initialReleaseHash);

        // 3. Rollback
        const rolledBack = api!.rollback(targetSite.id);
        expect(rolledBack.releaseHash).toBe(initialReleaseHash);
        expect(rolledBack.previousReleaseHash).toBe(release.hash);

        site.dispose();
    });

    it('declares commands, keys, and views statically on the class', () => {
        const app = new CatalogApp();

        expect(app.commands.length).toBeGreaterThan(5);
        expect(app.commands.some((c) => c.id === 'catalog.setTab')).toBe(true);
        expect(app.commands.some((c) => c.id === 'catalog.addPart')).toBe(true);
        expect(app.commands.some((c) => c.id === 'catalog.compose')).toBe(true);
        expect(app.commands.some((c) => c.id === 'catalog.deploy')).toBe(true);

        expect(app.views.length).toBe(6);
        const viewIds = app.views.map((v) => v.id);
        expect(viewIds).toContain('catalog');
        expect(viewIds).toContain('parts');
        expect(viewIds).toContain('repos');
        expect(viewIds).toContain('builds');
        expect(viewIds).toContain('compositions');
        expect(viewIds).toContain('sites');
    });
});
