
import { useNavigate } from "react-router-dom";
import Header from "../../../components/header";

const pricingScreens = [
    {
        title: "البورصة اليومية",
        description:
            "تسجيل ومتابعة أسعار الدجاج الأبيض والبلدي، ومراجعة أسعار السوق والتغيرات اليومية.",
        icon: "📊",
        path: "/pricing/exchange",
        number: "01",
    },
    {
        title: "معاملات الموردين",
        description:
            "إدارة معاملات الموردين ومتابعة أسعار المنتجات حسب المورد والفرع وفترة السريان.",
        icon: "🏢",
        path: "/pricing/suppliers",
        number: "02",
    },
    {
        title: "تكلفة المصنعات",
        description:
            "إدارة المنتجات المصنعة والخامات المستخدمة وحساب تكاليف الإنتاج والتصنيع.",
        icon: "⚙️",
        path: "/pricing/manufacturing",
        number: "03",
    },
    {
        title: "التسعير وهوامش الربح",
        description:
            "تحديد هوامش الربح ومراجعة التكاليف وتحديد أسعار البيع المناسبة لكل فرع.",
        icon: "💰",
        path: "/pricing/selling-prices",
        number: "04",
    },
];

function ChickenManagement() {
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

                    {/* Breadcrumb */}
                    <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-400">
                        <button
                            type="button"
                            onClick={() => navigate("/pricing")}
                            className="transition hover:text-orange-600"
                        >
                            نظام التسعير
                        </button>

                        <span>/</span>

                        <span className="text-orange-600">
                            إدارة قطاع الدواجن
                        </span>
                    </div>

                    {/* Header */}
                    <div className="mb-10 overflow-hidden rounded-3xl bg-linear-to-l from-orange-600 via-orange-500 to-amber-400 shadow-lg">
                        <div className="relative overflow-hidden px-6 py-10 sm:px-10">

                            {/* Decorative circles */}
                            <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
                            <div className="absolute -bottom-28 right-1/3 h-72 w-72 rounded-full bg-white/10" />

                            <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
                                <div>
                                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/20 bg-white/20 text-5xl shadow-lg backdrop-blur-sm">
                                        🐔
                                    </div>

                                    <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                                        إدارة قطاع الدواجن
                                    </h1>

                                    <p className="mt-4 max-w-2xl text-sm leading-8 text-orange-50 sm:text-base">
                                        المنظومة المتكاملة لإدارة ومتابعة أسعار
                                        الدواجن والموردين وتكاليف التصنيع
                                        والتسعير وهوامش الربح.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                                    <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-5 py-4 backdrop-blur-sm">
                                        <span className="flex h-3 w-3 rounded-full bg-green-300 shadow-[0_0_10px_rgba(134,239,172,0.8)]" />

                                        <div>
                                            <p className="text-xs text-orange-100">
                                                حالة القطاع
                                            </p>
                                            <p className="mt-1 font-bold text-white">
                                                متاح للعمل
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/20 bg-white/15 px-5 py-4 backdrop-blur-sm">
                                        <p className="text-xs text-orange-100">
                                            الشاشات المتاحة
                                        </p>
                                        <p className="mt-1 text-2xl font-extrabold text-white">
                                            04
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section Title */}
                    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-800">
                                شاشات إدارة الدواجن
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                اختر إحدى الخدمات للبدء في إدارة بيانات القطاع.
                            </p>
                        </div>

                        <span className="w-fit rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
                            قطاع الدواجن
                        </span>
                    </div>

                    {/* Pricing Screens */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {pricingScreens.map((screen) => (
                            <button
                                key={screen.path}
                                type="button"
                                onClick={() => navigate(screen.path)}
                                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-right shadow-sm transition duration-300 hover:-translate-y-2 hover:border-orange-300 hover:shadow-xl sm:p-8"
                            >
                                {/* Decorative Background */}
                                <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-orange-50 opacity-70 transition duration-500 group-hover:scale-150" />

                                <div className="relative">
                                    <div className="mb-7 flex items-center justify-between">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-4xl transition duration-300 group-hover:scale-110 group-hover:bg-orange-100">
                                            {screen.icon}
                                        </div>

                                        <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-400 transition group-hover:bg-orange-50 group-hover:text-orange-600">
                                            {screen.number}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-extrabold text-slate-800 transition group-hover:text-orange-600 sm:text-2xl">
                                        {screen.title}
                                    </h3>

                                    <p className="mt-4 min-h-16 text-sm leading-8 text-slate-500">
                                        {screen.description}
                                    </p>

                                    <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
                                        <span className="text-sm font-extrabold text-slate-700 transition group-hover:text-orange-600">
                                            الدخول إلى الشاشة
                                        </span>

                                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-l from-orange-600 to-amber-400 text-xl text-white shadow-md transition duration-300 group-hover:-translate-x-1">
                                            ←
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-10 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:px-7">
                        <div>
                            <h3 className="font-extrabold text-slate-800">
                                منظومة تسعير الدواجن
                            </h3>

                            <p className="mt-2 text-sm leading-7 text-slate-500">
                                جميع أدوات إدارة ومتابعة أسعار الدواجن في مكان واحد.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/pricing")}
                            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-bold text-white transition hover:bg-slate-900"
                        >
                            <span>العودة إلى نظام التسعير</span>
                            <span>←</span>
                        </button>
                    </div>

                </div>
            </main>
        </>
    );
}

export default ChickenManagement;
