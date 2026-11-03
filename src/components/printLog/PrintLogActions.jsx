
export default function PrintLogActions({
    count,
    loading,
    onExport,
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <h2 className="text-lg font-bold">سجل الطباعة</h2>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={loading}
                    className="rounded-lg bg-slate-700 px-4 py-2.5 font-medium text-white disabled:opacity-50"
                >
                    عدد السجلات: {count}
                </button>

                <button
                    type="button"
                    onClick={onExport}
                    disabled={count === 0}
                    className="rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    استخراج إلى Excel
                </button>
            </div>
        </div>
    );
}
