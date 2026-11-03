import { useState } from "react";

export default function CreateExceptionModal({
    open,
    onClose,
    onSubmit,
    coordinators,
    saving,
}) {
    const [form, setForm] = useState({
        coordinator_id: "",
        exception_name: "",
        exception_start_date: "",
        exception_end_date: "",
    });

    const [error, setError] = useState("");

    if (!open) return null;

    function updateField(key, value) {
        setForm((previous) => ({ ...previous, [key]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (
            form.exception_start_date &&
            form.exception_end_date &&
            form.exception_end_date < form.exception_start_date
        ) {
            setError("تاريخ النهاية يجب ألا يكون قبل تاريخ البداية.");
            return;
        }

        try {
            await onSubmit({
                coordinatorCode: Number(
                    coordinators.find(
                        (coordinator) =>
                            coordinator.id === Number(form.coordinator_id)
                    )?.code
                ),
                exceptionName: form.exception_name.trim(),
                exceptionStartDate: form.exception_start_date,
                exceptionEndDate: form.exception_end_date,
            });

            setForm({
                coordinator_id: "",
                exception_name: "",
                exception_start_date: "",
                exception_end_date: "",
            });
        } catch (err) {
            setError(err.message || "فشل إضافة الاستثناء.");
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
                <h2 className="mb-5 text-xl font-bold">إضافة استثناء</h2>

                <div className="mb-4">
                    <label className="mb-1 block font-semibold">
                        المنسق
                    </label>
                    <select
                        required
                        value={form.coordinator_id}
                        onChange={(event) =>
                            updateField("coordinator_id", event.target.value)
                        }
                        className="w-full rounded-lg border p-2.5"
                    >
                        <option value="">اختر المنسق</option>
                        {coordinators.map((coordinator) => (
                            <option
                                key={coordinator.id}
                                value={coordinator.id}
                            >
                                {coordinator.code} - {coordinator.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label className="mb-1 block font-semibold">
                        اسم الاستثناء
                    </label>
                    <input
                        required
                        value={form.exception_name}
                        onChange={(event) =>
                            updateField("exception_name", event.target.value)
                        }
                        className="w-full rounded-lg border p-2.5"
                    />
                </div>

                <div className="mb-4">
                    <label className="mb-1 block font-semibold">
                        تاريخ البداية
                    </label>
                    <input
                        type="date"
                        required
                        value={form.exception_start_date}
                        onChange={(event) =>
                            updateField(
                                "exception_start_date",
                                event.target.value
                            )
                        }
                        className="w-full rounded-lg border p-2.5"
                    />
                </div>

                <div className="mb-4">
                    <label className="mb-1 block font-semibold">
                        تاريخ النهاية
                    </label>
                    <input
                        type="date"
                        required
                        value={form.exception_end_date}
                        onChange={(event) =>
                            updateField(
                                "exception_end_date",
                                event.target.value
                            )
                        }
                        className="w-full rounded-lg border p-2.5"
                    />
                </div>

                {error && (
                    <p className="mb-3 text-red-600">{error}</p>
                )}

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                    >
                        {saving ? "جاري الحفظ..." : "حفظ الاستثناء"}
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