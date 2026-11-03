
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import { useAuth } from "../context/authContext";
import { sendHttpReq } from "../lib//httpHandler";

function Login() {
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { user, loginUser } = useAuth();

    if (user) {
        navigate("/", { replace: true });
    }


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
            setError(err.message || "حدث خطأ أثناء تسجيل الدخول");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen">
            <div className="sticky top-0 z-50">
                <Header user={null} />
            </div>

            <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-100 p-6 bg-[url('/images/gomla_market_company_cover.jpg')]">
                <form
                    onSubmit={handleLogin}
                    className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
                >
                    <h1 className="text-center text-3xl font-bold text-orange-600">
                        تسجيل الدخول
                    </h1>

                    <div className="mt-8">
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
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                            placeholder="أدخل كود المستخدم"
                        />
                    </div>

                    <div className="mt-5">
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
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
                            placeholder="أدخل كلمة المرور"
                        />
                    </div>

                    {error && (
                        <p className="mt-4 text-center text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "جاري تسجيل الدخول..." : "دخول"}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/", { replace: true })}
                        className="mt-4 w-full rounded-lg border border-gray-300 px-5 py-3 text-gray-700 hover:bg-gray-50"
                    >
                        العودة للرئيسية
                    </button>
                </form>
            </main>
        </div>
    );
}

export default Login;
