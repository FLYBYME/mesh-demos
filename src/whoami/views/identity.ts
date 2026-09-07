import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { WhoamiApi } from '../contract.js';

export function renderIdentityView(vx: ViewContext<Record<string, never>, WhoamiApi>): Node {
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
