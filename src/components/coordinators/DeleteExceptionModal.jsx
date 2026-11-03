import { useEffect, useState } from "react";

export default function DeleteExceptionModal({
    open,
    onClose,
    onSubmit,
    coordinators,
    saving,
}) {
    const [coordinatorId, setCoordinatorId] = useState("");
    const [exceptionId, setExceptionId] = useState("");
    const [error, setError] = useState("");

    const selectedCoordinator = coordinators.find(
        (item) => String(item.id) === String(coordinatorId)
    );

    const exceptions = selectedCoordinator?.exceptions ?? [];

    useEffect(() => {
        setExceptionId("");
        setError("");
    }, [coordinatorId, open]);

    if (!open) return null;

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (!exceptionId) {
            setError("اختر الاستثناء المراد حذفه.");
            return;
        }

        try {
            await onSubmit({
                coordinatorId: Number(coordinatorId),
                exceptionId: Number(exceptionId),
            });
            setCoordinatorId("");
            setExceptionId("");
        } catch (err) {
            setError(err.message || "فشل حذف الاستثناء.");
        }
    }

    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl"
            >
                <h2 className="mb-5 text-xl font-bold text-red-700">
                    حذف استثناء
                </h2>

                <label className="mb-1 block font-semibold">
                    المنسق
                </label>
                <select
                    required
                    value={coordinatorId}
                    onChange={(event) =>
                        setCoordinatorId(event.target.value)
                    }
                    className="mb-4 w-full rounded-lg border p-2.5"
                >
                    <option value="">اختر المنسق</option>
                    {coordinators.map((coordinator) => (
                        <option key={coordinator.id} value={coordinator.id}>
                            {coordinator.code} - {coordinator.name}
                        </option>
                    ))}
                </select>

                <label className="mb-1 block font-semibold">
                    الاستثناء
                </label>
                <select
                    required
                    value={exceptionId}
                    onChange={(event) => setExceptionId(event.target.value)}
                    disabled={!coordinatorId || exceptions.length === 0}
                    className="mb-4 w-full rounded-lg border p-2.5 disabled:bg-gray-100"
                >
                    <option value="">اختر الاستثناء</option>
                    {exceptions.map((exception) => (
                        <option
                            key={exception.exception_id}
                            value={exception.exception_id}
                        >
                            {exception.exception_name} (#
                            {exception.exception_id})
                        </option>
                    ))}
                </select>

                {coordinatorId && exceptions.length === 0 && (
                    <p className="mb-3 text-sm text-gray-500">
                        لا توجد استثناءات لهذا المنسق.
                    </p>
                )}

                {error && (
                    <p className="mb-3 text-red-600">{error}</p>
                )}

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={saving || !exceptionId}
                        className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50"
                    >
                        {saving ? "جاري الحذف..." : "تأكيد الحذف"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-gray-200 px-4 py-2"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
}