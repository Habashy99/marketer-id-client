
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

const SECURITY_STATUSES = [
  "سليم",
  "تحت المراجعة",
  "بلوك",
  "غير محدد",
];

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
  // Person
  name: "",
  national_id_number: "",
  job: "عميل",
  governorate: "",
  birth_date: "",
  birth_place: "",

  // Incident
  incident_branch: "",
  incident_branch_name: "",
  stolen_goods: "",
  value_of_stolen_goods: "",
  incident_date: "",

  // Permit
  permit_number: "",
  permit_issue_date: "",

  // General
  file_type: "25",
  security_status: "غير محدد",
  notes: "",
};

/* -------------------------------------------------------------------------- */
/* Request Helpers                                                            */
/* -------------------------------------------------------------------------- */

async function requestData(url, method = "GET", body) {
  const response = await sendHttpReq(url, method, body);

  if (response && typeof response.json === "function") {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || "حدث خطأ أثناء تنفيذ الطلب.",
      );
    }

    return data;
  }

  if (response?.ok === false) {
    throw new Error(
      response.message || "حدث خطأ أثناء تنفيذ الطلب.",
    );
  }

  return response ?? {};
}

/* -------------------------------------------------------------------------- */
/* Date Helpers                                                               */
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

/* -------------------------------------------------------------------------- */
/* Status Helpers                                                             */
/* -------------------------------------------------------------------------- */

function getNormalizedStatus(status) {
  const value = String(status ?? "").trim();

  if (value === "مرفوض" || value === "غير سليم") {
    return "بلوك";
  }

  return value || "غير محدد";
}

function getItemStatus(item) {
  return getNormalizedStatus(
    item.security_status ??
      item.security_situation ??
      item.status,
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

/* -------------------------------------------------------------------------- */
/* File Type Helpers                                                          */
/* -------------------------------------------------------------------------- */

function getNormalizedFileType(value) {
  const normalized = String(value ?? "").trim();

  if (normalized === "25") return "25";

  if (
    normalized === "مناديب/منسقين" ||
    normalized === "مناديب/ منسقين"
  ) {
    return "مناديب/منسقين";
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* Coordinator Helpers                                                        */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Record Normalizers                                                         */
/* -------------------------------------------------------------------------- */

function normalizePersonRecord(person) {
  return {
    ...person,

    id: person.id,

    record_type: "person",

    security_status:
      person.security_status ??
      person.security_situation ??
      "غير محدد",

    incidents: Array.isArray(person.incidents)
      ? person.incidents
      : [],

    permits: Array.isArray(person.permits)
      ? person.permits
      : [],
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

    incident_branch:
      incident.incident_branch ??
      incident.branch ??
      "",

    stolen_goods: incident.stolen_goods ?? "",

    value_of_stolen_goods:
      incident.stolen_goods_value ??
      incident.value_of_stolen_goods ??
      "",

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

    permit_issue_date:
      permit.issue_date ??
      permit.permit_issue_date ??
      "",

    notes: permit.notes ?? "",

    file_type: "مناديب/منسقين",
  };
}

/* -------------------------------------------------------------------------- */
/* Aggregated Display Helpers                                                 */
/* -------------------------------------------------------------------------- */

function getRecordsArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function formatRecordList(records, getter) {
  const values = records
    .map((record) => getter(record))
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "",
    );

  return values.length ? values.join("\n") : "-";
}

function getPersonIncidents(item) {
  return getRecordsArray(item.incidents);
}

function getPersonPermits(item) {
  return getRecordsArray(item.permits);
}

function getIncidentGoods(item) {
  const incidents = getPersonIncidents(item);

  if (incidents.length) {
    return formatRecordList(
      incidents,
      (incident) => incident.stolen_goods || "-",
    );
  }

  return item.stolen_goods || "-";
}

function getIncidentValues(item) {
  const incidents = getPersonIncidents(item);

  if (incidents.length) {
    return formatRecordList(
      incidents,
      (incident) =>
        incident.stolen_goods_value ??
        incident.value_of_stolen_goods ??
        "-",
    );
  }

  return (
    item.value_of_stolen_goods ??
    item.stolen_goods_value ??
    "-"
  );
}

function getIncidentDates(item) {
  const incidents = getPersonIncidents(item);

  if (incidents.length) {
    return formatRecordList(
      incidents,
      (incident) =>
        getDateInputValue(incident.incident_date),
    );
  }

  return getDateInputValue(item.incident_date);
}

function getIncidentBranches(item, branchOptions) {
  const incidents = getPersonIncidents(item);

  if (incidents.length) {
    return formatRecordList(incidents, (incident) => {
      const value = String(
        incident.incident_branch ??
          incident.branch ??
          "",
      ).trim();

      const matched = branchOptions.find(
        (option) => option.value === value,
      );

      return (
        matched?.label ||
        (value && !/^\d+$/.test(value) ? value : "") ||
        "-"
      );
    });
  }

  const value = String(
    item.incident_branch ?? item.branch ?? "",
  ).trim();

  const matched = branchOptions.find(
    (option) => option.value === value,
  );

  return (
    matched?.label ||
    (value && !/^\d+$/.test(value) ? value : "") ||
    "-"
  );
}

function getPermitNumbers(item) {
  const permits = getPersonPermits(item);

  if (permits.length) {
    return formatRecordList(
      permits,
      (permit) => permit.permit_number || "-",
    );
  }

  return item.permit_number || "-";
}

function getPermitDates(item) {
  const permits = getPersonPermits(item);

  if (permits.length) {
    return formatRecordList(
      permits,
      (permit) =>
        getDateInputValue(
          permit.issue_date ?? permit.permit_issue_date,
        ),
    );
  }

  return getDateInputValue(
    item.issue_date ?? item.permit_issue_date,
  );
}

function getAllSecurityNotes(item) {
  const notes = [];

  if (item.notes) {
    notes.push(String(item.notes));
  }

  getPersonIncidents(item).forEach((incident, index) => {
    if (incident.notes) {
      notes.push(
        `الواقعة ${index + 1}: ${incident.notes}`,
      );
    }
  });

  getPersonPermits(item).forEach((permit, index) => {
    if (permit.notes) {
      notes.push(
        `التصريح ${index + 1}: ${permit.notes}`,
      );
    }
  });

  return [...new Set(notes)].join("\n") || "-";
}

function getAllFileTypes(item) {
  const types = new Set();

  if (item.file_type) {
    String(item.file_type)
      .split(/[،,]/)
      .map(getNormalizedFileType)
      .filter(Boolean)
      .forEach((value) => types.add(value));
  }

  if (getPersonIncidents(item).length) {
    types.add("25");
  }

  if (getPersonPermits(item).length) {
    types.add("مناديب/منسقين");
  }

  return [...types].join("، ") || "-";
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

  /* Main Data */

  const [rows, setRows] = useState([]);
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

  /* Loading and Messages */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Options */

  const [branches, setBranches] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  /* Create / Edit Modal */

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");

  const [editTargets, setEditTargets] = useState([]);
  const [selectedEditKey, setSelectedEditKey] = useState("");
  const [loadingEditTargets, setLoadingEditTargets] = useState(false);
  const [editTargetsError, setEditTargetsError] = useState("");

  /* Coordinator Review */

  const [coordinatorModalOpen, setCoordinatorModalOpen] =
    useState(false);

  const [coordinatorRows, setCoordinatorRows] = useState([]);
  const [coordinatorLoading, setCoordinatorLoading] =
    useState(false);

  const [coordinatorSaving, setCoordinatorSaving] =
    useState(false);

  const [coordinatorError, setCoordinatorError] = useState("");
  const [coordinatorSuccess, setCoordinatorSuccess] =
    useState("");

  const [coordinatorSearch, setCoordinatorSearch] =
    useState("");

  /* Editing Types */

  const editingIncident = Boolean(
    editingRecord && isIncident(editingRecord),
  );

  const editingPermit = Boolean(
    editingRecord && isPermit(editingRecord),
  );

  const editingPerson = Boolean(
    editingRecord && isPersonOnly(editingRecord),
  );

  const showPersonFields = !editingRecord || editingPerson;
  const showIncidentFields = !editingRecord || editingIncident;
  const showPermitFields = !editingRecord || editingPermit;

  /* ------------------------------------------------------------------------ */
  /* Branch Options                                                           */
  /* ------------------------------------------------------------------------ */

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: String(branch.id ?? branch.branch ?? ""),
        label: String(branch.a_name ?? branch.name ?? ""),
      })),
    [branches],
  );

  /* ------------------------------------------------------------------------ */
  /* Display Helpers                                                          */
  /* ------------------------------------------------------------------------ */

  function getAdvertisingCompanyName(item) {
    const companyId = String(
      item.advertising_company ??
        item.advertising_company_id ??
        "",
    ).trim();

    return (
      item.advertising_company_name ||
      (companyId && !/^\d+$/.test(companyId)
        ? companyId
        : "") ||
      "-"
    );
  }

  function getCompanyName(item) {
    return (
      item.company_display_name ||
      item.supplier_name ||
      (item.company_name &&
      !/^\d+$/.test(String(item.company_name))
        ? item.company_name
        : "") ||
      "-"
    );
  }

  function getAreaName(item) {
    return (
      item.area ||
      item.region ||
      item.district ||
      "-"
    );
  }

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

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (jobFilter.trim()) {
        params.set("job", jobFilter.trim());
      }

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (fileTypeFilter) {
        params.set("file_type", fileTypeFilter);
      }

      const data = await requestData(
        `security?${params.toString()}`,
      );

      const records = Array.isArray(data.records)
        ? data.records
        : [];

      setRows(
        records.map((item) => ({
          ...item,
          incidents: getRecordsArray(item.incidents),
          permits: getRecordsArray(item.permits),
        })),
      );

      setPagination({
        page: data.pagination?.page ?? page,
        limit: data.pagination?.limit ?? PAGE_SIZE,
        total: data.pagination?.total ?? 0,
        totalPages: data.pagination?.totalPages ?? 0,
        hasNextPage: data.pagination?.hasNextPage ?? false,
        hasPreviousPage:
          data.pagination?.hasPreviousPage ?? page > 1,
      });
    } catch (err) {
      console.error("Load security records error:", err);

      setRows([]);
      setError(err.message || "تعذر تحميل سجلات الأمن.");
    } finally {
      setLoading(false);
    }
  }, [
    canViewSecurity,
    page,
    search,
    jobFilter,
    statusFilter,
    fileTypeFilter,
  ]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  /* ------------------------------------------------------------------------ */
  /* Load Form Options                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadOptions() {
      if (!canViewSecurity) return;

      setOptionsLoading(true);

      try {
        const branchesData = await requestData(
          "retail/branches",
        );

        setBranches(
          Array.isArray(branchesData)
            ? branchesData
            : Array.isArray(branchesData?.branches)
              ? branchesData.branches
              : [],
        );
      } catch (err) {
        console.error(
          "Failed to load security form options:",
          err,
        );
      } finally {
        setOptionsLoading(false);
      }
    }

    loadOptions();
  }, [canViewSecurity]);

  /* ------------------------------------------------------------------------ */
  /* Build Form                                                               */
  /* ------------------------------------------------------------------------ */

  function buildFormFromRecord(item) {
    const incidentBranch =
      item.incident_branch ??
      (isIncident(item) ? item.branch : "") ??
      "";

    return {
      ...EMPTY_FORM,

      name: item.name || "",
      national_id_number: item.national_id_number || "",
      job: item.job || "عميل",

      governorate: item.governorate || "",

      incident_branch: String(incidentBranch ?? ""),

      incident_branch_name:
        item.incident_branch_name ||
        (incidentBranch &&
        !/^\d+$/.test(String(incidentBranch))
          ? String(incidentBranch)
          : ""),

      stolen_goods: item.stolen_goods || "",

      value_of_stolen_goods:
        item.value_of_stolen_goods ??
        item.stolen_goods_value ??
        "",

      incident_date: getFormDate(item.incident_date),

      permit_number: item.permit_number || "",

      permit_issue_date: getFormDate(
        item.issue_date ?? item.permit_issue_date,
      ),

      file_type:
        getNormalizedFileType(item.file_type) ||
        item.file_type ||
        "مناديب/منسقين",

      security_status: getItemStatus(item),

      notes: item.notes || "",

      birth_date: getFormDate(item.birth_date),
      birth_place: item.birth_place || "",
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
              item.security_status ??
                item.security_situation ??
                "غير محدد",
            ),

            notes: item.security_notes ?? item.notes ?? "",

            review_notes:
              item.security_notes ?? item.notes ?? "",

            selected:
              !item.already_imported &&
              !item.deleted_security_record,
          };
        }),
      );

      if (records.length === 0) {
        setCoordinatorSuccess(
          "لا توجد سجلات منسقين متاحة للمراجعة.",
        );
      }
    } catch (err) {
      console.error("Load coordinators error:", err);

      setCoordinatorError(
        err.message || "تعذر تحميل بيانات المنسقين.",
      );
    } finally {
      setCoordinatorLoading(false);
    }
  }

  function updateCoordinatorReviewRow(
    nationalId,
    field,
    value,
  ) {
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

  const selectedCoordinatorCount = useMemo(
    () =>
      coordinatorRows.filter(
        (item) =>
          item.selected && !item.deleted_security_record,
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

    const selectedRows = coordinatorRows.filter(
      (item) =>
        item.selected && !item.deleted_security_record,
    );

    if (selectedRows.length === 0) {
      setCoordinatorError(
        "اختر منسقًا واحدًا على الأقل للمراجعة.",
      );
      return;
    }

    const invalidRow = selectedRows.find(
      (item) =>
        !item.national_id_number ||
        !/^\d{14}$/.test(item.national_id_number),
    );

    if (invalidRow) {
      setCoordinatorError(
        `الرقم القومي غير صحيح للمنسق: ${
          invalidRow.name || "بدون اسم"
        }`,
      );
      return;
    }

    setCoordinatorSaving(true);
    setCoordinatorError("");
    setCoordinatorSuccess("");

    try {
      const result = await requestData(
        "security/import-coordinators",
        "POST",
        {
          national_ids: selectedRows.map(
            (item) => item.national_id_number,
          ),

          reviews: selectedRows.map((item) => ({
            national_id_number: item.national_id_number,

            security_status: getNormalizedStatus(
              item.security_status,
            ),

            notes: String(
              item.review_notes ?? "",
            ).trim(),
          })),
        },
      );

      const imported =
        result?.imported ??
        result?.inserted ??
        result?.added ??
        0;

      const updated =
        result?.updated ??
        result?.reviewed ??
        0;

      const skipped =
        result?.skipped ??
        result?.existing ??
        0;

      setCoordinatorSuccess(
        `تمت معالجة ${selectedRows.length} منسق بنجاح. ` +
          `إضافة سجلات جديدة: ${imported}. ` +
          `تحديث سجلات موجودة: ${updated}. ` +
          `سجلات تم تخطيها: ${skipped}.`,
      );

      await openCoordinatorReview();
      await loadRecords();
    } catch (err) {
      console.error(
        "Save/import coordinators error:",
        err,
      );

      setCoordinatorError(
        err.message ||
          "حدث خطأ أثناء حفظ مراجعة المنسقين وإضافتهم.",
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
  /* Edit Targets                                                             */
  /* ------------------------------------------------------------------------ */

  async function loadPersonEditTargets(item) {
    const nationalId = item.national_id_number;

    if (!nationalId) {
      throw new Error("الرقم القومي للشخص غير موجود.");
    }

    const encodedNationalId = encodeURIComponent(nationalId);

    const data = await requestData(
      `security/national-id/${encodedNationalId}`,
    );

    const person = data?.record;

    if (!person) {
      throw new Error("لم يتم العثور على بيانات الشخص.");
    }

    const normalizedPerson = normalizePersonRecord(person);

    const incidents = getRecordsArray(person.incidents).map(
      (incident) =>
        normalizeIncidentRecord(
          incident,
          normalizedPerson,
        ),
    );

    const permits = getRecordsArray(person.permits).map(
      (permit) =>
        normalizePermitRecord(
          permit,
          normalizedPerson,
        ),
    );

    return [
      normalizedPerson,
      ...incidents,
      ...permits,
    ];
  }

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

    const target = editTargets.find(
      (record) => getRecordKey(record) === key,
    );

    if (target) {
      selectEditTarget(target);
    }
  }

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

      const clickedId = String(
        item.source_record_id ?? item.id ?? "",
      );

      const initialTarget =
        targets.find((target) => {
          const targetId = String(
            target.source_record_id ?? target.id ?? "",
          );

          return (
            getRecordType(target) === clickedType &&
            targetId === clickedId
          );
        }) || targets[0];

      if (initialTarget) {
        selectEditTarget(initialTarget);
      }
    } catch (err) {
      console.error(
        "Load related security records error:",
        err,
      );

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
      incident_branch: "incident_branch_name",
    };

    setForm((previous) => ({
      ...previous,

      [name]: value,

      ...(nameFields[name] && {
        [nameFields[name]]: label,
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

    if (
      editingRecord &&
      !JOB_OPTIONS.includes(form.job)
    ) {
      return "يرجى اختيار وظيفة صحيحة.";
    }

    if (
      !SECURITY_STATUSES.includes(
        getNormalizedStatus(form.security_status),
      )
    ) {
      return "يرجى اختيار موقف أمني صحيح.";
    }

    if (
      !FILE_TYPE_OPTIONS.includes(
        getNormalizedFileType(form.file_type),
      )
    ) {
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
      (
        !Number.isFinite(
          Number(form.value_of_stolen_goods),
        ) ||
        Number(form.value_of_stolen_goods) < 0
      )
    ) {
      return "يرجى إدخال قيمة صحيحة للبضاعة.";
    }

    return "";
  }

  function validatePermitForm() {
    if (!form.permit_number.trim()) {
      return "يرجى إدخال رقم التصريح.";
    }

    if (!form.permit_issue_date) {
      return "يرجى إدخال تاريخ إصدار التصريح.";
    }

    return "";
  }

  function validateCreateIncidentForm() {
    const hasIncidentData =
      form.stolen_goods.trim() !== "" ||
      form.value_of_stolen_goods !== "" ||
      form.incident_date !== "" ||
      form.incident_branch !== "";

    if (!hasIncidentData) return "";

    return validateIncidentForm();
  }

  function validateCreatePermitForm() {
    const hasPermitData =
      form.permit_number.trim() !== "" ||
      form.permit_issue_date !== "";

    if (!hasPermitData) return "";

    return validatePermitForm();
  }

  /* ------------------------------------------------------------------------ */
  /* Payload Builders                                                         */
  /* ------------------------------------------------------------------------ */

  function buildPersonPayload() {
    return {
      name: form.name.trim(),

      national_id_number:
        form.national_id_number.trim(),

      job: editingRecord ? form.job : "عميل",

      governorate: form.governorate || null,

      file_type:
        getNormalizedFileType(form.file_type) || null,

      security_status:
        getNormalizedStatus(form.security_status),

      notes: form.notes || null,

      birth_date: form.birth_date || null,

      birth_place: form.birth_place.trim() || null,
    };
  }

  function buildIncidentPayload() {
    return {
      stolen_goods:
        form.stolen_goods.trim() || null,

      value_of_stolen_goods:
        form.value_of_stolen_goods === ""
          ? null
          : Number(form.value_of_stolen_goods),

      incident_date: form.incident_date || null,

      // فرع الواقعة مستقل تمامًا عن بيانات الشخص والتصريح.
      incident_branch: form.incident_branch || null,

      incident_notes:
        form.notes.trim() || null,
    };
  }

  function buildPermitPayload() {
    return {
      permit_number:
        form.permit_number.trim() || null,

      permit_issue_date:
        form.permit_issue_date || null,

      permit_notes:
        form.notes.trim() || null,
    };
  }

  /* ------------------------------------------------------------------------ */
  /* Update Operations                                                        */
  /* ------------------------------------------------------------------------ */

  async function updateIncident() {
    const incidentId =
      editingRecord.source_record_id ??
      editingRecord.id;

    if (!incidentId) {
      throw new Error("رقم الواقعة غير موجود.");
    }

    await requestData(
      `security/incidents/${encodeURIComponent(incidentId)}`,
      "PUT",
      buildIncidentPayload(),
    );

    setSuccess("تم تعديل الواقعة بنجاح.");
  }

  async function updatePermit() {
    const permitId =
      editingRecord.source_record_id ??
      editingRecord.id;

    if (!permitId) {
      throw new Error("رقم التصريح غير موجود.");
    }

    await requestData(
      `security/permits/${encodeURIComponent(permitId)}`,
      "PUT",
      buildPermitPayload(),
    );

    setSuccess("تم تعديل التصريح بنجاح.");
  }

  async function updatePerson() {
    if (!editingRecord.national_id_number) {
      throw new Error("الرقم القومي للشخص غير موجود.");
    }

    const nationalId = encodeURIComponent(
      editingRecord.national_id_number,
    );

    await requestData(
      `security/national-id/${nationalId}`,
      "PUT",
      buildPersonPayload(),
    );

    setSuccess("تم تعديل بيانات الشخص بنجاح.");
  }

  /* ------------------------------------------------------------------------ */
  /* Create Operation                                                         */
  /* ------------------------------------------------------------------------ */

  async function createSecurityRecord() {
    const payload = {
      ...buildPersonPayload(),

      job: "عميل",

      ...buildIncidentPayload(),

      ...buildPermitPayload(),
    };

    await requestData(
      "security",
      "POST",
      payload,
    );

    setSuccess(
      "تمت إضافة العميل والبيانات المرتبطة به بنجاح.",
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Submit Form                                                              */
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
    } else if (editingPerson) {
      validationError = validatePersonForm();
    } else {
      validationError =
        validatePersonForm() ||
        validateCreateIncidentForm() ||
        validateCreatePermitForm();
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
        await createSecurityRecord();
      }

      const wasCreating = !editingRecord;

      setModalOpen(false);
      setEditingRecord(null);
      setEditTargets([]);
      setSelectedEditKey("");
      setForm({ ...EMPTY_FORM });

      if (wasCreating && page !== 1) {
        setPage(1);
      } else {
        await loadRecords();
      }
    } catch (err) {
      console.error("Save security record error:", err);

      setFormError(
        err.message || "تعذر حفظ بيانات السجل.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Delete Operation                                                         */
  /* ------------------------------------------------------------------------ */

  async function handleDelete(item) {
    if (!canDeleteSecurity || deletingId !== null) {
      return;
    }

    if (!item.national_id_number) {
      setError(
        "لا يمكن تعطيل السجل لعدم وجود رقم قومي.",
      );
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
      const nationalId = encodeURIComponent(
        item.national_id_number,
      );

      await requestData(
        `security/national-id/${nationalId}`,
        "DELETE",
      );

      setSuccess("تم تعطيل سجل الشخص بنجاح.");

      if (rows.length === 1 && page > 1) {
        setPage((previous) =>
          Math.max(1, previous - 1),
        );
      } else {
        await loadRecords();
      }
    } catch (err) {
      console.error("Delete security record error:", err);

      setError(
        err.message || "تعذر تعطيل سجل الشخص.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Filter Handlers                                                          */
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

      counts.incidents +=
        getPersonIncidents(item).length ||
        (isIncident(item) ? 1 : 0);

      counts.permits +=
        getPersonPermits(item).length ||
        (isPermit(item) ? 1 : 0);
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
  /* Main UI                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div dir="rtl" className="min-h-screen min-w-0 bg-gray-100">
      <Header />

      <main className="mx-auto min-w-0 max-w-full p-4 sm:p-6">
        {/* Page Header */}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-orange-700">
              إدارة الأمن
            </h1>

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

            {canViewSecurity &&
              canEditSecurity &&
              canCreateSecurity && (
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
            title="إجمالي الأشخاص"
            value={pagination.total}
            color="orange"
          />

          <StatCard
            title="إجمالي الوقائع - الصفحة الحالية"
            value={statistics.incidents}
            color="red"
          />

          <StatCard
            title="إجمالي التصاريح - الصفحة الحالية"
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
              onChange={(event) =>
                handleSearchChange(event.target.value)
              }
              placeholder="بحث بالاسم أو الرقم القومي أو السبب أو التصريح..."
              className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
            />

            <select
              value={jobFilter}
              onChange={(event) =>
                handleJobChange(event.target.value)
              }
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
              onChange={(event) =>
                handleStatusChange(event.target.value)
              }
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
              onChange={(event) =>
                handleFileTypeChange(event.target.value)
              }
              className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-orange-500"
            >
              <option value="">كل أنواع الملفات</option>
              <option value="25">25</option>
              <option value="مناديب/منسقين">
                مناديب/منسقين
              </option>
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
            <h2 className="font-bold text-gray-800">
              سجلات الأمن
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>إجمالي الأشخاص: {pagination.total}</span>
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
                    "المنطقة",
                    "المحافظة",
                    "فرع الواقعة",
                    "البضاعة المسروقة",
                    "قيمة البضاعة",
                    "تاريخ الواقعة",
                    "رقم التصريح",
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
                        {/* Actions */}

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

                          {!canEditSecurity &&
                            !canDeleteSecurity && (
                              <span className="text-gray-400">
                                -
                              </span>
                            )}
                        </td>

                        {/* Person */}

                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          {item.name || "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {item.national_id_number || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {item.job || "-"}
                        </td>

                        {/* البيانات القديمة تظل ظاهرة من قاعدة البيانات */}

                        <td className="px-4 py-3">
                          {getCompanyName(item)}
                        </td>

                        <td className="px-4 py-3">
                          {getAdvertisingCompanyName(item)}
                        </td>

                        <td className="px-4 py-3">
                          {getAreaName(item)}
                        </td>

                        <td className="px-4 py-3">
                          {item.governorate || "-"}
                        </td>

                        {/* Incident */}

                        <td className="min-w-45 px-4 py-3 align-top">
                          <div className="whitespace-pre-wrap leading-7">
                            {getIncidentBranches(
                              item,
                              branchOptions,
                            )}
                          </div>
                        </td>

                        <td className="w-62.5 min-w-62.5 px-4 py-3 align-top">
                          <div className="whitespace-pre-wrap wrap-break-word leading-7">
                            {getIncidentGoods(item)}
                          </div>
                        </td>

                        <td className="whitespace-pre-wrap px-4 py-3 align-top">
                          {getIncidentValues(item)}
                        </td>

                        <td className="whitespace-pre-wrap px-4 py-3 align-top">
                          {getIncidentDates(item)}
                        </td>

                        {/* Permit */}

                        <td className="whitespace-pre-wrap px-4 py-3 align-top">
                          {getPermitNumbers(item)}
                        </td>

                        <td className="whitespace-pre-wrap px-4 py-3 align-top">
                          {getPermitDates(item)}
                        </td>

                        {/* Security */}

                        <td className="whitespace-pre-wrap px-4 py-3 font-semibold">
                          {getAllFileTypes(item)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="w-87.5 min-w-87.5 max-w-87.5 px-4 py-3 align-top">
                          <div className="whitespace-pre-wrap wrap-break-word leading-7">
                            {getAllSecurityNotes(item)}
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
                  {Math.min(
                    page * PAGE_SIZE,
                    pagination.total,
                  )}
                  {" من "}
                  {pagination.total}
                  {" شخص"}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  !pagination.hasPreviousPage || loading
                }
                onClick={() =>
                  setPage((previous) =>
                    Math.max(1, previous - 1),
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                السابق
              </button>

              <span className="px-3 text-sm font-semibold text-gray-700">
                صفحة {page} من{" "}
                {Math.max(1, pagination.totalPages)}
              </span>

              <button
                type="button"
                disabled={
                  !pagination.hasNextPage || loading
                }
                onClick={() =>
                  setPage((previous) => previous + 1)
                }
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
              <div>
                <h2 className="text-xl font-bold text-blue-700">
                  مراجعة المنسقين
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  راجع الموقف الأمني وأضف ملاحظات قبل إدخال الأشخاص إلى سجلات الأمن.
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-5">
              <input
                type="search"
                value={coordinatorSearch}
                onChange={(event) =>
                  setCoordinatorSearch(event.target.value)
                }
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
                                item.selected ||
                                item.deleted_security_record,
                            )
                          }
                          onChange={(event) => {
                            const checked =
                              event.target.checked;

                            setCoordinatorRows((previous) =>
                              previous.map((item) => ({
                                ...item,

                                selected:
                                  checked &&
                                  !item.deleted_security_record,
                              })),
                            );
                          }}
                          title="تحديد أو إلغاء تحديد الكل"
                        />
                      </th>

                      <th className="whitespace-nowrap px-3 py-3">
                        الاسم
                      </th>

                      <th className="whitespace-nowrap px-3 py-3">
                        الرقم القومي
                      </th>

                      <th className="whitespace-nowrap px-3 py-3">
                        الوظيفة
                      </th>

                      <th className="whitespace-nowrap px-3 py-3">
                        النوع
                      </th>

                      <th className="whitespace-nowrap px-3 py-3">
                        الشركة
                      </th>

                      <th className="whitespace-nowrap px-3 py-3">
                        الفرع
                      </th>

                      <th className="min-w-45 px-3 py-3">
                        الموقف الأمني
                      </th>

                      <th className="min-w-70 px-3 py-3">
                        ملاحظات جديدة
                      </th>

                      <th className="whitespace-nowrap px-3 py-3">
                        حالة الاستيراد
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredCoordinatorRows.map((item) => {
                      const disabled = Boolean(
                        item.deleted_security_record,
                      );

                      const sourceType =
                        getCoordinatorSourceType(item);

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
                              disabled={
                                disabled || coordinatorSaving
                              }
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
                            {item.branch_name ||
                              item.branch ||
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            <select
                              value={item.security_status}
                              disabled={
                                disabled ||
                                !item.selected ||
                                coordinatorSaving
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
                              {SECURITY_STATUSES.map(
                                (status) => (
                                  <option
                                    key={status}
                                    value={status}
                                  >
                                    {status}
                                  </option>
                                ),
                              )}
                            </select>
                          </td>

                          <td className="min-w-70 px-3 py-3">
                            <textarea
                              value={
                                item.review_notes ??
                                item.notes ??
                                item.security_notes ??
                                ""
                              }
                              onChange={(event) => {
                                const value =
                                  event.target.value;

                                setCoordinatorRows(
                                  (previous) =>
                                    previous.map((row) =>
                                      row.national_id_number ===
                                      item.national_id_number
                                        ? {
                                            ...row,
                                            review_notes: value,
                                          }
                                        : row,
                                    ),
                                );
                              }}
                              disabled={
                                disabled ||
                                !item.selected ||
                                coordinatorSaving
                              }
                              placeholder="اكتب الملاحظات هنا..."
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 p-4 sm:px-5">
              <p className="text-xs leading-6 text-gray-500">
                سيتم حفظ مراجعة الأشخاص المحددين وإضافة السجلات الجديدة فقط.
                سيتم تحديث موقف وملاحظات السجلات الموجودة بالفعل دون إنشاء سجل أمني مكرر.
                لا يتم إنشاء وقائع أو تصاريح تلقائيًا.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openCoordinatorReview}
                  disabled={
                    coordinatorLoading || coordinatorSaving
                  }
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
              {/* Edit Target Selector */}

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

                        const id =
                          target.source_record_id ??
                          target.id;

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

                  {!loadingEditTargets &&
                    !editTargetsError && (
                      <p className="mt-2 text-xs text-gray-600">
                        يمكنك التبديل بين بيانات الشخص وجميع الوقائع والتصاريح المرتبطة به.
                      </p>
                    )}
                </div>
              )}

              {/* Form Error */}

              {formError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Person Fields */}

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

                    <FormField label="المنطقة">
                      <input
                        name="area"
                        value={form.area || ""}
                        onChange={handleChange}
                        placeholder="اسم المنطقة"
                        className="form-input"
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
                          <option
                            key={governorate}
                            value={governorate}
                          >
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
                          <option
                            key={fileType}
                            value={fileType}
                          >
                            {fileType}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="الموقف الأمني">
                      <select
                        name="security_status"
                        value={getNormalizedStatus(
                          form.security_status,
                        )}
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

                    <FormField label="تاريخ الميلاد">
                      <input
                        type="date"
                        name="birth_date"
                        value={form.birth_date}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </FormField>

                    <FormField label="محل الميلاد">
                      <input
                        type="text"
                        name="birth_place"
                        value={form.birth_place}
                        onChange={handleChange}
                        placeholder="أدخل محل الميلاد"
                        className="form-input"
                      />
                    </FormField>
                  </>
                )}

                {/* Incident Fields */}

                {showIncidentFields && (
                  <>
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="mb-1 border-b border-red-100 pb-2">
                        <h3 className="font-bold text-red-700">
                          بيانات الواقعة والبضاعة المسروقة
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          فرع الواقعة مستقل عن بيانات الشخص.
                        </p>
                      </div>
                    </div>

                    <FormField label="فرع الواقعة">
                      <SearchableSelect
                        options={branchOptions}
                        value={form.incident_branch}
                        onChange={(value, option) =>
                          handleSelectChange(
                            "incident_branch",
                            value,
                            option?.label || "",
                          )
                        }
                        placeholder="اختر فرع الواقعة"
                        isDisabled={optionsLoading}
                        isClearable
                      />
                    </FormField>

                    <FormField label="البضاعة المسروقة">
                      <input
                        name="stolen_goods"
                        value={form.stolen_goods}
                        onChange={handleChange}
                        placeholder="اسم البضاعة المسروقة"
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

                    <FormField label="تاريخ الواقعة">
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

                {/* Permit Fields */}

                {showPermitFields && (
                  <>
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="mb-1 mt-3 border-b border-blue-100 pb-2">
                        <h3 className="font-bold text-blue-700">
                          بيانات التصريح
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          بيانات التصريح تشمل رقم التصريح وتاريخ إصداره فقط.
                        </p>
                      </div>
                    </div>

                    <FormField label="رقم التصريح">
                      <input
                        name="permit_number"
                        value={form.permit_number}
                        onChange={handleChange}
                        placeholder="رقم التصريح"
                        className="form-input"
                      />
                    </FormField>

                    <FormField label="تاريخ إصدار التصريح">
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

                {/* Notes */}

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

              {/* Buttons */}

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

        {required && (
          <span className="mr-1 text-red-500">*</span>
        )}
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

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}
