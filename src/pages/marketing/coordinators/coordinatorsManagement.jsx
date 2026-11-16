
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

import { groupCoordinators } from "../../../helpers/coordinatorHelpers";

const ADVERTISING_COMPANIES_URL = "advertising-companies";
const BRANCHES_URL = "retail/branches";

const DEFAULT_PAGE_SIZE = 50;

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

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: DEFAULT_PAGE_SIZE,
    totalRecords: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  // Security details
  const [securityDetails, setSecurityDetails] = useState(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState("");

  // Loading and messages
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Toolbar filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  // Debounce search to avoid sending a request for every keystroke.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Load coordinators from the server using pagination and filters.
  const loadCoordinators = useCallback(
    async (requestedPage = page) => {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        params.set("page", String(requestedPage));
        params.set("limit", String(pageSize));

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }

        if (job) {
          params.set("job", job);
        }

        if (filter) {
          params.set("filter", filter);
        }

        if (appliedCompany) {
          params.set("supplierSearch", appliedCompany);
        }

        if (appliedAdvertisingCompanyId) {
          params.set(
            "advertisingCompanyId",
            appliedAdvertisingCompanyId,
          );
        }

        if (appliedBranch) {
          params.set("branchSearch", appliedBranch);
        }

        const data = await sendHttpReq(
          `coordinators?${params.toString()}`,
        );

        if (!Array.isArray(data?.coordinators)) {
          throw new Error(
            "استجابة الخادم لا تحتوي على قائمة المنسقين.",
          );
        }

        setRows(data.coordinators);

        const serverPagination = data.pagination;

        if (serverPagination) {
          setPagination(serverPagination);

          // The server may correct the page if it no longer exists.
          if (
            Number(serverPagination.currentPage) !== requestedPage
          ) {
            setPage(Number(serverPagination.currentPage) || 1);
          }
        } else {
          setPagination({
            currentPage: requestedPage,
            limit: pageSize,
            totalRecords: data.coordinators.length,
            totalPages: 1,
            hasPreviousPage: requestedPage > 1,
            hasNextPage: false,
          });
        }

        return data.coordinators;
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      pageSize,
      debouncedSearch,
      job,
      filter,
      appliedCompany,
      appliedAdvertisingCompanyId,
      appliedBranch,
    ],
  );

  // Load advertising companies.
  const loadAdvertisingCompanies = useCallback(async () => {
    const data = await sendHttpReq(ADVERTISING_COMPANIES_URL);

    if (!Array.isArray(data?.companies)) {
      throw new Error("استجابة الخادم لا تحتوي على شركات الدعاية.");
    }

    setAdvertisingCompanies(data.companies);
  }, []);

  // Load branches.
  const loadBranches = useCallback(async () => {
    const data = await sendHttpReq(BRANCHES_URL);

    if (!Array.isArray(data)) {
      throw new Error("تعذر تحميل قائمة الفروع.");
    }

    setBranches(data);
  }, []);

  // Load coordinators whenever page, page size, or applied filters change.
  useEffect(() => {
    if (!canViewCoordinators) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchCoordinators() {
      setError("");

      try {
        await loadCoordinators();
      } catch (err) {
        if (cancelled) return;

        console.error("Coordinators loading error:", err);

        setError(
          err.message || "حدث خطأ أثناء تحميل المنسقين.",
        );
      }
    }

    fetchCoordinators();

    return () => {
      cancelled = true;
    };
  }, [canViewCoordinators, loadCoordinators]);

  // Load supporting data once.
  useEffect(() => {
    if (!canViewCoordinators) return;

    let cancelled = false;

    async function loadSupportingData() {
      const results = await Promise.allSettled([
        loadAdvertisingCompanies(),
        loadBranches(),
      ]);

      if (cancelled) return;

      const failed = results.find(
        (result) => result.status === "rejected",
      );

      if (failed) {
        console.error(
          "Supporting data loading error:",
          failed.reason,
        );

        setError(
          failed.reason?.message ||
            "حدث خطأ أثناء تحميل البيانات المساعدة.",
        );
      }
    }

    loadSupportingData();

    return () => {
      cancelled = true;
    };
  }, [
    canViewCoordinators,
    loadAdvertisingCompanies,
    loadBranches,
  ]);

  // Load security details only when a coordinator is selected.
  useEffect(() => {
    let cancelled = false;

    const coordinatorId = selectedCoordinator?.id;

    if (!coordinatorId) {
      setSecurityDetails(null);
      setSecurityLoading(false);
      setSecurityError("");
      return;
    }

    async function loadSecurityDetails() {
      setSecurityLoading(true);
      setSecurityDetails(null);
      setSecurityError("");

      try {
        const data = await sendHttpReq(
          `coordinators/${encodeURIComponent(
            coordinatorId,
          )}/security-details`,
        );

        if (cancelled) return;

        setSecurityDetails(data?.securityDetails ?? null);
      } catch (err) {
        if (cancelled) return;

        console.error("Security details loading error:", err);

        setSecurityDetails(null);
        setSecurityError(
          err.message || "تعذر تحميل السجل الأمني.",
        );
      } finally {
        if (!cancelled) {
          setSecurityLoading(false);
        }
      }
    }

    loadSecurityDetails();

    return () => {
      cancelled = true;
    };
  }, [
    selectedCoordinator?.id,
    selectedCoordinator?.national_id_number,
  ]);

  // Group coordinators and their exceptions.
  const coordinators = useMemo(
    () => groupCoordinators(rows),
    [rows],
  );

  // Refresh all data.
  async function handleRefresh() {
    setError("");
    setNotice("");

    const results = await Promise.allSettled([
      loadCoordinators(),
      loadAdvertisingCompanies(),
      loadBranches(),
    ]);

    const failed = results.find(
      (result) => result.status === "rejected",
    );

    if (failed) {
      console.error("Refresh error:", failed.reason);

      setError(
        failed.reason?.message ||
          "حدث خطأ أثناء تحديث البيانات.",
      );
    } else {
      setNotice("تم تحديث البيانات بنجاح.");
    }
  }

  // Search and filter handlers.
  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleJobChange(value) {
    setJob(value);
    setPage(1);
  }

  function handleFilterChange(value) {
    setFilter(value);
    setPage(1);
  }

  function handleFilterCompany() {
    setAppliedCompany(company.trim());
    setPage(1);
  }

  function handleFilterAdvertisingCompany() {
    setAppliedAdvertisingCompanyId(advertisingCompanyId);
    setPage(1);
  }

  function handleFilterBranch() {
    setAppliedBranch(branch.trim());
    setPage(1);
  }

  function handlePageSizeChange(value) {
    const nextSize = Number(value);

    if (![25, 50, 100].includes(nextSize)) return;

    setPageSize(nextSize);
    setPage(1);
  }

  function handleClearFilters() {
    setSearch("");
    setDebouncedSearch("");

    setJob("");
    setFilter("");

    setCompany("");
    setAdvertisingCompanyId("");
    setBranch("");

    setAppliedCompany("");
    setAppliedAdvertisingCompanyId("");
    setAppliedBranch("");

    setPage(1);
  }

  // Create coordinator.
  async function handleCreateCoordinator(formData) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const data = await sendHttpReq(
        "coordinators/createCoordinator",
        "POST",
        formData,
      );

      setCreateCoordinatorOpen(false);
      setNotice(data.message || "تم إنشاء المنسق بنجاح.");

      setPage(1);
      await loadCoordinators(1);
    } catch (err) {
      setError(err.message || "فشل إنشاء المنسق.");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  // Create exception.
  async function handleCreateException(formData) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const data = await sendHttpReq(
        "exceptions/createException",
        "POST",
        formData,
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

  // Delete exception.
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
        },
      );

      await loadCoordinators();

      setDeleteExceptionOpen(false);
      setNotice(
        response.message || "تم حذف الاستثناء بنجاح.",
      );

      return response;
    } catch (err) {
      setError(err.message || "فشل حذف الاستثناء.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Update coordinator.
  async function handleUpdateCoordinator(formData) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const data = await sendHttpReq(
        "coordinators/updateCoordinator",
        "PUT",
        formData,
      );

      const updatedId = Number(formData.get("id"));

      const updatedRows = await loadCoordinators();

      const updatedCoordinator = updatedRows.find(
        (item) => Number(item.id) === updatedId,
      );

      setSelectedCoordinator(updatedCoordinator || null);

      setNotice(
        data.message || "تم تحديث بيانات المنسق بنجاح.",
      );
    } catch (err) {
      setError(err.message || "فشل تحديث بيانات المنسق.");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  // Close coordinator details and clear security data.
  function handleCloseCoordinatorDetails() {
    setSelectedCoordinator(null);
    setSecurityDetails(null);
    setSecurityLoading(false);
    setSecurityError("");
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

  const totalPages = Number(pagination.totalPages) || 0;
  const currentPage = Number(pagination.currentPage) || 1;
  const totalRecords = Number(pagination.totalRecords) || 0;

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
          setSearch={handleSearchChange}
          job={job}
          setJob={handleJobChange}
          filter={filter}
          setFilter={handleFilterChange}
          company={company}
          setCompany={setCompany}
          onFilterCompany={handleFilterCompany}
          advertisingCompanyId={advertisingCompanyId}
          setAdvertisingCompanyId={setAdvertisingCompanyId}
          advertisingCompanies={advertisingCompanies}
          onFilterAdvertisingCompany={
            handleFilterAdvertisingCompany
          }
          branch={branch}
          setBranch={setBranch}
          onFilterBranch={handleFilterBranch}
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
            إجمالي المنسقين:{" "}
            <strong>{totalRecords.toLocaleString("ar-EG")}</strong>

            <span className="mx-2 text-gray-400">|</span>

            عدد المنسقين في الصفحة:{" "}
            <strong>{coordinators.length.toLocaleString("ar-EG")}</strong>
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
          coordinators={coordinators}
          loading={loading}
          onSelectCoordinator={setSelectedCoordinator}
          onPrintCoordinator={setCoordinatorToPrint}
        />

        {/* Pagination controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
            <label htmlFor="coordinators-page-size">
              عدد النتائج في الصفحة:
            </label>

            <select
              id="coordinators-page-size"
              value={pageSize}
              onChange={(event) =>
                handlePageSizeChange(event.target.value)
              }
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span className="text-gray-500">
              صفحة {currentPage.toLocaleString("ar-EG")} من{" "}
              {(totalPages || 1).toLocaleString("ar-EG")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={
                loading ||
                currentPage <= 1 ||
                totalPages === 0
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              السابق
            </button>

            <span className="min-w-20 text-center text-sm text-gray-600">
              {currentPage.toLocaleString("ar-EG")}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1),
                )
              }
              disabled={
                loading ||
                totalPages === 0 ||
                currentPage >= totalPages
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>

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
          onClose={handleCloseCoordinatorDetails}
          onSave={handleUpdateCoordinator}
          saving={saving}
          advertisingCompanies={advertisingCompanies}
          branches={branches}
          securityDetails={securityDetails}
          securityLoading={securityLoading}
          securityError={securityError}
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
