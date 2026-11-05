
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    COORDINATOR_FIELDS,
    formatDate,
} from "../../helpers/coordinatorHelpers";

import CoordinatorPhotos from "./CoordinatorPhotos";
import SearchableSelect from "../SearchableSelect";

import { useAuth } from "../../context/authContext";
import { hasPermission } from "../../helpers/permissions";

import Cropper from "react-easy-crop";

const SUPPLIERS_SEARCH_URL = "retail/suppliers/search";

const API_FIELD_MAP = {
    code: "code",
    name: "name",
    job: "job",
    company_name: "companyName",
    advertising_company_id: "advertisingCompanyId",
    branch: "branch",
    health_certificate_issuance_date: "healthCertificateIssuanceDate",
    health_certificate_expiry_date: "healthCertificateExpiryDate",
    national_id_number: "nationalIdNumber",
    mobile: "mobile",
    governorate: "governorate",
    notes: "notes",
    id_issuance_date: "idIssuanceDate",
    id_expiry_date: "idExpiryDate",
    address: "address",
    supervisor_name: "supervisorName",
    number_of_print_copies: "numberOfPrintcopies",
    security_situation: "securitySituation",
    states: "states",
    email_discount: "emailDiscount",
};

const FIELD_LABELS = {
    code: "الكود",
    name: "الاسم",
    job: "الوظيفة",
    company_name: "اسم الشركة",
    advertising_company_id: "شركة الدعاية",
    branch: "الفرع",
    health_certificate_issuance_date: "تاريخ إصدار الشهادة الصحية",
    health_certificate_expiry_date: "تاريخ انتهاء الشهادة الصحية",
    national_id_number: "رقم البطاقة الشخصية",
    mobile: "رقم الهاتف",
    governorate: "المحافظة",
    notes: "ملاحظات",
    id_issuance_date: "تاريخ إصدار البطاقة",
    id_expiry_date: "تاريخ انتهاء البطاقة",
    address: "العنوان",
    supervisor_name: "اسم المشرف",
    number_of_print_copies: "عدد نسخ الطباعة",
    security_situation: "الموقف الأمني",
    states: "الحالة",
    email_discount: "خصم ايميل",
};

const PHOTO_FIELDS = [
    {
        key: "profilePicture",
        dbKey: "profile_picture",
        label: "الصورة الشخصية",
    },
    {
        key: "nationalIdPicture",
        dbKey: "national_id_picture",
        label: "صورة البطاقة الشخصية",
    },
    {
        key: "healthCertificatePicture",
        dbKey: "health_certificate_picture",
        label: "صورة الشهادة الصحية",
    },
    {
        key: "companyAuthorizationPicture",
        dbKey: "company_authorization_picture",
        label: "صورة تفويض الشركة",
    },
    {
        key: "socialInsurancePicture",
        dbKey: "social_insurance_picture",
        label: "صورة التأمينات الاجتماعية",
    },
    {
        key: "supervisorNationalIdPicture",
        dbKey: "supervisor_national_id_picture",
        label: "صورة بطاقة المشرف",
    },
];

const DATE_FIELDS = new Set([
    "health_certificate_issuance_date",
    "health_certificate_expiry_date",
    "id_issuance_date",
    "id_expiry_date",
]);

function inputValue(value, key) {
    if (value == null) return "";

    if (DATE_FIELDS.has(key)) {
        return String(value).slice(0, 10);
    }

    return String(value);
}

function getPhotoName(value) {
    if (!value) return "لا توجد صورة مرفوعة";

    return String(value).split(/[\\/]/).pop();
}

function getCoordinatorFields() {
    const fields = [...COORDINATOR_FIELDS];
    const existingKeys = new Set(fields.map((field) => field.key));

    for (const key of Object.keys(API_FIELD_MAP)) {
        if (!existingKeys.has(key)) {
            fields.push({
                key,
                label: FIELD_LABELS[key] || key,
            });
        }
    }

    return fields;
}

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

                const MAX_DIMENSION = 1600;

                const scale = Math.min(
                    1,
                    MAX_DIMENSION / Math.max(
                        croppedAreaPixels.width,
                        croppedAreaPixels.height
                    )
                );

                const outputWidth = Math.round(croppedAreaPixels.width * scale);
                const outputHeight = Math.round(croppedAreaPixels.height * scale);

                canvas.width = outputWidth;
                canvas.height = outputHeight;

                context.drawImage(
                    image,
                    croppedAreaPixels.x,
                    croppedAreaPixels.y,
                    croppedAreaPixels.width,
                    croppedAreaPixels.height,
                    0,
                    0,
                    outputWidth,
                    outputHeight
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
                            imageFile.name.replace(/\.[^/.]+$/, "") +
                            "-cropped.jpg",
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

        return () => URL.revokeObjectURL(url);
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

function PhotoInputs({ coordinator, photos, setPhotos }) {
    const [pendingPhoto, setPendingPhoto] = useState(null);

    function handleFileSelect(event, photo) {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("يرجى اختيار ملف صورة صالح.");
            return;
        }

        setPendingPhoto({
            photo,
            file,
        });
    }

    function handleCropConfirm(croppedFile) {
        setPhotos((previous) => ({
            ...previous,
            [pendingPhoto.photo.key]: croppedFile,
        }));

        setPendingPhoto(null);
    }

    return (
        <>
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
                                getPhotoName(coordinator[photo.dbKey])}
                        </span>

                        <span className="text-xs text-gray-500">
                            اضغط لاختيار صورة جديدة
                        </span>

                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(event) =>
                                handleFileSelect(event, photo)
                            }
                        />
                    </label>
                ))}
            </div>

            {pendingPhoto && (
                <ImageCropModal
                    file={pendingPhoto.file}
                    aspect={
                        pendingPhoto.photo.key === "profilePicture"
                            ? 1
                            : 4 / 3
                    }
                    onCancel={() => setPendingPhoto(null)}
                    onConfirm={handleCropConfirm}
                />
            )}
        </>
    );
}

export default function CoordinatorDetailsModal({
    coordinator,
    onClose,
    onSave,
    saving = false,
    advertisingCompanies = [],
    branches = [],
}) {
    const { user } = useAuth();
    const canEditCoordinator = hasPermission(user, 25);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [photos, setPhotos] = useState({});
    const [formError, setFormError] = useState("");

    const fields = useMemo(() => getCoordinatorFields(), []);

    const branchOptions = useMemo(
        () =>
            branches.map((branch) => ({
                value: String(branch.id),
                label: branch.a_name || "",
            })),
        [branches]
    );

    const advertisingCompanyOptions = useMemo(
        () =>
            advertisingCompanies.map((company) => ({
                value: String(company.id),
                label: company.name || "",
            })),
        [advertisingCompanies]
    );

    useEffect(() => {
        if (!coordinator) return;

        const initialForm = {};

        for (const field of fields) {
            initialForm[field.key] = inputValue(
                coordinator[field.key],
                field.key
            );
        }

        initialForm.advertising_company_id = inputValue(
            coordinator.advertising_company_id,
            "advertising_company_id"
        );

        setForm(initialForm);
        setPhotos({});
        setEditing(false);
        setFormError("");
    }, [coordinator, fields]);

    if (!coordinator) return null;

    function handleChange(key, value) {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    function resetEditing() {
        const initialForm = {};

        for (const field of fields) {
            initialForm[field.key] = inputValue(
                coordinator[field.key],
                field.key
            );
        }

        initialForm.advertising_company_id = inputValue(
            coordinator.advertising_company_id,
            "advertising_company_id"
        );

        setForm(initialForm);
        setPhotos({});
        setFormError("");
        setEditing(false);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setFormError("");

        if (!String(form.name ?? "").trim()) {
            setFormError("يرجى إدخال اسم المنسق.");
            return;
        }

        if (!String(form.code ?? "").trim()) {
            setFormError("يرجى إدخال كود المنسق.");
            return;
        }

        if (!form.company_name) {
            setFormError("يرجى اختيار الشركة / المورد.");
            return;
        }

        if (!form.branch) {
            setFormError("يرجى اختيار الفرع.");
            return;
        }

        const formData = new FormData();

        formData.append("id", String(coordinator.id));

        for (const [dbKey, apiKey] of Object.entries(API_FIELD_MAP)) {
            const value = form[dbKey];

            if (value !== undefined && value !== null) {
                formData.append(apiKey, String(value));
            }
        }

        for (const photo of PHOTO_FIELDS) {
            const file = photos[photo.key];

            if (file instanceof File) {
                formData.append(photo.key, file);
            }
        }

        try {
            await onSave(formData);

            setEditing(false);
            setPhotos({});
            setFormError("");
        } catch (error) {
            setFormError(
                error.message || "تعذر حفظ بيانات المنسق."
            );
        }
    }

    function renderField(field) {
        const { key } = field;
        const label = FIELD_LABELS[key] || field.label || key;
        const value = form[key] ?? "";

        if (!editing) {
            let displayValue = value;

            if (key === "company_name") {
                displayValue =
                    coordinator.supplier_name ||
                    coordinator.company_name ||
                    value ||
                    "—";
            } else if (key === "branch") {
                const selectedBranch = branchOptions.find(
                    (item) => item.value === String(value)
                );

                displayValue =
                    selectedBranch?.label ||
                    coordinator.branch_name ||
                    value ||
                    "—";
            } else if (key === "advertising_company_id") {
                const selectedCompany = advertisingCompanyOptions.find(
                    (company) => company.value === String(value)
                );

                displayValue =
                    coordinator.advertising_company_name ||
                    selectedCompany?.label ||
                    "—";
            } else if (DATE_FIELDS.has(key) && value !== "") {
                displayValue = formatDate(value);
            }

            return (
                <div
                    key={key}
                    className="min-w-0 rounded-lg border border-gray-200 p-3"
                >
                    <p className="mb-1 text-sm text-gray-500">
                        {label}
                    </p>

                    <p className="wrap-break-word font-medium">
                        {displayValue === "" ? "—" : String(displayValue)}
                    </p>
                </div>
            );
        }

        const commonClasses =
            "w-full rounded-lg border border-gray-300 bg-white p-2 focus:border-orange-500 focus:outline-none";

        let input;

        if (key === "company_name") {
            input = (
                <SearchableSelect
                    endpoint={SUPPLIERS_SEARCH_URL}
                    value={value}
                    onChange={(selectedValue) =>
                        handleChange(key, selectedValue)
                    }
                    placeholder="ابحث عن الشركة / المورد..."
                    isDisabled={saving}
                    isClearable
                    initialOption={
                        value
                            ? {
                                value: String(value),
                                label:
                                    coordinator.supplier_name ||
                                    coordinator.company_name ||
                                    String(value),
                            }
                            : null
                    }
                />
            );
        } else if (key === "branch") {
            input = (
                <SearchableSelect
                    options={branchOptions}
                    value={value}
                    onChange={(selectedValue) =>
                        handleChange(key, selectedValue)
                    }
                    placeholder="اختر الفرع"
                    isDisabled={saving}
                />
            );
        } else if (key === "advertising_company_id") {
            input = (
                <SearchableSelect
                    options={advertisingCompanyOptions}
                    value={value}
                    onChange={(selectedValue) =>
                        handleChange(key, selectedValue)
                    }
                    placeholder="اختر شركة الدعاية"
                    isDisabled={saving}
                />
            );
        } else if (key === "job") {
            input = (
                <select
                    value={value}
                    disabled={saving}
                    onChange={(event) =>
                        handleChange(key, event.target.value)
                    }
                    className={commonClasses}
                >
                    <option value="">اختر الوظيفة</option>

                    {["منسق", "منسقة", "مندوب", "مندوبة"].map(
                        (option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        )
                    )}
                </select>
            );
        } else if (key === "states") {
            input = (
                <select
                    value={value}
                    disabled={saving}
                    onChange={(event) =>
                        handleChange(key, event.target.value)
                    }
                    className={commonClasses}
                >
                    <option value="">اختر الحالة</option>
                    <option value="مفعل">مفعل</option>
                    <option value="غير مفعل">غير مفعل</option>
                    <option value="مؤقت">مؤقت</option>
                </select>
            );
        } else if (DATE_FIELDS.has(key)) {
            input = (
                <input
                    type="date"
                    value={value}
                    disabled={saving}
                    onChange={(event) =>
                        handleChange(key, event.target.value)
                    }
                    className={commonClasses}
                />
            );
        } else if (key === "notes") {
            input = (
                <textarea
                    rows={3}
                    value={value}
                    disabled={saving}
                    onChange={(event) =>
                        handleChange(key, event.target.value)
                    }
                    className={commonClasses}
                />
            );
        } else if (key === "email_discount") {
            input = (
                <select
                    value={value}
                    disabled={saving}
                    onChange={(event) =>
                        handleChange(key, event.target.value)
                    }
                    className={commonClasses}
                >
                    <option value="">اختر خصم الإيميل</option>
                    <option value="لا">لا</option>
                    <option value="نعم">نعم</option>
                </select>
            );
        } else {
            input = (
                <input
                    type={
                        key === "number_of_print_copies"
                            ? "number"
                            : "text"
                    }
                    min={
                        key === "number_of_print_copies"
                            ? 0
                            : undefined
                    }
                    value={value}
                    disabled={saving}
                    onChange={(event) =>
                        handleChange(key, event.target.value)
                    }
                    className={commonClasses}
                />
            );
        }

        return (
            <div
                key={key}
                className="min-w-0 rounded-lg border p-3"
            >
                <label className="mb-2 block text-sm text-gray-600">
                    {label}
                </label>

                {input}
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
            onClick={saving ? undefined : onClose}
        >
            <div
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="coordinator-details-title"
                className="my-8 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2
                        id="coordinator-details-title"
                        className="text-xl font-bold text-orange-700"
                    >
                        تفاصيل المنسق: {coordinator.name}
                    </h2>

                    <div className="flex flex-wrap gap-2">
                        {!editing ? (
                            canEditCoordinator && (
                                <button
                                    type="button"
                                    onClick={() => setEditing(true)}
                                    className="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
                                >
                                    تعديل البيانات
                                </button>
                            )
                        ) : (
                            canEditCoordinator && (
                                <>
                                    <button
                                        type="button"
                                        onClick={resetEditing}
                                        disabled={saving}
                                        className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300 disabled:opacity-50"
                                    >
                                        إلغاء التعديل
                                    </button>

                                    <button
                                        type="submit"
                                        form="edit-coordinator-form"
                                        disabled={saving}
                                        className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {saving
                                            ? "جاري الحفظ..."
                                            : "حفظ التعديلات"}
                                    </button>
                                </>
                            )
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300 disabled:opacity-50"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>

                <form
                    id="edit-coordinator-form"
                    onSubmit={handleSubmit}
                >
                    <h3 className="mb-3 font-bold">
                        البيانات الأساسية
                    </h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {fields.map(renderField)}

                        <div className="rounded-lg border border-gray-200 p-3">
                            <p className="mb-1 text-sm text-gray-500">
                                رقم السجل
                            </p>
                            <p className="font-medium">
                                {coordinator.id}
                            </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 p-3">
                            <p className="mb-1 text-sm text-gray-500">
                                أنشأ بواسطة
                            </p>
                            <p className="wrap-break-word font-medium">
                                {coordinator.created_by ?? "—"}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="mb-3 font-bold">
                            صور المستندات
                        </h3>

                        {editing ? (
                            <>
                                <CoordinatorPhotos
                                    coordinator={coordinator}
                                />

                                <p className="my-3 text-sm text-gray-500">
                                    اختر صورة جديدة فقط للمستندات التي تريد
                                    استبدالها.
                                </p>

                                <PhotoInputs
                                    coordinator={coordinator}
                                    photos={photos}
                                    setPhotos={setPhotos}
                                />
                            </>
                        ) : (
                            <CoordinatorPhotos
                                coordinator={coordinator}
                            />
                        )}
                    </div>

                    {formError && (
                        <p
                            role="alert"
                            className="mt-4 text-sm text-red-600"
                        >
                            {formError}
                        </p>
                    )}
                </form>

                <div className="mt-6">
                    <h3 className="mb-3 font-bold">
                        الاستثناءات
                    </h3>

                    {coordinator.exceptions?.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-right text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3">الاسم</th>
                                        <th className="p-3">تاريخ البداية</th>
                                        <th className="p-3">تاريخ النهاية</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {coordinator.exceptions.map(
                                        (exception) => (
                                            <tr
                                                key={exception.exception_id}
                                                className="border-b"
                                            >
                                                <td className="p-3">
                                                    {exception.exception_name ??
                                                        "—"}
                                                </td>

                                                <td className="p-3">
                                                    {formatDate(
                                                        exception.exception_start_date
                                                    )}
                                                </td>

                                                <td className="p-3">
                                                    {formatDate(
                                                        exception.exception_end_date
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500">
                            لا توجد استثناءات.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
