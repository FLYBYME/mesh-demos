/**
 * Markdown demo application: Live markdown editor, previewer, and syntax generator.
 */

import {
    AVAILABLE,
    defineApi,
    type Application,
    type BoundCommand,
    type CommandDecl,
    type Context,
    type PartApi,
    type ViewDecl,
} from '@flybyme/mesh-web';

import {
    CONSUMES,
    MARKDOWN,
    NEEDS,
    PUBLISHES,
    SAMPLE_MARKDOWN,
    type MarkdownCommands,
    type MarkdownInternal,
} from './contract.js';
import { parseMarkdownDocument } from './parser.js';
import { renderEditorView } from './views/editor.js';
import { renderPreviewView } from './views/preview.js';

import './markdown.css';

export * from './contract.js';
export * from './parser.js';

export const markdownApi = defineApi({
    id: 'markdown',
    exposure: 'local',
    calls: {},
});

export default class MarkdownApp implements Application<
    typeof NEEDS,
    typeof CONSUMES,
    typeof MARKDOWN,
    typeof markdownApi,
    MarkdownInternal
> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = MARKDOWN;
    readonly api = markdownApi;
    readonly publishes = PUBLISHES;

    readonly commands: readonly CommandDecl[] = [
        { id: 'markdown.openEditor', title: 'Markdown: Show Editor' },
        { id: 'markdown.openPreview', title: 'Markdown: Show Preview' },
        { id: 'markdown.setText', title: 'Markdown: Set Document Text' },
        { id: 'markdown.appendLine', title: 'Markdown: Append Line' },
        { id: 'markdown.loadSample', title: 'Markdown: Load Sample Document' },
        { id: 'markdown.clear', title: 'Markdown: Clear Document' },
    ];

    readonly views: readonly ViewDecl<Record<string, never>, MarkdownInternal>[] = [
        {
            id: 'editor',
            title: 'Markdown Editor',
            instances: 'one',
            window: {
                defaultSize: { width: 480, height: 520 },
                minSize: { width: 320, height: 300 },
            },
            render: renderEditorView,
        },
        {
            id: 'preview',
            title: 'Markdown Preview',
            instances: 'one',
            window: {
                defaultSize: { width: 480, height: 520 },
                minSize: { width: 320, height: 300 },
            },
            render: renderPreviewView,
        },
    ];

    async start(
        cx: Context<typeof NEEDS, typeof CONSUMES, typeof markdownApi>,
    ): Promise<{ api: PartApi; internal: MarkdownInternal }> {
        const markdownText = cx.state.signal<string>(SAMPLE_MARKDOWN);

        const parsedBlocks = cx.state.computed(() => parseMarkdownDocument(markdownText()));

        const charCount = cx.state.computed(() => markdownText().length);
        const lineCount = cx.state.computed(() =>
            markdownText().length === 0 ? 0 : markdownText().split('\n').length,
        );
        const wordCount = cx.state.computed(() => {
            const trimmed = markdownText().trim();
            if (trimmed.length === 0) return 0;
            return trimmed.split(/\s+/).length;
        });

        const setText = (content: string): void => {
            markdownText.set(content);
        };

        const appendLine = (line: string): void => {
            const current = markdownText();
            if (current.length === 0) {
                markdownText.set(line);
            } else {
                markdownText.set(current + '\n' + line);
            }
        };

        const insertSyntax = (snippet: string): void => {
            appendLine(snippet);
        };

        const loadSample = (): void => {
            markdownText.set(SAMPLE_MARKDOWN);
        };

        const clear = (): void => {
            markdownText.set('');
        };

        const openEditor = (): void => {
            cx.windows.open({ view: 'editor' });
        };

        const openPreview = (): void => {
            cx.windows.open({ view: 'preview' });
        };

        // Bound commands
        const boundSetText: BoundCommand<{ text: string }, void> = {
            ...PUBLISHES.commands[0],
            available: () => AVAILABLE,
            run: async ({ text: t }) => setText(t),
        };

        const boundAppendLine: BoundCommand<{ line: string }, void> = {
            ...PUBLISHES.commands[1],
            available: () => AVAILABLE,
            run: async ({ line }) => appendLine(line),
        };

        const boundLoadSample: BoundCommand<void, void> = {
            ...PUBLISHES.commands[2],
            available: () => AVAILABLE,
            run: async () => loadSample(),
        };

        const boundClear: BoundCommand<void, void> = {
            ...PUBLISHES.commands[3],
            available: () => AVAILABLE,
            run: async () => clear(),
        };

        const commands: MarkdownCommands = {
            setText: boundSetText,
            appendLine: boundAppendLine,
            loadSample: boundLoadSample,
            clear: boundClear,
        };

        // Palette commands
        cx.commands.implement('markdown.openEditor', openEditor);
        cx.commands.implement('markdown.openPreview', openPreview);
        cx.commands.implement('markdown.setText', (arg) => {
            if (typeof arg === 'object' && arg !== null && 'text' in arg) {
                setText(String(arg.text));
            } else if (typeof arg === 'string') {
                setText(arg);
            }
        });
        cx.commands.implement('markdown.appendLine', (arg) => {
            if (typeof arg === 'object' && arg !== null && 'line' in arg) {
                appendLine(String(arg.line));
            } else if (typeof arg === 'string') {
                appendLine(arg);
            }
        });
        cx.commands.implement('markdown.loadSample', loadSample);
        cx.commands.implement('markdown.clear', clear);

        // Defer default window opening
        setTimeout(() => {
            if (cx.windows.own().length === 0) {
                openEditor();
            }
        }, 0);

        const internal: MarkdownInternal = {
            markdownText,
            parsedBlocks,
            charCount,
            wordCount,
            lineCount,

            setText,
            appendLine,
            insertSyntax,
            loadSample,
            clear,

            openEditor,
            openPreview,

            commands,
        };

        const api: PartApi = {
            commands: {
                setText: boundSetText,
                appendLine: boundAppendLine,
                loadSample: boundLoadSample,
                clear: boundClear,
            },
            components: {},
            state: {},
        };

        return { api, internal };
    }
}
