
import { useEffect, useMemo, useState } from "react";
import { sendHttpReq } from "../../lib/httpHandler";

function getAuthId(auth) {
    return Number(auth.authNumber ?? auth.auth_number);
}

function getParentId(auth) {
    const value = auth.parentAuthId ?? auth.parent_auth_id;
    return value == null ? null : Number(value);
}

function getAuthName(auth) {
    return auth.authName ?? auth.auth_name ?? "صلاحية بدون اسم";
}

function PermissionTreeNode({
    node,
    selectedIds,
    onToggle,
}) {
    const descendantIds = useMemo(() => {
        const ids = [];

        function collect(current) {
            ids.push(current.id);
            current.children.forEach(collect);
        }

        collect(node);
        return ids;
    }, [node]);

    const selectedCount = descendantIds.filter((id) =>
        selectedIds.includes(id)
    ).length;

    const checked = selectedCount === descendantIds.length;
    const indeterminate = selectedCount > 0 && !checked;

    return (
        <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-orange-50">
                <input
                    type="checkbox"
                    checked={checked}
                    ref={(element) => {
                        if (element) {
                            element.indeterminate = indeterminate;
                        }
                    }}
                    onChange={() => onToggle(descendantIds, checked)}
                    className="h-4 w-4 accent-orange-600"
                />

                <span className="font-medium text-slate-800">
                    {node.name}
                </span>
            </label>

            {node.children.length > 0 && (
                <div className="mr-5 space-y-2 border-r-2 border-orange-100 pr-3">
                    {node.children.map((child) => (
                        <PermissionTreeNode
                            key={child.id}
                            node={child}
                            selectedIds={selectedIds}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function UserModal({ type, onClose, onSuccess, currentUser }) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [userType, setUserType] = useState("user");
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    const [auths, setAuths] = useState([]);
    const [authsLoading, setAuthsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const titles = {
        create: "إضافة مستخدم جديد",
        give: "منح صلاحيات",
        delete: "حذف صلاحيات",
    };

    useEffect(() => {
        if (type !== "give" && type !== "delete") {
            setAuths([]);
            setSelectedPermissions([]);
            return;
        }

        let cancelled = false;

        async function fetchAuths() {
            setAuthsLoading(true);
            setError("");

            try {
                const response = await sendHttpReq("auths");
                const records = response?.auths;

                if (!Array.isArray(records)) {
                    throw new Error(
                        response?.message || "تعذر تحميل الصلاحيات."
                    );
                }

                if (!cancelled) {
                    setAuths(records);
                    setSelectedPermissions([]);
                }
            } catch (err) {
                if (!cancelled) {
                    setAuths([]);
                    setError(err.message || "فشل تحميل الصلاحيات.");
                }
            } finally {
                if (!cancelled) setAuthsLoading(false);
            }
        }

        fetchAuths();

        return () => {
            cancelled = true;
        };
    }, [type]);

    const permissionTree = useMemo(() => {
        const nodes = new Map();

        auths.forEach((auth) => {
            const id = getAuthId(auth);

            if (Number.isInteger(id) && id > 0) {
                nodes.set(id, {
                    id,
                    name: getAuthName(auth),
                    parentId: getParentId(auth),
                    children: [],
                });
            }
        });

        const roots = [];

        nodes.forEach((node) => {
            const parent = nodes.get(node.parentId);

            if (
                parent &&
                parent.id !== node.id
            ) {
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        });

        const sortNodes = (items) => {
            items.sort((a, b) =>
                a.name.localeCompare(b.name, "ar")
            );

            items.forEach((item) => sortNodes(item.children));
        };

        sortNodes(roots);

        return roots;
    }, [auths]);

    const togglePermissions = (ids, currentlyChecked) => {
        setSelectedPermissions((previous) => {
            if (currentlyChecked) {
                return previous.filter((id) => !ids.includes(id));
            }

            return [...new Set([...previous, ...ids])];
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        const trimmedCode = code.trim();

        if (!/^\d+$/.test(trimmedCode) || Number(trimmedCode) <= 0) {
            setError("يرجى إدخال كود مستخدم صحيح.");
            return;
        }

        if (type === "create") {
            if (!name.trim()) {
                setError("يرجى إدخال اسم المستخدم.");
                return;
            }

            if (!password) {
                setError("يرجى إدخال كلمة المرور.");
                return;
            }
        }

        if (type === "give" || type === "delete") {
            if (selectedPermissions.length === 0) {
                setError("يرجى اختيار صلاحية واحدة على الأقل.");
                return;
            }
        }

        if (!["create", "give", "delete"].includes(type)) {
            setError("نوع العملية غير صحيح.");
            return;
        }

        setLoading(true);

        try {
            let response;

            if (type === "create") {
                response = await sendHttpReq(
                    "users/createUser",
                    "POST",
                    {
                        code: Number(trimmedCode),
                        name: name.trim(),
                        password,
                        createdBy: currentUser?.code,
                        type: userType,
                    }
                );
            } else if (type === "give") {
                response = await sendHttpReq(
                    "authsUser/createAuthUser",
                    "POST",
                    {
                        code: Number(trimmedCode),
                        authIds: selectedPermissions,
                    }
                );
            } else {
                response = await sendHttpReq(
                    "authsUser/deleteAuthUser",
                    "DELETE",
                    {
                        code: Number(trimmedCode),
                        authIds: selectedPermissions,
                    }
                );
            }

            setSuccess(response?.message || "تمت العملية بنجاح.");
            await onSuccess();
        } catch (err) {
            setError(err.message || "حدث خطأ أثناء تنفيذ العملية.");
        } finally {
            setLoading(false);
        }
    };

    const isPermissionOperation = type === "give" || type === "delete";

    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !loading
                ) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-modal-title"
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            >
                <div className="flex items-center justify-between gap-4">
                    <h2
                        id="user-modal-title"
                        className="text-xl font-bold text-orange-600"
                    >
                        {titles[type] || "إدارة المستخدمين"}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="إغلاق"
                        className="rounded-lg px-3 py-1 text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {type === "create" && (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    الاسم
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    required
                                    autoFocus
                                    className="w-full rounded-lg border border-gray-300 px-3 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    كود المستخدم
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={code}
                                    onChange={(event) => setCode(event.target.value)}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    كلمة المرور
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-3"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    نوع المستخدم
                                </label>
                                <select
                                    value={userType}
                                    onChange={(event) => setUserType(event.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-3"
                                >
                                    <option value="user">مستخدم</option>
                                    <option value="admin">مدير</option>
                                </select>
                            </div>
                        </>
                    )}

                    {isPermissionOperation && (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    كود المستخدم
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={code}
                                    onChange={(event) => setCode(event.target.value)}
                                    required
                                    autoFocus
                                    className="w-full rounded-lg border border-gray-300 px-3 py-3"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <h3 className="font-semibold text-slate-800">
                                    اختر الصلاحيات
                                </h3>

                                <span className="text-sm text-slate-500">
                                    محدد: {selectedPermissions.length}
                                </span>
                            </div>

                            {authsLoading ? (
                                <p className="rounded-lg border p-4 text-slate-500">
                                    جارٍ تحميل الصلاحيات...
                                </p>
                            ) : permissionTree.length === 0 ? (
                                <p className="rounded-lg border p-4 text-slate-500">
                                    لا توجد صلاحيات متاحة.
                                </p>
                            ) : (
                                <div className="max-h-80 space-y-4 overflow-y-auto rounded-xl border border-slate-200 p-3">
                                    {permissionTree.map((node) => (
                                        <PermissionTreeNode
                                            key={node.id}
                                            node={node}
                                            selectedIds={selectedPermissions}
                                            onToggle={togglePermissions}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <p
                            role="alert"
                            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                        >
                            {error}
                        </p>
                    )}

                    {success && (
                        <p
                            role="status"
                            className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
                        >
                            {success}
                        </p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
                        >
                            إلغاء
                        </button>

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                (isPermissionOperation &&
                                    (authsLoading || auths.length === 0))
                            }
                            className="rounded-lg bg-orange-600 px-5 py-2 text-white hover:bg-orange-700 disabled:opacity-60"
                        >
                            {loading
                                ? "جارٍ التنفيذ..."
                                : type === "give"
                                  ? "منح الصلاحيات"
                                  : type === "delete"
                                    ? "حذف الصلاحيات"
                                    : "تأكيد"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UserModal;
