
import { Package } from "lucide-react";

export default function CardStatistics({
    totalInventory,
    totalSpent,
    totalRemaining,
    loadingTotals,
}) {
    return (
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">

            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
                {[
                    { label: "إجمالي الرصيد", value: totalInventory },
                    { label: "إجمالي الرصيد المصروف", value: totalSpent },
                    { label: "إجمالي الرصيد المتبقي", value: totalRemaining },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="flex min-w-0 items-center gap-3 border-slate-200 sm:border-l sm:px-3"
                    >
                        <div className="shrink-0 rounded-xl bg-orange-100 p-3 text-orange-600">
                            <Package size={25} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm leading-6 text-slate-500">
                                {item.label}
                            </p>
                            <p className="mt-1 text-2xl font-bold text-slate-800">
                                {loadingTotals ? "..." : item.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
