/**
 * Stats view: Overview of notes volume, word count, and maintenance actions.
 */

import { element, text, when, type Node } from '@flybyme/mesh-web';
import type { NotesView } from '../contract.js';

export function renderStatsView(vx: NotesView): Node {
    const app = vx.internal;

    return element('Stack', {
        props: { class: 'notes-container' },
        children: [
            // Header / Navigation
            element('Row', {
                props: { class: 'notes-header' },
                children: [
                    element('Row', {
                        props: { class: 'notes-nav' },
                        children: [
                            element('Button', {
                                props: { class: 'notes-nav-btn' },
                                intents: { activate: { action: vx.on(() => app.openNotes()) } },
                                children: [text('Notes')],
                            }),
                            element('Button', {
                                props: { class: 'notes-nav-btn active' },
                                children: [text('Stats')],
                            }),
                        ],
                    }),
                ],
            }),

            // Stats Card
            element('Stack', {
                props: { class: 'notes-stats-card' },
                children: [
                    element('Row', {
                        props: { class: 'notes-metric-row' },
                        children: [
                            element('Text', { children: [text('Total notes')] }),
                            element('Text', {
                                props: { class: 'notes-metric-value' },
                                children: [text(() => String(app.totalCount()))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { class: 'notes-metric-row' },
                        children: [
                            element('Text', { children: [text('Total word count')] }),
                            element('Text', {
                                props: { class: 'notes-metric-value' },
                                children: [text(() => String(app.totalWords()))],
                            }),
                        ],
                    }),
                ],
            }),

            // Actions
            when(
                () => app.totalCount() > 0,
                () => element('Button', {
                    props: { class: 'notes-btn-delete notes-btn-clear-all', style: { alignSelf: 'flex-start' } },
                    intents: { activate: { action: vx.on(() => app.clearAll()) } },
                    children: [text('Clear All Notes')],
                }),
            ),
        ],
    });
}
