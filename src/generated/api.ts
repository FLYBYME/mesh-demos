// GENERATED FILE — do not edit.
//
// Emitted from whoami's mesh.json by `mesh-serve client`.
// Exposure: sha256:2080ad1b8696dc7e0bdafa140c7299ae
//
// Regenerate rather than editing. The exposure hash above is checked at run time against
// the one the API reports, so a hand-edited client is a client that lies about a surface
// nobody can verify.

import { call, defineApi } from '@flybyme/mesh-web';

export interface IdentityWhoamiOutputOrganization {
    readonly organizationId: string;
    readonly name: string;
    readonly roleKey: string;
}

export interface IdentityWhoamiOutput {
    readonly userId: string;
    readonly email: string;
    readonly displayName: string;
    readonly roles: readonly string[];
    readonly organizations: readonly IdentityWhoamiOutputOrganization[];
}

export const whoamiApi = defineApi({
    id: "whoami",
    exposure: "sha256:2080ad1b8696dc7e0bdafa140c7299ae",
    base: "/api",
    calls: {
        /**
         * Who the caller is, and which organizations they belong to.
         *
         * GET /identity/whoami — auth: public
         */
        "identity.whoami": call<void, IdentityWhoamiOutput, never>("GET", "/identity/whoami"),
    },
});
