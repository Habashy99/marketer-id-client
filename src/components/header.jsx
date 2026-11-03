
import { useNavigate } from "react-router-dom";
import { sendHttpReq } from "../lib/httpHandler";
import { useAuth } from "../context/authContext";
import marketLogo from "../assets/gomlaMarketlogo2.jpg";

function Header() {
    const navigate = useNavigate();
    const { user, logoutUser, isAuthLoading } = useAuth();

    const logout = async () => {
        try {
            await sendHttpReq("users/logout", "POST");
            logoutUser();
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Logout error:", error);
            alert(error.message || "Failed to log out");
        }
    };

    return (
        <header
            dir="ltr"
            className="grid w-full grid-cols-3 items-center bg-white px-3 py-4 sm:px-6"
        >
            <div className="justify-self-start">
                {!isAuthLoading && user && (
                    <button
                        type="button"
                        onClick={logout}
                        className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white transition-colors hover:bg-orange-700 sm:px-5 sm:py-3 sm:text-base"
                    >
                        تسجيل الخروج
                    </button>
                )}
            </div>

            <h1
                dir="rtl"
                className="justify-self-center whitespace-nowrap text-lg font-bold text-orange-600 sm:text-3xl"
            >
                إدارة جملة ماركت
            </h1>

            <div className="justify-self-end overflow-hidden rounded-lg">
                <img
                    src={marketLogo}
                    alt="Gomla Market Logo"
                    className="h-12 w-12 object-cover sm:h-20 sm:w-20"
                />
            </div>
        </header>
    );
}

export default Header;
