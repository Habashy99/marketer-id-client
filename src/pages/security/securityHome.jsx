
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../components/header";
import { useAuth } from "../../context/authContext";
import { isAdmin, hasPermission } from "../../helpers/permissions";

const SECURITY_PERMISSION_ID = 33;
const SECURITY_DASHBOARD_PERMISSION_ID = 41;


const securitySections = [
    {
        title: "لوحة تحكم الأمن",
        description:
            "عرض الإحصائيات والمؤشرات الأمنية وحالات الأشخاص والبلاغات والتصاريح.",
        path: "/security/dashboard",
        permissionId: SECURITY_DASHBOARD_PERMISSION_ID,
        icon: "📊",
    },
    {
        title: "إدارة الأمن",
        description:
            "إدارة بيانات الأشخاص والوقائع والمواقف الأمنية والتصاريح.",
        path: "/security/management",
        permissionId: SECURITY_PERMISSION_ID,
        icon: "🛡️",
    },
];


function SecurityHome() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const admin = isAdmin(user);

    const visibleSections = useMemo(() => {
        if (!user) return [];

        if (admin) return securitySections;

        return securitySections.filter((section) =>
            hasPermission(user, section.permissionId)
        );
    }, [user, admin]);

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
                <Header user={user} />
            </div>

            <main
                dir="rtl"
                className="min-h-screen bg-slate-100 p-4 sm:p-8"
            >
                <div className="mx-auto max-w-6xl">
                    {/* Page Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-orange-600">
                                نظام إدارة الأمن
                            </h1>

                            <p className="mt-3 text-gray-600">
                                إدارة السجلات والوقائع والمواقف الأمنية ومتابعة المؤشرات.
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

                    {/* Security Sections */}
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
                                        className="group rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl transition group-hover:bg-orange-100">
                                                {section.icon}
                                            </div>

                                            <span className="text-2xl text-slate-300 transition group-hover:-translate-x-1 group-hover:text-orange-500">
                                                ←
                                            </span>
                                        </div>

                                        <h2 className="mt-5 text-xl font-bold text-orange-600">
                                            {section.title}
                                        </h2>

                                        <p className="mt-3 leading-7 text-gray-600">
                                            {section.description}
                                        </p>

                                        <div className="mt-5 border-t border-slate-100 pt-4 text-sm font-bold text-orange-600">
                                            الدخول إلى القسم
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                                <div className="text-4xl">🔒</div>

                                <h2 className="mt-4 text-lg font-semibold text-slate-700">
                                    لا توجد أقسام متاحة
                                </h2>

                                <p className="mt-2 text-slate-500">
                                    لا يمتلك حسابك صلاحية الوصول إلى أقسام إدارة الأمن.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}

export default SecurityHome;
