# Report: Split Every Part into the Boundary File Structure (Dispatch 8)

**Date:** 2026-09-06  
**Worktree:** `/home/ubuntu/code/mesh-demos-dispatch-8`  
**Branch:** `dispatch/8`  

---

## 1. Executive Summary & Verification State

This dispatch refactors all eleven parts in `mesh-demos` into the architectural boundary shape defined in `~/code/surfdns/architecture/boundaries.md`:

```
src/<part>/
    contract.ts       the token, the API interface, NEEDS, CONSUMES (leaf module)
    <pure>.ts         logic with no kernel import — math.ts, parser.ts, format.ts, helpers.ts
    views/
        <view>.ts     one view per file
    index.ts          the Application or Extension class, and the default export
```

Additionally, `src/shared/theme.ts` was retired and moved to `src/contracts/theme.ts` to eliminate the architectural hazards of an ambiguous `shared/` directory.

### Verification Results
- **11 Parts Split**: All 11 parts (`todo`, `theme`, `palette`, `notes`, `clock`, `chart`, `markdown`, `calc`, `kanban`, `whoami`, `workbench`) refactored into the modular boundary structure.
- **Rule 1 (Leaf Contracts)**: Every `contract.ts` imports nothing from its sibling modules (`views/`, `<pure>.ts`, `index.ts`).
- **Rule 2 (No Cross-Part Index Imports)**: Audited and verified with ripgrep: exactly zero cross-part `index.js` imports across the entire `src/` tree.
- **Rule 3 (Pure Logic Isolation)**: Extracted pure helper modules (`calc/math.ts`, `markdown/parser.ts`, `clock/format.ts`, `notes/format.ts`, `workbench/helpers.ts`) have zero imports from `@flybyme/mesh-web` or any kernel package.
- **Rule 4 (One View Per File)**: Each view declared by a part lives in its own dedicated file under `views/`.
- **Zero Casts**: Zero `as any`, zero `as never`, zero type assertion casts added.
- **Type Safety (`npm run typecheck`)**: Clean pass (0 errors).
- **Browser Tests (`npm test`)**: All **11 test suites (79 tests) passing green**:
  - `test/calc.browser.test.ts`: 8/8 passed.
  - `test/chart.browser.test.ts`: 7/7 passed.
  - `test/clock.browser.test.ts`: 6/6 passed.
  - `test/kanban.browser.test.ts`: 8/8 passed.
  - `test/markdown.browser.test.ts`: 7/7 passed.
  - `test/notes.browser.test.ts`: 7/7 passed.
  - `test/palette.browser.test.ts`: 7/7 passed.
  - `test/theme.browser.test.ts`: 5/5 passed.
  - `test/todo.browser.test.ts`: 7/7 passed.
  - `test/whoami.browser.test.ts`: 8/8 passed.
  - `test/workbench.browser.test.ts`: 9/9 passed.
- **Version Bumps in `mesh.json`**: Each part received a patch version bump:
  - `todo`: `0.2.0` → `0.2.1`
  - `theme`, `palette`, `notes`, `clock`, `chart`, `markdown`, `calc`, `kanban`, `whoami`, `workbench`: `0.1.0` → `0.1.1`
- **Git Commit Discipline**: Exactly 11 atomic commits (one per part), following conventional commit style (`split(<part>): ...`).

---

## 2. Directory Architecture per Part

| Part | Contract Module | Pure Logic Module | View Modules (`views/`) | Entry (`index.ts`) | Version Bump |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`todo`** | `contract.ts` (`TODO`, `TodoItem`, `TodoApi`, `NEEDS`) | *None* | `list.ts`, `stats.ts`, `editor.ts` | `TodoApp` class, layout, re-exports | `0.2.0` → `0.2.1` |
| **`theme`** | `../contracts/theme.ts` (`THEME_TOKEN`, `ThemeApi`, etc.) | *None* | *None (Extension)* | `ThemeExtension` class | `0.1.0` → `0.1.1` |
| **`palette`** | `contract.ts` (`PALETTE`, `PaletteApi`, `NEEDS`, `CONSUMES`) | *None* | `editor.ts` | `PaletteApp` class, layout, re-exports | `0.1.0` → `0.1.1` |
| **`notes`** | `contract.ts` (`NOTES`, `Note`, `NotesApi`, `NEEDS`) | `format.ts` (`formatDate`, `formatWordCount`) | `list.ts`, `editor.ts`, `stats.ts` | `NotesApp` class, layout, re-exports | `0.1.0` → `0.1.1` |
| **`clock`** | `contract.ts` (`CLOCK`, `ClockApi`, `ClockMode`, `NEEDS`) | `format.ts` (`formatTime`, `formatDate`, `formatDuration`, `formatCountdown`) | `clock.ts`, `stopwatch.ts`, `timer.ts` | `ClockApp` class, layout, re-exports | `0.1.0` → `0.1.1` |
| **`chart`** | `contract.ts` (`CHART`, `ChartType`, `DataPoint`, `ChartSeries`, `ChartApi`, `NEEDS`) | *None* | `bars.ts`, `data.ts`, `config.ts` | `ChartApp` class, layout, re-exports | `0.1.0` → `0.1.1` |
| **`markdown`** | `contract.ts` (`MARKDOWN`, `MarkdownDoc`, `MarkdownApi`, `NEEDS`) | `parser.ts` (`parseMarkdown`, `MarkdownBlock`) | `editor.ts`, `preview.ts`, `outline.ts` | `MarkdownApp` class, layout, re-exports | `0.1.0` → `0.1.1` |
| **`calc`** | `contract.ts` (`CALC`, `CalcApi`, `HistoryEntry`, `NEEDS`) | `math.ts` (`evaluateMath`) | `keypad.ts`, `history.ts`, `formula.ts` | `CalcApp` class, layout, re-exports | `0.1.0` → `0.1.1` |
| **`kanban`** | `contract.ts` (`KANBAN`, `KanbanCard`, `KanbanColumn`, `KanbanApi`, `NEEDS`) | *None* | `board.ts`, `card.ts`, `metrics.ts` | `KanbanApp` class, layout, re-exports | `0.1.0` → `0.1.1` |
| **`whoami`** | `contract.ts` (`WHOAMI`, `OrgMember`, `SessionInfo`, `WhoamiApi`, `NEEDS`) | *None* | `card.ts`, `orgs.ts`, `session.ts` | `WhoamiApp` class, layout, re-exports | `0.1.0` → `0.1.1` |
| **`workbench`** | `contract.ts` (`WORKBENCH`, `WorkbenchDocument`, `TerminalSession`, `WorkbenchApi`, `NEEDS`) | `helpers.ts` (`countLines`, `countWords`, `detectLanguage`, `timestampStr`) | `explorer.ts`, `editor.ts`, `terminal.ts`, `inspector.ts`, `monitor.ts` | `WorkbenchApp` class, layout, re-exports | `0.1.0` → `0.1.1` |

---

## 3. Analysis: Which Parts Had a Pure Half Worth Its Own File?

Rule 3 states that logic with no kernel dependency belongs in a pure file (`<pure>.ts`). Across the 11 parts, **5 parts had a distinct pure half** and **6 parts did not**:

### Parts with a Pure Half:
1. **`calc` (`src/calc/math.ts`)**:
   - `evaluateMath(expr: string): number`: Self-contained recursive-descent mathematical expression parser supporting operator precedence (`+`, `-`, `*`, `/`, `%`), unary negation, nested parentheses, and divide-by-zero detection.
   - *Impact*: Previously only testable via `CalcApp` button clicks in a browser; now testable as a standalone pure function.
2. **`markdown` (`src/markdown/parser.ts`)**:
   - `parseMarkdown(source: string): readonly MarkdownBlock[]`: Block-level parser that parses markdown into typed blocks (`heading`, `list`, `quote`, `code`, `paragraph`).
   - *Impact*: Parses text independently of DOM or reactive signals.
3. **`clock` (`src/clock/format.ts`)**:
   - Four pure formatting utilities: `formatTime` (12h/24h), `formatDate`, `formatDuration` (stopwatch ms to `mm:ss.ms`), and `formatCountdown` (seconds to `mm:ss`).
   - *Impact*: Pure date and time math with zero browser dependencies.
4. **`notes` (`src/notes/format.ts`)**:
   - Pure string/time formatters: `formatDate(timestamp)` and `formatWordCount(count)`.
5. **`workbench` (`src/workbench/helpers.ts`)**:
   - Pure text analysis and timestamp generation: `countLines`, `countWords`, `detectLanguage(path)`, and `timestampStr`.

### Parts without a Separate Pure File:
1. **`todo`**: State transitions (adding/toggling tasks) are 1–2 lines of array filtering and mapping, directly embedded in command callbacks or reactive signals.
2. **`theme`**: An Extension rather than an Application. Provides tokens and applies CSS variables; no pure algorithmic logic.
3. **`palette`**: An interactive inspector/editor for theme tokens; all logic is directly bound to reactive signals and view rendering.
4. **`chart`**: Math calculations (`projectPoints`, `projectStackedBars`) calculate SVG coordinates and viewBox attributes; they are tightly coupled to SVG rendering in `views/bars.ts` and view props.
5. **`kanban`**: Board mutations (drag/move card across columns) are array manipulation expressions executed inside command handlers.
6. **`whoami`**: Integrates with the platform authentication gate (`AUTH`) and renders user sessions; no independent pure logic.

**Conclusion**: Rule 3 is **not only true of `calc`**. Nearly half of all parts (5 of 11) contained genuine pure logic. The separation significantly clarifies the codebase and creates immediate opportunities for fast, browser-less unit testing.

---

## 4. Banner Section Deviations

Original monolithic parts followed four banner comments:
```
// ---------------------------------------------------------------------------- types & contract
// ---------------------------------------------------------------------------- helpers
// ---------------------------------------------------------------------------- views
// ---------------------------------------------------------------------------- application
```

Deviations observed during the audit:
1. **`theme` (Extension)**:
   - Resisted the standard 4 banners because it is an `Extension`, not an `Application`.
   - It lacked `views` and `helpers`. Its original sections were:
     - `// ---------------------------------------------------------------------------- types & contract`
     - `// ---------------------------------------------------------------------------- tokens`
     - `// ---------------------------------------------------------------------------- extension`
   - *Resolution*: Its contract moved to `src/contracts/theme.ts` (`types & contract`), while `src/theme/index.ts` retained `tokens` and `extension`.
2. **`src/shared/theme.ts`**:
   - Contained only `// ---------------------------------------------------------------------------- types & contract` (116 lines).
   - *Resolution*: Renamed and moved to `src/contracts/theme.ts`.
3. **Parts without helpers (`todo`, `chart`, `kanban`, `whoami`, `palette`)**:
   - Some parts lacked an independent `helpers` section entirely (e.g., `todo` jumped directly from `types & contract` to `views`).
   - For these parts, `<pure>.ts` was omitted per specification (`<pure>.ts: omitted if no pure logic`).

---

## 5. Cross-Part Import Audit (Rule 2 Compliance)

Rule 2 strictly forbids importing from another part's `index.js`.

### Prior State Audit
- **Did any part import another's `index.ts` prior to this dispatch?**
  - **No.** Prior to this dispatch, no part in `src/` imported from another part's `index.js`.
  - The only cross-part import was `palette` importing `THEME_TOKEN` and `ThemeApi` from `../shared/theme.js`, and `theme` importing from `../shared/theme.js`.
- **Test file imports**:
  - Test suites (`test/palette.browser.test.ts` and `test/theme.browser.test.ts`) previously imported from `../src/shared/theme.js`.

### Current State Audit
- Grep check for `from '../[a-z]*/index.js'` across `src/`: **0 matches**.
- Grep check for any `index.js` import across `src/`: **0 matches**.
- `shared/` directory: **Completely removed**.
- Shared contracts: Placed in `src/contracts/theme.ts`.
- Public re-exports: Every part's `index.ts` re-exports its own contract symbols for test suite compatibility, but no internal part imports cross-part `index.js`.

---

## 6. Bugs Found and Deliberately Left Intact

As required by the dispatch constraints, zero behavioral edits were made. The following known bugs and quirks were identified and left intact:

1. **Workbench Window Occlusion Defect**:
   - *Location*: `src/workbench/views/inspector.ts` / `test/workbench.browser.test.ts:474-501`
   - *Detail*: When multiple windows are cascaded, click events targeting background windows can be occluded or intercepted unexpectedly. Tested and verified to remain intact.
2. **Command Broker Multi-Instance Collision Guard**:
   - *Location*: `src/workbench/index.ts:278-285`
   - *Detail*: `implementSafe` wraps `cx.commands.implement(id, fn)` in a `try / catch` block because the command broker (`broker.js:224`) throws an error if a command is registered more than once when multiple workbench instances are spawned.
3. **Initial Window Spawning Microtask Deferral**:
   - *Location*: `src/workbench/index.ts:356-364`
   - *Detail*: Initial windows (`explorer`, `editor`, `terminal`, `inspector`) are opened inside `queueMicrotask(() => { ... })` rather than directly during `start()` to work around lifecycle timing constraints (`A5.7b workaround`).
4. **Division by Zero in Calculator**:
   - *Location*: `src/calc/math.ts:32-34`
   - *Detail*: Division by zero explicitly returns `Infinity` rather than throwing an error or rendering `Error`, preserved as originally written.
5. **Notes Local Storage Sync Sensitivity**:
   - *Location*: `src/notes/index.ts:74-88`
   - *Detail*: Deleting or selecting notes depends on synchronous localStorage updates that require microtask flushing in tests.

---

## 7. Reader Audit Notes

### 7.1 Commit Verification
All 11 parts were split and committed individually in chronological sequence:
1. `7078dd7` - `split(todo): separate contract and views, bump to 0.2.1`
2. `fa5a44a` - `split(theme): separate contract, move theme contract to contracts/, bump to 0.1.1`
3. `614ccb2` - `split(palette): separate contract and views, remove shared/, bump to 0.1.1`
4. `921c8d4` - `split(notes): separate contract, pure format helpers, and views, bump to 0.1.1`
5. `b3d7798` - `split(clock): separate contract, pure format helpers, and views, bump to 0.1.1`
6. `c4583f0` - `split(chart): separate contract and views, bump to 0.1.1`
7. `d77f60a` - `split(markdown): separate contract, pure parser, and views, bump to 0.1.1`
8. `ccffeb4` - `split(calc): separate contract, pure math parser, and views, bump to 0.1.1`
9. `1672e24` - `split(kanban): separate contract and views, bump to 0.1.1`
10. `38f49cf` - `split(whoami): separate contract and views, bump to 0.1.1`
11. `ff474d1` - `split(workbench): separate contract, pure helpers, and views, bump to 0.1.1`

### 7.2 Zero Casts Verified
Grep check for `as any`, `as never`, or type assertions introduced during this dispatch returned 0 results.

### 7.3 Unmodified Test Assertions
All 79 browser tests across 11 test suites pass untouched. The only modifications made to test files were updating import paths from `../src/shared/theme.js` to `../src/contracts/theme.js` in `test/theme.browser.test.ts` and `test/palette.browser.test.ts`.
