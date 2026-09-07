import {
    needs,
    provider,
    type ProviderToken,
    type ReadonlySignal,
    type Signal,
} from '@flybyme/mesh-web';

// ---------------------------------------------------------------------------- types & contract

export interface MarkdownSpan {
    readonly type: 'text' | 'bold' | 'italic' | 'code' | 'link';
    readonly content: string;
    readonly target?: string;
}

export interface MarkdownBlock {
    readonly id: string;
    readonly kind: 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'hr';
    readonly level?: 1 | 2 | 3;
    readonly items?: readonly string[];
    readonly spans?: readonly MarkdownSpan[];
    readonly codeLanguage?: string;
    readonly rawText: string;
}

export interface MarkdownApi {
    readonly markdownText: ReadonlySignal<string>;
    readonly parsedBlocks: () => readonly MarkdownBlock[];
    readonly charCount: () => number;
    readonly wordCount: () => number;
    readonly lineCount: () => number;

    setText(content: string): void;
    appendLine(line: string): void;
}

export interface MarkdownInternal {
    readonly markdownText: Signal<string>;
    readonly textRevision: Signal<number>;
    readonly lineDraft: Signal<string>;
    readonly parsedBlocks: () => readonly MarkdownBlock[];
    readonly charCount: () => number;
    readonly wordCount: () => number;
    readonly lineCount: () => number;

    setText(content: string): void;
    appendLine(line: string): void;
    insertSyntax(template: string): void;
    loadSample(): void;
    clear(): void;
    setLineDraft(line: string): void;
    submitLineDraft(): void;
}

export const MARKDOWN: ProviderToken<MarkdownApi> = provider<MarkdownApi>('mesh-markdown');

export const NEEDS = needs('state', 'commands', 'windows', 'log');

// ---------------------------------------------------------------------------- sample text

export const SAMPLE_MARKDOWN = `# Project Overview

A collaborative workspace built on fine-grained reactive primitives.

## Key Features

- Pure functional view declarations
- No virtual DOM and no diffing
- Directional focus and non-pointer paths throughout

> "What is shown and the logic for what is shown are two different things."

### Code Architecture

\`\`\`typescript
interface ComponentDefinition {
    readonly name: string;
    create(): Element;
}
\`\`\`

---

Try editing this markdown text or adding new blocks on the left.`;
