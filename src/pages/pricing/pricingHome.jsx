
import { useNavigate } from "react-router-dom";
import Header from "../../components/header";

function PricingHome() {
    const navigate = useNavigate();

    return (
        <>
            <div className="sticky top-0 z-50">
                <Header user={true} />
            </div>

            <main
                dir="rtl"
                className="flex min-h-screen items-center justify-center bg-slate-100 p-6"
            >
                <section className="w-full max-w-xl rounded-xl bg-white p-8 text-center shadow-lg">
                    <h1 className="text-3xl font-bold text-orange-600">
                        نظام التسعير
                    </h1>

                    <p className="mt-4 text-gray-600">
                        قسم التسعير جاهز لإضافة الوظائف الخاصة به لاحقًا.
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="mt-8 rounded-lg bg-orange-600 px-6 py-3 text-white hover:bg-orange-700"
                    >
                        العودة للرئيسية
                    </button>
                </section>
            </main>
        </>
    );
}

export default PricingHome;
