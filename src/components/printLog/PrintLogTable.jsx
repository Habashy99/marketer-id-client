
function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("ar-EG");
}

export default function PrintLogTable({
    logs,
    loading,
    deletingId,
    onDelete,
}) {
    return (
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-212.5 border-collapse text-right">
                    <thead className="bg-orange-50">
                        <tr>
                            {[
                                "حذف",
                                "كود الموظف",
                                "اسم الموظف",
                                "النوع",
                                "تم بواسطة",
                                "التاريخ",
                            ].map((heading) => (
                                <th
                                    key={heading}
                                    className="border-b px-4 py-3 text-sm font-bold text-gray-700"
                                >
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-8 text-center text-gray-500"
                                >
                                    جاري تحميل السجلات...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-8 text-center text-gray-500"
                                >
                                    لا توجد سجلات مطابقة للبحث.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr
                                    key={log.id}
                                    className="hover:bg-gray-50"
                                >
                                    <td className="border-b px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => onDelete(log)}
                                            disabled={
                                                Number(deletingId) === Number(log.id)
                                            }
                                            className="rounded-md bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {Number(deletingId) === Number(log.id)
                                                ? "جاري الحذف..."
                                                : "حذف"}
                                        </button>
                                    </td>

                                    <td className="border-b px-4 py-3">
                                        {log.code ?? "—"}
                                    </td>

                                    <td className="border-b px-4 py-3">
                                        {log.name ?? "—"}
                                    </td>

                                    <td className="border-b px-4 py-3">
                                        {log.type ?? "—"}
                                    </td>

                                    <td className="border-b px-4 py-3">
                                        {log.created_by ?? "—"}
                                    </td>

                                    <td className="whitespace-nowrap border-b px-4 py-3">
                                        {formatDate(log.date)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
