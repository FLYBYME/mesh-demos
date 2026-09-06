# Result: Breadth — Four Small Applications & The Component Vocabulary Audit (Dispatch 5)

## 1. Executive Summary & Verification State

In this dispatch, we shifted from the deep mechanism-specific focus of Dispatches 1–4 to a **broad architectural audit** of the `@flybyme/mesh-web` component vocabulary.

We authored **four complete, fully working applications**, each tackling a radically distinct problem shape:
1. **`src/calc/index.ts`** (**Calculator**): Keypad grid, shunting-yard arithmetic parser, formula buffer, persistent calculation history, and full dual-mode (pointer & keyboard) operation.
2. **`src/markdown/index.ts`** (**Markdown Viewer**): AST block and inline markdown parser, two-pane editor and live preview, syntax insertion toolbar, and live document statistics.
3. **`src/kanban/index.ts`** (**Kanban Board**): 4-column workflow board (To Do, In Progress, Review, Done), pick-and-drop state machine, directional non-pointer lane shifts, task composer, and live filter.
4. **`src/chart/index.ts`** (**Chart Visualizer**): Multi-series data visualizer (Revenue, Active Users, Defects), vertical column and horizontal bar projections, dynamic coordinate scaling, KPI metric cards, and dataset editing.

All four applications are registered in `mesh.json` as `kind: "application"`, version `0.1.0`.

### Verification Results
- **Type Safety**: **Zero casts** (zero type assertions across all newly authored files; clean type derivation throughout).
- **`npm run typecheck`**: Clean (0 errors).
- **`npm test` / `vitest`**: **72 / 72 tests passing green** across all 10 test suites:
  - `test/calc.browser.test.ts`: 8/8 passed.
  - `test/markdown.browser.test.ts`: 7/7 passed.
  - `test/kanban.browser.test.ts`: 8/8 passed.
  - `test/chart.browser.test.ts`: 7/7 passed.
  - `test/workbench.browser.test.ts`: 9/9 passed.
  - `test/notes.browser.test.ts`: 7/7 passed.
  - `test/clock.browser.test.ts`: 6/6 passed.
  - `test/palette.browser.test.ts`: 7/7 passed.
  - `test/theme.browser.test.ts`: 5/5 passed.
  - `test/whoami.browser.test.ts`: 8/8 passed.
- **`finish.sh 5`**: Clean verification run with zero uncommitted breaches and zero cast defects.

---

## 2. The Component Vocabulary Audit

The `@flybyme/mesh-web` component vocabulary consists of exactly **eleven primitives**:
```
Stack, Row, Text, Heading, Button, Input, Form, List, ListItem, Card, Badge
```
As noted in `src/render/component.ts`, these eleven primitives are *"a first cut, not the audit"*. Building four applications of fundamentally different shapes exposes exactly where this first cut succeeds, where it bends, and where it completely breaks down.

Furthermore, `element('tag', ...)` deliberately throws at runtime if invoked with an unregistered HTML tag (such as `<canvas>`, `<svg>`, or `<textarea>`). This design choice ensures that missing primitives cannot be swept under the rug with raw DOM tags; they must be audited.

---

### 2.1 What Could Not Be Expressed At All

#### 1. Vector Graphics, Canvas, and 2D Coordinate Geometry (`Chart`)
- **What is missing**: There is no `Canvas`, `Svg`, `Path`, `Line`, or `Shape` primitive in the vocabulary.
- **The failure**: When building a charting application, an author naturally needs to render coordinate axes, line curves, scatter points, bar charts, trendlines, and circular dials. Invoking `element('svg', ...)` or `element('canvas', ...)` throws unconditionally at runtime with `Error: Unknown element type: svg`.
- **What we had to do instead**: We were forced to simulate a bar chart out of nested `Row` and `Stack` flex containers, calculating percentage values for inline CSS `style: { height: `${pct}%`, width: ... }`.
- **The architectural cost**:
  - We could only express rectangular bars. Line charts (requiring SVG paths or bezier curves), scatter plots, area charts, and pie charts are **mathematically impossible** to express cleanly with flex containers.
  - Coordinate axes and tick marks cannot be positioned reliably because flexbox distributes space relative to siblings rather than an absolute Cartesian coordinate system.

#### 2. Continuous Pointer Streams and Native Drag-and-Drop (`Kanban`)
- **What is missing**: The vocabulary provides no HTML5 Drag-and-Drop primitives (`draggable`, `dropzone`, `onDragStart`, `onDragOver`, `onDrop`) and no continuous pointer stream listeners (`onPointerMove`, `onPointerUp`, `setPointerCapture`).
- **The failure**: A Kanban board is fundamentally defined by dragging cards between columns and reordering them within a lane. The vocabulary only exposes discrete single-action events (`click`, `input`, `commit`, `activate`).
- **What we had to do instead**: We had to invent a discrete two-phase "Grab & Drop" state machine. When a user clicks "Grab" on a card, `grabbedCardId` is stored in a signal. Every column then dynamically renders a "Drop Here" target button at the bottom of its lane. Additionally, we placed `←` and `→` directional buttons directly on every card.
- **The architectural cost**:
  - The tactile, spatial metaphor of a Kanban board is lost. Users cannot drag a card with physics, cannot see a drag ghost following their cursor, and cannot hover to preview an insertion point.

#### 3. Multi-Line Text Editing (`TextArea`) (`Markdown`)
- **What is missing**: There is no `TextArea` or `Editor` primitive in the component vocabulary.
- **The failure**: `Input` renders strictly as `<input type="text">`. An `<input>` cannot accept newlines, cannot wrap text paragraphs, and cannot handle multi-line document editing.
- **What we had to do instead**: The Markdown editor had to be constrained to a single-line `<Input>` where users append or edit lines one by one, supported by quick-insert toolbar chips for multiline structures (code blocks, lists, blockquotes).
- **The architectural cost**:
  - Writing real markdown requires seeing the full text buffer with cursor positioning, multi-line selection, block indentation, and paragraph breaks. Single-line inputs turn document authoring into an awkward prompt-and-append loop.

#### 2. Dedicated Scroll Region / Viewport (`Markdown`, `Calc`, `Kanban`)
- **What is missing**: There is no `ScrollView`, `ScrollArea`, or `Viewport` primitive.
- **The failure**: When content exceeds the window dimensions (e.g. calculation history exceeding 10 items, markdown documents with 50 lines, or kanban columns with 20 cards), default flexbox containers simply overflow, push window borders, or clip content out of reach.
- **What we had to do instead**: We had to abuse inline style props by injecting `style: { overflowY: 'auto', maxHeight: '...' }` into `Stack` or `Card`.
- **The architectural cost**:
  - Components lack native scrolling physics, cannot expose scroll position signals (`scrollTop`, `isAtBottom`), cannot support programmatic "scroll to bottom" (vital for chat logs, calculator history, and terminal emulators), and break container constraints when parents flex.

#### 5. Rich Inline Text Formatting (`Markdown`)
- **What is missing**: There is no `Span` or rich text container primitive. `Text` only accepts a primitive string or `Signal<string>`.
- **The failure**: A markdown paragraph commonly contains mixed inline formatting within a single sentence: plain text, **bold**, *italic*, `code`, and [links](url). Because `Text` cannot nest child components or inline formatting tokens, a paragraph cannot be rendered as a single flowing text node.
- **What we had to do instead**: We had to build a custom inline tokenizer that parses a string into token chunks, and render each line as a flex `Row` containing alternating micro-`Text` and `Badge` components.
- **The architectural cost**:
  - Flex `Row`s do not wrap words naturally like standard inline text. If a bold word happens to fall near the edge of the container, flexbox wraps entire token blocks awkwardly, ruining typographic baseline alignment and making natural text selection across formatting boundaries impossible.

#### 6. Hyperlinks and External Navigation (`Markdown`)
- **What is missing**: There is no `Link` or `Anchor` primitive in the vocabulary.
- **The failure**: Markdown documents frequently contain URLs (`[Mesh Web](https://flybyme.dev)`).
- **What we had to do instead**: Links had to be rendered as styled `Button` components with custom click handlers, or as styled `Text` spans.

---

### 2.2 What Needed a Primitive That Does Not Exist (The Missing Primitives)

To elevate `@flybyme/mesh-web` from a prototype vocabulary to a viable application framework, the following seven primitives must be added:

| Missing Primitive | Target DOM Element / Concept | Where It Was Desperately Needed | Proposed API Signature |
|:---|:---|:---|:---|
| **`Grid`** | CSS Grid (`display: grid`) | Calculator keypad, Chart metric matrices, Dashboard layouts | `Grid({ columns: number \| string, rows?: number \| string, gap?: number \| string }, ...children)` |
| **`TextArea`** | `<textarea>` | Markdown editor, Notes body editor, Terminal input | `TextArea({ value: Signal<string> \| string, rows?: number, placeholder?: string, onInput?: (val: string) => void, onCommit?: (val: string) => void })` |
| **`ScrollView`** | Scroll container (`overflow: auto`) | Markdown viewer, Kanban lanes, Calc history, Workbench panes | `ScrollView({ orientation?: 'vertical' \| 'horizontal' \| 'both', maxHeight?: string \| number, autoScroll?: 'bottom' \| 'top' }, ...children)` |
| **`DropZone` / `Draggable`** | HTML5 DnD or Pointer Grab | Kanban cards/columns, Workbench pane docking, Reorderable lists | `Draggable({ data: T, preview?: ViewDescription }, ...children)`<br>`DropZone({ accepts: string[], onDrop: (data: T) => void }, ...children)` |
| **`Surface`** | Tier 3 DOM / Canvas / SVG | Chart graphics, Clock analog face, Monaco/CodeMirror embed | `Surface({ setup: (el: HTMLElement) => (() => void) \| void })` |
| **`Divider`** | `<hr>` / semantic separator | Markdown horizontal rules, Toolbar segment dividers, Card headers | `Divider({ orientation?: 'horizontal' \| 'vertical' })` |
| **`Span` / `InlineText`** | `<span>` / inline text node | Markdown rich paragraphs, inline code, syntax highlights | `Span({ style?: StyleRecord, bold?: boolean, italic?: boolean }, ...children)` |

---

### 2.3 What Had to Be Abused (And What It Should Have Been)

1. **`Stack` and `Row` Abused as a Grid**:
   - *In Calculator (`src/calc/index.ts:270–345`)*: Stacking 5 `Row`s, each containing 4 `Button`s, each decorated with `style: { flex: '1 1 0', minWidth: '0' }`.
   - *In Chart (`src/chart/index.ts:320–415`)*: Laying out vertical bar columns, X-axis labels, and Y-axis scale markers using nested flexboxes.
   - *What it should have been*: A native `Grid({ columns: 4, gap: '8px' })` for Calculator, and a 2D coordinate canvas/layout for Chart.

2. **`Badge` Abused as Inline Code and Data Cells**:
   - *In Markdown (`src/markdown/index.ts:410–440`)*: Inline code tokens (e.g. `` `npm test` ``) had to be rendered as `Badge({ label: token.text, variant: 'neutral' })`.
   - *In Chart (`src/chart/index.ts:250–310`)*: Tabular data metrics and status cells were rendered using `Badge` because there is no `Table`, `TableCell`, or `Span` primitive.
   - *In Kanban (`src/kanban/index.ts:280–310`)*: Column tags and grab indicators were forced into `Badge`.
   - *What it should have been*: Inline `Code` or `Span({ code: true })` for Markdown, and a semantic `Table` or `DataGrid` primitive for Chart.

3. **`Card` Abused as Blockquote, Code Block, and Divider**:
   - *In Markdown (`src/markdown/index.ts:350–400`)*: Blockquotes (`> quote`) were rendered as `Card` with customized `borderLeft` styling. Fenced code blocks (```` ```js ````) were rendered as `Card` with monospace font styling. Horizontal rules (`---`) were rendered as empty collapsed `Card`s with a `1px` height.
   - *What it should have been*: `Blockquote`, `CodeBlock` (with pre/code formatting), and `Divider`.

4. **`Heading` Abused Across All Heading Levels (h1–h6)**:
   - In `@flybyme/mesh-web`, `Heading` is hardcoded to emit an `<h3>` tag with fixed typography.
   - *In Markdown (`src/markdown/index.ts:360–385`)*: Markdown documents declare `# h1` through `###### h6`. To visually distinguish heading levels, we had to pass inline `style: { fontSize: '...', fontWeight: '...' }` to override the static `<h3>` styling on every instance.
   - *What it should have been*: `Heading({ level: 1 | 2 | 3 | 4 | 5 | 6 })` rendering the corresponding semantic HTML heading tag.

---

### 2.4 Where `Surface` / Raw DOM Escape Hatch Was Wanted & Why

The planned A7.5 capability — `needs('dom')` and `<Surface>` — represents the Tier 3 escape hatch in Mesh's philosophy. Our audit proves that certain application classes cannot exist without this escape hatch:

1. **High-Performance Data Visualization (`src/chart/index.ts`)**:
   - *Why needed*: Constructing charts out of DOM elements creates thousands of reactive DOM nodes when rendering datasets with hundreds of points. Furthermore, interactive charts require rendering onto an HTML5 2D Canvas or WebGL context (e.g., Chart.js, D3, or raw Canvas API) for smooth 60fps animations, crosshairs, tooltips, and panning/zooming.
   - *Proposed usage*:
     ```ts
     Surface({
       setup(container) {
         const canvas = document.createElement('canvas');
         container.appendChild(canvas);
         const ctx = canvas.getContext('2d')!;
         // render high-performance chart
         return () => canvas.remove();
       }
     })
     ```

2. **Professional Code & Markdown Editing (`src/markdown/index.ts`)**:
   - *Why needed*: Single-line inputs or synthetic text blocks cannot replace a true text editor. Real markdown authoring requires syntax highlighting, line numbers, cursor and selection management, find/replace, and bracket auto-closing (e.g., embedding Monaco, CodeMirror, or an accessible `<textarea>`).
   - *Proposed usage*:
     ```ts
     Surface({
       setup(container) {
         const editor = CodeMirror(container, { mode: 'markdown', value: doc() });
         editor.on('change', () => doc.set(editor.getValue()));
         return () => editor.toTextArea();
       }
     })
     ```

3. **Physics-Driven Drag and Drop (`src/kanban/index.ts`)**:
   - *Why needed*: Native drag-and-drop requires attaching native `dragstart`, `dragover`, `drop` listeners and configuring `DataTransfer`, or using pointer capture (`setPointerCapture`) on a raw DOM element to implement fluid inertia and collision detection.

---

## 3. The Four Applications (Ordinary Report)

### 3.1 Calculator (`src/calc/index.ts`)

#### Architectural Overview
`CalcApp` is a full-featured desk calculator implementing an expression-based arithmetic engine.
- **Arithmetic Engine (`src/calc/index.ts:35–120`)**:
  - Implements an operator-precedence / shunting-yard AST tokenizer and parser.
  - Supports addition (`+`), subtraction (`-`), multiplication (`*`), division (`/`), exponentiation (`^`), unary negation (`-`), and floating-point decimal numbers.
  - Safe error handling: division by zero returns `Error: Div by 0` without crashing reactive loops.
- **Dual Input Modes**:
  - **Keypad Grid**: 20 buttons arranged in a 4x5 grid (`C`, `±`, `^`, `/`, `7`, `8`, `9`, `*`, `4`, `5`, `6`, `-`, `1`, `2`, `3`, `+`, `0`, `.`, `⌫`, `=`).
  - **Keyboard Expression Input**: A `<Form>` wrapping an `<Input>` that allows power users to type complete expressions (e.g. `(12 + 8) * 5 / 2`) and press `Enter` to evaluate directly.
- **Calculation History**:
  - Maintains a chronological log of previous calculations (`records` signal).
  - Each history item displays the formula, timestamp, and result, with a "Recall" button to load the historical result back into the active expression, and a "Clear All" button.

#### Keyboard Accessibility (`spec/input.md` §3)
- Every keypad button is keyboard-focusable with standard Space/Enter activation.
- The command broker registers 18 calculator commands (`calc.digit.0`–`calc.digit.9`, `calc.op.add`, `calc.op.sub`, `calc.op.mul`, `calc.op.div`, `calc.op.pow`, `calc.equals`, `calc.clear`, `calc.backspace`).
- Global keybindings registered via `cx.keys`: `0`–`9`, `+`, `-`, `*`, `/`, `^`, `Enter`, `Backspace`, `Escape`.
- Non-pointer users can execute calculations entirely via keyboard without touching a mouse.

---

### 3.2 Markdown Viewer (`src/markdown/index.ts`)

#### Architectural Overview
`MarkdownApp` is a split-pane markdown authoring and rendering tool.
- **Parser Architecture (`src/markdown/index.ts:30–160`)**:
  - Custom AST block parser parsing:
    - Headings: levels 1 through 6 (`# Heading`).
    - Blockquotes: single and multi-line quotations (`> quote`).
    - Lists: unordered (`* item`, `- item`) and ordered (`1. item`).
    - Fenced Code Blocks: multi-line code (` ```js ... ``` `).
    - Horizontal Rules: separators (`---`, `***`).
    - Paragraphs: standard body text.
  - Inline tokenizer parsing:
    - Bold (`**text**`), Italic (`*text*`), Inline Code (`` `code` ``), and Links (`[label](url)`).
- **Split-View Interface**:
  - **Left Pane (Composer & Tools)**: Line input with commit action, quick-insert syntax chips (H1, H2, Bold, Italic, Code, List, Quote, Divider), template loader, and clear document button.
  - **Right Pane (Preview & Stats)**: Live reactive preview rendering the parsed AST, topped by a real-time statistics bar (character count, word count, line count, block count).

#### Critical Discovery: Stale Row Scopes in `each` Loop
During development, we discovered a subtle reconciler quirk in `@flybyme/mesh-web/src/render/dom.ts`:
- When rendering the AST blocks via `each(blocks, (block, idx) => ...)`, using a static key like `block-${idx}` caused `dom.ts` to assume the item had not changed when a block's type or text changed, skipping DOM updates.
- **Resolution**: Construct content-derived keys: `${index}-${block.kind}-${block.rawText}`. This forces `dom.ts` to rebuild the row scope whenever the content or block kind mutates.

---

### 3.3 Kanban Board (`src/kanban/index.ts`)

#### Architectural Overview
`KanbanApp` implements a workflow task board modeled after modern agile boards.
- **Board Structure (`src/kanban/index.ts:35–110`)**:
  - 4 workflow lanes: `"todo"` ("To Do"), `"in_progress"` ("In Progress"), `"review"` ("In Review"), `"done"` ("Done").
  - Card records track `id`, `title`, `columnId`, `priority` (`'low'` | `'medium'` | `'high'`), and creation timestamp.
- **Task Composer & Filter**:
  - Live search input dynamically filters cards across all four columns by title match.
  - Task creation form with title input, lane dropdown/buttons, and priority selection chips.
- **Non-Pointer & Grab Interaction**:
  - **Pick-and-Drop Machine**: Clicking "Grab" sets `grabbedCardId`. Each column immediately reveals a prominent "Drop Here" target button. Clicking the target shifts the grabbed card to that column.
  - **Directional Shift Buttons**: Every card renders `←` and `→` buttons, allowing immediate lane shifting in a single click or keyboard activation.

#### Critical Discovery: Button Default Type in `<Form>`
In HTML standards and `@flybyme/mesh-web`, `<Button>` elements inside a `<Form>` default to `type="submit"`. In Kanban:
- Clicking a priority selection chip or column picker inside the composer form inadvertently triggered form submission before the user had finished entering the task title.
- **Resolution**: Explicitly specify `type: 'button'` on all non-submit interactive buttons inside forms.

---

### 3.4 Chart Visualizer (`src/chart/index.ts`)

#### Architectural Overview
`ChartApp` is an interactive data visualizer designed to test the limits of data presentation without graphic primitives.
- **Dataset Management (`src/chart/index.ts:30–95`)**:
  - 3 preloaded multi-series datasets:
    - *Monthly Revenue*: 12 monthly financial records ($k).
    - *Daily Active Users*: 10 weekly DAU snapshots (thousands).
    - *Bug Backlog*: 8 defect count snapshots across sprints.
  - Dynamic series switcher toggles between active datasets.
- **Dual Visual Projections**:
  - **Vertical Column Chart**: Columns projected vertically from a baseline, height calculated as a percentage of series maximum (`${(val / max) * 100}%`).
  - **Horizontal Bar Chart**: Horizontal bar meters projecting across the row width, allowing comparative ranking.
- **KPI Summary Cards**:
  - Calculates real-time series statistics: **Max**, **Min**, **Average**, and **Total**, rendered as prominent metric cards with colored status badges.
- **Dataset Authoring**:
  - Form with label input, numeric value input, and add button to append custom data points to the active series, with deletion controls for individual points.

---

## 4. Framework Fights & Discovered Quirks (File & Line Catalog)

During the implementation of these four applications, we encountered and worked around six specific framework fights:

### 1. HTML Button Default `type="submit"` Inside `<Form>`
- **Location**: `src/kanban/index.ts:320–360`, `node_modules/@flybyme/mesh-web/src/render/component.ts:60–75`
- **The Fight**: In `@flybyme/mesh-web`, `Button` renders as a standard `<button>` tag without defaulting `type` to `'button'`. Under standard HTML form semantics, any button inside a `<form>` without `type="button"` acts as `type="submit"`. In Kanban, clicking a lane selection button or priority chip inside the composer form prematurely fired the `Form`'s `commit` event.
- **Workaround**: Explicitly declare `type: 'button'` on all auxiliary buttons inside `<Form>` containers.

### 2. `each` Key Identity & Stale Row Caching
- **Location**: `src/markdown/index.ts:340–400`, `node_modules/@flybyme/mesh-web/src/render/dom.ts:240–280`
- **The Fight**: `dom.ts` reconciles dynamic lists in `each` by matching the key returned by the key function. When transforming markdown lines into AST nodes, using index keys (`(b, i) => `item-${i}``) caused `dom.ts` to retain the previously created row scope when the user changed a line from a paragraph to a heading. Because the key remained `item-0`, the row function was not re-run, leaving stale DOM nodes in place.
- **Workaround**: Use content-derived keys: `(b, i) => `${i}-${b.kind}-${b.rawText}``.

### 3. Input Dirty Value Flag (A7.0 Workaround)
- **Location**: `src/calc/index.ts:260–275`, `src/markdown/index.ts:285–305`, `src/kanban/index.ts:300–320`, `src/chart/index.ts:280–300`
- **The Fight**: Documented bug A7.0: `<Input>` updates value via `setAttribute('value', ...)`. The HTML DOM specification defines that once a user types in an `<input>`, the element's "dirty value flag" is set to true, and subsequent changes to the `value` attribute are ignored by the browser. Setting a reactive signal to clear the input has no effect on the visible input text.
- **Workaround**: Key the `<Input>` inside an `each` loop on a revision counter signal (`each(revision, () => Input(...))`). Incrementing the revision counter destroys and recreates the input DOM element, resetting the dirty flag.

### 4. Input Emits `activate` on Space (A7.0b Workaround)
- **Location**: `src/calc/index.ts`, `src/markdown/index.ts`, `src/kanban/index.ts`, `src/chart/index.ts`
- **The Fight**: Documented bug A7.0b: `Input`'s internal `activate` event handler fires on both `Enter` and `Space`. Listening to `activate` on a text field causes typing a space character to trigger form submission.
- **Workaround**: Avoid `activate` on text inputs. Always wrap the `Input` in a `Form` and listen to the `commit` event, which only fires on `Enter` or form submission.

### 5. `cx.windows.open` Race Condition Inside `start()` (A5.7b Workaround)
- **Location**: All four applications (`calc`, `markdown`, `kanban`, `chart`)
- **The Fight**: Documented bug A5.7b: Calling `cx.windows.open(...)` synchronously during the application's `start(cx)` phase attempts to open window instances before the window manager shell has mounted to the DOM, causing windows to fail to display.
- **Workaround**: Declare views statically on the application class (`static readonly views = { ... }`) so the test harness and window manager can inspect and mount them safely, and defer any runtime open calls with `queueMicrotask`.

### 6. Programmatic Reactivity Batching in Browser Tests
- **Location**: `test/calc.browser.test.ts`, `test/markdown.browser.test.ts`, `test/kanban.browser.test.ts`, `test/chart.browser.test.ts`
- **The Fight**: Directly invoking API methods on an application in unit tests updates reactive signals. However, `@flybyme/mesh-web` batches reactive DOM effects asynchronously. Querying the DOM immediately after calling an API method returns stale DOM state.
- **Workaround**: Import and call `flushSync()` from `@flybyme/mesh-web` immediately after programmatic mutations before performing DOM assertions.

---

## 5. Verification Matrix & Test Inventory

Every application is accompanied by a comprehensive browser test suite covering lifecycle, DOM projection, user interaction, error conditions, and accessibility:

| Test Suite | File | Tests | Status | Key Coverage Scenarios |
|:---|:---|:---:|:---:|:---|
| **Calculator** | `test/calc.browser.test.ts` | 8 | Pass | Boot/API provision, DOM keypad rendering, arithmetic parsing, decimals/backspace, direct keyboard formula input via Form commit, division by zero, history recall and clear, static class declarations. |
| **Markdown** | `test/markdown.browser.test.ts` | 7 | Pass | Boot/API provision, split-pane DOM rendering, line input and live AST preview updates, quick-insert syntax chips, inline formatting (bold/italic/code), document statistics bar, static class declarations. |
| **Kanban** | `test/kanban.browser.test.ts` | 8 | Pass | Boot/API provision, 4-column lane rendering, non-pointer directional lane shifts (`←`/`→`), task composer form, pick-and-drop grab/drop state machine, live search filter, card deletion, static class declarations. |
| **Chart** | `test/chart.browser.test.ts` | 7 | Pass | Boot/API provision, column/bar DOM rendering, series switching (Revenue, Users, Backlog), KPI metrics calculation, vertical/horizontal projection toggling, data point addition, static class declarations. |
| **Workbench** | `test/workbench.browser.test.ts` | 9 | Pass | Multi-window IDE workbench, process isolation, layout tree, keybindings, persistence. |
| **Notes** | `test/notes.browser.test.ts` | 7 | Pass | Notes list, editor, stats view, search filter, selection. |
| **Clock** | `test/clock.browser.test.ts` | 6 | Pass | Clock face, stopwatch laps, countdown timer presets, 12h/24h toggle. |
| **Palette** | `test/palette.browser.test.ts` | 7 | Pass | Theme switching, token editor, live CSS variable updates. |
| **Theme** | `test/theme.browser.test.ts` | 5 | Pass | Theme extension provider, theme registration, CSS variable injection. |
| **Whoami** | `test/whoami.browser.test.ts` | 8 | Pass | Identity contract, multi-org switching, auth extension integration. |
| **TOTAL** | **10 Suites** | **72** | **ALL GREEN** | **Zero type errors, zero illegal casts.** |

---

## 6. Conclusion

Dispatch 5 accomplished its mission: by building four real, fully functional applications across four vastly different problem spaces, we completed the **Component Vocabulary Audit** for `@flybyme/mesh-web`.

The eleven primitives (`Stack`, `Row`, `Text`, `Heading`, `Button`, `Input`, `Form`, `List`, `ListItem`, `Card`, `Badge`) provide a surprisingly capable foundation for simple administrative forms and static lists. However, when pushed into coordinate graphics (`Chart`), spatial drag-and-drop (`Kanban`), long-form document editing (`Markdown`), or dense tabular matrices (`Calculator`), the vocabulary runs out of expressive power.

Addressing these gaps requires two architectural steps:
1. Adding the essential layout and control primitives (`Grid`, `TextArea`, `ScrollView`, `Divider`, `Span`).
2. Implementing the Tier 3 escape hatch (`needs('dom')` and `<Surface>`) to empower graphics, rich text editors, and continuous pointer interactions.
