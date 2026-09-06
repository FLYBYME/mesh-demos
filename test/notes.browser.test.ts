import { describe, expect, it, afterEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import NotesApp, { NOTES } from '../src/notes/index.js';

describe('NotesApp browser tests', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('boots, starts the Application, and provides the NotesApi', async () => {
        const site = await mountPart({
            parts: [{ id: 'notes', contribution: NotesApp }],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'notes');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        const api = site.kernel.provided(NOTES);
        expect(api).toBeDefined();
        expect(api?.notes()).toEqual([]);
        expect(api?.totalCount()).toBe(0);
        expect(api?.filterText()).toBe('');

        site.dispose();
    });

    it('renders all three views (notes list, editor, stats) into the DOM', async () => {
        const site = await mountPart({
            parts: [{ id: 'notes', contribution: NotesApp }],
        });

        expect(site.manager.windows().length).toBe(3);
        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('notes');
        expect(views).toContain('editor');
        expect(views).toContain('stats');

        // Notes list view
        const notesTitle = document.querySelector<HTMLElement>('.notes-title');
        expect(notesTitle?.textContent).toBe('Notes');
        const emptyCard = document.querySelector<HTMLElement>('.empty-notes-card');
        expect(emptyCard?.textContent).toBe('No notes match the current filter.');

        // Editor view
        const editorHeading = document.querySelector<HTMLElement>('.editor-heading');
        expect(editorHeading?.textContent).toBe('Note Editor');
        const newBadge = document.querySelector<HTMLElement>('.badge.new-badge');
        expect(newBadge?.textContent).toBe('New Note');

        // Stats view
        const statsHeading = document.querySelector<HTMLElement>('.stats-heading');
        expect(statsHeading?.textContent).toBe('Notes Overview');
        const totalCountBadge = document.querySelector<HTMLElement>('.stat-total-count');
        expect(totalCountBadge?.textContent).toBe('0');

        site.dispose();
    });

    it('creates a note using the editor and updates list and stats', async () => {
        const site = await mountPart({
            parts: [{ id: 'notes', contribution: NotesApp }],
        });

        // Focus editor window
        const editorWin = site.manager.windows().find((w) => w.view === 'editor');
        if (editorWin) site.manager.focus(editorWin.id);

        const titleInput = document.querySelector<HTMLInputElement>('.input-note-title');
        expect(titleInput).not.toBeNull();
        if (!titleInput) throw new Error('titleInput not found');

        const bodyInput = document.querySelector<HTMLInputElement>('.input-note-body');
        expect(bodyInput).not.toBeNull();
        if (!bodyInput) throw new Error('bodyInput not found');

        const saveBtn = document.querySelector<HTMLButtonElement>('.btn-save-note');
        expect(saveBtn).not.toBeNull();
        if (!saveBtn) throw new Error('saveBtn not found');

        await userEvent.type(titleInput, 'Grocery list');
        await userEvent.type(bodyInput, 'Milk, Eggs, Bread, Apples');
        await userEvent.click(saveBtn);

        // Verify in notes list
        const noteItems = document.querySelectorAll<HTMLElement>('.note-item');
        expect(noteItems.length).toBe(1);

        const noteTitle = document.querySelector<HTMLElement>('.note-title');
        expect(noteTitle?.textContent).toBe('Grocery list');

        const noteBody = document.querySelector<HTMLElement>('.note-body-preview');
        expect(noteBody?.textContent).toBe('Milk, Eggs, Bread, Apples');

        const countBadge = document.querySelector<HTMLElement>('.notes-count-badge');
        expect(countBadge?.textContent).toBe('1 notes');

        // Verify stats
        const statTotal = document.querySelector<HTMLElement>('.stat-total-count');
        expect(statTotal?.textContent).toBe('1');

        const statWords = document.querySelector<HTMLElement>('.stat-total-words');
        expect(statWords?.textContent).toBe('6'); // 2 + 4

        site.dispose();
    });

    it('selects and edits an existing note', async () => {
        const site = await mountPart({
            parts: [{ id: 'notes', contribution: NotesApp }],
        });

        // Create initial note
        const editorWin = site.manager.windows().find((w) => w.view === 'editor');
        if (editorWin) site.manager.focus(editorWin.id);

        const titleInput = document.querySelector<HTMLInputElement>('.input-note-title');
        const bodyInput = document.querySelector<HTMLInputElement>('.input-note-body');
        const saveBtn = document.querySelector<HTMLButtonElement>('.btn-save-note');
        if (!titleInput || !bodyInput || !saveBtn) throw new Error('Editor elements not found');

        await userEvent.type(titleInput, 'Meeting Notes');
        await userEvent.type(bodyInput, 'Old discussion points');
        await userEvent.click(saveBtn);

        // Focus notes list to click Edit
        const notesWin = site.manager.windows().find((w) => w.view === 'notes');
        if (notesWin) site.manager.focus(notesWin.id);

        const editBtn = document.querySelector<HTMLButtonElement>('.btn-edit-note');
        expect(editBtn).not.toBeNull();
        if (!editBtn) throw new Error('editBtn not found');

        await userEvent.click(editBtn);

        // Focus editor to edit
        if (editorWin) site.manager.focus(editorWin.id);

        const editBadge = document.querySelector<HTMLElement>('.badge.editing-badge');
        expect(editBadge?.textContent).toBe('Editing Note');

        const newBodyInput = document.querySelector<HTMLInputElement>('.input-note-body');
        const newSaveBtn = document.querySelector<HTMLButtonElement>('.btn-save-note');
        if (!newBodyInput || !newSaveBtn) throw new Error('Updated editor elements not found');

        await userEvent.clear(newBodyInput);
        await userEvent.type(newBodyInput, 'Updated discussion points and action items');
        await userEvent.click(newSaveBtn);

        // Check updated preview
        const noteBody = document.querySelector<HTMLElement>('.note-body-preview');
        expect(noteBody?.textContent).toBe('Updated discussion points and action items');

        site.dispose();
    });

    it('filters notes by text and clears the filter', async () => {
        const site = await mountPart({
            parts: [{ id: 'notes', contribution: NotesApp }],
        });

        // Add 2 notes
        const editorWin = site.manager.windows().find((w) => w.view === 'editor');
        if (editorWin) site.manager.focus(editorWin.id);

        const titleInput = document.querySelector<HTMLInputElement>('.input-note-title');
        const bodyInput = document.querySelector<HTMLInputElement>('.input-note-body');
        const saveBtn = document.querySelector<HTMLButtonElement>('.btn-save-note');
        if (!titleInput || !bodyInput || !saveBtn) throw new Error('Editor elements not found');

        await userEvent.type(titleInput, 'Alpha Project');
        await userEvent.type(bodyInput, 'Architecture details');
        await userEvent.click(saveBtn);

        const titleInput2 = document.querySelector<HTMLInputElement>('.input-note-title');
        const bodyInput2 = document.querySelector<HTMLInputElement>('.input-note-body');
        const saveBtn2 = document.querySelector<HTMLButtonElement>('.btn-save-note');
        if (!titleInput2 || !bodyInput2 || !saveBtn2) throw new Error('Second editor elements not found');

        await userEvent.type(titleInput2, 'Beta Testing');
        await userEvent.type(bodyInput2, 'Test suite coverage');
        await userEvent.click(saveBtn2);

        // Focus notes window
        const notesWin = site.manager.windows().find((w) => w.view === 'notes');
        if (notesWin) site.manager.focus(notesWin.id);

        expect(document.querySelectorAll<HTMLElement>('.note-item').length).toBe(2);

        // Type filter query "Beta"
        const filterInput = document.querySelector<HTMLInputElement>('.notes-filter-input');
        expect(filterInput).not.toBeNull();
        if (!filterInput) throw new Error('filterInput not found');

        await userEvent.type(filterInput, 'Beta');

        expect(document.querySelectorAll<HTMLElement>('.note-item').length).toBe(1);
        const filteredTitle = document.querySelector<HTMLElement>('.note-title');
        expect(filteredTitle?.textContent).toBe('Beta Testing');

        const statusText = document.querySelector<HTMLElement>('.filter-status-text');
        expect(statusText?.textContent).toBe('Showing 1 of 2 notes');

        // Clear filter
        const clearFilterBtn = document.querySelector<HTMLButtonElement>('.btn-clear-filter');
        expect(clearFilterBtn).not.toBeNull();
        if (!clearFilterBtn) throw new Error('clearFilterBtn not found');

        await userEvent.click(clearFilterBtn);
        expect(document.querySelectorAll<HTMLElement>('.note-item').length).toBe(2);
        expect(statusText?.textContent).toBe('Showing 2 of 2 notes');

        site.dispose();
    });

    it('deletes a note from the list and clears all from stats view', async () => {
        const site = await mountPart({
            parts: [{ id: 'notes', contribution: NotesApp }],
        });

        // Add 2 notes
        const editorWin = site.manager.windows().find((w) => w.view === 'editor');
        if (editorWin) site.manager.focus(editorWin.id);

        const titleInput = document.querySelector<HTMLInputElement>('.input-note-title');
        const bodyInput = document.querySelector<HTMLInputElement>('.input-note-body');
        const saveBtn = document.querySelector<HTMLButtonElement>('.btn-save-note');
        if (!titleInput || !bodyInput || !saveBtn) throw new Error('Editor elements not found');

        await userEvent.type(titleInput, 'First Note');
        await userEvent.type(bodyInput, 'Content one');
        await userEvent.click(saveBtn);

        const titleInput2 = document.querySelector<HTMLInputElement>('.input-note-title');
        const bodyInput2 = document.querySelector<HTMLInputElement>('.input-note-body');
        const saveBtn2 = document.querySelector<HTMLButtonElement>('.btn-save-note');
        if (!titleInput2 || !bodyInput2 || !saveBtn2) throw new Error('Second editor elements not found');

        await userEvent.type(titleInput2, 'Second Note');
        await userEvent.type(bodyInput2, 'Content two');
        await userEvent.click(saveBtn2);

        // Delete first note in notes view
        const notesWin = site.manager.windows().find((w) => w.view === 'notes');
        if (notesWin) site.manager.focus(notesWin.id);

        expect(document.querySelectorAll<HTMLElement>('.note-item').length).toBe(2);

        const deleteBtn = document.querySelector<HTMLButtonElement>('.btn-delete-note');
        expect(deleteBtn).not.toBeNull();
        if (!deleteBtn) throw new Error('deleteBtn not found');

        await userEvent.click(deleteBtn);
        expect(document.querySelectorAll<HTMLElement>('.note-item').length).toBe(1);

        // Clear all from stats view
        const statsWin = site.manager.windows().find((w) => w.view === 'stats');
        if (statsWin) site.manager.focus(statsWin.id);

        const clearAllBtn = document.querySelector<HTMLButtonElement>('.btn-clear-all');
        expect(clearAllBtn).not.toBeNull();
        if (!clearAllBtn) throw new Error('clearAllBtn not found');

        await userEvent.click(clearAllBtn);

        expect(document.querySelectorAll<HTMLElement>('.note-item').length).toBe(0);
        const emptyCard = document.querySelector<HTMLElement>('.empty-notes-card');
        expect(emptyCard?.textContent).toBe('No notes match the current filter.');

        const totalBadge = document.querySelector<HTMLElement>('.stat-total-count');
        expect(totalBadge?.textContent).toBe('0');

        site.dispose();
    });

    it('declares commands, keys, views, and layout statically on the class', () => {
        const app = new NotesApp();
        expect(app.needs).toEqual(['state', 'commands', 'windows', 'log']);
        expect(app.commands.map((c) => c.id)).toContain('notes.save');
        expect(app.commands.map((c) => c.id)).toContain('notes.delete');
        expect(app.commands.map((c) => c.id)).toContain('notes.setFilter');
        expect(app.views.map((v) => v.id)).toEqual(['notes', 'editor', 'stats']);
        expect(app.layout).toBeDefined();
    });
});
