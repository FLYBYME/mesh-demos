/**
 * Contract, types, and schemas for the Markdown demo application.
 */

import {
    AVAILABLE,
    needs,
    provider,
    schema,
    type Availability,
    type BoundCommand,
    type PartApi,
    type ProviderToken,
    type Signal,
    type ViewContext,
} from '@flybyme/mesh-web';

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

export interface MarkdownCommands {
    readonly setText: BoundCommand<{ text: string }, void>;
    readonly appendLine: BoundCommand<{ line: string }, void>;
    readonly loadSample: BoundCommand<void, void>;
    readonly clear: BoundCommand<void, void>;
}

export const MARKDOWN: ProviderToken<PartApi> = provider<PartApi>('markdown');

export const NEEDS = needs('state', 'commands', 'windows', 'log');

export const CONSUMES = [] as const;

export const PUBLISHES = {
    commands: [
        {
            action: 'setText',
            description: 'Replaces the full markdown document text.',
            input: schema<{ text: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'appendLine',
            description: 'Appends a new line of text to the document.',
            input: schema<{ line: string }>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'loadSample',
            description: 'Loads the default markdown sample document.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
        {
            action: 'clear',
            description: 'Clears the markdown document.',
            input: schema<void>(),
            output: schema<void>(),
            available: (): Availability => AVAILABLE,
        },
    ],
    components: [],
    state: [],
} as const;

export interface MarkdownInternal {
    readonly markdownText: Signal<string>;
    readonly parsedBlocks: () => readonly MarkdownBlock[];
    readonly charCount: () => number;
    readonly wordCount: () => number;
    readonly lineCount: () => number;

    setText(text: string): void;
    appendLine(line: string): void;
    insertSyntax(snippet: string): void;
    loadSample(): void;
    clear(): void;

    openEditor(): void;
    openPreview(): void;

    commands: MarkdownCommands;
}

export type MarkdownView = ViewContext<Record<string, never>, MarkdownInternal, PartApi>;

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
