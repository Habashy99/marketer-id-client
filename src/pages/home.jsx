import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import Header from "../components/header";
import {
    isAdmin,
    hasParentPermission,
} from "../helpers/permissions";

// Parent permission IDs from dbo.auth
const MARKETING_PERMISSION_ID = 21;
const PRICING_PERMISSION_ID = 22; // Replace with the actual pricing parent ID.

function Home() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const admin = isAdmin(user);

    const canAccessMarketing =
        admin ||
        hasParentPermission(user, MARKETING_PERMISSION_ID);

    const canAccessPricing =
        admin ||
        hasParentPermission(user, PRICING_PERMISSION_ID);

    return (
        <div className="min-h-screen">
            <div className="sticky top-0 z-50">
                <Header user={user} />
            </div>

            <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-100 bg-[url('/images/gomla_market_company_cover.jpg')] bg-cover bg-center p-6">
                <div className="w-full max-w-4xl rounded-2xl bg-white p-8 text-center shadow-xl sm:p-10">
                    <h1 className="text-3xl font-bold text-orange-600">
                        مرحباً بك في إدارة جملة ماركت
                    </h1>

                    <p className="mt-4 text-gray-600">
                        أدِر فريقك وأنظمتك في مكان واحد.
                    </p>

                    {!user ? (
                        <button
                            type="button"
                            onClick={() =>
                                navigate("/login", { replace: true })
                            }
                            className="mt-8 w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700"
                        >
                            تسجيل الدخول
                        </button>
                    ) : (
                        <>
                            <h2 className="mt-8 text-xl font-semibold text-gray-800">
                                أهلاً {user.name}
                            </h2>

                            <p className="mt-2 text-gray-500">
                                اختر النظام الذي تريد استخدامه.
                            </p>

                            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {admin && (
                                    <button
                                        type="button"
                                        onClick={() => navigate("/users")}
                                        className="rounded-xl bg-orange-600 p-6 text-white shadow transition hover:-translate-y-1 hover:bg-orange-700 hover:shadow-lg"
                                    >
                                        <span className="text-xl font-bold">
                                            إدارة المستخدمين
                                        </span>

                                        <p className="mt-3 text-sm text-orange-50">
                                            إضافة المستخدمين وإدارة الصلاحيات.
                                        </p>
                                    </button>
                                )}

                                {canAccessMarketing && (
                                    <button
                                        type="button"
                                        onClick={() => navigate("/marketing")}
                                        className="rounded-xl bg-orange-600 p-6 text-white shadow transition hover:-translate-y-1 hover:bg-orange-700 hover:shadow-lg"
                                    >
                                        <span className="text-xl font-bold">
                                            إدارة التسويق
                                        </span>

                                        <p className="mt-3 text-sm text-orange-50">
                                            إدارة المندوبين والمنسقين والكروت.
                                        </p>
                                    </button>
                                )}

                                {canAccessPricing && (
                                    <button
                                        type="button"
                                        onClick={() => navigate("/pricing")}
                                        className="rounded-xl bg-orange-600 p-6 text-white shadow transition hover:-translate-y-1 hover:bg-orange-700 hover:shadow-lg"
                                    >
                                        <span className="text-xl font-bold">
                                            إدارة التسعير
                                        </span>

                                        <p className="mt-3 text-sm text-orange-50">
                                            الدخول إلى نظام التسعير.
                                        </p>
                                    </button>
                                )}

                                {!admin &&
                                    !canAccessMarketing &&
                                    !canAccessPricing && (
                                        <p className="col-span-full text-gray-600">
                                            لا توجد أنظمة متاحة لحسابك حاليًا.
                                            يرجى التواصل مع مدير النظام.
                                        </p>
                                    )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Home;