
export function formatDate(date) {
    if (!date) return "-";
    return String(date).slice(0, 10);
}

export const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
