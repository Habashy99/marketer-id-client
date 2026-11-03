
import { useMemo, useState } from "react";
import SearchableSelect from "../SearchableSelect";

const INITIAL_FORM = {
    code: "",
    name: "",
    job: "منسق",
    company_name: "",
    branch: "",
    advertising_company_id: "",
    email_discount: "لا",
    health_certificate_issuance_date: "",
    health_certificate_expiry_date: "",
    national_id_number: "",
    mobile: "",
    governorate: "",
    notes: "",
    id_issuance_date: "",
    id_expiry_date: "",
    created_by: "",
    address: "",
    supervisor_name: "",
    number_of_print_copies: "",
    security_situation: "",
    states: "مفعل",
};

const FIELDS = [
    { key: "code", label: "الكود", required: true },
    { key: "name", label: "الاسم", required: true },
    { key: "mobile", label: "الهاتف" },
    { key: "national_id_number", label: "رقم البطاقة الشخصية" },
    { key: "address", label: "العنوان" },
    { key: "supervisor_name", label: "اسم المشرف" },
    {
        key: "number_of_print_copies",
        label: "عدد نسخ الطباعة",
        type: "number",
    },
    {
        key: "health_certificate_issuance_date",
        label: "تاريخ إصدار الشهادة الصحية",
        type: "date",
    },
    {
        key: "health_certificate_expiry_date",
        label: "تاريخ انتهاء الشهادة الصحية",
        type: "date",
    },
    {
        key: "id_issuance_date",
        label: "تاريخ إصدار البطاقة",
        type: "date",
    },
    {
        key: "id_expiry_date",
        label: "تاريخ انتهاء البطاقة",
        type: "date",
    },
    { key: "created_by", label: "تم الإنشاء بواسطة" },
];

export default function CreateCoordinatorModal({
    open,
    onClose,
    onSubmit,
    saving = false,
    branches = [],
    advertisingCompanies = [],
}) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [error, setError] = useState("");

    const branchOptions = useMemo(
        () =>
            branches.map((branch) => ({
                value: String(branch.id),
                label: branch.a_name,
            })),
        [branches]
    );

    const advertisingCompanyOptions = useMemo(
        () =>
            advertisingCompanies.map((company) => ({
                value: String(company.id),
                label: company.name,
            })),
        [advertisingCompanies]
    );

    if (!open) return null;

    function updateField(key, value) {
        setForm((previous) => {
            const updatedForm = {
                ...previous,
                [key]: value,
            };

            if (key === "health_certificate_issuance_date" && value) {
                const date = new Date(`${value}T12:00:00`);
                date.setFullYear(date.getFullYear() + 1);

                updatedForm.health_certificate_expiry_date = [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, "0"),
                    String(date.getDate()).padStart(2, "0"),
                ].join("-");
            }

            return updatedForm;
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (!form.code.trim()) {
            setError("يرجى إدخال كود المنسق.");
            return;
        }

        if (!form.name.trim()) {
            setError("يرجى إدخال اسم المنسق.");
            return;
        }

        if (!form.company_name) {
            setError("يرجى اختيار الشركة / المورد.");
            return;
        }

        if (!form.branch) {
            setError("يرجى اختيار الفرع.");
            return;
        }

        try {
            await onSubmit({
                ...form,
                code: form.code.trim(),
                name: form.name.trim(),
                number_of_print_copies:
                    form.number_of_print_copies === ""
                        ? null
                        : Number(form.number_of_print_copies),
                advertising_company_id:
                    form.advertising_company_id || null,
            });

            setForm({ ...INITIAL_FORM });
            setError("");
        } catch (err) {
            setError(err.message || "فشل إنشاء المنسق.");
        }
    }

    const inputClasses =
        "w-full rounded-lg border border-gray-300 bg-white p-2.5 focus:border-orange-500 focus:outline-none";

    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
            onClick={saving ? undefined : onClose}
        >
            <form
                onSubmit={handleSubmit}
                className="my-8 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-orange-700">
                        إضافة منسق جديد
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300 disabled:opacity-50"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {FIELDS.map((field) => (
                        <div key={field.key}>
                            <label className="mb-1 block text-sm font-semibold">
                                {field.label}
                            </label>

                            <input
                                type={field.type || "text"}
                                required={Boolean(field.required)}
                                min={
                                    field.type === "number"
                                        ? 0
                                        : undefined
                                }
                                value={form[field.key] ?? ""}
                                disabled={saving}
                                onChange={(event) =>
                                    updateField(
                                        field.key,
                                        event.target.value
                                    )
                                }
                                className={inputClasses}
                            />
                        </div>
                    ))}

                    {/* الشركة / المورد */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            الشركة / المورد
                        </label>

                        <SearchableSelect
                            endpoint="retail/suppliers/search"
                            value={form.company_name}
                            onChange={(value) =>
                                updateField("company_name", value)
                            }
                            placeholder="ابحث عن الشركة / المورد..."
                            isDisabled={saving}
                            isClearable
                        />
                    </div>

                    {/* الفرع */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            الفرع
                        </label>

                        <SearchableSelect
                            options={branchOptions}
                            value={form.branch}
                            onChange={(value) =>
                                updateField("branch", value)
                            }
                            placeholder="ابحث عن الفرع..."
                            isDisabled={saving}
                            isClearable
                        />
                    </div>

                    {/* شركة الدعاية */}
                    <div>
                        <label className="mb-2 block text-sm font-semibold">
                            شركة الدعاية
                        </label>

                        <SearchableSelect
                            options={advertisingCompanyOptions}
                            value={form.advertising_company_id}
                            onChange={(value) =>
                                updateField(
                                    "advertising_company_id",
                                    value
                                )
                            }
                            placeholder="ابحث عن شركة الدعاية..."
                            isDisabled={saving}
                            isClearable
                        />
                    </div>

                    {/* المحافظة */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            المحافظة
                        </label>

                        <select
                            value={form.governorate}
                            disabled={saving}
                            onChange={(event) =>
                                updateField(
                                    "governorate",
                                    event.target.value
                                )
                            }
                            className={inputClasses}
                        >
                            <option value="">اختر المحافظة</option>
                            <option value="القاهرة">القاهرة</option>
                            <option value="الإسكندرية">الإسكندرية</option>
                            <option value="البحر الأحمر">
                                البحر الأحمر
                            </option>
                        </select>
                    </div>

                    {/* الوظيفة */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            الوظيفة
                        </label>

                        <select
                            value={form.job}
                            disabled={saving}
                            onChange={(event) =>
                                updateField("job", event.target.value)
                            }
                            className={inputClasses}
                        >
                            <option value="منسق">منسق</option>
                            <option value="منسقة">منسقة</option>
                            <option value="مندوب">مندوب</option>
                            <option value="مندوبة">مندوبة</option>
                        </select>
                    </div>

                    {/* الحالة */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            الحالة
                        </label>

                        <select
                            value={form.states}
                            disabled={saving}
                            onChange={(event) =>
                                updateField("states", event.target.value)
                            }
                            className={inputClasses}
                        >
                            <option value="مفعل">مفعل</option>
                            <option value="غير مفعل">غير مفعل</option>
                            <option value="مؤقت">مؤقت</option>
                        </select>
                    </div>

                    {/* الموقف الأمني */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            الموقف الأمني
                        </label>

                        <select
                            value={form.security_situation}
                            disabled={saving}
                            onChange={(event) =>
                                updateField(
                                    "security_situation",
                                    event.target.value
                                )
                            }
                            className={inputClasses}
                        >
                            <option value="">اختر الموقف الأمني</option>
                            <option value="سليم">سليم</option>
                            <option value="غير سليم">غير سليم</option>
                        </select>
                    </div>

                    {/* خصم إيميل */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold">
                            خصم إيميل
                        </label>

                        <select
                            value={form.email_discount}
                            disabled={saving}
                            onChange={(event) =>
                                updateField(
                                    "email_discount",
                                    event.target.value
                                )
                            }
                            className={inputClasses}
                        >
                            <option value="لا">لا</option>
                            <option value="نعم">نعم</option>
                        </select>
                    </div>

                    {/* ملاحظات */}
                    <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-semibold">
                            ملاحظات
                        </label>

                        <textarea
                            rows={3}
                            value={form.notes}
                            disabled={saving}
                            onChange={(event) =>
                                updateField("notes", event.target.value)
                            }
                            className={inputClasses}
                        />
                    </div>
                </div>

                {error && (
                    <p
                        role="alert"
                        className="mt-4 rounded-lg bg-red-50 p-3 text-red-700"
                    >
                        {error}
                    </p>
                )}

                <div className="mt-5 flex gap-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-orange-600 px-5 py-2.5 text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                        {saving ? "جاري الحفظ..." : "حفظ المنسق"}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg bg-gray-200 px-5 py-2.5 hover:bg-gray-300 disabled:opacity-50"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
}
