import {
    command,
    each,
    element,
    needs,
    provider,
    text,
    tiles,
    when,
    type Application,
    type ChromeWindow,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type LayoutNode,
    type Node,
    type ProviderToken,
    type Signal,
    type ViewContext,
    type WindowMode,
    type ViewDecl,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types & contract

export interface WorkbenchDocument {
    readonly id: string;
    readonly path: string;
    readonly title: string;
    readonly language: string;
    readonly content: string;
    readonly savedContent: string;
    readonly isDirty: boolean;
    readonly lineCount: number;
    readonly wordCount: number;
}

export interface TerminalSession {
    readonly session: string;
    readonly name: string;
    readonly lines: readonly string[];
    readonly status: 'idle' | 'running';
    readonly commandHistory: readonly string[];
}

export interface WorkbenchApi {
    readonly documents: Signal<readonly WorkbenchDocument[]>;
    readonly terminals: Signal<readonly TerminalSession[]>;
    readonly activeFileId: Signal<string>;
    readonly activeTerminalSession: Signal<string>;
    readonly eventLogs: Signal<readonly string[]>;
    readonly searchFilter: Signal<string>;
    readonly filterRevision: Signal<number>;
    readonly docRevision: Signal<number>;

    openFile(fileId: string): string;
    openTerminal(session?: string): string;
    openExplorer(): string;
    openInspector(): string;
    openMonitor(): string;

    createFile(path: string, content?: string): string;
    saveDoc(fileId: string): void;
    revertDoc(fileId: string): void;
    updateDocContent(fileId: string, content: string): void;

    runTerminalCommand(session: string, cmd: string): void;
    clearTerminal(session: string): void;

    setMode(mode: WindowMode): void;
    toggleMode(): void;
    getMode(): WindowMode;

    windows(): readonly ChromeWindow[];
    focusedWindowId(): string | undefined;
    focusWindow(id: string): void;
    closeWindow(id: string): void;
    maximizeWindow(id: string): void;
    minimizeWindow(id: string): void;
    restoreWindow(id: string): void;
    nextWindow(): void;
    prevWindow(): void;
    cascadeWindows(): void;
}

export const WORKBENCH: ProviderToken<WorkbenchApi> = provider<WorkbenchApi>('mesh-workbench');

const NEEDS = needs('state', 'commands', 'windows', 'log', 'chrome');

// ---------------------------------------------------------------------------- helpers

function countLines(content: string): number {
    if (content.length === 0) return 1;
    return content.split('\n').length;
}

function countWords(content: string): number {
    const trimmed = content.trim();
    if (trimmed.length === 0) return 0;
    return trimmed.split(/\s+/).length;
}

function detectLanguage(path: string): string {
    if (path.endsWith('.ts')) return 'TypeScript';
    if (path.endsWith('.json')) return 'JSON';
    if (path.endsWith('.css')) return 'CSS';
    if (path.endsWith('.md')) return 'Markdown';
    if (path.endsWith('.sql')) return 'SQL';
    return 'Plain Text';
}

function timestampStr(): string {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// ---------------------------------------------------------------------------- views

function renderExplorerView(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
    const app = vx.app;

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-explorer-pane',
            gap: 10,
            style: {
                padding: '12px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#fbfcfe',
                color: '#1f2328',
                'font-family': 'system-ui, -apple-system, sans-serif',
                'font-size': '13px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'explorer-header-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': '1px solid #d0d7de',
                    },
                },
                children: [
                    element('Heading', {
                        props: {
                            class: 'explorer-heading',
                            style: { margin: '0', 'font-size': '14px', 'font-weight': '600' },
                        },
                        children: [text('Explorer')],
                    }),
                    element('Badge', {
                        props: {
                            class: 'badge explorer-file-count',
                            style: {
                                'background-color': '#eaeef2',
                                color: '#24292f',
                                padding: '2px 6px',
                                'border-radius': '10px',
                                'font-size': '11px',
                                'font-weight': '600',
                            },
                        },
                        children: [text(() => `${String(app.documents().length)} files`)],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'explorer-mode-bar',
                    style: {
                        display: 'flex',
                        gap: '6px',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-toggle-mode',
                            style: {
                                flex: '1',
                                padding: '5px 8px',
                                'font-size': '11px',
                                'font-weight': '600',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#f3f4f6',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.toggleMode') } },
                        children: [
                            text(() => `Layout: ${app.getMode() === 'tiled' ? 'Tiled (split)' : 'Windowed (cascade)'}`),
                        ],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-open-inspector',
                            style: {
                                padding: '5px 8px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#f3f4f6',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.openInspector') } },
                        children: [text('Inspector')],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'explorer-actions-bar',
                    style: { display: 'flex', gap: '6px' },
                },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-new-file',
                            style: {
                                flex: '1',
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #0969da',
                                background: '#0969da',
                                color: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.newSampleFile') } },
                        children: [text('+ File')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-new-terminal',
                            style: {
                                flex: '1',
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #2da44e',
                                background: '#2da44e',
                                color: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.openTerminal') } },
                        children: [text('+ Terminal')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-open-monitor',
                            style: {
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#f6f8fa',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.openMonitor') } },
                        children: [text('Monitor')],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'explorer-search-bar',
                    style: { display: 'flex', 'align-items': 'center' },
                },
                children: [
                    element('Input', {
                        props: {
                            class: 'input-filter-files',
                            placeholder: 'Filter files...',
                            value: () => app.searchFilter(),
                            style: {
                                width: '100%',
                                padding: '4px 8px',
                                'box-sizing': 'border-box',
                                border: '1px solid #d0d7de',
                                'border-radius': '4px',
                                'font-size': '12px',
                            },
                        },
                        intents: {
                            change: { action: command('workbench.setFilter') },
                        },
                    }),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'explorer-file-list',
                    gap: 4,
                    style: {
                        flex: '1',
                        overflow: 'auto',
                        padding: '4px 0',
                    },
                },
                children: [
                    each(
                        () => {
                            const q = app.searchFilter().trim().toLowerCase();
                            const docs = app.documents();
                            if (q.length === 0) return docs;
                            return docs.filter((d) => d.title.toLowerCase().includes(q) || d.path.toLowerCase().includes(q));
                        },
                        (doc) => doc.id,
                        (doc) => element('Card', {
                            props: {
                                class: 'file-item-card',
                                style: {
                                    padding: '6px 8px',
                                    border: '1px solid #e1e4e8',
                                    'border-radius': '4px',
                                    background: '#ffffff',
                                    display: 'flex',
                                    'justify-content': 'space-between',
                                    'align-items': 'center',
                                    cursor: 'pointer',
                                },
                            },
                            children: [
                                element('Stack', {
                                    props: { gap: 2, style: { flex: '1', overflow: 'hidden' } },
                                    children: [
                                        element('Row', {
                                            props: { style: { display: 'flex', gap: '6px', 'align-items': 'center' } },
                                            children: [
                                                element('Text', {
                                                    props: {
                                                        class: 'file-item-name',
                                                        style: { 'font-weight': '600', color: '#0969da' },
                                                    },
                                                    children: [text(() => doc().title)],
                                                }),
                                                when(
                                                    () => doc().isDirty,
                                                    () => element('Badge', {
                                                        props: {
                                                            class: 'badge dirty-badge',
                                                            style: {
                                                                color: '#b08800',
                                                                'font-size': '10px',
                                                                'font-weight': 'bold',
                                                            },
                                                        },
                                                        children: [text('● edited')],
                                                    }),
                                                ),
                                            ],
                                        }),
                                        element('Text', {
                                            props: {
                                                class: 'file-item-path',
                                                style: { 'font-size': '11px', color: '#57606a' },
                                            },
                                            children: [text(() => doc().path)],
                                        }),
                                    ],
                                }),
                                element('Button', {
                                    props: {
                                        class: 'btn-open-file',
                                        style: {
                                            padding: '3px 8px',
                                            'font-size': '11px',
                                            border: '1px solid #d0d7de',
                                            'border-radius': '4px',
                                            background: '#f6f8fa',
                                            cursor: 'pointer',
                                        },
                                    },
                                    intents: { activate: { action: command('workbench.openFile', doc().id) } },
                                    children: [text('Edit')],
                                }),
                            ],
                        }),
                    ),
                ],
            }),
            element('Row', {
                props: {
                    class: 'explorer-footer-row',
                    style: {
                        'padding-top': '6px',
                        'border-top': '1px solid #d0d7de',
                        display: 'flex',
                        'justify-content': 'space-between',
                        'font-size': '11px',
                        color: '#57606a',
                    },
                },
                children: [
                    element('Text', {
                        props: { class: 'explorer-status-text' },
                        children: [text('Explorer [tile: sidebar]')],
                    }),
                    element('Text', {
                        props: { class: 'explorer-windows-stat' },
                        children: [text(() => `${String(app.windows().length)} windows`)],
                    }),
                ],
            }),
        ],
    });
}

function renderEditorView(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
    const app = vx.app;
    const fileIdParam = typeof vx.params['fileId'] === 'string' ? vx.params['fileId'] : 'main.ts';

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-editor-pane',
            gap: 8,
            style: {
                padding: '12px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#ffffff',
                color: '#1f2328',
                'font-family': 'system-ui, -apple-system, sans-serif',
                'font-size': '13px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'editor-header-bar',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': '1px solid #e1e4e8',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            element('Heading', {
                                props: {
                                    class: 'editor-file-title',
                                    style: { margin: '0', 'font-size': '14px', 'font-weight': '600' },
                                },
                                children: [
                                    text(() => {
                                        const d = app.documents().find((doc) => doc.id === fileIdParam);
                                        return d ? d.title : fileIdParam;
                                    }),
                                ],
                            }),
                            element('Badge', {
                                props: {
                                    class: 'badge editor-lang-badge',
                                    style: {
                                        'background-color': '#ddf4ff',
                                        color: '#0969da',
                                        padding: '2px 6px',
                                        'border-radius': '6px',
                                        'font-size': '11px',
                                        'font-weight': '600',
                                    },
                                },
                                children: [
                                    text(() => {
                                        const d = app.documents().find((doc) => doc.id === fileIdParam);
                                        return d ? d.language : 'Text';
                                    }),
                                ],
                            }),
                            when(
                                () => {
                                    const d = app.documents().find((doc) => doc.id === fileIdParam);
                                    return d ? d.isDirty : false;
                                },
                                () => element('Badge', {
                                    props: {
                                        class: 'badge editor-dirty-indicator',
                                        style: {
                                            'background-color': '#fff8c5',
                                            color: '#9a6700',
                                            padding: '2px 6px',
                                            'border-radius': '6px',
                                            'font-size': '11px',
                                            'font-weight': 'bold',
                                        },
                                    },
                                    children: [text('Unsaved Changes')],
                                }),
                            ),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '6px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-save-document',
                                    style: {
                                        padding: '4px 10px',
                                        'font-size': '12px',
                                        'font-weight': '600',
                                        'border-radius': '4px',
                                        border: '1px solid #1f883d',
                                        background: '#1f883d',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.saveDoc', fileIdParam) } },
                                children: [text('Save (ctrl+s)')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-revert-document',
                                    style: {
                                        padding: '4px 8px',
                                        'font-size': '12px',
                                        'border-radius': '4px',
                                        border: '1px solid #d0d7de',
                                        background: '#f6f8fa',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.revertDoc', fileIdParam) } },
                                children: [text('Revert')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-open-copy',
                                    style: {
                                        padding: '4px 8px',
                                        'font-size': '12px',
                                        'border-radius': '4px',
                                        border: '1px solid #d0d7de',
                                        background: '#f6f8fa',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.openFile', fileIdParam) } },
                                children: [text('New Window')],
                            }),
                        ],
                    }),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'editor-body-area',
                    style: { flex: '1', display: 'flex', 'flex-direction': 'column' },
                },
                children: [
                    element('Input', {
                        props: {
                            class: 'editor-text-input',
                            placeholder: 'Type content...',
                            value: () => {
                                const d = app.documents().find((doc) => doc.id === fileIdParam);
                                return d ? d.content : '';
                            },
                            style: {
                                width: '100%',
                                flex: '1',
                                'min-height': '180px',
                                padding: '8px',
                                'box-sizing': 'border-box',
                                'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
                                'font-size': '12px',
                                'line-height': '1.5',
                                border: '1px solid #d0d7de',
                                'border-radius': '4px',
                                background: '#ffffff',
                                resize: 'none',
                            },
                        },
                        intents: {
                            change: { action: command('workbench.updateDocContent', fileIdParam) },
                        },
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'editor-status-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'font-size': '11px',
                        color: '#57606a',
                        'padding-top': '4px',
                        'border-top': '1px solid #e1e4e8',
                    },
                },
                children: [
                    element('Text', {
                        props: { class: 'editor-stats-text' },
                        children: [
                            text(() => {
                                const d = app.documents().find((doc) => doc.id === fileIdParam);
                                if (!d) return 'No document';
                                return `${String(d.lineCount)} lines, ${String(d.wordCount)} words, ${String(d.content.length)} chars`;
                            }),
                        ],
                    }),
                    element('Text', {
                        props: { class: 'editor-file-badge' },
                        children: [text(`File: ${fileIdParam} [tile: editor]`)],
                    }),
                ],
            }),
        ],
    });
}

function renderTerminalView(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
    const app = vx.app;
    const sessionParam = typeof vx.params['session'] === 'string' ? vx.params['session'] : 'build';

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-terminal-pane',
            gap: 6,
            style: {
                padding: '10px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#0d1117',
                color: '#c9d1d9',
                'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
                'font-size': '12px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'terminal-header-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': '1px solid #30363d',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                        children: [
                            element('Heading', {
                                props: {
                                    class: 'terminal-heading',
                                    style: { margin: '0', 'font-size': '13px', color: '#58a6ff' },
                                },
                                children: [text(() => `Terminal [${sessionParam}]`)],
                            }),
                            element('Badge', {
                                props: {
                                    class: 'badge terminal-status-badge',
                                    style: {
                                        'background-color': '#238636',
                                        color: '#ffffff',
                                        padding: '1px 6px',
                                        'border-radius': '10px',
                                        'font-size': '10px',
                                    },
                                },
                                children: [
                                    text(() => {
                                        const s = app.terminals().find((t) => t.session === sessionParam);
                                        return s?.status ?? 'idle';
                                    }),
                                ],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', gap: '4px' } },
                        children: [
                            element('Button', {
                                props: {
                                    class: 'btn-run-build',
                                    style: {
                                        padding: '2px 6px',
                                        'font-size': '11px',
                                        'border-radius': '3px',
                                        border: '1px solid #30363d',
                                        background: '#21262d',
                                        color: '#c9d1d9',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.runTerminalCmd', sessionParam, 'build') } },
                                children: [text('build')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-run-test',
                                    style: {
                                        padding: '2px 6px',
                                        'font-size': '11px',
                                        'border-radius': '3px',
                                        border: '1px solid #30363d',
                                        background: '#21262d',
                                        color: '#c9d1d9',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.runTerminalCmd', sessionParam, 'test') } },
                                children: [text('test')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-run-status',
                                    style: {
                                        padding: '2px 6px',
                                        'font-size': '11px',
                                        'border-radius': '3px',
                                        border: '1px solid #30363d',
                                        background: '#21262d',
                                        color: '#c9d1d9',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.runTerminalCmd', sessionParam, 'status') } },
                                children: [text('status')],
                            }),
                            element('Button', {
                                props: {
                                    class: 'btn-clear-terminal',
                                    style: {
                                        padding: '2px 6px',
                                        'font-size': '11px',
                                        'border-radius': '3px',
                                        border: '1px solid #30363d',
                                        background: '#21262d',
                                        color: '#f85149',
                                        cursor: 'pointer',
                                    },
                                },
                                intents: { activate: { action: command('workbench.clearTerminal', sessionParam) } },
                                children: [text('clear')],
                            }),
                        ],
                    }),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'terminal-output-scroll',
                    gap: 2,
                    style: {
                        flex: '1',
                        overflow: 'auto',
                        padding: '4px',
                        background: '#010409',
                        'border-radius': '4px',
                        border: '1px solid #30363d',
                    },
                },
                children: [
                    each(
                        () => {
                            const s = app.terminals().find((t) => t.session === sessionParam);
                            return s ? s.lines : [];
                        },
                        (_line, index) => index,
                        (line) => element('Text', {
                            props: {
                                class: 'terminal-line',
                                style: () => {
                                    const l = line();
                                    return {
                                        display: 'block',
                                        'word-break': 'break-all',
                                        color: l.startsWith('$') ? '#58a6ff' : (l.includes('error') ? '#f85149' : (l.includes('passed') || l.includes('ready') ? '#3fb950' : '#8b949e')),
                                    };
                                },
                            },
                            children: [text(line)],
                        }),
                    ),
                ],
            }),
            element('Row', {
                props: {
                    class: 'terminal-input-row',
                    style: { display: 'flex', gap: '4px', 'align-items': 'center' },
                },
                children: [
                    element('Text', {
                        props: { style: { color: '#58a6ff', 'font-weight': 'bold' } },
                        children: [text('$')],
                    }),
                    element('Input', {
                        props: {
                            class: 'terminal-command-input',
                            placeholder: 'Type command and hit commit/enter...',
                            style: {
                                flex: '1',
                                background: '#161b22',
                                color: '#c9d1d9',
                                border: '1px solid #30363d',
                                'border-radius': '3px',
                                padding: '3px 6px',
                                'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
                                'font-size': '12px',
                            },
                        },
                        intents: {
                            commit: { action: command('workbench.submitTerminalInput', sessionParam) },
                        },
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'terminal-footer-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'font-size': '10px',
                        color: '#8b949e',
                    },
                },
                children: [
                    element('Text', { children: [text(`Session: ${sessionParam}`)] }),
                    element('Text', { children: [text('tile: terminal')] }),
                ],
            }),
        ],
    });
}

function renderInspectorView(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
    const app = vx.app;

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-inspector-pane',
            gap: 10,
            style: {
                padding: '12px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#f6f8fa',
                color: '#1f2328',
                'font-family': 'system-ui, -apple-system, sans-serif',
                'font-size': '12px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'inspector-header-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': '1px solid #d0d7de',
                    },
                },
                children: [
                    element('Heading', {
                        props: {
                            class: 'inspector-heading',
                            style: { margin: '0', 'font-size': '14px', 'font-weight': '600' },
                        },
                        children: [text('Window Inspector')],
                    }),
                    element('Badge', {
                        props: {
                            class: 'badge inspector-mode-badge',
                            style: {
                                'background-color': '#ddf4ff',
                                color: '#0969da',
                                padding: '2px 6px',
                                'border-radius': '6px',
                                'font-weight': '600',
                            },
                        },
                        children: [text(() => `Mode: ${app.getMode()}`)],
                    }),
                ],
            }),
            element('Row', {
                props: {
                    class: 'inspector-controls-bar',
                    style: { display: 'flex', gap: '6px' },
                },
                children: [
                    element('Button', {
                        props: {
                            class: 'btn-cycle-next',
                            style: {
                                flex: '1',
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.nextWindow') } },
                        children: [text('Next (ctrl+] )')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-cycle-prev',
                            style: {
                                flex: '1',
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.prevWindow') } },
                        children: [text('Prev (ctrl+[ )')],
                    }),
                    element('Button', {
                        props: {
                            class: 'btn-cascade-all',
                            style: {
                                padding: '4px 6px',
                                'font-size': '11px',
                                'border-radius': '4px',
                                border: '1px solid #d0d7de',
                                background: '#ffffff',
                                cursor: 'pointer',
                            },
                        },
                        intents: { activate: { action: command('workbench.cascadeWindows') } },
                        children: [text('Cascade')],
                    }),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'inspector-summary-card',
                    gap: 4,
                    style: {
                        padding: '8px',
                        border: '1px solid #d0d7de',
                        'border-radius': '4px',
                        background: '#ffffff',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { props: { style: { color: '#57606a' } }, children: [text('Focused:')] }),
                            element('Text', {
                                props: { class: 'inspector-focused-id', style: { 'font-weight': '600' } },
                                children: [text(() => app.focusedWindowId() ?? 'none')],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { props: { style: { color: '#57606a' } }, children: [text('Total Windows:')] }),
                            element('Text', {
                                props: { class: 'inspector-total-count', style: { 'font-weight': '600' } },
                                children: [text(() => String(app.windows().length))],
                            }),
                        ],
                    }),
                ],
            }),
            element('Heading', {
                props: {
                    style: { margin: '4px 0 0 0', 'font-size': '12px', color: '#57606a', 'font-weight': '600' },
                },
                children: [text('Live Window Records (Back to Front):')],
            }),
            element('Stack', {
                props: {
                    class: 'inspector-window-list',
                    gap: 4,
                    style: { flex: '1', overflow: 'auto' },
                },
                children: [
                    each(
                        () => app.windows(),
                        (w) => w.id,
                        (w) => element('Card', {
                            props: {
                                class: () => `inspector-window-card inspector-window-${w().id}`,
                                style: {
                                    padding: '6px',
                                    border: '1px solid #d0d7de',
                                    'border-radius': '4px',
                                    background: '#ffffff',
                                    display: 'flex',
                                    'flex-direction': 'column',
                                    gap: '4px',
                                },
                            },
                            children: [
                                element('Row', {
                                    props: { style: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' } },
                                    children: [
                                        element('Row', {
                                            props: { style: { display: 'flex', gap: '6px', 'align-items': 'center' } },
                                            children: [
                                                element('Badge', {
                                                    props: {
                                                        style: {
                                                            background: '#afb8c1',
                                                            color: '#24292f',
                                                            padding: '1px 4px',
                                                            'border-radius': '3px',
                                                            'font-size': '10px',
                                                            'font-weight': 'bold',
                                                        },
                                                    },
                                                    children: [text(() => w().id)],
                                                }),
                                                element('Text', {
                                                    props: { style: { 'font-weight': '600' } },
                                                    children: [text(() => w().title)],
                                                }),
                                            ],
                                        }),
                                        element('Badge', {
                                            props: {
                                                style: () => ({
                                                    background: w().tile ? '#ddf4ff' : '#ffebe9',
                                                    color: w().tile ? '#0969da' : '#cf222e',
                                                    padding: '1px 4px',
                                                    'border-radius': '3px',
                                                    'font-size': '10px',
                                                }),
                                            },
                                            children: [text(() => (w().tile ? `tile: ${w().tile ?? ''}` : 'floating only'))],
                                        }),
                                    ],
                                }),
                                element('Row', {
                                    props: {
                                        style: {
                                            display: 'flex',
                                            'justify-content': 'space-between',
                                            'font-size': '11px',
                                            color: '#57606a',
                                        },
                                    },
                                    children: [
                                        element('Text', {
                                            children: [text(() => `pos: (${String(Math.round(w().x))}, ${String(Math.round(w().y))}) size: ${String(Math.round(w().width))}x${String(Math.round(w().height))}`)],
                                        }),
                                        element('Text', {
                                            children: [text(() => `pid: ${w().owner}`)],
                                        }),
                                    ],
                                }),
                                element('Row', {
                                    props: { style: { display: 'flex', gap: '4px', 'padding-top': '2px' } },
                                    children: [
                                        element('Button', {
                                            props: {
                                                class: 'btn-inspect-focus',
                                                style: {
                                                    flex: '1',
                                                    padding: '2px 4px',
                                                    'font-size': '10px',
                                                    border: '1px solid #d0d7de',
                                                    background: '#f6f8fa',
                                                    cursor: 'pointer',
                                                },
                                            },
                                            intents: { activate: { action: command('workbench.focusWindow', w().id) } },
                                            children: [text('Focus')],
                                        }),
                                        element('Button', {
                                            props: {
                                                class: 'btn-inspect-max',
                                                style: {
                                                    flex: '1',
                                                    padding: '2px 4px',
                                                    'font-size': '10px',
                                                    border: '1px solid #d0d7de',
                                                    background: '#f6f8fa',
                                                    cursor: 'pointer',
                                                },
                                            },
                                            intents: { activate: { action: command('workbench.maximizeWindow', w().id) } },
                                            children: [text('Max')],
                                        }),
                                        element('Button', {
                                            props: {
                                                class: 'btn-inspect-min',
                                                style: {
                                                    flex: '1',
                                                    padding: '2px 4px',
                                                    'font-size': '10px',
                                                    border: '1px solid #d0d7de',
                                                    background: '#f6f8fa',
                                                    cursor: 'pointer',
                                                },
                                            },
                                            intents: { activate: { action: command('workbench.minimizeWindow', w().id) } },
                                            children: [text('Min')],
                                        }),
                                        when(
                                            () => w().closable,
                                            () => element('Button', {
                                                props: {
                                                    class: 'btn-inspect-close',
                                                    style: {
                                                        flex: '1',
                                                        padding: '2px 4px',
                                                        'font-size': '10px',
                                                        border: '1px solid #cf222e',
                                                        background: '#ffebe9',
                                                        color: '#cf222e',
                                                        cursor: 'pointer',
                                                    },
                                                },
                                                intents: { activate: { action: command('workbench.closeWindow', w().id) } },
                                                children: [text('Close')],
                                            }),
                                        ),
                                    ],
                                }),
                            ],
                        }),
                    ),
                ],
            }),
        ],
    });
}

function renderMonitorView(vx: ViewContext<Record<string, Json>, WorkbenchApi>): Node {
    const app = vx.app;

    return element('Stack', {
        props: {
            class: 'workbench-pane workbench-monitor-pane',
            gap: 10,
            style: {
                padding: '12px',
                height: '100%',
                'box-sizing': 'border-box',
                display: 'flex',
                'flex-direction': 'column',
                'background-color': '#161b22',
                color: '#e6edf3',
                'font-family': 'system-ui, -apple-system, sans-serif',
                'font-size': '12px',
            },
        },
        children: [
            element('Row', {
                props: {
                    class: 'monitor-header-row',
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                        'padding-bottom': '6px',
                        'border-bottom': '1px solid #30363d',
                    },
                },
                children: [
                    element('Heading', {
                        props: {
                            class: 'monitor-heading',
                            style: { margin: '0', 'font-size': '13px', color: '#58a6ff' },
                        },
                        children: [text('System Monitor (Untiled)')],
                    }),
                    element('Badge', {
                        props: {
                            class: 'badge monitor-untiled-badge',
                            style: {
                                'background-color': '#388bfd',
                                color: '#ffffff',
                                padding: '2px 6px',
                                'border-radius': '6px',
                                'font-size': '10px',
                            },
                        },
                        children: [text('tile: none')],
                    }),
                ],
            }),
            element('Text', {
                props: {
                    class: 'monitor-explainer',
                    style: { color: '#8b949e', 'font-size': '11px', 'line-height': '1.4' },
                },
                children: [
                    text(
                        'This view declared no tile. In windowed mode it floats; in tiled mode it is automatically hidden by the manager.',
                    ),
                ],
            }),
            element('Stack', {
                props: {
                    class: 'monitor-stats-grid',
                    gap: 6,
                    style: {
                        padding: '8px',
                        border: '1px solid #30363d',
                        'border-radius': '4px',
                        background: '#0d1117',
                    },
                },
                children: [
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { props: { style: { color: '#8b949e' } }, children: [text('Active Windows:')] }),
                            element('Text', {
                                props: { class: 'monitor-stat-windows' },
                                children: [text(() => String(app.windows().length))],
                            }),
                        ],
                    }),
                    element('Row', {
                        props: { style: { display: 'flex', 'justify-content': 'space-between' } },
                        children: [
                            element('Text', { props: { style: { color: '#8b949e' } }, children: [text('Current Mode:')] }),
                            element('Text', {
                                props: { class: 'monitor-stat-mode' },
                                children: [text(() => app.getMode())],
                            }),
                        ],
                    }),
                ],
            }),
            element('Heading', {
                props: {
                    style: { margin: '4px 0 0 0', 'font-size': '11px', color: '#8b949e', 'font-weight': '600' },
                },
                children: [text('Workbench Event Log:')],
            }),
            element('Stack', {
                props: {
                    class: 'monitor-log-stream',
                    gap: 2,
                    style: {
                        flex: '1',
                        overflow: 'auto',
                        padding: '6px',
                        background: '#010409',
                        border: '1px solid #30363d',
                        'border-radius': '4px',
                        'font-family': 'ui-monospace, SFMono-Regular, Consolas, monospace',
                        'font-size': '11px',
                    },
                },
                children: [
                    each(
                        () => app.eventLogs(),
                        (_log, idx) => idx,
                        (log) => element('Text', {
                            props: { style: { display: 'block', color: '#8b949e' } },
                            children: [text(log)],
                        }),
                    ),
                ],
            }),
            element('Button', {
                props: {
                    class: 'btn-close-monitor',
                    style: {
                        padding: '4px 8px',
                        border: '1px solid #30363d',
                        background: '#21262d',
                        color: '#c9d1d9',
                        'border-radius': '4px',
                        cursor: 'pointer',
                    },
                },
                intents: { activate: { action: command('workbench.closeFocused') } },
                children: [text('Close Monitor Window')],
            }),
        ],
    });
}

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
