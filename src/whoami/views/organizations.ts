import {
    command,
    each,
    element,
    text,
    when,
    type Node,
    type ViewContext,
} from '@flybyme/mesh-web';
import type { IdentityWhoamiOutputOrganization, WhoamiApi, WhoamiInternal } from '../contract.js';

export function renderOrganizationsView(vx: ViewContext<Record<string, never>, WhoamiApi, WhoamiInternal>): Node {
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
