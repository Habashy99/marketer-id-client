import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
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

const PHOTO_FIELDS = [
    { key: "profilePicture", label: "الصورة الشخصية" },
    { key: "nationalIdPicture", label: "صورة البطاقة الشخصية" },
    { key: "healthCertificatePicture", label: "صورة الشهادة الصحية" },
    { key: "companyAuthorizationPicture", label: "صورة تفويض الشركة" },
    { key: "socialInsurancePicture", label: "صورة التأمينات الاجتماعية" },
    { key: "supervisorNationalIdPicture", label: "صورة بطاقة المشرف" },
];

const INITIAL_PHOTOS = {
    profilePicture: null,
    nationalIdPicture: null,
    healthCertificatePicture: null,
    companyAuthorizationPicture: null,
    socialInsurancePicture: null,
    supervisorNationalIdPicture: null,
};

/* -------------------------------------------------------------------------- */
/*                              Image crop helper                             */
/* -------------------------------------------------------------------------- */

function createCroppedImage(imageFile, croppedAreaPixels) {
    return new Promise((resolve, reject) => {
        const imageUrl = URL.createObjectURL(imageFile);
        const image = new Image();

        image.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                if (!context) {
                    throw new Error("تعذر تجهيز الصورة للقص.");
                }

                canvas.width = croppedAreaPixels.width;
                canvas.height = croppedAreaPixels.height;

                context.drawImage(
                    image,
                    croppedAreaPixels.x,
                    croppedAreaPixels.y,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height,
                    0,
                    0,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height
                );

                canvas.toBlob(
                    (blob) => {
                        URL.revokeObjectURL(imageUrl);

                        if (!blob) {
                            reject(
                                new Error("تعذر إنشاء الصورة بعد القص.")
                            );
                            return;
                        }

                        const croppedFile = new File(
                            [blob],
                            `${imageFile.name.replace(/\.[^/.]+$/, "")}-cropped.jpg`,
                            {
                                type: "image/jpeg",
                                lastModified: Date.now(),
                            }
                        );

                        resolve(croppedFile);
                    },
                    "image/jpeg",
                    0.92
                );
            } catch (error) {
                URL.revokeObjectURL(imageUrl);
                reject(error);
            }
        };

        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error("تعذر تحميل الصورة."));
        };

        image.src = imageUrl;
    });
}

/* -------------------------------------------------------------------------- */
/*                                Crop modal                                  */
/* -------------------------------------------------------------------------- */

function ImageCropModal({
    file,
    aspect = 1,
    onCancel,
    onConfirm,
}) {
    const [imageUrl, setImageUrl] = useState("");
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!file) return;

        const url = URL.createObjectURL(file);
        setImageUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    const handleCropComplete = useCallback((_, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    async function handleConfirm() {
        if (!croppedAreaPixels) {
            setError("يرجى تحديد مساحة الصورة.");
            return;
        }

        try {
            setProcessing(true);
            setError("");

            const croppedFile = await createCroppedImage(
                file,
                croppedAreaPixels
            );

            onConfirm(croppedFile);
        } catch (err) {
            setError(err.message || "حدث خطأ أثناء قص الصورة.");
            setProcessing(false);
        }
    }

    if (!imageUrl) return null;

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4"
            onClick={processing ? undefined : onCancel}
        >
            <div
                dir="rtl"
                className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <h3 className="mb-4 text-lg font-bold text-orange-700">
                    قص الصورة قبل الرفع
                </h3>

                <div className="relative h-87.5 w-full overflow-hidden rounded-lg bg-gray-900">
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={handleCropComplete}
                        restrictPosition={false}
                    />
                </div>

                <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold">
                        تكبير وتصغير الصورة
                    </label>

                    <input
                        type="range"
                        min={1}
                        max={10}
                        step={0.1}
                        value={zoom}
                        onChange={(event) =>
                            setZoom(Number(event.target.value))
                        }
                        className="w-full accent-orange-600"
                    />
                </div>

                {error && (
                    <p className="mt-3 text-sm text-red-600">
                        {error}
                    </p>
                )}

                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="rounded-lg bg-gray-200 px-5 py-2 hover:bg-gray-300 disabled:opacity-50"
                    >
                        إلغاء
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={processing}
                        className="rounded-lg bg-orange-600 px-5 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                        {processing
                            ? "جاري تجهيز الصورة..."
                            : "تأكيد القص"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                         Create coordinator modal                           */
/* -------------------------------------------------------------------------- */

export default function CreateCoordinatorModal({
    open,
    onClose,
    onSubmit,
    saving = false,
    branches = [],
    advertisingCompanies = [],
}) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [photos, setPhotos] = useState(INITIAL_PHOTOS);
    const [error, setError] = useState("");
    const [pendingPhoto, setPendingPhoto] = useState(null);

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

    /* ----------------------------- Photo upload ---------------------------- */

    function handlePhotoChange(event, photoKey) {
        const file = event.target.files?.[0];

        // Allows selecting the same file again.
        event.target.value = "";

        if (!file) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setError("يرجى اختيار صورة بصيغة JPEG أو PNG أو WebP.");
            return;
        }

        setError("");

        setPendingPhoto({
            key: photoKey,
            file,
        });
    }

    function handleCropConfirm(croppedFile) {
        if (!pendingPhoto) return;

        setPhotos((previous) => ({
            ...previous,
            [pendingPhoto.key]: croppedFile,
        }));

        setPendingPhoto(null);
    }

    function handleCropCancel() {
        setPendingPhoto(null);
    }

    /* ------------------------------- Submit -------------------------------- */

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
            const formData = new FormData();

            // Form fields
            Object.entries({
                ...form,
                code: form.code.trim(),
                name: form.name.trim(),
                number_of_print_copies:
                    form.number_of_print_copies === ""
                        ? ""
                        : Number(form.number_of_print_copies),
                advertising_company_id:
                    form.advertising_company_id || "",
            }).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, String(value));
                }
            });

            // Cropped coordinator photos
            PHOTO_FIELDS.forEach((photo) => {
                const file = photos[photo.key];

                if (file instanceof File) {
                    formData.append(photo.key, file);
                }
            });

            await onSubmit(formData);

            // Reset after successful submission
            setForm({ ...INITIAL_FORM });
            setPhotos({ ...INITIAL_PHOTOS });
            setPendingPhoto(null);
            setError("");
        } catch (err) {
            setError(err.message || "فشل إنشاء المنسق.");
        }
    }

    const inputClasses =
        "w-full rounded-lg border border-gray-300 bg-white p-2.5 focus:border-orange-500 focus:outline-none";

    if (!open) return null;

    return (
        <>
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
                    {/* Header */}
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
                        {/* Basic fields */}
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

                        {/* Company / Supplier */}
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

                        {/* Branch */}
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

                        {/* Advertising company */}
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

                        {/* Governorate */}
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

                        {/* Job */}
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

                        {/* Status */}
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

                        {/* Email discount */}
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

                        {/* Notes */}
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

                        {/* Photos */}
                        <div className="sm:col-span-2">
                            <h3 className="mb-3 font-bold text-gray-800">
                                صور المستندات
                            </h3>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {PHOTO_FIELDS.map((photo) => (
                                    <label
                                        key={photo.key}
                                        className="flex cursor-pointer flex-col gap-2 rounded-lg border border-orange-200 p-3 transition hover:border-orange-500 hover:bg-orange-50"
                                    >
                                        <span className="font-semibold text-gray-800">
                                            {photo.label}
                                        </span>

                                        <span className="break-all text-sm text-orange-700">
                                            {photos[photo.key]?.name ||
                                                "لم يتم اختيار صورة"}
                                        </span>

                                        <span className="text-xs text-gray-500">
                                            اضغط لاختيار صورة
                                        </span>

                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            disabled={saving}
                                            className="w-full text-sm"
                                            onChange={(event) =>
                                                handlePhotoChange(
                                                    event,
                                                    photo.key
                                                )
                                            }
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg bg-red-50 p-3 text-red-700"
                        >
                            {error}
                        </p>
                    )}

                    {/* Footer */}
                    <div className="mt-5 flex gap-2">
                        <button
                            type="submit"
                            disabled={saving || Boolean(pendingPhoto)}
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

            {/* Crop modal */}
            {pendingPhoto && (
                <ImageCropModal
                    file={pendingPhoto.file}
                    aspect={
                        pendingPhoto.key === "profilePicture"
                            ? 1
                            : 4 / 3
                    }
                    onCancel={handleCropCancel}
                    onConfirm={handleCropConfirm}
                />
            )}
        </>
    );
}