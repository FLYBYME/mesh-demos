# Result: Theme Extension & Palette Application (Dispatch 2)

## 1. How the Provider Graph Behaved Across Two Artifacts

In this dispatch, `theme` (Extension) and `palette` (Application) were built as two completely decoupled parts in `src/theme/` and `src/palette/`. Neither part imports the other; only `src/shared/theme.ts` is shared source.

The provider graph mediation followed the architecture specified in `spec/kernel.md` §3 and §4:
1. **Manifest Inspection (Boot Steps 3–4):**
   The kernel constructs both contributions and reads their manifest declarations:
   - `ThemeExtension` declares `provides: THEME_TOKEN` and `needs('state', 'log', 'commands')`.
   - `PaletteApp` declares `consumes: consumes(THEME_TOKEN)` and `needs('state', 'commands', 'windows', 'log')`.
2. **Provider Graph Ordering (Boot Step 6):**
   In `node_modules/@flybyme/mesh-web/src/kernel/kernel.ts:145`, `resolveOrder` orders extensions by `consumes` against `provides`.
3. **Extension Activation (Boot Step 7):**
   Extensions activate before any Application runs. `ThemeExtension.activate(cx)` runs, registers its command implementations, applies the CSS custom properties to `document.documentElement.style`, and synchronously returns `ThemeApi`. The kernel stores this API in its internal `#providers` map (`kernel.ts:183`).
4. **Application Start (Boot Step 10):**
   When `PaletteApp` is started via `kernel.start('palette')`:
   - An instance context (`pid: 'p1'`) is built by `createContext`.
   - `PaletteApp.start(cx)` calls `cx.use(THEME_TOKEN)`.
   - `createContext` verifies that `THEME_TOKEN.id` is present in `declaredConsumes` (`broker.ts:282`).
   - `kernel.#resolve(pid, THEME_TOKEN)` retrieves the `ThemeApi` instance from `#providers.get('theme')`.
   - `PaletteApp` receives a fully-typed `ThemeApi` with zero runtime coupling or direct imports between the two parts.

---

## 2. Whether a Shared Token in `src/shared/` Really Did Resolve

**Yes, the shared token resolved cleanly and fully.**

This was the critical load-bearing assumption tested in this dispatch:
- `THEME_TOKEN` is declared in `src/shared/theme.ts`:
  ```ts
  export const THEME_TOKEN: ProviderToken<ThemeApi> = provider<ThemeApi>('theme');
  ```
- At runtime in `node_modules/@flybyme/mesh-web/src/contribution/provider.ts`:
  ```ts
  export function provider<T>(id: string): ProviderToken<T> {
      return { id };
  }
  ```
  A `ProviderToken` is a plain JavaScript object `{ id: string }` carrying the phantom type `[PROVIDED]?: T`.
- In `node_modules/@flybyme/mesh-web/src/kernel/kernel.ts:183` and `201–207`:
  ```ts
  // Registration:
  this.#providers.set(contribution.provides.id, api);

  // Resolution:
  return this.#providers.get(token.id);
  ```
- Because the kernel stores and resolves providers strictly by `token.id` string equality rather than object reference identity (`===`), two separate evaluation copies of `src/shared/theme.ts` in separate artifacts resolve to the exact same provider entry in the kernel.
- TypeScript's phantom symbol `[PROVIDED]?: T` provides end-to-end compile-time type safety for `cx.use(THEME_TOKEN)` without requiring either artifact to import from the other at runtime.

---

## 3. What Happens When a Consumer's Provider is Missing

We verified both runtime and compose-time behavior when `palette` is composed without `theme`:

### A. Runtime Behavior (Observed in `test/palette.browser.test.ts`)
When `PaletteApp` is mounted without `ThemeExtension`:
```ts
const site = await mountPart({
    parts: [{ id: 'palette', contribution: PaletteApp }],
});
```
1. At boot step 10, the kernel attempts to start `palette`.
2. Inside `PaletteApp.start(cx)`, `cx.use(THEME_TOKEN)` is called.
3. Because `THEME_TOKEN` was declared in `consumes`, the capability broker allows the call and delegates to `kernel.#resolve(pid, token)`.
4. In `node_modules/@flybyme/mesh-web/src/kernel/kernel.ts:201`:
   ```ts
   if (!this.#providers.has(token.id)) {
       throw new Error(
           `${consumerId} asked for provider "${token.id}", which is not available. ` +
           `Its Extension may have failed to activate.`
       );
   }
   ```
5. `kernel.start(applicationId)` catches this error (`kernel.ts:266`):
   - The context handle is disposed.
   - `entry.state` is set to `'failed'`.
   - `entry.error` is set to the caught Error (`p1 asked for provider "theme", which is not available. Its Extension may have failed to activate.`).
6. `open()` in `start.ts:362` logs the error to `services.logs`:
   `{ level: 'error', source: 'palette', message: 'did not start', data: process.error }`
7. **The page and kernel do NOT crash.** `started.ready` resolves normally.
8. The process table retains the process in `'failed'` state with the legible error message, and zero windows are opened for `palette`.

### B. Compose-Time Behavior (Validated via `mesh-serve`'s `checkComposition`)
In `mesh.json`, `palette` declares:
```json
"requiredParts": [
    {
        "id": "theme",
        "version": "^0.1.0"
    }
]
```
When `checkComposition` runs (`mesh-serve/src/cdn/methods/release.ts:77`):
- When `theme` is missing from `present`:
  `problems.push({ kind: 'missing_part', message: 'palette requires "theme" (^0.1.0) and this release has none.' })`
- `isFatal()` evaluates `missing_part` to `true`.
- **Result:** Deployment is refused at compose time, preventing a broken composition from ever being published.

---

## 4. Every Place the Framework Fought Us (File and Line)

### 1. `storage` capability does not exist in `CapabilityMap`
- **File & Line:** `node_modules/@flybyme/mesh-web/src/contribution/capabilities.ts:260` (and `dist/contribution/capabilities.d.ts:232, 253`)
- **The Conflict:** The prompt required: *"Persistence through the storage capability, not localStorage directly."* However, `capabilities.ts:260` explicitly states:
  ```ts
  // `mesh`, `events`, `keys`, `menus`, `models` and `storage` are specified and not yet built (spec/roadmap.md A3).
  // They are absent here rather than present-and-throwing: a name that resolves to a broken object is worse than
  // one that does not resolve, because the compile error is the point.
  ```
  `CapabilityName` is `keyof CapabilityMap | 'mesh'`. `'storage'` is not in `CapabilityMap`. Writing `needs('storage')` produces a hard TypeScript compilation error (`Argument of type '"storage"' is not assignable to parameter of type 'CapabilityName'`).
- **Workaround:** To avoid touching `localStorage` directly (and avoid any `as` casts), we used the framework's own `StorageProvider` abstraction (`localProvider()` from `@flybyme/mesh-web/registry/providers.js:235`). All persistence reads and writes route through `StorageProvider.read('theme', 'config')` and `StorageProvider.write('theme', 'config', ...)`.

### 2. `Extension.activate` is strictly synchronous
- **File & Line:** `node_modules/@flybyme/mesh-web/src/contribution/contract.ts:167` & `src/kernel/kernel.ts:180`
- **The Conflict:** `activate(cx: Context<TNeeds, TConsumes>): ApiOf<TProvides>` is synchronous. In `kernel.ts:180`, `const api = contribution.activate(handle.context);` is called without `await`. If `activate` is made `async`, `api` stored in `#providers` becomes a `Promise`, causing consumers calling `cx.use(TOKEN)` to receive a `Promise<ThemeApi>` rather than `ThemeApi`.
- **Workaround:** `ThemeExtension.activate` constructs signals and synchronously applies default/initial CSS variables to `document.documentElement.style`, then asynchronously reconciles and hydrates from `StorageProvider.read()`.

### 3. Extensions are never deactivated
- **File & Line:** `node_modules/@flybyme/mesh-web/spec/extension.md:337` & `src/kernel/start.ts:246`
- **The Conflict:** `spec/extension.md` explicitly decides that Extensions activate once and are never deactivated. `started.dispose()` cleans up the page DOM, but does not call `cx.onDispose` on Extensions. In tests, assuming `site.dispose()` removes the custom CSS properties set on `document.documentElement` caused an assertion failure.
- **Workaround:** Browser tests reset `document.documentElement.style.removeProperty(name)` in `afterEach`.

### 4. `Input` cannot be controlled (DOM dirty value flag, roadmap A7.0)
- **File & Line:** `node_modules/@flybyme/mesh-web/src/render/dom.ts:130–139`
- **The Conflict:** Once a user types into an HTML `<input>`, the browser sets the internal dirty value flag. Setting `value` via `setAttribute` does not update the displayed text.
- **Workaround:** Wrapped the `Input` in `each(() => [vx.app.draftRevision()], (rev) => rev, () => element('Input', ...))`. Incrementing `draftRevision` forces `each` to unmount and mount a fresh `<input>` DOM node, resetting the dirty flag.

### 5. `activate` fires on Space in text fields (roadmap A7.0b)
- **File & Line:** `node_modules/@flybyme/mesh-web/src/render/dom.ts:360`
- **The Conflict:** Space keypress fires the `activate` intent on elements with `intents.activate`. Putting `activate` on an `<input>` breaks typing spaces in values like `'rgba(0, 0, 0, 0.35)'`.
- **Workaround:** Used `change: { action: command(...) }` on `<input>` and `commit` on `<form>`, reserving `activate` strictly for buttons.

### 6. `cx.windows.open` inside `start()` renders against undefined API (roadmap A5.7b)
- **File & Line:** `node_modules/@flybyme/mesh-web/src/kernel/kernel.ts:259`
- **The Conflict:** Calling `cx.windows.open()` synchronously within `start()` triggers immediate view rendering before `start()` has resolved, so `entry.api` on the process entry is still undefined.
- **Workaround:** Deferred initial window opening using `queueMicrotask(() => { cx.windows.open(...); })`.

### 7. `each` render callback passes accessors `() => T`, not raw items
- **File & Line:** `node_modules/@flybyme/mesh-web/src/description/build.ts:76`
- **The Conflict:** In `each(items, key, render)`, the `render` signature is `(item: () => T, index: () => number) => Node`. Calling `.slice()` directly on `tokenName` fails typecheck because `tokenName` is `() => ThemeTokenName`.
- **Workaround:** Call `tokenName()` within the render callback to obtain the concrete item value.

### 8. `style` prop object cannot contain signal properties
- **File & Line:** `node_modules/@flybyme/mesh-web/src/render/component.ts:93–99`
- **The Conflict:** Passing `{ style: { background: () => signal() } }` is rejected by TypeScript because object style property values must be `Json` primitives (`string | number`).
- **Workaround:** Defined the entire `style` prop as an accessor returning the style object: `style: () => ({ background: vx.app.tokens()[tokenName()] })`.

---

## 5. Verification Checklist

- [x] `src/theme/index.ts` written as an Extension providing `THEME_TOKEN`.
- [x] `src/palette/index.ts` written as an Application consuming `THEME_TOKEN`.
- [x] Neither part imports the other part's directory (only `src/shared/theme.ts` is common).
- [x] `mesh.json` updated with `theme` (extension, 0.1.0) and `palette` (application, 0.1.0, `requiredParts: [{ id: "theme", version: "^0.1.0" }]`).
- [x] Page restyling drives `kernel.css` CSS custom properties (`--page`, `--surface`, `--accent`, `--ink`, etc.).
- [x] Tested missing provider behavior: fails cleanly with legible error, no crash.
- [x] `npm run typecheck` clean, 0 errors, 0 casts (`grep -rn " as " src/ test/` returned 0 casts in code).
- [x] `npm run test:browser` clean, 25/25 tests passing across all 4 test suites (`clock`, `notes`, `theme`, `palette`).
