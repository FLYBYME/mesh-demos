import {
    needs,
    provider,
    type ChromeWindow,
    type ProviderToken,
    type Signal,
    type WindowMode,
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

export const NEEDS = needs('state', 'commands', 'windows', 'log', 'chrome');
