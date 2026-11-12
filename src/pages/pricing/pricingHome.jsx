
import { useNavigate } from "react-router-dom";
import Header from "../../components/header";

const pricingScreens = [
    {
        title: "البورصة اليومية",
        description: "تسجيل ومتابعة أسعار الدجاج الأبيض والبلدي وأسعار الموردين.",
        icon: "📊",
        path: "/pricing/exchange",
    },
    {
        title: "معاملات الموردين",
        description: "إدارة معاملات الموردين حسب المنتج والفرع وفترة السريان.",
        icon: "🏢",
        path: "/pricing/suppliers",
    },
    {
        title: "تكلفة المصنعات",
        description: "إدارة المنتجات المصنعة والخامات وحساب تكلفة التصنيع.",
        icon: "⚙️",
        path: "/pricing/manufacturing",
    },
    {
        title: "التسعير وهوامش الربح",
        description: "تحديد هوامش الربح ومراجعة التكلفة وسعر البيع لكل فرع.",
        icon: "💰",
        path: "/pricing/selling-prices",
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
                className="min-h-screen bg-slate-100 p-4 sm:p-8"
            >
                <div className="mx-auto max-w-6xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-orange-600">
                            نظام التسعير
                        </h1>

                        <p className="mt-3 text-gray-600">
                            اختر الشاشة التي تريد العمل عليها.
                        </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        {pricingScreens.map((screen) => (
                            <button
                                key={screen.path}
                                type="button"
                                onClick={() => navigate(screen.path)}
                                className="group rounded-xl border border-gray-200 bg-white p-6 text-right shadow-sm transition hover:-translate-y-1 hover:border-orange-400 hover:shadow-lg"
                            >
                                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 text-3xl transition group-hover:bg-orange-100">
                                    {screen.icon}
                                </div>

                                <h2 className="text-xl font-bold text-gray-800 group-hover:text-orange-600">
                                    {screen.title}
                                </h2>

                                <p className="mt-3 min-h-12 text-sm leading-7 text-gray-500">
                                    {screen.description}
                                </p>

                                <div className="mt-5 flex items-center gap-2 font-semibold text-orange-600">
                                    فتح الشاشة
                                    <span>←</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="rounded-lg bg-gray-700 px-6 py-3 text-white transition hover:bg-gray-800"
                        >
                            العودة للرئيسية
                        </button>
                    </div>
                </div>
            </main>
        </>
    );
}

export default PricingHome;
