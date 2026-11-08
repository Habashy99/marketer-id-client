import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../../components/header";
import SearchableSelect from "../../../components/SearchableSelect";
import { sendHttpReq } from "../../../lib/httpHandler";
import { useAuth } from "../../../context/authContext";
import { hasPermission } from "../../../helpers/permissions";

// Temporary dummy data
const INITIAL_DATA = [
  {
    id: 1,
    serial_number: 221,
    name: "أحمد محمد علي",
    national_id_number: "29901011234567",
    job: "مندوب",
    company_name: "جملة ماركت",
    company_display_name: "جملة ماركت",
    advertising_company: "1",
    advertising_company_name: "شركة الدعاية الأولى",
    branch: "801",
    branch_name: "اكتوبر",
    governorate: "الإسكندرية",
    stolen_goods: "شيبسي",
    value_of_stolen_goods: "1000",
    file_type: "25",
    security_status: "سليم",
    notes: "لا توجد ملاحظات",
  },
  {
    id: 2,
    serial_number: 222,
    name: "محمد أحمد حسن",
    national_id_number: "29805051234567",
    job: "منسق",
    company_name: "جملة ماركت",
    company_display_name: "جملة ماركت",
    advertising_company: "2",
    advertising_company_name: "شركة الدعاية الثانية",
    branch: "802",
    branch_name: "السيوف",
    governorate: "الإسكندرية",
    stolen_goods: "زيت",
    value_of_stolen_goods: "500",
    file_type: "منسقين/مناديب",
    security_status: "تحت المراجعة",
    notes: "مطلوب مراجعة البيانات",
  },
  {
    id: 3,
    serial_number: 223,
    name: "سارة محمود",
    national_id_number: "30008081234567",
    job: "عميل",
    company_name: "شركة أخرى",
    company_display_name: "شركة أخرى",
    advertising_company: "3",
    advertising_company_name: "شركة الدعاية الثالثة",
    branch: "803",
    branch_name: "العجمي",
    governorate: "الإسكندرية",
    stolen_goods: "سكر",
    value_of_stolen_goods: "750",
    file_type: "منسقين/مناديب",
    security_status: "مرفوض",
    notes: "يرجى مراجعة سبب الرفض",
  },
];

const JOB_OPTIONS = ["عميل", "مندوب", "مندوبة", "منسق", "منسقة"];

const SECURITY_STATUSES = ["سليم", "تحت المراجعة", "مرفوض", "غير محدد"];

const GOVERNORATES = [
  "الإسكندرية",
  "القاهرة",
  "الجيزة",
  "البحيرة",
  "مطروح",
  "الغربية",
  "الدقهلية",
  "الشرقية",
];

const EMPTY_FORM = {
  name: "",
  national_id_number: "",
  job: "عميل",
  company_name: "",
  company_display_name: "",
  advertising_company: "",
  advertising_company_name: "",
  branch: "",
  branch_name: "",
  governorate: "",
  stolen_goods: "",
  value_of_stolen_goods: "",
  file_type: "",
  security_status: "غير محدد",
  notes: "",
};

export default function SecurityManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Permissions
  const canViewSecurity = hasPermission(user, 35);
  const canCreateSecurity = hasPermission(user, 34);
  const canEditSecurity = hasPermission(user, 36);
  const canDeleteSecurity = hasPermission(user, 37);

  // Records
  const [rows, setRows] = useState(INITIAL_DATA);

  // Filters
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Dropdown options
  const [branches, setBranches] = useState([]);
  const [advertisingCompanies, setAdvertisingCompanies] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");

  // Load branches and advertising companies
  useEffect(() => {
    async function loadOptions() {
      if (!canViewSecurity) return;

      setOptionsLoading(true);

      try {
        const [branchesData, companiesData] = await Promise.all([
          sendHttpReq("retail/branches"),
          sendHttpReq("advertising-companies"),
        ]);

        setBranches(
          Array.isArray(branchesData)
            ? branchesData
            : Array.isArray(branchesData?.branches)
              ? branchesData.branches
              : [],
        );

        setAdvertisingCompanies(
          Array.isArray(companiesData?.companies)
            ? companiesData.companies
            : Array.isArray(companiesData)
              ? companiesData
              : [],
        );
      } catch (err) {
        console.error("Failed to load security form options:", err);
      } finally {
        setOptionsLoading(false);
      }
    }

    loadOptions();
  }, [canViewSecurity]);

  // Branch options
  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: String(branch.id ?? branch.branch),
        label: String(branch.a_name ?? branch.name ?? ""),
      })),
    [branches],
  );

  // Advertising company options
  const advertisingCompanyOptions = useMemo(
    () =>
      advertisingCompanies.map((company) => ({
        value: String(company.id),
        label: String(company.name ?? ""),
      })),
    [advertisingCompanies],
  );

  // Get branch name
  function getBranchName(item) {
    const branchId = String(item.branch ?? "").trim();

    return (
      item.branch_name ||
      branchOptions.find((option) => option.value === branchId)?.label ||
      (branchId && !/^\d+$/.test(branchId) ? branchId : "") ||
      "-"
    );
  }

  // Get advertising company name
  function getAdvertisingCompanyName(item) {
    const companyId = String(item.advertising_company ?? "").trim();

    return (
      item.advertising_company_name ||
      advertisingCompanyOptions.find((option) => option.value === companyId)
        ?.label ||
      (companyId && !/^\d+$/.test(companyId) ? companyId : "") ||
      "-"
    );
  }

  // Get main company name
  function getCompanyName(item) {
    return (
      item.company_display_name ||
      item.supplier_name ||
      (item.company_name && !/^\d+$/.test(String(item.company_name))
        ? item.company_name
        : "") ||
      "-"
    );
  }

  // Filter records
  const filteredRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return rows.filter((item) => {
      const searchableValues = [
        item.id,
        item.serial_number,
        item.name,
        item.national_id_number,
        item.job,
        getCompanyName(item),
        getAdvertisingCompanyName(item),
        getBranchName(item),
        item.governorate,
        item.stolen_goods,
        item.value_of_stolen_goods,
        item.file_type,
        item.security_status,
        item.notes,
      ];

      const matchesSearch =
        !searchValue ||
        searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(searchValue),
        );

      const matchesJob = !jobFilter || item.job === jobFilter;

      const matchesStatus =
        !statusFilter || item.security_status === statusFilter;

      return matchesSearch && matchesJob && matchesStatus;
    });
  }, [
    rows,
    search,
    jobFilter,
    statusFilter,
    branchOptions,
    advertisingCompanyOptions,
  ]);

  // Open create modal
  function openCreateModal() {
    if (!canCreateSecurity) return;

    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setModalOpen(true);
  }

  // Open edit modal
  function openEditModal(item) {
    if (!canEditSecurity) return;

    // Use database id internally
    setEditingId(item.id);

    setForm({
      ...EMPTY_FORM,
      ...item,
      company_display_name:
        getCompanyName(item) === "-" ? "" : getCompanyName(item),
      branch_name: getBranchName(item) === "-" ? "" : getBranchName(item),
      advertising_company_name:
        getAdvertisingCompanyName(item) === "-"
          ? ""
          : getAdvertisingCompanyName(item),
    });

    setError("");
    setModalOpen(true);
  }

  // Close modal
  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
  }

  // Handle normal inputs
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Handle searchable selects
  function handleSelectChange(name, value, label = "") {
    const nameFields = {
      company_name: "company_display_name",
      advertising_company: "advertising_company_name",
      branch: "branch_name",
    };

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(nameFields[name] && {
        [nameFields[name]]: label,
      }),
    }));
  }

  // Submit form
  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (editingId !== null && !canEditSecurity) {
      setError("ليس لديك صلاحية تعديل السجلات.");
      return;
    }

    if (editingId === null && !canCreateSecurity) {
      setError("ليس لديك صلاحية إضافة سجل جديد.");
      return;
    }

    if (!form.name.trim()) {
      setError("يرجى إدخال الاسم.");
      return;
    }

    if (!form.national_id_number.trim()) {
      setError("يرجى إدخال الرقم القومي.");
      return;
    }

    if (!/^\d{14}$/.test(form.national_id_number)) {
      setError("الرقم القومي يجب أن يتكون من 14 رقمًا.");
      return;
    }

    if (!form.job) {
      setError("يرجى اختيار الوظيفة.");
      return;
    }

    if (
      form.value_of_stolen_goods &&
      (Number(form.value_of_stolen_goods) < 0 ||
        !Number.isFinite(Number(form.value_of_stolen_goods)))
    ) {
      setError("يرجى إدخال قيمة صحيحة للبضاعة.");
      return;
    }

    const record = {
      ...form,
      branch_name:
        branchOptions.find((option) => option.value === String(form.branch))
          ?.label || form.branch_name,
      advertising_company_name:
        advertisingCompanyOptions.find(
          (option) => option.value === String(form.advertising_company),
        )?.label || form.advertising_company_name,
    };

    // Temporary local state until API integration
    if (editingId !== null) {
      // Update using id and preserve serial_number
      setRows((previous) =>
        previous.map((item) =>
          item.id === editingId
            ? {
                ...record,
                id: editingId,
                serial_number: item.serial_number,
              }
            : item,
        ),
      );
    } else {
      // Generate the next id and serial number independently
      setRows((previous) => {
        const newId =
          Math.max(0, ...previous.map((item) => Number(item.id) || 0)) + 1;

        const newSerialNumber =
          Math.max(
            0,
            ...previous.map((item) => Number(item.serial_number) || 0),
          ) + 1;

        return [
          {
            ...record,
            id: newId,
            serial_number: newSerialNumber,
          },
          ...previous,
        ];
      });
    }

    closeModal();
  }

  // Delete record using id
  function handleDelete(id) {
    if (!canDeleteSecurity) return;

    const confirmed = window.confirm("هل أنت متأكد من حذف هذا السجل؟");

    if (!confirmed) return;

    // Temporary local state until API integration
    setRows((previous) => previous.filter((item) => item.id !== id));
  }

  // Clear filters
  function handleClearFilters() {
    setSearch("");
    setJobFilter("");
    setStatusFilter("");
  }

  // Security status styling
  function getStatusStyle(status) {
    switch (status) {
      case "سليم":
        return "bg-green-100 text-green-700";

      case "تحت المراجعة":
        return "bg-yellow-100 text-yellow-700";

      case "مرفوض":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  // Prevent unauthorized access
  if (!canViewSecurity) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-100">
        <Header />

        <div className="flex min-h-[70vh] items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
            <h2 className="text-xl font-bold text-red-600">
              غير مسموح لك بعرض سجلات الأمن
            </h2>

            <p className="mt-2 text-gray-500">
              ليس لديك الصلاحية المطلوبة للوصول إلى هذه الصفحة.
            </p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-5 rounded-lg bg-orange-600 px-5 py-2 text-white hover:bg-orange-700"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100">
      <Header />

      <main className="mx-auto max-w-[1800px] p-4 sm:p-6">
        {/* Page Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-orange-700">إدارة الأمن</h1>

            <p className="mt-1 text-sm text-gray-500">
              إدارة ومتابعة بيانات الأشخاص والمواقف الأمنية
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/marketing")}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              العودة لنظام التسويق
            </button>

            {canCreateSecurity && (
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-orange-700"
              >
                + إضافة سجل جديد
              </button>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="إجمالي السجلات" value={rows.length} color="orange" />

          <StatCard
            title="سليم"
            value={
              rows.filter((item) => item.security_status === "سليم").length
            }
            color="green"
          />

          <StatCard
            title="تحت المراجعة"
            value={
              rows.filter((item) => item.security_status === "تحت المراجعة")
                .length
            }
            color="yellow"
          />

          <StatCard
            title="مرفوض"
            value={
              rows.filter((item) => item.security_status === "مرفوض").length
            }
            color="red"
          />
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم أو الرقم القومي أو السبب..."
              className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
            />

            <select
              value={jobFilter}
              onChange={(event) => setJobFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value="">كل الوظائف</option>

              {JOB_OPTIONS.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value="">كل المواقف الأمنية</option>

              {SECURITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 hover:bg-gray-100"
            >
              مسح الفلاتر
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <h2 className="font-bold text-gray-800">سجلات الأمن</h2>

            <span className="text-sm text-gray-500">
              عدد النتائج: {filteredRows.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1800px] text-right text-sm">
              <thead className="bg-orange-50 text-gray-700">
                <tr>
                  {[
                    "رقم التسلسل",
                    "الاسم",
                    "الرقم القومي",
                    "الوظيفة",
                    "الشركة الأم",
                    "شركة الدعاية",
                    "الفرع",
                    "المحافظة",
                    "البضاعة المسروقة",
                    "قيمة البضاعة",
                    "نوع الملف",
                    "الموقف الأمني",
                    "ملاحظات",
                    "الإجراءات",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-3 font-bold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={15}
                      className="py-10 text-center text-gray-500"
                    >
                      لا توجد سجلات مطابقة.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {/* Display serial_number, never id */}
                      <td className="px-4 py-3">{item.serial_number}</td>

                      <td className="whitespace-nowrap px-4 py-3 font-semibold">
                        {item.name}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-mono">
                        {item.national_id_number}
                      </td>

                      <td className="px-4 py-3">{item.job || "-"}</td>

                      <td className="px-4 py-3">{getCompanyName(item)}</td>

                      <td className="px-4 py-3">
                        {getAdvertisingCompanyName(item)}
                      </td>

                      <td className="px-4 py-3">{getBranchName(item)}</td>

                      <td className="px-4 py-3">{item.governorate || "-"}</td>

                      <td className="px-4 py-3">{item.stolen_goods || "-"}</td>

                      <td className="px-4 py-3">
                        {item.value_of_stolen_goods || "-"}
                      </td>

                      <td className="px-4 py-3">{item.file_type || "-"}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            item.security_status,
                          )}`}
                        >
                          {item.security_status || "غير محدد"}
                        </span>
                      </td>

                      <td className="max-w-45 truncate px-4 py-3">
                        {item.notes || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {canEditSecurity && (
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="ml-2 rounded-md bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100"
                          >
                            تعديل
                          </button>
                        )}

                        {canDeleteSecurity && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="rounded-md bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100"
                          >
                            حذف
                          </button>
                        )}

                        {!canEditSecurity && !canDeleteSecurity && (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
              <h2 className="text-xl font-bold text-orange-700">
                {editingId !== null
                  ? "تعديل بيانات السجل"
                  : "إضافة سجل أمني جديد"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl text-gray-500 hover:text-red-600"
              >
                اغلاق
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField label="الاسم" required>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="الاسم بالكامل"
                    className="form-input"
                  />
                </FormField>

                <FormField label="الرقم القومي" required>
                  <input
                    name="national_id_number"
                    value={form.national_id_number}
                    onChange={handleChange}
                    maxLength={14}
                    inputMode="numeric"
                    placeholder="14 رقم"
                    className="form-input"
                  />
                </FormField>

                <FormField label="الوظيفة" required>
                  <select
                    name="job"
                    value={form.job}
                    onChange={handleChange}
                    className="form-input"
                  >
                    {JOB_OPTIONS.map((job) => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* Main Company */}
                <FormField label="الشركة الأم">
                  <SearchableSelect
                    endpoint="retail/suppliers/search"
                    value={form.company_name}
                    initialOption={
                      form.company_name && form.company_display_name
                        ? {
                            value: String(form.company_name),
                            label: form.company_display_name,
                          }
                        : null
                    }
                    onChange={(value, option) =>
                      handleSelectChange(
                        "company_name",
                        value,
                        option?.label || "",
                      )
                    }
                    placeholder="ابحث عن الشركة..."
                    isClearable
                  />
                </FormField>

                {/* Advertising Company */}
                <FormField label="شركة الدعاية">
                  <SearchableSelect
                    options={advertisingCompanyOptions}
                    value={form.advertising_company}
                    onChange={(value, option) =>
                      handleSelectChange(
                        "advertising_company",
                        value,
                        option?.label || "",
                      )
                    }
                    placeholder="اختر شركة الدعاية"
                    isDisabled={optionsLoading}
                    isClearable
                  />
                </FormField>

                {/* Branch */}
                <FormField label="الفرع">
                  <SearchableSelect
                    options={branchOptions}
                    value={form.branch}
                    onChange={(value, option) =>
                      handleSelectChange("branch", value, option?.label || "")
                    }
                    placeholder="اختر الفرع"
                    isDisabled={optionsLoading}
                    isClearable
                  />
                </FormField>

                <FormField label="المحافظة">
                  <select
                    name="governorate"
                    value={form.governorate}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">اختر المحافظة</option>

                    {GOVERNORATES.map((governorate) => (
                      <option key={governorate} value={governorate}>
                        {governorate}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="البضاعة المسروقة">
                  <input
                    name="stolen_goods"
                    value={form.stolen_goods}
                    onChange={handleChange}
                    placeholder="اسم البضاعة"
                    className="form-input"
                  />
                </FormField>

                <FormField label="قيمة البضاعة">
                  <input
                    name="value_of_stolen_goods"
                    type="number"
                    min="0"
                    value={form.value_of_stolen_goods}
                    onChange={handleChange}
                    placeholder="قيمة البضاعة"
                    className="form-input"
                  />
                </FormField>

                <FormField label="نوع الملف">
                  <input
                    name="file_type"
                    value={form.file_type}
                    onChange={handleChange}
                    placeholder="نوع الملف"
                    className="form-input"
                  />
                </FormField>

                <FormField label="الموقف الأمني">
                  <select
                    name="security_status"
                    value={form.security_status}
                    onChange={handleChange}
                    className="form-input"
                  >
                    {SECURITY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </FormField>

                <div className="md:col-span-2 lg:col-span-3">
                  <FormField label="ملاحظات">
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="أدخل أي ملاحظات إضافية..."
                      className="form-input resize-y"
                    />
                  </FormField>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-5 py-2 hover:bg-gray-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-6 py-2 font-semibold text-white hover:bg-orange-700"
                >
                  {editingId !== null ? "حفظ التعديلات" : "إضافة السجل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Input Styles */}
      <style>{`
        .form-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          outline: none;
          background: white;
        }

        .form-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 2px rgb(249 115 22 / 12%);
        }
      `}</style>
    </div>
  );
}

function FormField({ label, required = false, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}

        {required && <span className="mr-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    orange: "border-orange-500 text-orange-700",
    green: "border-green-500 text-green-700",
    yellow: "border-yellow-500 text-yellow-700",
    red: "border-red-500 text-red-700",
  };

  return (
    <div
      className={`rounded-xl border-r-4 bg-white p-4 shadow-sm ${colors[color]}`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
