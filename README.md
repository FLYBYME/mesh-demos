# mesh-demos

Several parts in one repository. Not a showcase — **the case the format was rewritten for**, and the
first thing to exercise it.

## Why one repository

`mesh.json` holds a `parts` array, and `mesh-serve publish` walks it:

> Each part is published separately, which is why a repository with a chrome extension and an
> application produces two catalog entries and two artifacts. They are versioned, resolved, cached
> and replaced independently from then on — which is the whole reason installing an extension is not
> a site rebuild.

So `parts` here is not a packaging convenience. Each entry becomes its own catalog row, its own
artifact, its own version line. A site composes any subset. Two demos in this repository can appear in
different releases at different versions on different hostnames, and nothing about living in one git
repository ties them together.

Everything before today published one part per repository, so **none of that has ever run**. If it is
wrong, it is wrong here first.

## Layout

```
mesh.json              parts: [ … ]     ← every part, each with its own kind/entry/version
src/<part>/index.ts                     ← one directory per part, its entry is index.ts
test/<part>.browser.test.ts             ← one test file per part
agent-runs/prompts/                     ← the queue
```

One `npm install`, one `tsconfig`, one vitest config, one test command for all of them.

## The rules

**A part never imports another part's directory.** Two parts in one repository are two artifacts that
may not be deployed together, so a direct import is a dependency the composition cannot see and the
release checker cannot refuse. If an Application needs something an Extension has, it goes through the
provider graph — `provides` / `consumes` — which is exactly the mechanism that survives them being
separate artifacts.

**Shared code goes in `src/shared/`,** and it is copied into each artifact that imports it. That is
correct: it is source, not a part. The kernel is the only thing that is ever shared at runtime.

**A part declares what it calls; a site declares what it exposes.** A part must never choose its own
gate.

## Running one

```bash
npm test                       # typecheck + every part's browser tests
npm run dev                    # mesh-serve dev, bundles and serves locally
```
