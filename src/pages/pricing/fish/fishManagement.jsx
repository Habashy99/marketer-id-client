import { useNavigate } from "react-router-dom";
import Header from "../../../components/header";

function FishManagement() {
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
                <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-xl">
                    <div className="bg-gradient-to-l from-cyan-600 to-blue-500 px-8 py-10 text-center text-white">
                        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 text-6xl shadow-lg">
                            🐟
                        </div>

                        <h1 className="text-3xl font-extrabold">
                            إدارة قطاع الأسماك
                        </h1>

                        <p className="mt-3 text-sm font-medium text-cyan-50">
                            نظام إدارة ومتابعة أسعار ومنتجات الأسماك
                        </p>
                    </div>

                    <div className="px-6 py-10 text-center sm:px-10">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50">
                            <span className="text-3xl">🚧</span>
                        </div>

                        <h2 className="text-2xl font-extrabold text-slate-800">
                            القسم قيد التطوير
                        </h2>

                        <p className="mx-auto mt-4 max-w-lg text-base leading-8 text-slate-500">
                            نعمل حاليًا على تطوير هذا القسم لتوفير منظومة
                            متكاملة لإدارة أسعار الأسماك ومتابعة أسعار السوق
                            والموردين والتكاليف وتحديد أسعار البيع.
                        </p>

                        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                            <p className="font-bold text-cyan-800">
                                سيتم إطلاق القسم قريبًا
                            </p>
                            <p className="mt-2 text-sm text-cyan-700">
                                نعمل على تجهيز الأدوات والوظائف اللازمة لإدارة
                                القطاع بكفاءة وسهولة.
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

export default FishManagement;