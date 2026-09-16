/**
 * Browser integration tests for TodoApp.
 *
 * Runs in a real Chromium browser via vitest.browser.config.ts.
 * Verifies:
 * - Booting TodoApp into the kernel via mountPart().
 * - Task creation through draft input and Add button.
 * - Toggling task completion status.
 * - Filter switching (all, active, completed) and counter badges.
 * - Task deletion and batch clearing of completed tasks.
 * - Statistics view with completion metrics and batch actions.
 * - Published commands and API surface.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import type { PartApi } from '@flybyme/mesh-web';

import TodoApp, { type TodoInternal } from '../src/todo/index.js';

let site: Awaited<ReturnType<typeof bootTodo>> | undefined;

afterEach(() => {
    site?.dispose();
    site = undefined;
    cleanup();
    for (const el of document.querySelectorAll('.todo-container')) {
        el.remove();
    }
});

async function bootTodo(views?: readonly string[]) {
    const options = views
        ? {
              parts: [{ id: 'todo', contribution: TodoApp }],
              open: [{ application: 'todo', views }],
          }
        : {
              parts: [{ id: 'todo', contribution: TodoApp }],
          };

    const s = await mountPart(options);
    await s.ready;
    await new Promise((r) => setTimeout(r, 30));
    return s;
}

function getTodoInternal(s: NonNullable<typeof site>): TodoInternal {
    const process = s.kernel.processes.find((p) => p.applicationId === 'todo');
    if (!process || !process.internal) {
        throw new Error('Todo process or internal not found');
    }
    return process.internal as TodoInternal;
}

describe('TodoApp browser integration', () => {
    it('boots into a window and renders empty todo list', async () => {
        site = await bootTodo();

        // 1. Single window opened with view 'todos'
        const windows = site.manager.windows();
        expect(windows).toHaveLength(1);
        expect(windows[0]?.view).toBe('todos');

        // 2. Input and button are present
        const input = document.querySelector<HTMLInputElement>('.todo-input');
        expect(input).not.toBeNull();
        expect(input?.placeholder).toBe('What needs to be done?');

        const addBtn = document.querySelector<HTMLButtonElement>('.todo-btn-add');
        expect(addBtn).not.toBeNull();
        expect(addBtn?.textContent?.trim()).toBe('Add');

        // 3. Empty state message
        const empty = document.querySelector('.todo-empty');
        expect(empty).not.toBeNull();
        expect(empty?.textContent).toContain('No tasks yet');

        // 4. Counter
        const count = document.querySelector('.todo-count');
        expect(count?.textContent).toContain('0 items left');
    });

    it('adds tasks to the list', async () => {
        site = await bootTodo();
        const internal = getTodoInternal(site);

        // Add task via internal / input
        internal.setDraft('Buy groceries');
        internal.add();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.items().length).toBe(1);
        expect(internal.items()[0]?.title).toBe('Buy groceries');
        expect(internal.items()[0]?.done).toBe(false);

        // Verify DOM updated
        const items = document.querySelectorAll('.todo-item');
        expect(items.length).toBe(1);
        expect(items[0]?.querySelector('.todo-title')?.textContent).toBe('Buy groceries');

        const count = document.querySelector('.todo-count');
        expect(count?.textContent).toContain('1 item left');

        // Add second task
        internal.add('Walk the dog');
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.items().length).toBe(2);
        expect(document.querySelectorAll('.todo-item').length).toBe(2);
        expect(count?.textContent).toContain('2 items left');
    });

    it('toggles task completion status', async () => {
        site = await bootTodo();
        const internal = getTodoInternal(site);

        internal.add('Finish quarterly report');
        await new Promise((r) => setTimeout(r, 20));

        const todoItem = internal.items()[0];
        expect(todoItem).toBeDefined();

        // Find checkbox button in DOM and click
        const checkbox = document.querySelector<HTMLButtonElement>('.todo-checkbox');
        expect(checkbox).not.toBeNull();
        checkbox?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.items()[0]?.done).toBe(true);
        expect(document.querySelector('.todo-item')?.classList.contains('done')).toBe(true);
        expect(document.querySelector('.todo-count')?.textContent).toContain('0 items left');

        // Click again to unmark
        checkbox?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.items()[0]?.done).toBe(false);
        expect(document.querySelector('.todo-item')?.classList.contains('done')).toBe(false);
        expect(document.querySelector('.todo-count')?.textContent).toContain('1 item left');
    });

    it('filters tasks by active and completed states', async () => {
        site = await bootTodo();
        const internal = getTodoInternal(site);

        internal.add('Task 1 (active)');
        internal.add('Task 2 (done)');
        const id2 = internal.items()[1]?.id ?? '';
        internal.toggle(id2);
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.items().length).toBe(2);
        expect(internal.activeCount()).toBe(1);
        expect(internal.completedCount()).toBe(1);

        // Find filter buttons
        const filterBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('.todo-filter-btn'));
        const activeFilter = filterBtns.find((b) => b.textContent?.includes('Active'));
        const completedFilter = filterBtns.find((b) => b.textContent?.includes('Completed'));
        const allFilter = filterBtns.find((b) => b.textContent?.includes('All'));

        // Filter: Active
        activeFilter?.click();
        await new Promise((r) => setTimeout(r, 20));
        expect(internal.filter()).toBe('active');
        let renderedItems = document.querySelectorAll('.todo-item');
        expect(renderedItems.length).toBe(1);
        expect(renderedItems[0]?.textContent).toContain('Task 1 (active)');

        // Filter: Completed
        completedFilter?.click();
        await new Promise((r) => setTimeout(r, 20));
        expect(internal.filter()).toBe('completed');
        renderedItems = document.querySelectorAll('.todo-item');
        expect(renderedItems.length).toBe(1);
        expect(renderedItems[0]?.textContent).toContain('Task 2 (done)');

        // Filter: All
        allFilter?.click();
        await new Promise((r) => setTimeout(r, 20));
        expect(internal.filter()).toBe('all');
        renderedItems = document.querySelectorAll('.todo-item');
        expect(renderedItems.length).toBe(2);
    });

    it('deletes tasks and clears completed tasks', async () => {
        site = await bootTodo();
        const internal = getTodoInternal(site);

        internal.add('Task A');
        internal.add('Task B');
        await new Promise((r) => setTimeout(r, 20));
        expect(internal.items().length).toBe(2);

        // Delete first task via delete button
        const deleteBtn = document.querySelector<HTMLButtonElement>('.todo-btn-delete');
        expect(deleteBtn).not.toBeNull();
        deleteBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.items().length).toBe(1);
        expect(internal.items()[0]?.title).toBe('Task B');

        // Complete remaining task and clear completed
        internal.toggle(internal.items()[0]!.id);
        await new Promise((r) => setTimeout(r, 20));

        const clearBtn = document.querySelector<HTMLButtonElement>('.todo-btn-clear');
        expect(clearBtn).not.toBeNull();
        clearBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.items().length).toBe(0);
        expect(document.querySelector('.todo-empty')).not.toBeNull();
    });

    it('displays statistics and performs batch operations', async () => {
        site = await bootTodo();
        const internal = getTodoInternal(site);

        internal.add('Task 1');
        internal.add('Task 2');
        internal.add('Task 3');
        internal.toggle(internal.items()[0]!.id); // 1 done, 2 active
        await new Promise((r) => setTimeout(r, 20));

        // Switch to Stats tab
        const statsNavBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.todo-nav-btn')).find(
            (b) => b.textContent?.trim() === 'Stats',
        );
        statsNavBtn?.click();
        await new Promise((r) => setTimeout(r, 30));

        // Check Stats window
        const statsWindow = site.manager.windows().find((w) => w.view === 'stats');
        expect(statsWindow).toBeDefined();

        expect(internal.totalCount()).toBe(3);
        expect(internal.activeCount()).toBe(2);
        expect(internal.completedCount()).toBe(1);
        expect(internal.completionPercentage()).toBe(33);

        // Batch Action: Mark All Done
        const markAllDoneBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.todo-action-btn')).find(
            (b) => b.textContent?.includes('Mark All Done'),
        );
        markAllDoneBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.completedCount()).toBe(3);
        expect(internal.completionPercentage()).toBe(100);

        // Batch Action: Mark All Active
        const markAllActiveBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.todo-action-btn')).find(
            (b) => b.textContent?.includes('Mark All Active'),
        );
        markAllActiveBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.completedCount()).toBe(0);
        expect(internal.activeCount()).toBe(3);
        expect(internal.completionPercentage()).toBe(0);
    });

    it('exposes published commands via API', async () => {
        site = await bootTodo();
        const process = site.kernel.processes.find((p) => p.applicationId === 'todo');
        expect(process).toBeDefined();

        const api = process?.api as PartApi | undefined;
        expect(api).toBeDefined();
        expect(api?.commands).toBeDefined();

        const internal = getTodoInternal(site);

        // Add via API
        await api?.commands.add?.run({ title: 'Created via API' });
        expect(internal.items().length).toBe(1);
        expect(internal.items()[0]?.title).toBe('Created via API');

        const itemId = internal.items()[0]!.id;

        // Toggle via API
        await api?.commands.toggle?.run({ id: itemId });
        expect(internal.items()[0]?.done).toBe(true);

        // Filter via API
        await api?.commands.setFilter?.run({ filter: 'active' });
        expect(internal.filter()).toBe('active');
        expect(internal.filteredItems().length).toBe(0);

        // Remove via API
        await api?.commands.remove?.run({ id: itemId });
        expect(internal.items().length).toBe(0);
    });
});
