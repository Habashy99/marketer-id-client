
export function isAdmin(user) {
    return user?.type?.toLowerCase() === "admin";
}

function getAuthId(auth) {
    if (typeof auth === "number" || typeof auth === "string") {
        return Number(auth);
    }

    return Number(
        auth?.authNumber ??
        auth?.authId ??
        auth?.auth_number ??
        auth?.auth_id
    );
}

function getParentAuthId(auth) {
    if (!auth || typeof auth !== "object") return null;

    const value = auth.parentAuthId ?? auth.parent_auth_id;

    return value == null ? null : Number(value);
}

export function hasPermission(user, authNumber) {
    if (!user) return false;
    if (isAdmin(user)) return true;

    const auths = Array.isArray(user.auths) ? user.auths : [];
    const requestedId = Number(authNumber);

    return auths.some((auth) => {
        return (
            getAuthId(auth) === requestedId ||
            getParentAuthId(auth) === requestedId
        );
    });
}

export function hasParentPermission(user, parentAuthId) {
    return hasPermission(user, parentAuthId);
}
