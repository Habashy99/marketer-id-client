
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../components/header.jsx";
import { sendHttpReq } from "../../lib/httpHandler.jsx";
import { API_BASE_URL } from "../../lib/apiBase.js";
import { useAuth } from "../../context/authContext.jsx";
import { hasPermission, isAdmin } from "../../helpers/permissions.jsx";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 100;
const APPLICANTS_PAGE_SIZE = 50;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function requestData(url, method = "GET", body) {
  const response = await sendHttpReq(url, method, body);

  if (response && typeof response.json === "function") {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "حدث خطأ أثناء تنفيذ الطلب.");
    }

    return data;
  }

  if (response?.ok === false) {
    throw new Error(response.message || "حدث خطأ أثناء تنفيذ الطلب.");
  }

  return response ?? {};
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "object") {
    return value.text ?? value.value ?? "-";
  }

  return String(value);
}

function normalizeDigits(value) {
  return String(value ?? "").replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

    const arabicIndex = arabicDigits.indexOf(digit);

    if (arabicIndex !== -1) {
      return String(arabicIndex);
    }

    const persianIndex = persianDigits.indexOf(digit);

    if (persianIndex !== -1) {
      return String(persianIndex);
    }

    return digit;
  });
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString("en-GB");
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function RecuritmentManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const admin = isAdmin(user);
  const canView = admin || hasPermission(user, 39);

  /* ---------------------------------------------------------------------- */
  /* Excel States                                                           */
  /* ---------------------------------------------------------------------- */

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [jobId, setJobId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* ---------------------------------------------------------------------- */
  /* Saved Applicants                                                       */
  /* ---------------------------------------------------------------------- */

  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantsError, setApplicantsError] = useState("");

  const [applicantsPage, setApplicantsPage] = useState(1);

  const [applicantsPagination, setApplicantsPagination] = useState({
    page: 1,
    limit: APPLICANTS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  /* ---------------------------------------------------------------------- */
  /* Excel Search & Pagination                                               */
  /* ---------------------------------------------------------------------- */

  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  const filteredResults = normalizedSearch
    ? results.filter((row) => {
        const searchableText = [
          row.serialNumber,
          row.rowNumber,
          row.name,
          row.nationalId,
          row.decision,
          row.reason,
        ]
          .map(formatValue)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
    : results;

  const totalResults = filteredResults.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalResults);

  const currentResults = filteredResults.slice(startIndex, endIndex);

  const pageNumbers = [];
  const firstPage = Math.max(1, safeCurrentPage - 2);
  const lastPage = Math.min(totalPages, safeCurrentPage + 2);

  for (let page = firstPage; page <= lastPage; page++) {
    pageNumbers.push(page);
  }

  /* ---------------------------------------------------------------------- */
  /* Add Applicant Modal                                                     */
  /* ---------------------------------------------------------------------- */

  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [applicantLoading, setApplicantLoading] = useState(false);
  const [securityChecking, setSecurityChecking] = useState(false);

  const [applicantForm, setApplicantForm] = useState({
    name: "",
    nationalId: "",
    mobile: "",
    applicationDate: "",
  });

  const [securityCheck, setSecurityCheck] = useState({
    checkedNationalId: "",
    exists: false,
    blocked: false,
    message: "",
    notes: "",
  });

  const [applicantError, setApplicantError] = useState("");
  const [applicantSuccess, setApplicantSuccess] = useState("");

  /* ---------------------------------------------------------------------- */
  /* Edit Applicant Modal                                                    */
  /* ---------------------------------------------------------------------- */

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // التعديل مسموح للاسم ورقم التليفون فقط.
  // الرقم القومي للعرض فقط ولا يتم إرساله في طلب التعديل.
  const [editForm, setEditForm] = useState({
    name: "",
    mobile: "",
  });

  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  /* ---------------------------------------------------------------------- */
  /* Delete Applicant                                                        */
  /* ---------------------------------------------------------------------- */

  const [deletingApplicantId, setDeletingApplicantId] = useState(null);

  /* ---------------------------------------------------------------------- */
  /* Load Applicants                                                         */
  /* ---------------------------------------------------------------------- */

  const loadApplicants = async (page = 1) => {
    setApplicantsLoading(true);
    setApplicantsError("");

    try {
      const data = await requestData(
        `recuritment/applicants?page=${page}&limit=${APPLICANTS_PAGE_SIZE}`,
      );

      setApplicants(Array.isArray(data.data) ? data.data : []);

      setApplicantsPagination(
        data.pagination || {
          page,
          limit: APPLICANTS_PAGE_SIZE,
          total: Array.isArray(data.data) ? data.data.length : 0,
          totalPages: 1,
        },
      );

      setApplicantsPage(page);
    } catch (err) {
      console.error("Load recruitment applicants error:", err);
      setApplicantsError(err.message || "تعذر تحميل المتقدمين المحفوظين.");
    } finally {
      setApplicantsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      loadApplicants(1);
    }
  }, [canView]);

  /* ---------------------------------------------------------------------- */
  /* Add Applicant Helpers                                                   */
  /* ---------------------------------------------------------------------- */

  const resetApplicantForm = () => {
    setApplicantForm({
      name: "",
      nationalId: "",
      mobile: "",
      applicationDate: "",
    });

    setSecurityCheck({
      checkedNationalId: "",
      exists: false,
      blocked: false,
      message: "",
      notes: "",
    });

    setApplicantError("");
    setApplicantSuccess("");
    setSecurityChecking(false);
  };

  const closeApplicantModal = () => {
    if (applicantLoading || securityChecking) return;

    setShowApplicantModal(false);
    resetApplicantForm();
  };

  const openApplicantModal = () => {
    resetApplicantForm();
    setShowApplicantModal(true);
  };

  const updateApplicantField = (field, value) => {
    setApplicantForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setApplicantError("");
    setApplicantSuccess("");

    if (field === "nationalId") {
      setSecurityCheck({
        checkedNationalId: "",
        exists: false,
        blocked: false,
        message: "",
        notes: "",
      });
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Security Check                                                         */
  /* ---------------------------------------------------------------------- */

  const checkApplicantSecurity = async (value, force = false) => {
    const nationalId = normalizeDigits(value).trim();

    if (!/^\d{14}$/.test(nationalId)) {
      setSecurityCheck({
        checkedNationalId: "",
        exists: false,
        blocked: false,
        message: "",
        notes: "",
      });

      if (nationalId.length > 0) {
        setApplicantError("الرقم القومي يجب أن يتكون من 14 رقمًا بالضبط.");
      }

      return false;
    }

    if (!force && securityCheck.checkedNationalId === nationalId) {
      return !securityCheck.exists;
    }

    setSecurityChecking(true);
    setApplicantError("");
    setApplicantSuccess("");

    try {
      const baseUrl = API_BASE_URL.replace(/\/+$/, "");

      const response = await fetch(
        `${baseUrl}/security/check-national-id/${encodeURIComponent(nationalId)}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "تعذر التحقق من الرقم القومي.");
      }

      const exists = Boolean(data.exists);

      setSecurityCheck({
        checkedNationalId: nationalId,
        exists,
        blocked: Boolean(data.blocked),
        message: data.message || "",
        notes: data.notes || "",
      });

      if (exists) {
        setApplicantError(
          "هذا المتقدم موجود في جدول الأمن، لذلك تم رفض إضافته.",
        );

        return false;
      }

      setApplicantSuccess(
        "الرقم القومي غير موجود في جدول الأمن، ويمكن استكمال البيانات.",
      );

      return true;
    } catch (err) {
      console.error("Applicant security check error:", err);

      setSecurityCheck({
        checkedNationalId: "",
        exists: false,
        blocked: false,
        message: "",
        notes: "",
      });

      setApplicantError(
        err.message || "حدث خطأ أثناء التحقق من الرقم القومي.",
      );

      return false;
    } finally {
      setSecurityChecking(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Save New Applicant                                                      */
  /* ---------------------------------------------------------------------- */

  const handleApplicantSubmit = async (event) => {
    event.preventDefault();

    setApplicantError("");
    setApplicantSuccess("");

    const name = applicantForm.name.trim();
    const nationalId = normalizeDigits(applicantForm.nationalId).trim();
    const mobile = normalizeDigits(applicantForm.mobile).trim();
    const applicationDate = applicantForm.applicationDate;

    if (!name) {
      setApplicantError("من فضلك أدخل اسم المتقدم.");
      return;
    }

    if (!/^\d{14}$/.test(nationalId)) {
      setApplicantError("الرقم القومي يجب أن يتكون من 14 رقمًا بالضبط.");
      return;
    }

    if (!mobile) {
      setApplicantError("من فضلك أدخل رقم التليفون.");
      return;
    }

    if (mobile.length > 20) {
      setApplicantError("رقم التليفون يجب ألا يزيد عن 20 حرفًا.");
      return;
    }

    if (!applicationDate) {
      setApplicantError("من فضلك اختر تاريخ التقديم.");
      return;
    }

    setApplicantLoading(true);

    try {
      const isSecurityClear = await checkApplicantSecurity(nationalId, true);

      if (!isSecurityClear) return;

      const applicantData = {
        name,
        nationalId,
        mobile,
        applicationDate,
        decision: "مقبول",
        reason: "لا يوجد سجل له في سجلات الأمن",
      };

      const saved = await requestData(
        "recuritment/applicants",
        "POST",
        applicantData,
      );

      setApplicantSuccess(
        saved.message || "تم حفظ المتقدم بنجاح، وتم تسجيله مقبولًا.",
      );

      await loadApplicants(1);

      setTimeout(() => {
        setShowApplicantModal(false);
        resetApplicantForm();
      }, 700);
    } catch (err) {
      console.error("Save applicant error:", err);
      setApplicantError(err.message || "حدث خطأ أثناء حفظ بيانات المتقدم.");
    } finally {
      setApplicantLoading(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Open Edit Modal                                                         */
  /* ---------------------------------------------------------------------- */

  const openEditModal = (applicant) => {
    setEditingApplicant(applicant);

    setEditForm({
      name: applicant.name || "",
      mobile: normalizeDigits(applicant.mobile ?? ""),
    });

    setEditError("");
    setEditSuccess("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editLoading) return;

    setShowEditModal(false);
    setEditingApplicant(null);

    setEditForm({
      name: "",
      mobile: "",
    });

    setEditError("");
    setEditSuccess("");
  };

  const updateEditField = (field, value) => {
    setEditForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setEditError("");
    setEditSuccess("");
  };

  /* ---------------------------------------------------------------------- */
  /* Update Applicant                                                        */
  /* ---------------------------------------------------------------------- */

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editingApplicant?.id) {
      setEditError("تعذر تحديد المتقدم المراد تعديله.");
      return;
    }

    setEditError("");
    setEditSuccess("");

    const name = editForm.name.trim();
    const mobile = normalizeDigits(editForm.mobile).trim();

    if (!name) {
      setEditError("اسم المتقدم مطلوب.");
      return;
    }

    if (!mobile) {
      setEditError("رقم التليفون مطلوب.");
      return;
    }

    if (mobile.length > 20) {
      setEditError("رقم التليفون يجب ألا يزيد عن 20 حرفًا.");
      return;
    }

    setEditLoading(true);

    try {
      // نرسل الاسم ورقم التليفون فقط.
      // الرقم القومي وباقي البيانات لا يتم تعديلها.
      const updated = await requestData(
        `recuritment/applicants/${editingApplicant.id}`,
        "PUT",
        {
          name,
          mobile,
        },
      );

      await loadApplicants(applicantsPage);

      setEditSuccess(
        updated.message || "تم تعديل الاسم ورقم التليفون بنجاح.",
      );

      setTimeout(() => {
        setShowEditModal(false);
        setEditingApplicant(null);

        setEditForm({
          name: "",
          mobile: "",
        });
      }, 700);
    } catch (err) {
      console.error("Update applicant error:", err);
      setEditError(err.message || "حدث خطأ أثناء تعديل بيانات المتقدم.");
    } finally {
      setEditLoading(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Delete Applicant                                                        */
  /* ---------------------------------------------------------------------- */

  const handleDeleteApplicant = async (applicant) => {
    if (!applicant?.id) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المتقدم "${applicant.name}"؟\n\nسيتم إخفاؤه من قائمة المتقدمين المسجلين.`,
    );

    if (!confirmed) return;

    setDeletingApplicantId(applicant.id);
    setApplicantsError("");

    try {
      const deleted = await requestData(
        `recuritment/applicants/${applicant.id}`,
        "DELETE",
      );

      const nextPage =
        applicants.length === 1 && applicantsPage > 1
          ? applicantsPage - 1
          : applicantsPage;

      await loadApplicants(nextPage);

      setMessage(deleted.message || "تم حذف المتقدم بنجاح.");
      setError("");
    } catch (err) {
      console.error("Delete applicant error:", err);
      setApplicantsError(err.message || "حدث خطأ أثناء حذف المتقدم.");
    } finally {
      setDeletingApplicantId(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Upload & Check Excel                                                    */
  /* ---------------------------------------------------------------------- */

  const handleCheck = async (event) => {
    event.preventDefault();

    if (!file) {
      setError("من فضلك اختر ملف Excel أولاً.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setResults([]);
    setSummary(null);
    setJobId(null);
    setCurrentPage(1);
    setSearch("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await requestData("recuritment/check", "POST", formData);

      setResults(Array.isArray(data.results) ? data.results : []);
      setSummary(data.summary || null);
      setJobId(data.jobId || null);
      setCurrentPage(1);

      setMessage(data.message || "تم فحص الملف بنجاح.");
    } catch (err) {
      console.error("Recruitment check error:", err);
      setError(err.message || "حدث خطأ أثناء فحص الملف.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Download Excel                                                          */
  /* ---------------------------------------------------------------------- */

  const handleDownload = async () => {
    if (!jobId) {
      setError("لا توجد نتيجة فحص متاحة للتنزيل.");
      return;
    }

    try {
      setDownloading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL.replace(/\/+$/, "")}/recuritment/download/${jobId}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "تعذر تنزيل ملف Excel.");
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("الملف الناتج فارغ.");
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = "recruitment_results.xlsx";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Excel download error:", err);
      setError(err.message || "تعذر تنزيل ملف Excel.");
    } finally {
      setDownloading(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Excel Pagination                                                        */
  /* ---------------------------------------------------------------------- */

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  /* ---------------------------------------------------------------------- */
  /* Permission                                                              */
  /* ---------------------------------------------------------------------- */

  if (!canView) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-100">
        <Header />

        <div className="mx-auto max-w-4xl p-6">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-red-700">
              ليس لديك صلاحية الوصول إلى إدارة التعيينات
            </h2>

            <button
              onClick={() => navigate(-1)}
              className="mt-5 rounded-xl bg-slate-800 px-6 py-2.5 font-semibold text-white hover:bg-slate-700"
            >
              رجوع
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-800">
      <Header />

      <main className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
        {/* Page Header */}

        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              إدارة التعيينات
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              رفع ملفات المتقدمين ومراجعة موقفهم الأمني قبل التعيين
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openApplicantModal}
              className="rounded-xl bg-indigo-700 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-indigo-800"
            >
              + إضافة متقدم
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              رجوع
            </button>
          </div>
        </section>

        {/* Saved Applicants Table */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                المتقدمون المسجلون
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                إجمالي المتقدمين المحفوظين:{" "}
                {applicantsPagination.total ?? applicants.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadApplicants(applicantsPage)}
              disabled={applicantsLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {applicantsLoading ? "جاري التحديث..." : "تحديث الجدول"}
            </button>
          </div>

          {applicantsError && (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {applicantsError}
            </div>
          )}

          <div className="max-h-130 overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-800 text-white">
                <tr>
                  <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                    م
                  </th>
                  <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                    الاسم
                  </th>
                  <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                    الرقم القومي
                  </th>
                  <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                    رقم التليفون
                  </th>
                  <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                    تاريخ التقديم
                  </th>
                  <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                    قرار التعيين
                  </th>
                  <th className="min-w-64 border-l border-slate-600 px-4 py-3 text-center">
                    سبب القرار
                  </th>
                  <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                    تاريخ التسجيل
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">
                    الإجراءات
                  </th>
                </tr>
              </thead>

              <tbody>
                {applicants.map((applicant, index) => (
                  <tr
                    key={applicant.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-500">
                      {(applicantsPage - 1) *
                        (applicantsPagination.limit || APPLICANTS_PAGE_SIZE) +
                        index +
                        1}
                    </td>

                    <td className="min-w-56 px-4 py-3 text-center font-semibold text-slate-800">
                      {formatValue(applicant.name)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-center font-mono">
                      {formatValue(
                        applicant.nationalId ?? applicant.national_id,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      {formatValue(applicant.mobile)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      {formatDate(
                        applicant.applicationDate ??
                          applicant.application_date,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <DecisionBadge decision={applicant.decision} />
                    </td>

                    <td className="min-w-64 max-w-96 px-4 py-3 text-center leading-6 text-slate-600">
                      <span className="line-clamp-3">
                        {formatValue(applicant.reason)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-center text-slate-500">
                      {formatDate(
                        applicant.createdAt ?? applicant.created_at,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(applicant)}
                          disabled={deletingApplicantId === applicant.id}
                          title="تعديل الاسم ورقم التليفون"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                        >
                          <span>✏️</span>
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteApplicant(applicant)}
                          disabled={
                            deletingApplicantId === applicant.id ||
                            applicantsLoading
                          }
                          title="حذف المتقدم"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <span>🗑️</span>
                          {deletingApplicantId === applicant.id
                            ? "جاري الحذف..."
                            : "حذف"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!applicantsLoading && applicants.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      لا يوجد متقدمون مسجلون حتى الآن.
                    </td>
                  </tr>
                )}

                {applicantsLoading && applicants.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      جاري تحميل المتقدمين...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Applicants Pagination */}

          {(applicantsPagination.totalPages || 1) > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                صفحة {applicantsPage} من {applicantsPagination.totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadApplicants(applicantsPage - 1)}
                  disabled={applicantsPage <= 1 || applicantsLoading}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  السابق
                </button>

                <button
                  type="button"
                  onClick={() => loadApplicants(applicantsPage + 1)}
                  disabled={
                    applicantsPage >= applicantsPagination.totalPages ||
                    applicantsLoading
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Upload Excel */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              رفع ملف المتقدمين
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              اختر ملف Excel يحتوي على الأعمدة: الاسم، الرقم القومي، تاريخ،
              حالة.
            </p>
          </div>

          <form
            onSubmit={handleCheck}
            className="flex flex-col gap-4 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                ملف Excel
              </label>

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setError("");
                  setMessage("");
                }}
                className="block w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm file:ml-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-700"
              />

              {file && (
                <p className="mt-2 text-xs text-slate-500">
                  الملف المختار: {file.name}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="min-w-44 rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "جاري الفحص..." : "رفع وفحص الملف"}
            </button>
          </form>

          <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm leading-7 text-blue-800">
            <strong>ملاحظة:</strong> يتم رفع الملف مرة واحدة فقط. بعد انتهاء
            الفحص ستظهر جميع البيانات هنا، ويمكنك تنزيل ملف Excel الناتج دون
            إعادة رفع الملف.
          </div>
        </section>

        {/* Messages */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {message && !error && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}

        {/* Excel Summary */}

        {summary && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="إجمالي المتقدمين"
              value={summary.total}
              color="slate"
            />

            <SummaryCard
              title="مقبول"
              value={summary.accepted}
              color="green"
            />

            <SummaryCard
              title="مرفوض"
              value={summary.rejected}
              color="red"
            />

            <SummaryCard
              title="رقم قومي غير صحيح"
              value={summary.invalid}
              color="amber"
            />
          </section>
        )}

        {/* Excel Results */}

        {results.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  نتائج فحص المتقدمين
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  إجمالي السجلات: {results.length}
                  {" | "}
                  نتائج البحث: {totalResults}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={!jobId || downloading}
                className="rounded-xl bg-green-700 px-5 py-2.5 font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {downloading ? "جاري تجهيز التنزيل..." : "تنزيل ملف Excel"}
              </button>
            </div>

            {/* Search */}

            <div className="border-b border-slate-200 bg-white p-4">
              <div className="relative max-w-xl">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="ابحث بالاسم أو الرقم القومي أو القرار أو السبب..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {/* Results Table */}

            <div className="max-h-162.5 overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-800 text-white">
                  <tr>
                    <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                      م
                    </th>
                    <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                      الاسم
                    </th>
                    <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                      الرقم القومي
                    </th>
                    <th className="whitespace-nowrap border-l border-slate-600 px-4 py-3 text-center">
                      قرار التعيين
                    </th>
                    <th className="min-w-64 border-l border-slate-600 px-4 py-3 text-center">
                      سبب القرار
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentResults.map((row, rowIndex) => (
                    <tr
                      key={
                        row.rowNumber ??
                        row.serialNumber ??
                        startIndex + rowIndex
                      }
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-500">
                        {row.serialNumber ?? startIndex + rowIndex + 1}
                      </td>

                      <td className="min-w-64 px-4 py-3 text-right font-medium text-slate-800">
                        {formatValue(row.name)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-center font-mono">
                        {formatValue(row.nationalId)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <DecisionBadge decision={row.decision} />
                      </td>

                      <td className="min-w-64 px-4 py-3 text-right text-slate-600">
                        {formatValue(row.reason)}
                      </td>
                    </tr>
                  ))}

                  {currentResults.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        لا توجد نتائج مطابقة للبحث.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Excel Pagination */}

            {totalResults > 0 && (
              <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  عرض <strong>{startIndex + 1}</strong> إلى{" "}
                  <strong>{endIndex}</strong> من{" "}
                  <strong>{totalResults}</strong> سجل
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    الأولى
                  </button>

                  <button
                    type="button"
                    onClick={() => goToPage(safeCurrentPage - 1)}
                    disabled={safeCurrentPage === 1}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    السابق
                  </button>

                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToPage(page)}
                      className={`min-w-10 rounded-lg px-3 py-2 text-sm font-bold transition ${
                        page === safeCurrentPage
                          ? "bg-indigo-700 text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => goToPage(safeCurrentPage + 1)}
                    disabled={safeCurrentPage === totalPages}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    التالي
                  </button>

                  <button
                    type="button"
                    onClick={() => goToPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    الأخيرة
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
              يتم عرض 100 سجل فقط في الصفحة لتحسين سرعة التصفح. ملف Excel يحتوي
              على جميع نتائج الفحص.
            </div>
          </section>
        )}

        {/* Empty Excel State */}

        {!loading && !summary && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="text-4xl">📄</div>

            <h3 className="mt-4 font-bold text-slate-700">
              لا توجد بيانات لعرضها
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              ارفع ملف Excel لبدء فحص المتقدمين.
            </p>
          </section>
        )}
      </main>

      {/* ============================================================== */}
      {/* Add Applicant Modal                                             */}
      {/* ============================================================== */}

      {showApplicantModal && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeApplicantModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-800 px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-extrabold">إضافة متقدم جديد</h2>

                <p className="mt-1 text-sm text-slate-300">
                  أدخل بيانات المتقدم للتحقق من موقفه الأمني
                </p>
              </div>

              <button
                type="button"
                onClick={closeApplicantModal}
                disabled={applicantLoading || securityChecking}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-white transition hover:bg-white/10 disabled:opacity-50"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleApplicantSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Name */}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    اسم المتقدم
                    <span className="mr-1 text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    value={applicantForm.name}
                    onChange={(event) =>
                      updateApplicantField("name", event.target.value)
                    }
                    maxLength={200}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* National ID */}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    الرقم القومي
                    <span className="mr-1 text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    value={applicantForm.nationalId}
                    onChange={(event) =>
                      updateApplicantField(
                        "nationalId",
                        normalizeDigits(event.target.value)
                          .replace(/\D/g, "")
                          .slice(0, 14),
                      )
                    }
                    onBlur={() => {
                      if (applicantForm.nationalId.length === 14) {
                        checkApplicantSecurity(applicantForm.nationalId);
                      }
                    }}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center font-mono text-base tracking-wider outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    يجب إدخال 14 رقمًا.
                  </p>

                  {securityChecking && (
                    <p className="mt-2 text-sm font-semibold text-blue-700">
                      جاري التحقق من الرقم القومي...
                    </p>
                  )}
                </div>

                {/* Mobile */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    رقم التليفون
                    <span className="mr-1 text-red-500">*</span>
                  </label>

                  <input
                    type="tel"
                    inputMode="tel"
                    maxLength={20}
                    value={applicantForm.mobile}
                    onChange={(event) =>
                      updateApplicantField(
                        "mobile",
                        normalizeDigits(event.target.value).slice(0, 20),
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Application Date */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    تاريخ التقديم
                    <span className="mr-1 text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    value={applicantForm.applicationDate}
                    onChange={(event) =>
                      updateApplicantField(
                        "applicationDate",
                        event.target.value,
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {applicantError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
                  <span className="text-lg">!</span>
                  <p>{applicantError}</p>
                </div>
              )}

              {applicantSuccess && !applicantError && (
                <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold leading-6 text-green-700">
                  <span className="text-lg">✓</span>
                  <p>{applicantSuccess}</p>
                </div>
              )}

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                <p className="font-bold">ملاحظة</p>

                <p className="mt-1">
                  يتم التحقق من الرقم القومي في قاعدة بيانات الأمن. إذا لم يكن
                  له سجل في الأمن، سيتم حفظ المتقدم بقرار «مقبول» وسبب «لا يوجد
                  سجل له في سجلات الأمن».
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeApplicantModal}
                  disabled={applicantLoading || securityChecking}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إغلاق
                </button>

                <button
                  type="submit"
                  disabled={
                    applicantLoading ||
                    securityChecking ||
                    securityCheck.exists
                  }
                  className="rounded-xl bg-indigo-700 px-7 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {applicantLoading ? "جاري الحفظ..." : "حفظ المتقدم"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Edit Applicant Modal                                            */}
      {/* ============================================================== */}

      {showEditModal && (
        <div
          className="fixed inset-0 z-110 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Edit Header */}

            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-800 px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-extrabold">
                  تعديل بيانات المتقدم
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  يمكنك تعديل الاسم ورقم التليفون فقط
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={editLoading}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-white transition hover:bg-white/10 disabled:opacity-50"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>

            {/* Edit Form */}

            <form onSubmit={handleEditSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-5">
                {/* Name */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    اسم المتقدم
                    <span className="mr-1 text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(event) =>
                      updateEditField("name", event.target.value)
                    }
                    maxLength={200}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* National ID - Read Only */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    الرقم القومي
                  </label>

                  <input
                    type="text"
                    value={formatValue(
                      editingApplicant?.nationalId ??
                        editingApplicant?.national_id,
                    )}
                    readOnly
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-center font-mono text-base tracking-wider text-slate-500"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    الرقم القومي ثابت ولا يمكن تعديله.
                  </p>
                </div>

                {/* Mobile */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    رقم التليفون
                    <span className="mr-1 text-red-500">*</span>
                  </label>

                  <input
                    type="tel"
                    inputMode="tel"
                    maxLength={20}
                    value={editForm.mobile}
                    onChange={(event) =>
                      updateEditField(
                        "mobile",
                        normalizeDigits(event.target.value).slice(0, 20),
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {editError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
                  <span className="text-lg">!</span>
                  <p>{editError}</p>
                </div>
              )}

              {editSuccess && (
                <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold leading-6 text-green-700">
                  <span className="text-lg">✓</span>
                  <p>{editSuccess}</p>
                </div>
              )}

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                يتم تعديل الاسم ورقم التليفون فقط. لن يتم تغيير الرقم القومي
                أو تاريخ التقديم أو قرار التعيين أو سبب القرار. يتم تسجيل
                الموظف الذي قام بالتعديل وتاريخ التعديل تلقائيًا.
              </div>

              {/* Edit Actions */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editLoading}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-xl bg-indigo-700 px-7 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {editLoading ? "جاري حفظ التعديلات..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Summary Card                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({ title, value, color }) {
  const colors = {
    slate: "border-slate-200 bg-white text-slate-800",
    green: "border-green-200 bg-green-50 text-green-800",
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors[color]}`}>
      <p className="text-sm font-semibold opacity-80">{title}</p>
      <p className="mt-3 text-3xl font-extrabold tabular-nums">
        {value ?? 0}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Decision Badge                                                             */
/* -------------------------------------------------------------------------- */

function DecisionBadge({ decision }) {
  let style = "bg-slate-100 text-slate-700";

  if (decision === "مقبول") {
    style = "bg-green-100 text-green-800";
  } else if (decision === "مرفوض") {
    style = "bg-red-100 text-red-800";
  } else if (decision === "رقم قومي غير صحيح") {
    style = "bg-amber-100 text-amber-800";
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${style}`}
    >
      {formatValue(decision)}
    </span>
  );
}
