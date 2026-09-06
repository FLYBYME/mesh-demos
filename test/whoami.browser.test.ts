import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { mountPart, cleanup } from '@flybyme/mesh-web/testing';
import { AuthExtension } from '@flybyme/mesh-web';
import WhoamiApp, { WHOAMI } from '../src/whoami/index.js';
import { whoamiApi, type IdentityWhoamiOutput } from '../src/generated/api.js';

const ALICE_PROFILE: IdentityWhoamiOutput = {
    userId: 'usr_alice123',
    email: 'alice@flybyme.dev',
    displayName: 'Alice Smith',
    roles: ['authenticated', 'developer'],
    organizations: [
        { organizationId: 'org_acme', name: 'Acme Corp', roleKey: 'admin' },
        { organizationId: 'org_startup', name: 'NextGen Labs', roleKey: 'member' },
    ],
};

const BOB_SINGLE_ORG: IdentityWhoamiOutput = {
    userId: 'usr_bob456',
    email: 'bob@flybyme.dev',
    displayName: 'Bob Builder',
    roles: ['authenticated'],
    organizations: [
        { organizationId: 'org_solo', name: 'Solo Enterprises', roleKey: 'owner' },
    ],
};

describe('WhoamiApp browser tests', () => {
    const originalFetch = globalThis.fetch;
    let mockMode: 'anonymous' | 'authenticated' | 'single-org' | 'server-error' | 'network-error' = 'anonymous';
    let heldToken: string | undefined = undefined;

    function getHeaderValue(headers: HeadersInit | undefined, name: string): string | undefined {
        if (!headers) return undefined;
        if (headers instanceof Headers) {
            return headers.get(name) ?? undefined;
        }
        if (Array.isArray(headers)) {
            for (const pair of headers) {
                const k = pair[0];
                const v = pair[1];
                if (k !== undefined && v !== undefined && k.toLowerCase() === name.toLowerCase()) {
                    return v;
                }
            }
            return undefined;
        }
        for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === name.toLowerCase()) {
                return headers[key];
            }
        }
        return undefined;
    }

    beforeEach(() => {
        mockMode = 'anonymous';
        heldToken = undefined;

        globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const url = String(input);

            if (mockMode === 'network-error') {
                throw new Error('Connection refused (mock offline)');
            }

            if (mockMode === 'server-error') {
                return new Response(JSON.stringify({ error: 'SERVER_ERROR', message: 'Internal Server Error' }), {
                    status: 500,
                    headers: { 'content-type': 'application/json' },
                });
            }

            // Ticket issue route (used by AuthExtension)
            if (url.includes('/api/identity/ticket') && !url.includes('/validate') && !url.includes('/revoke')) {
                const bodyText = typeof init?.body === 'string' ? init.body : '{}';
                const body: unknown = JSON.parse(bodyText);
                const isPayload = (val: unknown): val is { email?: string; password?: string } =>
                    typeof val === 'object' && val !== null;
                const payload = isPayload(body) ? body : {};

                if (payload.email === 'alice@flybyme.dev' && payload.password === 'secret123') {
                    heldToken = 'ticket_alice_mock';
                    return new Response(JSON.stringify({
                        token: 'ticket_alice_mock',
                        userId: 'usr_alice123',
                        expiresAt: Date.now() + 3600000,
                    }), {
                        status: 200,
                        headers: { 'content-type': 'application/json' },
                    });
                }

                return new Response(JSON.stringify({ error: 'INVALID_CREDENTIALS', message: 'Those credentials are not valid.' }), {
                    status: 401,
                    headers: { 'content-type': 'application/json' },
                });
            }

            // Sign out route
            if (url.includes('/api/identity/sign_out') || url.includes('/api/identity/ticket/revoke')) {
                heldToken = undefined;
                return new Response(JSON.stringify({ signedOut: true }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }

            // Whoami route
            if (url.includes('/api/identity/whoami')) {
                const authHeader = getHeaderValue(init?.headers, 'authorization');

                if (mockMode === 'authenticated' || (heldToken !== undefined && authHeader === `Bearer ${heldToken}`)) {
                    return new Response(JSON.stringify(ALICE_PROFILE), {
                        status: 200,
                        headers: { 'content-type': 'application/json' },
                    });
                }

                if (mockMode === 'single-org') {
                    return new Response(JSON.stringify(BOB_SINGLE_ORG), {
                        status: 200,
                        headers: { 'content-type': 'application/json' },
                    });
                }

                // Gated refusal (401)
                return new Response(JSON.stringify({ error: 'UNAUTHENTICATED', message: 'Not signed in.' }), {
                    status: 401,
                    headers: { 'content-type': 'application/json' },
                });
            }

            return new Response('Not found', { status: 404 });
        };
    });

    afterEach(() => {
        cleanup();
        globalThis.fetch = originalFetch;
        document.body.innerHTML = '';
    });

    it('starts, calls cx.mesh.call, and handles signed-out state when anonymous (refusal is an answer)', async () => {
        mockMode = 'anonymous';

        const site = await mountPart({
            parts: [{ id: 'whoami', contribution: WhoamiApp }],
        });

        site.assertSingleFramework();

        const process = site.kernel.processes.find((p) => p.applicationId === 'whoami');
        expect(process).toBeDefined();
        // Resting running state, NOT failed
        expect(process?.state).toBe('running');

        const api = site.kernel.provided(WHOAMI);
        expect(api).toBeDefined();
        if (!api) throw new Error('WhoamiApi not provided');

        expect(api.status()).toBe('signed-out');
        expect(api.user()).toBeNull();
        expect(api.hasAuthExtension()).toBe(false);

        // Verify both windows opened
        expect(site.manager.windows().length).toBe(2);
        const views = site.manager.windows().map((w) => w.view);
        expect(views).toContain('identity');
        expect(views).toContain('organizations');

        // Check DOM in identity view
        const badge = document.querySelector<HTMLElement>('.status-badge');
        expect(badge?.textContent).toBe('signed-out');

        const heading = document.querySelector<HTMLElement>('.signed-out-heading');
        expect(heading?.textContent).toBe('Anonymous Caller');

        const notice = document.querySelector<HTMLElement>('.auth-absent-notice');
        expect(notice).not.toBeNull();
        expect(notice?.textContent).toContain('Standalone mode');

        site.dispose();
    });

    it('renders signed-in state with user profile, email, ID, and cluster roles', async () => {
        mockMode = 'authenticated';

        const site = await mountPart({
            parts: [{ id: 'whoami', contribution: WhoamiApp }],
        });

        site.assertSingleFramework();

        const api = site.kernel.provided(WHOAMI);
        expect(api).toBeDefined();
        if (!api) throw new Error('WhoamiApi not provided');

        expect(api.status()).toBe('signed-in');
        expect(api.displayName()).toBe('Alice Smith');
        expect(api.email()).toBe('alice@flybyme.dev');
        expect(api.userId()).toBe('usr_alice123');
        expect(api.roles()).toEqual(['authenticated', 'developer']);

        // Check DOM in identity view
        const badge = document.querySelector<HTMLElement>('.status-badge');
        expect(badge?.textContent).toBe('signed-in');

        const nameEl = document.querySelector<HTMLElement>('.whoami-display-name');
        expect(nameEl?.textContent).toBe('Alice Smith');

        const emailEl = document.querySelector<HTMLElement>('.whoami-email');
        expect(emailEl?.textContent).toBe('alice@flybyme.dev');

        const idEl = document.querySelector<HTMLElement>('.whoami-user-id');
        expect(idEl?.textContent).toBe('usr_alice123');

        const roleBadges = document.querySelectorAll<HTMLElement>('.role-badge');
        expect(roleBadges.length).toBe(2);
        expect(roleBadges[0]?.textContent).toBe('authenticated');
        expect(roleBadges[1]?.textContent).toBe('developer');

        site.dispose();
    });

    it('handles single organization membership with automatic active scope resolution', async () => {
        mockMode = 'single-org';

        const site = await mountPart({
            parts: [{ id: 'whoami', contribution: WhoamiApp }],
        });

        const api = site.kernel.provided(WHOAMI);
        expect(api).toBeDefined();
        if (!api) throw new Error('WhoamiApi not provided');

        expect(api.status()).toBe('signed-in');
        expect(api.organizations().length).toBe(1);

        // Automatically resolved sole organization
        expect(api.activeOrganizationId()).toBe('org_solo');
        expect(api.activeOrganization()?.name).toBe('Solo Enterprises');

        // Check DOM
        const activeOrgName = document.querySelector<HTMLElement>('.active-org-name');
        expect(activeOrgName?.textContent).toBe('Solo Enterprises');

        const orgWin = site.manager.windows().find((w) => w.view === 'organizations');
        if (orgWin) site.manager.focus(orgWin.id);

        const scopeBadge = document.querySelector<HTMLElement>('.org-item-org_solo .active-scope-badge');
        expect(scopeBadge).not.toBeNull();
        expect(scopeBadge?.textContent).toContain('Active Scope');

        site.dispose();
    });

    it('supports switching active organization when multiple organizations exist', async () => {
        mockMode = 'authenticated';

        const site = await mountPart({
            parts: [{ id: 'whoami', contribution: WhoamiApp }],
        });

        const api = site.kernel.provided(WHOAMI);
        expect(api).toBeDefined();
        if (!api) throw new Error('WhoamiApi not provided');

        expect(api.organizations().length).toBe(2);
        // Multiple memberships start without an assumed scope
        expect(api.activeOrganizationId()).toBeNull();

        const orgWin = site.manager.windows().find((w) => w.view === 'organizations');
        if (orgWin) site.manager.focus(orgWin.id);

        // Verify both organizations are listed
        const orgItems = document.querySelectorAll<HTMLElement>('.org-item');
        expect(orgItems.length).toBe(2);

        const switchStartupBtn = document.querySelector<HTMLButtonElement>('.btn-switch-org-org_startup');
        expect(switchStartupBtn).not.toBeNull();
        if (!switchStartupBtn) throw new Error('btn-switch-org-org_startup not found');

        // Click to switch to NextGen Labs (org_startup)
        await userEvent.click(switchStartupBtn);

        expect(api.activeOrganizationId()).toBe('org_startup');
        expect(api.activeOrganization()?.name).toBe('NextGen Labs');

        const activeBadge = document.querySelector<HTMLElement>('.org-item-org_startup .active-scope-badge');
        expect(activeBadge).not.toBeNull();

        // Switch to Acme Corp (org_acme)
        const switchAcmeBtn = document.querySelector<HTMLButtonElement>('.btn-switch-org-org_acme');
        expect(switchAcmeBtn).not.toBeNull();
        if (!switchAcmeBtn) throw new Error('btn-switch-org-org_acme not found');

        await userEvent.click(switchAcmeBtn);

        expect(api.activeOrganizationId()).toBe('org_acme');
        expect(api.activeOrganization()?.name).toBe('Acme Corp');

        // Clear scope button
        const clearBtn = document.querySelector<HTMLButtonElement>('.btn-clear-scope');
        expect(clearBtn).not.toBeNull();
        if (!clearBtn) throw new Error('btn-clear-scope not found');

        await userEvent.click(clearBtn);
        expect(api.activeOrganizationId()).toBeNull();

        site.dispose();
    });

    it('operates seamlessly with AuthExtension: sign-in, session sync, and sign-out', async () => {
        mockMode = 'anonymous';

        const site = await mountPart({
            parts: [
                { id: 'auth', contribution: AuthExtension },
                { id: 'whoami', contribution: WhoamiApp },
            ],
        });

        site.assertSingleFramework();

        const api = site.kernel.provided(WHOAMI);
        expect(api).toBeDefined();
        if (!api) throw new Error('WhoamiApi not provided');

        expect(api.hasAuthExtension()).toBe(true);
        expect(api.status()).toBe('signed-out');

        const idWin = site.manager.windows().find((w) => w.view === 'identity');
        if (idWin) site.manager.focus(idWin.id);

        // Check sign-in form is rendered
        const emailInput = document.querySelector<HTMLInputElement>('.input-email');
        const passwordInput = document.querySelector<HTMLInputElement>('.input-password');
        const signinBtn = document.querySelector<HTMLButtonElement>('.btn-signin');

        expect(emailInput).not.toBeNull();
        expect(passwordInput).not.toBeNull();
        expect(signinBtn).not.toBeNull();
        if (!emailInput || !passwordInput || !signinBtn) throw new Error('Sign in form missing');

        // Test sign-in failure with wrong password
        await userEvent.type(emailInput, 'alice@flybyme.dev');
        await userEvent.type(passwordInput, 'wrongpassword');
        await userEvent.click(signinBtn);

        expect(api.status()).toBe('signed-out');
        const authErrorEl = document.querySelector<HTMLElement>('.auth-error-text');
        expect(authErrorEl?.textContent).toContain('credentials are not valid');

        // Sign in successfully
        await userEvent.clear(passwordInput);
        await userEvent.type(passwordInput, 'secret123');
        await userEvent.click(signinBtn);

        expect(api.status()).toBe('signed-in');
        expect(api.displayName()).toBe('Alice Smith');
        expect(api.email()).toBe('alice@flybyme.dev');

        // Sign out
        const signoutBtn = document.querySelector<HTMLButtonElement>('.btn-signout');
        expect(signoutBtn).not.toBeNull();
        if (!signoutBtn) throw new Error('btn-signout not found');

        await userEvent.click(signoutBtn);

        expect(api.status()).toBe('signed-out');
        expect(api.user()).toBeNull();

        site.dispose();
    });

    it('handles server errors cleanly with visible error state and retry', async () => {
        mockMode = 'server-error';

        const site = await mountPart({
            parts: [{ id: 'whoami', contribution: WhoamiApp }],
        });

        const api = site.kernel.provided(WHOAMI);
        expect(api).toBeDefined();
        if (!api) throw new Error('WhoamiApi not provided');

        expect(api.status()).toBe('error');
        expect(api.errorMessage()).toContain('server');

        const errorCard = document.querySelector<HTMLElement>('.whoami-error-card');
        expect(errorCard).not.toBeNull();

        const retryBtn = document.querySelector<HTMLButtonElement>('.btn-retry');
        expect(retryBtn).not.toBeNull();
        if (!retryBtn) throw new Error('btn-retry not found');

        const idWin = site.manager.windows().find((w) => w.view === 'identity');
        if (idWin) site.manager.focus(idWin.id);

        // Recover by changing mockMode to authenticated and clicking Retry
        mockMode = 'authenticated';
        await userEvent.click(retryBtn);

        expect(api.status()).toBe('signed-in');
        expect(api.displayName()).toBe('Alice Smith');

        site.dispose();
    });

    it('handles network offline failures with legible error state', async () => {
        mockMode = 'network-error';

        const site = await mountPart({
            parts: [{ id: 'whoami', contribution: WhoamiApp }],
        });

        const api = site.kernel.provided(WHOAMI);
        expect(api).toBeDefined();
        if (!api) throw new Error('WhoamiApi not provided');

        expect(api.status()).toBe('error');
        expect(api.errorMessage()).toContain('offline');

        site.dispose();
    });

    it('declares needs, commands, keys, views, layout, and api statically on the class', () => {
        const app = new WhoamiApp();

        expect(app.needs).toEqual(['mesh', 'state', 'commands', 'windows', 'log']);
        expect(app.api).toBe(whoamiApi);
        expect(app.consumes).toBeDefined();
        expect(app.layout).toBeDefined();

        expect(app.commands.map((c) => c.id)).toContain('whoami.refresh');
        expect(app.commands.map((c) => c.id)).toContain('whoami.switchOrg');
        expect(app.commands.map((c) => c.id)).toContain('whoami.signIn');
        expect(app.commands.map((c) => c.id)).toContain('whoami.signOut');

        expect(app.keys.map((k) => k.command)).toContain('whoami.refresh');
        expect(app.views.map((v) => v.id)).toEqual(['identity', 'organizations']);
    });
});
