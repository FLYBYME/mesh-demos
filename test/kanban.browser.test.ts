import { describe, expect, it, afterEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import KanbanApp, { KANBAN } from '../src/kanban/index.js';

describe('KanbanApp browser tests', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('boots, starts the Application, and provides the KanbanApi', async () => {
        const site = await mountPart({
            parts: [{ id: 'kanban', contribution: KanbanApp }],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'kanban');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        const api = site.kernel.provided(KANBAN);
        expect(api).toBeDefined();
        expect(api?.columns.length).toBe(4);
        expect(api?.totalCards()).toBe(5);

        site.dispose();
    });

    it('renders board and composer panes with 4 columns in the DOM', async () => {
        const site = await mountPart({
            parts: [{ id: 'kanban', contribution: KanbanApp }],
        });

        expect(site.manager.windows().length).toBe(2);
        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('board');
        expect(views).toContain('composer');

        // Board view
        const boardTitle = document.querySelector<HTMLElement>('.kanban-title');
        expect(boardTitle?.textContent).toBe('Project Board');

        const columns = document.querySelectorAll<HTMLElement>('.kanban-column');
        expect(columns.length).toBe(4);

        const todoCol = document.querySelector<HTMLElement>('.kanban-column-todo');
        expect(todoCol).not.toBeNull();
        expect(todoCol?.querySelector('.column-title')?.textContent).toBe('To Do');

        // Composer view
        const composerTitle = document.querySelector<HTMLElement>('.composer-title');
        expect(composerTitle?.textContent).toBe('Create Task Card');

        site.dispose();
    });

    it('moves a card forward and backward using directional buttons', async () => {
        const site = await mountPart({
            parts: [{ id: 'kanban', contribution: KanbanApp }],
        });

        const boardWin = site.manager.windows().find((w) => w.view === 'board');
        if (boardWin) site.manager.focus(boardWin.id);

        const api = site.kernel.provided(KANBAN);
        if (!api) throw new Error('KanbanApi missing');

        // Initial state: card-1 is in 'todo'
        expect(api.cardsInColumn('todo').some((c) => c.id === 'card-1')).toBe(true);

        const card1El = document.querySelector<HTMLElement>('.kanban-card-item[data-id="card-1"]');
        if (!card1El) throw new Error('card-1 element not found');

        const moveNextBtn = card1El.querySelector<HTMLButtonElement>('.btn-move-next');
        if (!moveNextBtn) throw new Error('Move next button not found on card-1');

        // Move to 'in_progress'
        await userEvent.click(moveNextBtn);

        expect(api.cardsInColumn('in_progress').some((c) => c.id === 'card-1')).toBe(true);
        expect(api.cardsInColumn('todo').some((c) => c.id === 'card-1')).toBe(false);

        // Move back to 'todo'
        const updatedCard1 = document.querySelector<HTMLElement>('.kanban-card-item[data-id="card-1"]');
        const movePrevBtn = updatedCard1?.querySelector<HTMLButtonElement>('.btn-move-prev');
        if (!movePrevBtn) throw new Error('Move prev button not found on moved card-1');

        await userEvent.click(movePrevBtn);

        expect(api.cardsInColumn('todo').some((c) => c.id === 'card-1')).toBe(true);

        site.dispose();
    });

    it('moves a card using Grab and Drop-Here interaction (drag replacement)', async () => {
        const site = await mountPart({
            parts: [{ id: 'kanban', contribution: KanbanApp }],
        });

        const boardWin = site.manager.windows().find((w) => w.view === 'board');
        if (boardWin) site.manager.focus(boardWin.id);

        const api = site.kernel.provided(KANBAN);
        if (!api) throw new Error('KanbanApi missing');

        // Grab card-2 (currently in 'todo')
        const card2El = document.querySelector<HTMLElement>('.kanban-card-item[data-id="card-2"]');
        const grabBtn = card2El?.querySelector<HTMLButtonElement>('.btn-grab-card');
        if (!grabBtn) throw new Error('Grab button on card-2 not found');

        await userEvent.click(grabBtn);

        expect(api.heldCardId()).toBe('card-2');

        // Grab banner should be visible
        const banner = document.querySelector<HTMLElement>('.grab-banner');
        expect(banner).not.toBeNull();
        expect(banner?.textContent).toContain('Document Surface Escape Hatch');

        // Drop zones should be visible in each column
        const dropZones = document.querySelectorAll<HTMLButtonElement>('.btn-drop-zone');
        expect(dropZones.length).toBe(4);

        // Click drop zone in 'done' column
        const dropDoneBtn = document.querySelector<HTMLButtonElement>('.btn-drop-done');
        if (!dropDoneBtn) throw new Error('Drop zone for done column not found');

        await userEvent.click(dropDoneBtn);

        // Card-2 should now be in 'done' column
        expect(api.heldCardId()).toBeNull();
        expect(api.cardsInColumn('done').some((c) => c.id === 'card-2')).toBe(true);
        expect(api.cardsInColumn('todo').some((c) => c.id === 'card-2')).toBe(false);

        site.dispose();
    });

    it('creates a new card using the composer form', async () => {
        const site = await mountPart({
            parts: [{ id: 'kanban', contribution: KanbanApp }],
        });

        const composerWin = site.manager.windows().find((w) => w.view === 'composer');
        if (composerWin) site.manager.focus(composerWin.id);

        const api = site.kernel.provided(KANBAN);
        if (!api) throw new Error('KanbanApi missing');

        const titleInput = document.querySelector<HTMLInputElement>('.input-card-title');
        const descInput = document.querySelector<HTMLInputElement>('.input-card-desc');
        const colBtn = document.querySelector<HTMLButtonElement>('.btn-select-col-review');
        const priorityBtn = document.querySelector<HTMLButtonElement>('.btn-priority-high');
        const createBtn = document.querySelector<HTMLButtonElement>('.btn-create-card');

        if (!titleInput || !descInput || !colBtn || !priorityBtn || !createBtn) {
            throw new Error('Composer form controls not found');
        }

        await userEvent.type(titleInput, 'Browser Verification Suite');
        await userEvent.type(descInput, 'Ensure all 4 test suites pass green in Chromium.');
        await userEvent.click(colBtn);
        await userEvent.click(priorityBtn);
        await userEvent.click(createBtn);

        expect(api.totalCards()).toBe(6);
        const reviewCards = api.cardsInColumn('review');
        const created = reviewCards.find((c) => c.title === 'Browser Verification Suite');
        expect(created).toBeDefined();
        expect(created?.priority).toBe('high');
        expect(created?.description).toContain('Ensure all 4 test suites pass green');

        site.dispose();
    });

    it('filters cards by query text and clears the filter', async () => {
        const site = await mountPart({
            parts: [{ id: 'kanban', contribution: KanbanApp }],
        });

        const boardWin = site.manager.windows().find((w) => w.view === 'board');
        if (boardWin) site.manager.focus(boardWin.id);

        const filterInput = document.querySelector<HTMLInputElement>('.kanban-filter-input');
        const clearBtn = document.querySelector<HTMLButtonElement>('.btn-clear-kanban-filter');
        if (!filterInput || !clearBtn) throw new Error('Filter controls not found');

        // Type query 'Vocabulary' (only card-1 has it)
        await userEvent.type(filterInput, 'Vocabulary');

        const visibleCards = document.querySelectorAll<HTMLElement>('.kanban-card-item');
        expect(visibleCards.length).toBe(1);
        expect(visibleCards[0]?.textContent).toContain('Design Component Vocabulary Audit');

        // Clear filter
        await userEvent.click(clearBtn);

        const allCards = document.querySelectorAll<HTMLElement>('.kanban-card-item');
        expect(allCards.length).toBe(5);

        site.dispose();
    });

    it('deletes a card from a column', async () => {
        const site = await mountPart({
            parts: [{ id: 'kanban', contribution: KanbanApp }],
        });

        const api = site.kernel.provided(KANBAN);
        if (!api) throw new Error('KanbanApi missing');

        const initialCount = api.totalCards();

        const card5El = document.querySelector<HTMLElement>('.kanban-card-item[data-id="card-5"]');
        const deleteBtn = card5El?.querySelector<HTMLButtonElement>('.btn-delete-card');
        if (!deleteBtn) throw new Error('Delete button for card-5 not found');

        await userEvent.click(deleteBtn);

        expect(api.totalCards()).toBe(initialCount - 1);
        expect(api.cards().some((c) => c.id === 'card-5')).toBe(false);

        site.dispose();
    });

    it('declares commands, keys, views, and layout statically on the class', () => {
        const app = new KanbanApp();
        expect(app.commands.map((c) => c.id)).toContain('kanban.addCard');
        expect(app.commands.map((c) => c.id)).toContain('kanban.deleteCard');
        expect(app.commands.map((c) => c.id)).toContain('kanban.grabCard');
        expect(app.commands.map((c) => c.id)).toContain('kanban.dropInColumn');
        expect(app.commands.map((c) => c.id)).toContain('kanban.moveCardNext');
        expect(app.keys.map((k) => k.command)).toContain('kanban.cancelGrab');
        expect(app.views.map((v) => v.id)).toEqual(['board', 'composer']);
        expect(app.layout).toBeDefined();
    });
});
