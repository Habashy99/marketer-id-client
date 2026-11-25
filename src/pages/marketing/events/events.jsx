
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../../components/header";
import SearchableSelect from "../../../components/SearchableSelect";
import { useAuth } from "../../../context/authContext";
import { sendHttpReq } from "../../../lib/httpHandler";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const BRANCH_STATUS_OPTIONS = [
  { value: "pending", label: "لم يتم", className: "bg-gray-100 text-gray-700" },
  { value: "done", label: "تم", className: "bg-green-100 text-green-700" },
  {
    value: "not-applicable",
    label: "لا يوجد",
    className: "bg-slate-100 text-slate-600",
  },
];

const PERMIT_STATUS_OPTIONS = [
  { value: "not-done", label: "لم يتم" },
  { value: "done", label: "تم عمل الإذن" },
];

const createId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createEmptyPermit = () => ({
  status: "not-done",
  images: [],
  notes: "",
});

const createEmptyEvent = (company = "", supplierId = "") => ({
  id: createId(),
  name: "",
  company,
  supplierId: supplierId ? String(supplierId) : "",
  coordinator: "",
  representative: "",
  gender: "",
  exceptions: "no",
  startDate: "",
  endDate: "",
  notes: "",
  branches: [],
  bonusImages: [],
  giftImages: [],
  bonusReturnExists: "no",
  bonusReturnImages: [],
  permits: {
    receipt: createEmptyPermit(),
    return: createEmptyPermit(),
    model: createEmptyPermit(),
  },
});

/* -------------------------------------------------------------------------- */
/* Demo Images                                                                */
/* -------------------------------------------------------------------------- */

const demoImage = (id, name) => ({
  id,
  name,
  src: `https://picsum.photos/seed/${id}/900/650`,
});

/* -------------------------------------------------------------------------- */
/* Dummy Data                                                                 */
/* -------------------------------------------------------------------------- */

const initialEvents = [
  {
    id: "event-001",
    name: "إيفينت افتتاح الموسم الشتوي",
    company: "شركة نستله",
    coordinator: "أحمد محمد",
    representative: "محمود إبراهيم",
    gender: "ولد",
    exceptions: "yes",
    startDate: "2026-11-01",
    endDate: "2026-11-07",
    notes:
      "تم تنفيذ الإيفينت في معظم الفروع. يوجد مرتجع في فرع المنتزه، ويجب متابعة فرع جناكليس لاستكمال استلام البونص.",
    branches: [
      {
        id: "branch-001",
        branchId: "",
        name: "فرع سموحة",
        bonus: "done",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "تم استلام البونص والهدايا بالكامل.",
      },
      {
        id: "branch-002",
        branchId: "",
        name: "فرع ميامي",
        bonus: "done",
        gifts: "pending",
        bonusReturn: "not-applicable",
        notes: "تم استلام البونص والهدايا لم تصل.",
      },
      {
        id: "branch-003",
        branchId: "",
        name: "فرع المنتزه",
        bonus: "done",
        gifts: "done",
        bonusReturn: "done",
        notes: "يوجد مرتجع في بعض الأصناف.",
      },
      {
        id: "branch-004",
        branchId: "",
        name: "فرع جناكليس",
        bonus: "pending",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "البونص لم يتم استلامه.",
      },
      {
        id: "branch-005",
        branchId: "",
        name: "فرع رشدي",
        bonus: "done",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "تم الاستلام بدون ملاحظات.",
      },
    ],
    bonusImages: [
      demoImage("bonus-001", "استلام البونص - سموحة"),
      demoImage("bonus-002", "استلام البونص - المنتزه"),
      demoImage("bonus-003", "استلام البونص - رشدي"),
    ],
    giftImages: [
      demoImage("gift-001", "استلام الهدايا - سموحة"),
      demoImage("gift-002", "استلام الهدايا - المنتزه"),
    ],
    bonusReturnExists: "yes",
    bonusReturnImages: [
      demoImage("return-001", "مرتجع البونص - المنتزه"),
      demoImage("return-002", "صورة المرتجع"),
    ],
    permits: {
      receipt: {
        status: "done",
        notes: "تم عمل إذن استلام البونص والهدايا.",
        images: [
          demoImage("permit-receipt-001", "إذن استلام البونص"),
          demoImage("permit-receipt-002", "إذن استلام الهدايا"),
        ],
      },
      return: {
        status: "done",
        notes: "تم عمل إذن المرتجع الخاص بفرع المنتزه.",
        images: [demoImage("permit-return-001", "إذن مرتجع البونص")],
      },
      model: {
        status: "not-done",
        notes: "في انتظار مراجعة إذن المنوال.",
        images: [],
      },
    },
  },
  {
    id: "event-002",
    name: "إيفينت عرض المنتجات الجديدة",
    company: "شركة نستله",
    coordinator: "محمد أحمد",
    representative: "سارة محمود",
    gender: "بنت",
    exceptions: "no",
    startDate: "2026-11-10",
    endDate: "2026-11-15",
    notes: "إيفينت خاص بعرض المنتجات الجديدة داخل الفروع.",
    branches: [
      {
        id: "branch-006",
        branchId: "",
        name: "فرع العصافرة",
        bonus: "done",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "تم الاستلام بالكامل.",
      },
      {
        id: "branch-007",
        branchId: "",
        name: "فرع لوران",
        bonus: "pending",
        gifts: "pending",
        bonusReturn: "not-applicable",
        notes: "في انتظار الاستلام.",
      },
      {
        id: "branch-008",
        branchId: "",
        name: "فرع كفر عبده",
        bonus: "done",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "لا توجد ملاحظات.",
      },
      {
        id: "branch-009",
        branchId: "",
        name: "فرع سيدي بشر",
        bonus: "done",
        gifts: "pending",
        bonusReturn: "not-applicable",
        notes: "الهدايا لم تصل.",
      },
    ],
    bonusImages: [
      demoImage("bonus-004", "استلام البونص - العصافرة"),
      demoImage("bonus-005", "استلام البونص - كفر عبده"),
    ],
    giftImages: [
      demoImage("gift-003", "استلام الهدايا - العصافرة"),
      demoImage("gift-004", "استلام الهدايا - كفر عبده"),
    ],
    bonusReturnExists: "no",
    bonusReturnImages: [],
    permits: {
      receipt: {
        status: "done",
        notes: "تم عمل إذن الاستلام.",
        images: [demoImage("permit-receipt-003", "إذن استلام الإيفينت")],
      },
      return: {
        status: "not-done",
        notes: "لا يوجد مرتجع حتى الآن.",
        images: [],
      },
      model: {
        status: "done",
        notes: "تم اعتماد إذن المنوال.",
        images: [demoImage("permit-model-001", "إذن المنوال")],
      },
    },
  },
  {
    id: "event-003",
    name: "إيفينت حملة العروض الشهرية",
    company: "شركة بيبسي",
    coordinator: "خالد حسن",
    representative: "عمر مصطفى",
    gender: "ولد",
    exceptions: "yes",
    startDate: "2026-11-18",
    endDate: "2026-11-25",
    notes: "يوجد استثناء خاص بفرع واحد. يجب متابعة استلام المرتجع وتجهيز الإذن.",
    branches: [
      {
        id: "branch-010",
        branchId: "",
        name: "فرع فيكتوريا",
        bonus: "done",
        gifts: "pending",
        bonusReturn: "done",
        notes: "تم استلام البونص ويوجد مرتجع.",
      },
      {
        id: "branch-011",
        branchId: "",
        name: "فرع سيدي بشر",
        bonus: "pending",
        gifts: "pending",
        bonusReturn: "not-applicable",
        notes: "لم يتم الاستلام.",
      },
      {
        id: "branch-012",
        branchId: "",
        name: "فرع جليم",
        bonus: "done",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "تم الاستلام بالكامل.",
      },
      {
        id: "branch-013",
        branchId: "",
        name: "فرع سبورتنج",
        bonus: "done",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "تم الاستلام.",
      },
    ],
    bonusImages: [
      demoImage("bonus-006", "استلام البونص - فيكتوريا"),
      demoImage("bonus-007", "استلام البونص - جليم"),
    ],
    giftImages: [
      demoImage("gift-005", "استلام الهدايا - جليم"),
      demoImage("gift-006", "استلام الهدايا - سبورتنج"),
    ],
    bonusReturnExists: "yes",
    bonusReturnImages: [demoImage("return-003", "مرتجع البونص - فيكتوريا")],
    permits: {
      receipt: {
        status: "done",
        notes: "تم تجهيز إذن الاستلام.",
        images: [demoImage("permit-receipt-004", "إذن الاستلام")],
      },
      return: {
        status: "not-done",
        notes: "إذن المرتجع لم يتم تجهيزه.",
        images: [],
      },
      model: {
        status: "not-done",
        notes: "لم يتم عمل إذن المنوال.",
        images: [],
      },
    },
  },
  {
    id: "event-004",
    name: "إيفينت إطلاق المنتج الجديد",
    company: "شركة بيبسي",
    coordinator: "محمود علي",
    representative: "نور أحمد",
    gender: "بنت",
    exceptions: "no",
    startDate: "2026-11-05",
    endDate: "2026-11-12",
    notes: "تم تنفيذ الإيفينت بنجاح في الفروع المحددة.",
    branches: [
      {
        id: "branch-014",
        branchId: "",
        name: "فرع المنتزه",
        bonus: "done",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "تم الاستلام.",
      },
      {
        id: "branch-015",
        branchId: "",
        name: "فرع المندرة",
        bonus: "done",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "تم الاستلام بالكامل.",
      },
      {
        id: "branch-016",
        branchId: "",
        name: "فرع باكوس",
        bonus: "done",
        gifts: "pending",
        bonusReturn: "not-applicable",
        notes: "الهدايا لم يتم استلامها.",
      },
    ],
    bonusImages: [demoImage("bonus-008", "استلام البونص - المنتزه")],
    giftImages: [demoImage("gift-007", "استلام الهدايا - المنتزه")],
    bonusReturnExists: "no",
    bonusReturnImages: [],
    permits: {
      receipt: {
        status: "done",
        notes: "إذن الاستلام جاهز.",
        images: [demoImage("permit-receipt-005", "إذن استلام المنتجات")],
      },
      return: {
        status: "done",
        notes: "تم عمل إذن المرتجع.",
        images: [demoImage("permit-return-002", "إذن المرتجع")],
      },
      model: {
        status: "done",
        notes: "تم عمل إذن المنوال.",
        images: [demoImage("permit-model-002", "إذن المنوال")],
      },
    },
  },
  {
    id: "event-005",
    name: "إيفينت توزيع الهدايا",
    company: "شركة جهينة",
    coordinator: "إبراهيم حسن",
    representative: "منى محمد",
    gender: "بنت",
    exceptions: "yes",
    startDate: "2026-11-12",
    endDate: "2026-11-20",
    notes: "بعض الفروع لم تستلم الهدايا حتى الآن.",
    branches: [
      {
        id: "branch-017",
        branchId: "",
        name: "فرع سموحة",
        bonus: "done",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "تم الاستلام.",
      },
      {
        id: "branch-018",
        branchId: "",
        name: "فرع رشدي",
        bonus: "pending",
        gifts: "done",
        bonusReturn: "not-applicable",
        notes: "البونص لم يتم استلامه.",
      },
      {
        id: "branch-019",
        branchId: "",
        name: "فرع جناكليس",
        bonus: "done",
        gifts: "pending",
        bonusReturn: "not-applicable",
        notes: "في انتظار استلام الهدايا.",
      },
      {
        id: "branch-020",
        branchId: "",
        name: "فرع لوران",
        bonus: "done",
        gifts: "done",
        bonusReturn: "done",
        notes: "يوجد مرتجع بونص.",
      },
    ],
    bonusImages: [
      demoImage("bonus-009", "استلام البونص - سموحة"),
      demoImage("bonus-010", "استلام البونص - لوران"),
    ],
    giftImages: [
      demoImage("gift-008", "استلام الهدايا - سموحة"),
      demoImage("gift-009", "استلام الهدايا - لوران"),
    ],
    bonusReturnExists: "yes",
    bonusReturnImages: [demoImage("return-004", "مرتجع البونص - لوران")],
    permits: {
      receipt: {
        status: "not-done",
        notes: "لم يتم عمل إذن الاستلام حتى الآن.",
        images: [],
      },
      return: {
        status: "done",
        notes: "تم عمل إذن المرتجع.",
        images: [demoImage("permit-return-003", "إذن مرتجع جهينة")],
      },
      model: {
        status: "not-done",
        notes: "في انتظار تجهيز إذن المنوال.",
        images: [],
      },
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB");
};

const getDuration = (start, end) => {
  if (!start || !end) return "غير محددة";

  const first = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  const days = Math.ceil((last - first) / 86400000) + 1;

  return days > 0 ? `${days} يوم` : "تاريخ غير صحيح";
};

const readImages = (files) =>
  Promise.all(
    files.map(
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
        }),
    ),
  );

const countStatus = (events, field, status) =>
  events.reduce(
    (total, event) =>
      total +
      (event.branches || []).filter((branch) => branch[field] === status).length,
    0,
  );

const countPermitStatus = (events, permitName, status) =>
  events.filter((event) => event.permits?.[permitName]?.status === status)
    .length;

const getAllBranches = (events) =>
  events.flatMap((event) =>
    (event.branches || []).map((branch) => ({
      ...branch,
      eventName: event.name,
      company: event.company,
    })),
  );

/* -------------------------------------------------------------------------- */
/* Image Preview Modal                                                        */
/* -------------------------------------------------------------------------- */

const ImagePreviewModal = ({ image, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!image) return null;

  const changeZoom = (amount) => {
    setZoom((previous) =>
      Math.min(4, Math.max(0.5, Number((previous + amount).toFixed(2)))),
    );
  };

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (event) => {
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 0.2 : -0.2);
  };

  const handlePointerDown = (event) => {
    if (zoom <= 1) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);

    setDragStart({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  };

  const handlePointerMove = (event) => {
    if (!dragging) return;

    setPosition({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => setDragging(false);

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col bg-black/95"
      dir="rtl"
      onClick={onClose}
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 bg-black/70 p-4 text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <h3 className="truncate font-bold">
            {image.name || "معاينة الصورة"}
          </h3>
          <p className="mt-1 text-xs text-gray-300">
            استخدم عجلة الماوس للتكبير، واسحب الصورة لتحريكها.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => changeZoom(-0.2)}
            disabled={zoom <= 0.5}
            className="rounded-lg bg-white/15 px-3 py-2 text-lg hover:bg-white/25 disabled:opacity-40"
            title="تصغير"
          >
            −
          </button>

          <span className="min-w-14 text-center text-sm font-bold">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => changeZoom(0.2)}
            disabled={zoom >= 4}
            className="rounded-lg bg-white/15 px-3 py-2 text-lg hover:bg-white/25 disabled:opacity-40"
            title="تكبير"
          >
            +
          </button>

          <button
            type="button"
            onClick={resetZoom}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm hover:bg-blue-700"
          >
            إعادة ضبط
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-red-600 px-3 py-2 hover:bg-red-700"
            title="إغلاق"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={image.src}
          alt={image.name || "صورة"}
          draggable={false}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`max-h-full max-w-full select-none object-contain ${
            zoom > 1
              ? dragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-zoom-in"
          }`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transition: dragging ? "none" : "transform 150ms ease",
            touchAction: "none",
          }}
        />
      </div>

      <div className="bg-black/60 p-3 text-center text-xs text-gray-300">
        اضغط خارج الصورة أو على علامة × للإغلاق
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Image Uploader                                                             */
/* -------------------------------------------------------------------------- */

const ImageUploader = ({
  title,
  images = [],
  onAdd,
  onRemove,
  onPreview,
  hint,
  readOnly = false,
}) => (
  <section className="rounded-xl border border-gray-200 p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h4 className="font-bold text-slate-800">{title}</h4>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>

      {!readOnly && (
        <label className="cursor-pointer rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
          + إضافة صور
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onAdd}
          />
        </label>
      )}
    </div>

    {images.length ? (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative overflow-hidden rounded-lg border bg-gray-50"
          >
            <button
              type="button"
              onClick={() => onPreview?.(image)}
              className="block w-full cursor-zoom-in"
              title="اضغط لتكبير الصورة"
            >
              <img
                src={image.src}
                alt={image.name}
                className="h-28 w-full object-cover transition duration-200 hover:scale-105"
              />
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemove(image.id)}
                className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-1 text-xs text-white"
              >
                حذف
              </button>
            )}

            <p className="truncate p-2 text-xs text-gray-600">
              {image.name}
            </p>
          </div>
        ))}
      </div>
    ) : (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-5 text-center text-sm text-gray-400">
        لا توجد صور مضافة.
      </div>
    )}
  </section>
);

/* -------------------------------------------------------------------------- */
/* Reusable Components                                                        */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({ value }) => {
  const option =
    BRANCH_STATUS_OPTIONS.find((item) => item.value === value) ||
    BRANCH_STATUS_OPTIONS[0];

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${option.className}`}
    >
      {option.label}
    </span>
  );
};

const InfoCard = ({ label, value, color = "text-slate-800" }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function Events() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState(initialEvents);
  const [branchOptions, setBranchOptions] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [search, setSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(createEmptyEvent());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [imageError, setImageError] = useState("");

  useEffect(() => {
    let active = true;

    const loadBranches = async () => {
      setBranchesLoading(true);
      try {
        const response = await sendHttpReq("retail/branches");
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.data)
              ? response.data.data
              : [];

        if (!active) return;

        setBranchOptions(
          rows
            .map((branch) => ({
              value: String(branch.id ?? branch.branch ?? ""),
              label: String(branch.a_name ?? branch.name ?? ""),
            }))
            .filter((option) => option.value && option.label),
        );
      } catch (error) {
        console.error("Failed to load branches:", error);
        if (active) setBranchOptions([]);
      } finally {
        if (active) setBranchesLoading(false);
      }
    };

    loadBranches();

    return () => {
      active = false;
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Companies and Groups                                                     */
  /* ------------------------------------------------------------------------ */

  const companies = useMemo(
    () =>
      [
        ...new Set(
          events
            .map((event) => event.company?.trim())
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "ar")),
    [events],
  );

  const groupedEvents = useMemo(
    () =>
      events.reduce((groups, event) => {
        const company = event.company?.trim() || "بدون شركة";

        if (!groups[company]) groups[company] = [];

        groups[company].push(event);
        return groups;
      }, {}),
    [events],
  );

  const visibleEvents = useMemo(() => {
    const source = selectedCompany
      ? groupedEvents[selectedCompany] || []
      : events;

    const term = search.trim().toLowerCase();

    if (!term) return source;

    return source.filter((event) =>
      [
        event.name,
        event.company,
        event.coordinator,
        event.representative,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [events, groupedEvents, selectedCompany, search]);

  const allBranches = useMemo(() => getAllBranches(events), [events]);

  const visibleBranches = useMemo(() => {
    const term = branchSearch.trim().toLowerCase();

    if (!term) return allBranches;

    return allBranches.filter((branch) =>
      [
        branch.name,
        branch.company,
        branch.eventName,
        branch.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [allBranches, branchSearch]);

  /* ------------------------------------------------------------------------ */
  /* Statistics                                                               */
  /* ------------------------------------------------------------------------ */

  const totalBranches = allBranches.length;

  const statistics = [
    {
      label: "إجمالي الإيفينتات",
      value: events.length,
      color: "text-orange-600",
      icon: "🎯",
    },
    {
      label: "عدد الشركات",
      value: companies.length,
      color: "text-blue-600",
      icon: "🏢",
    },
    {
      label: "إجمالي الفروع",
      value: totalBranches,
      color: "text-purple-600",
      icon: "🏬",
    },
    {
      label: "فروع استلمت البونص",
      value: countStatus(events, "bonus", "done"),
      color: "text-green-600",
      icon: "🎁",
    },
    {
      label: "فروع استلمت الهدايا",
      value: countStatus(events, "gifts", "done"),
      color: "text-indigo-600",
      icon: "🎀",
    },
    {
      label: "فروع لم تستلم البونص",
      value: countStatus(events, "bonus", "pending"),
      color: "text-red-600",
      icon: "⏳",
    },
    {
      label: "فروع لم تستلم الهدايا",
      value: countStatus(events, "gifts", "pending"),
      color: "text-amber-600",
      icon: "📦",
    },
    {
      label: "فروع لديها مرتجع",
      value: countStatus(events, "bonusReturn", "done"),
      color: "text-rose-600",
      icon: "↩️",
    },
  ];

  const permitStatistics = [
    {
      label: "أذونات الاستلام المنفذة",
      done: countPermitStatus(events, "receipt", "done"),
      pending: countPermitStatus(events, "receipt", "not-done"),
    },
    {
      label: "أذونات المرتجع المنفذة",
      done: countPermitStatus(events, "return", "done"),
      pending: countPermitStatus(events, "return", "not-done"),
    },
    {
      label: "أذونات المنوال المنفذة",
      done: countPermitStatus(events, "model", "done"),
      pending: countPermitStatus(events, "model", "not-done"),
    },
  ];

  /* ------------------------------------------------------------------------ */
  /* Form Helpers                                                             */
  /* ------------------------------------------------------------------------ */

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updatePermit = (permitName, field, value) => {
    setForm((previous) => ({
      ...previous,
      permits: {
        ...previous.permits,
        [permitName]: {
          ...previous.permits[permitName],
          [field]: value,
        },
      },
    }));
  };

  const openAddForm = (company = "") => {
    setEditingId(null);
    setImageError("");
    setForm(createEmptyEvent(company));
    setShowForm(true);
  };

  const openEditForm = (event) => {
    setEditingId(event.id);
    setImageError("");

    setForm({
      ...createEmptyEvent(),
      ...event,
      supplierId: event.supplierId ? String(event.supplierId) : "",
      branches: (event.branches || []).map((branch) => ({
        ...branch,
        branchId: branch.branchId ? String(branch.branchId) : "",
      })),
      bonusImages: [...(event.bonusImages || [])],
      giftImages: [...(event.giftImages || [])],
      bonusReturnImages: [...(event.bonusReturnImages || [])],
      permits: {
        receipt: {
          ...createEmptyPermit(),
          ...event.permits?.receipt,
        },
        return: {
          ...createEmptyPermit(),
          ...event.permits?.return,
        },
        model: {
          ...createEmptyPermit(),
          ...event.permits?.model,
        },
      },
    });

    setSelectedEvent(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setImageError("");
  };

  /* ------------------------------------------------------------------------ */
  /* Images                                                                   */
  /* ------------------------------------------------------------------------ */

  const addImages = async (event, field, permitName = null) => {
    const files = Array.from(event.target.files || []);

    event.target.value = "";

    if (!files.length) return;

    const validFiles = files.filter((file) =>
      file.type.startsWith("image/"),
    );

    if (validFiles.length !== files.length) {
      setImageError("يرجى اختيار ملفات صور فقط.");
    } else {
      setImageError("");
    }

    try {
      const converted = await readImages(validFiles.slice(0, 15));

      if (!converted.length) return;

      if (permitName) {
        setForm((previous) => ({
          ...previous,
          permits: {
            ...previous.permits,
            [permitName]: {
              ...previous.permits[permitName],
              [field]: [
                ...(previous.permits[permitName][field] || []),
                ...converted,
              ],
            },
          },
        }));
      } else {
        setForm((previous) => ({
          ...previous,
          [field]: [...(previous[field] || []), ...converted],
        }));
      }
    } catch {
      setImageError("حدث خطأ أثناء قراءة الصور.");
    }
  };

  const removeImages = (field, imageId, permitName = null) => {
    if (permitName) {
      setForm((previous) => ({
        ...previous,
        permits: {
          ...previous.permits,
          [permitName]: {
            ...previous.permits[permitName],
            [field]: (previous.permits[permitName][field] || []).filter(
              (image) => image.id !== imageId,
            ),
          },
        },
      }));
    } else {
      setForm((previous) => ({
        ...previous,
        [field]: (previous[field] || []).filter(
          (image) => image.id !== imageId,
        ),
      }));
    }
  };

  const handlePreviewImage = (image) => {
    setPreviewImage(image);
  };

  /* ------------------------------------------------------------------------ */
  /* Branches                                                                 */
  /* ------------------------------------------------------------------------ */

  const addBranch = () => {
    setForm((previous) => ({
      ...previous,
      branches: [
        ...previous.branches,
        {
          id: createId(),
          branchId: "",
          name: "",
          bonus: "pending",
          gifts: "pending",
          bonusReturn: "not-applicable",
          notes: "",
        },
      ],
    }));
  };

  const updateBranch = (branchId, field, value) => {
    setForm((previous) => ({
      ...previous,
      branches: previous.branches.map((branch) =>
        branch.id === branchId ? { ...branch, [field]: value } : branch,
      ),
    }));
  };

  const removeBranch = (branchId) => {
    setForm((previous) => ({
      ...previous,
      branches: previous.branches.filter((branch) => branch.id !== branchId),
    }));
  };

  /* ------------------------------------------------------------------------ */
  /* Save Event                                                               */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.company.trim() || !form.supplierId) {
      alert("يرجى إدخال اسم الإيفينت واختيار الشركة / المورد من القائمة.");
      return;
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      alert("تاريخ النهاية يجب أن يكون بعد تاريخ البداية.");
      return;
    }

    if (form.branches.some((branch) => !branch.name.trim() || !branch.branchId)) {
      alert("يرجى اختيار فرع من القائمة لكل صف تمت إضافته أو حذف الصف الفارغ.");
      return;
    }

    const data = {
      ...form,
      name: form.name.trim(),
      company: form.company.trim(),
      supplierId: form.supplierId ? String(form.supplierId) : "",
      branches: form.branches.map((branch) => ({
        ...branch,
        branchId: branch.branchId ? String(branch.branchId) : "",
        name: branch.name.trim(),
      })),
    };

    if (editingId) {
      setEvents((previous) =>
        previous.map((item) =>
          item.id === editingId ? { ...item, ...data } : item,
        ),
      );
    } else {
      setEvents((previous) => [
        ...previous,
        {
          ...data,
          id: createId(),
        },
      ]);
    }

    setSelectedCompany(data.company);
    closeForm();
  };

  /* ------------------------------------------------------------------------ */
  /* Delete Event                                                             */
  /* ------------------------------------------------------------------------ */

  const handleDelete = (event) => {
    if (!window.confirm(`هل أنت متأكد من حذف إيفينت "${event.name}"؟`)) {
      return;
    }

    setEvents((previous) =>
      previous.filter((item) => item.id !== event.id),
    );

    if (selectedEvent?.id === event.id) {
      setSelectedEvent(null);
    }
  };

  const permitLabel = (permit) =>
    permit?.status === "done" ? "تم عمل الإذن" : "لم يتم";

  /* ------------------------------------------------------------------------ */
  /* Authentication                                                           */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

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
                نظام الإيفينتات
              </h1>
              <p className="mt-2 text-gray-600">
                إدارة إيفينتات الشركات والفروع والبونص والهدايا والمرتجعات والأذونات.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("/marketing")}
                className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-gray-700 hover:bg-gray-200"
              >
                العودة للتسويق
              </button>

              <button
                type="button"
                onClick={() => openAddForm(selectedCompany)}
                className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white shadow hover:bg-orange-700"
              >
                + إضافة إيفينت
              </button>
            </div>
          </div>

          {/* Main Statistics */}
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                الإحصائيات العامة
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                ملخص سريع لجميع الإيفينتات المسجلة.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statistics.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{item.label}</p>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <p className={`mt-3 text-3xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Permit Statistics */}
          <section className="mt-8">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              إحصائيات الأذونات
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {permitStatistics.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-bold text-slate-800">{item.label}</h3>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-xs text-green-700">تم</p>
                      <p className="mt-1 text-2xl font-bold text-green-700">
                        {item.done}
                      </p>
                    </div>

                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">لم يتم</p>
                      <p className="mt-1 text-2xl font-bold text-amber-700">
                        {item.pending}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Companies */}
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  الشركات والإيفينتات
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  اختر الشركة لعرض الإيفينتات الخاصة بها أو أضف إيفينتًا جديدًا.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCompany("")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  selectedCompany
                    ? "border border-gray-300 bg-white text-gray-700"
                    : "bg-orange-600 text-white"
                }`}
              >
                كل الشركات
              </button>
            </div>

            {companies.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {companies.map((company) => {
                  const active = selectedCompany === company;
                  const companyEvents = groupedEvents[company] || [];
                  const companyBranches = getAllBranches(companyEvents);

                  return (
                    <div
                      key={company}
                      className={`rounded-xl border bg-white p-5 shadow-sm ${
                        active
                          ? "border-orange-500 ring-2 ring-orange-100"
                          : "border-gray-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCompany(active ? "" : company)
                        }
                        className="w-full text-right"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">
                              {company}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">
                              {companyEvents.length} إيفينت
                            </p>
                          </div>

                          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                            🏢
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs text-gray-500">الفروع</p>
                            <p className="mt-1 font-bold">
                              {companyBranches.length}
                            </p>
                          </div>

                          <div className="rounded-lg bg-green-50 p-3">
                            <p className="text-xs text-green-700">
                              استلام البونص
                            </p>
                            <p className="mt-1 font-bold text-green-700">
                              {
                                companyBranches.filter(
                                  (branch) => branch.bonus === "done",
                                ).length
                              }
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-orange-600">
                          {active
                            ? "إخفاء إيفينتات الشركة"
                            : "عرض إيفينتات الشركة"}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => openAddForm(company)}
                        className="mt-4 w-full rounded-lg border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50"
                      >
                        + إضافة إيفينت لهذه الشركة
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow">
                لا توجد شركات بعد.
              </div>
            )}
          </section>

          {/* Events Table */}
          <section className="mt-8 overflow-hidden rounded-xl bg-white shadow">
            <div className="flex flex-col gap-3 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-orange-700">
                  {selectedCompany
                    ? `إيفينتات ${selectedCompany}`
                    : "جميع الإيفينتات"}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  عدد النتائج: {visibleEvents.length}
                </p>
              </div>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث بالشركة أو الإيفينت أو المنسق..."
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none focus:border-orange-500 sm:max-w-sm"
              />
            </div>

            {visibleEvents.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-275 border-collapse text-right text-sm">
                  <thead className="bg-orange-600 text-white">
                    <tr>
                      {[
                        "اسم الإيفينت",
                        "الشركة",
                        "المنسق",
                        "المندوب",
                        "بنت / ولد",
                        "المدة",
                        "عدد الفروع",
                        "استلام البونص",
                        "استلام الهدايا",
                        "مرتجع البونص",
                        "الإجراءات",
                      ].map((heading) => (
                        <th key={heading} className="whitespace-nowrap p-3">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {visibleEvents.map((item) => {
                      const branches = item.branches || [];

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-gray-200 hover:bg-orange-50"
                        >
                          <td className="whitespace-nowrap p-3 font-semibold text-slate-800">
                            {item.name}
                          </td>
                          <td className="whitespace-nowrap p-3">
                            {item.company}
                          </td>
                          <td className="whitespace-nowrap p-3">
                            {item.coordinator || "—"}
                          </td>
                          <td className="whitespace-nowrap p-3">
                            {item.representative || "—"}
                          </td>
                          <td className="whitespace-nowrap p-3">
                            {item.gender || "—"}
                          </td>
                          <td className="whitespace-nowrap p-3">
                            {getDuration(item.startDate, item.endDate)}
                          </td>
                          <td className="p-3 text-center">
                            {branches.length}
                          </td>
                          <td className="p-3 text-center">
                            {
                              branches.filter(
                                (branch) => branch.bonus === "done",
                              ).length
                            }
                            {" / "}
                            {branches.length}
                          </td>
                          <td className="p-3 text-center">
                            {
                              branches.filter(
                                (branch) => branch.gifts === "done",
                              ).length
                            }
                            {" / "}
                            {branches.length}
                          </td>
                          <td className="p-3 text-center">
                            {
                              branches.filter(
                                (branch) => branch.bonusReturn === "done",
                              ).length
                            }
                          </td>
                          <td className="whitespace-nowrap p-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedEvent(item)}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                              >
                                التفاصيل
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditForm(item)}
                                className="rounded-lg bg-orange-600 px-3 py-2 text-white hover:bg-orange-700"
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-10 text-center text-gray-500">
                لا توجد إيفينتات لعرضها.
              </p>
            )}
          </section>

          {/* All Branches Overview */}
          <section className="mt-8 overflow-hidden rounded-xl bg-white shadow">
            <div className="flex flex-col gap-3 bg-slate-800 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  جميع الفروع وحالة الاستلام
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  متابعة البونص والهدايا والمرتجعات لكل فرع.
                </p>
              </div>

              <input
                type="search"
                value={branchSearch}
                onChange={(event) => setBranchSearch(event.target.value)}
                placeholder="ابحث باسم الفرع أو الشركة..."
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-800 outline-none focus:border-orange-500 sm:max-w-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
              <InfoCard label="إجمالي الفروع" value={totalBranches} />
              <InfoCard
                label="فروع استلمت البونص"
                value={countStatus(events, "bonus", "done")}
                color="text-green-700"
              />
              <InfoCard
                label="فروع لديها مرتجع"
                value={countStatus(events, "bonusReturn", "done")}
                color="text-rose-700"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-225 text-right text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    {[
                      "اسم الفرع",
                      "الشركة",
                      "الإيفينت",
                      "استلام البونص",
                      "استلام الهدايا",
                      "مرتجع البونص",
                      "الملاحظات",
                    ].map((heading) => (
                      <th key={heading} className="whitespace-nowrap p-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visibleBranches.map((branch) => (
                    <tr
                      key={branch.id}
                      className="border-t hover:bg-orange-50"
                    >
                      <td className="whitespace-nowrap p-3 font-semibold">
                        {branch.name}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {branch.company}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {branch.eventName}
                      </td>
                      <td className="p-3">
                        <StatusBadge value={branch.bonus} />
                      </td>
                      <td className="p-3">
                        <StatusBadge value={branch.gifts} />
                      </td>
                      <td className="p-3">
                        <StatusBadge value={branch.bonusReturn} />
                      </td>
                      <td className="p-3">{branch.notes || "—"}</td>
                    </tr>
                  ))}

                  {!visibleBranches.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-gray-500"
                      >
                        لا توجد فروع مطابقة للبحث.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Add / Edit Event Modal                                             */}
      {/* ------------------------------------------------------------------ */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 py-6 sm:p-6">
          <div className="my-auto w-full max-w-6xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-orange-600 p-5 text-white">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? "تعديل الإيفينت" : "إضافة إيفينت جديد"}
                </h2>
                <p className="mt-1 text-sm text-orange-100">
                  بيانات الشركة والفروع والاستلامات والأذونات.
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
                <h3 className="mb-4 border-b pb-3 text-lg font-bold text-slate-800">
                  البيانات الأساسية
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm font-semibold text-gray-700">
                    اسم الإيفينت *
                    <input
                      required
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="اسم الإيفينت"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                    />
                  </label>

                  <div className="text-sm font-semibold text-gray-700">
                    <label className="mb-2 block">الشركة / المورد *</label>
                    <SearchableSelect
                      endpoint="retail/suppliers/search"
                      value={form.supplierId || form.company}
                      initialOption={
                        form.company
                          ? {
                              value: String(form.supplierId || form.company),
                              label: form.company,
                            }
                          : null
                      }
                      onChange={(value, option) => {
                        setForm((previous) => ({
                          ...previous,
                          supplierId: value ? String(value) : "",
                          company: option?.label || "",
                        }));
                      }}
                      placeholder="ابحث عن الشركة / المورد..."
                      isDisabled={false}
                      isClearable
                    />
                  </div>

                  <label className="text-sm font-semibold text-gray-700">
                    المنسق
                    <input
                      value={form.coordinator}
                      onChange={(e) =>
                        updateForm("coordinator", e.target.value)
                      }
                      placeholder="اسم المنسق"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                    />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    المندوب
                    <input
                      value={form.representative}
                      onChange={(e) =>
                        updateForm("representative", e.target.value)
                      }
                      placeholder="اسم المندوب"
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                    />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    بنت أو ولد
                    <select
                      value={form.gender}
                      onChange={(e) => updateForm("gender", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-normal"
                    >
                      <option value="">اختر</option>
                      <option value="بنت">بنت</option>
                      <option value="ولد">ولد</option>
                    </select>
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    الاستثناءات
                    <select
                      value={form.exceptions}
                      onChange={(e) =>
                        updateForm("exceptions", e.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-normal"
                    >
                      <option value="no">لا يوجد</option>
                      <option value="yes">يوجد</option>
                    </select>
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    تاريخ البداية
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        updateForm("startDate", e.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-normal"
                    />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    تاريخ النهاية
                    <input
                      type="date"
                      min={form.startDate || undefined}
                      value={form.endDate}
                      onChange={(e) => updateForm("endDate", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-normal"
                    />
                  </label>

                  <div className="flex items-end rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
                    المدة:
                    <strong className="mr-2">
                      {getDuration(form.startDate, form.endDate)}
                    </strong>
                  </div>
                </div>

                <label className="mt-4 block text-sm font-semibold text-gray-700">
                  الملاحظات
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => updateForm("notes", e.target.value)}
                    placeholder="ملاحظات الإيفينت..."
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
                  />
                </label>
              </section>

              {/* Branches Table */}
              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      جدول الفروع وحالة الاستلام
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      أضف فروع الشركة وحدد حالة البونص والهدايا والمرتجع لكل فرع.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addBranch}
                    className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                  >
                    + إضافة فرع
                  </button>
                </div>

                {form.branches.length ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full min-w-212.5 text-right text-sm">
                      <thead className="bg-orange-600 text-white">
                        <tr>
                          {[
                            "اسم الفرع",
                            "استلام البونص",
                            "استلام الهدايا",
                            "مرتجع البونص",
                            "ملاحظات الفرع",
                            "حذف",
                          ].map((heading) => (
                            <th key={heading} className="p-3">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {form.branches.map((branch) => (
                          <tr
                            key={branch.id}
                            className="border-t hover:bg-orange-50"
                          >
                            <td className="min-w-52 p-2">
                              <SearchableSelect
                                options={branchOptions}
                                value={branch.branchId || branch.name}
                                initialOption={
                                  branch.name
                                    ? {
                                        value: String(branch.branchId || branch.name),
                                        label: branch.name,
                                      }
                                    : null
                                }
                                onChange={(value, option) => {
                                  updateBranch(branch.id, "branchId", value ? String(value) : "");
                                  updateBranch(branch.id, "name", option?.label || "");
                                }}
                                placeholder="ابحث عن الفرع..."
                                isDisabled={branchesLoading}
                                isClearable
                              />
                            </td>

                            {["bonus", "gifts", "bonusReturn"].map((field) => (
                              <td key={field} className="p-2">
                                <select
                                  value={branch[field]}
                                  onChange={(e) =>
                                    updateBranch(
                                      branch.id,
                                      field,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full min-w-28 rounded-lg border bg-white px-2 py-2"
                                >
                                  {BRANCH_STATUS_OPTIONS.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            ))}

                            <td className="p-2">
                              <input
                                value={branch.notes}
                                onChange={(e) =>
                                  updateBranch(
                                    branch.id,
                                    "notes",
                                    e.target.value,
                                  )
                                }
                                placeholder="ملاحظات"
                                className="w-full min-w-36 rounded-lg border px-3 py-2"
                              />
                            </td>

                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeBranch(branch.id)}
                                className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
                              >
                                حذف
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-300 p-7 text-center text-gray-400">
                    لم تتم إضافة فروع. اضغط «إضافة فرع» لبدء تسجيل الاستلامات.
                  </div>
                )}
              </section>

              {/* Receipt and Return Images */}
              <section>
                <h3 className="mb-4 border-b pb-3 text-lg font-bold text-slate-800">
                  صور الاستلام والمرتجعات
                </h3>

                <div className="space-y-4">
                  <ImageUploader
                    title="صور استلام البونص"
                    images={form.bonusImages}
                    onAdd={(e) => addImages(e, "bonusImages")}
                    onRemove={(id) => removeImages("bonusImages", id)}
                    onPreview={handlePreviewImage}
                  />

                  <ImageUploader
                    title="صور استلام الهدايا"
                    images={form.giftImages}
                    onAdd={(e) => addImages(e, "giftImages")}
                    onRemove={(id) => removeImages("giftImages", id)}
                    onPreview={handlePreviewImage}
                  />

                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-4 flex flex-wrap items-center gap-4">
                      <h4 className="font-bold text-slate-800">
                        مرتجع البونص
                      </h4>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="bonusReturnExists"
                          checked={form.bonusReturnExists === "yes"}
                          onChange={() =>
                            updateForm("bonusReturnExists", "yes")
                          }
                        />
                        يوجد مرتجع
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="bonusReturnExists"
                          checked={form.bonusReturnExists === "no"}
                          onChange={() => {
                            updateForm("bonusReturnExists", "no");
                            updateForm("bonusReturnImages", []);
                          }}
                        />
                        لا يوجد
                      </label>
                    </div>

                    {form.bonusReturnExists === "yes" ? (
                      <ImageUploader
                        title="صور مرتجع البونص"
                        images={form.bonusReturnImages}
                        onAdd={(e) => addImages(e, "bonusReturnImages")}
                        onRemove={(id) =>
                          removeImages("bonusReturnImages", id)
                        }
                        onPreview={handlePreviewImage}
                      />
                    ) : (
                      <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                        لا يوجد مرتجع بونص لهذا الإيفينت.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Permits */}
              <section>
                <h3 className="mb-4 border-b pb-3 text-lg font-bold text-slate-800">
                  أذونات الاستلام والمرتجع والمنوال
                </h3>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {[
                    ["receipt", "إذن استلام"],
                    ["return", "إذن مرتجع"],
                    ["model", "إذن منوال"],
                  ].map(([key, title]) => (
                    <div
                      key={key}
                      className="space-y-3 rounded-xl border border-gray-200 p-4"
                    >
                      <h4 className="font-bold text-slate-800">{title}</h4>

                      <label className="block text-sm font-semibold text-gray-700">
                        حالة الإذن
                        <select
                          value={form.permits[key].status}
                          onChange={(e) =>
                            updatePermit(key, "status", e.target.value)
                          }
                          className="mt-2 w-full rounded-lg border bg-white px-3 py-2 font-normal"
                        >
                          {PERMIT_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm font-semibold text-gray-700">
                        ملاحظات الإذن
                        <textarea
                          rows={2}
                          value={form.permits[key].notes}
                          onChange={(e) =>
                            updatePermit(key, "notes", e.target.value)
                          }
                          className="mt-2 w-full rounded-lg border px-3 py-2 font-normal"
                          placeholder="ملاحظات..."
                        />
                      </label>

                      <ImageUploader
                        title={`صور ${title}`}
                        images={form.permits[key].images}
                        onAdd={(e) => addImages(e, "images", key)}
                        onRemove={(id) => removeImages("images", id, key)}
                        onPreview={handlePreviewImage}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {imageError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {imageError}
                </p>
              )}

              {/* Form Actions */}
              <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-100"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-7 py-3 font-semibold text-white shadow hover:bg-orange-700"
                >
                  {editingId ? "حفظ التعديلات" : "إضافة الإيفينت"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Event Details Modal                                                */}
      {/* ------------------------------------------------------------------ */}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 py-6 sm:p-6">
          <div className="my-auto w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 bg-orange-600 p-5 text-white">
              <div>
                <h2 className="text-xl font-bold">{selectedEvent.name}</h2>
                <p className="mt-1 text-sm text-orange-100">
                  {selectedEvent.company}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg px-3 py-2 text-xl hover:bg-orange-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              {/* Event Information */}
              <section>
                <h3 className="mb-3 text-lg font-bold text-slate-800">
                  البيانات الأساسية
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["المنسق", selectedEvent.coordinator],
                    ["المندوب", selectedEvent.representative],
                    ["بنت / ولد", selectedEvent.gender],
                    [
                      "الاستثناءات",
                      selectedEvent.exceptions === "yes"
                        ? "يوجد"
                        : "لا يوجد",
                    ],
                    ["بداية الإيفينت", formatDate(selectedEvent.startDate)],
                    ["نهاية الإيفينت", formatDate(selectedEvent.endDate)],
                    [
                      "المدة",
                      getDuration(
                        selectedEvent.startDate,
                        selectedEvent.endDate,
                      ),
                    ],
                    ["عدد الفروع", selectedEvent.branches?.length || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-gray-500">{label}</p>
                      <p className="mt-2 font-bold text-slate-800">
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {selectedEvent.notes && (
                <section>
                  <h3 className="mb-2 font-bold">ملاحظات الإيفينت</h3>
                  <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                    {selectedEvent.notes}
                  </p>
                </section>
              )}

              {/* Branches Details */}
              <section>
                <h3 className="mb-3 text-lg font-bold">جدول الفروع</h3>

                {selectedEvent.branches?.length ? (
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-200 text-right text-sm">
                      <thead className="bg-orange-600 text-white">
                        <tr>
                          {[
                            "الفرع",
                            "استلام البونص",
                            "استلام الهدايا",
                            "مرتجع البونص",
                            "ملاحظات",
                          ].map((heading) => (
                            <th key={heading} className="p-3">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {selectedEvent.branches.map((branch) => (
                          <tr
                            key={branch.id}
                            className="border-t hover:bg-orange-50"
                          >
                            <td className="p-3 font-semibold">
                              {branch.name}
                            </td>
                            <td className="p-3">
                              <StatusBadge value={branch.bonus} />
                            </td>
                            <td className="p-3">
                              <StatusBadge value={branch.gifts} />
                            </td>
                            <td className="p-3">
                              <StatusBadge value={branch.bonusReturn} />
                            </td>
                            <td className="p-3">{branch.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-4 text-gray-500">
                    لا توجد فروع مسجلة لهذا الإيفينت.
                  </p>
                )}
              </section>

              {/* Event Images */}
              <section>
                <h3 className="mb-3 text-lg font-bold">
                  صور الاستلام والمرتجعات
                </h3>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ImageUploader
                    title="صور استلام البونص"
                    images={selectedEvent.bonusImages || []}
                    readOnly
                    onPreview={handlePreviewImage}
                  />

                  <ImageUploader
                    title="صور استلام الهدايا"
                    images={selectedEvent.giftImages || []}
                    readOnly
                    onPreview={handlePreviewImage}
                  />

                  <ImageUploader
                    title="صور مرتجع البونص"
                    images={selectedEvent.bonusReturnImages || []}
                    readOnly
                    hint={
                      selectedEvent.bonusReturnExists === "no"
                        ? "لا يوجد مرتجع لهذا الإيفينت."
                        : "صور المرتجع المسجلة."
                    }
                    onPreview={handlePreviewImage}
                  />
                </div>
              </section>

              {/* Permits Details */}
              <section>
                <h3 className="mb-3 text-lg font-bold">حالة الأذونات</h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    ["إذن استلام", selectedEvent.permits?.receipt],
                    ["إذن مرتجع", selectedEvent.permits?.return],
                    ["إذن منوال", selectedEvent.permits?.model],
                  ].map(([title, permit]) => (
                    <div key={title} className="rounded-xl border p-4">
                      <h4 className="font-bold">{title}</h4>

                      <p
                        className={`mt-2 text-sm font-semibold ${
                          permit?.status === "done"
                            ? "text-green-700"
                            : "text-amber-700"
                        }`}
                      >
                        {permitLabel(permit)}
                      </p>

                      {permit?.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                          {permit.notes}
                        </p>
                      )}

                      <div className="mt-3">
                        <ImageUploader
                          title={`صور ${title}`}
                          images={permit?.images || []}
                          readOnly
                          onPreview={handlePreviewImage}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Details Actions */}
              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={() => openEditForm(selectedEvent)}
                  className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
                >
                  تعديل الإيفينت
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Image Preview                                                       */}
      {/* ------------------------------------------------------------------ */}

      {previewImage && (
        <ImagePreviewModal
          image={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
}
