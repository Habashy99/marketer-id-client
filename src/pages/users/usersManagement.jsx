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
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
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

    const handleDeleteUser = async (selectedUser) => {
        if (!selectedUser?.id) {
            setError("بيانات المستخدم غير صحيحة.");
            return;
        }

        if (Number(selectedUser.id) === Number(user?.id)) {
            setError("لا يمكنك حذف حسابك الحالي.");
            return;
        }

        const confirmed = window.confirm(
            `هل أنت متأكد من حذف المستخدم التالي نهائيًا؟\n\nالاسم: ${selectedUser.name}\nالكود: ${selectedUser.code}\n\nسيتم حذف المستخدم وربط صلاحياته.`
        );

        if (!confirmed) return;

        setDeletingId(selectedUser.id);
        setError("");
        setSuccess("");

        try {
            const response = await sendHttpReq(
                `users/${selectedUser.id}`,
                "DELETE"
            );

            setSuccess(
                response?.message || "تم حذف المستخدم بنجاح."
            );

            await fetchUsers(searchCode);
        } catch (err) {
            setError(
                err.message || "حدث خطأ أثناء حذف المستخدم."
            );
        } finally {
            setDeletingId(null);
        }
    };

    const handleCloseModal = () => {
        setModal(null);
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">
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
                        className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
                    >
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() => setError("")}
                            className="font-semibold underline"
                        >
                            إغلاق
                        </button>
                    </div>
                )}

                {success && (
                    <div
                        role="status"
                        className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700"
                    >
                        <span>{success}</span>

                        <button
                            type="button"
                            onClick={() => setSuccess("")}
                            className="font-semibold underline"
                        >
                            إغلاق
                        </button>
                    </div>
                )}

                <UsersTable
                    users={users}
                    loading={loading}
                    deletingId={deletingId}
                    onDeleteUser={handleDeleteUser}
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