
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../../components/header";
import SearchableSelect from "../../../components/SearchableSelect";
import { useAuth } from "../../../context/authContext";
import { isAdmin, hasPermission } from "../../../helpers/permissions";
import { sendHttpReq } from "../../../lib/httpHandler";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "company_schedules_v1";
const PERMISSION_ID = 50;

const SUPPLIERS_ENDPOINT = "retail/suppliers/search";
const BRANCHES_ENDPOINT = "retail/branches";

const DAYS = [
    { id: "saturday", label: "السبت" },
    { id: "sunday", label: "الأحد" },
    { id: "monday", label: "الاثنين" },
    { id: "tuesday", label: "الثلاثاء" },
    { id: "wednesday", label: "الأربعاء" },
    { id: "thursday", label: "الخميس" },
    { id: "friday", label: "الجمعة" },
];

const PLACES = [
    { id: "juice", label: "عصير", icon: "🥤" },
    { id: "yogurt", label: "زبادي", icon: "🥛" },
    { id: "frozen", label: "مجمد", icon: "❄️" },
    { id: "grocery", label: "بقالة", icon: "🛒" },
    { id: "paper", label: "ورقيات", icon: "🧻" },
    { id: "detergents", label: "منظفات", icon: "🧴" },
];

const EMPTY_FORM = {
    name: "",
    startDate: "",
    branches: [],
    places: [],
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function createId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getCurrentDate() {
    const date = new Date();

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function parseLocalDate(value) {
    if (!value) return null;

    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day, 12, 0, 0);
}

function toDateString(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function addDays(dateString, days) {
    const date = parseLocalDate(dateString);

    if (!date) return "";

    date.setDate(date.getDate() + days);

    return toDateString(date);
}

function formatDate(value) {
    const date = parseLocalDate(value);

    if (!date) return "—";

    return new Intl.DateTimeFormat("ar-EG", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatShortDate(value) {
    const date = parseLocalDate(value);

    if (!date) return "—";

    return new Intl.DateTimeFormat("ar-EG", {
        day: "numeric",
        month: "short",
    }).format(date);
}

function getYearEnd(dateString) {
    if (!dateString) return "";

    return `${dateString.slice(0, 4)}-12-31`;
}

function getWeekCount(startDate) {
    if (!startDate) return 0;

    const start = parseLocalDate(startDate);
    const end = parseLocalDate(getYearEnd(startDate));

    if (!start || !end || start > end) return 0;

    return (
        Math.floor((end - start) / (7 * 24 * 60 * 60 * 1000)) + 1
    );
}

function getWeeklyOccurrences(startDate) {
    if (!startDate) return [];

    const yearEnd = getYearEnd(startDate);
    const occurrences = [];

    let currentDate = startDate;
    let index = 1;

    while (currentDate <= yearEnd) {
        const endDate = addDays(currentDate, 6);

        occurrences.push({
            id: `${startDate}_${index}`,
            number: index,
            startDate: currentDate,
            endDate: endDate > yearEnd ? yearEnd : endDate,
        });

        currentDate = addDays(currentDate, 7);
        index += 1;
    }

    return occurrences;
}

function getEmptyEntries() {
    const entries = {};

    PLACES.forEach((place) => {
        DAYS.forEach((day) => {
            entries[`${place.id}_${day.id}`] = [];
        });
    });

    return entries;
}

function createEmptyWeek() {
    return {
        id: createId(),
        name: "",
        startDate: "",
        branches: [],
        places: [],
        entries: getEmptyEntries(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

function normalizeWeek(week) {
    return {
        ...week,
        branches: Array.isArray(week.branches) ? week.branches : [],
        places: Array.isArray(week.places) ? week.places : [],
        entries: {
            ...getEmptyEntries(),
            ...(week.entries || {}),
        },
    };
}

function readSavedWeeks() {
    try {
        if (typeof window === "undefined") return [];

        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return [];

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed)
            ? parsed.map(normalizeWeek)
            : [];
    } catch (error) {
        console.error("Failed to read company schedules:", error);
        return [];
    }
}

function getRows(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.branches)) return result.branches;
    if (Array.isArray(result?.rows)) return result.rows;

    return [];
}

function getBranchOptions(rows) {
    return rows
        .map((branch) => ({
            value: String(
                branch.id ??
                branch.branch_id ??
                branch.value ??
                ""
            ),
            label: String(
                branch.a_name ??
                branch.branch_name ??
                branch.name ??
                branch.label ??
                ""
            ),
        }))
        .filter((item) => item.value && item.label);
}

function getEntryKey(placeId, dayId) {
    return `${placeId}_${dayId}`;
}

function getCompanyCount(week) {
    return Object.values(week?.entries || {}).reduce(
        (total, companies) => total + companies.length,
        0
    );
}

function getActivePlaces(week) {
    return (week?.places || []).length;
}

/* -------------------------------------------------------------------------- */
/* Reusable UI components                                                     */
/* -------------------------------------------------------------------------- */

function StatCard({ icon, label, value, description }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-gray-500">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-extrabold text-gray-900">
                        {value}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                        {description}
                    </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function EmptyCell() {
    return (
        <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/70">
            <span className="text-xs text-gray-400">
                لا توجد شركات
            </span>
        </div>
    );
}

function CompanyChip({ company, readOnly = false, onRemove }) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />

                <span className="truncate text-xs font-bold text-gray-800">
                    {company.name}
                </span>
            </div>

            {!readOnly && (
                <button
                    type="button"
                    onClick={onRemove}
                    title="حذف الشركة"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-100 hover:text-red-600"
                >
                    ×
                </button>
            )}
        </div>
    );
}

function Modal({
    title,
    subtitle,
    onClose,
    children,
    footer,
}) {
    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
            onClick={onClose}
        >
            <div
                className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
                    <div>
                        <h2 className="text-lg font-extrabold text-gray-900">
                            {title}
                        </h2>

                        {subtitle && (
                            <p className="mt-1 text-sm text-gray-500">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-xl text-gray-500 hover:bg-gray-200"
                    >
                        ×
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
                    {children}
                </div>

                {footer && (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

function BranchBadges({ branches }) {
    if (!branches?.length) {
        return (
            <span className="text-xs text-red-500">
                لم يتم تحديد فروع
            </span>
        );
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {branches.map((branch) => (
                <span
                    key={branch.value}
                    className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                >
                    {branch.label}
                </span>
            ))}
        </div>
    );
}

function PlaceBadges({ places }) {
    const selectedPlaces = PLACES.filter((place) =>
        (places || []).includes(place.id)
    );

    if (!selectedPlaces.length) {
        return (
            <span className="text-xs text-gray-400">
                لم يتم تحديد أماكن
            </span>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {selectedPlaces.map((place) => (
                <span
                    key={place.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700"
                >
                    <span>{place.icon}</span>
                    {place.label}
                </span>
            ))}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Weekly table                                                               */
/* -------------------------------------------------------------------------- */

function WeeklyTable({
    week,
    onCellClick,
    readOnly = false,
    occurrence = null,
}) {
    const yearEnd = getYearEnd(week.startDate);

    const selectedPlaces = PLACES.filter((place) =>
        (week.places || []).includes(place.id)
    );

    if (!selectedPlaces.length) {
        return (
            <div className="p-8 text-center text-sm text-gray-400">
                لم يتم تحديد أماكن لهذا الجدول.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-245 border-collapse text-right">
                <thead>
                    <tr>
                        <th className="sticky right-0 z-20 w-36 border-b border-l border-gray-200 bg-slate-900 px-4 py-4 text-sm font-extrabold text-white">
                            المكان
                        </th>

                        {DAYS.map((day, index) => {
                            const date = occurrence
                                ? addDays(occurrence.startDate, index)
                                : null;

                            const isOutsideYear =
                                occurrence && date > yearEnd;

                            return (
                                <th
                                    key={day.id}
                                    className="min-w-40 border-b border-l border-slate-700 bg-slate-900 px-3 py-4 text-center text-sm font-extrabold text-white last:border-l-0"
                                >
                                    <p>{day.label}</p>

                                    {occurrence && (
                                        <p className="mt-1 text-xs font-medium text-slate-300">
                                            {isOutsideYear
                                                ? "خارج السنة"
                                                : formatShortDate(date)}
                                        </p>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>

                <tbody>
                    {selectedPlaces.map((place, placeIndex) => (
                        <tr
                            key={place.id}
                            className={
                                placeIndex % 2 === 0
                                    ? "bg-white"
                                    : "bg-slate-50/60"
                            }
                        >
                            <td className="sticky right-0 z-10 border-b border-l border-gray-200 bg-white px-3 py-4 align-top">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-lg">
                                        {place.icon}
                                    </span>

                                    <span className="text-sm font-extrabold text-gray-800">
                                        {place.label}
                                    </span>
                                </div>
                            </td>

                            {DAYS.map((day, dayIndex) => {
                                const key = getEntryKey(place.id, day.id);
                                const companies = week.entries[key] || [];

                                const date = occurrence
                                    ? addDays(occurrence.startDate, dayIndex)
                                    : null;

                                const isOutsideYear =
                                    occurrence && date > yearEnd;

                                if (isOutsideYear) {
                                    return (
                                        <td
                                            key={day.id}
                                            className="border-b border-l border-gray-100 bg-gray-100/70 p-2 align-top last:border-l-0"
                                        >
                                            <div className="flex min-h-20 items-center justify-center text-xs text-gray-300">
                                                —
                                            </div>
                                        </td>
                                    );
                                }

                                return (
                                    <td
                                        key={day.id}
                                        className="border-b border-l border-gray-100 p-2 align-top last:border-l-0"
                                    >
                                        {readOnly ? (
                                            companies.length ? (
                                                <div className="flex flex-col gap-1.5">
                                                    {companies.map((company) => (
                                                        <CompanyChip
                                                            key={company.id}
                                                            company={company}
                                                            readOnly
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex min-h-20 items-center justify-center text-xs text-gray-300">
                                                    —
                                                </div>
                                            )
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onCellClick(place, day)
                                                }
                                                className="group flex min-h-25 w-full flex-col gap-2 rounded-xl p-1.5 text-right transition hover:bg-orange-50/70 focus:outline-none focus:ring-2 focus:ring-orange-300"
                                            >
                                                {companies.length ? (
                                                    <>
                                                        <div className="flex w-full flex-col gap-1.5">
                                                            {companies.map((company) => (
                                                                <CompanyChip
                                                                    key={company.id}
                                                                    company={company}
                                                                    readOnly
                                                                />
                                                            ))}
                                                        </div>

                                                        <span className="mt-auto self-center rounded-lg px-2 py-1 text-[11px] font-bold text-orange-600 opacity-0 transition group-hover:bg-orange-100 group-hover:opacity-100">
                                                            تعديل الشركات +
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <EmptyCell />

                                                        <span className="text-center text-[11px] font-bold text-orange-600 opacity-0 transition group-hover:opacity-100">
                                                            + إضافة شركة
                                                        </span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Main page                                                                  */
/* -------------------------------------------------------------------------- */

export default function CompanySchedules() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const canView =
        isAdmin(user) || hasPermission(user, PERMISSION_ID);

    const [weeks, setWeeks] = useState(() => readSavedWeeks());
    const [selectedWeekId, setSelectedWeekId] = useState("");

    const [branches, setBranches] = useState([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [branchesError, setBranchesError] = useState("");

    const [showWeekModal, setShowWeekModal] = useState(false);
    const [editingWeekId, setEditingWeekId] = useState(null);
    const [weekForm, setWeekForm] = useState(EMPTY_FORM);

    const [activeCell, setActiveCell] = useState(null);
    const [notice, setNotice] = useState("");
    const [noticeType, setNoticeType] = useState("success");

    const selectedWeek = useMemo(
        () => weeks.find((week) => week.id === selectedWeekId) || null,
        [weeks, selectedWeekId]
    );

    const yearlyOccurrences = useMemo(
        () =>
            selectedWeek
                ? getWeeklyOccurrences(selectedWeek.startDate)
                : [],
        [selectedWeek]
    );

    const statistics = useMemo(() => ({
        companies: selectedWeek ? getCompanyCount(selectedWeek) : 0,
        places: selectedWeek ? getActivePlaces(selectedWeek) : 0,
        branches: selectedWeek ? selectedWeek.branches.length : 0,
        occurrences: yearlyOccurrences.length,
    }), [selectedWeek, yearlyOccurrences]);

    /* ---------------------------------------------------------------------- */
    /* Authentication                                                         */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }

        if (!canView) {
            navigate("/");
        }
    }, [user, canView, navigate]);

    /* ---------------------------------------------------------------------- */
    /* Local storage                                                           */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks));
        } catch (error) {
            console.error("Failed to save company schedules:", error);
            setNotice("تعذر حفظ البيانات محليًا. قد تكون مساحة التخزين ممتلئة.");
            setNoticeType("error");
        }
    }, [weeks]);

    /* ---------------------------------------------------------------------- */
    /* Load branches                                                           */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        let cancelled = false;

        async function loadBranches() {
            try {
                setBranchesLoading(true);
                setBranchesError("");

                const result = await sendHttpReq(BRANCHES_ENDPOINT);

                if (cancelled) return;

                setBranches(getBranchOptions(getRows(result)));
            } catch (error) {
                if (cancelled) return;

                console.error("Failed to load branches:", error);
                setBranchesError(
                    "تعذر تحميل الفروع. راجع مسار جلب الفروع."
                );
            } finally {
                if (!cancelled) {
                    setBranchesLoading(false);
                }
            }
        }

        loadBranches();

        return () => {
            cancelled = true;
        };
    }, []);

    /* ---------------------------------------------------------------------- */
    /* Selected week                                                           */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        if (!weeks.length) {
            setSelectedWeekId("");
            return;
        }

        if (!weeks.some((week) => week.id === selectedWeekId)) {
            setSelectedWeekId(weeks[0].id);
        }
    }, [weeks, selectedWeekId]);

    /* ---------------------------------------------------------------------- */
    /* Notifications                                                           */
    /* ---------------------------------------------------------------------- */

    function showMessage(message, type = "success") {
        setNotice(message);
        setNoticeType(type);

        window.setTimeout(() => {
            setNotice("");
        }, 3500);
    }

    /* ---------------------------------------------------------------------- */
    /* Week CRUD                                                               */
    /* ---------------------------------------------------------------------- */

    function openCreateWeek() {
        setEditingWeekId(null);

        setWeekForm({
            ...EMPTY_FORM,
            startDate: getCurrentDate(),
        });

        setShowWeekModal(true);
    }

    function openEditWeek(week) {
        setEditingWeekId(week.id);

        setWeekForm({
            name: week.name,
            startDate: week.startDate,
            branches: [...week.branches],
            places: [...(week.places || [])],
        });

        setShowWeekModal(true);
    }

    function closeWeekModal() {
        setShowWeekModal(false);
        setEditingWeekId(null);
        setWeekForm(EMPTY_FORM);
    }

    function updateWeekForm(key, value) {
        setWeekForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    function toggleBranch(branch) {
        setWeekForm((previous) => {
            const exists = previous.branches.some(
                (item) => item.value === branch.value
            );

            return {
                ...previous,
                branches: exists
                    ? previous.branches.filter(
                        (item) => item.value !== branch.value
                    )
                    : [...previous.branches, branch],
            };
        });
    }

    function togglePlace(place) {
        setWeekForm((previous) => {
            const exists = previous.places.includes(place.id);

            return {
                ...previous,
                places: exists
                    ? previous.places.filter((id) => id !== place.id)
                    : [...previous.places, place.id],
            };
        });
    }

    function saveWeek(event) {
        event.preventDefault();

        if (!weekForm.name.trim()) {
            showMessage("يرجى كتابة اسم الجدول الأسبوعي", "error");
            return;
        }

        if (!weekForm.startDate) {
            showMessage("يرجى تحديد تاريخ بداية الأسبوع", "error");
            return;
        }

        const startDate = parseLocalDate(weekForm.startDate);

        if (!startDate || startDate.getDay() !== 6) {
            showMessage(
                "يجب أن يكون تاريخ بداية الجدول يوم السبت حتى يتكرر من السبت إلى الجمعة.",
                "error"
            );
            return;
        }

        if (!weekForm.places.length) {
            showMessage("يرجى اختيار مكان واحد على الأقل", "error");
            return;
        }

        if (!weekForm.branches.length) {
            showMessage("يرجى اختيار فرع واحد على الأقل", "error");
            return;
        }

        if (editingWeekId) {
            setWeeks((previous) =>
                previous.map((week) =>
                    week.id === editingWeekId
                        ? {
                            ...week,
                            name: weekForm.name.trim(),
                            startDate: weekForm.startDate,
                            branches: weekForm.branches,
                            places: weekForm.places,
                            updatedAt: new Date().toISOString(),
                        }
                        : week
                )
            );

            showMessage("تم تحديث بيانات الجدول الأسبوعي");
        } else {
            const newWeek = {
                ...createEmptyWeek(),
                name: weekForm.name.trim(),
                startDate: weekForm.startDate,
                branches: weekForm.branches,
                places: weekForm.places,
            };

            setWeeks((previous) => [newWeek, ...previous]);
            setSelectedWeekId(newWeek.id);

            showMessage("تم إنشاء الجدول الأسبوعي بنجاح");
        }

        closeWeekModal();
    }

    function deleteWeek(week) {
        const confirmed = window.confirm(
            `هل أنت متأكد من حذف جدول "${week.name}"؟ سيتم حذف جميع مواعيده المحلية.`
        );

        if (!confirmed) return;

        setWeeks((previous) =>
            previous.filter((item) => item.id !== week.id)
        );

        showMessage("تم حذف الجدول الأسبوعي");
    }

    /* ---------------------------------------------------------------------- */
    /* Company entries                                                         */
    /* ---------------------------------------------------------------------- */

    function openCell(place, day) {
        if (!selectedWeek) return;

        setActiveCell({
            place,
            day,
            key: getEntryKey(place.id, day.id),
        });
    }

    function addCompanyToCell(company) {
        if (!selectedWeek || !activeCell || !company) return;

        const normalizedCompany = {
            id: String(company.value),
            name: String(company.label),
        };

        const currentEntries =
            selectedWeek.entries[activeCell.key] || [];

        const alreadyExists = currentEntries.some(
            (item) => String(item.id) === normalizedCompany.id
        );

        if (alreadyExists) {
            showMessage(
                "الشركة موجودة بالفعل في هذا اليوم والمكان",
                "error"
            );
            return;
        }

        setWeeks((previous) =>
            previous.map((week) => {
                if (week.id !== selectedWeek.id) return week;

                return {
                    ...week,
                    entries: {
                        ...week.entries,
                        [activeCell.key]: [
                            ...(week.entries[activeCell.key] || []),
                            normalizedCompany,
                        ],
                    },
                    updatedAt: new Date().toISOString(),
                };
            })
        );

        showMessage(`تمت إضافة ${normalizedCompany.name}`);
    }

    function removeCompany(placeId, dayId, companyId) {
        if (!selectedWeek) return;

        const confirmed = window.confirm(
            "هل تريد حذف الشركة من هذا اليوم والمكان في جميع تكرارات الأسبوع؟"
        );

        if (!confirmed) return;

        const key = getEntryKey(placeId, dayId);

        setWeeks((previous) =>
            previous.map((week) => {
                if (week.id !== selectedWeek.id) return week;

                return {
                    ...week,
                    entries: {
                        ...week.entries,
                        [key]: (week.entries[key] || []).filter(
                            (company) =>
                                String(company.id) !== String(companyId)
                        ),
                    },
                    updatedAt: new Date().toISOString(),
                };
            })
        );

        showMessage("تم حذف الشركة من جميع تكرارات هذا الموعد");
    }

    /* ---------------------------------------------------------------------- */
    /* Permission                                                              */
    /* ---------------------------------------------------------------------- */

    if (!user || !canView) return null;

    /* ---------------------------------------------------------------------- */
    /* Render                                                                  */
    /* ---------------------------------------------------------------------- */

    return (
        <div dir="rtl" className="min-h-screen bg-slate-50">
            <Header />

            <main className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 lg:px-8 lg:py-7">

                {/* Page heading */}
                <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                            <span>نظام التسويق</span>
                            <span>/</span>
                            <span className="font-semibold text-orange-600">
                                مواعيد الشركات
                            </span>
                        </div>

                        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                            مواعيد الشركات
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                            تنظيم أيام نزول الشركات حسب الأماكن والفروع،
                            مع تكرار الجدول أسبوعيًا حتى نهاية السنة.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => navigate("/marketing")}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                        >
                            العودة لنظام التسويق
                        </button>

                        <button
                            type="button"
                            onClick={openCreateWeek}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
                        >
                            <span className="text-lg">+</span>
                            إنشاء جدول أسبوعي
                        </button>
                    </div>
                </div>

                {/* Local storage notice */}
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg">
                        💾
                    </div>

                    <div>
                        <p className="text-sm font-extrabold text-blue-900">
                            الحفظ التلقائي مفعل
                        </p>

                        <p className="mt-1 text-xs leading-6 text-blue-800">
                            كل التعديلات يتم حفظها تلقائيًا على هذا المتصفح.
                            البيانات محلية ولن تظهر على أجهزة أخرى قبل ربط السيرفر وقاعدة البيانات.
                        </p>
                    </div>
                </div>

                {/* Statistics */}
                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                        icon="📅"
                        label="الجداول الأسبوعية"
                        value={weeks.length}
                        description="إجمالي الجداول المحفوظة"
                    />

                    <StatCard
                        icon="🏢"
                        label="الشركات في الجدول"
                        value={statistics.companies}
                        description="إجمالي الشركات في الخانات"
                    />

                    <StatCard
                        icon="📍"
                        label="الأماكن المختارة"
                        value={statistics.places}
                        description="الأماكن في الجدول الحالي"
                    />

                    <StatCard
                        icon="🔁"
                        label="تكرارات السنة"
                        value={statistics.occurrences}
                        description="عدد الأسابيع حتى نهاية السنة"
                    />
                </div>

                {/* Week selector */}
                <section className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
                                🗓️
                            </div>

                            <div>
                                <h2 className="font-extrabold text-gray-900">
                                    الجداول الأسبوعية
                                </h2>

                                <p className="mt-1 text-xs text-gray-500">
                                    اختر الجدول الذي تريد عرضه أو تعديله
                                </p>
                            </div>
                        </div>

                        {weeks.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={selectedWeekId}
                                    onChange={(event) =>
                                        setSelectedWeekId(event.target.value)
                                    }
                                    className="min-w-48 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-orange-500"
                                >
                                    {weeks.map((week) => (
                                        <option
                                            key={week.id}
                                            value={week.id}
                                        >
                                            {week.name}
                                        </option>
                                    ))}
                                </select>

                                {selectedWeek && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => openEditWeek(selectedWeek)}
                                            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                                        >
                                            تعديل الجدول
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => deleteWeek(selectedWeek)}
                                            className="rounded-xl border border-red-100 px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                                        >
                                            حذف الجدول
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedWeek && (
                        <div className="flex flex-col gap-4 border-t border-gray-100 bg-gray-50/70 px-4 py-4 sm:px-5">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                                <div>
                                    <span className="text-gray-400">
                                        بداية التكرار:{" "}
                                    </span>

                                    <strong className="text-gray-800">
                                        {formatDate(selectedWeek.startDate)}
                                    </strong>
                                </div>

                                <div>
                                    <span className="text-gray-400">
                                        نهاية التكرار:{" "}
                                    </span>

                                    <strong className="text-gray-800">
                                        {formatDate(getYearEnd(selectedWeek.startDate))}
                                    </strong>
                                </div>

                                <div>
                                    <span className="text-gray-400">
                                        عدد الأسابيع:{" "}
                                    </span>

                                    <strong className="text-orange-700">
                                        {yearlyOccurrences.length}
                                    </strong>
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-bold text-gray-500">
                                    الأماكن المختارة
                                </p>

                                <PlaceBadges places={selectedWeek.places} />
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-bold text-gray-500">
                                    الفروع التي ينطبق عليها هذا الجدول
                                </p>

                                <BranchBadges branches={selectedWeek.branches} />
                            </div>
                        </div>
                    )}
                </section>

                {/* Weekly schedule */}
                {!selectedWeek ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
                            🗓️
                        </div>

                        <h3 className="text-lg font-extrabold text-gray-800">
                            لم يتم إنشاء أي جدول أسبوعي بعد
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                            ابدأ بإنشاء جدول جديد، وحدد الأماكن والفروع وتاريخ بدايته،
                            ثم أضف الشركات داخل الأيام والأماكن المناسبة.
                        </p>

                        <button
                            type="button"
                            onClick={openCreateWeek}
                            className="mt-5 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
                        >
                            إنشاء أول جدول
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-lg font-extrabold text-gray-900">
                                    {selectedWeek.name}
                                </h2>

                                <p className="mt-1 text-xs text-gray-500">
                                    اضغط على أي خانة لإضافة الشركات أو تعديلها.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-semibold text-green-700">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                التعديلات تحفظ تلقائيًا
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <WeeklyTable
                                week={selectedWeek}
                                onCellClick={openCell}
                            />

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs text-gray-500">
                                    الأماكن المختارة: {statistics.places} · أيام الأسبوع: {DAYS.length}
                                </p>

                                <p className="text-xs font-semibold text-gray-500">
                                    التعديلات تطبق على جميع تكرارات هذا الجدول
                                </p>
                            </div>
                        </div>

                        {/* Yearly schedule */}
                        <section className="mt-9">
                            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">
                                            📆
                                        </div>

                                        <div>
                                            <h2 className="text-xl font-black text-slate-900">
                                                جدول السنة
                                            </h2>

                                            <p className="mt-1 text-sm text-gray-500">
                                                معاينة جميع تكرارات الجدول المختار حتى نهاية السنة.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">
                                        {yearlyOccurrences.length} أسبوع
                                    </span>

                                    <span className="rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700">
                                        تكرار أسبوعي
                                    </span>
                                </div>
                            </div>

                            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-3">
                                <p className="text-xs leading-6 text-blue-800">
                                    <strong>ملاحظة:</strong> كل أسبوع يعرض
                                    نفس الأماكن والشركات الموجودة في الجدول الأساسي،
                                    مع تغيير التواريخ فقط. أي تعديل على الجدول الأساسي
                                    سيظهر تلقائيًا في جميع أسابيع السنة.
                                </p>
                            </div>

                            <div className="space-y-5">
                                {yearlyOccurrences.map((occurrence) => (
                                    <div
                                        key={occurrence.id}
                                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-slate-900 px-4 py-4 text-white sm:px-5">
                                            <div>
                                                <h3 className="font-extrabold">
                                                    الأسبوع {occurrence.number}
                                                </h3>

                                                <p className="mt-1 text-xs text-slate-300">
                                                    {formatDate(occurrence.startDate)}
                                                    {" — "}
                                                    {formatDate(occurrence.endDate)}
                                                </p>
                                            </div>

                                            <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">
                                                {occurrence.number} من {yearlyOccurrences.length}
                                            </span>
                                        </div>

                                        <WeeklyTable
                                            week={selectedWeek}
                                            occurrence={occurrence}
                                            readOnly
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Branches and places summary */}
                        <div className="mt-7 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <span className="text-xl">📋</span>

                                <h3 className="font-extrabold text-gray-900">
                                    ملخص الجدول
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="mb-2 text-xs font-bold text-gray-500">
                                        الأماكن
                                    </p>

                                    <PlaceBadges places={selectedWeek.places} />
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-bold text-gray-500">
                                        الفروع
                                    </p>

                                    <BranchBadges branches={selectedWeek.branches} />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Clear local data */}
                {weeks.length > 0 && (
                    <div className="mt-8 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                const confirmed = window.confirm(
                                    "هل تريد حذف جميع الجداول المحفوظة على هذا المتصفح؟"
                                );

                                if (!confirmed) return;

                                setWeeks([]);
                                setSelectedWeekId("");
                                showMessage("تم حذف جميع الجداول المحلية");
                            }}
                            className="text-xs font-semibold text-gray-400 transition hover:text-red-600"
                        >
                            حذف جميع البيانات المحلية
                        </button>
                    </div>
                )}
            </main>

            {/* Create / Edit week modal */}
            {showWeekModal && (
                <Modal
                    title={
                        editingWeekId
                            ? "تعديل الجدول الأسبوعي"
                            : "إنشاء جدول أسبوعي جديد"
                    }
                    subtitle="حدد اسم الجدول وتاريخ بداية التكرار والأماكن والفروع."
                    onClose={closeWeekModal}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeWeekModal}
                                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
                            >
                                إلغاء
                            </button>

                            <button
                                type="submit"
                                form="company-week-form"
                                className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
                            >
                                {editingWeekId
                                    ? "حفظ التعديلات"
                                    : "إنشاء الجدول"}
                            </button>
                        </>
                    }
                >
                    <form
                        id="company-week-form"
                        onSubmit={saveWeek}
                        className="space-y-6"
                    >
                        {/* Week name */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">
                                اسم الجدول
                            </label>

                            <input
                                type="text"
                                value={weekForm.name}
                                onChange={(event) =>
                                    updateWeekForm("name", event.target.value)
                                }
                                placeholder="مثال: جدول الأسبوع العادي"
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:bg-white"
                                required
                            />
                        </div>

                        {/* Start date */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">
                                تاريخ بداية الأسبوع
                            </label>

                            <input
                                type="date"
                                value={weekForm.startDate}
                                onChange={(event) =>
                                    updateWeekForm("startDate", event.target.value)
                                }
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:bg-white"
                                required
                            />

                            {weekForm.startDate && (
                                <div className="mt-3 rounded-xl border border-green-100 bg-green-50 p-3">
                                    <p className="text-xs font-bold text-green-800">
                                        إعدادات التكرار
                                    </p>

                                    <p className="mt-1 text-xs leading-6 text-green-700">
                                        سيبدأ التكرار من{" "}
                                        {formatDate(weekForm.startDate)}
                                        {" "}وحتى{" "}
                                        {formatDate(getYearEnd(weekForm.startDate))}.
                                        {" "}عدد التكرارات الأسبوعية المتوقع:{" "}
                                        <strong>
                                            {getWeekCount(weekForm.startDate)}
                                        </strong>.
                                    </p>

                                    {parseLocalDate(weekForm.startDate)?.getDay() !== 6 && (
                                        <p className="mt-2 text-xs font-bold text-red-600">
                                            يجب اختيار يوم السبت كبداية للأسبوع.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Places selection */}
                        <div>
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <label className="text-sm font-bold text-gray-700">
                                    الأماكن المطلوبة في الجدول
                                </label>

                                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                                    {weekForm.places.length} مكان محدد
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {PLACES.map((place) => {
                                    const checked = weekForm.places.includes(
                                        place.id
                                    );

                                    return (
                                        <button
                                            key={place.id}
                                            type="button"
                                            onClick={() => togglePlace(place)}
                                            className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${
                                                checked
                                                    ? "border-orange-400 bg-orange-50 ring-1 ring-orange-200"
                                                    : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                                            }`}
                                        >
                                            <span className="text-2xl">
                                                {place.icon}
                                            </span>

                                            <span className="flex-1 text-sm font-bold text-gray-800">
                                                {place.label}
                                            </span>

                                            <span
                                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                                                    checked
                                                        ? "border-orange-600 bg-orange-600 text-white"
                                                        : "border-gray-300 bg-white"
                                                }`}
                                            >
                                                {checked ? "✓" : ""}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="mt-2 text-xs leading-6 text-gray-400">
                                اختر الأماكن التي تريد ظهورها في هذا الجدول فقط.
                                يمكنك اختيار مكان واحد أو أكثر.
                            </p>

                            {weekForm.places.length > 0 && (
                                <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                                    <p className="mb-2 text-xs font-bold text-orange-800">
                                        الأماكن التي سيتم عرضها
                                    </p>

                                    <PlaceBadges places={weekForm.places} />
                                </div>
                            )}
                        </div>

                        {/* Branches selection */}
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <label className="text-sm font-bold text-gray-700">
                                    الفروع التي سيطبق عليها الجدول
                                </label>

                                <span className="text-xs font-bold text-orange-600">
                                    {weekForm.branches.length} فرع محدد
                                </span>
                            </div>

                            {branchesLoading ? (
                                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                                    جاري تحميل الفروع...
                                </div>
                            ) : branchesError ? (
                                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                                    {branchesError}
                                </div>
                            ) : branches.length === 0 ? (
                                <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-700">
                                    لم يتم العثور على فروع. تأكد من مسار جلب الفروع.
                                </div>
                            ) : (
                                <>
                                    <SearchableSelect
                                        options={branches}
                                        value=""
                                        onChange={(value, option) => {
                                            if (option) toggleBranch(option);
                                        }}
                                        placeholder="ابحث عن الفرع لإضافته..."
                                        isClearable
                                    />

                                    <p className="mt-2 text-xs text-gray-400">
                                        اكتب اسم الفرع واختره، ويمكنك إضافة أكثر من فرع.
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {weekForm.branches.map((branch) => (
                                            <button
                                                key={branch.value}
                                                type="button"
                                                onClick={() => toggleBranch(branch)}
                                                className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                                title="اضغط لإزالة الفرع"
                                            >
                                                {branch.label}
                                                <span className="text-sm">×</span>
                                            </button>
                                        ))}

                                        {!weekForm.branches.length && (
                                            <p className="text-xs text-gray-400">
                                                لم يتم اختيار أي فروع بعد.
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </form>
                </Modal>
            )}

            {/* Add / Remove companies modal */}
            {activeCell && selectedWeek && (
                <Modal
                    title={`${activeCell.place.label} - يوم ${activeCell.day.label}`}
                    subtitle={`إدارة الشركات في هذا المكان يوم ${activeCell.day.label}. التعديلات ستطبق على جميع تكرارات جدول "${selectedWeek.name}".`}
                    onClose={() => setActiveCell(null)}
                    footer={
                        <button
                            type="button"
                            onClick={() => setActiveCell(null)}
                            className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
                        >
                            تم
                        </button>
                    }
                >
                    <div className="space-y-5">
                        <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                            <p className="text-xs leading-6 text-orange-800">
                                أنت تعدل الآن قائمة الشركات الخاصة بـ{" "}
                                <strong>{activeCell.place.label}</strong>
                                {" "}يوم{" "}
                                <strong>{activeCell.day.label}</strong>.
                                أي إضافة أو حذف هنا سينعكس على جميع أسابيع التكرار.
                            </p>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">
                                إضافة شركة
                            </label>

                            <SearchableSelect
                                endpoint={SUPPLIERS_ENDPOINT}
                                value=""
                                onChange={(value, option) => {
                                    if (option) addCompanyToCell(option);
                                }}
                                placeholder="اكتب أول حرفين من اسم الشركة..."
                                isClearable
                            />

                            <p className="mt-2 text-xs text-gray-400">
                                اكتب أول حرفين على الأقل، ثم اختر الشركة لإضافتها.
                            </p>
                        </div>

                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-extrabold text-gray-800">
                                    الشركات المسجلة
                                </h3>

                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                    {(selectedWeek.entries[activeCell.key] || []).length} شركة
                                </span>
                            </div>

                            {(selectedWeek.entries[activeCell.key] || []).length ? (
                                <div className="space-y-2">
                                    {(selectedWeek.entries[activeCell.key] || []).map(
                                        (company, index) => (
                                            <div
                                                key={company.id}
                                                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-xs font-extrabold text-orange-700">
                                                        {index + 1}
                                                    </span>

                                                    <span className="truncate text-sm font-bold text-gray-800">
                                                        {company.name}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeCompany(
                                                            activeCell.place.id,
                                                            activeCell.day.id,
                                                            company.id
                                                        )
                                                    }
                                                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50"
                                                >
                                                    حذف
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                                    <p className="text-sm font-bold text-gray-500">
                                        لا توجد شركات مسجلة في هذا اليوم
                                    </p>

                                    <p className="mt-1 text-xs text-gray-400">
                                        استخدم البحث بالأعلى لإضافة أول شركة.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Toast */}
            {notice && (
                <div
                    role="status"
                    className={`fixed bottom-5 left-5 z-200 max-w-sm rounded-xl px-5 py-3 text-sm font-bold text-white shadow-2xl ${
                        noticeType === "error"
                            ? "bg-red-600"
                            : "bg-slate-900"
                    }`}
                >
                    {notice}
                </div>
            )}
        </div>
    );
}
