import {
    AUTH,
    tiles,
    type Application,
    type AuthApi,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';
import {
    whoamiApi,
    type IdentityWhoamiOutput,
} from '../generated/api.js';
import {
    CONSUMES,
    NEEDS,
    WHOAMI,
    type WhoamiApi,
    type WhoamiInternal,
} from './contract.js';
import { renderIdentityView } from './views/identity.js';
import { renderOrganizationsView } from './views/organizations.js';

export {
    WHOAMI,
    type IdentityWhoamiOutput,
    type IdentityWhoamiOutputOrganization,
    type WhoamiApi,
    type WhoamiInternal,
} from './contract.js';

// ---------------------------------------------------------------------------- application

export default class WhoamiApp implements Application<typeof NEEDS, typeof CONSUMES, typeof WHOAMI, Record<string, never>, WhoamiInternal> {
    readonly needs = NEEDS;
    readonly consumes = CONSUMES;
    readonly provides = WHOAMI;
    readonly api = whoamiApi;

    readonly layout = tiles({
        split: 'row',
        children: [
            { node: { tile: 'main' }, size: 3 },
            { node: { tile: 'orgs' }, size: 2 },
        ],
    });

    readonly views: readonly ViewDecl<Record<string, never>, WhoamiApi, WhoamiInternal>[] = [
        {
            id: 'identity',
            title: 'Platform Identity',
            tile: 'main',
            instances: 'one',
            defaultSize: { width: 440, height: 480 },
            minSize: { width: 300, height: 320 },
            render(vx: ViewContext<Record<string, never>, WhoamiApi, WhoamiInternal>): Node {
                return renderIdentityView(vx);
            },
        },
        {
            id: 'organizations',
            title: 'Organizations',
            tile: 'orgs',
            instances: 'one',
            defaultSize: { width: 420, height: 480 },
            minSize: { width: 300, height: 320 },
            render(vx: ViewContext<Record<string, never>, WhoamiApi, WhoamiInternal>): Node {
                return renderOrganizationsView(vx);
            },
        },
    ];

    readonly commands: readonly CommandDecl[] = [
        { id: 'whoami.refresh', title: 'Whoami: Refresh Identity' },
        { id: 'whoami.switchOrg', title: 'Whoami: Switch Organization' },
        { id: 'whoami.setEmail', title: 'Whoami: Set Email Input' },
        { id: 'whoami.setPassword', title: 'Whoami: Set Password Input' },
        { id: 'whoami.signIn', title: 'Whoami: Sign In' },
        { id: 'whoami.signOut', title: 'Whoami: Sign Out' },
        { id: 'whoami.openIdentity', title: 'Whoami: Open Identity Window' },
        { id: 'whoami.openOrganizations', title: 'Whoami: Open Organizations Window' },
    ];

    readonly keys: readonly KeyDecl[] = [
        { command: 'whoami.refresh', keys: 'ctrl+r' },
        { command: 'whoami.openOrganizations', keys: 'ctrl+o' },
    ];

    async start(cx: Context<typeof NEEDS, typeof CONSUMES, typeof whoamiApi>): Promise<{ api: WhoamiApi; internal: WhoamiInternal }> {
        cx.log.info('WhoamiApp starting');

        // Optional auth Extension integration
        let auth: AuthApi | undefined;
        try {
            auth = cx.use(AUTH);
        } catch {
            auth = undefined;
        }

        const hasAuthExtension = cx.state.signal<boolean>(auth !== undefined);
        const status = cx.state.signal<'loading' | 'signed-in' | 'signed-out' | 'error'>('loading');
        const user = cx.state.signal<IdentityWhoamiOutput | null>(null);
        const errorMessage = cx.state.signal<string | null>(null);
        const activeOrganizationId = cx.state.signal<string | null>(null);
        const authError = cx.state.signal<string | null>(null);
        const draftRevision = cx.state.signal<number>(0);

        let emailDraft = '';
        let passwordDraft = '';

        const setEmailDraft = (email: string): void => {
            emailDraft = email;
        };

        const setPasswordDraft = (password: string): void => {
            passwordDraft = password;
        };

        const fetchWhoami = async (): Promise<void> => {
            status.set('loading');
            errorMessage.set(null);

            const result = await cx.mesh.call('identity.whoami');

            if (result.ok) {
                const data = result.value;
                user.set(data);
                status.set('signed-in');

                // Determine active organization scope
                const currentActive = activeOrganizationId();

                if (currentActive !== null && data.organizations.some((o) => o.organizationId === currentActive)) {
                    // Retain current user choice
                } else if (data.organizations.length === 1) {
                    // Single membership resolves on its own
                    const sole = data.organizations[0];
                    if (sole !== undefined) {
                        activeOrganizationId.set(sole.organizationId);
                    }
                } else {
                    // Multiple memberships require an explicit user choice
                    activeOrganizationId.set(null);
                }
            } else {
                user.set(null);
                if (result.error.kind === 'unauthorized') {
                    // A refusal is an answer, not an exception
                    status.set('signed-out');
                } else {
                    status.set('error');
                    const detail = 'detail' in result.error && typeof result.error.detail === 'string'
                        ? result.error.detail
                        : result.error.kind;
                    errorMessage.set(`Call failed (${result.error.kind}): ${detail}`);
                    cx.log.warn(`identity.whoami error: ${result.error.kind}`);
                }
            }
        };

        const switchOrganization = async (orgId: string | null): Promise<void> => {
            activeOrganizationId.set(orgId);
        };

        const signIn = async (credentials?: { email: string; password: string }): Promise<void> => {
            if (auth === undefined) {
                throw new Error('Auth extension is not available in this composition.');
            }

            const creds = credentials ?? { email: emailDraft, password: passwordDraft };
            authError.set(null);

            try {
                await auth.signIn(creds);
                emailDraft = '';
                passwordDraft = '';
                draftRevision.set(draftRevision() + 1);
                await fetchWhoami();
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                authError.set(msg);
                throw err;
            }
        };

        const signOut = async (): Promise<void> => {
            if (auth !== undefined) {
                await auth.signOut();
            }
            user.set(null);
            status.set('signed-out');
            activeOrganizationId.set(null);
        };

        // React to auth session updates when auth Extension is composed
        if (auth !== undefined) {
            cx.state.effect(() => {
                const session = auth.session();
                if (session === null) {
                    if (status() === 'signed-in') {
                        user.set(null);
                        status.set('signed-out');
                        activeOrganizationId.set(null);
                    }
                }
            });
        }

        // Initial call to identity.whoami
        await fetchWhoami();

        // Command implementations
        cx.commands.implement('whoami.refresh', async () => {
            await fetchWhoami();
        });

        cx.commands.implement('whoami.switchOrg', async (orgId?: Json) => {
            if (typeof orgId === 'string') {
                await switchOrganization(orgId);
            } else if (orgId === null) {
                await switchOrganization(null);
            }
        });

        cx.commands.implement('whoami.setEmail', (val?: Json) => {
            if (typeof val === 'string') setEmailDraft(val);
        });

        cx.commands.implement('whoami.setPassword', (val?: Json) => {
            if (typeof val === 'string') setPasswordDraft(val);
        });

        cx.commands.implement('whoami.signIn', async () => {
            try {
                await signIn();
            } catch {
                // Error recorded in authError signal
            }
        });

        cx.commands.implement('whoami.signOut', async () => {
            await signOut();
        });

        cx.commands.implement('whoami.openIdentity', () => {
            cx.windows.open({ view: 'identity' });
        });

        cx.commands.implement('whoami.openOrganizations', () => {
            cx.windows.open({ view: 'organizations' });
        });

        // Open initial windows after start() resolves (A5.7b workaround)
        queueMicrotask(() => {
            if (cx.windows.own().length === 0) {
                cx.windows.open({ view: 'identity' });
                cx.windows.open({ view: 'organizations' });
            }
        });

        // Computed views of state
        const displayName = cx.state.computed(() => user()?.displayName ?? '');
        const email = cx.state.computed(() => user()?.email ?? '');
        const userId = cx.state.computed(() => user()?.userId ?? '');
        const roles = cx.state.computed(() => user()?.roles ?? []);
        const organizations = cx.state.computed(() => user()?.organizations ?? []);
        const activeOrganization = cx.state.computed(() => {
            const current = user();
            const activeId = activeOrganizationId();
            if (!current || !activeId) return null;
            return current.organizations.find((o) => o.organizationId === activeId) ?? null;
        });

        const api: WhoamiApi = {
            status,
            user,
            errorMessage,
            activeOrganizationId,
            hasAuthExtension,
            displayName,
            email,
            userId,
            roles,
            organizations,
            activeOrganization,
            refresh: fetchWhoami,
            switchOrganization,
            signIn,
            signOut,
        };

        const internal: WhoamiInternal = {
            status,
            user,
            errorMessage,
            activeOrganizationId,
            hasAuthExtension,
            authError,
            draftRevision,
            displayName,
            email,
            userId,
            roles,
            organizations,
            activeOrganization,
            refresh: fetchWhoami,
            switchOrganization,
            setEmailDraft,
            setPasswordDraft,
            signIn,
            signOut,
        };

        return { api, internal };
    }
}
