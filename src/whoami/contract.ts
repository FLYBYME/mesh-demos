import {
    consumes,
    needs,
    provider,
    type ProviderToken,
    type ReadonlySignal,
    type Signal,
} from '@flybyme/mesh-web';
import { AUTH } from '@flybyme/mesh-web';
import type {
    IdentityWhoamiOutput,
    IdentityWhoamiOutputOrganization,
} from '../generated/api.js';

export type {
    IdentityWhoamiOutput,
    IdentityWhoamiOutputOrganization,
} from '../generated/api.js';

// ---------------------------------------------------------------------------- contract & API

export interface WhoamiApi {
    // Current identity state
    readonly status: ReadonlySignal<'loading' | 'signed-in' | 'signed-out' | 'error'>;
    readonly user: ReadonlySignal<IdentityWhoamiOutput | null>;
    readonly errorMessage: ReadonlySignal<string | null>;
    readonly activeOrganizationId: ReadonlySignal<string | null>;
    readonly hasAuthExtension: ReadonlySignal<boolean>;

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
    signIn(credentials?: { email: string; password: string }): Promise<void>;
    signOut(): Promise<void>;
}

export interface WhoamiInternal {
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

export const NEEDS = needs('mesh', 'state', 'commands', 'windows', 'log');
export const CONSUMES = consumes(AUTH);
