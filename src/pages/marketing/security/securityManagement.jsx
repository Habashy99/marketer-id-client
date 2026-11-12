
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../../components/header";
import SearchableSelect from "../../../components/SearchableSelect";
import { sendHttpReq } from "../../../lib/httpHandler";
import { useAuth } from "../../../context/authContext";
import { hasPermission, isAdmin } from "../../../helpers/permissions";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const JOB_OPTIONS = ["عميل", "مندوب", "مندوبة", "منسق", "منسقة"];
const FILE_TYPE_OPTIONS = ["مناديب/منسقين", "25"];
const SECURITY_STATUSES = ["سليم", "تحت المراجعة", "بلوك", "غير محدد"];

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

const PAGE_SIZE = 100;

const EMPTY_FORM = {
  name: "",
  national_id_number: "",
  job: "عميل",
  branch: "",
  branch_name: "",
  governorate: "",
  stolen_goods: "",
  value_of_stolen_goods: "",
  incident_date: "",
  permit_number: "",
  permit_company_name: "",
  permit_issue_date: "",
  permit_branch: "",
  file_type: "25",
  security_status: "غير محدد",
  notes: "",
};

/* -------------------------------------------------------------------------- */
/* API Helpers                                                                */
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

/* -------------------------------------------------------------------------- */
/* Formatting Helpers                                                         */
/* -------------------------------------------------------------------------- */

function getDateInputValue(value) {
  if (!value) return "-";

  const date = String(value).slice(0, 10);

  return date === "1900-01-01" ? "-" : date;
}

function getFormDate(value) {
  const date = getDateInputValue(value);

  return date === "-" ? "" : date;
}

function getNormalizedStatus(status) {
  const value = String(status ?? "").trim();

  if (value === "مرفوض" || value === "غير سليم") return "بلوك";

  return value || "غير محدد";
}

function getItemStatus(item) {
  return getNormalizedStatus(
    item.security_status ?? item.security_situation ?? item.status,
  );
}

function getStatusStyle(status) {
  switch (getNormalizedStatus(status)) {
    case "سليم":
      return "bg-green-100 text-green-700";

    case "تحت المراجعة":
      return "bg-yellow-100 text-yellow-800";

    case "بلوك":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getNormalizedFileType(value) {
  const normalized = String(value ?? "").trim();

  if (normalized === "25") return "25";

  if (normalized === "مناديب/منسقين" || normalized === "مناديب/ منسقين") {
    return "مناديب/منسقين";
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* Coordinator Source Helpers                                                 */
/* -------------------------------------------------------------------------- */

// المصدر منفصل تمامًا عن الوظيفة.
// permanent = أساسي من جدول coordinator.
// temporary = مؤقت من جدول temporary_coordinator.

function getCoordinatorSourceType(item) {
  const sourceType = String(item?.source_type ?? "")
    .trim()
    .toLowerCase();

  if (sourceType === "temporary") return "temporary";
  if (sourceType === "permanent") return "permanent";

  return "";
}

function getCoordinatorSourceLabel(item) {
  const sourceType = getCoordinatorSourceType(item);

  if (sourceType === "temporary") return "مؤقت";
  if (sourceType === "permanent") return "أساسي";

  return item?.source_label || "-";
}

function getCoordinatorSourceStyle(item) {
  const sourceType = getCoordinatorSourceType(item);

  if (sourceType === "temporary") {
    return "bg-purple-100 text-purple-700";
  }

  if (sourceType === "permanent") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-gray-100 text-gray-600";
}

/* -------------------------------------------------------------------------- */
/* Record Helpers                                                             */
/* -------------------------------------------------------------------------- */

function getRecordType(item) {
  return String(item?.record_type ?? "")
    .trim()
    .toLowerCase();
}

function isIncident(item) {
  return getRecordType(item) === "incident";
}

function isPermit(item) {
  return getRecordType(item) === "permit";
}

function isPersonOnly(item) {
  return getRecordType(item) === "person";
}

function getRecordKey(item) {
  return `${getRecordType(item)}-${item?.source_record_id ?? item?.id}`;
}

function getRecordTitle(item) {
  if (isIncident(item)) return "تعديل الواقعة";

  if (isPermit(item)) return "تعديل التصريح";

  return "تعديل بيانات الشخص";
}

function getFileType(item) {
  if (isIncident(item)) return "25";

  if (isPermit(item)) return "مناديب/منسقين";

  return getNormalizedFileType(item.file_type) || item.file_type || "-";
}

/* -------------------------------------------------------------------------- */
/* Normalize Detailed Records                                                */
/* -------------------------------------------------------------------------- */

function normalizePersonRecord(person) {
  return {
    ...person,
    id: person.id,
    record_type: "person",
    company_name: person.company_id ?? person.company_name ?? "",
    advertising_company:
      person.advertising_company_id ?? person.advertising_company ?? "",
    security_status:
      person.security_status ?? person.security_situation ?? "غير محدد",
  };
}

function normalizeIncidentRecord(incident, person) {
  return {
    ...person,
    ...incident,
    id: incident.id,
    source_record_id: incident.id,
    person_id: incident.security_person_id ?? person.id,
    record_type: "incident",
    record_type_name: "واقعة",
    incident_branch: incident.branch ?? "",
    stolen_goods: incident.stolen_goods ?? "",
    value_of_stolen_goods: incident.stolen_goods_value ?? "",
    incident_date: incident.incident_date ?? "",
    notes: incident.notes ?? "",
    file_type: "25",
  };
}

function normalizePermitRecord(permit, person) {
  return {
    ...person,
    ...permit,
    id: permit.id,
    source_record_id: permit.id,
    person_id: permit.security_person_id ?? person.id,
    record_type: "permit",
    record_type_name: "تصريح",
    permit_number: permit.permit_number ?? "",
    permit_company_name: permit.company_name ?? "",
    permit_issue_date: permit.issue_date ?? "",
    permit_branch: permit.branch ?? "",
    notes: permit.notes ?? "",
    file_type: "مناديب/منسقين",
  };
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function SecurityManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* Permissions */

  const admin = isAdmin(user);

  const canViewSecurity = admin || hasPermission(user, 35);
  const canCreateSecurity = admin || hasPermission(user, 34);
  const canEditSecurity = admin || hasPermission(user, 36);
  const canDeleteSecurity = admin || hasPermission(user, 37);

  /* Records */

  const [rows, setRows] = useState([]);

  /* Pagination */

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  /* Filters */

  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("");

  /* Loading */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /* Messages */

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Dropdown Options */

  const [branches, setBranches] = useState([]);
  const [advertisingCompanies, setAdvertisingCompanies] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  /* Create / Edit Modal */

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");

  /* Related Edit Records */

  const [editTargets, setEditTargets] = useState([]);
  const [selectedEditKey, setSelectedEditKey] = useState("");
  const [loadingEditTargets, setLoadingEditTargets] = useState(false);
  const [editTargetsError, setEditTargetsError] = useState("");

  /* Coordinator Review */

  const [coordinatorModalOpen, setCoordinatorModalOpen] = useState(false);
  const [coordinatorRows, setCoordinatorRows] = useState([]);
  const [coordinatorLoading, setCoordinatorLoading] = useState(false);
  const [coordinatorSaving, setCoordinatorSaving] = useState(false);
  const [coordinatorError, setCoordinatorError] = useState("");
  const [coordinatorSuccess, setCoordinatorSuccess] = useState("");
  const [coordinatorSearch, setCoordinatorSearch] = useState("");

  const editingIncident = Boolean(editingRecord && isIncident(editingRecord));

  const editingPermit = Boolean(editingRecord && isPermit(editingRecord));

  const editingPerson = Boolean(editingRecord && isPersonOnly(editingRecord));

  const showPersonFields = !editingRecord || editingPerson;

  const showIncidentFields = Boolean(editingRecord && editingIncident);

  /* ------------------------------------------------------------------------ */
  /* Load Security Records                                                    */
  /* ------------------------------------------------------------------------ */

  const loadRecords = useCallback(async () => {
    if (!canViewSecurity) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      if (search.trim()) params.set("search", search.trim());
      if (jobFilter.trim()) params.set("job", jobFilter.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (fileTypeFilter) params.set("file_type", fileTypeFilter);

      const data = await requestData(`security?${params.toString()}`);

      setRows(Array.isArray(data.records) ? data.records : []);

      setPagination({
        page: data.pagination?.page ?? page,
        limit: data.pagination?.limit ?? PAGE_SIZE,
        total: data.pagination?.total ?? 0,
        totalPages: data.pagination?.totalPages ?? 0,
        hasNextPage: data.pagination?.hasNextPage ?? false,
        hasPreviousPage: data.pagination?.hasPreviousPage ?? page > 1,
      });
    } catch (err) {
      console.error("Load security records error:", err);

      setRows([]);
      setError(err.message || "تعذر تحميل سجلات الأمن.");
    } finally {
      setLoading(false);
    }
  }, [canViewSecurity, page, search, jobFilter, statusFilter, fileTypeFilter]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  /* ------------------------------------------------------------------------ */
  /* Load Branches and Advertising Companies                                 */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadOptions() {
      if (!canViewSecurity) return;

      setOptionsLoading(true);

      try {
        const [branchesData, companiesData] = await Promise.all([
          requestData("retail/branches"),
          requestData("advertising-companies"),
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

  /* ------------------------------------------------------------------------ */
  /* Dropdown Options                                                         */
  /* ------------------------------------------------------------------------ */

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: String(branch.id ?? branch.branch ?? ""),
        label: String(branch.a_name ?? branch.name ?? ""),
      })),
    [branches],
  );

  const advertisingCompanyOptions = useMemo(
    () =>
      advertisingCompanies.map((company) => ({
        value: String(company.id ?? ""),
        label: String(company.name ?? ""),
      })),
    [advertisingCompanies],
  );

  /* ------------------------------------------------------------------------ */
  /* Display Helpers                                                          */
  /* ------------------------------------------------------------------------ */

  function getBranchName(item) {
    const branchValue =
      item.incident_branch ??
      item.permit_branch ??
      item.person_branch ??
      item.branch ??
      "";

    const branchId = String(branchValue).trim();

    const matchedBranch = branchOptions.find(
      (option) => option.value === branchId,
    );

    return (
      matchedBranch?.label ||
      (branchId && !/^\d+$/.test(branchId) ? branchId : "") ||
      item.branch_name ||
      "-"
    );
  }

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

  /* ------------------------------------------------------------------------ */
  /* Build Form From Selected Record                                          */
  /* ------------------------------------------------------------------------ */

  function buildFormFromRecord(item) {
    const companyName = getCompanyName(item);
    const branchName = getBranchName(item);
    const advertisingCompanyName = getAdvertisingCompanyName(item);

    const branchValue =
      item.incident_branch ??
      item.permit_branch ??
      item.branch ??
      item.person_branch ??
      "";

    return {
      ...EMPTY_FORM,
      name: item.name || "",
      national_id_number: item.national_id_number || "",
      job: item.job || "عميل",
      company_name: item.company_name ?? item.company_id ?? "",
      company_display_name:
        item.company_display_name || (companyName === "-" ? "" : companyName),
      advertising_company: (
        item.advertising_company ??
        item.advertising_company_id ??
        ""
      ).toString(),
      advertising_company_name:
        item.advertising_company_name ||
        (advertisingCompanyName === "-" ? "" : advertisingCompanyName),
      branch: String(branchValue ?? ""),
      branch_name: item.branch_name || (branchName === "-" ? "" : branchName),
      governorate: item.governorate || "",
      stolen_goods: item.stolen_goods || "",
      value_of_stolen_goods:
        item.value_of_stolen_goods ?? item.stolen_goods_value ?? "",
      incident_date: getFormDate(item.incident_date),
      permit_number: item.permit_number || "",
      permit_company_name:
        item.permit_company_name ||
        (isPermit(item) ? item.company_name : "") ||
        "",
      permit_issue_date: getFormDate(item.issue_date ?? item.permit_issue_date),
      permit_branch: String(
        item.permit_branch ?? (isPermit(item) ? item.branch : "") ?? "",
      ),
      file_type:
        getNormalizedFileType(item.file_type) ||
        item.file_type ||
        "مناديب/منسقين",
      security_status: getItemStatus(item),
      notes: item.notes || "",
    };
  }

  /* ------------------------------------------------------------------------ */
  /* Coordinator Review                                                       */
  /* ------------------------------------------------------------------------ */

  async function openCoordinatorReview() {
    if (!canViewSecurity) return;

    setCoordinatorModalOpen(true);
    setCoordinatorLoading(true);
    setCoordinatorError("");
    setCoordinatorSuccess("");
    setCoordinatorRows([]);
    setCoordinatorSearch("");

    try {
      const data = await requestData("security/coordinators");

      const records = Array.isArray(data?.records)
        ? data.records
        : Array.isArray(data?.coordinators)
          ? data.coordinators
          : Array.isArray(data)
            ? data
            : [];

      setCoordinatorRows(
        records.map((item) => {
          const sourceType = getCoordinatorSourceType(item);

          return {
            ...item,

            source_type: sourceType,
            source_label:
              item.source_label ||
              (sourceType === "temporary"
                ? "مؤقت"
                : sourceType === "permanent"
                  ? "أساسي"
                  : "-"),

            national_id_number: String(
              item.national_id_number ?? "",
            ).trim(),

            security_status: getNormalizedStatus(
              item.security_status ?? item.security_situation ?? "غير محدد",
            ),

            notes: item.security_notes ?? item.notes ?? "",
            review_notes: item.security_notes ?? item.notes ?? "",

            selected:
              !item.already_imported && !item.deleted_security_record,
          };
        }),
      );

      if (records.length === 0) {
        setCoordinatorSuccess("لا توجد سجلات منسقين متاحة للمراجعة.");
      }
    } catch (err) {
      console.error("Load coordinators error:", err);

      setCoordinatorError(err.message || "تعذر تحميل بيانات المنسقين.");
    } finally {
      setCoordinatorLoading(false);
    }
  }

  function updateCoordinatorReviewRow(nationalId, field, value) {
    setCoordinatorRows((previous) =>
      previous.map((item) =>
        item.national_id_number === nationalId
          ? { ...item, [field]: value }
          : item,
      ),
    );
  }

  const filteredCoordinatorRows = useMemo(() => {
    const value = coordinatorSearch.trim().toLowerCase();

    if (!value) return coordinatorRows;

    return coordinatorRows.filter((item) =>
      [
        item.name,
        item.national_id_number,
        item.job,
        item.source_type,
        item.source_label,
        item.company_name,
        item.branch,
        item.branch_name,
      ].some((field) =>
        String(field ?? "")
          .toLowerCase()
          .includes(value),
      ),
    );
  }, [coordinatorRows, coordinatorSearch]);

  // يشمل السجلات الجديدة والمضافة بالفعل، ويستثني السجلات المعطلة.
  const selectedCoordinatorCount = useMemo(
    () =>
      coordinatorRows.filter(
        (item) => item.selected && !item.deleted_security_record,
      ).length,
    [coordinatorRows],
  );

  async function saveAndImportCoordinators() {
    if (!canEditSecurity || !canCreateSecurity) {
      setCoordinatorError(
        "تحتاج إلى صلاحية تعديل السجلات وإضافة السجلات الأمنية.",
      );
      return;
    }

    // نرسل كل السجلات المحددة، سواء كانت جديدة أو موجودة بالفعل.
    const selectedRows = coordinatorRows.filter(
      (item) => item.selected && !item.deleted_security_record,
    );

    if (selectedRows.length === 0) {
      setCoordinatorError("اختر منسقًا واحدًا على الأقل للمراجعة.");
      return;
    }

    const invalidRow = selectedRows.find(
      (item) =>
        !item.national_id_number || !/^\d{14}$/.test(item.national_id_number),
    );

    if (invalidRow) {
      setCoordinatorError(
        `الرقم القومي غير صحيح للمنسق: ${invalidRow.name || "بدون اسم"}`,
      );
      return;
    }

    setCoordinatorSaving(true);
    setCoordinatorError("");
    setCoordinatorSuccess("");

    try {
      const result = await requestData("security/import-coordinators", "POST", {
        national_ids: selectedRows.map((item) => item.national_id_number),

        reviews: selectedRows.map((item) => ({
          national_id_number: item.national_id_number,
          security_status: getNormalizedStatus(item.security_status),
          notes: String(item.review_notes ?? "").trim(),
        })),
      });

      const imported =
        result?.imported ?? result?.inserted ?? result?.added ?? 0;

      const updated = result?.updated ?? result?.reviewed ?? 0;

      const skipped = result?.skipped ?? result?.existing ?? 0;

      setCoordinatorSuccess(
        `تمت معالجة ${selectedRows.length} منسق بنجاح. ` +
          `إضافة سجلات جديدة: ${imported}. ` +
          `تحديث سجلات موجودة: ${updated}. ` +
          `سجلات تم تخطيها: ${skipped}.`,
      );

      await openCoordinatorReview();
      await loadRecords();
    } catch (err) {
      console.error("Save/import coordinators error:", err);

      setCoordinatorError(
        err.message || "حدث خطأ أثناء حفظ مراجعة المنسقين وإضافتهم.",
      );
    } finally {
      setCoordinatorSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Create Modal                                                             */
  /* ------------------------------------------------------------------------ */

  function openCreateModal() {
    if (!canCreateSecurity) return;

    setEditingRecord(null);
    setEditTargets([]);
    setSelectedEditKey("");
    setLoadingEditTargets(false);
    setEditTargetsError("");
    setForm({
      ...EMPTY_FORM,
      job: "عميل",
    });
    setFormError("");
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  /* ------------------------------------------------------------------------ */
  /* Load All Records For The Selected Person                                 */
  /* ------------------------------------------------------------------------ */

  async function loadPersonEditTargets(item) {
    const nationalId = item.national_id_number;

    if (!nationalId) {
      throw new Error("الرقم القومي للشخص غير موجود.");
    }

    const encodedNationalId = encodeURIComponent(nationalId);

    const data = await requestData(`security/national-id/${encodedNationalId}`);

    const person = data?.record;

    if (!person) {
      throw new Error("لم يتم العثور على بيانات الشخص.");
    }

    const normalizedPerson = normalizePersonRecord(person);

    const incidents = Array.isArray(person.incidents)
      ? person.incidents.map((incident) =>
          normalizeIncidentRecord(incident, normalizedPerson),
        )
      : [];

    const permits = Array.isArray(person.permits)
      ? person.permits.map((permit) =>
          normalizePermitRecord(permit, normalizedPerson),
        )
      : [];

    return [normalizedPerson, ...incidents, ...permits];
  }

  /* ------------------------------------------------------------------------ */
  /* Edit Target Selection                                                    */
  /* ------------------------------------------------------------------------ */

  function selectEditTarget(target) {
    if (!target || saving) return;

    setEditingRecord(target);
    setSelectedEditKey(getRecordKey(target));
    setForm(buildFormFromRecord(target));
    setFormError("");
  }

  function handleEditTargetChange(event) {
    const key = event.target.value;

    setSelectedEditKey(key);

    const target = editTargets.find((record) => getRecordKey(record) === key);

    if (target) selectEditTarget(target);
  }

  /* ------------------------------------------------------------------------ */
  /* Edit Modal                                                               */
  /* ------------------------------------------------------------------------ */

  async function openEditModal(item) {
    if (!canEditSecurity) return;

    setError("");
    setSuccess("");
    setFormError("");
    setEditTargetsError("");
    setEditingRecord(item);
    setForm(buildFormFromRecord(item));
    setEditTargets([item]);
    setSelectedEditKey(getRecordKey(item));
    setLoadingEditTargets(true);
    setModalOpen(true);

    try {
      const targets = await loadPersonEditTargets(item);

      setEditTargets(targets);

      const clickedType = getRecordType(item);
      const clickedId = String(item.source_record_id ?? item.id ?? "");

      const initialTarget =
        targets.find((target) => {
          const targetId = String(target.source_record_id ?? target.id ?? "");

          return (
            getRecordType(target) === clickedType && targetId === clickedId
          );
        }) || targets[0];

      if (initialTarget) {
        selectEditTarget(initialTarget);
      }
    } catch (err) {
      console.error("Load related security records error:", err);

      setEditTargetsError(
        err.message ||
          "تعذر تحميل باقي سجلات الشخص. يمكنك تعديل السجل الحالي فقط.",
      );

      setEditTargets([item]);
      setSelectedEditKey(getRecordKey(item));
      setEditingRecord(item);
      setForm(buildFormFromRecord(item));
    } finally {
      setLoadingEditTargets(false);
    }
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingRecord(null);
    setEditTargets([]);
    setSelectedEditKey("");
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setEditTargetsError("");
  }

  /* ------------------------------------------------------------------------ */
  /* Form Handlers                                                            */
  /* ------------------------------------------------------------------------ */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

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
      ...(name === "branch" &&
        editingPermit && {
          permit_branch: value,
        }),
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* Validation                                                               */
  /* ------------------------------------------------------------------------ */

  function validatePersonForm() {
    if (!form.name.trim()) {
      return "يرجى إدخال الاسم.";
    }

    if (!/^\d{14}$/.test(form.national_id_number.trim())) {
      return "الرقم القومي يجب أن يتكون من 14 رقمًا.";
    }

    if (editingRecord && !JOB_OPTIONS.includes(form.job)) {
      return "يرجى اختيار وظيفة صحيحة.";
    }

    if (
      !SECURITY_STATUSES.includes(getNormalizedStatus(form.security_status))
    ) {
      return "يرجى اختيار موقف أمني صحيح.";
    }

    if (!FILE_TYPE_OPTIONS.includes(getNormalizedFileType(form.file_type))) {
      return "يرجى اختيار نوع ملف صحيح.";
    }

    return "";
  }

  function validateIncidentForm() {
    if (!form.incident_date) {
      return "يرجى إدخال تاريخ الواقعة.";
    }

    if (
      form.value_of_stolen_goods !== "" &&
      (!Number.isFinite(Number(form.value_of_stolen_goods)) ||
        Number(form.value_of_stolen_goods) < 0)
    ) {
      return "يرجى إدخال قيمة صحيحة للبضاعة.";
    }

    return "";
  }

  function validatePermitForm() {
    if (!form.permit_issue_date) {
      return "يرجى إدخال تاريخ إصدار التصريح.";
    }

    return "";
  }

  /* ------------------------------------------------------------------------ */
  /* Build Person Payload                                                     */
  /* ------------------------------------------------------------------------ */

  function buildPersonPayload() {
    return {
      name: form.name.trim(),
      national_id_number: form.national_id_number.trim(),
      job: editingRecord ? form.job : "عميل",
      company_name: form.company_name || null,
      company_display_name: form.company_display_name || null,
      advertising_company: form.advertising_company || null,
      advertising_company_name: form.advertising_company_name || null,
      branch: form.branch || null,
      branch_name: form.branch_name || null,
      governorate: form.governorate || null,
      file_type: getNormalizedFileType(form.file_type) || null,
      security_status: getNormalizedStatus(form.security_status),
      notes: form.notes || null,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* Update Incident                                                          */
  /* ------------------------------------------------------------------------ */

  async function updateIncident() {
    const incidentId = editingRecord.source_record_id ?? editingRecord.id;

    if (!incidentId) {
      throw new Error("رقم الواقعة غير موجود.");
    }

    const payload = {
      incident_branch: form.branch || null,
      stolen_goods: form.stolen_goods || null,
      value_of_stolen_goods:
        form.value_of_stolen_goods === ""
          ? null
          : Number(form.value_of_stolen_goods),
      incident_date: form.incident_date || null,
      incident_notes: form.notes || null,
    };

    await requestData(
      `security/incidents/${encodeURIComponent(incidentId)}`,
      "PUT",
      payload,
    );

    setSuccess("تم تعديل الواقعة بنجاح.");
  }

  /* ------------------------------------------------------------------------ */
  /* Update Permit                                                            */
  /* ------------------------------------------------------------------------ */

  async function updatePermit() {
    const permitId = editingRecord.source_record_id ?? editingRecord.id;

    if (!permitId) {
      throw new Error("رقم التصريح غير موجود.");
    }

    const payload = {
      permit_number: form.permit_number || null,
      permit_company_name: form.permit_company_name || null,
      permit_issue_date: form.permit_issue_date || null,
      permit_branch: form.branch || null,
      permit_notes: form.notes || null,
    };

    await requestData(
      `security/permits/${encodeURIComponent(permitId)}`,
      "PUT",
      payload,
    );

    setSuccess("تم تعديل التصريح بنجاح.");
  }

  /* ------------------------------------------------------------------------ */
  /* Update Person                                                            */
  /* ------------------------------------------------------------------------ */

  async function updatePerson() {
    if (!editingRecord.national_id_number) {
      throw new Error("الرقم القومي للشخص غير موجود.");
    }

    const nationalId = encodeURIComponent(editingRecord.national_id_number);

    await requestData(
      `security/national-id/${nationalId}`,
      "PUT",
      buildPersonPayload(),
    );

    setSuccess("تم تعديل بيانات الشخص بنجاح.");
  }

  /* ------------------------------------------------------------------------ */
  /* Create / Update                                                          */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError("");
    setError("");
    setSuccess("");

    if (editingRecord && !canEditSecurity) {
      setFormError("ليس لديك صلاحية تعديل السجلات.");
      return;
    }

    if (!editingRecord && !canCreateSecurity) {
      setFormError("ليس لديك صلاحية إضافة سجل جديد.");
      return;
    }

    let validationError = "";

    if (editingIncident) {
      validationError = validateIncidentForm();
    } else if (editingPermit) {
      validationError = validatePermitForm();
    } else {
      validationError = validatePersonForm();
    }

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);

    try {
      if (editingIncident) {
        await updateIncident();
      } else if (editingPermit) {
        await updatePermit();
      } else if (editingPerson) {
        await updatePerson();
      } else {
        await requestData("security", "POST", {
          ...buildPersonPayload(),
          job: "عميل",
          stolen_goods: null,
          value_of_stolen_goods: null,
          incident_date: null,
          permit_number: null,
          permit_company_name: null,
          permit_issue_date: null,
          permit_branch: null,
        });

        setSuccess("تمت إضافة العميل بنجاح.");
      }

      setModalOpen(false);
      setEditingRecord(null);
      setEditTargets([]);
      setSelectedEditKey("");
      setForm({ ...EMPTY_FORM });

      if (!editingRecord && page !== 1) {
        setPage(1);
      } else {
        await loadRecords();
      }
    } catch (err) {
      console.error("Save security record error:", err);

      setFormError(err.message || "تعذر حفظ بيانات السجل.");
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Disable Person                                                           */
  /* ------------------------------------------------------------------------ */

  async function handleDelete(item) {
    if (!canDeleteSecurity || deletingId !== null) {
      return;
    }

    if (!item.national_id_number) {
      setError("لا يمكن تعطيل السجل لعدم وجود رقم قومي.");
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من تعطيل سجل الشخص بالكامل؟\n\n` +
        `الاسم: ${item.name}\n` +
        `الرقم القومي: ${item.national_id_number}\n\n` +
        `تنبيه: سيتم تعطيل الشخص وجميع الوقائع والتصاريح المرتبطة به من العرض.`,
    );

    if (!confirmed) return;

    const recordKey = getRecordKey(item);

    setDeletingId(recordKey);
    setError("");
    setSuccess("");

    try {
      const nationalId = encodeURIComponent(item.national_id_number);

      await requestData(`security/national-id/${nationalId}`, "DELETE");

      setSuccess("تم تعطيل سجل الشخص بنجاح.");

      if (rows.length === 1 && page > 1) {
        setPage((previous) => Math.max(1, previous - 1));
      } else {
        await loadRecords();
      }
    } catch (err) {
      console.error("Delete security record error:", err);

      setError(err.message || "تعذر تعطيل سجل الشخص.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Filters                                                                  */
  /* ------------------------------------------------------------------------ */

  function handleClearFilters() {
    setSearch("");
    setJobFilter("");
    setStatusFilter("");
    setFileTypeFilter("");
    setPage(1);
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleJobChange(value) {
    setJobFilter(String(value ?? "").trim());
    setPage(1);
  }

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleFileTypeChange(value) {
    setFileTypeFilter(value);
    setPage(1);
  }

  /* ------------------------------------------------------------------------ */
  /* Statistics                                                               */
  /* ------------------------------------------------------------------------ */

  const statistics = useMemo(() => {
    const counts = {
      safe: 0,
      review: 0,
      blocked: 0,
      unspecified: 0,
      incidents: 0,
      permits: 0,
    };

    rows.forEach((item) => {
      const status = getItemStatus(item);

      switch (status) {
        case "سليم":
          counts.safe++;
          break;

        case "تحت المراجعة":
          counts.review++;
          break;

        case "بلوك":
          counts.blocked++;
          break;

        default:
          counts.unspecified++;
          break;
      }

      if (isIncident(item)) counts.incidents++;

      if (isPermit(item)) counts.permits++;
    });

    return counts;
  }, [rows]);

  /* ------------------------------------------------------------------------ */
  /* Permission Screen                                                        */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div dir="rtl" className="min-h-screen min-w-0 bg-gray-100">
      <Header />

      <main className="mx-auto min-w-0 max-w-full p-4 sm:p-6">
        {/* Page Header */}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-orange-700">إدارة الأمن</h1>

            <p className="mt-1 text-sm text-gray-500">
              إدارة ومتابعة بيانات الأشخاص والوقائع والتصاريح والمواقف الأمنية
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

            {canViewSecurity && canEditSecurity && canCreateSecurity && (
              <button
                type="button"
                onClick={openCoordinatorReview}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-blue-700"
              >
                جلب ومراجعة المنسقين
              </button>
            )}

            {canCreateSecurity && (
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-orange-700"
              >
                + إضافة عميل
              </button>
            )}
          </div>
        </div>

        {/* Messages */}

        {error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
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

        {success && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Statistics */}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard
            title="إجمالي السجلات"
            value={pagination.total}
            color="orange"
          />

          <StatCard
            title="الوقائع - الصفحة الحالية"
            value={statistics.incidents}
            color="red"
          />

          <StatCard
            title="التصاريح - الصفحة الحالية"
            value={statistics.permits}
            color="blue"
          />

          <StatCard
            title="سليم - الصفحة الحالية"
            value={statistics.safe}
            color="green"
          />

          <StatCard
            title="تحت المراجعة - الصفحة الحالية"
            value={statistics.review}
            color="yellow"
          />

          <StatCard
            title="بلوك - الصفحة الحالية"
            value={statistics.blocked}
            color="red"
          />
        </div>

        {/* Filters */}

        <div className="mb-5 min-w-0 rounded-xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="بحث بالاسم أو الرقم القومي أو السبب أو التصريح..."
              className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
            />

            <select
              value={jobFilter}
              onChange={(event) => handleJobChange(event.target.value)}
              className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
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
              onChange={(event) => handleStatusChange(event.target.value)}
              className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value="">كل المواقف الأمنية</option>

              {SECURITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={fileTypeFilter}
              onChange={(event) => handleFileTypeChange(event.target.value)}
              className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value="">كل أنواع الملفات</option>
              <option value="25">25</option>
              <option value="مناديب/منسقين">مناديب/منسقين</option>
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

        {/* Records Table */}

        <div className="w-full min-w-0 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <h2 className="font-bold text-gray-800">سجلات الأمن</h2>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>إجمالي النتائج: {pagination.total}</span>
              <span>حجم الصفحة: {PAGE_SIZE}</span>
            </div>
          </div>

          <div className="security-table-scroll">
            <table className="w-max min-w-[2200px] text-right text-sm">
              <thead className="bg-orange-50 text-gray-700">
                <tr>
                  <th className="sticky right-0 z-10 whitespace-nowrap bg-orange-50 px-4 py-3 font-bold">
                    الإجراءات
                  </th>

                  {[
                    "الاسم",
                    "الرقم القومي",
                    "الوظيفة",
                    "الشركة الأم",
                    "شركة الدعاية",
                    "الفرع",
                    "المحافظة",
                    "البضاعة المسروقة",
                    "قيمة البضاعة",
                    "تاريخ الواقعة",
                    "رقم التصريح",
                    "شركة التصريح",
                    "تاريخ إصدار التصريح",
                    "نوع الملف",
                    "الموقف الأمني",
                    "ملاحظات",
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
                {loading ? (
                  <tr>
                    <td
                      colSpan={17}
                      className="py-10 text-center text-gray-500"
                    >
                      جاري تحميل السجلات...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={17}
                      className="py-10 text-center text-gray-500"
                    >
                      لا توجد سجلات مطابقة.
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => {
                    const recordKey = getRecordKey(item);
                    const status = getItemStatus(item);

                    return (
                      <tr
                        key={recordKey}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="sticky right-0 z-1 whitespace-nowrap bg-white px-4 py-3">
                          {canEditSecurity && (
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="اختيار نوع السجل المراد تعديله"
                              className="ml-2 rounded-md bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100"
                            >
                              تعديل
                            </button>
                          )}

                          {canDeleteSecurity && (
                            <button
                              type="button"
                              disabled={deletingId !== null}
                              onClick={() => handleDelete(item)}
                              title="حذف الشخص وجميع سجلاته"
                              className="rounded-md bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === recordKey
                                ? "جاري الحذف..."
                                : "حذف الشخص"}
                            </button>
                          )}

                          {!canEditSecurity && !canDeleteSecurity && (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          {item.name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {item.national_id_number || "-"}
                        </td>

                        <td className="px-4 py-3">{item.job || "-"}</td>

                        <td className="px-4 py-3">{getCompanyName(item)}</td>

                        <td className="px-4 py-3">
                          {getAdvertisingCompanyName(item)}
                        </td>

                        <td className="px-4 py-3">{getBranchName(item)}</td>

                        <td className="px-4 py-3">{item.governorate || "-"}</td>

                        <td className="w-62.5 min-w-62.5 px-4 py-3 align-top">
                          <div className="whitespace-pre-wrap wrap-break-word leading-7">
                            {item.stolen_goods || "-"}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {item.value_of_stolen_goods ?? "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {getDateInputValue(item.incident_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {item.permit_number || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {item.permit_company_name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {getDateInputValue(item.issue_date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          {getFileType(item)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="w-87.5 min-w-87.5 max-w-87.5 px-4 py-3 align-top">
                          <div
                            className="whitespace-pre-wrap wrap-break-word leading-7"
                            title={item.notes || ""}
                          >
                            {item.notes || "-"}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 px-4 py-4">
            <div className="text-sm text-gray-600">
              {pagination.total === 0 ? (
                "لا توجد نتائج"
              ) : (
                <>
                  عرض {(page - 1) * PAGE_SIZE + 1}
                  {" - "}
                  {Math.min(page * PAGE_SIZE, pagination.total)}
                  {" من "}
                  {pagination.total}
                  {" سجل"}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                السابق
              </button>

              <span className="px-3 text-sm font-semibold text-gray-700">
                صفحة {page} من {Math.max(1, pagination.totalPages)}
              </span>

              <button
                type="button"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => setPage((previous) => previous + 1)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Coordinator Review Modal                                           */}
      {/* ------------------------------------------------------------------ */}

      {coordinatorModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3 sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Header */}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
              <div>
                <h2 className="text-xl font-bold text-blue-700">
                  مراجعة المنسقين
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  راجع الموقف الأمني وأضف ملاحظات قبل إدخال الأشخاص إلى سجلات
                  الأمن.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!coordinatorSaving) {
                    setCoordinatorModalOpen(false);
                  }
                }}
                disabled={coordinatorSaving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                إغلاق
              </button>
            </div>

            {/* Messages */}

            <div className="space-y-3 px-4 pt-4 sm:px-5">
              {coordinatorError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {coordinatorError}
                </div>
              )}

              {coordinatorSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {coordinatorSuccess}
                </div>
              )}
            </div>

            {/* Toolbar */}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-5">
              <input
                type="search"
                value={coordinatorSearch}
                onChange={(event) => setCoordinatorSearch(event.target.value)}
                placeholder="بحث بالاسم أو الرقم القومي أو الوظيفة أو النوع..."
                className="min-w-55 flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              />

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700">
                  إجمالي المنسقين: {coordinatorRows.length}
                </span>

                <span className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700">
                  المحدد: {selectedCoordinatorCount}
                </span>
              </div>
            </div>

            {/* Table */}

            <div className="min-h-0 flex-1 overflow-auto">
              {coordinatorLoading ? (
                <div className="p-12 text-center text-gray-500">
                  جاري تحميل جميع المنسقين...
                </div>
              ) : coordinatorRows.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  لا توجد سجلات منسقين للمراجعة.
                </div>
              ) : (
                <table className="w-full min-w-287.5 text-right text-sm">
                  <thead className="sticky top-0 z-10 bg-blue-50 text-gray-700">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            coordinatorRows.length > 0 &&
                            coordinatorRows.every(
                              (item) =>
                                item.selected || item.deleted_security_record,
                            )
                          }
                          onChange={(event) => {
                            const checked = event.target.checked;

                            setCoordinatorRows((previous) =>
                              previous.map((item) => ({
                                ...item,
                                selected:
                                  checked && !item.deleted_security_record,
                              })),
                            );
                          }}
                          title="تحديد أو إلغاء تحديد الكل"
                        />
                      </th>

                      <th className="whitespace-nowrap px-3 py-3">الاسم</th>

                      <th className="whitespace-nowrap px-3 py-3">
                        الرقم القومي
                      </th>

                      <th className="whitespace-nowrap px-3 py-3">الوظيفة</th>

                      {/* مصدر السجل: أساسي أو مؤقت */}

                      <th className="whitespace-nowrap px-3 py-3">النوع</th>

                      <th className="whitespace-nowrap px-3 py-3">الشركة</th>

                      <th className="whitespace-nowrap px-3 py-3">الفرع</th>

                      <th className="min-w-45 px-3 py-3">الموقف الأمني</th>

                      <th className="min-w-70 px-3 py-3">ملاحظات جديدة</th>

                      <th className="whitespace-nowrap px-3 py-3">
                        حالة الاستيراد
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredCoordinatorRows.map((item) => {
                      const disabled = Boolean(item.deleted_security_record);
                      const sourceType = getCoordinatorSourceType(item);

                      return (
                        <tr
                          key={`${item.national_id_number || item.id}-${sourceType}`}
                          className={`hover:bg-gray-50 ${
                            !item.selected ? "bg-gray-50" : ""
                          }`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={Boolean(item.selected)}
                              disabled={disabled || coordinatorSaving}
                              onChange={(event) =>
                                updateCoordinatorReviewRow(
                                  item.national_id_number,
                                  "selected",
                                  event.target.checked,
                                )
                              }
                            />
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 font-semibold">
                            {item.name || "-"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 font-mono">
                            {item.national_id_number || "-"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3">
                            {item.job || "-"}
                          </td>

                          {/* أساسي / مؤقت */}

                          <td className="whitespace-nowrap px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCoordinatorSourceStyle(item)}`}
                            >
                              {getCoordinatorSourceLabel(item)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-3 py-3">
                            {item.company_name || "-"}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3">
                            {item.branch_name || item.branch || "-"}
                          </td>

                          <td className="px-3 py-3">
                            <select
                              value={item.security_status}
                              disabled={
                                disabled || !item.selected || coordinatorSaving
                              }
                              onChange={(event) =>
                                updateCoordinatorReviewRow(
                                  item.national_id_number,
                                  "security_status",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 outline-none focus:border-blue-500 disabled:bg-gray-100"
                            >
                              {SECURITY_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-3 py-3 min-w-70">
                            <textarea
                              value={
                                item.review_notes ??
                                item.notes ??
                                item.security_notes ??
                                ""
                              }
                              onChange={(e) => {
                                const value = e.target.value;

                                setCoordinatorRows((previous) =>
                                  previous.map((row) =>
                                    row.national_id_number ===
                                    item.national_id_number
                                      ? { ...row, review_notes: value }
                                      : row,
                                  ),
                                );
                              }}
                              disabled={
                                Boolean(item.deleted_security_record) ||
                                !item.selected ||
                                coordinatorSaving
                              }
                              placeholder="لا توجد ملاحظات سابقة، اكتب الملاحظات هنا..."
                              rows={3}
                              className="w-full min-w-85 rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100"
                            />
                          </td>

                          <td className="whitespace-nowrap px-3 py-3">
                            {item.already_imported ? (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                مضاف بالفعل
                              </span>
                            ) : item.deleted_security_record ? (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                سجل معطل
                              </span>
                            ) : (
                              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                                غير مضاف
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredCoordinatorRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="p-8 text-center text-gray-500"
                        >
                          لا توجد نتائج مطابقة للبحث.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 p-4 sm:px-5">
              <p className="text-xs leading-6 text-gray-500">
                سيتم حفظ مراجعة الأشخاص المحددين وإضافة السجلات الجديدة فقط.
                سيتم تحديث موقف وملاحظات السجلات الموجودة بالفعل دون إنشاء سجل
                أمني مكرر. لا يتم إنشاء وقائع أو تصاريح تلقائيًا.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openCoordinatorReview}
                  disabled={coordinatorLoading || coordinatorSaving}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  إعادة تحميل
                </button>

                <button
                  type="button"
                  onClick={saveAndImportCoordinators}
                  disabled={
                    coordinatorLoading ||
                    coordinatorSaving ||
                    selectedCoordinatorCount === 0
                  }
                  className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {coordinatorSaving
                    ? "جاري الحفظ..."
                    : `حفظ المراجعة وإضافة المحددين (${selectedCoordinatorCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Create / Edit Modal                                                */}
      {/* ------------------------------------------------------------------ */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
              <h2 className="text-xl font-bold text-orange-700">
                {editingRecord
                  ? getRecordTitle(editingRecord)
                  : "إضافة عميل جديد"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-2xl text-gray-500 hover:text-red-600 disabled:opacity-50"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              {editingRecord && (
                <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <label className="mb-2 block text-sm font-bold text-gray-800">
                    اختر السجل الذي تريد تعديله
                  </label>

                  {loadingEditTargets ? (
                    <div className="rounded-lg border border-blue-200 bg-white px-3 py-3 text-sm text-blue-700">
                      جاري تحميل بيانات الشخص والوقائع والتصاريح...
                    </div>
                  ) : (
                    <select
                      value={selectedEditKey}
                      onChange={handleEditTargetChange}
                      disabled={saving}
                      className="form-input bg-white"
                    >
                      {editTargets.map((target) => {
                        const type = getRecordType(target);

                        const id = target.source_record_id ?? target.id;

                        let label = "بيانات الشخص";

                        if (type === "incident") {
                          label = `واقعة رقم ${id}`;
                        } else if (type === "permit") {
                          label = `تصريح رقم ${id}`;
                        }

                        return (
                          <option
                            key={getRecordKey(target)}
                            value={getRecordKey(target)}
                          >
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  )}

                  {editTargetsError && (
                    <p className="mt-2 text-sm text-red-600">
                      {editTargetsError}
                    </p>
                  )}

                  {!loadingEditTargets && !editTargetsError && (
                    <p className="mt-2 text-xs text-gray-600">
                      يمكنك التبديل بين بيانات الشخص وجميع الوقائع والتصاريح
                      المرتبطة به.
                    </p>
                  )}
                </div>
              )}

              {formError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {showPersonFields && (
                  <>
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
                        disabled={Boolean(editingRecord)}
                        placeholder="14 رقم"
                        className="form-input disabled:bg-gray-100 disabled:text-gray-500"
                      />

                      {editingRecord && (
                        <p className="mt-1 text-xs text-gray-500">
                          لا يمكن تغيير الرقم القومي أثناء التعديل.
                        </p>
                      )}
                    </FormField>

                    <FormField label="الوظيفة" required>
                      {editingRecord ? (
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
                      ) : (
                        <input
                          value="عميل"
                          readOnly
                          className="form-input bg-gray-100 font-semibold text-gray-700"
                        />
                      )}
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

                    <FormField label="نوع الملف" required>
                      <select
                        name="file_type"
                        value={form.file_type}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="">اختر نوع الملف</option>

                        {FILE_TYPE_OPTIONS.map((fileType) => (
                          <option key={fileType} value={fileType}>
                            {fileType}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="الموقف الأمني">
                      <select
                        name="security_status"
                        value={getNormalizedStatus(form.security_status)}
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
                  </>
                )}

                {(showPersonFields || editingIncident || editingPermit) && (
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
                )}

                {showIncidentFields && (
                  <>
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
                        step="0.01"
                        value={form.value_of_stolen_goods}
                        onChange={handleChange}
                        placeholder="قيمة البضاعة"
                        className="form-input"
                      />
                    </FormField>

                    <FormField label="تاريخ الواقعة" required>
                      <input
                        name="incident_date"
                        type="date"
                        value={form.incident_date}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </FormField>
                  </>
                )}

                {editingPermit && (
                  <>
                    <FormField label="رقم التصريح">
                      <input
                        name="permit_number"
                        value={form.permit_number}
                        onChange={handleChange}
                        placeholder="رقم التصريح"
                        className="form-input"
                      />
                    </FormField>

                    <FormField label="شركة التصريح">
                      <input
                        name="permit_company_name"
                        value={form.permit_company_name}
                        onChange={handleChange}
                        placeholder="اسم الشركة"
                        className="form-input"
                      />
                    </FormField>

                    <FormField label="تاريخ إصدار التصريح" required>
                      <input
                        name="permit_issue_date"
                        type="date"
                        value={form.permit_issue_date}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </FormField>
                  </>
                )}

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

              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2 hover:bg-gray-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={saving || loadingEditTargets}
                  className="rounded-lg bg-orange-600 px-6 py-2 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingRecord
                      ? "حفظ التعديلات"
                      : "إضافة العميل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styles */}

      <style>{`
        .form-input {
          width: 100%;
          min-width: 0;
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

        .security-table-scroll {
          display: block;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: auto;
        }

        .security-table-scroll table {
          width: max-content;
          min-width: 2200px;
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reusable Components                                                        */
/* -------------------------------------------------------------------------- */

function FormField({ label, required = false, children }) {
  return (
    <div className="min-w-0">
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
    blue: "border-blue-500 text-blue-700",
    gray: "border-gray-500 text-gray-700",
  };

  return (
    <div
      className={`rounded-xl border-r-4 bg-white p-4 shadow-sm ${
        colors[color] || colors.gray
      }`}
    >
      <p className="text-sm text-gray-500">{title}</p>

      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
