
export default function PrintLogHeader({
    navigate,
    loadLogs,
    loading,
}) {
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-orange-700 sm:text-3xl">
                سجل الباعة
            </h1>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => navigate("/marketing")}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-100"
                >
                    العودة لنظام التسويق
                </button>

                <button
                    type="button"
                    onClick={loadLogs}
                    disabled={loading}
                    className="rounded-lg border border-orange-600 px-4 py-2 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                >
                    {loading ? "جاري التحديث..." : "تحديث البيانات"}
                </button>
            </div>
        </div>
    );
}
