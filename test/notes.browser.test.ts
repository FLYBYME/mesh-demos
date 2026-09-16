/**
 * Browser integration tests for NotesApp.
 *
 * Runs in a real Chromium browser via vitest.browser.config.ts.
 * Verifies:
 * - Booting NotesApp into the kernel via mountPart().
 * - Note creation, selection, and editing in the master-detail workspace.
 * - Search filtering across note titles and content.
 * - Note deletion and clearing all notes.
 * - Word counting and statistics metrics view.
 * - Published commands and API surface.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import type { PartApi } from '@flybyme/mesh-web';

import NotesApp, { type NotesInternal } from '../src/notes/index.js';

let site: Awaited<ReturnType<typeof bootNotes>> | undefined;

afterEach(() => {
    site?.dispose();
    site = undefined;
    cleanup();
    for (const el of document.querySelectorAll('.notes-container')) {
        el.remove();
    }
});

async function bootNotes(views?: readonly string[]) {
    const options = views
        ? {
              parts: [{ id: 'notes', contribution: NotesApp }],
              open: [{ application: 'notes', views }],
          }
        : {
              parts: [{ id: 'notes', contribution: NotesApp }],
          };

    const s = await mountPart(options);
    await s.ready;
    await new Promise((r) => setTimeout(r, 30));
    return s;
}

function getNotesInternal(s: NonNullable<typeof site>): NotesInternal {
    const process = s.kernel.processes.find((p) => p.applicationId === 'notes');
    if (!process || !process.internal) {
        throw new Error('Notes process or internal not found');
    }
    return process.internal as NotesInternal;
}

describe('NotesApp browser integration', () => {
    it('boots into a window and renders empty workspace', async () => {
        site = await bootNotes();

        // 1. Single window opened with view 'notes'
        const windows = site.manager.windows();
        expect(windows).toHaveLength(1);
        expect(windows[0]?.view).toBe('notes');

        // 2. Elements present
        expect(document.querySelector('.notes-search-input')).not.toBeNull();
        expect(document.querySelector('.notes-btn-new')).not.toBeNull();
        expect(document.querySelector('.notes-editor-title')).not.toBeNull();
        expect(document.querySelector('.notes-editor-body')).not.toBeNull();
        expect(document.querySelector('.notes-btn-save')).not.toBeNull();

        // 3. Empty list message
        expect(document.querySelector('.notes-empty-list')?.textContent).toContain('No notes yet');
    });

    it('creates notes and displays them in the list', async () => {
        site = await bootNotes();
        const internal = getNotesInternal(site);

        // Enter note title and body via internal
        internal.setDraftTitle('Architecture Decisions');
        internal.setDraftBody('Kernel capabilities must be declared statically rather than discovered at runtime.');
        internal.saveCurrent();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.notes().length).toBe(1);
        expect(internal.notes()[0]?.title).toBe('Architecture Decisions');

        // Verify DOM rendered card
        const card = document.querySelector('.notes-card');
        expect(card).not.toBeNull();
        expect(card?.querySelector('.notes-card-title')?.textContent).toBe('Architecture Decisions');
        expect(card?.querySelector('.notes-card-snippet')?.textContent).toContain('Kernel capabilities');

        // Create second note
        internal.newNote();
        internal.createNote('Shopping List', 'Milk, bread, eggs, coffee.');
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.notes().length).toBe(2);
        expect(document.querySelectorAll('.notes-card').length).toBe(2);
    });

    it('selects and updates an existing note', async () => {
        site = await bootNotes();
        const internal = getNotesInternal(site);

        internal.createNote('Draft Specs', 'Initial outline for mesh components.');
        await new Promise((r) => setTimeout(r, 20));

        const noteId = internal.notes()[0]!.id;
        expect(internal.selectedId()).toBe(noteId);

        // Edit title and body
        internal.setDraftTitle('Final Specs');
        internal.setDraftBody('Completed specification for all components.');
        internal.saveCurrent();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.notes()[0]?.title).toBe('Final Specs');
        expect(internal.notes()[0]?.body).toContain('Completed specification');

        const cardTitle = document.querySelector('.notes-card-title');
        expect(cardTitle?.textContent).toBe('Final Specs');
    });

    it('filters notes using search query', async () => {
        site = await bootNotes();
        const internal = getNotesInternal(site);

        internal.createNote('Project Alpha', 'Frontend migration tasks.');
        internal.createNote('Project Beta', 'Backend database optimizations.');
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.notes().length).toBe(2);

        // Search for 'Alpha'
        internal.setFilter('Alpha');
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.filteredNotes().length).toBe(1);
        expect(internal.filteredNotes()[0]?.title).toBe('Project Alpha');
        expect(document.querySelectorAll('.notes-card').length).toBe(1);

        // Search for 'Beta'
        internal.setFilter('Beta');
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.filteredNotes().length).toBe(1);
        expect(internal.filteredNotes()[0]?.title).toBe('Project Beta');

        // Clear search
        internal.clearFilter();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.filteredNotes().length).toBe(2);
        expect(document.querySelectorAll('.notes-card').length).toBe(2);
    });

    it('deletes a selected note', async () => {
        site = await bootNotes();
        const internal = getNotesInternal(site);

        internal.createNote('Temporary Note', 'Will be deleted.');
        await new Promise((r) => setTimeout(r, 20));
        expect(internal.notes().length).toBe(1);

        // Click delete button
        const deleteBtn = document.querySelector<HTMLButtonElement>('.notes-btn-delete');
        expect(deleteBtn).not.toBeNull();
        deleteBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.notes().length).toBe(0);
        expect(internal.selectedId()).toBeNull();
        expect(document.querySelector('.notes-empty-list')).not.toBeNull();
    });

    it('tracks word metrics in the stats view', async () => {
        site = await bootNotes();
        const internal = getNotesInternal(site);

        internal.createNote('Short Note', 'One two three four five.'); // Title: 2, Body: 5 -> 7 words
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.totalCount()).toBe(1);
        expect(internal.totalWords()).toBe(7);

        // Open stats tab
        const statsNavBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.notes-nav-btn')).find(
            (b) => b.textContent?.trim() === 'Stats',
        );
        statsNavBtn?.click();
        await new Promise((r) => setTimeout(r, 30));

        // Stats window opened
        const statsWindow = site.manager.windows().find((w) => w.view === 'stats');
        expect(statsWindow).toBeDefined();

        // Clear all notes via stats view button
        const clearAllBtn = document.querySelector<HTMLButtonElement>('.notes-btn-clear-all');
        expect(clearAllBtn).not.toBeNull();
        expect(clearAllBtn?.textContent).toContain('Clear All');
        clearAllBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.totalCount()).toBe(0);
        expect(internal.totalWords()).toBe(0);
    });

    it('exposes published commands via API', async () => {
        site = await bootNotes();
        const process = site.kernel.processes.find((p) => p.applicationId === 'notes');
        expect(process).toBeDefined();

        const api = process?.api as PartApi | undefined;
        expect(api).toBeDefined();
        expect(api?.commands).toBeDefined();

        const internal = getNotesInternal(site);

        // Create via API
        await api?.commands.create?.run({ title: 'Note from API', body: 'Content created over mesh API.' });
        expect(internal.notes().length).toBe(1);
        expect(internal.notes()[0]?.title).toBe('Note from API');

        const noteId = internal.notes()[0]!.id;

        // Update via API
        await api?.commands.update?.run({ id: noteId, title: 'Updated API Note', body: 'New content.' });
        expect(internal.notes()[0]?.title).toBe('Updated API Note');

        // Delete via API
        await api?.commands.delete?.run({ id: noteId });
        expect(internal.notes().length).toBe(0);
    });
});
