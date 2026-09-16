/**
 * Browser integration tests for MarkdownApp.
 *
 * Runs in a real Chromium browser via vitest.browser.config.ts.
 * Verifies:
 * - Booting MarkdownApp into the kernel via mountPart().
 * - Loading default sample markdown document and computing metrics.
 * - Toolbar actions: inserting syntax templates, clearing, and reloading sample.
 * - Parsing and live rendering in the preview pane.
 * - HTML element representation of headings, blockquotes, lists, code blocks, and spans.
 * - Published commands and API surface.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mountPart } from '@flybyme/mesh-web/testing';
import type { PartApi } from '@flybyme/mesh-web';

import MarkdownApp, { type MarkdownInternal } from '../src/markdown/index.js';

let site: Awaited<ReturnType<typeof bootMarkdown>> | undefined;

afterEach(() => {
    site?.dispose();
    site = undefined;
    cleanup();
    for (const el of document.querySelectorAll('.markdown-container')) {
        el.remove();
    }
});

async function bootMarkdown(views?: readonly string[]) {
    const options = views
        ? {
              parts: [{ id: 'markdown', contribution: MarkdownApp }],
              open: [{ application: 'markdown', views }],
          }
        : {
              parts: [{ id: 'markdown', contribution: MarkdownApp }],
          };

    const s = await mountPart(options);
    await s.ready;
    await new Promise((r) => setTimeout(r, 30));
    return s;
}

function getMarkdownInternal(s: NonNullable<typeof site>): MarkdownInternal {
    const process = s.kernel.processes.find((p) => p.applicationId === 'markdown');
    if (!process || !process.internal) {
        throw new Error('Markdown process or internal not found');
    }
    return process.internal as MarkdownInternal;
}

describe('MarkdownApp browser integration', () => {
    it('boots into a window and loads sample markdown document', async () => {
        site = await bootMarkdown();
        const internal = getMarkdownInternal(site);

        // 1. Single window opened with view 'editor'
        const windows = site.manager.windows();
        expect(windows).toHaveLength(1);
        expect(windows[0]?.view).toBe('editor');

        // 2. Editor input and sample content loaded
        const input = document.querySelector<HTMLInputElement>('.markdown-editor-input');
        expect(input).not.toBeNull();
        expect(input?.value).toContain('Project Overview');

        // 3. Metrics computed
        expect(internal.wordCount()).toBeGreaterThan(10);
        expect(internal.lineCount()).toBeGreaterThan(5);

        // 4. Toolbar buttons rendered
        const toolbarBtns = document.querySelectorAll('.markdown-toolbar-btn');
        expect(toolbarBtns.length).toBeGreaterThanOrEqual(10);
    });

    it('clears document and updates metrics', async () => {
        site = await bootMarkdown();
        const internal = getMarkdownInternal(site);

        // Find Clear button
        const clearBtn = document.querySelector<HTMLButtonElement>('.markdown-btn-clear');
        expect(clearBtn).not.toBeNull();
        clearBtn?.click();
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.markdownText()).toBe('');
        expect(internal.wordCount()).toBe(0);
        expect(internal.charCount()).toBe(0);
        expect(internal.lineCount()).toBe(0);

        // Input new text
        internal.setText('# Clean Heading\n\n**Bold statement** here.');
        await new Promise((r) => setTimeout(r, 20));

        expect(internal.wordCount()).toBe(6);
        expect(internal.lineCount()).toBe(3);
    });

    it('inserts syntax templates via toolbar', async () => {
        site = await bootMarkdown();
        const internal = getMarkdownInternal(site);

        internal.clear();
        await new Promise((r) => setTimeout(r, 20));

        const toolbarBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('.markdown-toolbar-btn'));
        const h1Btn = toolbarBtns.find((b) => b.textContent?.trim() === 'H1');
        const boldBtn = toolbarBtns.find((b) => b.textContent?.trim() === 'Bold');

        h1Btn?.click();
        await new Promise((r) => setTimeout(r, 20));
        expect(internal.markdownText()).toBe('# ');

        boldBtn?.click();
        await new Promise((r) => setTimeout(r, 20));
        expect(internal.markdownText()).toBe('# \n**bold**');
    });

    it('renders parsed blocks in preview view', async () => {
        site = await bootMarkdown(['preview']);
        const internal = getMarkdownInternal(site);

        // Set rich markdown content
        const markdown = `# Main Title
## Section Two
### Sub Heading

A regular paragraph with **bold words**, *italic styling*, and \`inline code\`.

> This is a notable quote.

- First item
- Second item
- Third item

\`\`\`javascript
const answer = 42;
\`\`\`

---
`;
        internal.setText(markdown);
        await new Promise((r) => setTimeout(r, 30));

        // Check preview elements
        expect(document.querySelector('.markdown-h1')?.textContent).toBe('Main Title');
        expect(document.querySelector('.markdown-h2')?.textContent).toBe('Section Two');
        expect(document.querySelector('.markdown-h3')?.textContent).toBe('Sub Heading');

        expect(document.querySelector('.markdown-span-bold')?.textContent).toBe('bold words');
        expect(document.querySelector('.markdown-span-italic')?.textContent).toBe('italic styling');
        expect(document.querySelector('.markdown-span-code')?.textContent).toBe('inline code');

        expect(document.querySelector('.markdown-quote')?.textContent).toContain('This is a notable quote.');

        const listItems = document.querySelectorAll('.markdown-list-item');
        expect(listItems.length).toBe(3);

        const codeBlock = document.querySelector('.markdown-code-block');
        expect(codeBlock?.textContent).toContain('javascript');
        expect(codeBlock?.textContent).toContain('const answer = 42;');

        expect(document.querySelector('.markdown-hr')).not.toBeNull();
    });

    it('switches between editor and preview tabs', async () => {
        site = await bootMarkdown();

        // Initially on 'editor'
        expect(site.manager.windows()[0]?.view).toBe('editor');

        // Click Preview tab
        const previewNavBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('.markdown-nav-btn')).find(
            (b) => b.textContent?.trim() === 'Preview',
        );
        previewNavBtn?.click();
        await new Promise((r) => setTimeout(r, 30));

        const previewWindow = site.manager.windows().find((w) => w.view === 'preview');
        expect(previewWindow).toBeDefined();

        expect(document.querySelector('.markdown-preview-pane')).not.toBeNull();
    });

    it('exposes published commands via API', async () => {
        site = await bootMarkdown();
        const process = site.kernel.processes.find((p) => p.applicationId === 'markdown');
        expect(process).toBeDefined();

        const api = process?.api as PartApi | undefined;
        expect(api).toBeDefined();
        expect(api?.commands).toBeDefined();

        const internal = getMarkdownInternal(site);

        // Set text via API
        await api?.commands.setText?.run({ text: '# Hello from API\nParagraph text.' });
        expect(internal.markdownText()).toBe('# Hello from API\nParagraph text.');

        // Append line via API
        await api?.commands.appendLine?.run({ line: '- Item added via API' });
        expect(internal.markdownText()).toContain('- Item added via API');

        // Clear via API
        await api?.commands.clear?.run(undefined);
        expect(internal.markdownText()).toBe('');

        // Reload sample via API
        await api?.commands.loadSample?.run(undefined);
        expect(internal.markdownText()).toContain('Project Overview');
    });
});
