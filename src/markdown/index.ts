import {
    tiles,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';
import {
    MARKDOWN,
    NEEDS,
    SAMPLE_MARKDOWN,
    type MarkdownApi,
} from './contract.js';
import { parseMarkdownDocument } from './parser.js';
import { renderEditorPane } from './views/editor.js';
import { renderPreviewPane } from './views/preview.js';

export {
    MARKDOWN,
    type MarkdownApi,
    type MarkdownBlock,
    type MarkdownSpan,
} from './contract.js';

// ---------------------------------------------------------------------------- application

export default class MarkdownApp implements Application<typeof NEEDS, readonly [], typeof MARKDOWN> {
    readonly needs = NEEDS;
    readonly provides = MARKDOWN;

    readonly commands: readonly CommandDecl[] = [
        { id: 'markdown.setDraft', title: 'Markdown: Update Draft Input' },
        { id: 'markdown.submitLineDraft', title: 'Markdown: Append Line Draft' },
        { id: 'markdown.insertSyntax', title: 'Markdown: Insert Syntax Template' },
        { id: 'markdown.loadSample', title: 'Markdown: Load Sample Document' },
        { id: 'markdown.clear', title: 'Markdown: Clear Document' },
        { id: 'markdown.openEditor', title: 'Markdown: Open Editor Window' },
        { id: 'markdown.openPreview', title: 'Markdown: Open Preview Window' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'markdown.loadSample', keys: 'ctrl+l' },
        { command: 'markdown.clear', keys: 'ctrl+k' },
    ];

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'editor' }, size: 1 },
            { node: { tile: 'preview' }, size: 1 },
        ],
    });

    readonly views: readonly ViewDecl<Record<string, never>, MarkdownApi>[] = [
        {
            id: 'editor',
            title: 'Markdown Editor',
            tile: 'editor',
            instances: 'one',
            defaultSize: { width: 440, height: 520 },
            minSize: { width: 320, height: 300 },
            render(vx: ViewContext<Record<string, never>, MarkdownApi>): Node {
                return renderEditorPane(vx);
            },
        },
        {
            id: 'preview',
            title: 'Markdown Preview',
            tile: 'preview',
            instances: 'one',
            defaultSize: { width: 440, height: 520 },
            minSize: { width: 320, height: 300 },
            render(vx: ViewContext<Record<string, never>, MarkdownApi>): Node {
                return renderPreviewPane(vx);
            },
        },
    ];

    async start(cx: Context<typeof NEEDS, readonly []>): Promise<MarkdownApi> {
        cx.log.info('MarkdownApp starting');

        const markdownText = cx.state.signal<string>(SAMPLE_MARKDOWN);
        const textRevision = cx.state.signal<number>(0);
        const lineDraft = cx.state.signal<string>('');

        const parsedBlocks = cx.state.computed(() => parseMarkdownDocument(markdownText()));

        const charCount = cx.state.computed(() => markdownText().length);
        const lineCount = cx.state.computed(() => (markdownText().length === 0 ? 0 : markdownText().split('\n').length));
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

        const insertSyntax = (template: string): void => {
            appendLine(template);
        };

        const loadSample = (): void => {
            markdownText.set(SAMPLE_MARKDOWN);
            lineDraft.set('');
            textRevision.set(textRevision() + 1);
        };

        const clear = (): void => {
            markdownText.set('');
            lineDraft.set('');
            textRevision.set(textRevision() + 1);
        };

        const setLineDraft = (line: string): void => {
            lineDraft.set(line);
        };

        const submitLineDraft = (): void => {
            const draft = lineDraft().trim();
            if (draft.length > 0) {
                appendLine(draft);
                lineDraft.set('');
                textRevision.set(textRevision() + 1);
            }
        };

        // Commands
        cx.commands.implement('markdown.setDraft', (val?: Json) => {
            setLineDraft(typeof val === 'string' ? val : '');
        });
        cx.commands.implement('markdown.submitLineDraft', () => {
            submitLineDraft();
        });
        cx.commands.implement('markdown.insertSyntax', (val?: Json) => {
            if (typeof val === 'string') insertSyntax(val);
        });
        cx.commands.implement('markdown.loadSample', () => {
            loadSample();
        });
        cx.commands.implement('markdown.clear', () => {
            clear();
        });
        cx.commands.implement('markdown.openEditor', () => {
            cx.windows.open({ view: 'editor' });
        });
        cx.commands.implement('markdown.openPreview', () => {
            cx.windows.open({ view: 'preview' });
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'editor' });
                cx.windows.open({ view: 'preview' });
            }
        });

        return {
            markdownText,
            textRevision,
            lineDraft,
            parsedBlocks,
            charCount,
            wordCount,
            lineCount,
            setText,
            appendLine,
            insertSyntax,
            loadSample,
            clear,
            setLineDraft,
            submitLineDraft,
        };
    }
}
