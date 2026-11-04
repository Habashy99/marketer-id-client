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
    const quantity = Number(newQuantity);
    const isValidQuantity =
        Number.isSafeInteger(quantity) && quantity !== 0;

    return (
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
                <h2 className="text-xl font-bold text-slate-900">
                    سجل البطاقات
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    إضافة أو خصم كمية ومراجعة سجل الكميات.
                </p>
            </div>

            {/* Date Filters */}
            <form
                onSubmit={onFilter}
                className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end"
            >
                <div className="flex-1">
                    <label
                        htmlFor="logsFromDate"
                        className="mb-2 block text-sm font-semibold"
                    >
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
                    <label
                        htmlFor="logsToDate"
                        className="mb-2 block text-sm font-semibold"
                    >
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

            {/* Add / Subtract Quantity */}
            {canAddQuantity && (
                <form
                    onSubmit={onAdd}
                    className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-end"
                >
                    <div className="flex-1">
                        <label
                            htmlFor="newQuantity"
                            className="mb-2 block text-sm font-semibold"
                        >
                            تعديل كمية الكروت
                        </label>

                        <input
                            id="newQuantity"
                            type="number"
                            step="1"
                            required
                            value={newQuantity}
                            onChange={(e) => {
                                setNewQuantity(e.target.value);
                                setError("");
                                setSuccess("");
                            }}
                            placeholder="مثال: 10 للإضافة أو -5 للخصم"
                            className={inputClass}
                        />

                        <p className="mt-2 text-xs text-slate-500">
                            أدخل رقماً موجباً للإضافة أو سالباً للخصم.
                        </p>

                        {newQuantity !== "" && isValidQuantity && (
                            <p
                                className={`mt-2 text-sm font-semibold ${quantity > 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                            >
                                {quantity > 0
                                    ? `سيتم إضافة ${quantity} كارت`
                                    : `سيتم خصم ${Math.abs(quantity)} كارت`}
                            </p>
                        )}
                    </div>
                    <div className="mb-7">
                        <button
                            type="submit"
                            disabled={saving || !isValidQuantity}
                            className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${isValidQuantity && quantity < 0
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-orange-600 hover:bg-orange-700"
                                }`}
                        >
                            <Plus size={19} />

                            {saving
                                ? "جارٍ التنفيذ..."
                                : "تنفيذ التعديل"}
                        </button>
                    </div>
                </form>
            )}

            {/* Messages */}
            {error && (
                <p
                    role="alert"
                    className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            {success && (
                <p
                    role="status"
                    className="mx-5 mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700"
                >
                    {success}
                </p>
            )}

            {/* Logs Table */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-150 text-right text-sm">
                    <thead className="bg-orange-50 text-slate-700">
                        <tr>
                            <th className="px-4 py-4">حذف</th>
                            <th className="px-4 py-4">العدد</th>
                            <th className="px-4 py-4">نوع العملية</th>
                            <th className="px-4 py-4">التاريخ</th>
                            <th className="px-4 py-4">تم بواسطة</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-10 text-center text-slate-500"
                                >
                                    جارٍ تحميل سجل البطاقات...
                                </td>
                            </tr>
                        ) : logs.length ? (
                            logs.map((log) => {
                                const isAddition = log.quantity > 0;

                                return (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-orange-50/50"
                                    >
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
                                            <span
                                                className={`rounded-full px-3 py-1 font-semibold ${isAddition
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}
                                            >
                                                {isAddition ? "+" : ""}
                                                {log.quantity}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4">
                                            <span
                                                className={`font-semibold ${isAddition
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                    }`}
                                            >
                                                {isAddition ? "إضافة" : "خصم"}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4">
                                            {formatDate(log.date)}
                                        </td>

                                        <td className="px-4 py-4">
                                            {log.created_by ??
                                                log.createdBy ??
                                                "غير معروف"}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-10 text-center text-slate-500"
                                >
                                    لا توجد سجلات بطاقات.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                عدد السجلات: {loading ? "..." : logs.length}
            </div>
        </section>
    );
}