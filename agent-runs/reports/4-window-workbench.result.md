# Result: Window Manager & Multi-Window Workbench Application (Dispatch 4)

## 1. Executive Summary & Verification State

In this dispatch, we built the **Workbench Application** (`src/workbench/index.ts`), an application designed specifically to push the `@flybyme/mesh-web` window manager and its surrounding subsystem to its limits.

### Artifacts Built & Delivered
1. **`src/workbench/index.ts`**:
   - A multi-window IDE workbench implementing five distinct view declarations (`explorer`, `editor`, `terminal`, `inspector`, `monitor`).
   - Supports multi-instance views with distinct parameters, titles, and isolated state (multiple editors editing different documents, multiple independent terminal sessions).
   - Declares a full split-pane tiled layout tree (`WORKBENCH_LAYOUT`) with fixed-width sidebars (`px: 260`), flexible content columns (`size: 4`, split into editor ratio 3 and terminal ratio 2), and fixed inspector drawer (`px: 280`).
   - Implements 19 commands and 5 global keybindings (`ctrl+m`, `ctrl+w`, `ctrl+]`, `ctrl+[`, `ctrl+s`).
   - Provides the public `WorkbenchApi` via provider token `WORKBENCH`.
2. **`mesh.json`**:
   - Registered `workbench` as `kind: "application"`, `version: "0.1.0"`, `entry: "src/workbench/index.ts"`.
3. **`test/workbench.browser.test.ts`**:
   - 9 comprehensive browser test scenarios covering multi-instance views, process isolation, runtime mode switching, policy locking, persistence mechanics, window management operations (focus, raise, min/max/restore, resize, drag), keyboard paths, and occlusion defect confirmation.

### Verification Results
- **`npm run typecheck`**: Clean (0 errors).
- **Type Safety**: **Zero casts** (`as any`, `as never`, `as unknown as` strictly avoided throughout `src/workbench/index.ts` and its test suite).
- **`npm run test:browser`**: **42 / 42 tests passing green** across all 6 test suites:
  - `test/workbench.browser.test.ts`: 9/9 passed.
  - `test/notes.browser.test.ts`: 7/7 passed.
  - `test/clock.browser.test.ts`: 6/6 passed.
  - `test/palette.browser.test.ts`: 7/7 passed.
  - `test/theme.browser.test.ts`: 5/5 passed.
  - `test/whoami.browser.test.ts`: 8/8 passed.

---

## 2. What the Window Manager Does Well, and What It Cannot Express

### Architectural Strengths

1. **Decoupled Reactive Geometry**:
   `WindowManager` (`@flybyme/mesh-web/src/window/manager.ts`) does not manipulate DOM elements directly. It maintains pure reactive signals for `windows()`, `order()`, `mode()`, and `focused()`. The view rendering layer (`mountShell`) simply observes these signals and projects them into CSS transforms and z-indices.

2. **Duality of `rectOf` (Windowed vs. Tiled Coordinates)**:
   A major design triumph is `manager.rectOf(id)`:
   - In **windowed mode**, it returns the window record's individual `rect` (the position chosen by cascade or user drag).
   - In **tiled mode**, it calculates the tile bounding box from the layout tree (`tileRects(layout, viewport)`), leaving `record.rect` untouched.
   - When switching from windowed to tiled and back to windowed, windows immediately snap back to their exact pre-tiled coordinates without needing explicit restoration bookkeeping.

3. **Tile Occupant Resolution**:
   In tiled mode, a tile slot holds only one view at a time. When multiple window instances target the same tile slot (e.g., multiple editors targeting tile `'editor'`), `manager.visible()` resolves occupants by stacking order: the most recently focused window occupies the tile. Other instances are hidden from view without being destroyed, preserving full view state and process handles.

4. **Process-Bound Window Ownership**:
   Every window record has an `owner: string` representing the process PID (e.g. `'p1'`, `'p2'`). When a process terminates (`kernel.stop(pid)`), the kernel automatically invokes `services.windows.closeOwnedBy(pid)`. All windows created by that process are destroyed while windows owned by other processes remain completely intact.

### What the Window Manager Cannot Express

1. **Dynamic / Interactive Tiled Layouts**:
   The layout tree (`LayoutNode`) is completely static. The framework provides no facility for draggable splitters between panes, dynamic docking/snapping, drag-to-split, or adding/removing tiles at runtime. Panes are fixed to whatever proportions were declared at application compile time.

2. **Multi-Tab Panes within Tiles**:
   A tile slot can only host a single window occupant. There is no built-in tab bar, window switcher, or pane-level header for tiles hosting multiple views. Applications must either implement their own custom tab bar inside the view description or rely on external commands/shortcuts to switch active documents.

3. **Window Hierarchies, Modals, and Transient Sheets**:
   All windows exist as flat peers in the z-stack. The window manager cannot express modal dialogs attached to a parent window, tool palettes that follow a document window, or transient sheets that disable interaction with a parent.

4. **Instance-Aware Geometry Persistence**:
   The schema for `windowGeometry` (`persistence.ts:15-22`) stores:
   ```ts
   { view: string, x: number, y: number, width: number, height: number, state: WindowState }
   ```
   Notice that the identifier is solely `view`. There is no field for `params`, `title`, or an instance identifier. If an application opens multiple instances of `editor` (e.g. `main.ts` and `config.json`), persistence saves multiple entries with `view: 'editor'` with no way to correlate which saved geometry belongs to which document upon reload.

5. **Minimized Window Representation (Lack of Taskbar / Dock)**:
   In `manager.ts:76`, minimized windows are simply omitted from `manager.visible()`:
   ```ts
   if (this.mode() === 'windowed')
       return stacked.filter((w) => w.state !== 'minimized');
   ```
   The framework provides no taskbar, dock, or icon shelf. When a user clicks the minimize button on a window, the window completely vanishes from the DOM. Unless the application or chrome builds its own taskbar or inspector, a minimized window cannot be restored by a pointer user.

---

## 3. Whether "Every Action Has a Non-Pointer Path" Actually Holds

In `spec/input.md` §3, the specification states:
> *"Every pointer action has a non-pointer path — a keybinding, a command palette entry, an accessibility action, or a keyboard focus transition."*

In practice, this promise **fails significantly** in the current window manager implementation (`mesh-web` v0.6.3):

### Where Non-Pointer Paths Work
- **Global Application Keybindings**: `cx.keys` properly maps shortcuts (`ctrl+m`, `ctrl+w`, `ctrl+]`, `ctrl+[`, `ctrl+s`) through `dispatchKey` to command executions.
- **Programmatic Window Operations**: Window actions (focus, next/prev cycle, minimize, maximize, restore, cascade, close) can be driven through the command broker or palette.

### Where Non-Pointer Paths Fail Completely

1. **Window Moving / Repositioning is Pointer-Only (`shell.ts:167–175`)**:
   Moving a window is wired exclusively through `titlebar.onpointerdown` and `setPointerCapture`:
   ```ts
   titlebar.addEventListener('pointerdown', (e) => {
       // captures pointer and executes manager.move(record.id, dx, dy)
   });
   ```
   There is zero keyboard navigation for moving windows (no arrow key modes, no grid positioning commands, no numpad snapping). A user without a pointing device cannot move a window in windowed mode.

2. **Window Resizing is Pointer-Only (`shell.ts:192–208`)**:
   Window resizing is implemented by mounting 8 `<div class="resize-grip ...">` elements listening to `pointerdown`.
   - The resize grips have no `tabindex`, no `role`, and no keyboard event handlers (`keydown`).
   - There are no keyboard shortcuts or commands to adjust window dimensions incrementally.

3. **DOM Keyboard Focus Does Not Raise Windows (`shell.ts:127–142`)**:
   In `mountShell`:
   ```ts
   windowEl.addEventListener('pointerdown', () => {
       manager.focus(record.id);
   });
   ```
   The shell only listens for `pointerdown` to focus and raise a window. If a keyboard user presses `Tab` or `Shift+Tab` to move focus into an `<input>` or `<button>` inside an unfocused window:
   - The browser moves DOM focus to the element.
   - However, `manager.focus(record.id)` is **never called** because `focusin` is not listened to.
   - Consequently, `manager.focused()` remains pointing to the previous window, and the newly focused window remains buried in the z-stack underneath occluding windows.

4. **Window Chrome Controls Lack Non-Pointer Accessibility**:
   The minimize, maximize, and close buttons rendered in `defaultFrame` (`shell.ts:219-245`) are basic SVG icons attached to `pointerdown` without accessible keyboard focusability (`tabindex="0"`) or ARIA labels.

---

## 4. Whether Persistence Restored What It Claimed To

`spec/storage-and-registry.md` §7 and `roadmap.md` (A2.5, D5) claim that window geometry and mode are automatically remembered in the `device` hive across page reloads.

In testing and reviewing `@flybyme/mesh-web` v0.6.3, we discovered that **persistence in `start.ts` does not work at all out of the box**.

### Critical Discoveries & Framework Bugs

1. **`start.ts:84` Drops the Persistence Instance**:
   In `@flybyme/mesh-web/src/kernel/start.ts:84`:
   ```ts
   windowPersistence({ manager, registry: settings, application: composition.application });
   ```
   The return value (`{ watch, restore, setMode, modePolicy }`) is completely ignored!
   - `watch()` is never called. Therefore, changes to window positions and modes during runtime **never schedule a write** to `localStorage`.
   - `restore()` is never called. Therefore, when a page loads or reloads, saved settings are **never read** into `WindowManager`.

2. **`restore()` Does Not Restore Geometry (`persistence.ts:92–97`)**:
   Even when `persistence.restore()` is manually invoked:
   ```ts
   async restore() {
       await registry.ready(geometry);
       await registry.ready(mode);
       manager.setMode(registry.read(mode)());
       return registry.read(geometry)();
   }
   ```
   `restore()` sets the mode via `manager.setMode(...)`, but it only *returns* the remembered geometry array to the caller! In `mesh-web` v0.6.3, `WindowManager` lacks any `restoreGeometry` or `place` method, and `start.ts` contains no logic to apply the returned geometry back to open windows. Upon reload, windows always cascade from default coordinates.

3. **Storage Key Encoding**:
   The backing provider for the `device` hive is `localProvider()` (`providers.ts:142`). Keys in `localStorage` are structured as:
   ```
   ${LOCAL_PREFIX}${namespace}\u0000${path}
   ```
   Where `LOCAL_PREFIX` is `'mesh-web:'`, `namespace` is the application ID (`'workbench'`), and `\u0000` is the NUL byte separator. The actual key in `localStorage` is:
   ```
   mesh-web:workbench\u0000window-manager/geometry/workbench
   ```
   Attempting to look up `device:window-manager/...` or `window-manager/...` yields `null`.

4. **Policy Locking Behavior**:
   When a build policy is specified (`policy: { 'window-manager/mode/workbench': 'tiled' }`):
   - Because `start.ts` does not call `restore()`, the manager initially boots into the default `'windowed'` mode.
   - However, the policy is correctly locked in the settings registry (`site.settings.resolution(mode)().locked === true`).
   - When `persistence.restore()` is executed, `manager.setMode` is called with `'tiled'`, and subsequent attempts to switch back to `'windowed'` via `persistence.setMode('windowed')` correctly reject with `SettingLocked`.

---

## 5. The Occlusion Defect in Practice

### How Occlusion Works in `mountShell`
In windowed mode, `mountShell` renders each window into a `<div class="window-shell">` container positioned via `transform: translate(x, y)` and stacked via `z-index`.

```html
<div class="window-shell" style="z-index: 2; transform: translate(120px, 120px); width: 500px; height: 420px;">
    <div class="window-frame">...</div>
    <div class="window-content">...</div>
</div>
```

### What Happens When Windows Overlap
1. **Pointer Event Interception by Foreground Window**:
   When Window B cascades over Window A, Window B occupies a higher z-index (e.g. z-index 2 vs z-index 1).
   - Any pointer click in the rectangular bounding box of Window B is captured by Window B's DOM hierarchy.
   - If Window A has an interactive element (such as an editor action button or input field) situated underneath Window B's content pane, clicking that location will click Window B instead.
   - Window B receives `pointerdown`, which invokes `manager.focus(B.id)` and raises Window B.
   - The underlying button in Window A receives **no pointer events whatsoever**.

2. **Simultaneous Action and Window Raise on Partially Occluded Windows**:
   If Window A is partially occluded but the specific target button is exposed:
   - Clicking the exposed button in Window A triggers the button's action (`click` event).
   - Simultaneously, the `pointerdown` event bubbles up to Window A's `.window-shell`, triggering `manager.focus(A.id)` and raising Window A to the top of the z-stack.
   - While this allows interacting with background controls in one click, it can cause unintended visual disorientation if an accidental click raises an enormous background window that completely obscures the previous foreground context.

---

## 6. Every Place the Framework Fought Us (File & Line Catalog)

During implementation and test development, several friction points and bugs in `@flybyme/mesh-web` were uncovered:

### 1. Multi-Process Command Collision (`broker.ts:224–226`)
- **Location**: `node_modules/@flybyme/mesh-web/src/kernel/broker.ts`, lines 208–226.
- **Problem**: When starting a second instance of an Application (`kernel.start('workbench')` creating process `p2`), the second process executes `start(cx)` and registers its commands via `cx.commands.implement(id, ...)`. In `broker.ts:224`:
  ```ts
  if (services.commands.has(id)) {
      throw new Error(`Command "${id}" already has an implementation.`);
  }
  ```
  The broker throws an uncaught error, causing `p2` to crash into state `'failed'`.
- **Resolution in Workbench**: Wrapped all command implementations in a safe guard (`implementSafe`) with a `try/catch` block so subsequent process instances boot cleanly.

### 2. Missing `manager.setLayout` in Framework Boot (`start.ts`)
- **Location**: `node_modules/@flybyme/mesh-web/src/kernel/start.ts`.
- **Reference**: Documented as an open defect in `spec/roadmap.md:1248`.
- **Problem**: `start.ts` gathers manifests and initializes `WindowManager`, but **never** passes the application's declared layout tree (`part.contribution.layout`) to `manager.setLayout(...)`. As a result, `manager.layout()` is `undefined` by default on all mounted applications. Calling `manager.setMode('tiled')` causes `manager.rectOf(...)` to return `undefined` and `manager.visible()` to return `[]`.
- **Resolution in Workbench & Tests**: Exposed `static readonly layout = WORKBENCH_LAYOUT` on `WorkbenchApp` and called `site.manager.setLayout(WorkbenchApp.layout)` explicitly in test suites.

### 3. Discarded `windowPersistence` (`start.ts:84`)
- **Location**: `node_modules/@flybyme/mesh-web/src/kernel/start.ts`, line 84.
- **Problem**: `start.ts` invokes `windowPersistence(...)` without capturing the return object. `watch()` is never scheduled, and `restore()` is never run. Window geometry changes are never persisted to `localStorage`, and reload geometry is never restored.
- **Resolution**: Identified the defect and thoroughly validated both the broken out-of-the-box behavior and the working `windowPersistence` mechanism under direct invocation in `test/workbench.browser.test.ts`.

### 4. Incomplete Geometry Restoration in `persistence.ts` (`persistence.ts:92–97`)
- **Location**: `node_modules/@flybyme/mesh-web/src/window/persistence.ts`, lines 92–97.
- **Problem**: `persistence.restore()` reads remembered geometry from the registry and returns it, but never applies it to open windows. `WindowManager` in `v0.6.3` lacks any API to restore or place windows from remembered records.

### 5. Keyboard Focus Does Not Raise Windows (`shell.ts:127–142`)
- **Location**: `node_modules/@flybyme/mesh-web/src/window/shell.ts`, lines 127–142.
- **Problem**: Only `pointerdown` triggers `manager.focus(id)`. Navigating into a window using the keyboard (`Tab`) does not raise the window or update `manager.focused()`, violating keyboard accessibility and non-pointer parity (`spec/input.md` §3).

### 6. Missing `windowId` on `ViewContext` (`capabilities.ts`)
- **Location**: `node_modules/@flybyme/mesh-web/src/contribution/capabilities.ts`.
- **Problem**: When rendering a view, `ViewContext` (`vx`) receives `params`, `state`, `commands`, and `log`, but does not provide the `windowId` of the window hosting the view. Views that need to close or resize their own window cannot identify themselves without external tracking.
