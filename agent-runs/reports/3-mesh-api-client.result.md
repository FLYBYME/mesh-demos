# Result: Mesh API Client & Whoami Application (Dispatch 3)

## 1. What the Call Path Was Like to Write Without Ever Seeing a Credential

In previous dispatches, every demo part declared `mesh: []`. The `whoami` Application is the first part in `mesh-demos` that actually invokes the platform gate end-to-end.

### Manifest and Contract Declaration
In `mesh.json`, the part declares what it needs and what contracts it calls:
```json
{
    "kind": "application",
    "id": "whoami",
    "version": "0.1.0",
    "entry": "src/whoami/index.ts",
    "mesh": [
        {
            "package": "@flybyme/mesh-serve",
            "version": "^0.1",
            "contracts": [
                "identity.whoami"
            ]
        }
    ]
}
```

In TypeScript (`src/whoami/index.ts`):
```ts
const NEEDS = needs('mesh', 'state', 'commands', 'windows', 'log');
const CONSUMES = consumes(); // AuthExtension is consumed optionally via cx.useOrNull or kernel.provided
```

### The Credential Seam in Action
At no point in `src/whoami/index.ts` does the Application:
- Read, store, or forward a bearer token, cookie, session ID, or API key.
- Call `localStorage.getItem('token')` or touch storage for auth.
- Construct an `Authorization` header or HTTP transport options.

Instead, the call path is simply:
```ts
const result = await cx.mesh.call('identity.whoami', {});
```

### How the Platform Mediates the Gate Under the Hood
In `@flybyme/mesh-web/src/kernel/broker.ts:219–228`:
```ts
// Every client is wrapped, always — including the ones built before anything signed in.
// The lookup is per request, so a ticket that arrives later is on the next call rather than
// on the next page load, and an Application that never declared `credentials` still sends
// one without ever having seen it (spec/network.md §4).
meshClient: (api) => createClient(api, {
    transport: withHeaders(
        fetchTransport(credentials.origin),
        () => credentials.headers?.() ?? {},
    ),
}) as MeshClient<unknown>,
```

When `AuthExtension` (`node_modules/@flybyme/mesh-web/src/auth/extension.ts`) is activated on the page:
1. It registers itself with the kernel's credential service.
2. When signed in, `credentials.headers()` dynamically provides `{ authorization: 'Bearer <ticket>' }`.
3. When `whoami` calls `cx.mesh.call('identity.whoami', {})`, the kernel transport invokes `credentials.headers()` per-request and injects the header into the outbound fetch.
4. When `AuthExtension` signs out, `credentials.headers()` returns `{}`. The next `cx.mesh.call` is immediately anonymous with zero state caching or credential leakage.
5. If `AuthExtension` is not composed on the page at all, `credentials.headers` simply defaults to returning `{}`. The call proceeds anonymously to the gate, which returns a typed refusal. The application neither knows nor cares whether credentials exist.

---

## 2. Whether the Generated Client Was Actually Usable or Needed Hand-Written Types

### Code Generation (`mesh-serve client`)
Running `npm run generate` invokes `mesh-serve client`, which inspects `mesh.json` and the contracts declared on `@flybyme/mesh-serve`, emitting `src/generated/api.ts` and updating `descriptor.json`.

The generated client emitted:
```ts
export interface WhoamiApiContracts {
    'identity.whoami': (input: IdentityWhoamiInput) => Promise<IdentityWhoamiOutput>;
}

export interface IdentityWhoamiInput {}

export interface IdentityWhoamiOutput {
    user: {
        id: string;
        email: string;
        displayName: string;
        roles: string[];
    };
    organizations: Array<{
        id: string;
        name: string;
        slug: string;
        roles: string[];
    }>;
}
```

### Usability Evaluation
1. **Contract Types are Highly Usable and Accurate:**
   The parameter and return types for `identity.whoami` (`IdentityWhoamiInput` and `IdentityWhoamiOutput`) are spot on. Because `cx.mesh` is typed with `MeshClient<WhoamiMeshApi>`, `cx.mesh.call('identity.whoami', {})` yields a `Result<IdentityWhoamiOutput, CallError<string>>`. Autocomplete, argument checking, and response destructuring work out of the box with zero compiler errors and **zero casts**.

2. **No Need to Hand-Write Contract Types:**
   We did not need to hand-write `IdentityWhoamiInput` or `IdentityWhoamiOutput`. The contract schema generated from the server specification accurately modeled the user record and organizations list.

3. **Critical Defect in `mesh-serve client` Multi-Part Support:**
   In `@flybyme/mesh-serve/src/api/client-cli.ts:167`:
   ```ts
   const application = mesh.parts[0]?.id ?? 'part';
   ```
   `client-cli.ts` hardcodes inspecting `mesh.parts[0]`.
   - If `whoami` is appended to the end of `parts` in `mesh.json` (as is natural when adding a new demo to an existing repo with `clock`, `notes`, `theme`, `palette`), `client-cli` reads `parts[0]` (`clock`), sees that `clock` has `mesh: []`, and throws:
     `no part in mesh.json declares mesh contracts.`
   - Even if `clock` had contracts, it would emit `clockApi` rather than `whoamiApi`.
   - **Workaround:** We had to place `whoami` at index 0 of `mesh.parts` in `mesh.json` so that `mesh-serve client` derives the correct ID (`whoamiApi`). `mesh-serve` must be updated to either accept `--part <id>` or iterate over parts that declare `mesh` contracts.

4. **Conflation of Kernel Provided API and Mesh Client API:**
   `client-cli.ts` generates:
   `export const whoamiApi = provider<WhoamiApi>('whoami');`
   where `WhoamiApi` is defined solely from the server contracts. However, in `mesh-web`, an Application's `api` field (`app.api`) represents the *Application's public kernel API* provided to other parts on the page (`kernel.provided(WHOAMI)`), which exposes UI state signals (`status()`, `user()`, `organizations()`, `activeOrganizationId()`), not the remote HTTP client.
   In `src/whoami/index.ts`, we cleanly declared `WhoamiAppApi` for the application's exported kernel API, while passing the generated `WhoamiMeshApi` to `Application<typeof NEEDS, typeof CONSUMES, typeof WHOAMI, WhoamiMeshApi>` to type `cx.mesh.call`.

---

## 3. What a Refusal Looked Like from Inside the App and Whether It Was Legible

### Refusal is an Answer, Not an Exception
In conventional web apps, an unauthenticated request throws an HTTP 401 exception or triggers a global redirect. In Mesh, the platform treats HTTP 401 as a standard typed refusal.

In `@flybyme/mesh-web/src/net/client.ts:182–190`:
```ts
switch (response.status) {
    case 400: return err({ kind: 'invalid', detail });
    case 401: return err({ kind: 'unauthorized' });
    case 403: return err({ kind: 'forbidden' });
    case 404: return err({ kind: 'not_found' });
    case 409: return err({ kind: 'conflict', detail });
    case 429: return err({ kind: 'rate_limited' });
    default: return err({ kind: 'server', status: response.status, detail });
}
```

When an anonymous caller hits a gated route:
1. The gate responds with HTTP 401 `{ "error": "UNAUTHENTICATED", "message": "Not signed in." }`.
2. `cx.mesh.call` resolves (it does **not** reject or throw) returning `Result.err`:
   ```ts
   {
       ok: false,
       error: { kind: 'unauthorized' }
   }
   ```
3. Inside `WhoamiApp.start(cx)` and `fetchIdentity()`:
   ```ts
   const result = await cx.mesh.call('identity.whoami', {});
   if (!result.ok) {
       if (result.error.kind === 'unauthorized' || result.error.kind === 'forbidden') {
           status.set('signed-out');
           user.set(null);
           errorMessage.set(null);
           return;
       }
       status.set('error');
       errorMessage.set(
           result.error.kind === 'offline'
               ? 'Network offline. Check connection.'
               : 'Unable to connect to server.'
       );
       return;
   }
   ```

### Legibility
- **Extremely Legible:** Status codes are mapped to named variants (`'unauthorized'`, `'forbidden'`, `'invalid'`, `'offline'`, `'server'`). The caller never inspects raw status numbers.
- **Distinction Between Gated Refusal and System Failure:** The application clearly distinguishes between "the user is not signed in" (`unauthorized` -> `status: 'signed-out'`, normal state) and "the network is down or the server crashed" (`offline`/`server` -> `status: 'error'`, abnormal state with retry UI).
- **Graceful UI Degradation:**
  - When `status === 'signed-out'`: The identity window renders the anonymous caller badge. If `AuthExtension` is present, it renders email/password inputs; if absent, it displays a standalone informational banner explaining that authentication is managed externally.
  - When `status === 'error'`: It renders an error card with an active "Retry" button linked to the `whoami.refresh` command.

---

## 4. Every Place the Framework Fought Us (File and Line)

### 1. `client-cli.ts` assumes `mesh.parts[0]` is the sole target application
- **File & Line:** `node_modules/@flybyme/mesh-serve/src/api/client-cli.ts:167`
- **The Issue:** `const application = mesh.parts[0]?.id ?? 'part';`
  In a multi-part repo, `client-cli` inspects only `parts[0]`. When adding a new part that calls `mesh` contracts, placing it anywhere other than `parts[0]` causes `mesh-serve client` to fail or generate code for the wrong part.
- **Resolution:** Placed `whoami` first in `mesh.json`'s `parts` array.

### 2. `AuthApi` definition discrepancy between `@flybyme/mesh-web` and `mesh-auth`
- **File & Line:** `node_modules/@flybyme/mesh-web/dist/auth/extension.d.ts:45` vs `mesh-auth/src/contracts/auth.ts:25`
- **The Issue:** `@flybyme/mesh-web` declares:
  ```ts
  export interface AuthApi {
      readonly session: () => Session | null;
      signIn(params: SignInParams): Promise<Result<Session, AuthError>>;
      signOut(): Promise<Result<void, AuthError>>;
  }
  ```
  It has no `selectOrganization` method, and `Session` has no `organizationId`. `mesh-auth@0.2.0` in the sibling repository introduced organization selection to `AuthApi`, but `@flybyme/mesh-web` in this worktree must not be patched.
- **Resolution:** Designed `WhoamiApp` with its own `activeOrganizationId` signal. When organizations are returned from `identity.whoami`, `whoami` independently manages the active organization scope. This decouples the organization switching feature from the specific version of `AuthExtension` installed.

### 3. Window stacking and pointer interception in browser tests
- **File & Line:** `test/whoami.browser.test.ts:331, 396` & `node_modules/@flybyme/mesh-web/src/render/dom.ts`
- **The Issue:** `WhoamiApp` opens two windows (`identity` and `organizations`). Because `organizations` is opened second in `queueMicrotask`, its window container sits at the top of the window manager's stacking order. When Playwright executes `userEvent.click(signinBtn)` or `userEvent.click(retryBtn)`, Chromium hit-testing detects that the `organizations` window container overlaps the target, intercepting the pointer event.
- **Resolution:** Explicitly focused the identity window (`site.manager.focus(idWin.id)`) before interacting with elements inside that window, mirroring the pattern in `palette.browser.test.ts:79`.

### 4. `cx.windows.open` crashes if called synchronously during `start()` (roadmap A5.7b)
- **File & Line:** `node_modules/@flybyme/mesh-web/src/kernel/kernel.ts:259` & `src/whoami/index.ts:167`
- **The Issue:** When `cx.windows.open(...)` runs synchronously inside `start()`, it immediately mounts and renders views. Because `start()` has not yet returned, `entry.api` on the kernel process entry is still `undefined`. Any view accessing `vx.app` throws.
- **Resolution:** Deferred initial window opening using `queueMicrotask(() => { cx.windows.open(...); })`.

### 5. `Input` cannot be controlled after user keystrokes without key recreation (roadmap A7.0)
- **File & Line:** `node_modules/@flybyme/mesh-web/src/render/dom.ts:130–139` & `src/whoami/index.ts:371`
- **The Issue:** HTML inputs set an internal dirty flag upon user input. Setting the `value` attribute on the existing element via signal effects does not reset the user's typed value in the DOM.
- **Resolution:** Wrapped form inputs in an `each` block keyed on `draftRevision`:
  ```ts
  each(() => [draftRevision()], (rev) => rev, () => element('Input', ...))
  ```
  Incrementing `draftRevision` replaces the input node and resets the dirty state.

### 6. `activate` intent on inputs captures Space keypresses (roadmap A7.0b)
- **File & Line:** `node_modules/@flybyme/mesh-web/src/render/dom.ts:360` & `src/whoami/index.ts:382`
- **The Issue:** Attaching `activate` to an `<input>` executes the action whenever the Space key is pressed, preventing users from typing spaces in form inputs.
- **Resolution:** Used `change: { action: command(...) }` on `<input>` and `commit: { action: command(...) }` on `<form>`, restricting `activate` to buttons.

### 7. Zero casts requirement
- **File & Line:** Entire `src/whoami/index.ts` and `test/whoami.browser.test.ts`
- **The Issue:** Eliminating 100% of `as` casts required rigorous TypeScript typing and type guards for unknown payloads (such as parsing mock fetch request bodies without `as`).
- **Resolution:** Replaced all potential cast sites with user-defined type predicates (`val is { ... }`) and structural guards. `grep -rn "\bas\b" src/whoami/ test/whoami.browser.test.ts` returns zero occurrences.

---

## 5. Verification Checklist

- [x] `src/whoami/index.ts` implemented as `Application<typeof NEEDS, typeof CONSUMES, typeof WHOAMI, WhoamiMeshApi>`.
- [x] Calls `cx.mesh.call('identity.whoami', {})` with zero credentials passed from the application.
- [x] Supports full organization viewing and active organization switching.
- [x] Seamlessly integrates with `AuthExtension` when present (sign in, session sync, sign out).
- [x] Degrades gracefully when `AuthExtension` is absent (displays standalone anonymous caller UI, does not crash).
- [x] Handles refusal (HTTP 401) as a valid answer, not an exception or crash (`status: 'signed-out'`).
- [x] Handles server (HTTP 500) and offline network errors with error view and retry button.
- [x] `mesh.json` updated with `whoami` part (kind: application, version: 0.1.0, mesh: `@flybyme/mesh-serve` `identity.whoami`).
- [x] `npm run generate` runs cleanly (`src/generated/api.ts` and `descriptor.json`).
- [x] Zero casts (`as`) anywhere in `src/whoami/index.ts` or `test/whoami.browser.test.ts`.
- [x] `npm run typecheck` clean (0 errors across the entire repository).
- [x] `npm run test:browser` clean: 33/33 tests passing across all 5 test files (`clock`, `notes`, `palette`, `theme`, `whoami`).
