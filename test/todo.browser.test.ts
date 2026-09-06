import { describe, expect, it, afterEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import TodoApp, { TODO } from '../src/todo/index.js';

describe('TodoApp browser tests', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('boots, starts the Application, and provides the TodoApi', async () => {
        const site = await mountPart({
            parts: [{ id: 'todo', contribution: TodoApp }],
        });

        // Verify single framework instance
        site.assertSingleFramework();

        // Process is running
        const process = site.kernel.processes.find((p) => p.applicationId === 'todo');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        // TodoApi is provided
        const api = site.kernel.provided(TODO);
        expect(api).toBeDefined();
        expect(api?.items()).toEqual([]);
        expect(api?.totalCount()).toBe(0);
        expect(api?.outstandingCount()).toBe(0);

        site.dispose();
    });

    it('renders both views (list and stats) into the DOM with default state', async () => {
        const site = await mountPart({
            parts: [{ id: 'todo', contribution: TodoApp }],
        });

        // Two windows were opened
        expect(site.manager.windows().length).toBe(2);
        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('todos');
        expect(views).toContain('stats');

        // Main todos view elements
        const titleEl = document.querySelector('.todo-title');
        expect(titleEl).not.toBeNull();
        expect(titleEl?.textContent).toBe('Todos');

        const input = document.querySelector('.todo-input') as HTMLInputElement | null;
        expect(input).not.toBeNull();
        expect(input?.placeholder).toBe('What needs to be done?');

        const counter = document.querySelector('.todo-counter');
        expect(counter).not.toBeNull();
        expect(counter?.textContent).toBe('0 items left');

        // Stats view elements
        const statsHeading = document.querySelector('.stats-heading');
        expect(statsHeading).not.toBeNull();
        expect(statsHeading?.textContent).toBe('Todo Overview');

        const totalBadge = document.querySelector('.badge.total-count');
        expect(totalBadge?.textContent).toBe('0');

        site.dispose();
    });

    it('adding an item updates the DOM list, footer counter, and stats view', async () => {
        const site = await mountPart({
            parts: [{ id: 'todo', contribution: TodoApp }],
        });

        const input = document.querySelector('.todo-input') as HTMLInputElement;
        expect(input).not.toBeNull();

        const addBtn = document.querySelector('.btn-add') as HTMLButtonElement;
        expect(addBtn).not.toBeNull();

        // Type a todo item and click Add
        await userEvent.type(input, 'Buy groceries');
        await userEvent.click(addBtn);

        // Verify the list has 1 item in the DOM
        const items = document.querySelectorAll('.todo-item');
        expect(items.length).toBe(1);

        const itemLabel = document.querySelector('.todo-label');
        expect(itemLabel?.textContent).toBe('Buy groceries');

        const badge = document.querySelector('.todo-item .badge');
        expect(badge?.textContent).toBe('active');

        // Counter in list footer updated
        const counter = document.querySelector('.todo-counter');
        expect(counter?.textContent).toBe('1 item left');

        // Stats view updated
        const totalBadge = document.querySelector('.badge.total-count');
        expect(totalBadge?.textContent).toBe('1');
        const outstandingBadge = document.querySelector('.badge.outstanding-count');
        expect(outstandingBadge?.textContent).toBe('1');

        // Input field is cleared
        const newInput = document.querySelector('.todo-input') as HTMLInputElement;
        expect(newInput.value).toBe('');

        site.dispose();
    });

    it('can mark an item done and unmark it', async () => {
        const site = await mountPart({
            parts: [{ id: 'todo', contribution: TodoApp }],
        });

        const input = document.querySelector('.todo-input') as HTMLInputElement;
        const addBtn = document.querySelector('.btn-add') as HTMLButtonElement;

        await userEvent.type(input, 'Learn mesh-web');
        await userEvent.click(addBtn);

        const toggleBtn = document.querySelector('.btn-toggle') as HTMLButtonElement;
        expect(toggleBtn.textContent).toBe('☐');

        // Toggle to done
        await userEvent.click(toggleBtn);

        expect(toggleBtn.textContent).toBe('☑');
        const doneBadge = document.querySelector('.todo-item .badge.done');
        expect(doneBadge?.textContent).toBe('done');

        // Stats updated
        const outstandingBadge = document.querySelector('.badge.outstanding-count');
        expect(outstandingBadge?.textContent).toBe('0');
        const completedBadge = document.querySelector('.badge.completed-count');
        expect(completedBadge?.textContent).toBe('1');

        // Counter in footer
        const counter = document.querySelector('.todo-counter');
        expect(counter?.textContent).toBe('0 items left');

        // Toggle back to active
        await userEvent.click(toggleBtn);
        expect(toggleBtn.textContent).toBe('☐');
        const activeBadge = document.querySelector('.todo-item .badge.active');
        expect(activeBadge?.textContent).toBe('active');
        expect(outstandingBadge?.textContent).toBe('1');
        expect(completedBadge?.textContent).toBe('0');

        site.dispose();
    });

    it('can remove an item from the list', async () => {
        const site = await mountPart({
            parts: [{ id: 'todo', contribution: TodoApp }],
        });

        const input = document.querySelector('.todo-input') as HTMLInputElement;
        const addBtn = document.querySelector('.btn-add') as HTMLButtonElement;

        await userEvent.type(input, 'Task to delete');
        await userEvent.click(addBtn);
        expect(document.querySelectorAll('.todo-item').length).toBe(1);

        const removeBtn = document.querySelector('.btn-remove') as HTMLButtonElement;
        await userEvent.click(removeBtn);

        expect(document.querySelectorAll('.todo-item').length).toBe(0);
        const counter = document.querySelector('.todo-counter');
        expect(counter?.textContent).toBe('0 items left');

        const totalBadge = document.querySelector('.badge.total-count');
        expect(totalBadge?.textContent).toBe('0');

        site.dispose();
    });

    it('handles quick actions from stats view: mark all done and clear completed', async () => {
        const site = await mountPart({
            parts: [{ id: 'todo', contribution: TodoApp }],
        });

        const input = document.querySelector('.todo-input') as HTMLInputElement;
        const addBtn = document.querySelector('.btn-add') as HTMLButtonElement;

        await userEvent.type(input, 'First item');
        await userEvent.click(addBtn);

        await userEvent.type(document.querySelector('.todo-input') as HTMLInputElement, 'Second item');
        await userEvent.click(document.querySelector('.btn-add') as HTMLButtonElement);

        expect(document.querySelectorAll('.todo-item').length).toBe(2);

        // Focus the stats window so it is brought to front in windowed mode
        const statsWindow = site.manager.windows().find((w) => w.view === 'stats');
        if (statsWindow) site.manager.focus(statsWindow.id);

        // Mark all done from stats view
        const markAllBtn = document.querySelector('.btn-mark-all-done') as HTMLButtonElement;
        await userEvent.click(markAllBtn);

        const outstandingBadge = document.querySelector('.badge.outstanding-count');
        expect(outstandingBadge?.textContent).toBe('0');
        const completedBadge = document.querySelector('.badge.completed-count');
        expect(completedBadge?.textContent).toBe('2');

        // Clear completed from stats view
        const clearBtn = document.querySelector('.btn-clear-completed') as HTMLButtonElement;
        await userEvent.click(clearBtn);

        expect(document.querySelectorAll('.todo-item').length).toBe(0);
        const totalBadge = document.querySelector('.badge.total-count');
        expect(totalBadge?.textContent).toBe('0');

        site.dispose();
    });

    it('declares commands, keys, and layout in its manifest before starting', () => {
        const app = new TodoApp();
        expect(app.needs).toEqual(['state', 'commands', 'windows', 'log']);
        expect(app.commands.map((c) => c.id)).toContain('todo.add');
        expect(app.commands.map((c) => c.id)).toContain('todo.toggle');
        expect(app.commands.map((c) => c.id)).toContain('todo.remove');
        expect(app.keys.map((k) => k.command)).toContain('todo.add');
        expect(app.layout).toBeDefined();
        expect(app.views.map((v) => v.id)).toEqual(['todos', 'stats']);
    });
});
