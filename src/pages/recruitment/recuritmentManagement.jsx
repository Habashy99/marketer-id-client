
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../components/header.jsx";
import { API_BASE_URL } from "../../lib/apiBase.js";
import { useAuth } from "../../context/authContext.jsx";
import { hasPermission, isAdmin } from "../../helpers/permissions.jsx";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 100;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function requestData(url, method = "GET", body) {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");

  const options = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}/${url.replace(/^\/+/, "")}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || "حدث خطأ أثناء تنفيذ الطلب.");
  }

  return data;
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

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-GB");
}

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function RecuritmentManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const canView = isAdmin(user) || hasPermission(user, 39);

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
  /* National ID Security Search                                             */
  /* ---------------------------------------------------------------------- */

  const [nationalId, setNationalId] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [securityResult, setSecurityResult] = useState(null);

  const handleNationalIdChange = (value) => {
    const normalized = normalizeDigits(value).replace(/\D/g, "").slice(0, 14);

    setNationalId(normalized);
    setSecurityError("");
    setSecurityResult(null);
  };

  const handleSecuritySearch = async (event) => {
    event.preventDefault();

    const normalized = normalizeDigits(nationalId).trim();

    if (!/^\d{14}$/.test(normalized)) {
      setSecurityError("الرقم القومي يجب أن يتكون من 14 رقمًا بالضبط.");
      setSecurityResult(null);
      return;
    }

    setSecurityLoading(true);
    setSecurityError("");
    setSecurityResult(null);

    try {
      const data = await requestData(
        `recuritment/check-national-id/${encodeURIComponent(normalized)}`,
      );

      setSecurityResult(data);
    } catch (err) {
      console.error("Security national ID search error:", err);
      setSecurityError(err.message || "تعذر البحث في سجلات الأمن.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const resetSecuritySearch = () => {
    setNationalId("");
    setSecurityResult(null);
    setSecurityError("");
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

      const data = await requestData(
        "recuritment/check",
        "POST",
        formData,
      );

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
        `${API_BASE_URL.replace(/\/+$/, "")}/recuritment/download/${encodeURIComponent(jobId)}`,
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
              العودة لنظام التسويق
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
              فحص ملفات التعيينات والتحقق من الموقف الأمني للمتقدمين
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            العودة لنظام التعيينات
          </button>
        </section>

        {/* ================================================================ */}
        {/* National ID Security Search                                      */}
        {/* ================================================================ */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 bg-slate-800 p-5 text-white">
            <h2 className="text-lg font-bold">
              البحث في سجلات الأمن
            </h2>

            <p className="mt-1 text-sm text-slate-300">
              أدخل الرقم القومي لمعرفة ما إذا كان للشخص سجل أمني والاطلاع على تفاصيله
            </p>
          </div>

          <div className="space-y-5 p-5">

            <form
              onSubmit={handleSecuritySearch}
              className="flex flex-col gap-3 md:flex-row md:items-end"
            >
              <div className="flex-1">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  الرقم القومي
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  value={nationalId}
                  onChange={(event) =>
                    handleNationalIdChange(event.target.value)
                  }
                  placeholder="أدخل الرقم القومي المكون من 14 رقمًا"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center font-mono text-lg tracking-widest outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <button
                type="submit"
                disabled={securityLoading}
                className="min-w-40 rounded-xl bg-indigo-700 px-6 py-3 font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {securityLoading ? "جاري البحث..." : "بحث"}
              </button>

              <button
                type="button"
                onClick={resetSecuritySearch}
                disabled={securityLoading}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                مسح
              </button>
            </form>

            {securityError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {securityError}
              </div>
            )}

            {securityResult && (
              <SecuritySearchResult data={securityResult} />
            )}

          </div>
        </section>

        {/* ================================================================ */}
        {/* Excel Upload                                                      */}
        {/* ================================================================ */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              رفع وفحص ملف Excel
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              يتم فحص الأرقام القومية الموجودة في الملف ومقارنتها بسجلات الأمن.
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
            الفحص ستظهر النتائج هنا، ويمكنك تنزيل ملف Excel الناتج دون إعادة رفع الملف.
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

        {/* ================================================================ */}
        {/* Excel Results                                                     */}
        {/* ================================================================ */}

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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Security Search Result                                                     */
/* -------------------------------------------------------------------------- */

function SecuritySearchResult({ data }) {
  const records = getArray(data.records);

  if (!data.exists || records.length === 0) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-xl text-green-700">
            ✓
          </span>

          <div>
            <h3 className="font-extrabold text-green-800">
              لا يوجد سجل أمني
            </h3>

            <p className="mt-1 text-sm text-green-700">
              الرقم القومي غير موجود ضمن سجلات الأمن.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-xl text-red-700">
            !
          </span>

          <div>
            <h3 className="font-extrabold text-red-800">
              يوجد سجل في سجلات الأمن
            </h3>

            <p className="mt-1 text-sm text-red-700">
              تم العثور على {records.length} سجل مرتبط بالرقم القومي.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-800">
          يتطلب مراجعة أمنية
        </span>
      </div>

      {records.map((person, index) => (
        <SecurityPersonCard
          key={person.id ?? index}
          person={person}
          index={index}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Security Person Card                                                        */
/* -------------------------------------------------------------------------- */

function SecurityPersonCard({ person, index }) {
  const incidents = getArray(person.incidents);
  const statusHistory = getArray(person.statusHistory);
  const permits = getArray(person.permits);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-5">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            سجل أمني رقم {index + 1}
          </p>

          <h3 className="mt-1 text-lg font-extrabold text-slate-900">
            {formatValue(person.name)}
          </h3>
        </div>

        <span className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
          {formatValue(person.security_situation)}
        </span>
      </div>

      <div className="space-y-6 p-5">

        {/* Basic Information */}

        <div>
          <SectionTitle title="البيانات الأساسية" />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="الاسم" value={person.name} />
            <InfoItem label="الرقم القومي" value={person.national_id_number} />
            <InfoItem label="الوظيفة" value={person.job} />
            <InfoItem label="تاريخ الميلاد" value={formatDate(person.birth_date)} />
            <InfoItem label="محل الميلاد" value={person.birth_place} />
            <InfoItem label="نوع الملف" value={person.file_type} />
            <InfoItem label="الشركة" value={person.company_display_name || person.company_name || person.advertising_company_name} />
            <InfoItem label="الفرع" value={person.branch_name || person.branch} />
            <InfoItem label="المحافظة" value={person.governorate} />
            <InfoItem label="تاريخ تسجيل السجل" value={formatDateTime(person.created_at)} />
            <InfoItem label="آخر تحديث" value={formatDateTime(person.updated_at)} />
          </div>

          {person.notes && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-800">
                ملاحظات السجل
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-amber-900">
                {person.notes}
              </p>
            </div>
          )}
        </div>

        {/* Incidents */}

        <div>
          <SectionTitle
            title="الوقائع والمخالفات"
            count={incidents.length}
          />

          {incidents.length === 0 ? (
            <EmptySection text="لا توجد وقائع مسجلة لهذا الشخص." />
          ) : (
            <div className="mt-3 space-y-3">
              {incidents.map((incident, incidentIndex) => (
                <div
                  key={incident.id ?? incidentIndex}
                  className="rounded-xl border border-red-200 bg-red-50/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-red-800">
                      واقعة رقم {incidentIndex + 1}
                    </h4>

                    <span className="text-xs font-semibold text-slate-500">
                      {formatDate(incident.incident_date)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem
                      label="الفرع"
                      value={incident.branch}
                    />

                    <InfoItem
                      label="قيمة المسروقات"
                      value={
                        incident.stolen_goods_value != null
                          ? `${incident.stolen_goods_value} جنيه`
                          : "-"
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <InfoItem
                      label="المسروقات"
                      value={incident.stolen_goods}
                    />
                  </div>

                  {incident.notes && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {incident.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status History */}

        <div>
          <SectionTitle
            title="تاريخ تغييرات الحالة الأمنية"
            count={statusHistory.length}
          />

          {statusHistory.length === 0 ? (
            <EmptySection text="لا يوجد سجل لتغييرات الحالة الأمنية." />
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-center">
                      الحالة السابقة
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center">
                      الحالة الجديدة
                    </th>
                    <th className="min-w-56 px-4 py-3 text-center">
                      سبب التغيير
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center">
                      تاريخ التغيير
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center">
                      المستخدم
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {statusHistory.map((item, historyIndex) => (
                    <tr
                      key={item.id ?? historyIndex}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {formatValue(item.old_status)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-center font-bold text-indigo-700">
                        {formatValue(item.new_status)}
                      </td>

                      <td className="min-w-56 px-4 py-3 text-center">
                        {formatValue(item.reason)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {formatDateTime(item.changed_at)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {formatValue(item.changed_by)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Permits */}

        <div>
          <SectionTitle
            title="التصاريح"
            count={permits.length}
          />

          {permits.length === 0 ? (
            <EmptySection text="لا توجد تصاريح مسجلة لهذا الشخص." />
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {permits.map((permit, permitIndex) => (
                <div
                  key={permit.id ?? permitIndex}
                  className="rounded-xl border border-blue-200 bg-blue-50/60 p-4"
                >
                  <h4 className="font-bold text-blue-900">
                    تصريح رقم {formatValue(permit.permit_number)}
                  </h4>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem label="الشركة" value={permit.company_name} />
                    <InfoItem label="الفرع" value={permit.branch} />
                    <InfoItem label="تاريخ الإصدار" value={formatDate(permit.issue_date)} />
                  </div>

                  {permit.notes && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {permit.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared UI Components                                                       */
/* -------------------------------------------------------------------------- */

function SectionTitle({ title, count }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
      <h4 className="font-extrabold text-slate-800">
        {title}
      </h4>

      {count !== undefined && (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {count}
        </span>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 wrap-break-word text-sm font-bold leading-6 text-slate-800">
        {formatValue(value)}
      </p>
    </div>
  );
}

function EmptySection({ text }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
      {text}
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
