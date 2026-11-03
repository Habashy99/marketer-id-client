
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../../components/header";
import CreateTemporaryCoordinatorModal from "../../../components/temporaryCoordinators/CreateTemporaryCoordinatorModal";

import { sendHttpReq } from "../../../lib/httpHandler";
import { useAuth } from "../../../context/authContext";

function TemporaryCoordinators() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // ==========================================
    // ADMIN PERMISSIONS
    // ==========================================

    // Admin has full access to this page.
    const canCreateTemporaryCoordinator = true;
    const canCreateAdvertisingCompany = true;

    // ==========================================
    // DATA
    // ==========================================

    const [coordinators, setCoordinators] = useState([]);
    const [companies, setCompanies] = useState([]);

    // ==========================================
    // SEARCH FILTERS
    // ==========================================

    const [companySearch, setCompanySearch] = useState("");
    const [advertisingCompanySearch, setAdvertisingCompanySearch] = useState("");
    const [nationalIdSearch, setNationalIdSearch] = useState("");

    // ==========================================
    // LOADING STATES
    // ==========================================

    const [loading, setLoading] = useState(false);
    const [companiesLoading, setCompaniesLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [companySaving, setCompanySaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [deletingCompanyId, setDeletingCompanyId] = useState(null);

    // ==========================================
    // ERRORS
    // ==========================================

    const [error, setError] = useState("");
    const [companiesError, setCompaniesError] = useState("");
    const [companyActionError, setCompanyActionError] = useState("");

    // ==========================================
    // MODALS
    // ==========================================

    const [modalOpen, setModalOpen] = useState(false);
    const [companyModalOpen, setCompanyModalOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState("");

    // ==========================================
    // FETCH TEMPORARY COORDINATORS
    // ==========================================

    const fetchCoordinators = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await sendHttpReq("temporary-coordinators");

            if (!response) {
                throw new Error("لم يتم استلام بيانات من السيرفر.");
            }

            setCoordinators(
                response.coordinators ?? response.records ?? []
            );
        } catch (err) {
            console.error("Fetch temporary coordinators:", err);

            setError(
                err.message || "فشل تحميل بيانات المنسقين المؤقتين."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // ==========================================
    // FETCH ADVERTISING COMPANIES
    // ==========================================

    const fetchCompanies = useCallback(async () => {
        setCompaniesLoading(true);
        setCompaniesError("");

        try {
            const response = await sendHttpReq("advertising-companies");

            if (!response) {
                throw new Error("لم يتم استلام بيانات الشركات.");
            }

            setCompanies(response.companies ?? []);
        } catch (err) {
            console.error("Fetch advertising companies:", err);

            setCompaniesError(
                err.message || "فشل تحميل الشركات الإعلانية."
            );
        } finally {
            setCompaniesLoading(false);
        }
    }, []);

    // ==========================================
    // FILTER COORDINATORS
    // ==========================================

    const filteredCoordinators = useMemo(() => {
        const companyQuery = companySearch.trim().toLowerCase();
        const advertisingQuery = advertisingCompanySearch.trim().toLowerCase();
        const nationalIdQuery = nationalIdSearch.trim();

        return coordinators.filter((coordinator) => {
            const companyName = String(
                coordinator.mother_company_name ??
                coordinator.mother_company ??
                ""
            ).toLowerCase();

            const advertisingCompanyName = String(
                coordinator.advertising_company_name ??
                coordinator.advertising_company ??
                ""
            ).toLowerCase();

            const nationalId = String(
                coordinator.national_id_number ?? ""
            );

            const matchesCompany =
                !companyQuery || companyName.includes(companyQuery);

            const matchesAdvertisingCompany =
                !advertisingQuery ||
                advertisingCompanyName.includes(advertisingQuery);

            const matchesNationalId =
                !nationalIdQuery || nationalId.includes(nationalIdQuery);

            return (
                matchesCompany &&
                matchesAdvertisingCompany &&
                matchesNationalId
            );
        });
    }, [
        coordinators,
        companySearch,
        advertisingCompanySearch,
        nationalIdSearch,
    ]);

    // ==========================================
    // INITIAL FETCH
    // ==========================================

    useEffect(() => {
        if (!user) return;

        fetchCoordinators();
        fetchCompanies();
    }, [user, fetchCoordinators, fetchCompanies]);

    // ==========================================
    // CREATE TEMPORARY COORDINATOR
    // ==========================================

    const handleCreate = async (data) => {
        if (!canCreateTemporaryCoordinator) {
            throw new Error("ليس لديك صلاحية إنشاء مناديب مؤقتة.");
        }

        setSaving(true);

        try {
            const response = await sendHttpReq(
                "temporary-coordinators",
                "POST",
                data
            );

            if (!response?.coordinator) {
                throw new Error(
                    response?.message || "فشل إضافة المنسق المؤقت."
                );
            }

            setCoordinators((previous) => [
                response.coordinator,
                ...previous,
            ]);

            setModalOpen(false);
        } catch (err) {
            console.error("Create temporary coordinator:", err);

            throw new Error(
                err.message || "فشل إضافة المنسق المؤقت."
            );
        } finally {
            setSaving(false);
        }
    };

    // ==========================================
    // DELETE TEMPORARY COORDINATOR
    // ==========================================

    const handleDelete = async (id) => {
        const coordinator = coordinators.find(
            (item) => item.id === id
        );

        const confirmed = window.confirm(
            `هل أنت متأكد من حذف المنسق "${coordinator?.name ?? ""}"؟`
        );

        if (!confirmed) return;

        setDeletingId(id);

        try {
            await sendHttpReq(
                `temporary-coordinators/${id}`,
                "DELETE"
            );

            setCoordinators((previous) =>
                previous.filter((item) => item.id !== id)
            );
        } catch (err) {
            console.error("Delete temporary coordinator:", err);

            window.alert(
                err.message || "فشل حذف المنسق المؤقت."
            );
        } finally {
            setDeletingId(null);
        }
    };

    // ==========================================
    // CREATE ADVERTISING COMPANY
    // ==========================================

    const handleCreateCompany = async (event) => {
        event.preventDefault();

        if (!canCreateAdvertisingCompany) {
            setCompanyActionError(
                "ليس لديك صلاحية إنشاء شركة إعلانية."
            );
            return;
        }

        const name = newCompanyName.trim();

        if (!name) {
            setCompanyActionError("من فضلك أدخل اسم الشركة.");
            return;
        }

        setCompanySaving(true);
        setCompanyActionError("");

        try {
            const response = await sendHttpReq(
                "advertising-companies",
                "POST",
                { name }
            );

            if (!response?.company) {
                throw new Error(
                    response?.message || "فشل إضافة الشركة الإعلانية."
                );
            }

            setCompanies((previous) =>
                [...previous, response.company].sort((a, b) =>
                    a.name.localeCompare(b.name, "ar")
                )
            );

            setNewCompanyName("");
        } catch (err) {
            console.error("Create advertising company:", err);

            setCompanyActionError(
                err.message || "فشل إضافة الشركة الإعلانية."
            );
        } finally {
            setCompanySaving(false);
        }
    };

    // ==========================================
    // DELETE ADVERTISING COMPANY
    // ==========================================

    const handleDeleteCompany = async (id) => {
        const company = companies.find(
            (item) => item.id === id
        );

        const confirmed = window.confirm(
            `هل أنت متأكد من حذف الشركة "${company?.name ?? ""}"؟`
        );

        if (!confirmed) return;

        setDeletingCompanyId(id);
        setCompanyActionError("");

        try {
            await sendHttpReq(
                `advertising-companies/${id}`,
                "DELETE"
            );

            setCompanies((previous) =>
                previous.filter((item) => item.id !== id)
            );
        } catch (err) {
            console.error("Delete advertising company:", err);

            setCompanyActionError(
                err.message || "فشل حذف الشركة الإعلانية."
            );
        } finally {
            setDeletingCompanyId(null);
        }
    };

    // ==========================================
    // CLEAR SEARCH
    // ==========================================

    const clearSearch = () => {
        setCompanySearch("");
        setAdvertisingCompanySearch("");
        setNationalIdSearch("");
    };

    // ==========================================
    // FORMAT DATE
    // ==========================================

    const formatDate = (value) => {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleDateString("en-GB");
    };

    // ==========================================
    // AUTHENTICATION
    // ==========================================

    if (!user) {
        return (
            <div
                dir="rtl"
                className="flex min-h-screen items-center justify-center bg-slate-100 p-6"
            >
                <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
                    <h1 className="text-xl font-bold text-slate-800">
                        يجب تسجيل الدخول أولاً
                    </h1>

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/login", { replace: true })
                        }
                        className="mt-5 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700"
                    >
                        تسجيل الدخول
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <>
            <div className="sticky top-0 z-50">
                <Header user={true} />
            </div>

            <main
                dir="rtl"
                className="min-h-screen bg-slate-100 p-4 sm:p-8"
            >
                <div className="mx-auto max-w-7xl">

                    {/* PAGE HEADER */}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-orange-600">
                                إدارة المنسقين المؤقتين
                            </h1>

                            <p className="mt-2 text-gray-600">
                                عرض وإضافة وحذف بيانات المنسقين المؤقتين.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => navigate("/marketing")}
                                className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
                            >
                                العودة لنظام التسويق
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setCompanyActionError("");
                                    setCompanyModalOpen(true);
                                }}
                                className="rounded-lg border border-orange-600 bg-white px-5 py-3 font-semibold text-orange-600 transition hover:bg-orange-50"
                            >
                                إدارة الشركات الإعلانية
                            </button>

                            {canCreateTemporaryCoordinator && (
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(true)}
                                    disabled={
                                        companiesLoading ||
                                        companies.length === 0
                                    }
                                    className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    إضافة منسق مؤقت +
                                </button>
                            )}
                        </div>
                    </div>

                    {/* COMPANIES FETCH ERROR */}

                    {companiesError && (
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-4 text-red-700">
                            <p>{companiesError}</p>

                            <button
                                type="button"
                                onClick={fetchCompanies}
                                className="font-semibold underline"
                            >
                                إعادة تحميل الشركات
                            </button>
                        </div>
                    )}

                    {/* STATISTICS */}

                    <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-white p-5 shadow-sm">
                            <p className="text-sm font-semibold text-gray-500">
                                إجمالي المنسقين المؤقتين
                            </p>

                            <p className="mt-2 text-3xl font-bold text-orange-600">
                                {coordinators.length}
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-5 shadow-sm">
                            <p className="text-sm font-semibold text-gray-500">
                                إجمالي الشركات الإعلانية
                            </p>

                            <p className="mt-2 text-3xl font-bold text-orange-600">
                                {companies.length}
                            </p>
                        </div>
                    </section>

                    {/* SEARCH FILTERS */}

                    <section className="mt-8 rounded-xl bg-white p-5 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-gray-800">
                                البحث عن المنسقين المؤقتين
                            </h2>

                            <button
                                type="button"
                                onClick={clearSearch}
                                disabled={
                                    !companySearch &&
                                    !advertisingCompanySearch &&
                                    !nationalIdSearch
                                }
                                className="text-sm font-semibold text-orange-600 transition hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                مسح الفلاتر
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                            {/* MOTHER COMPANY */}

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    الشركة الأم
                                </label>

                                <input
                                    type="text"
                                    value={companySearch}
                                    onChange={(event) =>
                                        setCompanySearch(event.target.value)
                                    }
                                    placeholder="ابحث باسم الشركة الأم..."
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                                />
                            </div>

                            {/* ADVERTISING COMPANY */}

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    الشركة الإعلانية
                                </label>

                                <input
                                    type="text"
                                    value={advertisingCompanySearch}
                                    onChange={(event) =>
                                        setAdvertisingCompanySearch(event.target.value)
                                    }
                                    placeholder="ابحث باسم الشركة الإعلانية..."
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                                />
                            </div>

                            {/* NATIONAL ID */}

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    الرقم القومي
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={nationalIdSearch}
                                    onChange={(event) =>
                                        setNationalIdSearch(
                                            event.target.value.replace(/\D/g, "")
                                        )
                                    }
                                    placeholder="ابحث بالرقم القومي..."
                                    maxLength={14}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                        </div>

                        <p className="mt-4 text-sm text-gray-500">
                            عدد النتائج:{" "}
                            <span className="font-bold text-orange-600">
                                {filteredCoordinators.length}
                            </span>
                        </p>
                    </section>

                    {/* TEMPORARY COORDINATORS TABLE */}

                    <section className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">

                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    قائمة المنسقين المؤقتين
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    عدد النتائج: {filteredCoordinators.length}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchCoordinators}
                                disabled={loading}
                                className="rounded-lg border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"
                            >
                                {loading
                                    ? "جاري التحميل..."
                                    : "تحديث البيانات ↻"}
                            </button>
                        </div>

                        {/* LOADING */}

                        {loading && (
                            <p className="p-8 text-center text-gray-600">
                                جاري تحميل البيانات...
                            </p>
                        )}

                        {/* ERROR */}

                        {error && (
                            <div className="p-8 text-center text-red-600">
                                <p>{error}</p>

                                <button
                                    type="button"
                                    onClick={fetchCoordinators}
                                    className="mt-3 font-semibold underline"
                                >
                                    إعادة المحاولة
                                </button>
                            </div>
                        )}

                        {/* EMPTY */}

                        {!loading &&
                            !error &&
                            filteredCoordinators.length === 0 && (
                                <p className="p-8 text-center text-gray-500">
                                    {coordinators.length === 0
                                        ? "لا توجد بيانات للمنسقين المؤقتين."
                                        : "لا توجد نتائج مطابقة لعملية البحث."}
                                </p>
                            )}

                        {/* TABLE */}

                        {!loading &&
                            !error &&
                            filteredCoordinators.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-275 text-right text-sm">
                                        <thead className="bg-orange-50 text-gray-700">
                                            <tr>
                                                {[
                                                    "م",
                                                    "الاسم",
                                                    "الشركة الأم",
                                                    "الشركة الإعلانية",
                                                    "الرقم القومي",
                                                    "الفرع",
                                                    "من تاريخ",
                                                    "إلى تاريخ",
                                                    "الإجراءات",
                                                ].map((heading) => (
                                                    <th
                                                        key={heading}
                                                        className="whitespace-nowrap px-4 py-4 font-bold"
                                                    >
                                                        {heading}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-gray-100">
                                            {filteredCoordinators.map(
                                                (coordinator, index) => (
                                                    <tr
                                                        key={coordinator.id}
                                                        className="transition hover:bg-orange-50"
                                                    >
                                                        <td className="whitespace-nowrap px-4 py-4">
                                                            {index + 1}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-800">
                                                            {coordinator.name ?? "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-4">
                                                            {coordinator.mother_company_name ??
                                                                coordinator.mother_company ??
                                                                "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-4">
                                                            {coordinator.advertising_company_name ??
                                                                coordinator.advertising_company ??
                                                                "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-4">
                                                            {coordinator.national_id_number ?? "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-4">
                                                            {coordinator.branch_name ??
                                                                coordinator.branch ??
                                                                "-"}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-4">
                                                            {formatDate(coordinator.from_date)}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-4">
                                                            {formatDate(coordinator.to_date)}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-4">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDelete(coordinator.id)
                                                                }
                                                                disabled={
                                                                    deletingId === coordinator.id
                                                                }
                                                                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {deletingId === coordinator.id
                                                                    ? "جاري الحذف..."
                                                                    : "حذف"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                    </section>
                </div>
            </main>

            {/* ADVERTISING COMPANIES MODAL */}

            {companyModalOpen && (
                <div
                    dir="rtl"
                    className="fixed inset-0 z-70 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
                    onClick={() => {
                        setCompanyModalOpen(false);
                        setCompanyActionError("");
                    }}
                >
                    <div
                        className="my-8 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-orange-600">
                                إدارة الشركات الإعلانية
                            </h2>

                            <button
                                type="button"
                                onClick={() => {
                                    setCompanyModalOpen(false);
                                    setCompanyActionError("");
                                }}
                                className="text-gray-500 transition hover:text-red-600"
                            >
                                إغلاق ✕
                            </button>
                        </div>

                        {/* CREATE COMPANY */}

                        {canCreateAdvertisingCompany && (
                            <form
                                onSubmit={handleCreateCompany}
                                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                            >
                                <label className="mb-2 block font-semibold text-gray-700">
                                    اسم الشركة الإعلانية
                                </label>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <input
                                        type="text"
                                        value={newCompanyName}
                                        onChange={(event) => {
                                            setNewCompanyName(event.target.value);
                                            setCompanyActionError("");
                                        }}
                                        placeholder="أدخل اسم الشركة"
                                        maxLength={150}
                                        required
                                        className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                                    />

                                    <button
                                        type="submit"
                                        disabled={
                                            companySaving ||
                                            !newCompanyName.trim()
                                        }
                                        className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {companySaving
                                            ? "جاري الإضافة..."
                                            : "إضافة"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {companyActionError && (
                            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                {companyActionError}
                            </div>
                        )}

                        {/* COMPANY LIST */}

                        <div className="mt-6">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800">
                                    الشركات الإعلانية
                                </h3>

                                <span className="text-sm text-gray-500">
                                    {companies.length} شركة
                                </span>
                            </div>

                            {companiesLoading ? (
                                <p className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
                                    جاري تحميل الشركات...
                                </p>
                            ) : companies.length === 0 ? (
                                <p className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
                                    لا توجد شركات إعلانية.
                                </p>
                            ) : (
                                <div className="max-h-80 space-y-2 overflow-y-auto">
                                    {companies.map((company) => (
                                        <div
                                            key={company.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-orange-50"
                                        >
                                            <div>
                                                <p className="font-semibold text-gray-800">
                                                    {company.name}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-500">
                                                    رقم الشركة: {company.id}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteCompany(company.id)
                                                }
                                                disabled={
                                                    deletingCompanyId === company.id
                                                }
                                                className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {deletingCompanyId === company.id
                                                    ? "جاري الحذف..."
                                                    : "حذف"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setCompanyModalOpen(false);
                                    setCompanyActionError("");
                                }}
                                className="rounded-lg border border-gray-300 px-5 py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE TEMPORARY COORDINATOR MODAL */}

            <CreateTemporaryCoordinatorModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleCreate}
                companies={companies}
                saving={saving}
            />
        </>
    );
}

export default TemporaryCoordinators;
