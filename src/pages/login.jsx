import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/header";
import { useAuth } from "../context/authContext";
import { sendHttpReq } from "../lib/httpHandler";

function Login() {
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const { user, loginUser, isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && user) {
            navigate("/", { replace: true });
        }
    }, [user, isAuthLoading, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const data = await sendHttpReq("users/login", "POST", {
                code: code.trim(),
                password,
            });

            if (!data.user) {
                throw new Error("لم يتم العثور على بيانات المستخدم");
            }

            loginUser(data.user);

            navigate("/", { replace: true });
        } catch (err) {
            setError(
                err.message || "حدث خطأ أثناء تسجيل الدخول"
            );
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <p className="font-semibold text-gray-600">
                    جاري التحقق من تسجيل الدخول...
                </p>
            </div>
        );
    }

    if (user) {
        return null;
    }

    return (
        <div className="min-h-screen">
            {/* Navigation Header */}
            <div className="sticky top-0 z-50">
                <Header user={null} />
            </div>

            {/* Main Content */}
            <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-100 bg-[url('/images/gomla_market_company_cover.jpg')] bg-cover bg-center p-6">

                <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">

                    {/* Login Form */}
                    <form onSubmit={handleLogin}>

                        <h1 className="text-3xl font-bold text-orange-600">
                            تسجيل الدخول
                        </h1>

                        {/* User Code */}
                        <div className="mt-8 text-right">
                            <label
                                htmlFor="code"
                                className="mb-2 block font-medium text-gray-700"
                            >
                                كود المستخدم
                            </label>

                            <input
                                id="code"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                autoComplete="username"
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
                                placeholder="أدخل كود المستخدم"
                            />
                        </div>

                        {/* Password */}
                        <div className="mt-5 text-right">
                            <label
                                htmlFor="password"
                                className="mb-2 block font-medium text-gray-700"
                            >
                                كلمة المرور
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
                                placeholder="أدخل كلمة المرور"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <p
                                role="alert"
                                className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-600"
                            >
                                {error}
                            </p>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-6 w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading
                                ? "جاري تسجيل الدخول..."
                                : "دخول"}
                        </button>

                        {/* Back to Home */}
                        <button
                            type="button"
                            onClick={() => navigate("/", { replace: true })}
                            disabled={loading}
                            className="mt-4 w-full rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                        >
                            العودة للرئيسية
                        </button>

                    </form>

                    {/* Developer Credit */}
                    <div className="mt-8 border-t border-gray-100 pt-5">
                        <p className="text-sm font-semibold text-gray-500">
                            Developed by{" "}
                            <span className="text-orange-600">
                                Abdelrahman Habashy
                            </span>
                        </p>
                    </div>

                </div>
            </main>
        </div>
    );
}

export default Login;
