
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../components/header";
import { useAuth } from "../../context/authContext";
import { sendHttpReq } from "../../lib/httpHandler";
import { isAdmin, hasPermission } from "../../helpers/permissions";

const API_ENDPOINT = "security/dashboard/stats";
const SECURITY_VIEW_PERMISSION_ID = 41;

const numberFormat = new Intl.NumberFormat("ar-EG");
const currencyFormat = new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
});

const formatNumber = (value) =>
    numberFormat.format(Number(value) || 0);

const formatCurrency = (value) =>
    currencyFormat.format(Number(value) || 0);

const percentage = (value, total) => {
    if (!Number(total)) return 0;

    return Math.round(
        (Number(value || 0) / Number(total)) * 100
    );
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function SectionTitle({ title, subtitle, icon }) {
    return (
        <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-600">
                {icon}
            </div>

            <div>
                <h2 className="text-lg font-extrabold text-slate-800">
                    {title}
                </h2>

                {subtitle && (
                    <p className="mt-1 text-xs text-slate-400">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

function Panel({ children, className = "" }) {
    return (
        <section
            className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 ${className}`}
        >
            {children}
        </section>
    );
}

function StatCard({
    title,
    value,
    subtitle,
    icon,
    color = "orange",
}) {
    const themes = {
        orange: {
            icon: "bg-orange-50 text-orange-600",
            line: "bg-orange-500",
            glow: "group-hover:shadow-orange-100",
        },
        green: {
            icon: "bg-emerald-50 text-emerald-600",
            line: "bg-emerald-500",
            glow: "group-hover:shadow-emerald-100",
        },
        red: {
            icon: "bg-red-50 text-red-600",
            line: "bg-red-500",
            glow: "group-hover:shadow-red-100",
        },
        amber: {
            icon: "bg-amber-50 text-amber-600",
            line: "bg-amber-500",
            glow: "group-hover:shadow-amber-100",
        },
        blue: {
            icon: "bg-blue-50 text-blue-600",
            line: "bg-blue-500",
            glow: "group-hover:shadow-blue-100",
        },
        slate: {
            icon: "bg-slate-100 text-slate-600",
            line: "bg-slate-500",
            glow: "group-hover:shadow-slate-100",
        },
    };

    const theme = themes[color] || themes.orange;

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.glow}`}
        >
            <div
                className={`absolute right-0 top-0 h-full w-1 ${theme.line}`}
            />

            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-500">
                        {title}
                    </p>

                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-800">
                        {formatNumber(value)}
                    </p>

                    {subtitle && (
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${theme.icon}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function ProgressRow({
    label,
    value,
    total,
    color = "bg-orange-500",
}) {
    const progress = percentage(value, total);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-600">
                    {label}
                </span>

                <div className="text-left">
                    <span className="font-extrabold text-slate-800">
                        {formatNumber(value)}
                    </span>

                    <span className="mr-2 text-xs text-slate-400">
                        {progress}%
                    </span>
                </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${color}`}
                    style={{
                        width: `${Math.min(progress, 100)}%`,
                    }}
                />
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Donut Chart                                                                */
/* -------------------------------------------------------------------------- */

function DonutChart({ items, total }) {
    const segments = useMemo(() => {
        let current = 0;

        return items.map((item) => {
            const value = total
                ? (Number(item.value || 0) / total) * 100
                : 0;

            const start = current;
            current += value;

            return `${item.hex} ${start}% ${current}%`;
        });
    }, [items, total]);

    const background = segments.length
        ? `conic-gradient(${segments.join(", ")})`
        : "#e2e8f0";

    return (
        <div className="flex flex-col items-center gap-7 sm:flex-row">
            <div className="relative h-52 w-52 shrink-0">
                <div
                    className="h-full w-full rounded-full"
                    style={{
                        background,
                        maskImage:
                            "radial-gradient(circle, transparent 55%, black 56%)",
                        WebkitMaskImage:
                            "radial-gradient(circle, transparent 55%, black 56%)",
                    }}
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-semibold text-slate-400">
                        إجمالي الأشخاص
                    </span>

                    <span className="mt-1 text-3xl font-black text-slate-800">
                        {formatNumber(total)}
                    </span>
                </div>
            </div>

            <div className="w-full flex-1 space-y-4">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center justify-between gap-3"
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{
                                    backgroundColor: item.hex,
                                }}
                            />

                            <span className="truncate text-sm font-semibold text-slate-600">
                                {item.label}
                            </span>
                        </div>

                        <div className="shrink-0 text-left">
                            <p className="text-sm font-extrabold text-slate-800">
                                {formatNumber(item.value)}
                            </p>

                            <p className="text-xs text-slate-400">
                                {percentage(item.value, total)}%
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

function DashboardSecurity() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const canAccessDashboard =
        isAdmin(user) ||
        hasPermission(user, SECURITY_VIEW_PERMISSION_ID);

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await sendHttpReq(API_ENDPOINT);

            if (!response?.stats) {
                throw new Error("لم يتم استلام إحصائيات إدارة الأمن.");
            }

            setStats(response.stats);
        } catch (err) {
            console.error("Security dashboard loading error:", err);

            setError(
                err.message || "حدث خطأ أثناء تحميل بيانات إدارة الأمن."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (canAccessDashboard) {
            loadDashboard();
        } else {
            setLoading(false);
        }
    }, [canAccessDashboard, loadDashboard]);

    const persons = stats?.persons || {};
    const incidents = stats?.incidents || {};
    const permits = stats?.permits || {};
    const history = stats?.statusHistory || {};

    const totalPersons = Number(persons.total || 0);
    const totalIncidents = Number(incidents.total || 0);
    const totalPermits = Number(permits.total || 0);
    const totalHistory = Number(history.total || 0);

    const statusChart = useMemo(
        () => [
            {
                label: "سليم",
                value: Number(persons.safe || 0),
                color: "bg-emerald-500",
                hex: "#10b981",
            },
            {
                label: "تحت المراجعة",
                value: Number(persons.underReview || 0),
                color: "bg-amber-500",
                hex: "#f59e0b",
            },
            {
                label: "بلوك / مرفوض",
                value: Number(persons.blocked || 0),
                color: "bg-red-500",
                hex: "#ef4444",
            },
            {
                label: "غير محدد",
                value: Number(persons.unspecified || 0),
                color: "bg-slate-400",
                hex: "#94a3b8",
            },
        ],
        [
            persons.safe,
            persons.underReview,
            persons.blocked,
            persons.unspecified,
        ]
    );

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
                <div className="rounded-3xl bg-white p-8 text-center shadow-lg">
                    <p className="font-bold text-slate-700">
                        يجب تسجيل الدخول أولاً.
                    </p>

                    <button
                        onClick={() =>
                            navigate("/login", { replace: true })
                        }
                        className="mt-5 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white transition hover:bg-orange-700"
                    >
                        تسجيل الدخول
                    </button>
                </div>
            </div>
        );
    }

    if (!canAccessDashboard) {
        return (
            <div className="min-h-screen bg-slate-100">
                <div className="sticky top-0 z-50">
                    <Header user={user} />
                </div>

                <div className="flex min-h-[70vh] items-center justify-center p-5">
                    <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
                        <div className="text-5xl">🔒</div>

                        <h1 className="mt-4 text-xl font-extrabold text-slate-800">
                            غير مسموح بالدخول
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            ليس لديك صلاحية الوصول إلى لوحة تحكم الأمن.
                        </p>

                        <button
                            onClick={() => navigate("/security")}
                            className="mt-6 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700"
                        >
                            العودة
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" className="min-h-screen bg-[#f4f6fb]">
            <div className="sticky top-0 z-50">
                <Header user={user} />
            </div>

            <main className="mx-auto max-w-[1700px] space-y-7 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <section className="relative overflow-hidden rounded-3xl bg-linear-to-l from-[#7c2d12] via-[#c2410c] to-[#f97316] p-6 text-white shadow-xl sm:p-8">
                    <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-white/5" />

                    <div className="absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-amber-300/20 blur-2xl" />

                    <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                        <div>
                            <div className="mb-4 flex items-center gap-2 text-sm text-orange-100">
<button
    onClick={() => navigate("/security")}
    className="transition hover:text-white"
>
    نظام إدارة الأمن
</button>

                                <span className="opacity-50">/</span>

                                <span className="font-semibold text-amber-200">
                                    إدارة الأمن
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="hidden h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl shadow-inner sm:flex">
                                    🛡️
                                </div>

                                <div>
                                    <h1 className="text-2xl font-black sm:text-3xl lg:text-4xl">
                                        لوحة تحكم إدارة الأمن
                                    </h1>

                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-100 sm:text-base">
                                        متابعة الأشخاص والحالات الأمنية والبلاغات والتصاريح والتغييرات المسجلة.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-3">
                            <button
                                onClick={() => navigate("/security")}
                                className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                            >
                                العودة
                            </button>

                            <button
                                onClick={loadDashboard}
                                disabled={loading}
                                className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-orange-700 shadow-lg transition hover:bg-orange-50 disabled:opacity-60"
                            >
                                {loading
                                    ? "جاري التحديث..."
                                    : "↻ تحديث البيانات"}
                            </button>
                        </div>
                    </div>

                    <div className="relative z-10 mt-7 flex flex-wrap items-center gap-4 border-t border-white/10 pt-5 text-xs text-orange-100">
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            مؤشرات إدارة الأمن
                        </span>

                        <span className="opacity-50">|</span>

                        <span>مصدر البيانات: قاعدة بيانات الأمن</span>
                    </div>
                </section>

                {/* Loading */}
                {loading && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600" />

                        <p className="mt-5 font-semibold text-slate-500">
                            جاري تحميل إحصائيات إدارة الأمن...
                        </p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
                        <h2 className="font-extrabold text-red-700">
                            تعذر تحميل البيانات
                        </h2>

                        <p className="mt-2 text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            onClick={loadDashboard}
                            className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                )}

                {!loading && !error && stats && (
                    <>
                        {/* Main Statistics */}
                        <section>
                            <SectionTitle
                                title="المؤشرات الرئيسية"
                                subtitle="ملخص شامل لسجلات إدارة الأمن"
                                icon="📊"
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                    title="إجمالي الأشخاص"
                                    value={totalPersons}
                                    subtitle="الأشخاص غير المحذوفين"
                                    icon="👥"
                                    color="blue"
                                />

                                <StatCard
                                    title="إجمالي البلاغات"
                                    value={totalIncidents}
                                    subtitle="البلاغات المسجلة"
                                    icon="🚨"
                                    color="red"
                                />

                                <StatCard
                                    title="إجمالي التصاريح"
                                    value={totalPermits}
                                    subtitle="التصاريح المسجلة"
                                    icon="📄"
                                    color="green"
                                />

                                <StatCard
                                    title="تغييرات الحالات"
                                    value={totalHistory}
                                    subtitle="سجل تاريخ تغييرات الحالة الأمنية"
                                    icon="📝"
                                    color="amber"
                                />
                            </div>
                        </section>

                        {/* Security Status */}
                        <section>
                            <SectionTitle
                                title="توزيع الحالات الأمنية"
                                subtitle="حالة الأشخاص المسجلين في قاعدة بيانات الأمن"
                                icon="🛡️"
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                    title="سليم"
                                    value={persons.safe}
                                    subtitle="الأشخاص ذوو الحالة السليمة"
                                    icon="✅"
                                    color="green"
                                />

                                <StatCard
                                    title="تحت المراجعة"
                                    value={persons.underReview}
                                    subtitle="حالات تحتاج إلى مراجعة"
                                    icon="🔎"
                                    color="amber"
                                />

                                <StatCard
                                    title="بلوك / مرفوض"
                                    value={persons.blocked}
                                    subtitle="الحالات غير المسموح بها"
                                    icon="⛔"
                                    color="red"
                                />

                                <StatCard
                                    title="غير محدد"
                                    value={persons.unspecified}
                                    subtitle="لم يتم تحديد الحالة الأمنية"
                                    icon="❔"
                                    color="slate"
                                />
                            </div>
                        </section>

                        {/* Status Chart */}
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <Panel>
                                <SectionTitle
                                    title="الرسم البياني للحالات"
                                    subtitle="النسب المئوية لتوزيع الحالات الأمنية"
                                    icon="📊"
                                />

                                <DonutChart
                                    items={statusChart}
                                    total={totalPersons}
                                />
                            </Panel>

                            <Panel>
                                <SectionTitle
                                    title="تفاصيل الحالات الأمنية"
                                    subtitle="نسبة كل حالة من إجمالي الأشخاص"
                                    icon="📋"
                                />

                                <div className="space-y-6">
                                    {statusChart.map((item) => (
                                        <ProgressRow
                                            key={item.label}
                                            label={item.label}
                                            value={item.value}
                                            total={totalPersons}
                                            color={item.color}
                                        />
                                    ))}
                                </div>

                                <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">⚠️</span>

                                        <p className="text-sm font-extrabold text-amber-800">
                                            تنبيه بخصوص الحالات غير المحددة
                                        </p>
                                    </div>

                                    <p className="mt-2 text-xs leading-6 text-amber-700">
                                        الحالة غير المحددة لا تعني أن الشخص سليم أو لديه مخالفة؛ وإنما تعني أن حالته الأمنية لم يتم تحديدها.
                                    </p>
                                </div>
                            </Panel>
                        </div>

                        {/* Incidents */}
                        <section>
                            <SectionTitle
                                title="متابعة البلاغات والمسروقات"
                                subtitle="إحصائيات البلاغات وقيمة البضائع المسجلة"
                                icon="🚨"
                            />

                            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                                <Panel>
                                    <StatCard
                                        title="إجمالي البلاغات"
                                        value={totalIncidents}
                                        subtitle="عدد البلاغات المسجلة في النظام"
                                        icon="📁"
                                        color="red"
                                    />

                                    <div className="mt-5 rounded-2xl bg-red-50 p-5">
                                        <p className="text-sm font-semibold text-red-700">
                                            عدد الأشخاص المرتبطين ببلاغات
                                        </p>

                                        <p className="mt-2 text-3xl font-black text-red-800">
                                            {formatNumber(
                                                incidents.affectedPersons
                                            )}
                                        </p>
                                    </div>
                                </Panel>

                                <Panel>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
                                            💰
                                        </div>

                                        <div>
                                            <h3 className="text-base font-extrabold text-slate-800">
                                                قيمة البضائع المسروقة
                                            </h3>

                                            <p className="mt-1 text-xs text-slate-400">
                                                إجمالي القيمة المسجلة في البلاغات
                                            </p>
                                        </div>
                                    </div>

                                    <p className="mt-7 text-3xl font-black text-slate-800">
                                        {formatCurrency(
                                            incidents.stolenGoodsValue
                                        )}
                                    </p>

                                    <p className="mt-2 text-xs text-slate-400">
                                        قيمة إجمالية حسب البيانات المسجلة
                                    </p>
                                </Panel>
                            </div>
                        </section>

                        {/* Permits and History */}
                        <section>
                            <SectionTitle
                                title="التصاريح وسجل التغييرات"
                                subtitle="متابعة التصاريح والتعديلات على الحالات الأمنية"
                                icon="📑"
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <StatCard
                                    title="التصاريح المسجلة"
                                    value={totalPermits}
                                    subtitle="إجمالي تصاريح الأمن"
                                    icon="📄"
                                    color="green"
                                />

                                <StatCard
                                    title="تغييرات الحالات الأمنية"
                                    value={totalHistory}
                                    subtitle="إجمالي التغييرات المسجلة في السجل"
                                    icon="📝"
                                    color="blue"
                                />
                            </div>
                        </section>

                        {/* Footer */}
                        <footer className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-400 sm:flex-row sm:items-center">
                            <span className="font-bold text-slate-500">
                                لوحة تحكم إدارة الأمن
                            </span>

                            <span>
                                البيانات المعروضة وفق آخر استجابة من الخادم.
                            </span>
                        </footer>
                    </>
                )}
            </main>
        </div>
    );
}

export default DashboardSecurity;
