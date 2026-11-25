
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../../components/header";
import SearchableSelect from "../../../components/SearchableSelect";
import { sendHttpReq } from "../../../lib/httpHandler";
import { useAuth } from "../../../context/authContext";
import { isAdmin, hasPermission } from "../../../helpers/permissions";

/* -------------------------------------------------------------------------- */
/* Permissions                                                                */
/* -------------------------------------------------------------------------- */

const TASTINGS_PERMISSION_ID = 42;
const ADD_TASTING_PERMISSION_ID = 43;
const VIEW_COMPANIES_PERMISSION_ID = 44;
const VIEW_PRODUCTS_PERMISSION_ID = 45;
const EDIT_TASTING_PERMISSION_ID = 46;
const DELETE_TASTING_PERMISSION_ID = 47;
const VIEW_PRODUCT_DETAILS_PERMISSION_ID = 48;

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "marketing_tastings_v2";

const createId = () =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const today = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000)
        .toISOString()
        .slice(0, 10);
};

const FALLBACK_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <rect width="900" height="600" fill="#fff7ed"/>
  <rect x="300" y="145" width="300" height="220" rx="24" fill="#fed7aa"/>
  <circle cx="390" cy="215" r="28" fill="#fb923c"/>
  <path d="M320 330l100-90 65 60 45-42 50 42v40H320z" fill="#f97316"/>
  <text x="450" y="430" text-anchor="middle" font-family="Arial" font-size="30" fill="#9a3412">الصورة غير متاحة</text>
</svg>
`)}`;

const createEmptyDailyRecord = () => ({
    id: createId(),
    date: today(),
    customerName: "",
    phone: "",
    products: "",
    purchaseValue: "",
    voucherValue: "",
    notes: "",
});

const createEmptyForm = () => ({
    name: "",
    supplier_id: "",
    company_name: "",
    branch_id: "",
    branch_name: "",
    startDate: "",
    endDate: "",
    notes: "",
    images: [],
    dailyRecords: [],
});

/* -------------------------------------------------------------------------- */
/* Demo Data                                                                  */
/* -------------------------------------------------------------------------- */

const initialTastings = [
    {
        id: "demo-1",
        name: "تذوق منتجات الشوكولاتة",
        supplier_id: "demo-supplier-1",
        company_name: "شركة النور",
        branch_id: "demo-branch-1",
        branch_name: "فرع سموحة",
        startDate: "2026-11-01",
        endDate: "2026-11-15",
        notes: "تذوق تجريبي لمنتجات الشوكولاتة ومراجعة الطعم والجودة والتغليف.",
        images: [],
        dailyRecords: [
            {
                id: "sale-1",
                date: "2026-11-10",
                customerName: "أحمد محمد",
                phone: "01000000000",
                products: "شوكولاتة بالحليب، شوكولاتة داكنة",
                purchaseValue: "350",
                voucherValue: "50",
                notes: "",
            },
        ],
    },
    {
        id: "demo-2",
        name: "تذوق منتجات الألبان",
        supplier_id: "demo-supplier-1",
        company_name: "شركة النور",
        branch_id: "demo-branch-2",
        branch_name: "فرع جناكليس",
        startDate: "2026-11-10",
        endDate: "2026-11-25",
        notes: "مقارنة الطعم والقوام والجودة بين منتجات الألبان المختلفة.",
        images: [],
        dailyRecords: [],
    },
    {
        id: "demo-3",
        name: "تذوق العصائر الطبيعية",
        supplier_id: "demo-supplier-2",
        company_name: "شركة المستقبل",
        branch_id: "demo-branch-1",
        branch_name: "فرع سموحة",
        startDate: "2026-11-05",
        endDate: "2026-11-20",
        notes: "تقييم مذاق العصائر الطبيعية ومدى قبول العملاء للمنتجات.",
        images: [],
        dailyRecords: [],
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatDate = (date) => {
    if (!date) return "—";
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB");
};

const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-EG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const getDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return "غير محددة";

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    const difference = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (difference < 0) return "تاريخ غير صحيح";

    return `${difference + 1} يوم`;
};

const getStoredTastings = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) return initialTastings;

        const parsed = JSON.parse(stored);

        return Array.isArray(parsed) ? parsed : initialTastings;
    } catch {
        return initialTastings;
    }
};

const getRecordTotals = (records = []) =>
    records.reduce(
        (totals, record) => ({
            purchases:
                totals.purchases + Number(record.purchaseValue || 0),
            vouchers:
                totals.vouchers + Number(record.voucherValue || 0),
        }),
        { purchases: 0, vouchers: 0 }
    );

/* -------------------------------------------------------------------------- */
/* Safe Image                                                                 */
/* -------------------------------------------------------------------------- */

function SafeImage({ src, alt = "", className = "", ...props }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    return (
        <img
            src={!src || failed ? FALLBACK_IMAGE : src}
            alt={alt}
            className={className}
            onError={() => setFailed(true)}
            {...props}
        />
    );
}

/* -------------------------------------------------------------------------- */
/* Image Preview Modal                                                        */
/* -------------------------------------------------------------------------- */

function ImagePreviewModal({ image, onClose }) {
    const [zoom, setZoom] = useState(1);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "+" || event.key === "=") {
                setZoom((value) => Math.min(5, value + 0.2));
            }
            if (event.key === "-") {
                setZoom((value) => Math.max(1, value - 0.2));
            }
            if (event.key === "0") setZoom(1);
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [onClose]);

    useEffect(() => {
        setFailed(false);
        setZoom(1);
    }, [image?.src]);

    if (!image) return null;

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 p-4"
            onClick={onClose}
        >
            <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
                <p className="max-w-[50%] truncate rounded-lg bg-black/50 px-4 py-2 text-sm text-white">
                    {image.name || "معاينة الصورة"}
                </p>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            setZoom((value) => Math.max(1, value - 0.2));
                        }}
                        className="h-10 w-10 rounded-lg bg-white/15 text-xl text-white"
                    >
                        −
                    </button>

                    <span className="rounded-lg bg-black/50 px-3 py-2 text-sm text-white">
                        {Math.round(zoom * 100)}%
                    </span>

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            setZoom((value) => Math.min(5, value + 0.2));
                        }}
                        className="h-10 w-10 rounded-lg bg-white/15 text-xl text-white"
                    >
                        +
                    </button>

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            setZoom(1);
                        }}
                        className="rounded-lg bg-white/15 px-3 py-2 text-sm text-white"
                    >
                        إعادة ضبط
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 w-10 rounded-lg bg-red-600 text-xl text-white"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <img
                src={failed ? FALLBACK_IMAGE : image.src || FALLBACK_IMAGE}
                alt={image.name || "صورة التذوق"}
                onError={() => setFailed(true)}
                onClick={(event) => event.stopPropagation()}
                className="max-h-[85vh] max-w-full select-none object-contain transition-transform"
                style={{ transform: `scale(${zoom})` }}
            />
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Image Gallery                                                              */
/* -------------------------------------------------------------------------- */

function ImageGallery({
    images = [],
    onPreview,
    onRemove,
    editable = false,
}) {
    if (!images.length) {
        return (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-400">
                <div className="text-4xl">📷</div>
                <p className="mt-2">لم تتم إضافة صور لهذا التذوق.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {images.map((image) => (
                <div
                    key={image.id}
                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                    <button
                        type="button"
                        onClick={() => onPreview(image)}
                        className="block w-full"
                    >
                        <SafeImage
                            src={image.src}
                            alt={image.name || "صورة التذوق"}
                            loading="lazy"
                            className="h-36 w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                    </button>

                    {editable && (
                        <button
                            type="button"
                            onClick={() => onRemove(image.id)}
                            className="absolute left-2 top-2 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                        >
                            حذف
                        </button>
                    )}

                    <p className="truncate px-2 py-2 text-xs text-gray-600">
                        {image.name || "صورة"}
                    </p>
                </div>
            ))}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Daily Customer Records                                                     */
/* -------------------------------------------------------------------------- */

function DailyRecordsTable({
    records = [],
    onChange,
    editable = false,
}) {
    const updateRecord = (id, field, value) => {
        onChange(
            records.map((record) =>
                record.id === id
                    ? { ...record, [field]: value }
                    : record
            )
        );
    };

    const addRecord = () => {
        onChange([...records, createEmptyDailyRecord()]);
    };

    const removeRecord = (id) => {
        onChange(records.filter((record) => record.id !== id));
    };

    const totals = getRecordTotals(records);

    return (
        <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">
                        معدلات المبيعات اليومية للعملاء
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        سجل بيانات العملاء والمنتجات والمشتريات وقيمة الـ Voucher.
                    </p>
                </div>

                {editable && (
                    <button
                        type="button"
                        onClick={addRecord}
                        className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
                    >
                        + إضافة عميل
                    </button>
                )}
            </div>

            {records.length > 0 && (
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-sm text-blue-700">
                            إجمالي قيمة المشتريات
                        </p>
                        <p className="mt-2 text-2xl font-bold text-blue-800">
                            {formatMoney(totals.purchases)} جنيه
                        </p>
                    </div>

                    <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                        <p className="text-sm text-green-700">
                            إجمالي قيمة الـ Vouchers
                        </p>
                        <p className="mt-2 text-2xl font-bold text-green-800">
                            {formatMoney(totals.vouchers)} جنيه
                        </p>
                    </div>
                </div>
            )}

            {!records.length ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <div className="text-4xl">🧾</div>
                    <p className="mt-3 font-semibold text-gray-600">
                        لا توجد عمليات شراء مسجلة.
                    </p>
                    {editable && (
                        <p className="mt-1 text-sm text-gray-400">
                            اضغط على إضافة عميل لبدء تسجيل المبيعات اليومية.
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {records.map((record, index) => (
                        <div
                            key={record.id}
                            className="rounded-xl border border-gray-200 bg-white p-4"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-bold text-orange-700">
                                    العميل رقم {index + 1}
                                </h4>

                                {editable && (
                                    <button
                                        type="button"
                                        onClick={() => removeRecord(record.id)}
                                        className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                                    >
                                        حذف العميل
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                                        تاريخ العملية
                                    </label>
                                    {editable ? (
                                        <input
                                            type="date"
                                            value={record.date || ""}
                                            onChange={(event) =>
                                                updateRecord(
                                                    record.id,
                                                    "date",
                                                    event.target.value
                                                )
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
                                        />
                                    ) : (
                                        <p className="rounded-lg bg-gray-50 p-3">
                                            {formatDate(record.date)}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                                        اسم العميل
                                    </label>
                                    {editable ? (
                                        <input
                                            value={record.customerName || ""}
                                            onChange={(event) =>
                                                updateRecord(
                                                    record.id,
                                                    "customerName",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="اسم العميل"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
                                        />
                                    ) : (
                                        <p className="rounded-lg bg-gray-50 p-3">
                                            {record.customerName || "—"}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                                        رقم تليفون العميل
                                    </label>
                                    {editable ? (
                                        <input
                                            type="tel"
                                            value={record.phone || ""}
                                            onChange={(event) =>
                                                updateRecord(
                                                    record.id,
                                                    "phone",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="01xxxxxxxxx"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
                                        />
                                    ) : (
                                        <p className="rounded-lg bg-gray-50 p-3">
                                            {record.phone || "—"}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-2 lg:col-span-3">
                                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                                        المنتجات التي اشتراها العميل
                                    </label>
                                    {editable ? (
                                        <textarea
                                            rows={2}
                                            value={record.products || ""}
                                            onChange={(event) =>
                                                updateRecord(
                                                    record.id,
                                                    "products",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="اكتب أسماء المنتجات يدويًا..."
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
                                        />
                                    ) : (
                                        <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3">
                                            {record.products || "—"}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                                        قيمة المشتريات (جنيه)
                                    </label>
                                    {editable ? (
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={record.purchaseValue || ""}
                                            onChange={(event) =>
                                                updateRecord(
                                                    record.id,
                                                    "purchaseValue",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
                                        />
                                    ) : (
                                        <p className="rounded-lg bg-blue-50 p-3 font-bold text-blue-700">
                                            {formatMoney(record.purchaseValue)} جنيه
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                                        قيمة الـ Voucher (جنيه)
                                    </label>
                                    {editable ? (
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={record.voucherValue || ""}
                                            onChange={(event) =>
                                                updateRecord(
                                                    record.id,
                                                    "voucherValue",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
                                        />
                                    ) : (
                                        <p className="rounded-lg bg-green-50 p-3 font-bold text-green-700">
                                            {formatMoney(record.voucherValue)} جنيه
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                                        ملاحظات
                                    </label>
                                    {editable ? (
                                        <input
                                            value={record.notes || ""}
                                            onChange={(event) =>
                                                updateRecord(
                                                    record.id,
                                                    "notes",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="ملاحظات إضافية"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
                                        />
                                    ) : (
                                        <p className="rounded-lg bg-gray-50 p-3">
                                            {record.notes || "—"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function Tastings() {
    const navigate = useNavigate();
    const { user } = useAuth();

    /* Permissions */

    const admin = isAdmin(user);

    const canView = admin || hasPermission(user, TASTINGS_PERMISSION_ID);
    const canAddTasting = admin || hasPermission(user, ADD_TASTING_PERMISSION_ID);
    const canViewCompanies = admin || hasPermission(user, VIEW_COMPANIES_PERMISSION_ID);
    const canViewProducts = admin || hasPermission(user, VIEW_PRODUCTS_PERMISSION_ID);
    const canEditTasting = admin || hasPermission(user, EDIT_TASTING_PERMISSION_ID);
    const canDeleteTasting = admin || hasPermission(user, DELETE_TASTING_PERMISSION_ID);
    const canViewProductDetails = admin || hasPermission(user, VIEW_PRODUCT_DETAILS_PERMISSION_ID);

    /* State */

    const [tastings, setTastings] = useState(getStoredTastings);
    const [branches, setBranches] = useState([]);
    const [branchesLoading, setBranchesLoading] = useState(false);

    const [selectedCompany, setSelectedCompany] = useState("");
    const [search, setSearch] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(createEmptyForm());

    const [selectedTasting, setSelectedTasting] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [imageError, setImageError] = useState("");

    /* Local Storage */

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tastings));
        } catch (error) {
            console.error("Could not save tastings:", error);
            alert("تعذر حفظ البيانات محليًا. قد تكون مساحة التخزين ممتلئة بسبب الصور.");
        }
    }, [tastings]);

    /* Load Branches */

    useEffect(() => {
        let cancelled = false;

        const loadBranches = async () => {
            try {
                setBranchesLoading(true);

                const result = await sendHttpReq("retail/branches");

                if (cancelled) return;

                const rows = Array.isArray(result)
                    ? result
                    : result?.data ?? [];

                setBranches(
                    rows.map((branch) => ({
                        value: String(branch.id ?? branch.branch),
                        label: String(branch.a_name ?? branch.name ?? ""),
                    }))
                );
            } catch (error) {
                console.error("Failed to load branches:", error);
                if (!cancelled) setBranches([]);
            } finally {
                if (!cancelled) setBranchesLoading(false);
            }
        };

        loadBranches();

        return () => {
            cancelled = true;
        };
    }, []);

    const branchOptions = branches;

    /* Companies */

    const companies = useMemo(() => {
        return [
            ...new Set(
                tastings
                    .map((tasting) => tasting.company_name?.trim())
                    .filter(Boolean)
            ),
        ].sort((a, b) => a.localeCompare(b, "ar"));
    }, [tastings]);

    const groupedTastings = useMemo(() => {
        return tastings.reduce((groups, tasting) => {
            const company = tasting.company_name?.trim() || "بدون شركة";

            if (!groups[company]) groups[company] = [];

            groups[company].push(tasting);

            return groups;
        }, {});
    }, [tastings]);

    const visibleTastings = useMemo(() => {
        const companyTastings = selectedCompany
            ? groupedTastings[selectedCompany] || []
            : tastings;

        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) return companyTastings;

        return companyTastings.filter((tasting) =>
            `${tasting.name} ${tasting.company_name} ${tasting.branch_name}`
                .toLowerCase()
                .includes(normalizedSearch)
        );
    }, [tastings, selectedCompany, groupedTastings, search]);

    const totalImages = useMemo(
        () =>
            tastings.reduce(
                (total, tasting) => total + (tasting.images?.length || 0),
                0
            ),
        [tastings]
    );

    const totalDailyRecords = useMemo(
        () =>
            tastings.reduce(
                (total, tasting) => total + (tasting.dailyRecords?.length || 0),
                0
            ),
        [tastings]
    );

    const allTotals = useMemo(
        () =>
            tastings.reduce(
                (totals, tasting) => {
                    const current = getRecordTotals(tasting.dailyRecords || []);

                    return {
                        purchases: totals.purchases + current.purchases,
                        vouchers: totals.vouchers + current.vouchers,
                    };
                },
                { purchases: 0, vouchers: 0 }
            ),
        [tastings]
    );

    /* Form Helpers */

    const updateForm = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const openAddForm = (company = "") => {
        if (!canAddTasting) return;

        setEditingId(null);
        setImageError("");

        const selectedCompanyTasting = tastings.find(
            (item) => item.company_name === company
        );

        setForm({
            ...createEmptyForm(),
            company_name: company,
            supplier_id: selectedCompanyTasting?.supplier_id || "",
        });

        setShowForm(true);
    };

    const openEditForm = (tasting) => {
        if (!canEditTasting) return;

        setEditingId(tasting.id);
        setImageError("");

        setForm({
            name: tasting.name || "",
            supplier_id: tasting.supplier_id || "",
            company_name: tasting.company_name || "",
            branch_id: tasting.branch_id || "",
            branch_name: tasting.branch_name || "",
            startDate: tasting.startDate || "",
            endDate: tasting.endDate || "",
            notes: tasting.notes || "",
            images: [...(tasting.images || [])],
            dailyRecords: (tasting.dailyRecords || []).map((item) => ({ ...item })),
        });

        setSelectedTasting(null);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setImageError("");
    };

    /* Images */

    const handleImagesChange = async (event) => {
        const input = event.target;
        const files = Array.from(input.files || []);

        if (!files.length) return;

        setImageError("");

        const validFiles = files.filter((file) => file.type.startsWith("image/"));

        if (validFiles.length !== files.length) {
            setImageError("يرجى اختيار ملفات صور فقط.");
        }

        const remainingSlots = Math.max(0, 10 - form.images.length);
        const selectedFiles = validFiles.slice(0, remainingSlots);

        if (validFiles.length > remainingSlots) {
            setImageError("الحد الأقصى للصور هو 10 صور لكل تذوق.");
        }

        try {
            const convertedImages = await Promise.all(
                selectedFiles.map(
                    (file) =>
                        new Promise((resolve, reject) => {
                            const reader = new FileReader();

                            reader.onload = () =>
                                resolve({
                                    id: createId(),
                                    name: file.name,
                                    src: reader.result,
                                });

                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        })
                )
            );

            setForm((previous) => ({
                ...previous,
                images: [...previous.images, ...convertedImages].slice(0, 10),
            }));
        } catch {
            setImageError("حدث خطأ أثناء قراءة الصور.");
        }

        input.value = "";
    };

    const removeImage = (imageId) => {
        updateForm(
            "images",
            form.images.filter((image) => image.id !== imageId)
        );
    };

    /* Daily Records */

    const updateDailyRecords = (records) => {
        updateForm("dailyRecords", records);
    };

    /* Save */

    const handleSubmit = (event) => {
        event.preventDefault();

        if (editingId !== null ? !canEditTasting : !canAddTasting) return;

        if (!form.name.trim()) {
            alert("يرجى إدخال اسم التذوق.");
            return;
        }

        if (!form.supplier_id || !form.company_name.trim()) {
            alert("يرجى اختيار الشركة / المورد.");
            return;
        }

        if (!form.branch_id || !form.branch_name.trim()) {
            alert("يرجى اختيار الفرع.");
            return;
        }

        if (form.startDate && form.endDate && form.endDate < form.startDate) {
            alert("تاريخ النهاية يجب أن يكون بعد تاريخ البداية.");
            return;
        }

        const tastingData = {
            ...form,
            name: form.name.trim(),
            company_name: form.company_name.trim(),
            branch_name: form.branch_name.trim(),
            notes: form.notes.trim(),
            dailyRecords: form.dailyRecords.map((record) => ({
                ...record,
                customerName: record.customerName?.trim() || "",
                phone: record.phone?.trim() || "",
                products: record.products?.trim() || "",
            })),
        };

        if (editingId !== null) {
            setTastings((previous) =>
                previous.map((tasting) =>
                    tasting.id === editingId
                        ? { ...tasting, ...tastingData }
                        : tasting
                )
            );
        } else {
            setTastings((previous) => [
                ...previous,
                {
                    id: createId(),
                    ...tastingData,
                },
            ]);
        }

        setSelectedCompany(tastingData.company_name);
        closeForm();
    };

    /* Delete */

    const handleDelete = (tasting) => {
        if (!canDeleteTasting) return;

        const confirmed = window.confirm(
            `هل أنت متأكد من حذف التذوق "${tasting.name}"؟`
        );

        if (!confirmed) return;

        setTastings((previous) =>
            previous.filter((item) => item.id !== tasting.id)
        );

        if (selectedTasting?.id === tasting.id) {
            setSelectedTasting(null);
        }
    };

    /* Authentication */

    if (!user) {
        return (
            <div
                dir="rtl"
                className="flex min-h-screen items-center justify-center bg-slate-100 p-6"
            >
                <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
                    <h1 className="text-xl font-bold text-slate-800">
                        يجب تسجيل الدخول أولاً
                    </h1>

                    <button
                        type="button"
                        onClick={() => navigate("/login", { replace: true })}
                        className="mt-5 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
                    >
                        تسجيل الدخول
                    </button>
                </div>
            </div>
        );
    }

    if (!canView) {
        return (
            <div
                dir="rtl"
                className="flex min-h-screen items-center justify-center bg-slate-100 p-6"
            >
                <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
                    <h1 className="text-xl font-bold text-red-600">
                        ليس لديك صلاحية الوصول
                    </h1>

                    <p className="mt-3 text-gray-600">
                        لا تمتلك صلاحية عرض نظام التذوقات.
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/marketing")}
                        className="mt-5 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
                    >
                        العودة لنظام التسويق
                    </button>
                </div>
            </div>
        );
    }

    /* Render */

    return (
        <>
            <div className="sticky top-0 z-40">
                <Header user={user} />
            </div>

            <main dir="rtl" className="min-h-screen bg-slate-100 p-4 sm:p-8">
                <div className="mx-auto max-w-7xl">

                    {/* Page Header */}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-orange-600">
                                نظام التذوقات
                            </h1>

                            <p className="mt-2 text-gray-600">
                                إدارة التذوقات والشركات والفروع والصور ومبيعات العملاء والـ Vouchers.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => navigate("/marketing")}
                                className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-gray-700 transition hover:bg-gray-200"
                            >
                                العودة للتسويق
                            </button>

                            {canAddTasting && (
                                <button
                                    type="button"
                                    onClick={() => openAddForm(selectedCompany)}
                                    className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-orange-700"
                                >
                                    + إضافة تذوق جديد
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Statistics */}

                    <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">إجمالي التذوقات</p>
                            <p className="mt-2 text-3xl font-bold text-orange-600">
                                {tastings.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">عدد الشركات</p>
                            <p className="mt-2 text-3xl font-bold text-blue-600">
                                {companies.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">عدد العملاء المسجلين</p>
                            <p className="mt-2 text-3xl font-bold text-green-600">
                                {totalDailyRecords}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">إجمالي المشتريات</p>
                            <p className="mt-2 text-2xl font-bold text-purple-600">
                                {formatMoney(allTotals.purchases)} جنيه
                            </p>
                        </div>
                    </section>

                    {/* Financial Summary */}

                    <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                            <p className="text-sm font-semibold text-blue-700">
                                إجمالي قيمة المشتريات
                            </p>
                            <p className="mt-2 text-2xl font-bold text-blue-800">
                                {formatMoney(allTotals.purchases)} جنيه
                            </p>
                        </div>

                        <div className="rounded-xl border border-green-100 bg-green-50 p-5">
                            <p className="text-sm font-semibold text-green-700">
                                إجمالي قيمة الـ Vouchers
                            </p>
                            <p className="mt-2 text-2xl font-bold text-green-800">
                                {formatMoney(allTotals.vouchers)} جنيه
                            </p>
                        </div>
                    </section>

                    {/* Company Groups */}

                    {canViewCompanies && (
                        <section className="mt-8">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">
                                        مجموعات الشركات
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        اختر شركة لعرض التذوقات الخاصة بها.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedCompany("")}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                        selectedCompany === ""
                                            ? "bg-orange-600 text-white"
                                            : "border border-gray-300 bg-white text-gray-700 hover:bg-orange-50"
                                    }`}
                                >
                                    عرض كل الشركات
                                </button>
                            </div>

                            {companies.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {companies.map((company, index) => {
                                        const count = groupedTastings[company]?.length || 0;
                                        const active = selectedCompany === company;

                                        const companyImages =
                                            groupedTastings[company]
                                                ?.flatMap((item) => item.images || [])
                                                .slice(0, 3) || [];

                                        return (
                                            <div
                                                key={company}
                                                className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                                                    active
                                                        ? "border-orange-500 ring-2 ring-orange-100"
                                                        : "border-gray-200 hover:border-orange-300"
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedCompany(active ? "" : company)
                                                    }
                                                    className="w-full text-right"
                                                >
                                                    <div className="relative h-32 overflow-hidden bg-orange-50">
                                                        {companyImages.length > 0 ? (
                                                            <div className="grid h-full grid-cols-3">
                                                                {companyImages.map((image) => (
                                                                    <SafeImage
                                                                        key={image.id}
                                                                        src={image.src}
                                                                        alt=""
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex h-full items-center justify-center text-5xl">
                                                                🏢
                                                            </div>
                                                        )}

                                                        <span className="absolute right-3 top-3 rounded-lg bg-white/90 px-3 py-1 text-xs font-bold text-orange-700 shadow">
                                                            {count} تذوق
                                                        </span>
                                                    </div>

                                                    <div className="p-5">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <h3 className="text-lg font-bold text-slate-800">
                                                                {company}
                                                            </h3>
                                                            <span className="text-2xl">
                                                                {index % 2 === 0 ? "🏢" : "🏬"}
                                                            </span>
                                                        </div>

                                                        <p className="mt-3 text-sm font-semibold text-orange-600">
                                                            {active ? "إخفاء التذوقات" : "عرض تذوقات الشركة"}
                                                        </p>
                                                    </div>
                                                </button>

                                                {canAddTasting && (
                                                    <div className="px-5 pb-5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openAddForm(company)}
                                                            className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
                                                        >
                                                            + إضافة تذوق لهذه الشركة
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow">
                                    لا توجد شركات حتى الآن.
                                </div>
                            )}
                        </section>
                    )}

                    {/* Tastings Table */}

                    {canViewProducts && (
                        <section className="mt-8 overflow-hidden rounded-xl bg-white shadow">
                            <div className="flex flex-col gap-3 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-orange-700">
                                        {selectedCompany
                                            ? `تذوقات ${selectedCompany}`
                                            : "جميع التذوقات"}
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-600">
                                        عدد النتائج: {visibleTastings.length}
                                    </p>
                                </div>

                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="ابحث باسم التذوق أو الشركة أو الفرع..."
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none focus:border-orange-500 sm:max-w-xs"
                                />
                            </div>

                            {visibleTastings.length === 0 ? (
                                <p className="py-10 text-center text-gray-500">
                                    لا توجد تذوقات لعرضها.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-275 border-collapse text-right text-sm">
                                        <thead className="bg-orange-600 text-white">
                                            <tr>
                                                {[
                                                    "الصورة",
                                                    "اسم التذوق",
                                                    "الشركة / المورد",
                                                    "الفرع",
                                                    "تاريخ البداية",
                                                    "تاريخ النهاية",
                                                    "المدة",
                                                    "عدد الصور",
                                                    "عدد العملاء",
                                                    "الإجراءات",
                                                ].map((heading) => (
                                                    <th key={heading} className="whitespace-nowrap p-3">
                                                        {heading}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {visibleTastings.map((tasting) => (
                                                <tr
                                                    key={tasting.id}
                                                    className="border-b border-gray-200 transition hover:bg-orange-50"
                                                >
                                                    <td className="p-3">
                                                        {tasting.images?.[0] ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewImage(tasting.images[0])}
                                                            >
                                                                <SafeImage
                                                                    src={tasting.images[0].src}
                                                                    alt={tasting.name}
                                                                    className="h-14 w-16 rounded-lg border border-gray-200 object-cover"
                                                                />
                                                            </button>
                                                        ) : (
                                                            <span className="flex h-14 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                                                                📷
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="whitespace-nowrap p-3 font-semibold text-slate-800">
                                                        {tasting.name}
                                                    </td>

                                                    <td className="whitespace-nowrap p-3">
                                                        {tasting.company_name || "—"}
                                                    </td>

                                                    <td className="whitespace-nowrap p-3">
                                                        {tasting.branch_name || "—"}
                                                    </td>

                                                    <td className="whitespace-nowrap p-3">
                                                        {formatDate(tasting.startDate)}
                                                    </td>

                                                    <td className="whitespace-nowrap p-3">
                                                        {formatDate(tasting.endDate)}
                                                    </td>

                                                    <td className="whitespace-nowrap p-3">
                                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                                                            {getDuration(tasting.startDate, tasting.endDate)}
                                                        </span>
                                                    </td>

                                                    <td className="p-3">
                                                        {tasting.images?.length || 0}
                                                    </td>

                                                    <td className="p-3">
                                                        {tasting.dailyRecords?.length || 0}
                                                    </td>

                                                    <td className="whitespace-nowrap p-3">
                                                        <div className="flex gap-2">
                                                            {canViewProductDetails && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedTasting(tasting)}
                                                                    className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                                                                >
                                                                    التفاصيل
                                                                </button>
                                                            )}

                                                            {canEditTasting && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditForm(tasting)}
                                                                    className="rounded-lg bg-orange-600 px-3 py-2 text-white hover:bg-orange-700"
                                                                >
                                                                    تعديل
                                                                </button>
                                                            )}

                                                            {canDeleteTasting && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(tasting)}
                                                                    className="rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                                                                >
                                                                    حذف
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {!canViewCompanies && !canViewProducts && (
                        <div className="mt-8 rounded-xl bg-white p-8 text-center text-gray-600 shadow">
                            لا تمتلك صلاحية عرض الشركات أو المنتجات.
                        </div>
                    )}
                </div>
            </main>

            {/* ---------------------------------------------------------------- */}
            {/* Add / Edit Modal                                                 */}
            {/* ---------------------------------------------------------------- */}

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 py-6 sm:p-6">
                    <div className="my-auto w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-orange-600 p-5 text-white">
                            <div>
                                <h2 className="text-xl font-bold">
                                    {editingId !== null ? "تعديل التذوق" : "إضافة تذوق جديد"}
                                </h2>
                                <p className="mt-1 text-sm text-orange-100">
                                    أدخل بيانات التذوق والشركة والفرع والعملاء.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeForm}
                                className="rounded-lg px-3 py-2 text-xl hover:bg-orange-700"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-7 p-5 sm:p-7">

                            {/* Basic Information */}

                            <section>
                                <h3 className="mb-4 border-b border-gray-200 pb-3 text-lg font-bold text-slate-800">
                                    بيانات التذوق
                                </h3>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                    {/* Tasting Name */}

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            اسم التذوق *
                                        </label>
                                        <input
                                            required
                                            value={form.name}
                                            onChange={(event) =>
                                                updateForm("name", event.target.value)
                                            }
                                            placeholder="أدخل اسم التذوق"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Company / Supplier */}

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            الشركة / المورد *
                                        </label>

                                        <SearchableSelect
                                            endpoint="retail/suppliers/search"
                                            value={form.supplier_id}
                                            initialOption={
                                                form.supplier_id && form.company_name
                                                    ? {
                                                        value: String(form.supplier_id),
                                                        label: form.company_name,
                                                    }
                                                    : null
                                            }
                                            onChange={(value, option) => {
                                                setForm((previous) => ({
                                                    ...previous,
                                                    supplier_id: value,
                                                    company_name: option?.label || "",
                                                }));
                                            }}
                                            placeholder="ابحث عن الشركة / المورد..."
                                            isClearable
                                        />
                                    </div>

                                    {/* Branch */}

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            الفرع *
                                        </label>

                                        <SearchableSelect
                                            options={branchOptions}
                                            value={form.branch_id}
                                            initialOption={
                                                form.branch_id && form.branch_name
                                                    ? {
                                                        value: String(form.branch_id),
                                                        label: form.branch_name,
                                                    }
                                                    : null
                                            }
                                            onChange={(value, option) => {
                                                setForm((previous) => ({
                                                    ...previous,
                                                    branch_id: value,
                                                    branch_name: option?.label || "",
                                                }));
                                            }}
                                            placeholder={
                                                branchesLoading
                                                    ? "جاري تحميل الفروع..."
                                                    : "ابحث عن الفرع..."
                                            }
                                            isDisabled={branchesLoading}
                                            isClearable
                                        />
                                    </div>

                                    {/* Start Date */}

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            تاريخ البداية
                                        </label>
                                        <input
                                            type="date"
                                            value={form.startDate}
                                            onChange={(event) =>
                                                updateForm("startDate", event.target.value)
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                                        />
                                    </div>

                                    {/* End Date */}

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            تاريخ النهاية
                                        </label>
                                        <input
                                            type="date"
                                            min={form.startDate || undefined}
                                            value={form.endDate}
                                            onChange={(event) =>
                                                updateForm("endDate", event.target.value)
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
                                    مدة التذوق:{" "}
                                    <strong>{getDuration(form.startDate, form.endDate)}</strong>
                                </div>

                                <div className="mt-4">
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        ملاحظات التذوق
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={form.notes}
                                        onChange={(event) =>
                                            updateForm("notes", event.target.value)
                                        }
                                        placeholder="اكتب ملاحظات التذوق..."
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                                    />
                                </div>
                            </section>

                            {/* Images */}

                            <section>
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">
                                            صور التذوق
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            يمكنك إضافة حتى 10 صور للتذوق الواحد.
                                        </p>
                                    </div>

                                    <label className="cursor-pointer rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700">
                                        + إضافة صور
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImagesChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                {imageError && (
                                    <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                        {imageError}
                                    </p>
                                )}

                                <ImageGallery
                                    images={form.images}
                                    onPreview={setPreviewImage}
                                    onRemove={removeImage}
                                    editable
                                />
                            </section>

                            {/* Daily Customer Records */}

                            <DailyRecordsTable
                                records={form.dailyRecords}
                                onChange={updateDailyRecords}
                                editable
                            />

                            {/* Form Actions */}

                            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="rounded-lg bg-orange-600 px-7 py-3 font-semibold text-white shadow transition hover:bg-orange-700"
                                >
                                    {editingId !== null ? "حفظ التعديلات" : "إضافة التذوق"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* Tasting Details Modal                                            */}
            {/* ---------------------------------------------------------------- */}

            {selectedTasting && canViewProductDetails && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 py-6 sm:p-6">
                    <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-orange-600 p-5 text-white">
                            <div>
                                <h2 className="text-xl font-bold">
                                    {selectedTasting.name}
                                </h2>
                                <p className="mt-1 text-sm text-orange-100">
                                    {selectedTasting.company_name} — {selectedTasting.branch_name}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedTasting(null)}
                                className="rounded-lg px-3 py-2 text-xl hover:bg-orange-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-6 p-5 sm:p-7">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-sm text-gray-500">الشركة / المورد</p>
                                    <p className="mt-2 font-bold">
                                        {selectedTasting.company_name || "—"}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-sm text-gray-500">الفرع</p>
                                    <p className="mt-2 font-bold">
                                        {selectedTasting.branch_name || "—"}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-sm text-gray-500">تاريخ البداية</p>
                                    <p className="mt-2 font-bold">
                                        {formatDate(selectedTasting.startDate)}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-sm text-gray-500">تاريخ النهاية</p>
                                    <p className="mt-2 font-bold">
                                        {formatDate(selectedTasting.endDate)}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-orange-50 p-4">
                                <p className="text-sm text-orange-700">مدة التذوق</p>
                                <p className="mt-2 font-bold text-orange-700">
                                    {getDuration(
                                        selectedTasting.startDate,
                                        selectedTasting.endDate
                                    )}
                                </p>
                            </div>

                            {selectedTasting.notes && (
                                <div>
                                    <h3 className="mb-2 font-bold text-slate-800">
                                        ملاحظات التذوق
                                    </h3>
                                    <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-gray-700">
                                        {selectedTasting.notes}
                                    </p>
                                </div>
                            )}

                            {/* Images */}

                            <section>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        صور التذوق
                                    </h3>
                                    <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                                        {selectedTasting.images?.length || 0} صورة
                                    </span>
                                </div>

                                <ImageGallery
                                    images={selectedTasting.images || []}
                                    onPreview={setPreviewImage}
                                />
                            </section>

                            {/* Customer Records */}

                            <DailyRecordsTable
                                records={selectedTasting.dailyRecords || []}
                                editable={false}
                            />

                            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5">
                                {canEditTasting && (
                                    <button
                                        type="button"
                                        onClick={() => openEditForm(selectedTasting)}
                                        className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
                                    >
                                        تعديل التذوق
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setSelectedTasting(null)}
                                    className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Image Preview */}

            {previewImage && (
                <ImagePreviewModal
                    image={previewImage}
                    onClose={() => setPreviewImage(null)}
                />
            )}
        </>
    );
}
