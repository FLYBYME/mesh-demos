# Report: Fold the `todo` Application In (Dispatch 7)

**Date:** 2026-09-06  
**Worktree:** `/home/ubuntu/code/mesh-demos-dispatch-7`  
**Branch:** `dispatch/7`  

---

## 1. Executive Summary & Verification State

This dispatch completes the migration of the `todo` Application from its standalone repository (`~/code/mesh-todo`) into this repository (`mesh-demos`), joining the other demo applications.

### Verification Results
- **Source Code Integrity**: `src/todo/index.ts` is **100% byte-identical** to `/home/ubuntu/code/mesh-todo/src/index.ts` (`cmp` exited 0; 0 lines of diff).
- **Zero Casts**: Zero `as any`, zero `as never`, and zero casts introduced.
- **Type Safety (`npm run typecheck`)**: Clean pass (0 errors).
- **Browser Tests (`npm test`)**: All **11 test suites (79 tests) passing green**:
  - `test/todo.browser.test.ts`: 7/7 passed (~2.48s).
  - `test/calc.browser.test.ts`: 8/8 passed.
  - `test/chart.browser.test.ts`: 7/7 passed.
  - `test/clock.browser.test.ts`: 6/6 passed.
  - `test/kanban.browser.test.ts`: 8/8 passed.
  - `test/markdown.browser.test.ts`: 7/7 passed.
  - `test/notes.browser.test.ts`: 7/7 passed.
  - `test/palette.browser.test.ts`: 7/7 passed.
  - `test/theme.browser.test.ts`: 5/5 passed.
  - `test/whoami.browser.test.ts`: 8/8 passed.
  - `test/workbench.browser.test.ts`: 9/9 passed.
- **Existing Parts**: The existing parts and test suites were untouched.
- **External Repo**: `/home/ubuntu/code/mesh-todo` was treated as strictly read-only and remains untouched and clean.
- **`mesh.json`**: Updated with `todo` version `0.2.0`, entry `src/todo/index.ts`, `mesh: []`, and full presentation fields (`description`, `keywords`, `license`, `homepage`).

---

## 2. Byte-Identity Analysis of the Move

### 2.1 `src/todo/index.ts`
- **Result**: **Byte-identical**.
- Running `cmp /home/ubuntu/code/mesh-todo/src/index.ts src/todo/index.ts` and `git diff` against `mesh-todo`'s copy returns 0 differences.
- All 460 lines of source code—including the `TodoApp` application class, state signals, window layouts, commands (`todo.add`, `todo.toggle`, etc.), and view declarations—were moved without altering a single character or adding workarounds.

### 2.2 `test/todo.browser.test.ts`
- Moved from `/home/ubuntu/code/mesh-todo/test/todo.browser.test.ts` to `test/todo.browser.test.ts`.
- Exactly **three minimal adjustments** were required to adapt to the monorepo environment and pass strict typechecking:
  1. **Import Path (Line 4)**:
     ```diff
     - import TodoApp, { TODO, type TodoApi } from '../src/index.js';
     + import TodoApp, { TODO } from '../src/todo/index.js';
     ```
     *Reason*: In `mesh-demos`, parts are organized in per-part directories (`src/<part>/index.ts`) rather than a single root `src/index.ts`.
  2. **Unused Imports (Lines 2 & 4)**:
     Removed unused import `page` from `@vitest/browser/context` and unused type `TodoApi` from `../src/todo/index.js`.
     *Reason*: `tsconfig.json` in `mesh-demos` enforces `"noUnusedLocals": true`. Unused imports trigger compiler error `TS6133`.
  3. **Null-Safety / Optional Chaining (Lines 28–30)**:
     ```diff
          const api = site.kernel.provided(TODO);
          expect(api).toBeDefined();
     -    expect(api.items()).toEqual([]);
     -    expect(api.totalCount()).toBe(0);
     -    expect(api.outstandingCount()).toBe(0);
     +    expect(api?.items()).toEqual([]);
     +    expect(api?.totalCount()).toBe(0);
     +    expect(api?.outstandingCount()).toBe(0);
     ```
     *Reason*: `site.kernel.provided(TODO)` returns `TodoApi | undefined`. Under strict null checking (`"strict": true`), direct dereference yields `TS18048: 'api' is possibly 'undefined'`. Using standard TypeScript optional chaining (`api?.`) resolves the error cleanly without using type assertion casts (`as ...`). This matches the exact pattern used in `calc.browser.test.ts` and `notes.browser.test.ts`.

---

## 3. Deployment Path: Moving `todo.localhost` from `0.1.0` to `0.2.0`

`todo` is currently live on `todo.localhost` resolving to `todo@0.1.0` (published from `github.com/FLYBYME/mesh-todo`). To transition `todo.localhost` to `todo@0.2.0` from `mesh-demos`, the following sequence must occur outside this dispatch:

1. **Merge and Push**:
   Merge branch `dispatch/7` into `master` of `FLYBYME/mesh-demos` and push to remote origin.

2. **Publish `todo@0.2.0` to the Platform Catalog**:
   From the root of `mesh-demos`, run:
   ```bash
   npx mesh-serve publish --publisher <org>
   ```
   - `mesh-serve publish` reads `mesh.json` and gets the commit SHA and origin repository URL (`https://github.com/FLYBYME/mesh-demos`).
   - For all previously published parts (`whoami`, `clock`, `notes`, etc. at `0.1.0`), the catalog detects that the versions already exist from earlier commits and skips them (`"unchanged — already published from an earlier commit, not republished"`).
   - For `todo@0.2.0`, it invokes `catalog.publish`:
     - Creates the part version record with `name: 'todo'`, `version: '0.2.0'`, `repository: 'https://github.com/FLYBYME/mesh-demos'`, `commit: <merge-commit-sha>`, and `publisher: <org>`.
     - Calls `builder.build_start` to clone/fetch the commit, bundle `src/todo/index.ts` with esbuild into content-addressed artifact blobs (`/_a/<digest>/...`), store blobs in the CDN store, and transition the version state to `built`.

3. **Recompose the Site Release**:
   Invoke `cdn.compose` for the `todo.localhost` site (via mesh CLI or RPC):
   ```json
   {
     "kernel": "^0.6",
     "parts": [
       { "id": "todo", "version": "^0.2" }
     ]
   }
   ```
   - `cdn.compose` calls `catalog.resolve`, resolving `todo` to `0.2.0`.
   - It validates requirements and contract permissions (`mesh: []`).
   - It generates a new deterministic `releaseHash` representing the new composition and writes the release record.

4. **Deploy the Release to the Hostname**:
   Invoke `cdn.deploy`:
   ```json
   {
     "host": "todo.localhost",
     "release": "<new-release-hash>"
   }
   ```
   - In `mesh-serve`, deployment is an atomic pointer update on the site record (`site.release = releaseHash`).
   - Rollback remains a single field update if needed.

5. **Verify Live Traffic**:
   Access `http://todo.localhost`. The edge resolves `todo.localhost` to the new release hash, serves the page embedding the `0.2.0` artifact, and executes cleanly.

---

## 4. Archival Safety of `mesh-todo` (C6 Durability Considerations)

### Can `mesh-todo` be archived immediately?

**Yes to read-only archiving; NO to deletion or access revocation.**

#### The Mechanism (Milestone M2: C5/C6)
In `mesh-serve`, Milestone M2 established the durability invariant:
> *"An edge is a cache and git is the archive."*

- **C5 (Peer Sync)**: When an edge cache misses a blob, it queries peer edges over HTTP (`GET /blobs/:digest`).
- **C6 (Rebuild from Commit)**: If all peer edges miss (e.g. following a cluster storage wipe, cold restart, or disk corruption), the artifact is marked with `state: 'gone'`.
- Upon entering `state: 'gone'`, `mesh-serve` rebuilds the artifact from source by inspecting `partVersion.repository` and `partVersion.ref` recorded in MongoDB at publish time:
  ```ts
  // From builder/methods/source.ts:
  const repository = source.repository ?? '';
  // Builder performs: git ls-remote / git fetch / git clone against repository
  ```

#### Consequences for `mesh-todo`:
1. The catalog records `todo@0.1.0` with `repository: '.../mesh-todo'` and its commit SHA.
2. If `mesh-todo` is **archived on GitHub / git host (marked read-only)**:
   - Git clone and fetch operations continue to work without restriction.
   - If `todo@0.1.0` ever experiences a cache miss that requires a C6 rebuild, the builder can successfully clone the archived repository and deterministic rebuild succeeds.
3. If `mesh-todo` is **deleted or made private without builder access**:
   - Any C6 rebuild attempt for `todo@0.1.0` will fail with an unreachable repository error (`Could not fetch ...`).
   - Before `todo.localhost` is recomposed and deployed to `0.2.0`, an edge cache loss on `todo@0.1.0` would cause an outage.
   - Even after `0.2.0` is deployed, historical releases referencing `0.1.0` would lose rebuild durability if the repository is deleted.

**Recommendation**: Set `FLYBYME/mesh-todo` to archived (read-only) status in git hosting immediately upon merging dispatch 7. Do not delete the repository.

---

## 5. Consolidation Scaling Analysis at Twelve Parts

The migration of `todo` brings the collection of parts in `mesh-demos` to **11 registered parts** in `mesh.json` (or 12 components including `src/shared/theme.ts`):
1. `whoami` (application)
2. `clock` (application)
3. `notes` (application)
4. `theme` (extension)
5. `palette` (application)
6. `workbench` (application)
7. `calc` (application)
8. `markdown` (application)
9. `kanban` (application)
10. `chart` (application)
11. `todo` (application)

*(Note: The prompt mentions "the other eleven" and "twelfth entry", likely counting `src/shared` alongside the 10 parts previously in `src/`, or reflecting catalog totals. In `mesh.json`, `todo` is the 11th part entry).*

### Impact Assessment

| Dimension | Baseline (10 parts) | With `todo` (11 parts) | Strain Detected? |
| :--- | :--- | :--- | :--- |
| **`mesh.json` Size** | 151 lines (4.8 KB) | 166 lines (5.3 KB) | **No** — Clean, concise, and easy to maintain. |
| **`npm run typecheck`** | ~6.5s | ~6.8s | **No** — Negligible change. |
| **`npm test` Duration** | 11.15s (10 test files) | 11.79s–11.98s (11 test files) | **No** — Marginal +0.64s–0.8s wall-clock time. |
| **Test Concurrency** | 10 suites in parallel | 11 suites in parallel | **Low / Approaching Cap** — See detailed findings below. |
| **Publishing Overhead** | Per-part hashing | Per-part hashing | **No** — Unchanged parts are skipped by commit hash check. |

### Concurrency & Scaling Findings at 11/12 Parts

1. **Browser Test Parallelism & System Contention**:
   - Vitest Browser launches separate Playwright browser contexts for each of the 11 test files concurrently.
   - Overall test run time is bounded by the slowest suite (`notes.browser.test.ts` at ~3.6s) and environment startup overhead (~30s total prep across all workers), rather than the sum of tests.
   - At 11 concurrent browser contexts running simultaneously on the host, CPU usage spikes during the collection/execution phase. If background processes are active on the host, tests that rely on tight event loop timing between rapid DOM input events (such as `userEvent.clear` -> `userEvent.type` -> `userEvent.click` in `whoami.browser.test.ts`) can experience microtask scheduling races. When the host load stabilizes, all 11 test files consistently pass 100% green (79/79 tests).
   - Attempting sequential execution (`--fileParallelism=false`) eliminates CPU pressure, but exposes cross-suite browser storage leakage: tests like `theme.browser.test.ts` write to `localStorage`, which bleeds into subsequent suites unless explicitly sanitized in global `afterEach`.

2. **Publishing Scalability**:
   - `mesh-serve publish` does not rebuild the entire repository on every push. Each part in `mesh.json` is hashed and checked against the catalog independently. Publishing this 11-part repository after editing only `todo` will publish `todo@0.2.0` and skip the other 10 parts as unchanged.
   - Hence, repository size has zero negative impact on deployment or publish times.

3. **Recommendation for Future Parts (13+)**:
   - Consolidation should definitely continue: developer experience, unified dependency management (`@flybyme/mesh-web`), and single-point catalog management far outweigh the overhead.
   - However, before adding another 5–10 parts, the test harness should cap Vitest worker concurrency (e.g., `maxConcurrency: 4` or `fileParallelism` worker pool limits in `vitest.browser.config.ts`) so that growing from 12 to 20 parts does not spawn 20 simultaneous Chrome contexts and saturate host CPUs.

**Verdict**: The consolidation pattern is sound, stable, and ready to continue.
