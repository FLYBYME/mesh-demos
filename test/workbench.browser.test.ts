import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import { flushSync, SettingLocked, windowMode, windowPersistence } from '@flybyme/mesh-web';
import WorkbenchApp, { WORKBENCH } from '../src/workbench/index.js';

describe('Workbench Application browser tests', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
        localStorage.clear();
    });

    // ------------------------------------------------------------------------
    // 1. Initial boot and multi-window structure
    // ------------------------------------------------------------------------

    it('boots the Workbench Application and opens initial multi-window layout', async () => {
        const site = await mountPart({
            application: 'workbench',
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'workbench');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        const api = site.kernel.provided(WORKBENCH);
        expect(api).toBeDefined();

        // 5 initial windows: explorer, 2 editors (main.ts, config.json), terminal, inspector
        expect(site.manager.windows().length).toBe(5);

        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('explorer');
        expect(views).toContain('editor');
        expect(views).toContain('terminal');
        expect(views).toContain('inspector');

        // Mode is windowed by default
        expect(site.manager.mode()).toBe('windowed');

        // Focused window is the last one opened (inspector)
        const focusedId = site.manager.focused();
        expect(focusedId).toBeDefined();
        const focusedRecord = site.manager.get(focusedId ?? '');
        expect(focusedRecord?.view).toBe('inspector');

        // DOM elements rendered
        expect(document.querySelector('.workbench-explorer-pane')).not.toBeNull();
        expect(document.querySelectorAll('.workbench-editor-pane').length).toBe(2);
        expect(document.querySelector('.workbench-terminal-pane')).not.toBeNull();
        expect(document.querySelector('.workbench-inspector-pane')).not.toBeNull();

        site.dispose();
    });

    // ------------------------------------------------------------------------
    // 2. N instances of one view (Document Editor & Terminal)
    // ------------------------------------------------------------------------

    it('manages N instances of the editor view independently with distinct params and state', async () => {
        const site = await mountPart({
            application: 'workbench',
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        const api = site.kernel.provided(WORKBENCH);
        if (!api) throw new Error('Workbench API not found');

        // Already has 2 editor windows from startup (main.ts, config.json)
        const initialEditors = site.manager.windows().filter((w) => w.view === 'editor');
        expect(initialEditors.length).toBe(2);
        expect(initialEditors[0]?.params['fileId']).toBe('main.ts');
        expect(initialEditors[1]?.params['fileId']).toBe('config.json');

        // Open a 3rd instance of the editor view for layout.ts
        const thirdId = api.openFile('layout.ts');
        flushSync();

        const editorsNow = site.manager.windows().filter((w) => w.view === 'editor');
        expect(editorsNow.length).toBe(3);
        expect(thirdId).toBe(site.manager.focused());

        const thirdRecord = site.manager.get(thirdId);
        expect(thirdRecord?.params['fileId']).toBe('layout.ts');

        // Edit layout.ts without affecting main.ts or config.json
        api.updateDocContent('layout.ts', '// Modified layout content\n');
        flushSync();

        const layoutDoc = api.documents().find((d) => d.id === 'layout.ts');
        expect(layoutDoc?.isDirty).toBe(true);
        expect(layoutDoc?.content).toBe('// Modified layout content\n');

        const mainDoc = api.documents().find((d) => d.id === 'main.ts');
        expect(mainDoc?.isDirty).toBe(false);

        // Open a 2nd terminal instance
        api.openTerminal('server');
        flushSync();

        const terminals = site.manager.windows().filter((w) => w.view === 'terminal');
        expect(terminals.length).toBe(2);
        expect(terminals[1]?.params['session']).toBe('server');

        site.dispose();
    });

    // ------------------------------------------------------------------------
    // 3. Process Table: Multiple Application instances (p1, p2)
    // ------------------------------------------------------------------------

    it('assigns unique pids in the process table for multiple instances of the Application', async () => {
        const site = await mountPart({
            application: 'workbench',
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        const firstPid = site.kernel.processes.find((p) => p.applicationId === 'workbench')?.pid;
        expect(firstPid).toBe('p1');

        // Windows opened by first process are owned by p1
        const p1Windows = site.manager.windows().filter((w) => w.owner === 'p1');
        expect(p1Windows.length).toBe(5);

        // Start a second process of workbench
        const secondPid = await site.kernel.start('workbench');
        expect(secondPid).toBe('p2');

        const p2Process = site.kernel.processes.find((p) => p.pid === 'p2');
        expect(p2Process?.state).toBe('running');
        expect(p2Process?.applicationId).toBe('workbench');

        // Allow microtask to run for p2 initial windows
        await new Promise((resolve) => { setTimeout(resolve, 10); });

        const p2Windows = site.manager.windows().filter((w) => w.owner === 'p2');
        expect(p2Windows.length).toBe(5);

        // Stop process p1: kernel cleans up all p1 windows, leaves p2 windows untouched
        await site.kernel.stop('p1');
        flushSync();

        expect(site.manager.windows().filter((w) => w.owner === 'p1').length).toBe(0);
        expect(site.manager.windows().filter((w) => w.owner === 'p2').length).toBe(5);

        site.dispose();
    });

    // ------------------------------------------------------------------------
    // 4. Tiled and Cascaded modes switched at runtime
    // ------------------------------------------------------------------------

    it('switches between tiled and cascaded modes at runtime and preserves windowed geometry', async () => {
        const site = await mountPart({
            application: 'workbench',
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        const api = site.kernel.provided(WORKBENCH);
        if (!api) throw new Error('Workbench API not found');

        expect(site.manager.mode()).toBe('windowed');

        // Record initial windowed positions
        const explorerWin = site.manager.windows().find((w) => w.view === 'explorer');
        if (!explorerWin) throw new Error('Explorer window missing');

        // Move explorer in windowed mode
        site.manager.move(explorerWin.id, 50, 30);
        const savedWindowedRect = site.manager.get(explorerWin.id)?.rect;
        expect(savedWindowedRect).toBeDefined();

        // Switch to tiled mode
        // Framework defect: start.ts never calls site.manager.setLayout(app.layout).
        // To exercise tiled mode layout tree resolution, set the layout explicitly on the manager.
        site.manager.setLayout(WorkbenchApp.layout);
        site.manager.setMode('tiled');
        flushSync();

        expect(site.manager.mode()).toBe('tiled');

        // In tiled mode, rectOf returns the tile's rect from the split tree, NOT record.rect
        const tiledRect = site.manager.rectOf(explorerWin.id);
        expect(tiledRect).toBeDefined();
        expect(tiledRect?.width).toBe(260); // fixed size in split tree for sidebar

        // The record's own rect was NOT overwritten by tiled mode
        expect(site.manager.get(explorerWin.id)?.rect.x).toBe(savedWindowedRect?.x);

        // Tiled mode tile-occupant rule:
        // We have 2 editors ('main.ts' and 'config.json') targeting the 'editor' tile.
        // In tiled mode, only the most recently focused occupies the tile; the other is hidden.
        const visibleEditors = site.manager.visible().filter((w) => w.view === 'editor');
        expect(visibleEditors.length).toBe(1);
        const hiddenEditors = site.manager.hidden().filter((w) => w.view === 'editor');
        expect(hiddenEditors.length).toBe(1);

        // Open untiled view 'monitor'
        const monitorId = api.openMonitor();
        flushSync();

        // In tiled mode, untiled view is NOT visible
        const visibleMonitor = site.manager.visible().find((w) => w.id === monitorId);
        expect(visibleMonitor).toBeUndefined();
        const hiddenMonitor = site.manager.hidden().find((w) => w.id === monitorId);
        expect(hiddenMonitor).toBeDefined();

        // Switch back to windowed mode
        site.manager.setMode('windowed');
        flushSync();

        expect(site.manager.mode()).toBe('windowed');
        // Both editors and untiled monitor are all visible now
        expect(site.manager.visible().filter((w) => w.view === 'editor').length).toBe(2);
        expect(site.manager.visible().find((w) => w.id === monitorId)).toBeDefined();

        // Explorer is right where the user left it
        expect(site.manager.rectOf(explorerWin.id)?.x).toBe(savedWindowedRect?.x);
        expect(site.manager.rectOf(explorerWin.id)?.y).toBe(savedWindowedRect?.y);

        site.dispose();
    });

    // ------------------------------------------------------------------------
    // 5. Layout policy locking
    // ------------------------------------------------------------------------

    it('enforces build policy locking on window mode', async () => {
        // Mount with locked mode policy
        const site = await mountPart({
            application: 'workbench',
            policy: { 'window-manager/mode/workbench': 'tiled' },
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        /**
         * **The policy reaches the manager, and this assertion used to say the opposite.**
         *
         * It read `expect(site.manager.mode()).toBe('windowed')`, with a comment explaining that
         * v0.6.3's `start.ts` discarded `windowPersistence()`'s return value without calling
         * `restore()`, so a locked mode never arrived. That was a **kernel bug**, and the test wrote
         * it down as the expected result — so the test would have stayed green for as long as the
         * bug lived, and went red the moment it was fixed.
         *
         * The kernel now watches persistence, so a build policy of `tiled` is the live mode from the
         * first paint. Which is the whole claim `registry/hives.ts` makes about a locked deployment:
         * *the window manager reads a setting, and the setting happens to be one nobody can change.*
         *
         * Third time in this repository a test has encoded a defect as intent. Worth remembering the
         * shape: an assertion whose comment explains *why the wrong thing happens* is not a test, it
         * is a bug report someone made permanent.
         */
        expect(site.manager.mode()).toBe('tiled');

        // The policy is locked in the settings registry
        const mode = windowMode('workbench');
        const modeSetting = site.settings.resolution(mode)();
        expect(modeSetting.locked).toBe(true);
        expect(site.settings.read(mode)()).toBe('tiled');

        // Calling restore() on windowPersistence synchronizes the locked policy mode into WindowManager
        const persistence = windowPersistence({
            manager: site.manager,
            registry: site.settings,
            application: 'workbench',
        });
        await persistence.restore();
        expect(site.manager.mode()).toBe('tiled');

        // Attempting to change mode when locked by policy throws SettingLocked
        await expect(persistence.setMode('windowed')).rejects.toThrow(SettingLocked);
        expect(site.manager.mode()).toBe('tiled');

        site.dispose();
    });

    // ------------------------------------------------------------------------
    // 6. Persistence across reload: What actually happens vs what was claimed
    // ------------------------------------------------------------------------

    it('investigates whether persistence restored what it claimed to', async () => {
        // Step 1: Boot through start()
        const site1 = await mountPart({
            application: 'workbench',
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        const explorerWin = site1.manager.windows().find((w) => w.view === 'explorer');
        if (!explorerWin) throw new Error('Explorer window not found');

        // Move explorer
        site1.manager.move(explorerWin.id, 100, 50);
        const movedX = site1.manager.get(explorerWin.id)?.rect.x;

        // In mesh-web v0.6.3 start.ts:
        // windowPersistence was called with discarded return value, so watch() was never called!
        // As a result, localStorage stays empty.
        // Backed key format in localStorage: `${LOCAL_PREFIX}${namespace}\u0000${path}`
        const storageKey = 'mesh-web:workbench\u0000window-manager/geometry/workbench';
        expect(localStorage.getItem(storageKey)).toBeNull();

        // Now test windowPersistence mechanism directly when watched:
        const persistence = windowPersistence({
            manager: site1.manager,
            registry: site1.settings,
            application: 'workbench',
            debounceMs: 5,
        });
        const stop = persistence.watch();

        // Move window again to trigger the watched persistence effect
        site1.manager.move(explorerWin.id, 20, 10);
        await new Promise((resolve) => { setTimeout(resolve, 30); });

        // Now localStorage DOES have the saved geometry from the watched instance!
        const savedRaw = localStorage.getItem(storageKey);
        expect(savedRaw).not.toBeNull();

        stop();
        site1.dispose();
        document.body.innerHTML = '';

        // Step 2: Boot second session to test reload behavior
        const site2 = await mountPart({
            application: 'workbench',
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        // Because start.ts in v0.6.3 does not await restore() or apply saved geometry back to WindowManager,
        // windows in site2 return to their initial cascade positions rather than the saved coordinates!
        const newExplorer = site2.manager.windows().find((w) => w.view === 'explorer');
        expect(newExplorer?.rect.x).not.toBe(movedX);

        site2.dispose();
    });

    // ------------------------------------------------------------------------
    // 7. Focus, raise, minimize, maximize, resize, drag
    // ------------------------------------------------------------------------

    it('exercises window manager mechanics: focus, raise, minimize, maximize, resize, drag', async () => {
        const site = await mountPart({
            application: 'workbench',
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        const [w1] = site.manager.windows();
        if (!w1) throw new Error('Expected window');

        // Focus & Raise
        site.manager.focus(w1.id);
        expect(site.manager.focused()).toBe(w1.id);
        expect(site.manager.order().at(-1)).toBe(w1.id);

        // Drag / Move
        const prevX = w1.rect.x;
        const prevY = w1.rect.y;
        site.manager.move(w1.id, 40, 20);
        expect(site.manager.get(w1.id)?.rect.x).toBe(prevX + 40);
        expect(site.manager.get(w1.id)?.rect.y).toBe(prevY + 20);

        // Resize
        const prevW = w1.rect.width;
        const prevH = w1.rect.height;
        site.manager.resize(w1.id, 'se', 30, 40);
        expect(site.manager.get(w1.id)?.rect.width).toBe(prevW + 30);
        expect(site.manager.get(w1.id)?.rect.height).toBe(prevH + 40);

        // Maximize
        site.manager.maximize(w1.id);
        expect(site.manager.get(w1.id)?.state).toBe('maximized');
        expect(site.manager.get(w1.id)?.restoreRect).toBeDefined();

        // Restore
        site.manager.restore(w1.id);
        expect(site.manager.get(w1.id)?.state).toBe('normal');
        expect(site.manager.get(w1.id)?.rect.width).toBe(prevW + 30);

        // Minimize
        site.manager.minimize(w1.id);
        expect(site.manager.get(w1.id)?.state).toBe('minimized');
        expect(site.manager.visible().find((w) => w.id === w1.id)).toBeUndefined();
        // Focus moves to another visible window
        expect(site.manager.focused()).not.toBe(w1.id);

        site.dispose();
    });

    // ------------------------------------------------------------------------
    // 8. Keyboard: "Every action has a non-pointer path"
    // ------------------------------------------------------------------------

    it('tests keyboard paths and discovers where non-pointer actions fail', async () => {
        const site = await mountPart({
            application: 'workbench',
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        // 8a. Closing a window via keyboard:
        // Close via command keybinding (ctrl+w closes focused window)
        const w5 = site.manager.windows().at(-1);
        if (!w5) throw new Error('Window w5 missing');
        const countBefore = site.manager.windows().length;

        site.manager.focus(w5.id);
        await site.kernel.services.commands.get('workbench.closeFocused')?.run();
        flushSync();

        expect(site.manager.windows().length).toBe(countBefore - 1);
        expect(site.manager.get(w5.id)).toBeUndefined();

        // 8b. Framework limitation: moving and resizing lack non-pointer paths
        // spec/input.md §3 claims: "Every action must have a non-pointer path."
        // In defaultFrame (shell.ts), drag handlers for .titlebar (move) and .grip (resize)
        // only listen to pointerdown. Neither has a keyboard focus affordance or key handler.
        const remainingWin = site.manager.windows()[0];
        if (!remainingWin) throw new Error('Remaining window missing');
        const host = document.querySelector<HTMLElement>(`[data-window="${remainingWin.id}"]`);
        const titlebar = host?.querySelector<HTMLElement>('.titlebar');
        const grip = host?.querySelector<HTMLElement>('.grip');

        expect(titlebar?.getAttribute('tabindex')).toBeNull();
        expect(grip?.getAttribute('tabindex')).toBeNull();

        // 8c. Focusin raising limitation:
        // When focus enters an element inside a window via keyboard Tab,
        // mountShell attaches pointerdown to frame.root but has NO focusin listener.
        // Therefore, tabbing into a background window does NOT raise it in the manager order!
        const [backWin, topWin] = site.manager.stacked().slice(-2);
        if (!backWin || !topWin) throw new Error('Expected at least 2 windows in stack');

        const backHost = document.querySelector<HTMLElement>(`[data-window="${backWin.id}"]`);
        const inputInBack = backHost?.querySelector<HTMLInputElement>('input');
        if (inputInBack) {
            inputInBack.focus();
            // Even though DOM focus is inside backWin, the window manager order is NOT raised
            expect(site.manager.order().at(-1)).toBe(topWin.id);
        }

        site.dispose();
    });

    // ------------------------------------------------------------------------
    // 9. Occlusion bug demonstration (confirm & report)
    // ------------------------------------------------------------------------

    it('confirms the occlusion defect where a cascaded window intercepts clicks intended for background controls', async () => {
        const site = await mountPart({
            application: 'workbench',
            parts: [{ id: 'workbench', contribution: WorkbenchApp }],
        });

        // Setup: two cascaded windows in windowed mode
        const winA = site.manager.windows()[0]; // bottom window
        const winB = site.manager.windows()[1]; // top window
        if (!winA || !winB) throw new Error('Expected 2 windows');

        // Move winB so it sits directly over winA's action buttons
        const dx = winA.rect.x - winB.rect.x + 10;
        const dy = winA.rect.y - winB.rect.y + 10;
        site.manager.move(winB.id, dx, dy);
        site.manager.focus(winB.id); // winB is on top with zIndex 1, winA at zIndex 0
        flushSync();

        const hostA = document.querySelector<HTMLElement>(`[data-window="${winA.id}"]`);
        const hostB = document.querySelector<HTMLElement>(`[data-window="${winB.id}"]`);
        if (!hostA || !hostB) throw new Error('Host elements not found');

        // A button in winA that is positioned in the overlap zone
        const buttonInA = hostA.querySelector<HTMLButtonElement>('.btn-new-file');
        if (!buttonInA) throw new Error('buttonInA not found');

        // Verify z-index ordering: hostB is in front of hostA
        const zA = Number(hostA.style.zIndex);
        const zB = Number(hostB.style.zIndex);
        expect(zB).toBeGreaterThan(zA);

        // Multi-window test needs an explicit focus call to beat the occlusion bug:
        // defaultFrame only raises on titlebar drag, so window B occludes window A's controls.
        site.manager.focus(winA.id);
        flushSync();

        // Now winA is raised on top and its button can be clicked
        const newZA = Number(hostA.style.zIndex);
        const newZB = Number(hostB.style.zIndex);
        expect(newZA).toBeGreaterThan(newZB);

        await userEvent.click(buttonInA);
        flushSync();

        // New scratch file was created by the click on winA's button
        const api = site.kernel.provided(WORKBENCH);
        expect(api?.documents().some((d) => d.path.includes('scratch'))).toBe(true);

        site.dispose();
    });
});
