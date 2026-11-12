
import { useEffect, useState } from "react";
import SearchableSelect from "../SearchableSelect";

import { API_BASE_URL } from "../../lib/apiBase.js";

const INITIAL_FORM = {
    name: "",
    mother_company: "",
    advertising_company_id: "",
    national_id_number: "",
    branch: "",
    from_date: "",
    to_date: "",
    notes: "",
};

const getDateValue = (value) => {
    if (!value) return "";

    // Handles SQL date strings and ISO datetime strings.
    return String(value).slice(0, 10);
};

export default function CreateTemporaryCoordinatorModal({
    open,
    onClose,
    onSubmit,
    companies = [],
    saving = false,
    initialData = null,
    mode = "create",
}) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [error, setError] = useState("");

    // Security check state
    const [securityCheck, setSecurityCheck] = useState(null);
    const [checkingSecurity, setCheckingSecurity] = useState(false);

    const isEditing = mode === "edit" || Boolean(initialData);

    useEffect(() => {
        if (!open) return;

        if (initialData) {
            setForm({
                name: initialData.name ?? "",
                mother_company: String(
                    initialData.mother_company ?? ""
                ),
                advertising_company_id: String(
                    initialData.advertising_company_id ?? ""
                ),
                national_id_number:
                    initialData.national_id_number ?? "",
                branch: String(initialData.branch ?? ""),
                from_date: getDateValue(initialData.from_date),
                to_date: getDateValue(initialData.to_date),
                notes: initialData.notes ?? "",
            });
        } else {
            setForm({ ...INITIAL_FORM });
        }

        setError("");
        setSecurityCheck(null);
        setCheckingSecurity(false);
    }, [open, initialData]);

    if (!open) return null;

    const updateField = (key, value) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    /* ---------------------------------------------------------------------- */
    /*                           Security ID check                            */
    /* ---------------------------------------------------------------------- */

    async function checkNationalId(value) {
        const nationalId = String(value || "").trim();

        setSecurityCheck(null);

        if (!nationalId) {
            return {
                success: true,
                exists: false,
                blocked: false,
            };
        }

        if (!/^\d{14}$/.test(nationalId)) {
            const result = {
                success: false,
                error: "الرقم القومي يجب أن يتكون من 14 رقمًا.",
            };

            setSecurityCheck(result);
            return result;
        }

        try {
            setCheckingSecurity(true);

            const response = await fetch(
                `${API_BASE_URL}/security/check-national-id/${encodeURIComponent(
                    nationalId
                )}`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "فشل التحقق من الرقم القومي."
                );
            }

            const result = {
                ...data,
                national_id_number: nationalId,
            };

            setSecurityCheck(result);

            return result;
        } catch (err) {
            const result = {
                success: false,
                error:
                    err.message ||
                    "تعذر التحقق من الرقم القومي.",
                national_id_number: nationalId,
            };

            setSecurityCheck(result);

            return result;
        } finally {
            setCheckingSecurity(false);
        }
    }

    function handleNationalIdChange(value) {
        const nationalId = value
            .replace(/\D/g, "")
            .slice(0, 14);

        updateField("national_id_number", nationalId);

        // Reset previous security result when the ID changes.
        setSecurityCheck(null);
        setError("");
    }

    /* ---------------------------------------------------------------------- */
    /*                                Submit                                  */
    /* ---------------------------------------------------------------------- */

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!form.name.trim()) {
            setError("يرجى إدخال اسم المنسق.");
            return;
        }

        if (!form.national_id_number.trim()) {
            setError("يرجى إدخال الرقم القومي.");
            return;
        }

        if (!/^\d{14}$/.test(form.national_id_number.trim())) {
            setError("الرقم القومي يجب أن يتكون من 14 رقمًا.");
            return;
        }

        if (!form.from_date || !form.to_date) {
            setError("يرجى تحديد تاريخ البداية وتاريخ النهاية.");
            return;
        }

        if (form.to_date < form.from_date) {
            setError("تاريخ النهاية يجب أن يكون بعد تاريخ البداية.");
            return;
        }

        // Verify the national ID again before saving.
        const securityResult = await checkNationalId(
            form.national_id_number
        );

        if (!securityResult.success) {
            setError(
                securityResult.error ||
                    "تعذر التحقق من الرقم القومي. حاول مرة أخرى."
            );
            return;
        }

        if (securityResult.blocked) {
            setError(
                "لا يمكن حفظ هذا المنسق لأنه مسجل بحالة بلوك في إدارة الأمن."
            );
            return;
        }

        try {
            await onSubmit({
                ...form,
                name: form.name.trim(),
                mother_company: String(
                    form.mother_company
                ).trim(),
                national_id_number:
                    form.national_id_number.trim(),
                branch: String(form.branch).trim(),
                advertising_company_id: Number(
                    form.advertising_company_id
                ),
                notes: form.notes.trim(),
            });

            setForm({ ...INITIAL_FORM });
            setSecurityCheck(null);
            setError("");
        } catch (err) {
            setError(
                err.message ||
                    (isEditing
                        ? "فشل تعديل المنسق المؤقت."
                        : "فشل إضافة المنسق المؤقت.")
            );
        }
    };

    const inputClasses =
        "w-full rounded-lg border border-gray-300 p-2.5 focus:border-orange-500 focus:outline-none";

    const isBlocked = Boolean(securityCheck?.blocked);

    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
            onClick={saving ? undefined : onClose}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(event) => event.stopPropagation()}
                className="my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            >
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-orange-600">
                        {isEditing
                            ? "تعديل منسق مؤقت"
                            : "إضافة منسق مؤقت"}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="text-gray-500 hover:text-red-600 disabled:opacity-50"
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
                            disabled={saving}
                            value={form.name}
                            onChange={(e) =>
                                updateField("name", e.target.value)
                            }
                            className={inputClasses}
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
                            onChange={(value) =>
                                updateField("mother_company", value)
                            }
                            placeholder="ابحث عن الشركة الأم..."
                            isDisabled={saving}
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
                                updateField(
                                    "advertising_company_id",
                                    value
                                )
                            }
                            placeholder="ابحث عن الشركة الإعلانية..."
                            isDisabled={
                                saving || companies.length === 0
                            }
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
                            inputMode="numeric"
                            required
                            maxLength={14}
                            disabled={saving}
                            value={form.national_id_number}
                            onChange={(e) =>
                                handleNationalIdChange(e.target.value)
                            }
                            onBlur={(e) =>
                                checkNationalId(e.target.value)
                            }
                            className={`${inputClasses} ${
                                isBlocked
                                    ? "border-red-500 bg-red-50"
                                    : securityCheck?.exists
                                      ? "border-orange-400 bg-orange-50"
                                      : ""
                            }`}
                            placeholder="أدخل الرقم القومي المكون من 14 رقمًا"
                        />

                        {/* Checking */}
                        {checkingSecurity && (
                            <p className="mt-2 text-sm text-gray-500">
                                جاري التحقق من الرقم القومي...
                            </p>
                        )}

                        {/* Blocked person */}
                        {securityCheck?.blocked && (
                            <div className="mt-2 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
                                <p className="font-bold">
                                    هذا الشخص مسجل بحالة بلوك في إدارة الأمن!
                                </p>

                                {securityCheck.notes && (
                                    <p className="mt-1 text-sm">
                                        الملاحظات: {securityCheck.notes}
                                    </p>
                                )}

                                <p className="mt-2 text-xs font-semibold">
                                    لا يمكن حفظ هذا المنسق.
                                </p>
                            </div>
                        )}

                        {/* Existing security record */}
                        {securityCheck?.exists &&
                            !securityCheck.blocked && (
                                <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                                    <p>
                                        هذا الشخص مسجل في إدارة الأمن.
                                    </p>

                                    <p className="mt-1">
                                        الحالة:{" "}
                                        <strong>
                                            {securityCheck.security_status ||
                                                "غير محدد"}
                                        </strong>
                                    </p>

                                    {securityCheck.notes && (
                                        <p className="mt-2">
                                            الملاحظات:{" "}
                                            <strong>
                                                {securityCheck.notes}
                                            </strong>
                                        </p>
                                    )}
                                </div>
                            )}

                        {/* Check error */}
                        {securityCheck?.error && (
                            <p className="mt-2 text-sm text-red-600">
                                {securityCheck.error}
                            </p>
                        )}
                    </div>

                    {/* Branch */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            الفرع
                        </label>

                        <SearchableSelect
                            endpoint="retail/branches/search"
                            value={form.branch}
                            onChange={(value) =>
                                updateField("branch", value)
                            }
                            placeholder="ابحث عن الفرع..."
                            isDisabled={saving}
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
                            disabled={saving}
                            value={form.from_date}
                            onChange={(e) =>
                                updateField("from_date", e.target.value)
                            }
                            className={inputClasses}
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
                            disabled={saving}
                            value={form.to_date}
                            onChange={(e) =>
                                updateField("to_date", e.target.value)
                            }
                            className={inputClasses}
                        />
                    </div>

                    {/* Notes */}
                    <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-semibold">
                            الملاحظات
                        </label>

                        <textarea
                            rows={3}
                            disabled={saving}
                            value={form.notes}
                            onChange={(e) =>
                                updateField("notes", e.target.value)
                            }
                            className={inputClasses}
                        />
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <p
                        role="alert"
                        className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                    >
                        {error}
                    </p>
                )}

                {/* Footer */}
                <div className="mt-6 flex gap-3">
                    <button
                        type="submit"
                        disabled={
                            saving ||
                            checkingSecurity ||
                            companies.length === 0 ||
                            isBlocked
                        }
                        className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving
                            ? "جاري الحفظ..."
                            : checkingSecurity
                              ? "جاري التحقق..."
                              : isBlocked
                                ? "لا يمكن الحفظ - بلوك"
                                : isEditing
                                  ? "حفظ التعديلات"
                                  : "حفظ المنسق"}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg bg-gray-200 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
}
