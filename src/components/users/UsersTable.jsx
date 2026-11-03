
import { useState } from "react";

function PermissionsModal({ user, onClose }) {
    const permissions = Array.isArray(user?.auths) ? user.auths : [];

    // الإدارة -> النظام -> الصلاحيات الفرعية
    const groups = {};

    permissions.forEach((auth) => {
        const administration =
            auth.grandparentAuthName || "إدارة أخرى";

        const system =
            auth.parentAuthName || "أنظمة أخرى";

        if (!groups[administration]) {
            groups[administration] = {};
        }

        if (!groups[administration][system]) {
            groups[administration][system] = [];
        }

        groups[administration][system].push(auth);
    });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="permissions-modal-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b bg-orange-50 p-5">
                    <div>
                        <h2
                            id="permissions-modal-title"
                            className="text-xl font-bold text-orange-700"
                        >
                            صلاحيات المستخدم
                        </h2>

                        <p className="mt-1 text-sm text-gray-600">
                            {user.name} — {user.code}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-2 text-gray-600 transition hover:bg-orange-100"
                        aria-label="إغلاق"
                    >
                        ✕
                    </button>
                </div>

                {/* Permissions */}
                <div className="overflow-y-auto p-5">
                    {permissions.length === 0 ? (
                        <p className="rounded-lg bg-gray-50 p-5 text-center text-gray-500">
                            لا توجد صلاحيات مسجلة لهذا المستخدم.
                        </p>
                    ) : (
                        <div className="space-y-5">
                            {Object.entries(groups).map(
                                ([administration, systems]) => (
                                    <section
                                        key={administration}
                                        className="overflow-hidden rounded-xl border border-orange-200"
                                    >
                                        {/* Administration */}
                                        <div className="flex items-center gap-3 bg-orange-100 px-4 py-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-700">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M3 21h18" />
                                                    <path d="M5 21V7l8-4v18" />
                                                    <path d="M19 21V11l-6-4" />
                                                    <path d="M9 9v.01" />
                                                    <path d="M9 12v.01" />
                                                    <path d="M9 15v.01" />
                                                    <path d="M9 18v.01" />
                                                </svg>
                                            </span>

                                            <div>
                                                <h3 className="font-bold text-orange-900">
                                                    {administration}
                                                </h3>
                                                <p className="text-xs text-orange-800">
                                                    الإدارة
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-4">
                                            {Object.entries(systems).map(
                                                ([systemName, systemPermissions]) => (
                                                    <section
                                                        key={systemName}
                                                        className="overflow-hidden rounded-lg border border-gray-200"
                                                    >
                                                        {/* System */}
                                                        <div className="flex items-center gap-2 bg-gray-100 px-4 py-3">
                                                            <span className="text-orange-600">
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="19"
                                                                    height="19"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <path d="M4 20h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-7l-2-3H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1Z" />
                                                                </svg>
                                                            </span>

                                                            <h4 className="font-semibold text-gray-800">
                                                                {systemName}
                                                            </h4>
                                                        </div>

                                                        {/* Child permissions */}
                                                        <div className="p-4">
                                                            <p className="mb-3 text-xs font-semibold text-gray-500">
                                                                الصلاحيات الفرعية
                                                            </p>

                                                            <ul className="space-y-3">
                                                                {systemPermissions.map(
                                                                    (permission, index) => (
                                                                        <li
                                                                            key={
                                                                                permission.authNumber ??
                                                                                `${permission.authName}-${index}`
                                                                            }
                                                                            className="flex items-start gap-2 text-sm text-gray-700"
                                                                        >
                                                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                                                                                ✓
                                                                            </span>

                                                                            <span>
                                                                                {permission.authName ||
                                                                                    "صلاحية غير معروفة"}
                                                                            </span>
                                                                        </li>
                                                                    )
                                                                )}
                                                            </ul>
                                                        </div>
                                                    </section>
                                                )
                                            )}
                                        </div>
                                    </section>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-start border-t p-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white transition hover:bg-orange-700"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
}

function UsersTable({ users = [], loading }) {
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
                        className="w-full min-w-200 text-right"
                        dir="rtl"
                    >
                        <thead className="bg-orange-50">
                            <tr>
                                <th className="p-4">الصلاحيات</th>
                                <th className="p-4">النوع</th>
                                <th className="p-4">تاريخ الإنشاء</th>
                                <th className="p-4">بواسطة</th>
                                <th className="p-4">الكود</th>
                                <th className="p-4">الاسم</th>
                            </tr>
                        </thead>

                        <tbody>
                            {users.map((item) => (
                                <tr
                                    key={item.id ?? item.code}
                                    className="border-t border-gray-100 transition hover:bg-slate-50"
                                >
                                    <td className="p-4">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedUser(item)}
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

                                    <td className="p-4">{item.code}</td>

                                    <td className="p-4">{item.name}</td>
                                </tr>
                            ))}

                            {users.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
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
