
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../../components/header";
import { hasPermission } from "../../../helpers/permissions";
import { useAuth } from "../../../context/authContext";
import { sendHttpReq } from "../../../lib/httpHandler";

import CoordinatorsToolbar from "../../../components/coordinators/CoordinatorsToolbar";
import CoordinatorsTable from "../../../components/coordinators/CoordinatorsTable";
import CoordinatorDetailsModal from "../../../components/coordinators/CoordinatorDetailsModal";
import CreateCoordinatorModal from "../../../components/coordinators/CreateCoordinatorModal";
import CreateExceptionModal from "../../../components/coordinators/CreateExceptionModal";
import DeleteExceptionModal from "../../../components/coordinators/DeleteExceptionModal";
import PrintCoordinatorModal from "../../../components/coordinators/PrintCoordinatorModal";

import {
    groupCoordinators,
    normalizeJob,
} from "../../../helpers/coordinatorHelpers";

const ADVERTISING_COMPANIES_URL = "advertising-companies";
const BRANCHES_URL = "retail/branches";

export default function CoordinatorsManagement() {
    const { user } = useAuth();
    const navigate = useNavigate();
    // Permissions
    const canAddCoordinator = hasPermission(user, 8);
    const canAddException = hasPermission(user, 9);
    const canDeleteException = hasPermission(user, 10);
    const canViewCoordinators = hasPermission(user, 11);

    // Main data
    const [rows, setRows] = useState([]);
    const [advertisingCompanies, setAdvertisingCompanies] = useState([]);
    const [branches, setBranches] = useState([]);

    // Loading and messages
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    // Toolbar filters
    const [search, setSearch] = useState("");
    const [job, setJob] = useState("");
    const [filter, setFilter] = useState("");

    const [company, setCompany] = useState("");
    const [advertisingCompanyId, setAdvertisingCompanyId] = useState("");
    const [branch, setBranch] = useState("");

    // Applied filters
    const [appliedCompany, setAppliedCompany] = useState("");
    const [
        appliedAdvertisingCompanyId,
        setAppliedAdvertisingCompanyId,
    ] = useState("");
    const [appliedBranch, setAppliedBranch] = useState("");

    // Selected items
    const [selectedCoordinator, setSelectedCoordinator] = useState(null);
    const [coordinatorToPrint, setCoordinatorToPrint] = useState(null);

    // Modals
    const [createCoordinatorOpen, setCreateCoordinatorOpen] = useState(false);
    const [createExceptionOpen, setCreateExceptionOpen] = useState(false);
    const [deleteExceptionOpen, setDeleteExceptionOpen] = useState(false);

    // Load coordinators
    const loadCoordinators = useCallback(async () => {
        const data = await sendHttpReq("coordinators");

        if (!Array.isArray(data?.coordinators)) {
            throw new Error("استجابة الخادم لا تحتوي على قائمة المنسقين.");
        }

        setRows(data.coordinators);

        return data.coordinators;
    }, []);

    // Load advertising companies
    const loadAdvertisingCompanies = useCallback(async () => {
        const data = await sendHttpReq(ADVERTISING_COMPANIES_URL);

        if (!Array.isArray(data?.companies)) {
            throw new Error("استجابة الخادم لا تحتوي على شركات الدعاية.");
        }

        setAdvertisingCompanies(data.companies);
    }, []);

    // Load branches only.
    // Suppliers are loaded dynamically through SearchableSelect.
    const loadBranches = useCallback(async () => {
        const data = await sendHttpReq(BRANCHES_URL);

        if (!Array.isArray(data)) {
            throw new Error("تعذر تحميل قائمة الفروع.");
        }

        setBranches(data);
    }, []);

    // Initial loading / refresh
    const loadAllData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const results = await Promise.allSettled([
                loadCoordinators(),
                loadAdvertisingCompanies(),
                loadBranches(),
            ]);

            const failed = results.find(
                (result) => result.status === "rejected"
            );

            if (failed) {
                console.error("Loading error:", failed.reason);

                setError(
                    failed.reason?.message ||
                    "حدث خطأ أثناء تحميل البيانات."
                );
            }
        } finally {
            setLoading(false);
        }
    }, [
        loadCoordinators,
        loadAdvertisingCompanies,
        loadBranches,
    ]);

    useEffect(() => {
        if (canViewCoordinators) {
            loadAllData();
        } else {
            setLoading(false);
        }
    }, [canViewCoordinators, loadAllData]);

    // Group coordinators and exceptions
    const coordinators = useMemo(
        () => groupCoordinators(rows),
        [rows]
    );

    // Apply filters
    const filteredCoordinators = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return coordinators.filter((coordinator) => {
            const matchesSearch =
                !searchValue ||
                [
                    coordinator.code,
                    coordinator.name,
                    coordinator.mobile,
                    coordinator.supplier_name,
                    coordinator.governorate,
                    coordinator.national_id_number,
                    coordinator.branch_name,
                    coordinator.advertising_company_name,
                ].some((value) =>
                    String(value ?? "")
                        .toLowerCase()
                        .includes(searchValue)
                );

            const matchesJob =
                !job ||
                normalizeJob(coordinator.job) === normalizeJob(job);

            const inactive =
                String(coordinator.states ?? "").trim() === "غير مفعل";

            let expiredCertificate = false;

            if (coordinator.health_certificate_expiry_date) {
                const expiry = new Date(
                    coordinator.health_certificate_expiry_date
                );

                if (!Number.isNaN(expiry.getTime())) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    expiry.setHours(0, 0, 0, 0);

                    expiredCertificate = expiry < today;
                }
            }

            const matchesFilter =
                filter !== "expired" ||
                inactive ||
                expiredCertificate;
            const normalizeText = (value) =>
                String(value ?? "")
                    .trim()
                    .replace(/\s+/g, " ")
                    .toLowerCase();

            const matchesCompany =
                !normalizeText(appliedCompany) ||
                normalizeText(coordinator.supplier_name).includes(
                    normalizeText(appliedCompany)
                ) ||
                normalizeText(coordinator.company_name) ===
                normalizeText(appliedCompany);

            const matchesAdvertisingCompany =
                !appliedAdvertisingCompanyId ||
                Number(coordinator.advertising_company_id) ===
                Number(appliedAdvertisingCompanyId);

            const matchesBranch =
                !normalizeText(appliedBranch) ||
                normalizeText(coordinator.branch_name).includes(
                    normalizeText(appliedBranch)
                ) ||
                normalizeText(coordinator.branch) ===
                normalizeText(appliedBranch);
            return (
                matchesSearch &&
                matchesJob &&
                matchesFilter &&
                matchesCompany &&
                matchesAdvertisingCompany &&
                matchesBranch
            );
        });
    }, [
        coordinators,
        search,
        job,
        filter,
        appliedCompany,
        appliedAdvertisingCompanyId,
        appliedBranch,
    ]);

    // Create coordinator
    async function handleCreateCoordinator(formData) {
        setSaving(true);
        setError("");
        setNotice("");

        try {
            const data = await sendHttpReq(
                "coordinators/createCoordinator",
                "POST",
                formData
            );

            setCreateCoordinatorOpen(false);
            setNotice(data.message || "تم إنشاء المنسق بنجاح.");

            await loadCoordinators();
        } catch (err) {
            setError(err.message || "فشل إنشاء المنسق.");
            throw err;
        } finally {
            setSaving(false);
        }
    }

    // Create exception
    async function handleCreateException(formData) {
        setSaving(true);
        setError("");
        setNotice("");

        try {
            const data = await sendHttpReq(
                "exceptions/createException",
                "POST",
                formData
            );

            setCreateExceptionOpen(false);
            setNotice(data.message || "تمت إضافة الاستثناء بنجاح.");

            await loadCoordinators();
        } catch (err) {
            setError(err.message || "فشل إضافة الاستثناء.");
            throw err;
        } finally {
            setSaving(false);
        }
    }

    // Delete exception
    const handleDeleteException = async (data) => {
        setSaving(true);
        setError("");
        setNotice("");

        try {
            const response = await sendHttpReq(
                "exceptions/deleteException",
                "DELETE",
                {
                    coordinatorId: data.coordinatorId,
                    exceptionId: data.exceptionId,
                }
            );

            await loadCoordinators();

            setDeleteExceptionOpen(false);
            setNotice(response.message || "تم حذف الاستثناء بنجاح.");

            return response;
        } catch (err) {
            setError(err.message || "فشل حذف الاستثناء.");
            throw err;
        } finally {
            setSaving(false);
        }
    };

    // Update coordinator
    async function handleUpdateCoordinator(formData) {
        setSaving(true);
        setError("");
        setNotice("");

        try {
            const data = await sendHttpReq(
                "coordinators/updateCoordinator",
                "PUT",
                formData
            );

            const updatedId = Number(formData.get("id"));
            const updatedRows = await loadCoordinators();

            const updatedCoordinator = updatedRows.find(
                (item) => Number(item.id) === updatedId
            );

            setSelectedCoordinator(updatedCoordinator || null);
            setNotice(data.message || "تم تحديث بيانات المنسق بنجاح.");
        } catch (err) {
            setError(err.message || "فشل تحديث بيانات المنسق.");
            throw err;
        } finally {
            setSaving(false);
        }
    }

    // Refresh all data
    async function handleRefresh() {
        await loadAllData();
    }

    // Clear filters
    function handleClearFilters() {
        setSearch("");
        setJob("");
        setFilter("");

        setCompany("");
        setAdvertisingCompanyId("");
        setBranch("");

        setAppliedCompany("");
        setAppliedAdvertisingCompanyId("");
        setAppliedBranch("");
    }

    if (!canViewCoordinators) {
        return (
            <div dir="rtl" className="min-h-screen bg-gray-100">
                <Header />

                <div className="mx-auto mt-10 max-w-xl rounded-lg bg-white p-6 text-center shadow">
                    <h2 className="text-xl font-bold text-red-600">
                        ليس لديك صلاحية لعرض المنسقين.
                    </h2>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" className="min-h-screen bg-gray-100">
            <Header />

            <main className="mx-auto max-w-[1800px] p-4 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold text-orange-700">
                        إدارة المنسقين والمندوبين
                    </h1>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => navigate("/marketing")}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-100"
                        >
                            العودة لنظام التسويق
                        </button>

                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading}
                            className="rounded-lg border border-orange-600 px-4 py-2 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                        >
                            {loading ? "جاري التحديث..." : "تحديث البيانات"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"
                    >
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() => setError("")}
                            className="font-bold"
                        >
                            ×
                        </button>
                    </div>
                )}

                {notice && (
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
                        <span>{notice}</span>

                        <button
                            type="button"
                            onClick={() => setNotice("")}
                            className="font-bold"
                        >
                            ×
                        </button>
                    </div>
                )}

                <CoordinatorsToolbar
                    search={search}
                    setSearch={setSearch}
                    job={job}
                    setJob={setJob}
                    filter={filter}
                    setFilter={setFilter}
                    company={company}
                    setCompany={setCompany}
                    onFilterCompany={() =>
                        setAppliedCompany(company.trim())
                    }
                    advertisingCompanyId={advertisingCompanyId}
                    setAdvertisingCompanyId={setAdvertisingCompanyId}
                    advertisingCompanies={advertisingCompanies}
                    onFilterAdvertisingCompany={() =>
                        setAppliedAdvertisingCompanyId(
                            advertisingCompanyId
                        )
                    }
                    branch={branch}
                    setBranch={setBranch}
                    onFilterBranch={() =>
                        setAppliedBranch(branch.trim())
                    }
                    onCreateCoordinator={() =>
                        setCreateCoordinatorOpen(true)
                    }
                    onCreateException={() =>
                        setCreateExceptionOpen(true)
                    }
                    onDeleteException={() =>
                        setDeleteExceptionOpen(true)
                    }
                    canAddCoordinator={canAddCoordinator}
                    canAddException={canAddException}
                    canDeleteException={canDeleteException}
                />

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                    <div>
                        عدد المنسقين:{" "}
                        <strong>{filteredCoordinators.length}</strong>
                    </div>

                    <button
                        type="button"
                        onClick={handleClearFilters}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50"
                    >
                        مسح الفلاتر
                    </button>
                </div>

                <CoordinatorsTable
                    coordinators={filteredCoordinators}
                    loading={loading}
                    onSelectCoordinator={setSelectedCoordinator}
                    onPrintCoordinator={setCoordinatorToPrint}
                />
                <CreateCoordinatorModal
                    open={createCoordinatorOpen}
                    onClose={() => setCreateCoordinatorOpen(false)}
                    onSubmit={handleCreateCoordinator}
                    saving={saving}
                    branches={branches}
                    advertisingCompanies={advertisingCompanies}
                />

                <CreateExceptionModal
                    open={createExceptionOpen}
                    onClose={() => setCreateExceptionOpen(false)}
                    onSubmit={handleCreateException}
                    coordinators={coordinators}
                    saving={saving}
                />

                <DeleteExceptionModal
                    open={deleteExceptionOpen}
                    onClose={() => setDeleteExceptionOpen(false)}
                    onSubmit={handleDeleteException}
                    coordinators={coordinators}
                    saving={saving}
                />
                <CoordinatorDetailsModal
                    coordinator={selectedCoordinator}
                    onClose={() => setSelectedCoordinator(null)}
                    onSave={handleUpdateCoordinator}
                    saving={saving}
                    advertisingCompanies={advertisingCompanies}
                    branches={branches}
                />

                {coordinatorToPrint && (
                    <PrintCoordinatorModal
                        coordinator={coordinatorToPrint}
                        onClose={() => setCoordinatorToPrint(null)}
                    />
                )}
            </main>
        </div>
    );
}
