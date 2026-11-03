export function isAdmin(user) {
    return user?.type?.toLowerCase() === "admin";
}

function getAuthId(auth) {
    return Number(
        auth.authNumber ??
        auth.authId ??
        auth.auth_number ??
        auth.auth_id
    );
}

function getParentAuthId(auth) {
    const value = auth.parentAuthId ?? auth.parent_auth_id;

    return value == null ? null : Number(value);
}

export function hasPermission(user, authNumber) {
    if (!user) return false;

    if (isAdmin(user)) return true;

    const auths = user.auths ?? [];
    const requestedId = Number(authNumber);

    // The user has the permission directly.
    if (auths.some((auth) => getAuthId(auth) === requestedId)) {
        return true;
    }

    // The user has the parent system permission.
    // This grants access to its child permissions.
    const requestedAuth = auths.find(
        (auth) => getAuthId(auth) === requestedId
    );

    if (requestedAuth) return true;

    return auths.some(
        (auth) => getParentAuthId(auth) === requestedId
    );
}

export function hasParentPermission(user, parentAuthId) {
    if (!user) return false;

    if (isAdmin(user)) return true;

    const auths = user.auths ?? [];
    const requestedParentId = Number(parentAuthId);

    // Parent permission assigned directly.
    // Or one of its child permissions assigned.
    return auths.some(
        (auth) =>
            getAuthId(auth) === requestedParentId ||
            getParentAuthId(auth) === requestedParentId
    );
}