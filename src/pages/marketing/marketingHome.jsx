import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/header";
import { sendHttpReq } from "../../lib/httpHandler";
import { useAuth } from "../../context/authContext";
import { isAdmin, hasPermission } from "../../helpers/permissions";
const marketingSections = [
    {
        title: "نظام ادارة المندوبين والمنسقين",
        description: "البيانات والاستثناءات",
        path: "/marketing/coordinators",
        parentPermission: 7,
    },
    {
        title: "نظام تصميم كارت",
        description: "تصميم وتجهيز الكروت للطباعة",
        path: "/marketing/card-designer",
        parentPermission: 4,
    },
    {
        title: "نظام سجل الطباعة",
        description: "متابعة عمليات الطباعة",
        path: "/marketing/printer-log",
        parentPermission: 17,
    },
    {
        title: "نظام ادارة الكروت",
        description: "إدارة الكروت وبياناتها",
        path: "/marketing/card-management",
        parentPermission: 12,
    },
    {
        title: "نظام إدارة المنسقين المؤقتين",
        description: "إدارة بيانات المنسقين المؤقتين وفترات عملهم",
        path: "/marketing/temporary-coordinators",
        parentPermission: 27, 
    },
];

const cards = [
    {
        label: "عدد المناديب الذكور",
        key: "maleRepresentatives",
    },
    {
        label: "عدد المناديب الإناث",
        key: "femaleRepresentatives",
    },
    {
        label: "عدد المنسقين الذكور",
        key: "maleCoordinators",
    },
    {
        label: "عدد المنسقين الإناث",
        key: "femaleCoordinators",
    },
    {
        label: "عدد المناديب الذكور غير المفعلين",
        key: "expiredMaleRepresentatives",
    },
    {
        label: "عدد المناديب الإناث غير المفعلين",
        key: "expiredFemaleRepresentatives",
    },
    {
        label: "عدد المنسقين الذكور غير المفعلين",
        key: "expiredMaleCoordinators",
    },
    {
        label: "عدد المنسقين الإناث غير المفعلين",
        key: "expiredFemaleCoordinators",
    },
];

function MarketingHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [selectedCard, setSelectedCard] = useState(null);
    const [records, setRecords] = useState([]);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [recordsError, setRecordsError] = useState("");

    const admin = isAdmin(user);

    // Admin sees all sections.
    // Other users see a section only if they have its parent permission.
    const visibleSections = useMemo(() => {
        if (!user) return [];

        if (admin) {
            return marketingSections;
        }

        return marketingSections.filter((section) =>
            hasPermission(user, section.parentPermission)
        );
    }, [user, admin]);

    // Permission 11 represents "عرض المناديب".
    // Admin users can see all statistics.
    const canViewStats = admin || hasPermission(user, 11);

    useEffect(() => {
        if (!user || !canViewStats) {
            setStats(null);
            setLoading(false);
            setError("");
            return;
        }

        let cancelled = false;

        const fetchStats = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await sendHttpReq("dashboard/stats");

                if (!response?.stats) {
                    throw new Error(
                        response?.message ||
                        "استجابة السيرفر لا تحتوي على الإحصائيات."
                    );
                }

                if (!cancelled) {
                    setStats(response.stats);
                }
            } catch (err) {
                console.error(
                    "Failed to load dashboard statistics:",
                    err
                );

                if (!cancelled) {
                    setError(err.message || "فشل تحميل الإحصائيات.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchStats();

        return () => {
            cancelled = true;
        };
    }, [user, canViewStats, location.key]);

    const handleCardClick = async (card) => {
        if (!canViewStats) return;

        setSelectedCard(card);
        setRecords([]);
        setRecordsError("");
        setRecordsLoading(true);

        try {
            const response = await sendHttpReq(
                "dashboard/records",
                "POST",
                { category: card.key }
            );

            if (!response) {
                throw new Error("لم يتم استلام بيانات من السيرفر.");
            }

            setRecords(response.records ?? []);
        } catch (err) {
            console.error("Failed to load dashboard records:", err);

            setRecordsError(
                err.message || "حدث خطأ أثناء تحميل البيانات."
            );
        } finally {
            setRecordsLoading(false);
        }
    };

    const closeRecords = () => {
        setSelectedCard(null);
        setRecords([]);
        setRecordsError("");
        setRecordsLoading(false);
    };

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
                        onClick={() =>
                            navigate("/login", { replace: true })
                        }
                        className="mt-5 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700"
                    >
                        تسجيل الدخول
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="sticky top-0 z-50">
                <Header user={true} />
            </div>

            <main
                dir="rtl"
                className="min-h-screen bg-slate-100 p-4 sm:p-8"
            >
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-orange-600">
                                نظام التسويق
                            </h1>

                            <p className="mt-3 text-gray-600">
                                اختر القسم الذي تريد العمل عليه.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="self-start rounded-lg border border-gray-300 px-5 py-3 text-gray-700 transition hover:bg-gray-200"
                        >
                            العودة للرئيسية
                        </button>
                    </div>

                    {/* Sections available to the current user */}
                    <section className="mt-8">
                        {visibleSections.length > 0 ? (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {visibleSections.map((section) => (
                                    <button
                                        key={section.path}
                                        type="button"
                                        onClick={() =>
                                            navigate(section.path)
                                        }
                                        className="rounded-xl bg-white p-6 text-right shadow transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    >
                                        <h2 className="text-xl font-bold text-orange-600">
                                            {section.title}
                                        </h2>

                                        <p className="mt-3 text-gray-600">
                                            {section.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-700">
                                    لا توجد أقسام متاحة
                                </h2>

                                <p className="mt-2 text-slate-500">
                                    لا يمتلك حسابك صلاحية الوصول إلى أقسام نظام التسويق.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Coordinator and representative statistics */}
                    {canViewStats && (
                        <section className="mt-10">
                            <div className="mb-5">
                                <h2 className="text-center text-2xl font-bold text-orange-600 sm:text-3xl">
                                    جرد المنسقين والمناديب
                                </h2>
                            </div>

                            {loading && (
                                <p className="p-6 text-center text-slate-600">
                                    جاري تحميل الإحصائيات...
                                </p>
                            )}

                            {error && (
                                <div className="rounded-lg bg-white p-6 text-center text-red-600 shadow-sm">
                                    <p>{error}</p>

                                    <button
                                        type="button"
                                        onClick={() => navigate(0)}
                                        className="mt-3 underline"
                                    >
                                        إعادة المحاولة
                                    </button>
                                </div>
                            )}

                            {!loading && !error && stats && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {cards.map((card) => (
                                        <button
                                            key={card.key}
                                            type="button"
                                            onClick={() =>
                                                handleCardClick(card)
                                            }
                                            className="rounded-lg bg-orange-600 p-4 text-center text-white shadow-md transition duration-200 hover:-translate-y-1 hover:bg-orange-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                                        >
                                            <p>{card.label}</p>

                                            <p className="mt-3 text-3xl font-bold">
                                                {stats[card.key] ?? 0}
                                            </p>

                                            <p className="mt-2 text-xs text-orange-100">
                                                اضغط لعرض التفاصيل
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Records table */}
                    {selectedCard && canViewStats && (
                        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-orange-50 p-5">
                                <div>
                                    <h2 className="text-xl font-bold text-orange-700">
                                        {selectedCard.label}
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-600">
                                        عدد النتائج: {records.length}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeRecords}
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                                >
                                    إغلاق
                                </button>
                            </div>

                            {recordsLoading && (
                                <p className="p-8 text-center text-slate-600">
                                    جاري تحميل البيانات...
                                </p>
                            )}

                            {recordsError && (
                                <p className="p-6 text-center text-red-600">
                                    {recordsError}
                                </p>
                            )}

                            {!recordsLoading &&
                                !recordsError &&
                                records.length === 0 && (
                                    <p className="p-8 text-center text-slate-500">
                                        لا توجد بيانات في هذه الفئة.
                                    </p>
                                )}

                            {!recordsLoading &&
                                !recordsError &&
                                records.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-900px text-right text-sm">
                                            <thead className="bg-slate-100 text-slate-700">
                                                <tr>
                                                    <th className="px-4 py-3">
                                                        الكود
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        الاسم
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        الوظيفة
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        الشركة
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        الحالة
                                                    </th>
                                                    <th className="px-4 py-3">
                                                        انتهاء الشهادة الصحية
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100">
                                                {records.map((record) => (
                                                    <tr
                                                        key={record.id}
                                                        className="transition hover:bg-orange-50"
                                                    >
                                                        <td className="whitespace-nowrap px-4 py-3">
                                                            {record.code ?? "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                                                            {record.name ?? "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-3">
                                                            {record.job ?? "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-3">
                                                            {record.company_name ?? "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-3">
                                                            {record.states ?? "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-3">
                                                            {record.health_certificate_expiry_date
                                                                ? new Date(
                                                                    record.health_certificate_expiry_date
                                                                ).toLocaleDateString(
                                                                    "en-GB"
                                                                )
                                                                : "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}

export default MarketingHome;