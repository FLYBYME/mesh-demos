import {
    tiles,
    type Application,
    type ChromeWindow,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type LayoutNode,
    type Node,
    type ViewContext,
    type ViewDecl,
    type WindowMode,
} from '@flybyme/mesh-web';
import {
    NEEDS,
    WORKBENCH,
    type TerminalSession,
    type WorkbenchApi,
    type WorkbenchDocument,
} from './contract.js';
import { countLines, countWords, detectLanguage, timestampStr } from './helpers.js';
import { renderEditorView } from './views/editor.js';
import { renderExplorerView } from './views/explorer.js';
import { renderInspectorView } from './views/inspector.js';
import { renderMonitorView } from './views/monitor.js';
import { renderTerminalView } from './views/terminal.js';

export {
    WORKBENCH,
    type TerminalSession,
    type WorkbenchApi,
    type WorkbenchDocument,
};

// ---------------------------------------------------------------------------- application

export const WORKBENCH_LAYOUT: LayoutNode = tiles({
    split: 'row',
    children: [
        { node: { tile: 'sidebar' }, size: { px: 260 } },
        {
            node: {
                split: 'column',
                children: [
                    { node: { tile: 'editor' }, size: 3 },
                    { node: { tile: 'terminal' }, size: 2 },
                ],
            },
            size: 4,
        },
        { node: { tile: 'inspector' }, size: { px: 280 } },
    ],
});

export default class WorkbenchApp implements Application<typeof NEEDS, readonly [], typeof WORKBENCH> {
    static readonly layout = WORKBENCH_LAYOUT;

    readonly needs = NEEDS;
    readonly provides = WORKBENCH;

    readonly layout = WORKBENCH_LAYOUT;

    readonly commands: readonly CommandDecl[] = [
        { id: 'workbench.toggleMode', title: 'Workbench: Toggle Tiled/Windowed Mode' },
        { id: 'workbench.setMode', title: 'Workbench: Set Window Mode' },
        { id: 'workbench.openFile', title: 'Workbench: Open Document in Editor' },
        { id: 'workbench.openTerminal', title: 'Workbench: Open Terminal Window' },
        { id: 'workbench.openExplorer', title: 'Workbench: Open Explorer Window' },
        { id: 'workbench.openInspector', title: 'Workbench: Open Inspector Window' },
        { id: 'workbench.openMonitor', title: 'Workbench: Open System Monitor Window' },
        { id: 'workbench.closeWindow', title: 'Workbench: Close Window by ID' },
        { id: 'workbench.closeFocused', title: 'Workbench: Close Focused Window' },
        { id: 'workbench.focusWindow', title: 'Workbench: Focus Window by ID' },
        { id: 'workbench.nextWindow', title: 'Workbench: Focus Next Window' },
        { id: 'workbench.prevWindow', title: 'Workbench: Focus Previous Window' },
        { id: 'workbench.maximizeWindow', title: 'Workbench: Maximize Window' },
        { id: 'workbench.minimizeWindow', title: 'Workbench: Minimize Window' },
        { id: 'workbench.restoreWindow', title: 'Workbench: Restore Window' },
        { id: 'workbench.cascadeWindows', title: 'Workbench: Cascade All Windows' },
        { id: 'workbench.saveDoc', title: 'Workbench: Save Document' },
        { id: 'workbench.revertDoc', title: 'Workbench: Revert Document' },
        { id: 'workbench.updateDocContent', title: 'Workbench: Update Document Content' },
        { id: 'workbench.newSampleFile', title: 'Workbench: Create Sample File' },
        { id: 'workbench.runTerminalCmd', title: 'Workbench: Run Terminal Command' },
        { id: 'workbench.submitTerminalInput', title: 'Workbench: Submit Terminal Input' },
        { id: 'workbench.clearTerminal', title: 'Workbench: Clear Terminal Buffer' },
        { id: 'workbench.setFilter', title: 'Workbench: Set File Filter' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'workbench.toggleMode', keys: 'ctrl+m' },
        { command: 'workbench.closeFocused', keys: 'ctrl+w' },
        { command: 'workbench.nextWindow', keys: 'ctrl+]' },
        { command: 'workbench.prevWindow', keys: 'ctrl+[' },
        { command: 'workbench.saveDoc', keys: 'ctrl+s' },
    ];

    readonly views: readonly ViewDecl<Record<string, Json>, WorkbenchApi>[] = [
        {
            id: 'explorer',
            title: 'Explorer',
            tile: 'sidebar',
            instances: 'one',
            defaultSize: { width: 280, height: 600 },
            minSize: { width: 200, height: 300 },
            render(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
                return renderExplorerView(vx);
            },
        },
        {
            id: 'editor',
            title: 'Document Editor',
            tile: 'editor',
            instances: 'many',
            defaultSize: { width: 500, height: 420 },
            minSize: { width: 300, height: 240 },
            render(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
                return renderEditorView(vx);
            },
        },
        {
            id: 'terminal',
            title: 'Terminal',
            tile: 'terminal',
            instances: 'many',
            defaultSize: { width: 500, height: 280 },
            minSize: { width: 300, height: 180 },
            render(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
                return renderTerminalView(vx);
            },
        },
        {
            id: 'inspector',
            title: 'Window Inspector',
            tile: 'inspector',
            instances: 'one',
            defaultSize: { width: 320, height: 540 },
            minSize: { width: 240, height: 300 },
            render(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
                return renderInspectorView(vx);
            },
        },
        {
            id: 'monitor',
            title: 'System Monitor',
            instances: 'one',
            defaultSize: { width: 340, height: 320 },
            minSize: { width: 240, height: 200 },
            render(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
                return renderMonitorView(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<WorkbenchApi> {
        cx.log.info('WorkbenchApp starting');

        const initialDocs: readonly WorkbenchDocument[] = [
            {
                id: 'main.ts',
                path: 'src/main.ts',
                title: 'main.ts',
                language: 'TypeScript',
                content: '// Entry point\nimport { start } from "./kernel.js";\nconsole.log("Kernel booted.");\n',
                savedContent: '// Entry point\nimport { start } from "./kernel.js";\nconsole.log("Kernel booted.");\n',
                isDirty: false,
                lineCount: 4,
                wordCount: 11,
            },
            {
                id: 'config.json',
                path: 'config/config.json',
                title: 'config.json',
                language: 'JSON',
                content: '{\n  "mode": "windowed",\n  "version": "0.1.0",\n  "persisted": true\n}\n',
                savedContent: '{\n  "mode": "windowed",\n  "version": "0.1.0",\n  "persisted": true\n}\n',
                isDirty: false,
                lineCount: 5,
                wordCount: 6,
            },
            {
                id: 'layout.ts',
                path: 'src/layout.ts',
                title: 'layout.ts',
                language: 'TypeScript',
                content: '// Layout definitions\nexport const layout = { split: "row" };\n',
                savedContent: '// Layout definitions\nexport const layout = { split: "row" };\n',
                isDirty: false,
                lineCount: 3,
                wordCount: 8,
            },
            {
                id: 'style.css',
                path: 'src/style.css',
                title: 'style.css',
                language: 'CSS',
                content: ':root {\n  --workbench-bg: #0d1117;\n  --accent: #58a6ff;\n}\n',
                savedContent: ':root {\n  --workbench-bg: #0d1117;\n  --accent: #58a6ff;\n}\n',
                isDirty: false,
                lineCount: 5,
                wordCount: 7,
            },
            {
                id: 'README.md',
                path: 'README.md',
                title: 'README.md',
                language: 'Markdown',
                content: '# Workbench\nMulti-window workbench testing window manager stress patterns.\n',
                savedContent: '# Workbench\nMulti-window workbench testing window manager stress patterns.\n',
                isDirty: false,
                lineCount: 3,
                wordCount: 8,
            },
        ];

        const initialTerminals: readonly TerminalSession[] = [
            {
                session: 'build',
                name: 'build',
                lines: [
                    `[${timestampStr()}] [workbench] dev environment initialized`,
                    `[${timestampStr()}] [build] watching workspace files`,
                    `[${timestampStr()}] [build] typescript compile: 0 errors`,
                ],
                status: 'idle',
                commandHistory: ['build'],
            },
        ];

        const documents = cx.state.signal<readonly WorkbenchDocument[]>(initialDocs);
        const terminals = cx.state.signal<readonly TerminalSession[]>(initialTerminals);
        const activeFileId = cx.state.signal<string>('main.ts');
        const activeTerminalSession = cx.state.signal<string>('build');
        const eventLogs = cx.state.signal<readonly string[]>([
            `[${timestampStr()}] Workbench initialized (pid: ${cx.id})`,
        ]);
        const searchFilter = cx.state.signal<string>('');
        const filterRevision = cx.state.signal<number>(0);
        const docRevision = cx.state.signal<number>(0);

        const logEvent = (msg: string): void => {
            const entry = `[${timestampStr()}] ${msg}`;
            eventLogs.set([entry, ...eventLogs().slice(0, 49)]);
        };

        let fileCounter = 0;
        let terminalCounter = 1;

        const openFile = (fileId: string): string => {
            activeFileId.set(fileId);
            const handle = cx.windows.open({
                view: 'editor',
                params: { fileId },
            });
            handle.focus();
            logEvent(`Opened editor for "${fileId}" (${handle.id})`);
            return handle.id;
        };

        const openTerminal = (sessionName?: string): string => {
            const session = sessionName ?? `term-${String(++terminalCounter)}`;
            activeTerminalSession.set(session);

            const existing = terminals().find((t) => t.session === session);
            if (!existing) {
                const newTerm: TerminalSession = {
                    session,
                    name: session,
                    lines: [`[${timestampStr()}] session "${session}" started`],
                    status: 'idle',
                    commandHistory: [],
                };
                terminals.set([...terminals(), newTerm]);
            }

            const handle = cx.windows.open({
                view: 'terminal',
                params: { session },
            });
            handle.focus();
            logEvent(`Opened terminal session "${session}" (${handle.id})`);
            return handle.id;
        };

        const openExplorer = (): string => {
            const handle = cx.windows.open({ view: 'explorer' });
            handle.focus();
            logEvent(`Opened Explorer (${handle.id})`);
            return handle.id;
        };

        const openInspector = (): string => {
            const handle = cx.windows.open({ view: 'inspector' });
            handle.focus();
            logEvent(`Opened Inspector (${handle.id})`);
            return handle.id;
        };

        const openMonitor = (): string => {
            const handle = cx.windows.open({ view: 'monitor' });
            handle.focus();
            logEvent(`Opened System Monitor (${handle.id})`);
            return handle.id;
        };

        const createFile = (path: string, content = ''): string => {
            const title = path.split('/').pop() ?? path;
            const id = title;
            const newDoc: WorkbenchDocument = {
                id,
                path,
                title,
                language: detectLanguage(path),
                content,
                savedContent: content,
                isDirty: false,
                lineCount: countLines(content),
                wordCount: countWords(content),
            };
            documents.set([...documents(), newDoc]);
            logEvent(`Created file "${path}"`);
            return openFile(id);
        };

        const saveDoc = (fileId: string): void => {
            documents.set(
                documents().map((d) => {
                    if (d.id !== fileId) return d;
                    return {
                        ...d,
                        savedContent: d.content,
                        isDirty: false,
                    };
                }),
            );
            logEvent(`Saved document "${fileId}"`);
            docRevision.set(docRevision() + 1);
        };

        const revertDoc = (fileId: string): void => {
            documents.set(
                documents().map((d) => {
                    if (d.id !== fileId) return d;
                    return {
                        ...d,
                        content: d.savedContent,
                        isDirty: false,
                        lineCount: countLines(d.savedContent),
                        wordCount: countWords(d.savedContent),
                    };
                }),
            );
            logEvent(`Reverted document "${fileId}"`);
            docRevision.set(docRevision() + 1);
        };

        const updateDocContent = (fileId: string, content: string): void => {
            documents.set(
                documents().map((d) => {
                    if (d.id !== fileId) return d;
                    return {
                        ...d,
                        content,
                        isDirty: content !== d.savedContent,
                        lineCount: countLines(content),
                        wordCount: countWords(content),
                    };
                }),
            );
            docRevision.set(docRevision() + 1);
        };

        const runTerminalCommand = (session: string, cmd: string): void => {
            const timestamp = timestampStr();
            terminals.set(
                terminals().map((t) => {
                    if (t.session !== session) return t;

                    const lines = [...t.lines, `$ ${cmd}`];
                    if (cmd === 'build') {
                        lines.push(`[${timestamp}] compile src/...`);
                        lines.push(`[${timestamp}] 5 modules bundled in 12ms`);
                        lines.push(`[${timestamp}] build passed`);
                    } else if (cmd === 'test') {
                        lines.push(`[${timestamp}] vitest run browser/workbench...`);
                        lines.push(`[${timestamp}] 12 tests passed (100%)`);
                    } else if (cmd === 'status') {
                        lines.push(`[${timestamp}] workbench pid: ${cx.id}`);
                        lines.push(`[${timestamp}] mode: ${cx.chrome.mode()}`);
                        lines.push(`[${timestamp}] open windows: ${String(cx.chrome.windows().length)}`);
                    } else {
                        lines.push(`[${timestamp}] executed: ${cmd}`);
                    }

                    return {
                        ...t,
                        lines,
                        status: 'idle',
                        commandHistory: [...t.commandHistory, cmd],
                    };
                }),
            );
            logEvent(`Terminal [${session}] ran "${cmd}"`);
        };

        const clearTerminal = (session: string): void => {
            terminals.set(
                terminals().map((t) => {
                    if (t.session !== session) return t;
                    return {
                        ...t,
                        lines: [`[${timestampStr()}] terminal cleared`],
                    };
                }),
            );
            logEvent(`Terminal [${session}] cleared`);
        };

        const setMode = (mode: WindowMode): void => {
            cx.chrome.setMode(mode);
            logEvent(`Switched mode to "${mode}"`);
        };

        const toggleMode = (): void => {
            const next = cx.chrome.mode() === 'tiled' ? 'windowed' : 'tiled';
            setMode(next);
        };

        const getMode = (): WindowMode => cx.chrome.mode();

        const windows = (): readonly ChromeWindow[] => cx.chrome.windows();

        const focusedWindowId = (): string | undefined => cx.chrome.focused();

        const focusWindow = (id: string): void => {
            cx.chrome.focus(id);
            logEvent(`Focused window "${id}"`);
        };

        const closeWindow = (id: string): void => {
            cx.chrome.close(id);
            logEvent(`Closed window "${id}"`);
        };

        const maximizeWindow = (id: string): void => {
            focusWindow(id);
        };

        const minimizeWindow = (id: string): void => {
            focusWindow(id);
        };

        const restoreWindow = (id: string): void => {
            focusWindow(id);
        };

        const nextWindow = (): void => {
            const list = cx.chrome.windows();
            if (list.length === 0) return;
            const current = cx.chrome.focused();
            const idx = current ? list.findIndex((w) => w.id === current) : -1;
            const next = list[(idx + 1) % list.length];
            if (next) focusWindow(next.id);
        };

        const prevWindow = (): void => {
            const list = cx.chrome.windows();
            if (list.length === 0) return;
            const current = cx.chrome.focused();
            const idx = current ? list.findIndex((w) => w.id === current) : -1;
            const prev = list[(idx - 1 + list.length) % list.length];
            if (prev) focusWindow(prev.id);
        };

        const cascadeWindows = (): void => {
            const list = cx.chrome.windows();
            const step = 32;
            list.forEach((w, i) => {
                const targetX = 40 + i * step;
                const targetY = 40 + i * step;
                const dx = targetX - w.x;
                const dy = targetY - w.y;
                cx.chrome.move(w.id, dx, dy);
            });
            logEvent(`Cascaded ${String(list.length)} windows`);
        };

        // Command implementations
        const implementSafe = (id: string, fn: (arg1?: Json, arg2?: Json) => void): void => {
            try {
                cx.commands.implement(id, fn);
            } catch {
                // Multi-instance collision guard: broker.js:224 refuses second implementation
            }
        };

        implementSafe('workbench.toggleMode', () => { toggleMode(); });
        implementSafe('workbench.setMode', (mode?: Json) => {
            if (mode === 'tiled' || mode === 'windowed') setMode(mode);
        });
        implementSafe('workbench.openFile', (id?: Json) => {
            if (typeof id === 'string') openFile(id);
        });
        implementSafe('workbench.openTerminal', (sess?: Json) => {
            openTerminal(typeof sess === 'string' ? sess : undefined);
        });
        implementSafe('workbench.openExplorer', () => { openExplorer(); });
        implementSafe('workbench.openInspector', () => { openInspector(); });
        implementSafe('workbench.openMonitor', () => { openMonitor(); });
        implementSafe('workbench.closeWindow', (id?: Json) => {
            if (typeof id === 'string') closeWindow(id);
        });
        implementSafe('workbench.closeFocused', () => {
            const current = cx.chrome.focused();
            if (current) closeWindow(current);
        });
        implementSafe('workbench.focusWindow', (id?: Json) => {
            if (typeof id === 'string') focusWindow(id);
        });
        implementSafe('workbench.nextWindow', () => { nextWindow(); });
        implementSafe('workbench.prevWindow', () => { prevWindow(); });
        implementSafe('workbench.maximizeWindow', (id?: Json) => {
            if (typeof id === 'string') maximizeWindow(id);
        });
        implementSafe('workbench.minimizeWindow', (id?: Json) => {
            if (typeof id === 'string') minimizeWindow(id);
        });
        implementSafe('workbench.restoreWindow', (id?: Json) => {
            if (typeof id === 'string') restoreWindow(id);
        });
        implementSafe('workbench.cascadeWindows', () => { cascadeWindows(); });
        implementSafe('workbench.saveDoc', (id?: Json) => {
            const target = typeof id === 'string' ? id : activeFileId();
            saveDoc(target);
        });
        implementSafe('workbench.revertDoc', (id?: Json) => {
            if (typeof id === 'string') revertDoc(id);
        });
        implementSafe('workbench.updateDocContent', (id?: Json, content?: Json) => {
            if (typeof id === 'string' && typeof content === 'string') {
                updateDocContent(id, content);
            }
        });
        implementSafe('workbench.newSampleFile', () => {
            const idx = ++fileCounter;
            createFile(`scratch/note-${String(idx)}.md`, `# Scratchpad ${String(idx)}\nCreated from workbench toolbar.`);
        });
        implementSafe('workbench.runTerminalCmd', (sess?: Json, cmd?: Json) => {
            if (typeof sess === 'string' && typeof cmd === 'string') {
                runTerminalCommand(sess, cmd);
            }
        });
        implementSafe('workbench.submitTerminalInput', (sess?: Json, val?: Json) => {
            if (typeof sess === 'string') {
                const cmd = typeof val === 'string' && val.trim().length > 0 ? val.trim() : 'status';
                runTerminalCommand(sess, cmd);
            }
        });
        implementSafe('workbench.clearTerminal', (sess?: Json) => {
            if (typeof sess === 'string') clearTerminal(sess);
        });
        implementSafe('workbench.setFilter', (val?: Json) => {
            searchFilter.set(typeof val === 'string' ? val : '');
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'explorer' });
                cx.windows.open({ view: 'editor', params: { fileId: 'main.ts' } });
                cx.windows.open({ view: 'editor', params: { fileId: 'config.json' } });
                cx.windows.open({ view: 'terminal', params: { session: 'build' } });
                cx.windows.open({ view: 'inspector' });
            }
        });

        const api: WorkbenchApi = {
            documents,
            terminals,
            activeFileId,
            activeTerminalSession,
            eventLogs,
            searchFilter,
            filterRevision,
            docRevision,

            openFile,
            openTerminal,
            openExplorer,
            openInspector,
            openMonitor,
            createFile,
            saveDoc,
            revertDoc,
            updateDocContent,
            runTerminalCommand,
            clearTerminal,
            setMode,
            toggleMode,
            getMode,
            windows,
            focusedWindowId,
            focusWindow,
            closeWindow,
            maximizeWindow,
            minimizeWindow,
            restoreWindow,
            nextWindow,
            prevWindow,
            cascadeWindows,
        };

        return api;
    }
}
