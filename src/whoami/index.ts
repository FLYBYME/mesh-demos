import {
    command,
    consumes,
    each,
    element,
    needs,
    provider,
    text,
    tiles,
    when,
    type Application,
    type CommandDecl,
    type Context,
    type Json,
    type KeyDecl,
    type Node,
    type ProviderToken,
    type Signal,
    type ViewContext,
    type ViewDecl,
} from '@flybyme/mesh-web';
import { AUTH, type AuthApi } from '@flybyme/mesh-web';
import {
    whoamiApi,
    type IdentityWhoamiOutput,
    type IdentityWhoamiOutputOrganization,
} from '../generated/api.js';

// ---------------------------------------------------------------------------- contract & API

export interface WhoamiApi {
    // Current identity state
    readonly status: Signal<'loading' | 'signed-in' | 'signed-out' | 'error'>;
    readonly user: Signal<IdentityWhoamiOutput | null>;
    readonly errorMessage: Signal<string | null>;
    readonly activeOrganizationId: Signal<string | null>;
    readonly hasAuthExtension: Signal<boolean>;
    readonly authError: Signal<string | null>;
    readonly draftRevision: Signal<number>;

    // Computed / helpers
    readonly displayName: () => string;
    readonly email: () => string;
    readonly userId: () => string;
    readonly roles: () => readonly string[];
    readonly organizations: () => readonly IdentityWhoamiOutputOrganization[];
    readonly activeOrganization: () => IdentityWhoamiOutputOrganization | null;

    // Actions
    refresh(): Promise<void>;
    switchOrganization(organizationId: string | null): Promise<void>;
    setEmailDraft(email: string): void;
    setPasswordDraft(password: string): void;
    signIn(credentials?: { email: string; password: string }): Promise<void>;
    signOut(): Promise<void>;
}

export const WHOAMI: ProviderToken<WhoamiApi> = provider<WhoamiApi>('whoami');

const NEEDS = needs('mesh', 'state', 'commands', 'windows', 'log');
const CONSUMES = consumes(AUTH);

// ---------------------------------------------------------------------------- views

function renderIdentityView(vx: ViewContext<Record<string, never>, WhoamiApi>): Node {
    return element('Stack', {
        props: {
            class: 'whoami-pane whoami-identity-pane',
            gap: 14,
            style: {
                padding: '20px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                overflow: 'auto',
            },
        },
        children: [
            // Header with status badge
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: { class: 'whoami-title', style: { margin: '0', 'font-size': '18px' } },
                        children: [text('Platform Identity')],
                    }),
                    element('Badge', {
                        props: {
                            class: () => `status-badge badge-${vx.app.status()}`,
                            style: () => {
                                const st = vx.app.status();
                                const color = st === 'signed-in' ? '#3fb950' : st === 'loading' ? '#58a6ff' : st === 'error' ? '#f85149' : '#ffa657';
                                return {
                                    padding: '3px 8px',
                                    'border-radius': '12px',
                                    'font-size': '11px',
                                    'font-weight': '600',
                                    'text-transform': 'uppercase',
                                    border: `1px solid ${color}`,
                                    color,
                                };
                            },
                        },
                        children: [text(() => vx.app.status())],
                    }),
                ],
            }),

            // Loading state
            when(
                () => vx.app.status() === 'loading',
                () => element('Card', {
                    props: {
                        class: 'whoami-loading-card',
                        style: {
                            padding: '24px',
                            background: 'var(--surface)',
                            border: '1px solid var(--edge)',
                            'border-radius': '8px',
                            'text-align': 'center',
                        },
                    },
                    children: [
                        element('Text', {
                            props: { class: 'loading-message', style: { color: 'var(--ink-dim)' } },
                            children: [text('Connecting to mesh identity (calling identity.whoami)...')],
                        }),
                    ],
                }),
            ),

            // Error state
            when(
                () => vx.app.status() === 'error',
                () => element('Card', {
                    props: {
                        class: 'whoami-error whoami-error-card',
                        style: {
                            padding: '16px',
                            background: 'var(--surface)',
                            border: '1px solid #f85149',
                            'border-radius': '8px',
                            display: 'flex',
                            'flex-direction': 'column',
                            gap: '10px',
                        },
                    },
                    children: [
                        element('Text', {
                            props: { style: { 'font-weight': '600', color: '#f85149' } },
                            children: [text('Call Refused or Failed')],
                        }),
                        element('Text', {
                            props: { class: 'error-message', style: { 'font-size': '13px', color: 'var(--ink)' } },
                            children: [text(() => vx.app.errorMessage() ?? 'An unknown error occurred.')],
                        }),
                        element('Button', {
                            props: { class: 'btn-retry', style: { padding: '6px 12px', 'align-self': 'flex-start' } },
                            intents: { activate: { action: command('whoami.refresh') } },
                            children: [text('Retry Call')],
                        }),
                    ],
                }),
            ),

            // Signed-out state
            when(
                () => vx.app.status() === 'signed-out',
                () => element('Stack', {
                    props: { class: 'whoami-signed-out', gap: 12 },
                    children: [
                        element('Card', {
                            props: {
                                class: 'signed-out-notice-card',
                                style: {
                                    padding: '16px',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--edge)',
                                    'border-radius': '8px',
                                    display: 'flex',
                                    'flex-direction': 'column',
                                    gap: '8px',
                                },
                            },
                            children: [
                                element('Heading', {
                                    props: { class: 'signed-out-heading', style: { margin: '0', 'font-size': '15px' } },
                                    children: [text('Anonymous Caller')],
                                }),
                                element('Text', {
                                    props: { class: 'signed-out-detail', style: { 'font-size': '13px', color: 'var(--ink-dim)' } },
                                    children: [
                                        text('identity.whoami is gated to user auth. A refusal (401) is an answer, not an exception.'),
                                    ],
                                }),
                                when(
                                    () => !vx.app.hasAuthExtension(),
                                    () => element('Row', {
                                        props: {
                                            class: 'auth-notice auth-absent-notice',
                                            style: {
                                                padding: '6px 10px',
                                                background: 'var(--chrome)',
                                                border: '1px dashed var(--edge)',
                                                'border-radius': '4px',
                                                'font-size': '12px',
                                                color: 'var(--ink-dim)',
                                            },
                                        },
                                        children: [
                                            text('Standalone mode: auth Extension is not composed in this site. App operates in anonymous/degraded mode.'),
                                        ],
                                    }),
                                ),
                            ],
                        }),

                        // Sign-in form if auth Extension is available
                        when(
                            () => vx.app.hasAuthExtension(),
                            () => element('Card', {
                                props: {
                                    class: 'signin-card',
                                    style: {
                                        padding: '16px',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--edge)',
                                        'border-radius': '8px',
                                        display: 'flex',
                                        'flex-direction': 'column',
                                        gap: '12px',
                                    },
                                },
                                children: [
                                    element('Heading', {
                                        props: { style: { margin: '0', 'font-size': '14px' } },
                                        children: [text('Sign In via Auth Extension')],
                                    }),
                                    when(
                                        () => vx.app.authError() !== null,
                                        () => element('Text', {
                                            props: {
                                                class: 'auth-error-text',
                                                style: { color: '#f85149', 'font-size': '13px' },
                                            },
                                            children: [text(() => vx.app.authError() ?? '')],
                                        }),
                                    ),
                                    element('Form', {
                                        props: {
                                            class: 'whoami-signin-form',
                                            style: { display: 'flex', 'flex-direction': 'column', gap: '8px' },
                                        },
                                        intents: { commit: { action: command('whoami.signIn'), preventDefault: true } },
                                        children: [
                                            element('Stack', {
                                                props: { gap: 4 },
                                                children: [
                                                    element('Text', {
                                                        props: { style: { 'font-size': '12px', color: 'var(--ink-dim)' } },
                                                        children: [text('Email Address')],
                                                    }),
                                                    each(
                                                        () => [vx.app.draftRevision()],
                                                        (rev) => rev,
                                                        () => element('Input', {
                                                            props: {
                                                                class: 'input-email whoami-input-email',
                                                                type: 'email',
                                                                placeholder: 'user@example.com',
                                                                style: {
                                                                    padding: '6px 8px',
                                                                    background: 'var(--chrome)',
                                                                    border: '1px solid var(--edge)',
                                                                    'border-radius': '4px',
                                                                    color: 'var(--ink)',
                                                                },
                                                            },
                                                            intents: { change: { action: command('whoami.setEmail') } },
                                                        }),
                                                    ),
                                                ],
                                            }),
                                            element('Stack', {
                                                props: { gap: 4 },
                                                children: [
                                                    element('Text', {
                                                        props: { style: { 'font-size': '12px', color: 'var(--ink-dim)' } },
                                                        children: [text('Password')],
                                                    }),
                                                    each(
                                                        () => [vx.app.draftRevision()],
                                                        (rev) => rev,
                                                        () => element('Input', {
                                                            props: {
                                                                class: 'input-password whoami-input-password',
                                                                type: 'password',
                                                                placeholder: '••••••••',
                                                                style: {
                                                                    padding: '6px 8px',
                                                                    background: 'var(--chrome)',
                                                                    border: '1px solid var(--edge)',
                                                                    'border-radius': '4px',
                                                                    color: 'var(--ink)',
                                                                },
                                                            },
                                                            intents: { change: { action: command('whoami.setPassword') } },
                                                        }),
                                                    ),
                                                ],
                                            }),
                                            element('Button', {
                                                props: {
                                                    class: 'btn-signin',
                                                    type: 'submit',
                                                    style: {
                                                        padding: '8px 14px',
                                                        'margin-top': '4px',
                                                        background: 'var(--accent)',
                                                        color: 'var(--on-accent)',
                                                        'font-weight': '600',
                                                    },
                                                },
                                                intents: { activate: { action: command('whoami.signIn') } },
                                                children: [text('Sign In')],
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ),

                        element('Button', {
                            props: { class: 'btn-check-status', style: { padding: '6px 12px', 'align-self': 'flex-start' } },
                            intents: { activate: { action: command('whoami.refresh') } },
                            children: [text('Re-check Status')],
                        }),
                    ],
                }),
            ),

            // Signed-in state
            when(
                () => vx.app.status() === 'signed-in',
                () => element('Stack', {
                    props: { class: 'whoami-profile', gap: 14 },
                    children: [
                        // User info card
                        element('Card', {
                            props: {
                                class: 'profile-card',
                                style: {
                                    padding: '16px',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--edge)',
                                    'border-radius': '8px',
                                    display: 'flex',
                                    'flex-direction': 'column',
                                    gap: '8px',
                                },
                            },
                            children: [
                                element('Heading', {
                                    props: {
                                        class: 'whoami-display-name',
                                        style: { margin: '0', 'font-size': '20px', color: 'var(--ink)' },
                                    },
                                    children: [text(() => vx.app.displayName())],
                                }),
                                element('Text', {
                                    props: { class: 'whoami-email', style: { 'font-size': '14px', color: 'var(--ink-dim)' } },
                                    children: [text(() => vx.app.email())],
                                }),
                                element('Row', {
                                    props: { style: { display: 'flex', gap: '6px', 'align-items': 'center', 'margin-top': '4px' } },
                                    children: [
                                        element('Text', {
                                            props: { style: { 'font-size': '12px', color: 'var(--ink-dim)' } },
                                            children: [text('Principal ID:')],
                                        }),
                                        element('Text', {
                                            props: {
                                                class: 'whoami-user-id',
                                                style: {
                                                    'font-family': 'monospace',
                                                    'font-size': '12px',
                                                    background: 'var(--chrome)',
                                                    padding: '2px 6px',
                                                    'border-radius': '4px',
                                                },
                                            },
                                            children: [text(() => vx.app.userId())],
                                        }),
                                    ],
                                }),
                            ],
                        }),

                        // Cluster Roles
                        element('Card', {
                            props: {
                                class: 'roles-card',
                                style: {
                                    padding: '14px',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--edge)',
                                    'border-radius': '8px',
                                    display: 'flex',
                                    'flex-direction': 'column',
                                    gap: '8px',
                                },
                            },
                            children: [
                                element('Text', {
                                    props: {
                                        style: {
                                            'font-size': '11px',
                                            'font-weight': '600',
                                            'text-transform': 'uppercase',
                                            color: 'var(--ink-dim)',
                                        },
                                    },
                                    children: [text('Cluster-Scoped Roles')],
                                }),
                                when(
                                    () => vx.app.roles().length > 0,
                                    () => element('Row', {
                                        props: { class: 'roles-list', style: { display: 'flex', gap: '6px', 'flex-wrap': 'wrap' } },
                                        children: [
                                            each(
                                                () => vx.app.roles(),
                                                (role: string) => role,
                                                (role: () => string) => element('Badge', {
                                                    props: {
                                                        class: 'role-badge',
                                                        style: {
                                                            padding: '2px 8px',
                                                            background: 'var(--chrome)',
                                                            border: '1px solid var(--edge)',
                                                            'border-radius': '12px',
                                                            'font-size': '12px',
                                                            'font-family': 'monospace',
                                                            color: 'var(--accent)',
                                                        },
                                                    },
                                                    children: [text(() => role())],
                                                }),
                                            ),
                                        ],
                                    }),
                                    () => element('Text', {
                                        props: { style: { 'font-size': '13px', color: 'var(--ink-dim)' } },
                                        children: [text('None')],
                                    }),
                                ),
                            ],
                        }),

                        // Active Scope summary
                        element('Card', {
                            props: {
                                class: 'active-scope-card',
                                style: {
                                    padding: '14px',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--edge)',
                                    'border-radius': '8px',
                                    display: 'flex',
                                    'flex-direction': 'column',
                                    gap: '8px',
                                },
                            },
                            children: [
                                element('Row', {
                                    props: {
                                        style: {
                                            display: 'flex',
                                            'justify-content': 'space-between',
                                            'align-items': 'center',
                                        },
                                    },
                                    children: [
                                        element('Text', {
                                            props: {
                                                style: {
                                                    'font-size': '11px',
                                                    'font-weight': '600',
                                                    'text-transform': 'uppercase',
                                                    color: 'var(--ink-dim)',
                                                },
                                            },
                                            children: [text('Active Organization Scope')],
                                        }),
                                        element('Button', {
                                            props: { class: 'btn-open-orgs', style: { padding: '3px 8px', 'font-size': '12px' } },
                                            intents: { activate: { action: command('whoami.openOrganizations') } },
                                            children: [text('Manage Orgs')],
                                        }),
                                    ],
                                }),
                                when(
                                    () => vx.app.activeOrganization() !== null,
                                    () => element('Row', {
                                        props: { style: { display: 'flex', 'align-items': 'center', gap: '8px' } },
                                        children: [
                                            element('Text', {
                                                props: {
                                                    class: 'active-org-name',
                                                    style: { 'font-weight': '600', 'font-size': '14px' },
                                                },
                                                children: [text(() => vx.app.activeOrganization()?.name ?? '')],
                                            }),
                                            element('Badge', {
                                                props: {
                                                    class: 'active-org-role',
                                                    style: {
                                                        padding: '2px 6px',
                                                        'border-radius': '4px',
                                                        'font-size': '11px',
                                                        background: 'var(--chrome)',
                                                        border: '1px solid var(--edge)',
                                                        'font-family': 'monospace',
                                                    },
                                                },
                                                children: [text(() => vx.app.activeOrganization()?.roleKey ?? '')],
                                            }),
                                        ],
                                    }),
                                    () => element('Text', {
                                        props: { class: 'active-org-none', style: { 'font-size': '13px', color: 'var(--ink-dim)' } },
                                        children: [text('No organization selected (null scope). Requests are cluster-wide.')],
                                    }),
                                ),
                            ],
                        }),

                        // Action buttons
                        element('Row', {
                            props: { style: { display: 'flex', gap: '8px', 'margin-top': '4px' } },
                            children: [
                                element('Button', {
                                    props: { class: 'btn-refresh', style: { padding: '8px 14px' } },
                                    intents: { activate: { action: command('whoami.refresh') } },
                                    children: [text('Refresh')],
                                }),
                                when(
                                    () => vx.app.hasAuthExtension(),
                                    () => element('Button', {
                                        props: { class: 'btn-signout', style: { padding: '8px 14px' } },
                                        intents: { activate: { action: command('whoami.signOut') } },
                                        children: [text('Sign Out')],
                                    }),
                                ),
                            ],
                        }),
                    ],
                }),
            ),
        ],
    });
}

function renderOrganizationsView(vx: ViewContext<Record<string, never>, WhoamiApi>): Node {
    return element('Stack', {
        props: {
            class: 'whoami-pane whoami-orgs-pane',
            gap: 14,
            style: {
                padding: '20px',
                display: 'flex',
                'flex-direction': 'column',
                height: '100%',
                'box-sizing': 'border-box',
                overflow: 'auto',
            },
        },
        children: [
            element('Row', {
                props: {
                    style: {
                        display: 'flex',
                        'justify-content': 'space-between',
                        'align-items': 'center',
                    },
                },
                children: [
                    element('Heading', {
                        props: { class: 'orgs-title', style: { margin: '0', 'font-size': '18px' } },
                        children: [text('Organizations')],
                    }),
                    element('Badge', {
                        props: {
                            class: 'orgs-count-badge',
                            style: {
                                padding: '3px 8px',
                                'border-radius': '12px',
                                'font-size': '11px',
                                'font-weight': '600',
                                border: '1px solid var(--edge)',
                                background: 'var(--surface)',
                            },
                        },
                        children: [text(() => `${String(vx.app.organizations().length)} Memberships`)],
                    }),
                ],
            }),

            element('Text', {
                props: { style: { 'font-size': '13px', color: 'var(--ink-dim)' } },
                children: [
                    text('Organizations you belong to. Switching organization sets your active scope.'),
                ],
            }),

            // When signed out or loading
            when(
                () => vx.app.status() !== 'signed-in',
                () => element('Card', {
                    props: {
                        class: 'orgs-empty-card',
                        style: {
                            padding: '20px',
                            background: 'var(--surface)',
                            border: '1px solid var(--edge)',
                            'border-radius': '8px',
                            'text-align': 'center',
                        },
                    },
                    children: [
                        element('Text', {
                            props: { style: { color: 'var(--ink-dim)', 'font-size': '13px' } },
                            children: [
                                text(() => (vx.app.status() === 'loading'
                                    ? 'Loading organization memberships...'
                                    : 'Sign in to view and switch organizations.')),
                            ],
                        }),
                    ],
                }),
                // When signed in
                () => element('Stack', {
                    props: { gap: 10 },
                    children: [
                        when(
                            () => vx.app.organizations().length === 0,
                            () => element('Card', {
                                props: {
                                    class: 'orgs-none-card',
                                    style: {
                                        padding: '16px',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--edge)',
                                        'border-radius': '8px',
                                    },
                                },
                                children: [
                                    element('Text', {
                                        props: { style: { color: 'var(--ink-dim)', 'font-size': '13px' } },
                                        children: [text('You do not belong to any organizations.')],
                                    }),
                                ],
                            }),
                            () => element('List', {
                                props: {
                                    class: 'organizations-list',
                                    style: {
                                        display: 'flex',
                                        'flex-direction': 'column',
                                        gap: '8px',
                                        padding: '0',
                                        margin: '0',
                                        'list-style': 'none',
                                    },
                                },
                                children: [
                                    each(
                                        () => vx.app.organizations(),
                                        (org: IdentityWhoamiOutputOrganization) => org.organizationId,
                                        (org: () => IdentityWhoamiOutputOrganization) => {
                                            const isActive = (): boolean =>
                                                vx.app.activeOrganizationId() === org().organizationId;

                                            return element('ListItem', {
                                                props: {
                                                    class: () => `org-item org-item-${org().organizationId}`,
                                                    style: () => ({
                                                        padding: '14px',
                                                        background: 'var(--surface)',
                                                        border: isActive() ? '1px solid var(--accent)' : '1px solid var(--edge)',
                                                        'border-radius': '8px',
                                                        display: 'flex',
                                                        'flex-direction': 'column',
                                                        gap: '8px',
                                                    }),
                                                },
                                                children: [
                                                    element('Row', {
                                                        props: {
                                                            style: {
                                                                display: 'flex',
                                                                'justify-content': 'space-between',
                                                                'align-items': 'center',
                                                            },
                                                        },
                                                        children: [
                                                            element('Row', {
                                                                props: { style: { display: 'flex', gap: '8px', 'align-items': 'center' } },
                                                                children: [
                                                                    element('Text', {
                                                                        props: {
                                                                            class: 'org-name',
                                                                            style: { 'font-weight': '600', 'font-size': '15px' },
                                                                        },
                                                                        children: [text(() => org().name)],
                                                                    }),
                                                                    element('Badge', {
                                                                        props: {
                                                                            class: 'org-role',
                                                                            style: {
                                                                                padding: '2px 6px',
                                                                                'border-radius': '4px',
                                                                                'font-size': '11px',
                                                                                background: 'var(--chrome)',
                                                                                border: '1px solid var(--edge)',
                                                                                'font-family': 'monospace',
                                                                            },
                                                                        },
                                                                        children: [text(() => org().roleKey)],
                                                                    }),
                                                                ],
                                                            }),
                                                            when(
                                                                isActive,
                                                                () => element('Badge', {
                                                                    props: {
                                                                        class: 'active-scope-badge',
                                                                        style: {
                                                                            padding: '3px 8px',
                                                                            'border-radius': '12px',
                                                                            'font-size': '11px',
                                                                            'font-weight': '600',
                                                                            background: 'var(--accent)',
                                                                            color: 'var(--on-accent)',
                                                                        },
                                                                    },
                                                                    children: [text('✓ Active Scope')],
                                                                }),
                                                            ),
                                                        ],
                                                    }),
                                                    element('Row', {
                                                        props: {
                                                            style: {
                                                                display: 'flex',
                                                                'justify-content': 'space-between',
                                                                'align-items': 'center',
                                                            },
                                                        },
                                                        children: [
                                                            element('Text', {
                                                                props: {
                                                                    class: 'org-id',
                                                                    style: {
                                                                        'font-family': 'monospace',
                                                                        'font-size': '12px',
                                                                        color: 'var(--ink-dim)',
                                                                    },
                                                                },
                                                                children: [text(() => `ID: ${org().organizationId}`)],
                                                            }),
                                                            when(
                                                                () => !isActive(),
                                                                () => element('Button', {
                                                                    props: {
                                                                        class: `btn-switch-org btn-switch-org-${org().organizationId}`,
                                                                        style: { padding: '4px 10px', 'font-size': '12px' },
                                                                    },
                                                                    intents: { activate: { action: command('whoami.switchOrg', org().organizationId) } },
                                                                    children: [text('Switch to this Org')],
                                                                }),
                                                            ),
                                                        ],
                                                    }),
                                                ],
                                            });
                                        },
                                    ),
                                ],
                            }),
                        ),

                        // Option to clear scope when multiple orgs exist
                        when(
                            () => vx.app.organizations().length > 1 && vx.app.activeOrganizationId() !== null,
                            () => element('Button', {
                                props: {
                                    class: 'btn-clear-scope',
                                    style: { padding: '6px 12px', 'align-self': 'flex-start', 'font-size': '12px' },
                                },
                                intents: { activate: { action: command('whoami.switchOrg', null) } },
                                children: [text('Clear Scope (No Organization)')],
                            }),
                        ),
                    ],
                }),
            ),
        ],
    });
}

// ---------------------------------------------------------------------------- application

export default class WhoamiApp implements Application<typeof NEEDS, typeof CONSUMES, typeof WHOAMI> {
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

    readonly views: readonly ViewDecl<Record<string, never>, WhoamiApi>[] = [
        {
            id: 'identity',
            title: 'Platform Identity',
            tile: 'main',
            instances: 'one',
            defaultSize: { width: 440, height: 480 },
            minSize: { width: 300, height: 320 },
            render(vx: ViewContext<Record<string, never>, WhoamiApi>): Node {
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
            render(vx: ViewContext<Record<string, never>, WhoamiApi>): Node {
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

    async start(cx: Context<typeof NEEDS, typeof CONSUMES, typeof whoamiApi>): Promise<WhoamiApi> {
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

        return {
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
    }
}
