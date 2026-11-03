
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { formatDate, inputClass } from "../../helpers/cardHelpers";

export default function CardLogsSection({
    logs,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    newQuantity,
    setNewQuantity,
    error,
    success,
    loading,
    saving,
    deletingId,
    onFilter,
    onClearFilter,
    onAdd,
    onDelete,
    setError,
    setSuccess,
    canAddQuantity = false,
}) {
    return (
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
                <h2 className="text-xl font-bold text-slate-900">
                    سجل البطاقات
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    إضافة كمية جديدة ومراجعة سجل الكميات.
                </p>
            </div>

            <form
                onSubmit={onFilter}
                className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end"
            >
                <div className="flex-1">
                    <label htmlFor="logsFromDate" className="mb-2 block text-sm font-semibold">
                        <CalendarDays size={16} className="ml-1 inline" />
                        من تاريخ
                    </label>
                    <input
                        id="logsFromDate"
                        type="date"
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={(e) => setFromDate(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div className="flex-1">
                    <label htmlFor="logsToDate" className="mb-2 block text-sm font-semibold">
                        <CalendarDays size={16} className="ml-1 inline" />
                        إلى تاريخ
                    </label>
                    <input
                        id="logsToDate"
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(e) => setToDate(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                >
                    {loading ? "جارٍ التحميل..." : "بحث"}
                </button>

                <button
                    type="button"
                    disabled={loading}
                    onClick={onClearFilter}
                    className="rounded-xl border border-slate-200 px-5 py-3 font-semibold hover:bg-slate-50 disabled:opacity-60"
                >
                    عرض الكل
                </button>
            </form>

            {canAddQuantity && (
                <form
                    onSubmit={onAdd}
                    className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-end"
                >
                    <div className="flex-1">
                        <label htmlFor="newQuantity" className="mb-2 block text-sm font-semibold">
                            كمية كروت جديدة
                        </label>
                        <input
                            id="newQuantity"
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={newQuantity}
                            onChange={(e) => {
                                setNewQuantity(e.target.value);
                                setError("");
                                setSuccess("");
                            }}
                            placeholder="أدخل الكمية"
                            className={inputClass}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
                    >
                        <Plus size={19} />
                        {saving ? "جارٍ الإضافة..." : "إضافة كمية"}
                    </button>
                </form>
            )}

            {error && (
                <p role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </p>
            )}

            {success && (
                <p role="status" className="mx-5 mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                    {success}
                </p>
            )}

            <div className="overflow-x-auto">
                <table className="w-full min-w-150 text-right text-sm">
                    <thead className="bg-orange-50 text-slate-700">
                        <tr>
                            <th className="px-4 py-4">حذف</th>
                            <th className="px-4 py-4">العدد</th>
                            <th className="px-4 py-4">التاريخ</th>
                            <th className="px-4 py-4">تم بواسطة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                                    جارٍ تحميل سجل البطاقات...
                                </td>
                            </tr>
                        ) : logs.length ? (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-orange-50/50">
                                    <td className="px-4 py-4">
                                        <button
                                            type="button"
                                            onClick={() => onDelete(log.id)}
                                            disabled={deletingId === log.id}
                                            title="حذف السجل"
                                            aria-label="حذف السجل"
                                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700">
                                            {log.quantity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">{formatDate(log.date)}</td>
                                    <td className="px-4 py-4">
                                        {log.created_by ?? log.createdBy ?? "غير معروف"}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                                    لا توجد سجلات بطاقات.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                عدد السجلات: {loading ? "..." : logs.length}
            </div>
        </section>
    );
}
