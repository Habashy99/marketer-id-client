
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../components/header";
import { useAuth } from "../../context/authContext";
import { sendHttpReq } from "../../lib/httpHandler";

import UsersToolbar from "../../components/users/UsersToolbar";
import UsersTable from "../../components/users/UsersTable";
import UserModal from "../../components/users/UserModal";

function UsersManagement() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchCode, setSearchCode] = useState("");
    const [modal, setModal] = useState(null);

    const fetchUsers = useCallback(async (code = "") => {
        setLoading(true);
        setError("");

        try {
            const trimmedCode = code.trim();

            const query = trimmedCode
                ? `?code=${encodeURIComponent(trimmedCode)}`
                : "";

            const data = await sendHttpReq(`users${query}`);

            setUsers(Array.isArray(data?.users) ? data.users : []);
        } catch (err) {
            setError(err.message || "Failed to load users.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true });
            return;
        }

        fetchUsers();
    }, [user, navigate, fetchUsers]);

    const handleSearch = (event) => {
        event.preventDefault();
        fetchUsers(searchCode);
    };

    const handleShowAll = () => {
        setSearchCode("");
        fetchUsers("");
    };

    const handleSuccess = async () => {
        setModal(null);
        await fetchUsers(searchCode);
    };

    const handleCloseModal = () => {
        setModal(null);
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-40">
                <Header user={user} />
            </div>

            <main className="mx-auto max-w-7xl p-4 sm:p-6">
                <UsersToolbar
                    searchCode={searchCode}
                    onSearchCodeChange={setSearchCode}
                    onSearch={handleSearch}
                    onShowAll={handleShowAll}
                    onBack={() => navigate("/")}
                    onCreate={() => setModal("create")}
                    onGivePermission={() => setModal("give")}
                    onDeletePermission={() => setModal("delete")}
                />

                {error && (
                    <div
                        role="alert"
                        className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
                    >
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() => fetchUsers(searchCode)}
                            className="font-semibold underline"
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                )}

                <UsersTable
                    users={users}
                    loading={loading}
                />
            </main>

            {modal !== null && (
                <UserModal
                    type={modal}
                    currentUser={user}
                    onClose={handleCloseModal}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
}

export default UsersManagement;
