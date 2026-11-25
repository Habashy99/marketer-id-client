
import { useMemo, useState } from "react";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function groupUserAuths(auths = []) {
    const groups = new Map();

    for (const auth of auths) {
        const mainGroup =
            auth.grandparentAuthName ||
            auth.parentAuthName ||
            "صلاحيات أخرى";

        const subGroup = auth.grandparentAuthName
            ? auth.parentAuthName || "صلاحيات أخرى"
            : null;

        if (!groups.has(mainGroup)) {
            groups.set(mainGroup, {
                name: mainGroup,
                subGroups: new Map(),
            });
        }

        const group = groups.get(mainGroup);

        const groupKey = subGroup || mainGroup;

        if (!group.subGroups.has(groupKey)) {
            group.subGroups.set(groupKey, {
                name: subGroup,
                permissions: [],
            });
        }

        const currentSubGroup = group.subGroups.get(groupKey);

        const alreadyExists = currentSubGroup.permissions.some(
            (item) => item.authNumber === auth.authNumber
        );

        if (!alreadyExists) {
            currentSubGroup.permissions.push(auth);
        }
    }

    return Array.from(groups.values());
}

/* -------------------------------------------------------------------------- */
/* Permissions Modal                                                          */
/* -------------------------------------------------------------------------- */

function PermissionsModal({ user, onClose }) {
    const auths = Array.isArray(user?.auths) ? user.auths : [];

    const groups = useMemo(
        () => groupUserAuths(auths),
        [auths]
    );

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                dir="rtl"
                className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-orange-50 px-6 py-5">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            صلاحيات المستخدم
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            {user?.name || "—"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-500 transition hover:bg-red-100 hover:text-red-600"
                        aria-label="إغلاق"
                    >
                        ×
                    </button>
                </div>

                {/* User Information */}
                <div className="border-b border-gray-100 px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-gray-500">
                                كود المستخدم
                            </p>

                            <p className="mt-1 text-lg font-bold text-gray-800">
                                {user?.code ?? "—"}
                            </p>
                        </div>

                        <div className="rounded-xl bg-orange-100 px-5 py-3 text-center">
                            <p className="text-xs font-medium text-orange-700">
                                الصلاحيات المحددة
                            </p>

                            <p className="mt-1 text-2xl font-bold text-orange-700">
                                {auths.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">
                            اختر الصلاحيات
                        </h3>

                        <span className="text-sm text-gray-500">
                            محدد: {auths.length}
                        </span>
                    </div>

                    {groups.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                            <p className="font-semibold text-gray-600">
                                لا توجد صلاحيات لهذا المستخدم
                            </p>

                            <p className="mt-2 text-sm text-gray-400">
                                لم يتم تسجيل أي صلاحيات في قاعدة البيانات.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groups.map((group, groupIndex) => (
                                <div
                                    key={`${group.name}-${groupIndex}`}
                                    className="overflow-hidden rounded-xl border border-gray-200"
                                >
                                    <div className="border-b border-orange-100 bg-orange-50 px-5 py-3">
                                        <h4 className="font-bold text-orange-800">
                                            {group.name}
                                        </h4>
                                    </div>

                                    <div className="space-y-4 p-4">
                                        {Array.from(
                                            group.subGroups.values()
                                        ).map((subGroup, subIndex) => (
                                            <div
                                                key={`${subGroup.name || group.name}-${subIndex}`}
                                            >
                                                {subGroup.name && (
                                                    <h5 className="mb-3 border-r-4 border-orange-400 pr-3 font-semibold text-gray-700">
                                                        {subGroup.name}
                                                    </h5>
                                                )}

                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    {subGroup.permissions.map(
                                                        (permission) => (
                                                            <div
                                                                key={
                                                                    permission.authNumber
                                                                }
                                                                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                                                            >
                                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-green-500 bg-green-500 text-xs text-white">
                                                                    ✓
                                                                </span>

                                                                <span className="text-sm font-medium text-gray-700">
                                                                    {
                                                                        permission.authName
                                                                    }
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-gray-700 px-6 py-2.5 font-semibold text-white transition hover:bg-gray-800"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Users Table                                                                */
/* -------------------------------------------------------------------------- */

function UsersTable({
    users = [],
    loading,
    deletingId,
    onDeleteUser,
}) {
    const [selectedUser, setSelectedUser] = useState(null);

    return (
        <>
            <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                {loading ? (
                    <p className="p-8 text-center text-gray-500">
                        جاري تحميل المستخدمين...
                    </p>
                ) : (
                    <table
                        className="w-full min-w-250 text-right"
                        dir="rtl"
                    >
                        <thead className="bg-orange-50">
                            <tr>
                                <th className="p-4">الإجراءات</th>
                                <th className="p-4">الصلاحيات</th>
                                <th className="p-4">النوع</th>
                                <th className="p-4">تاريخ الإنشاء</th>
                                <th className="p-4">بواسطة</th>
                                <th className="p-4">الكود</th>
                                <th className="p-4">الاسم</th>
                            </tr>
                        </thead>

                        <tbody>
                            {users.map((item) => {
                                const isDeleting = deletingId === item.id;

                                return (
                                    <tr
                                        key={item.id ?? item.code}
                                        className="border-t border-gray-100 transition hover:bg-slate-50"
                                    >
                                        <td className="p-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onDeleteUser(item)
                                                }
                                                disabled={Boolean(deletingId)}
                                                className="whitespace-nowrap rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isDeleting
                                                    ? "جارٍ الحذف..."
                                                    : "حذف المستخدم"}
                                            </button>
                                        </td>

                                        <td className="p-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedUser(item)
                                                }
                                                className="whitespace-nowrap rounded-lg bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-200"
                                            >
                                                عرض الصلاحيات

                                                <span className="mr-2 inline-flex min-w-6 items-center justify-center rounded-full bg-white px-2 py-0.5">
                                                    {Array.isArray(item.auths)
                                                        ? item.auths.length
                                                        : 0}
                                                </span>
                                            </button>
                                        </td>

                                        <td className="p-4">
                                            {item.type ?? "—"}
                                        </td>

                                        <td className="p-4">
                                            {item.createdAt
                                                ? new Date(
                                                      item.createdAt
                                                  ).toLocaleDateString("ar-EG")
                                                : "—"}
                                        </td>

                                        <td className="p-4">
                                            {item.createdBy ?? "—"}
                                        </td>

                                        <td className="p-4">
                                            {item.code}
                                        </td>

                                        <td className="p-4 font-medium">
                                            {item.name}
                                        </td>
                                    </tr>
                                );
                            })}

                            {users.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="p-8 text-center text-gray-500"
                                    >
                                        لا يوجد مستخدمون لعرضهم.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedUser && (
                <PermissionsModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </>
    );
}

export default UsersTable;
