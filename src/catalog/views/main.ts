/**
 * Unified Catalog Manager Workbench View.
 */

import { element, text, when, type Node } from '@flybyme/mesh-web';
import type { CatalogTab, CatalogView } from '../contract.js';
import { renderBuildsView } from './builds.js';
import { renderCompositionsView } from './compositions.js';
import { renderPartsView } from './parts.js';
import { renderReposView } from './repos.js';
import { renderSitesView } from './sites.js';

interface TabDef {
    readonly id: CatalogTab;
    readonly label: string;
}

const TABS: readonly TabDef[] = [
    { id: 'parts', label: 'Parts' },
    { id: 'repos', label: 'Repositories' },
    { id: 'builds', label: 'Builds & Artifacts' },
    { id: 'compositions', label: 'Compositions' },
    { id: 'sites', label: 'Deployments' },
];

export function renderMainView(vx: CatalogView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'catalog-root' },
        children: [
            // Header
            element('Stack', {
                props: { class: 'catalog-header' },
                children: [
                    element('Row', {
                        props: { class: 'catalog-header-top' },
                        children: [
                            element('Row', {
                                props: { class: 'catalog-title-group' },
                                children: [
                                    element('Text', {
                                        props: { class: 'catalog-title' },
                                        children: [text('Mesh Catalog Manager')],
                                    }),
                                    element('Text', {
                                        props: { class: 'badge-kind badge-kernel' },
                                        children: [text('v0.17')],
                                    }),
                                ],
                            }),
                            element('Row', {
                                props: { class: 'catalog-header-stats' },
                                children: [
                                    element('Text', {
                                        children: [
                                            text(
                                                () =>
                                                    `${app.parts().length} parts · ${app.repos().length} repos · ${app.artifacts().length} builds · ${app.sites().length} sites`,
                                            ),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),

                    // Tabs
                    element('Row', {
                        props: { class: 'catalog-tabs' },
                        children: TABS.map((tab) =>
                            element('Button', {
                                props: {
                                    class: () =>
                                        app.selectedTab() === tab.id
                                            ? 'catalog-tab-btn active'
                                            : 'catalog-tab-btn',
                                    'data-tab': tab.id,
                                },
                                intents: {
                                    activate: {
                                        action: vx.on(() => app.setTab(tab.id)),
                                    },
                                },
                                children: [text(tab.label)],
                            }),
                        ),
                    }),
                ],
            }),

            // Tab View Body
            when(() => app.selectedTab() === 'parts', () => renderPartsView(vx)),
            when(() => app.selectedTab() === 'repos', () => renderReposView(vx)),
            when(() => app.selectedTab() === 'builds', () => renderBuildsView(vx)),
            when(() => app.selectedTab() === 'compositions', () => renderCompositionsView(vx)),
            when(() => app.selectedTab() === 'sites', () => renderSitesView(vx)),
        ],
    });
}
