
const TYPE_FILTERS = [
    { label: "الكل", value: "" },
    { label: "جديد", value: "جديد" },
    { label: "بدل فاقد", value: "بدل فاقد" },
];

export default function PrintLogFilters({
    selectedType,
    setSelectedType,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    clearDateSearch,
}) {
    return (
        <section className="mb-5 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-end gap-3 overflow-x-auto">
                <div className="shrink-0">
                    <h2 className="mb-3 font-bold text-gray-700">
                        نوع سجل الطباعة
                    </h2>

                    <div className="flex gap-2">
                        {TYPE_FILTERS.map((item) => (
                            <button
                                key={item.value || "all"}
                                type="button"
                                onClick={() => setSelectedType(item.value)}
                                className={`whitespace-nowrap rounded-lg px-4 py-3 font-semibold transition ${
                                    selectedType === item.value
                                        ? "bg-orange-600 text-white"
                                        : "border border-gray-300 bg-white hover:bg-orange-50"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-w-40 flex-1">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        من تاريخ
                    </label>
                    <input
                        type="date"
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={(event) => setFromDate(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-3"
                    />
                </div>

                <div className="min-w-40 flex-1">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        إلى تاريخ
                    </label>
                    <input
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(event) => setToDate(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-3"
                    />
                </div>

                <button
                    type="button"
                    onClick={clearDateSearch}
                    className="shrink-0 rounded-lg border border-gray-300 px-5 py-3 transition hover:bg-gray-100"
                >
                    مسح التاريخ
                </button>
            </div>
        </section>
    );
}
