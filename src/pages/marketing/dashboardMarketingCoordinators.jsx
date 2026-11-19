
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../components/header";
import { useAuth } from "../../context/authContext";
import { sendHttpReq } from "../../lib/httpHandler";
import { isAdmin, hasPermission } from "../../helpers/permissions";

const API_ENDPOINT = "dashboard-marketing-coordinators/stats";
const MARKETING_PERMISSION_ID = 7;

const numberFormat = new Intl.NumberFormat("ar-EG");

const formatNumber = (value) => numberFormat.format(Number(value) || 0);

const percentage = (value, total) => {
    if (!Number(total)) return 0;
    return Math.round((Number(value || 0) / Number(total)) * 100);
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

function StatCard({
    title,
    value,
    subtitle,
    icon,
    color = "blue",
}) {
    const themes = {
        blue: {
            icon: "bg-orange-50 text-orange-700",
            line: "bg-orange-600",
            glow: "group-hover:shadow-orange-100",
        },
        green: {
            icon: "bg-emerald-50 text-emerald-600",
            line: "bg-emerald-500",
            glow: "group-hover:shadow-emerald-100",
        },
        orange: {
            icon: "bg-orange-50 text-orange-600",
            line: "bg-orange-500",
            glow: "group-hover:shadow-orange-100",
        },
        red: {
            icon: "bg-red-50 text-red-600",
            line: "bg-red-500",
            glow: "group-hover:shadow-red-100",
        },
        purple: {
            icon: "bg-amber-50 text-amber-700",
            line: "bg-amber-500",
            glow: "group-hover:shadow-amber-100",
        },
        slate: {
            icon: "bg-orange-50 text-orange-800",
            line: "bg-orange-800",
            glow: "group-hover:shadow-orange-100",
        },
    };

    const theme = themes[color] || themes.blue;

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.glow}`}
        >
            <div className={`absolute right-0 top-0 h-full w-1 ${theme.line}`} />

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

function Panel({ children, className = "" }) {
    return (
        <section
            className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 ${className}`}
        >
            {children}
        </section>
    );
}

function ProgressRow({ label, value, total, color = "bg-orange-500" }) {
    const progress = percentage(value, total);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-600">{label}</span>

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
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Charts                                                                     */
/* -------------------------------------------------------------------------- */

function VerticalBarChart({ items }) {
    const maxValue = Math.max(
        ...items.map((item) => Number(item.value) || 0),
        1
    );

    return (
        <div className="flex h-64 items-end justify-around gap-3 border-b border-slate-100 px-2 pb-3 pt-6">
            {items.map((item) => {
                const value = Number(item.value) || 0;
                const height = Math.max(
                    (value / maxValue) * 100,
                    value ? 5 : 0
                );

                return (
                    <div
                        key={item.label}
                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3"
                    >
                        <span className="text-sm font-extrabold text-slate-700">
                            {formatNumber(value)}
                        </span>

                        <div className="flex h-full w-full items-end justify-center">
                            <div
                                className={`w-full max-w-14 rounded-t-xl transition-all duration-700 ${item.color}`}
                                style={{ height: `${height}%` }}
                                title={`${item.label}: ${formatNumber(value)}`}
                            />
                        </div>

                        <span className="text-center text-xs font-semibold text-slate-500">
                            {item.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

function DashboardMarketingCoordinators() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const canAccessDashboard =
        isAdmin(user) || hasPermission(user, MARKETING_PERMISSION_ID);

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await sendHttpReq(API_ENDPOINT);

            if (!response?.stats) {
                throw new Error("لم يتم استلام بيانات الإحصائيات.");
            }

            setStats(response.stats);
        } catch (err) {
            console.error("Marketing dashboard loading error:", err);
            setError(err.message || "حدث خطأ أثناء تحميل البيانات.");
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

    const coordinatorData = stats?.coordinators || {};
    const temporaryData = stats?.temporaryCoordinators || {};
    const companiesData = stats?.advertisingCompanies || {};

    const totalPermanent = Number(coordinatorData.total || 0);
    const totalTemporary = Number(temporaryData.total || 0);

    const totalRepresentatives =
        Number(coordinatorData.maleRepresentatives || 0) +
        Number(coordinatorData.femaleRepresentatives || 0);

    const totalCoordinators =
        Number(coordinatorData.maleCoordinators || 0) +
        Number(coordinatorData.femaleCoordinators || 0);

    const genderChart = useMemo(
        () => [
            {
                label: "مندوبون",
                value: totalRepresentatives,
                color: "bg-orange-500",
            },
            {
                label: "منسقون",
                value: totalCoordinators,
                color: "bg-amber-500",
            },
            {
                label: "ذكور",
                value:
                    Number(coordinatorData.maleRepresentatives || 0) +
                    Number(coordinatorData.maleCoordinators || 0),
                color: "bg-orange-700",
            },
            {
                label: "إناث",
                value:
                    Number(coordinatorData.femaleRepresentatives || 0) +
                    Number(coordinatorData.femaleCoordinators || 0),
                color: "bg-yellow-500",
            },
        ],
        [
            totalRepresentatives,
            totalCoordinators,
            coordinatorData.maleRepresentatives,
            coordinatorData.maleCoordinators,
            coordinatorData.femaleRepresentatives,
            coordinatorData.femaleCoordinators,
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
                        onClick={() => navigate("/login", { replace: true })}
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
                            ليس لديك صلاحية الوصول إلى لوحة التحكم.
                        </p>

                        <button
                            onClick={() => navigate("/marketing")}
                            className="mt-6 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700"
                        >
                            العودة لإدارة التسويق
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
                {/* Page Header */}
                <section className="relative overflow-hidden rounded-3xl bg-linear-to-l from-[#7c2d12] via-[#c2410c] to-[#f97316] p-6 text-white shadow-xl sm:p-8">
                    <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-white/5" />
                    <div className="absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-amber-300/20 blur-2xl" />

                    <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                        <div>
                            <div className="mb-4 flex items-center gap-2 text-sm text-orange-100">
                                <button
                                    onClick={() => navigate("/marketing")}
                                    className="transition hover:text-white"
                                >
                                    إدارة التسويق
                                </button>

                                <span className="opacity-50">/</span>

                                <span className="font-semibold text-amber-200">
                                    لوحة التحكم
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="hidden h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl shadow-inner sm:flex">
                                    📊
                                </div>

                                <div>
                                    <h1 className="text-2xl font-black sm:text-3xl lg:text-4xl">
                                        لوحة تحكم إدارة التسويق
                                    </h1>

                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-100 sm:text-base">
                                        نظرة شاملة على أعداد المندوبين والمنسقين والشركات الإعلانية والشهادات الصحية والتعاقدات.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-3">
                            <button
                                onClick={() => navigate("/marketing")}
                                className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                            >
                                العودة
                            </button>

                            <button
                                onClick={loadDashboard}
                                disabled={loading}
                                className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-orange-700 shadow-lg shadow-orange-950/20 transition hover:bg-orange-50 disabled:opacity-60"
                            >
                                {loading ? "جاري التحديث..." : "↻ تحديث البيانات"}
                            </button>
                        </div>
                    </div>

                    <div className="relative z-10 mt-7 flex flex-wrap items-center gap-4 border-t border-white/10 pt-5 text-xs text-orange-100">
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            لوحة مؤشرات إدارة التسويق
                        </span>

                        <span className="opacity-50">|</span>

                        <span>مصدر البيانات: قاعدة البيانات الرئيسية</span>
                    </div>
                </section>

                {/* Loading */}
                {loading && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600" />

                        <p className="mt-5 font-semibold text-slate-500">
                            جاري تحميل مؤشرات لوحة التحكم...
                        </p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
                        <h2 className="font-extrabold text-red-700">
                            تعذر تحميل البيانات
                        </h2>

                        <p className="mt-2 text-sm text-red-600">{error}</p>

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
                        {/* Main KPIs */}
                        <section>
                            <SectionTitle
                                title="المؤشرات الرئيسية"
                                subtitle="ملخص سريع لحجم البيانات في إدارة التسويق"
                                icon="📈"
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                <StatCard
                                    title="إجمالي المندوبين والمنسقين"
                                    value={totalPermanent}
                                    subtitle="السجلات الأساسية"
                                    icon="👥"
                                    color="blue"
                                />

                                <StatCard
                                    title="المنسقون المؤقتون"
                                    value={totalTemporary}
                                    subtitle="السجلات غير المحذوفة"
                                    icon="🗓️"
                                    color="purple"
                                />

                                <StatCard
                                    title="الشركات الإعلانية"
                                    value={companiesData.total}
                                    subtitle="الشركات الفعالة"
                                    icon="🏢"
                                    color="orange"
                                />
                            </div>
                        </section>

                        {/* Permanent Coordinators */}
                        <section>
                            <SectionTitle
                                title="المندوبون والمنسقون الأساسيون"
                                subtitle="توزيع الأعداد وحالات التفعيل"
                                icon="🧑‍💼"
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                    title="إجمالي المندوبين"
                                    value={totalRepresentatives}
                                    subtitle={`${formatNumber(coordinatorData.maleRepresentatives)} ذكور · ${formatNumber(coordinatorData.femaleRepresentatives)} إناث`}
                                    icon="🧑‍💼"
                                    color="blue"
                                />

                                <StatCard
                                    title="إجمالي المنسقين"
                                    value={totalCoordinators}
                                    subtitle={`${formatNumber(coordinatorData.maleCoordinators)} ذكور · ${formatNumber(coordinatorData.femaleCoordinators)} إناث`}
                                    icon="👨‍💻"
                                    color="purple"
                                />

                                <StatCard
                                    title="غير المفعلين"
                                    value={coordinatorData.inactiveCount}
                                    subtitle="حسب حالة التفعيل"
                                    icon="⛔"
                                    color="red"
                                />

                                <StatCard
                                    title="الشهادات الصحية المنتهية"
                                    value={coordinatorData.expiredHealthCertificates}
                                    subtitle="حسب تاريخ انتهاء الشهادة"
                                    icon="📄"
                                    color="orange"
                                />
                            </div>
                        </section>

                        {/* Gender Chart + Health */}
                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <Panel>
                                <SectionTitle
                                    title="توزيع المندوبين والمنسقين"
                                    subtitle="مقارنة الأعداد حسب الفئة والنوع"
                                    icon="📊"
                                />

                                <VerticalBarChart items={genderChart} />

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-orange-50 p-4">
                                        <p className="text-xs font-semibold text-orange-600">
                                            إجمالي المندوبين
                                        </p>
                                        <p className="mt-2 text-2xl font-black text-orange-800">
                                            {formatNumber(totalRepresentatives)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-amber-50 p-4">
                                        <p className="text-xs font-semibold text-amber-600">
                                            إجمالي المنسقين
                                        </p>
                                        <p className="mt-2 text-2xl font-black text-amber-800">
                                            {formatNumber(totalCoordinators)}
                                        </p>
                                    </div>
                                </div>
                            </Panel>

                            <Panel>
                                <SectionTitle
                                    title="حالة الشهادات الصحية"
                                    subtitle="متابعة صلاحية الشهادات المسجلة"
                                    icon="📋"
                                />

                                <div className="mb-6 grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                                        <p className="text-xs font-semibold text-emerald-700">
                                            سارية
                                        </p>
                                        <p className="mt-2 text-xl font-black text-emerald-800">
                                            {formatNumber(coordinatorData.validHealthCertificates)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-red-50 p-3 text-center">
                                        <p className="text-xs font-semibold text-red-700">
                                            منتهية
                                        </p>
                                        <p className="mt-2 text-xl font-black text-red-800">
                                            {formatNumber(coordinatorData.expiredHealthCertificates)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-100 p-3 text-center">
                                        <p className="text-xs font-semibold text-slate-600">
                                            غير مسجلة
                                        </p>
                                        <p className="mt-2 text-xl font-black text-slate-800">
                                            {formatNumber(coordinatorData.missingHealthCertificates)}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <ProgressRow
                                        label="شهادات سارية"
                                        value={coordinatorData.validHealthCertificates}
                                        total={totalPermanent}
                                        color="bg-emerald-500"
                                    />

                                    <ProgressRow
                                        label="شهادات منتهية"
                                        value={coordinatorData.expiredHealthCertificates}
                                        total={totalPermanent}
                                        color="bg-red-500"
                                    />

                                    <ProgressRow
                                        label="تواريخ غير مسجلة"
                                        value={coordinatorData.missingHealthCertificates}
                                        total={totalPermanent}
                                        color="bg-slate-400"
                                    />
                                </div>
                            </Panel>
                        </div>

                        {/* Temporary Coordinators */}
                        <Panel>
                            <SectionTitle
                                title="متابعة المنسقين المؤقتين"
                                subtitle="تحليل حالة التعاقدات والفترات الزمنية"
                                icon="📅"
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                    title="داخل فترة التعاقد"
                                    value={temporaryData.withinContractPeriod}
                                    subtitle="تعاقدات سارية حاليًا"
                                    icon="✅"
                                    color="green"
                                />

                                <StatCard
                                    title="تعاقدات منتهية"
                                    value={temporaryData.expired}
                                    subtitle="انتهت فترة التعاقد"
                                    icon="⌛"
                                    color="red"
                                />

                                <StatCard
                                    title="لم تبدأ بعد"
                                    value={temporaryData.notStarted}
                                    subtitle="تاريخ البداية في المستقبل"
                                    icon="🕒"
                                    color="blue"
                                />

                                <StatCard
                                    title="تواريخ غير مكتملة"
                                    value={temporaryData.missingDates}
                                    subtitle="بيانات تعاقد تحتاج إلى استكمال"
                                    icon="⚠️"
                                    color="orange"
                                />
                            </div>

                            <div className="mt-7 space-y-5">
                                <ProgressRow
                                    label="داخل فترة التعاقد"
                                    value={temporaryData.withinContractPeriod}
                                    total={totalTemporary}
                                    color="bg-emerald-500"
                                />

                                <ProgressRow
                                    label="فترة التعاقد منتهية"
                                    value={temporaryData.expired}
                                    total={totalTemporary}
                                    color="bg-red-500"
                                />

                                <ProgressRow
                                    label="لم تبدأ فترة التعاقد"
                                    value={temporaryData.notStarted}
                                    total={totalTemporary}
                                    color="bg-orange-500"
                                />

                                <ProgressRow
                                    label="تواريخ غير مكتملة"
                                    value={temporaryData.missingDates}
                                    total={totalTemporary}
                                    color="bg-slate-400"
                                />
                            </div>
                        </Panel>

                        {/* Footer */}
                        <footer className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-400 sm:flex-row sm:items-center">
                            <span className="font-bold text-slate-500">
                                لوحة تحكم إدارة التسويق
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

export default DashboardMarketingCoordinators;
