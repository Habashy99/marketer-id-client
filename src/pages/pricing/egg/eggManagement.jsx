import { useNavigate } from "react-router-dom";
import Header from "../../../components/header";

function EggManagement() {
    const navigate = useNavigate();

    return (
        <>
            <div className="sticky top-0 z-50">
                <Header user={true} />
            </div>

            <main
                dir="rtl"
                className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10"
            >
                <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-yellow-100 bg-white shadow-xl">
                    <div className="bg-gradient-to-l from-yellow-500 to-amber-400 px-8 py-10 text-center text-white">
                        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 text-6xl shadow-lg">
                            🥚
                        </div>

                        <h1 className="text-3xl font-extrabold">
                            إدارة قطاع البيض
                        </h1>

                        <p className="mt-3 text-sm font-medium text-yellow-50">
                            نظام إدارة ومتابعة أسعار ومنتجات البيض
                        </p>
                    </div>

                    <div className="px-6 py-10 text-center sm:px-10">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50">
                            <span className="text-3xl">🚧</span>
                        </div>

                        <h2 className="text-2xl font-extrabold text-slate-800">
                            القسم قيد التطوير
                        </h2>

                        <p className="mx-auto mt-4 max-w-lg text-base leading-8 text-slate-500">
                            نعمل حاليًا على تجهيز هذا القسم لتوفير نظام متكامل
                            لإدارة أسعار البيض ومتابعة أسعار السوق والموردين
                            وتكاليف المنتجات وهوامش الربح.
                        </p>

                        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
                            <p className="font-bold text-yellow-800">
                                سيتم إطلاق القسم قريبًا
                            </p>
                            <p className="mt-2 text-sm text-yellow-700">
                                نعمل على تطوير وتحسين تجربة الاستخدام وتجهيز
                                جميع الوظائف المطلوبة.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate("/pricing")}
                            className="mt-8 rounded-xl bg-slate-800 px-7 py-3 font-bold text-white transition hover:bg-slate-900"
                        >
                            العودة إلى نظام التسعير
                        </button>
                    </div>
                </div>
            </main>
        </>
    );
}

export default EggManagement;