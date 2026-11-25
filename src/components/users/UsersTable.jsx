import { useState } from "react";
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
                                                onClick={() => onDeleteUser(item)}
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