import { describe, expect, it, afterEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { flushSync } from '@flybyme/mesh-web';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import MarkdownApp, { MARKDOWN } from '../src/markdown/index.js';

describe('MarkdownApp browser tests', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('boots, starts the Application, and provides the MarkdownApi', async () => {
        const site = await mountPart({
            parts: [{ id: 'markdown', contribution: MarkdownApp }],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'markdown');
        expect(process).toBeDefined();
        expect(process?.state).toBe('running');

        const api = site.kernel.provided(MARKDOWN);
        expect(api).toBeDefined();
        expect(api?.markdownText().length).toBeGreaterThan(0);
        expect(api?.wordCount()).toBeGreaterThan(0);
        expect(api?.lineCount()).toBeGreaterThan(0);
        expect(api?.parsedBlocks().length).toBeGreaterThan(0);

        site.dispose();
    });

    it('renders editor and preview panes with initial sample blocks', async () => {
        const site = await mountPart({
            parts: [{ id: 'markdown', contribution: MarkdownApp }],
        });

        expect(site.manager.windows().length).toBe(2);
        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('editor');
        expect(views).toContain('preview');

        // Editor view
        const editorTitle = document.querySelector<HTMLElement>('.markdown-editor-title');
        expect(editorTitle?.textContent).toBe('Markdown Editor');
        const rawContent = document.querySelector<HTMLElement>('.raw-markdown-content');
        expect(rawContent?.textContent).toContain('Project Overview');

        // Preview view
        const previewTitle = document.querySelector<HTMLElement>('.markdown-preview-title');
        expect(previewTitle?.textContent).toBe('Rendered Preview');

        const h1 = document.querySelector<HTMLElement>('.markdown-h1');
        expect(h1?.textContent).toBe('Project Overview');

        const h2 = document.querySelector<HTMLElement>('.markdown-h2');
        expect(h2?.textContent).toBe('Key Features');

        const h3 = document.querySelector<HTMLElement>('.markdown-h3');
        expect(h3?.textContent).toBe('Code Architecture');

        const list = document.querySelector<HTMLElement>('.markdown-list');
        expect(list).not.toBeNull();
        const listItems = document.querySelectorAll<HTMLElement>('.markdown-list-item');
        expect(listItems.length).toBe(3);

        const quote = document.querySelector<HTMLElement>('.markdown-blockquote');
        expect(quote?.textContent).toContain('What is shown and the logic');

        const codeBlock = document.querySelector<HTMLElement>('.markdown-code-block');
        expect(codeBlock?.textContent).toContain('interface ComponentDefinition');

        const hr = document.querySelector<HTMLElement>('.markdown-hr');
        expect(hr).not.toBeNull();

        site.dispose();
    });

    it('appends text via the line input and updates the rendered preview', async () => {
        const site = await mountPart({
            parts: [{ id: 'markdown', contribution: MarkdownApp }],
        });

        const editorWin = site.manager.windows().find((w) => w.view === 'editor');
        if (editorWin) site.manager.focus(editorWin.id);

        const lineInput = document.querySelector<HTMLInputElement>('.markdown-line-input');
        const appendBtn = document.querySelector<HTMLButtonElement>('.btn-append-line');
        if (!lineInput || !appendBtn) throw new Error('Editor line input not found');

        const initialBlocksCount = document.querySelectorAll('.markdown-rendered-blocks > *').length;

        await userEvent.type(lineInput, '### Performance Benchmark');
        await userEvent.click(appendBtn);

        // Verify newly added heading block rendered in preview
        const h3s = document.querySelectorAll<HTMLElement>('.markdown-h3');
        const newH3 = Array.from(h3s).find((el) => el.textContent === 'Performance Benchmark');
        expect(newH3).toBeDefined();

        const newBlocksCount = document.querySelectorAll('.markdown-rendered-blocks > *').length;
        expect(newBlocksCount).toBe(initialBlocksCount + 1);

        site.dispose();
    });

    it('inserts markdown syntax using the toolbar buttons', async () => {
        const site = await mountPart({
            parts: [{ id: 'markdown', contribution: MarkdownApp }],
        });

        const editorWin = site.manager.windows().find((w) => w.view === 'editor');
        if (editorWin) site.manager.focus(editorWin.id);

        const btnH1 = document.querySelector<HTMLButtonElement>('.btn-syntax-h1');
        const btnBold = document.querySelector<HTMLButtonElement>('.btn-syntax-bold');
        if (!btnH1 || !btnBold) throw new Error('Toolbar buttons not found');

        await userEvent.click(btnH1);
        await userEvent.click(btnBold);

        const raw = document.querySelector<HTMLElement>('.raw-markdown-content');
        expect(raw?.textContent).toContain('# Heading 1');
        expect(raw?.textContent).toContain('**Bold Text**');

        const boldSpan = document.querySelector<HTMLElement>('.span-bold');
        expect(boldSpan?.textContent).toBe('Bold Text');

        site.dispose();
    });

    it('clears the document and reloads the sample', async () => {
        const site = await mountPart({
            parts: [{ id: 'markdown', contribution: MarkdownApp }],
        });

        const editorWin = site.manager.windows().find((w) => w.view === 'editor');
        if (editorWin) site.manager.focus(editorWin.id);

        const clearBtn = document.querySelector<HTMLButtonElement>('.btn-clear-markdown');
        const sampleBtn = document.querySelector<HTMLButtonElement>('.btn-load-sample');
        if (!clearBtn || !sampleBtn) throw new Error('Action buttons not found');

        // Clear
        await userEvent.click(clearBtn);

        const emptyCard = document.querySelector<HTMLElement>('.empty-preview-card');
        expect(emptyCard?.textContent).toContain('Nothing to preview yet');

        const statWords = document.querySelector<HTMLElement>('.stat-words-badge');
        expect(statWords?.textContent).toBe('0 words');

        // Reload sample
        await userEvent.click(sampleBtn);

        const restoredH1 = document.querySelector<HTMLElement>('.markdown-h1');
        expect(restoredH1?.textContent).toBe('Project Overview');

        site.dispose();
    });

    it('programmatically updates text via setText and re-parses correctly', async () => {
        const site = await mountPart({
            parts: [{ id: 'markdown', contribution: MarkdownApp }],
        });

        const api = site.kernel.provided(MARKDOWN);
        if (!api) throw new Error('MarkdownApi missing');

        api.setText('# Custom Document\n\nThis is a *custom* markdown test.\n\n- Point A\n- Point B');
        flushSync();

        const h1 = document.querySelector<HTMLElement>('.markdown-h1');
        expect(h1?.textContent).toBe('Custom Document');

        const italicSpan = document.querySelector<HTMLElement>('.span-italic');
        expect(italicSpan?.textContent).toBe('custom');

        const listItems = document.querySelectorAll<HTMLElement>('.markdown-list-item');
        expect(listItems.length).toBe(2);
        expect(listItems[0]?.textContent).toBe('Point A');
        expect(listItems[1]?.textContent).toBe('Point B');

        site.dispose();
    });

    it('declares commands, keys, views, and layout statically on the class', () => {
        const app = new MarkdownApp();
        expect(app.commands.map((c) => c.id)).toContain('markdown.loadSample');
        expect(app.commands.map((c) => c.id)).toContain('markdown.clear');
        expect(app.commands.map((c) => c.id)).toContain('markdown.submitLineDraft');
        expect(app.keys.map((k) => k.command)).toContain('markdown.loadSample');
        expect(app.keys.map((k) => k.command)).toContain('markdown.clear');
        expect(app.views.map((v) => v.id)).toEqual(['editor', 'preview']);
        expect(app.layout).toBeDefined();
    });
});
