import { useEffect, useState } from "react";
import SearchableSelect from "../SearchableSelect";
const INITIAL_FORM = {
    name: "",
    mother_company: "",
    advertising_company_id: "",
    national_id_number: "",
    branch: "",
    from_date: "",
    to_date: "",
};

export default function CreateTemporaryCoordinatorModal({
    open,
    onClose,
    onSubmit,
    companies,
    saving,
}) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setForm(INITIAL_FORM);
            setError("");
        }
    }, [open]);

    if (!open) return null;

    const updateField = (key, value) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (form.to_date < form.from_date) {
            setError("تاريخ النهاية يجب أن يكون بعد تاريخ البداية.");
            return;
        }

        try {
            await onSubmit({
                ...form,
                name: form.name.trim(),
                mother_company: String(form.mother_company).trim(),
                national_id_number: form.national_id_number.trim(),
                branch: String(form.branch).trim(),
                advertising_company_id: Number(form.advertising_company_id),
            });

            setForm(INITIAL_FORM);
        } catch (err) {
            setError(err.message || "فشل إضافة المنسق المؤقت.");
        }
    };

    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
            onClick={onClose}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(event) => event.stopPropagation()}
                className="my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            >
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-orange-600">
                        إضافة منسق مؤقت
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-red-600"
                    >
                        إغلاق ✕
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Name */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            الاسم
                        </label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) =>
                                updateField("name", e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        />
                    </div>

                    {/* Mother company */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            الشركة الأم
                        </label>

                        <SearchableSelect
                            endpoint="retail/suppliers/search"
                            value={form.mother_company}
                            onChange={(value) => updateField("mother_company", value)}
                            placeholder="ابحث عن الشركة الأم..."
                            isClearable
                        />
                    </div>

                    {/* Advertising company */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            الشركة الإعلانية
                        </label>

                        <SearchableSelect
                            options={companies.map((company) => ({
                                value: String(company.id),
                                label: company.name,
                            }))}
                            value={form.advertising_company_id}
                            onChange={(value) =>
                                updateField("advertising_company_id", value)
                            }
                            placeholder="ابحث عن الشركة الإعلانية..."
                            isDisabled={companies.length === 0}
                            isClearable
                        />
                    </div>

                    {/* National ID */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            الرقم القومي
                        </label>
                        <input
                            type="text"
                            required
                            maxLength={14}
                            value={form.national_id_number}
                            onChange={(e) =>
                                updateField(
                                    "national_id_number",
                                    e.target.value
                                )
                            }
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        />
                    </div>

                    {/* Branch */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            الفرع
                        </label>

                        <SearchableSelect
                            endpoint="retail/branches/search"
                            value={form.branch}
                            onChange={(value) => updateField("branch", value)}
                            placeholder="ابحث عن الفرع..."
                            isClearable
                        />
                    </div>

                    {/* From date */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            من تاريخ
                        </label>
                        <input
                            type="date"
                            required
                            value={form.from_date}
                            onChange={(e) =>
                                updateField("from_date", e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        />
                    </div>

                    {/* To date */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            إلى تاريخ
                        </label>
                        <input
                            type="date"
                            required
                            min={form.from_date || undefined}
                            value={form.to_date}
                            onChange={(e) =>
                                updateField("to_date", e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 p-2.5"
                        />
                    </div>
                </div>

                {error && (
                    <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </p>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        type="submit"
                        disabled={saving || companies.length === 0}
                        className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "جاري الحفظ..." : "حفظ المنسق"}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-gray-200 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-300"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
}