
import { useNavigate } from "react-router-dom";
import Header from "../../components/header";

const pricingSections = [
    {
        title: "الدواجن",
        description:
            "إدارة أسعار الدواجن والمنتجات ومتابعة البورصة اليومية ومعاملات الموردين وتكاليف التصنيع وهوامش الربح.",
        icon: "🐔",
        path: "/pricing/poultry",
        gradient: "from-orange-500 to-amber-500",
        light: "bg-orange-50",
        iconColor: "text-orange-600",
        label: "إدارة قطاع الدواجن",
    },
    {
        title: "البيض",
        description:
            "إدارة أسعار البيض ومتابعة أسعار السوق والموردين وتحديد أسعار البيع وهوامش الربح.",
        icon: "🥚",
        path: "/pricing/eggs",
        gradient: "from-yellow-500 to-amber-400",
        light: "bg-yellow-50",
        iconColor: "text-yellow-600",
        label: "إدارة قطاع البيض",
    },
    {
        title: "السمك",
        description:
            "إدارة أسعار الأسماك ومتابعة أسعار السوق والموردين والتكاليف وتحديد أسعار البيع.",
        icon: "🐟",
        path: "/pricing/fish",
        gradient: "from-cyan-500 to-blue-500",
        light: "bg-cyan-50",
        iconColor: "text-cyan-600",
        label: "إدارة قطاع الأسماك",
    },
];

function PricingHome() {
    const navigate = useNavigate();

    return (
        <>
            <div className="sticky top-0 z-50">
                <Header user={true} />
            </div>

            <main
                dir="rtl"
                className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8"
            >
                <div className="mx-auto max-w-7xl">

                    {/* Page Header */}
                    <div className="mb-10">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
                            <span>الرئيسية</span>
                            <span>/</span>
                            <span className="text-orange-600">
                                نظام التسعير
                            </span>
                        </div>

                        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                            <div>
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-3xl">
                                        💰
                                    </div>

                                    <div>
                                        <h1 className="text-3xl font-extrabold text-slate-800">
                                            نظام التسعير
                                        </h1>

                                        <p className="mt-1 text-sm text-slate-500">
                                            إدارة ومتابعة قطاعات التسعير المختلفة
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                                <span className="text-sm font-bold text-green-700">
                                    جميع قطاعات التسعير
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {pricingSections.map((section) => (
                            <button
                                key={section.path}
                                type="button"
                                onClick={() => navigate(section.path)}
                                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 text-right shadow-sm transition duration-300 hover:-translate-y-2 hover:border-transparent hover:shadow-xl"
                            >
                                {/* Decorative Background */}
                                <div
                                    className={`absolute -left-12 -top-12 h-40 w-40 rounded-full ${section.light} opacity-70 transition duration-500 group-hover:scale-150`}
                                />

                                <div className="relative">
                                    <div className="mb-7 flex items-center justify-between">
                                        <div
                                            className={`flex h-20 w-20 items-center justify-center rounded-2xl ${section.light} text-5xl transition duration-300 group-hover:scale-110`}
                                        >
                                            {section.icon}
                                        </div>

                                        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 transition group-hover:bg-orange-50 group-hover:text-orange-600">
                                            {section.label}
                                        </span>
                                    </div>

                                    <h2 className="text-2xl font-extrabold text-slate-800 transition group-hover:text-orange-600">
                                        {section.title}
                                    </h2>

                                    <p className="mt-4 min-h-20 text-sm leading-8 text-slate-500">
                                        {section.description}
                                    </p>

                                    <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
                                        <span className="text-sm font-extrabold text-slate-700 transition group-hover:text-orange-600">
                                            الدخول إلى القسم
                                        </span>

                                        <span
                                            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-l ${section.gradient} text-xl text-white shadow-md transition duration-300 group-hover:-translate-x-1`}
                                        >
                                            ←
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-extrabold text-slate-800">
                                    منصة إدارة التسعير
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    اختر القطاع الذي تريد إدارة أسعاره ومتابعة بياناته.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate("/")}
                                className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-900"
                            >
                                العودة للرئيسية
                            </button>
                        </div>
                    </div>

                </div>
            </main>
        </>
    );
}

export default PricingHome;
