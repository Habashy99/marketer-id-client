
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../header.jsx";
import { sendHttpReq } from "../../../lib/httpHandler.jsx";

import {
  getDailyExchangeData,
  getExchangeByDate,
  getSupplierExchangePrice,
  getSupplierFactorsData,
  saveSupplierFactorsData,
} from "./data/dailyExchangeStorage.js";

import {
  ALLOWED_FILE_EXTENSIONS,
  MAX_ATTACHMENT_SIZE,
  STICKY_COLUMN_CLASSES,
  STICKY_HEADER_CLASSES,
} from "./data/constantsSupplierFactors.js";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const TODAY = getLocalToday();
const STORAGE_VERSION_KEY = "supplierFactorsSchemaVersion";
const STORAGE_VERSION = "2";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const cloneObject = (value) => JSON.parse(JSON.stringify(value || {}));

const normalizeId = (value) => String(value ?? "").trim();

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const getStableProductKey = (product) => {
  const itemean = normalizeId(product?.itemean);

  if (itemean) return `itemean:${itemean}`;

  const barcode = normalizeId(product?.barcode);

  if (barcode) return `barcode:${barcode}`;

  const name = normalizeText(product?.name ?? product?.a_name);

  if (name) return `name:${name}`;

  return `legacy:${normalizeId(product?.id)}`;
};

const normalizeProductSupplier = (supplier) => {
  if (!supplier) return null;

  if (typeof supplier === "string" || typeof supplier === "number") {
    const id = normalizeId(supplier);

    return id
      ? {
          supplierId: id,
          supplierName: id,
        }
      : null;
  }

  const supplierId = normalizeId(
    supplier.supplierId ??
      supplier.supplier_id ??
      supplier.id ??
      supplier.code,
  );

  const supplierName = String(
    supplier.supplierName ??
      supplier.supplier_name ??
      supplier.name ??
      supplier.a_name ??
      supplier.title ??
      supplierId,
  ).trim();

  if (!supplierId) return null;

  return {
    supplierId,
    supplierName: supplierName || supplierId,
  };
};

const getProductSuppliers = (product) => {
  const suppliers =
    product?.suppliers ??
    product?.selectedSuppliers ??
    product?.selected_suppliers ??
    [];

  if (!Array.isArray(suppliers)) return [];

  return suppliers
    .map(normalizeProductSupplier)
    .filter(Boolean);
};

const getPeriodStatus = (period, today = getLocalToday()) => {
  if (period.startDate > today) return "مستقبلية";

  if (period.endDate && today > period.endDate) {
    return "منتهية";
  }

  return "مستمرة";
};

const getPeriodStatusClass = (status) => {
  switch (status) {
    case "مستقبلية":
      return "bg-blue-100 text-blue-700";
    case "مستمرة":
      return "bg-green-100 text-green-700";
    case "منتهية":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const formatDate = (value) => {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
};

const getFileExtension = (fileName = "") =>
  fileName.split(".").pop()?.toLowerCase() || "";

const sanitizeFileName = (value = "") =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_");

const createPeriodFileName = (supplierName, startDate, file) => {
  const supplierFileName = sanitizeFileName(supplierName);
  const extension = getFileExtension(file.name);

  return `${supplierFileName}_${startDate}.${extension}`;
};

const formatFileSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} بايت`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileIcon = (extension) => {
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return "🖼️";
  if (extension === "pdf") return "📕";
  if (["xls", "xlsx"].includes(extension)) return "📊";

  return "📎";
};

const getPreviousDate = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
};

const getActivePeriod = (supplier, date) =>
  (supplier?.periods || [])
    .filter(
      (period) =>
        period.startDate <= date &&
        (!period.endDate || period.endDate >= date),
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null;

const countOverrides = (overrides = {}) =>
  Object.values(overrides).reduce(
    (total, productOverrides) =>
      total + Object.keys(productOverrides || {}).length,
    0,
  );

const countProductFactors = (productFactors = {}) =>
  Object.keys(productFactors || {}).length;

const getProductType = (product) => {
  const type = String(product?.type ?? "").trim().toLowerCase();

  if (
    type === "baladi" ||
    type.includes("balady") ||
    type.includes("بلدي")
  ) {
    return "baladi";
  }

  return "white";
};

const getProductTypeLabel = (product) =>
  getProductType(product) === "baladi" ? "بلدي" : "أبيض";

const getPeriodProductType = (period, product) =>
  period?.productTypes?.[product.key] || product.type || "white";

const getProductTypeText = (type) =>
  type === "baladi" ? "بلدي" : "أبيض";

/* -------------------------------------------------------------------------- */
/* Initial Data                                                               */
/* -------------------------------------------------------------------------- */

const loadInitialPageData = () => {
  try {
    const saved = getSupplierFactorsData();

    let suppliers = Array.isArray(saved?.suppliers)
      ? saved.suppliers
      : [];

    /*
     * تصفير بيانات الموردين التجريبية القديمة مرة واحدة فقط.
     * لا يتم حذف البورصة أو بيانات التصنيع أو هوامش الربح.
     * كما نحتفظ ببيانات stockPrices الموجودة.
     */
    if (localStorage.getItem(STORAGE_VERSION_KEY) !== STORAGE_VERSION) {
      suppliers = [];

      saveSupplierFactorsData({
        suppliers: [],
        stockPrices: Array.isArray(saved?.stockPrices)
          ? saved.stockPrices
          : [],
      });

      localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    }

    return {
      suppliers,
      stockPrices: Array.isArray(saved?.stockPrices)
        ? saved.stockPrices
        : [],
    };
  } catch (error) {
    console.error("Failed to initialize supplier factors:", error);

    return {
      suppliers: [],
      stockPrices: [],
    };
  }
};

const createAttachmentData = (file, supplierName, startDate) => ({
  file,
  originalName: file.name,
  fileName: createPeriodFileName(supplierName, startDate, file),
  size: file.size,
  type: file.type,
  extension: getFileExtension(file.name),
});

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({ title, value, description, icon, color = "blue" }) {
  const colors = {
    orange: "bg-orange-50 text-orange-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${
            colors[color] || colors.blue
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, description, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>

      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Supplier Factors Page                                                      */
/* -------------------------------------------------------------------------- */

export default function SupplierFactors() {
  const navigate = useNavigate();

  const [initialData] = useState(loadInitialPageData);

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [suppliers, setSuppliers] = useState(initialData.suppliers);
  const [stockPrices, setStockPrices] = useState(initialData.stockPrices);

  const [dailyExchangeData, setDailyExchangeData] = useState(
    getDailyExchangeData,
  );

  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");

  const [search, setSearch] = useState("");
  const [searchedSupplier, setSearchedSupplier] = useState("");
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);

  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStockRegister, setShowStockRegister] = useState(false);

  const [newPeriod, setNewPeriod] = useState({
    supplierId: "",
    startDate: TODAY,
  });

  const [selectedPeriodFile, setSelectedPeriodFile] = useState(null);

  const [configurationTarget, setConfigurationTarget] = useState(null);
  const [productFactorInputs, setProductFactorInputs] = useState({});

  const [historySupplier, setHistorySupplier] = useState("");
  const [searchedHistorySupplier, setSearchedHistorySupplier] = useState("");

  const [stockSearchDate, setStockSearchDate] = useState(TODAY);
  const [stockSearch, setStockSearch] = useState("");

  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

  const actionButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition active:scale-[0.98]";

  /* ------------------------------------------------------------------------ */
  /* Load Branches                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let active = true;

    const loadBranches = async () => {
      setBranchesLoading(true);
      setBranchesError("");

      try {
        const response = await sendHttpReq("supplier-factors/branches");

        if (!active) return;

        if (!response?.success || !Array.isArray(response.branches)) {
          throw new Error(
            response?.message || "استجابة الفروع غير صحيحة",
          );
        }

        setBranches(response.branches);
      } catch (error) {
        console.error("Failed to load supplier factor branches:", error);

        if (active) {
          setBranches([]);
          setBranchesError(
            error.message || "تعذر تحميل الفروع من قاعدة البيانات",
          );
        }
      } finally {
        if (active) setBranchesLoading(false);
      }
    };

    loadBranches();

    return () => {
      active = false;
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Refresh Daily Exchange Data                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const refresh = () => {
      setDailyExchangeData(getDailyExchangeData());
    };

    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Derive Suppliers and Products from Daily Exchange                        */
  /* ------------------------------------------------------------------------ */

  const sourceSuppliers = useMemo(() => {
    const supplierMap = new Map();

    const exchanges = Array.isArray(dailyExchangeData?.exchanges)
      ? dailyExchangeData.exchanges
      : [];

    exchanges.forEach((exchange) => {
      (exchange.products || []).forEach((product) => {
        const productKey = getStableProductKey(product);

        getProductSuppliers(product).forEach((supplier) => {
          const supplierId = normalizeId(supplier.supplierId);

          if (!supplierId) return;

          if (!supplierMap.has(supplierId)) {
            supplierMap.set(supplierId, {
              id: supplierId,
              name: supplier.supplierName,
              products: new Map(),
            });
          }

          const supplierEntry = supplierMap.get(supplierId);

          if (
            !supplierEntry.name ||
            supplierEntry.name === supplierId
          ) {
            supplierEntry.name = supplier.supplierName;
          }

          const existingProduct = supplierEntry.products.get(productKey);

          if (!existingProduct) {
            supplierEntry.products.set(productKey, {
              key: productKey,
              id: productKey,
              barcode: String(product?.barcode ?? ""),
              itemean: String(product?.itemean ?? ""),
              name: String(product?.name ?? product?.a_name ?? "بدون اسم"),
              unitName: String(
                product?.unitName ??
                  product?.unit_name ??
                  product?.unitLabel ??
                  product?.unit_label ??
                  "",
              ),
              type: getProductType(product),
            });
          }
        });
      });
    });

    return Array.from(supplierMap.values())
      .map((supplier) => ({
        ...supplier,
        products: Array.from(supplier.products.values()).sort((a, b) =>
          a.name.localeCompare(b.name, "ar"),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [dailyExchangeData]);

  /* ------------------------------------------------------------------------ */
  /* Synchronize Source Suppliers with Saved Factors                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    setSuppliers((previous) => {
      const previousMap = new Map(
        previous.map((supplier) => [normalizeId(supplier.id), supplier]),
      );

      return sourceSuppliers.map((sourceSupplier) => {
        const existing = previousMap.get(
          normalizeId(sourceSupplier.id),
        );

        if (existing) {
          return {
            ...existing,
            id: sourceSupplier.id,
            name: sourceSupplier.name,
            periods: Array.isArray(existing.periods)
              ? existing.periods
              : [],
          };
        }

        return {
          id: sourceSupplier.id,
          name: sourceSupplier.name,
          periods: [],
        };
      });
    });
  }, [sourceSuppliers]);

  /* ------------------------------------------------------------------------ */
  /* Automatic Persistence                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const saved = saveSupplierFactorsData({
      suppliers,
      stockPrices,
    });

    if (!saved) {
      console.error("تعذر حفظ بيانات معاملات الموردين.");
    }
  }, [suppliers, stockPrices]);

  /* ------------------------------------------------------------------------ */
  /* Combined Supplier Data                                                   */
  /* ------------------------------------------------------------------------ */

  const supplierGroups = useMemo(() => {
    const query = normalizeText(searchedSupplier);

    if (!showAllSuppliers && !query) return [];

    return suppliers
      .map((supplier) => {
        const source = sourceSuppliers.find(
          (item) => normalizeId(item.id) === normalizeId(supplier.id),
        );

        return {
          ...supplier,
          products: source?.products || [],
          period: getActivePeriod(supplier, selectedDate),
        };
      })
      .filter((supplier) => {
        if (showAllSuppliers) return true;

        return (
          normalizeText(supplier.id).includes(query) ||
          normalizeText(supplier.name).includes(query)
        );
      });
  }, [
    suppliers,
    sourceSuppliers,
    searchedSupplier,
    showAllSuppliers,
    selectedDate,
  ]);

  const allPeriods = useMemo(
    () =>
      suppliers.flatMap((supplier) =>
        (supplier.periods || []).map((period) => ({
          ...period,
          supplierId: supplier.id,
          supplierName: supplier.name,
        })),
      ),
    [suppliers],
  );

  const filteredHistory = useMemo(() => {
    const query = normalizeText(searchedHistorySupplier);

    if (!query) return [];

    return allPeriods
      .filter(
        (period) =>
          normalizeText(period.supplierId).includes(query) ||
          normalizeText(period.supplierName).includes(query),
      )
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [allPeriods, searchedHistorySupplier]);

  /* ------------------------------------------------------------------------ */
  /* Product Helpers                                                          */
  /* ------------------------------------------------------------------------ */

  const getSupplierProducts = (supplierId) =>
    sourceSuppliers.find(
      (supplier) => normalizeId(supplier.id) === normalizeId(supplierId),
    )?.products || [];

  const getProductByKey = (supplierId, productKey) =>
    getSupplierProducts(supplierId).find(
      (product) => product.key === productKey,
    );

  const getProductPrice = (product, date, supplierId, selectedType = null) => {
    if (!product) return null;

    const exchange = getExchangeByDate(
      dailyExchangeData.exchanges,
      date,
    );

    if (!exchange) return null;

    const type = selectedType || product.type || "white";

    const price = getSupplierExchangePrice({
      exchange,
      supplierId,
      type,
    });

    if (price === null || price === undefined) return null;

    const adjustedPrice =
      exchange.supplierPrices?.[supplierId]?.[type];

    const hasSupplierPrice =
      adjustedPrice !== undefined &&
      adjustedPrice !== null &&
      adjustedPrice !== "" &&
      Number.isFinite(Number(adjustedPrice)) &&
      Number(adjustedPrice) > 0;

    return {
      price,
      date: exchange.date,
      source: hasSupplierPrice
        ? "بورصة معدلة للمورد"
        : "سعر البورصة العام",
    };
  };

  const getFactor = (period, productKey, branchId = null) => {
    if (!period) return null;

    const productFactor = period.productFactors?.[productKey];

    if (
      productFactor === undefined ||
      productFactor === null ||
      productFactor === ""
    ) {
      return null;
    }

    if (branchId !== null) {
      const branchFactor =
        period.overrides?.[productKey]?.[String(branchId)];

      if (
        branchFactor !== undefined &&
        branchFactor !== null &&
        branchFactor !== ""
      ) {
        return branchFactor;
      }
    }

    return productFactor;
  };

  /* ------------------------------------------------------------------------ */
  /* Cost Register                                                             */
  /* ------------------------------------------------------------------------ */

  const costRegisterRows = useMemo(() => {
    const targetDate = stockSearchDate || selectedDate;

    const exchange = getExchangeByDate(
      dailyExchangeData.exchanges,
      targetDate,
    );

    if (!exchange) return [];

    const query = normalizeText(stockSearch);
    const rows = [];

    suppliers.forEach((supplier) => {
      const period = getActivePeriod(supplier, targetDate);

      if (!period) return;

      const products = getSupplierProducts(supplier.id);

      products.forEach((product) => {
        const productType = getPeriodProductType(period, product);

        const baseFactor = Number(
          period.productFactors?.[product.key],
        );

        const branchFactors = Object.values(
          period.overrides?.[product.key] || {},
        )
          .map(Number)
          .filter(
            (value) =>
              Number.isFinite(value) && value > 0,
          );

        const validFactors = [
          baseFactor,
          ...branchFactors,
        ].filter(
          (value) =>
            Number.isFinite(value) && value > 0,
        );

        const highestFactor = validFactors.length
          ? Math.max(...validFactors)
          : null;

        const priceInfo = getSupplierExchangePrice({
          exchange,
          supplierId: supplier.id,
          type: productType,
        });

        const adjustedPrice =
          exchange.supplierPrices?.[supplier.id]?.[productType];

        const hasSupplierPrice =
          adjustedPrice !== undefined &&
          adjustedPrice !== null &&
          adjustedPrice !== "" &&
          Number.isFinite(Number(adjustedPrice)) &&
          Number(adjustedPrice) > 0;

        const cost =
          priceInfo !== null &&
          priceInfo !== undefined &&
          highestFactor !== null
            ? Number(priceInfo) * highestFactor
            : null;

        const row = {
          id: `${supplier.id}-${product.key}`,
          supplier,
          product,
          productType,
          exchangeDate: exchange.date,
          marketPrice: priceInfo,
          priceSource: hasSupplierPrice
            ? "بورصة معدلة للمورد"
            : "سعر البورصة العام",
          highestFactor,
          cost,
        };

        const searchable = normalizeText(
          `${supplier.id} ${supplier.name} ${product.barcode} ${product.itemean} ${product.name}`,
        );

        if (!query || searchable.includes(query)) {
          rows.push(row);
        }
      });
    });

    return rows.sort((a, b) =>
      a.supplier.name.localeCompare(b.supplier.name, "ar"),
    );
  }, [
    dailyExchangeData,
    suppliers,
    sourceSuppliers,
    stockSearchDate,
    selectedDate,
    stockSearch,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Statistics                                                               */
  /* ------------------------------------------------------------------------ */

  const totalProducts = sourceSuppliers.reduce(
    (total, supplier) => total + supplier.products.length,
    0,
  );

  const totalConfiguredProducts = suppliers.reduce(
    (total, supplier) =>
      total +
      (supplier.periods || []).reduce(
        (periodTotal, period) =>
          periodTotal +
          countProductFactors(period.productFactors),
        0,
      ),
    0,
  );

  const totalOverrides = suppliers.reduce(
    (total, supplier) =>
      total +
      (supplier.periods || []).reduce(
        (periodTotal, period) =>
          periodTotal + countOverrides(period.overrides),
        0,
      ),
    0,
  );

  const totalPeriods = allPeriods.length;

  /* ------------------------------------------------------------------------ */
  /* Search                                                                    */
  /* ------------------------------------------------------------------------ */

  const handleSupplierSearch = (event) => {
    event.preventDefault();

    setSearchedSupplier(search.trim());
    setShowAllSuppliers(false);
  };

  const handleShowAllSuppliers = () => {
    setSearch("");
    setSearchedSupplier("");
    setShowAllSuppliers(true);
  };

  /* ------------------------------------------------------------------------ */
  /* Period Attachment                                                        */
  /* ------------------------------------------------------------------------ */

  const handlePeriodFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedPeriodFile(null);
      return;
    }

    const extension = getFileExtension(file.name);

    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      alert(
        "نوع الملف غير مسموح. يُسمح بالصور JPG وJPEG وPNG وWEBP وملفات PDF وExcel فقط.",
      );

      event.target.value = "";
      setSelectedPeriodFile(null);
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      alert("حجم الملف أكبر من الحد المسموح به (20 MB).");

      event.target.value = "";
      setSelectedPeriodFile(null);
      return;
    }

    if (file.size === 0) {
      alert("الملف المحدد فارغ، يرجى اختيار ملف آخر.");

      event.target.value = "";
      setSelectedPeriodFile(null);
      return;
    }

    setSelectedPeriodFile(file);
  };

  const removePeriodFile = () => {
    setSelectedPeriodFile(null);

    const input = document.getElementById("period-attachment");

    if (input) input.value = "";
  };

  const downloadPeriodAttachment = (attachment) => {
    if (!attachment?.file) {
      alert(
        "بيانات المرفق محفوظة، لكن محتوى الملف نفسه غير متاح بعد إعادة فتح الصفحة. يلزم استخدام IndexedDB لحفظ الملفات بشكل دائم.",
      );
      return;
    }

    const url = URL.createObjectURL(attachment.file);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      attachment.fileName ||
      attachment.originalName ||
      "attachment";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ------------------------------------------------------------------------ */
  /* Add New Period                                                           */
  /* ------------------------------------------------------------------------ */

  const handleAddPeriod = (event) => {
    event.preventDefault();

    const supplierId = normalizeId(newPeriod.supplierId);
    const startDate = newPeriod.startDate;
    const file = selectedPeriodFile;

    if (!supplierId || !startDate) {
      alert("يرجى تحديد المورد وتاريخ بداية الفترة الجديدة");
      return;
    }

    if (!file) {
      alert("يجب إرفاق ملف للفترة الجديدة");
      return;
    }

    const extension = getFileExtension(file.name);

    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      alert("نوع الملف غير مسموح");
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE || file.size === 0) {
      alert("حجم الملف غير مقبول. الحد الأقصى 20 MB.");
      return;
    }

    const supplier = suppliers.find(
      (item) => normalizeId(item.id) === supplierId,
    );

    if (!supplier) {
      alert("المورد غير موجود في بيانات البورصة اليومية");
      return;
    }

    const supplierProducts = getSupplierProducts(supplierId);

    if (!supplierProducts.length) {
      alert("لا توجد منتجات مرتبطة بهذا المورد في البورصة اليومية");
      return;
    }

    const latestPeriod = [...(supplier.periods || [])].sort(
      (a, b) => b.startDate.localeCompare(a.startDate),
    )[0];

    if (latestPeriod && startDate <= latestPeriod.startDate) {
      alert(
        "تاريخ بداية الفترة الجديدة يجب أن يكون بعد بداية آخر فترة",
      );
      return;
    }

    const newPeriodId = `period-${supplierId}-${Date.now()}`;
    const previousEndDate = getPreviousDate(startDate);

    const previousProductFactors = cloneObject(
      latestPeriod?.productFactors || {},
    );

    const previousProductTypes = cloneObject(
      latestPeriod?.productTypes || {},
    );

    const attachment = createAttachmentData(
      file,
      supplier.name,
      startDate,
    );

    const productsSnapshot = supplierProducts.map((product) => ({
      ...product,
    }));

    setSuppliers((previous) =>
      previous.map((item) => {
        if (normalizeId(item.id) !== supplierId) return item;

        const updatedPeriods = (item.periods || []).map((period) => {
          if (period.id !== latestPeriod?.id) return period;

          return {
            ...period,
            endDate: previousEndDate,
          };
        });

        return {
          ...item,
          periods: [
            ...updatedPeriods,
            {
              id: newPeriodId,
              startDate,
              endDate: null,
              productFactors: previousProductFactors,
              productTypes: previousProductTypes,
              overrides: {},
              attachment,
              productsSnapshot,
            },
          ],
        };
      }),
    );

    const initialInputs = {};

    supplierProducts.forEach((product) => {
      const previousValue = previousProductFactors[product.key];

      initialInputs[product.key] =
        previousValue !== undefined && previousValue !== null
          ? String(previousValue)
          : "";
    });

    setConfigurationTarget({
      supplierId,
      periodId: newPeriodId,
      startDate,
    });

    setProductFactorInputs(initialInputs);

    setSelectedDate(startDate);

    setNewPeriod({
      supplierId: "",
      startDate,
    });

    setSelectedPeriodFile(null);
    setShowPeriodForm(false);
  };

  /* ------------------------------------------------------------------------ */
  /* Configure Period                                                         */
  /* ------------------------------------------------------------------------ */

  const configurationSupplier = configurationTarget
    ? suppliers.find(
        (supplier) =>
          normalizeId(supplier.id) ===
          normalizeId(configurationTarget.supplierId),
      )
    : null;

  const configurationPeriod = configurationTarget
    ? configurationSupplier?.periods?.find(
        (period) => period.id === configurationTarget.periodId,
      )
    : null;

  const configurationProducts = configurationTarget
    ? getSupplierProducts(configurationTarget.supplierId)
    : [];

  const updateProductType = (supplierId, periodId, productKey, type) => {
    setSuppliers((previous) =>
      previous.map((supplier) => {
        if (normalizeId(supplier.id) !== normalizeId(supplierId)) {
          return supplier;
        }

        return {
          ...supplier,
          periods: (supplier.periods || []).map((period) => {
            if (period.id !== periodId) return period;

            return {
              ...period,
              productTypes: {
                ...(period.productTypes || {}),
                [productKey]: type,
              },
            };
          }),
        };
      }),
    );
  };

  const handleSaveProductFactors = (event) => {
    event.preventDefault();

    if (!configurationTarget) return;

    const invalidProduct = configurationProducts.find((product) => {
      const rawValue = productFactorInputs[product.key];
      const value = Number(rawValue);

      return (
        rawValue === undefined ||
        !String(rawValue).trim() ||
        !Number.isFinite(value) ||
        value <= 0
      );
    });

    if (invalidProduct) {
      alert(
        `يرجى إدخال معامل صحيح للمنتج: ${invalidProduct.name}`,
      );
      return;
    }

    const nextProductFactors = {};

    configurationProducts.forEach((product) => {
      nextProductFactors[product.key] = Number(
        productFactorInputs[product.key],
      );
    });

    setSuppliers((previous) =>
      previous.map((supplier) => {
        if (
          normalizeId(supplier.id) !==
          normalizeId(configurationTarget.supplierId)
        ) {
          return supplier;
        }

        return {
          ...supplier,
          periods: (supplier.periods || []).map((period) =>
            period.id === configurationTarget.periodId
              ? {
                  ...period,
                  productFactors: {
                    ...period.productFactors,
                    ...nextProductFactors,
                  },
                  productsSnapshot: configurationProducts,
                }
              : period,
          ),
        };
      }),
    );

    setConfigurationTarget(null);
    setProductFactorInputs({});

    alert("تم حفظ معاملات المنتجات بنجاح");
  };

  /* ------------------------------------------------------------------------ */
  /* Edit Factor                                                              */
  /* ------------------------------------------------------------------------ */

  const startEditing = (
    supplierId,
    periodId,
    productKey,
    branchId,
    currentValue,
    type,
  ) => {
    setEditingCell({
      supplierId,
      periodId,
      productKey,
      branchId,
      type,
    });

    setEditingValue(
      currentValue === null || currentValue === undefined
        ? ""
        : String(currentValue),
    );
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const saveCell = () => {
    if (!editingCell) return;

    const value = Number(editingValue);

    if (
      !editingValue.trim() ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      alert("يجب إدخال معامل صحيح أكبر من صفر");
      return;
    }

    const {
      supplierId,
      periodId,
      productKey,
      branchId,
      type,
    } = editingCell;

    setSuppliers((previous) =>
      previous.map((supplier) => {
        if (
          normalizeId(supplier.id) !== normalizeId(supplierId)
        ) {
          return supplier;
        }

        return {
          ...supplier,
          periods: (supplier.periods || []).map((period) => {
            if (period.id !== periodId) return period;

            if (type === "product") {
              return {
                ...period,
                productFactors: {
                  ...period.productFactors,
                  [productKey]: value,
                },
              };
            }

            const nextOverrides = cloneObject(period.overrides);

            const productOverrides = {
              ...(nextOverrides[productKey] || {}),
            };

            const productFactor =
              period.productFactors?.[productKey];

            if (value === Number(productFactor)) {
              delete productOverrides[String(branchId)];
            } else {
              productOverrides[String(branchId)] = value;
            }

            if (Object.keys(productOverrides).length) {
              nextOverrides[productKey] = productOverrides;
            } else {
              delete nextOverrides[productKey];
            }

            return {
              ...period,
              overrides: nextOverrides,
            };
          }),
        };
      }),
    );

    cancelEditing();
  };

  /* ------------------------------------------------------------------------ */
  /* Reset Branch Factor                                                      */
  /* ------------------------------------------------------------------------ */

  const resetBranch = (
    supplierId,
    periodId,
    productKey,
    branchId,
  ) => {
    setSuppliers((previous) =>
      previous.map((supplier) => {
        if (
          normalizeId(supplier.id) !== normalizeId(supplierId)
        ) {
          return supplier;
        }

        return {
          ...supplier,
          periods: (supplier.periods || []).map((period) => {
            if (period.id !== periodId) return period;

            const nextOverrides = cloneObject(period.overrides);

            if (nextOverrides[productKey]) {
              delete nextOverrides[productKey][String(branchId)];

              if (
                !Object.keys(nextOverrides[productKey]).length
              ) {
                delete nextOverrides[productKey];
              }
            }

            return {
              ...period,
              overrides: nextOverrides,
            };
          }),
        };
      }),
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Factor Editor                                                            */
  /* ------------------------------------------------------------------------ */

  const renderFactorEditor = (
    supplier,
    period,
    product,
    branch = null,
  ) => {
    if (!period) {
      return (
        <span className="text-xs font-semibold text-red-500">
          لا توجد فترة
        </span>
      );
    }

    const type = branch ? "branch" : "product";
    const productFactor =
      period.productFactors?.[product.key];

    if (
      productFactor === undefined ||
      productFactor === null ||
      productFactor === ""
    ) {
      return (
        <span className="text-xs font-semibold text-red-500">
          غير محدد
        </span>
      );
    }

    const branchOverride = branch
      ? period.overrides?.[product.key]?.[String(branch.id)]
      : undefined;

    const isOverridden =
      branchOverride !== undefined &&
      branchOverride !== null &&
      branchOverride !== "";

    const isEditing =
      normalizeId(editingCell?.supplierId) ===
        normalizeId(supplier.id) &&
      editingCell?.periodId === period.id &&
      editingCell?.productKey === product.key &&
      editingCell?.type === type &&
      (type === "product" ||
        normalizeId(editingCell?.branchId) ===
          normalizeId(branch.id));

    const currentValue = branch
      ? isOverridden
        ? branchOverride
        : productFactor
      : productFactor;

    if (isEditing) {
      return (
        <div className="flex min-w-24 flex-col gap-2">
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={editingValue}
            onChange={(event) =>
              setEditingValue(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") saveCell();
              if (event.key === "Escape") cancelEditing();
            }}
            className="w-full rounded-lg border border-orange-400 bg-white p-2 text-center font-bold outline-none focus:ring-2 focus:ring-orange-100"
            autoFocus
          />

          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={saveCell}
              className="rounded-md bg-green-100 px-2 py-1 text-xs font-bold text-green-700 hover:bg-green-200"
            >
              حفظ
            </button>

            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-md bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
            >
              إلغاء
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-w-20 flex-col items-center gap-1">
        <button
          type="button"
          onClick={() =>
            startEditing(
              supplier.id,
              period.id,
              product.key,
              branch?.id ?? null,
              currentValue,
              type,
            )
          }
          className={`rounded-lg px-3 py-2 font-bold transition hover:underline ${
            type === "product"
              ? "text-blue-700 hover:bg-blue-100"
              : isOverridden
                ? "text-orange-700 hover:bg-orange-100"
                : "text-green-700 hover:bg-green-100"
          }`}
          title={
            type === "product"
              ? "تعديل معامل المنتج الافتراضي لجميع الفروع"
              : `تعديل معامل ${branch.name} لهذا المنتج`
          }
        >
          {formatNumber(currentValue)}
        </button>

        {branch && isOverridden && (
          <button
            type="button"
            onClick={() =>
              resetBranch(
                supplier.id,
                period.id,
                product.key,
                branch.id,
              )
            }
            className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 transition hover:bg-orange-200"
            title="إعادة معامل الفرع إلى معامل المنتج الافتراضي"
          >
            ↺ افتراضي
          </button>
        )}
      </div>
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <Fragment>
      <Header />

      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 px-4 py-6 md:px-6"
      >
        <div className="mx-auto max-w-[1900px] space-y-6">
          {/* Page Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="transition hover:text-orange-600"
                >
                  الرئيسية
                </button>
                <span>/</span>
                <span>معاملات الموردين</span>
              </div>

              <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                معاملات الموردين
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                إدارة معاملات كل منتج لكل مورد وتخصيص معاملات الفروع
                بشكل مستقل.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-100`}
              >
                ← رجوع
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPeriodForm((value) => !value);
                  setShowHistory(false);
                  setShowStockRegister(false);
                }}
                className={`${actionButtonClass} bg-orange-600 text-white shadow-sm hover:bg-orange-700`}
              >
                + إضافة فترة جديدة
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="الموردون"
              value={sourceSuppliers.length}
              description="الموردون المستخدمون في البورصة"
              icon="🏢"
              color="orange"
            />

            <StatCard
              title="المنتجات"
              value={totalProducts}
              description="المنتجات المرتبطة بالموردين"
              icon="📦"
              color="blue"
            />

            <StatCard
              title="الفترات"
              value={totalPeriods}
              description="إجمالي الفترات المسجلة"
              icon="📅"
              color="purple"
            />

            <StatCard
              title="معاملات المنتجات"
              value={totalConfiguredProducts}
              description="المعاملات الأساسية المحفوظة"
              icon="⚙️"
              color="green"
            />

            <StatCard
              title="تعديلات الفروع"
              value={totalOverrides}
              description="معاملات الفروع المختلفة"
              icon="🏬"
              color="orange"
            />
          </div>

          {/* Branch Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800">
                  الفروع المرتبطة بالنظام
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  يتم تحميل الفروع مباشرة من جدول sys_branch.
                </p>
              </div>

              <div className="text-sm font-bold">
                {branchesLoading ? (
                  <span className="text-blue-600">
                    جارٍ تحميل الفروع...
                  </span>
                ) : branchesError ? (
                  <span className="text-red-600">
                    تعذر تحميل الفروع
                  </span>
                ) : (
                  <span className="text-green-700">
                    {branches.length} فرع
                  </span>
                )}
              </div>
            </div>

            {branchesError && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {branchesError}
              </p>
            )}
          </div>

          {/* New Period Form */}
          {showPeriodForm && (
            <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <SectionTitle
                title="إضافة فترة معاملات جديدة"
                description="اختر المورد وتاريخ بداية الفترة وارفق ملف المعاملات."
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowPeriodForm(false);
                    setSelectedPeriodFile(null);
                  }}
                  className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                >
                  إغلاق ✕
                </button>
              </SectionTitle>

              {sourceSuppliers.length === 0 ? (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  لا يوجد موردون مستخدمون في صفحة البورصة اليومية.
                  أضف الموردين إلى المنتجات في البورصة أولًا.
                </div>
              ) : (
                <form
                  onSubmit={handleAddPeriod}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      المورد
                    </label>

                    <select
                      required
                      value={newPeriod.supplierId}
                      onChange={(event) =>
                        setNewPeriod((previous) => ({
                          ...previous,
                          supplierId: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="">اختر المورد</option>

                      {sourceSuppliers.map((supplier) => (
                        <option
                          key={supplier.id}
                          value={supplier.id}
                        >
                          {supplier.name} — {supplier.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      تاريخ بداية الفترة
                    </label>

                    <input
                      type="date"
                      required
                      value={newPeriod.startDate}
                      onChange={(event) =>
                        setNewPeriod((previous) => ({
                          ...previous,
                          startDate: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      ملف الفترة
                    </label>

                    <input
                      id="period-attachment"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx"
                      onChange={handlePeriodFileChange}
                      className={inputClass}
                    />

                    <p className="mt-1 text-xs text-slate-400">
                      JPG, PNG, WEBP, PDF, XLS, XLSX — الحد الأقصى
                      20 MB
                    </p>

                    {selectedPeriodFile && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
                        <span className="text-sm text-slate-700">
                          {getFileIcon(
                            getFileExtension(selectedPeriodFile.name),
                          )}{" "}
                          {selectedPeriodFile.name} (
                          {formatFileSize(selectedPeriodFile.size)})
                        </span>

                        <button
                          type="button"
                          onClick={removePeriodFile}
                          className="text-xs font-bold text-red-600 hover:underline"
                        >
                          إزالة الملف
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
                    <button
                      type="submit"
                      className={`${actionButtonClass} bg-orange-600 text-white hover:bg-orange-700`}
                    >
                      إنشاء الفترة وإدخال المعاملات
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPeriodForm(false);
                        setSelectedPeriodFile(null);
                      }}
                      className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {/* Configure Period */}
          {configurationTarget && (
            <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <SectionTitle
                title="إدخال معاملات المنتجات"
                description={`المورد: ${
                  configurationSupplier?.name || configurationTarget.supplierId
                } — بداية الفترة: ${formatDate(
                  configurationTarget.startDate,
                )}`}
              />

              <form onSubmit={handleSaveProductFactors}>
                <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                  أدخل معامل كل منتج وحدد نوعه. سيتم تطبيق المعامل الأساسي
                  على جميع الفروع، ويمكنك تعديل أي فرع بشكل منفصل بعد
                  الحفظ.
                </div>

                {configurationProducts.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    لا توجد منتجات مرتبطة بهذا المورد حاليًا.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-175 text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="p-3 text-right">#</th>
                          <th className="p-3 text-right">الباركود</th>
                          <th className="p-3 text-right">اسم المنتج</th>
                          <th className="p-3 text-right">النوع</th>
                          <th className="p-3 text-center">
                            المعامل الأساسي
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {configurationProducts.map((product, index) => (
                          <tr
                            key={product.key}
                            className="border-t border-slate-100"
                          >
                            <td className="p-3 text-slate-500">
                              {index + 1}
                            </td>

                            <td className="p-3 font-mono text-slate-600">
                              {product.barcode || product.itemean || "-"}
                            </td>

                            <td className="p-3 font-semibold text-slate-800">
                              {product.name}
                            </td>

                            <td className="p-3">
                              <select
                                value={getPeriodProductType(
                                  configurationPeriod,
                                  product,
                                )}
                                onChange={(event) =>
                                  updateProductType(
                                    configurationTarget.supplierId,
                                    configurationTarget.periodId,
                                    product.key,
                                    event.target.value,
                                  )
                                }
                                className="w-full min-w-27.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
                              >
                                <option value="white">أبيض</option>
                                <option value="baladi">بلدي</option>
                              </select>
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                required
                                value={
                                  productFactorInputs[product.key] ?? ""
                                }
                                onChange={(event) =>
                                  setProductFactorInputs((previous) => ({
                                    ...previous,
                                    [product.key]: event.target.value,
                                  }))
                                }
                                placeholder="أدخل المعامل"
                                className="mx-auto block w-40 rounded-lg border border-slate-200 px-3 py-2 text-center outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className={`${actionButtonClass} bg-green-600 text-white hover:bg-green-700`}
                  >
                    حفظ معاملات المنتجات
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfigurationTarget(null);
                      setProductFactorInputs({});
                    }}
                    className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                  >
                    إغلاق
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Main Supplier Table */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <SectionTitle
              title="معاملات الموردين والمنتجات"
              description="ابحث عن مورد أو اعرض جميع الموردين والمنتجات المرتبطة بهم."
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowHistory((value) => !value);
                    setShowStockRegister(false);
                  }}
                  className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  📚 سجل الفترات
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowStockRegister((value) => !value);
                    setShowHistory(false);
                  }}
                  className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  📊 سجل التكلفة
                </button>
              </div>
            </SectionTitle>

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <form
                onSubmit={handleSupplierSearch}
                className="flex gap-2 md:col-span-2"
              >
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم المورد أو معرّف المورد..."
                  className={inputClass}
                />

                <button
                  type="submit"
                  className={`${actionButtonClass} bg-slate-800 text-white hover:bg-slate-900`}
                >
                  بحث
                </button>
              </form>

              <button
                type="button"
                onClick={handleShowAllSuppliers}
                className={`${actionButtonClass} border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100`}
              >
                عرض جميع الموردين
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-600">
                  عرض المعاملات بتاريخ:
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(event.target.value)
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
              </div>

              {showAllSuppliers && (
                <button
                  type="button"
                  onClick={() => setShowAllSuppliers(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-red-600"
                >
                  إخفاء النتائج
                </button>
              )}
            </div>

            {branchesLoading ? (
              <div className="rounded-xl bg-blue-50 p-5 text-center text-sm text-blue-700">
                جارٍ تحميل الفروع...
              </div>
            ) : branchesError ? (
              <div className="rounded-xl bg-red-50 p-5 text-center text-sm text-red-700">
                {branchesError}
              </div>
            ) : supplierGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div className="mb-3 text-4xl">🏢</div>

                <h3 className="font-bold text-slate-700">
                  لا توجد نتائج للعرض
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  ابحث عن مورد أو اضغط على عرض جميع الموردين.
                  الموردون والمنتجات يتم جلبهم من صفحة البورصة اليومية.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {supplierGroups.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-4">
                      <div>
                        <h3 className="font-bold text-slate-800">
                          {supplier.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          معرّف المورد: {supplier.id} —{" "}
                          {supplier.products.length} منتج
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {supplier.period ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getPeriodStatusClass(
                              getPeriodStatus(supplier.period),
                            )}`}
                          >
                            {getPeriodStatus(supplier.period)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                            لا توجد فترة لهذا التاريخ
                          </span>
                        )}

                        {supplier.period && (
                          <span className="text-xs text-slate-500">
                            من {formatDate(supplier.period.startDate)}
                            {supplier.period.endDate
                              ? ` إلى ${formatDate(supplier.period.endDate)}`
                              : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700">
                            <th
                              className={`${STICKY_HEADER_CLASSES.number} border-b border-l border-slate-200 bg-slate-100 p-3 text-center`}
                            >
                              #
                            </th>

                            <th
                              className={`${STICKY_HEADER_CLASSES.code} border-b border-l border-slate-200 bg-slate-100 p-3 text-right`}
                            >
                              الباركود
                            </th>

                            <th
                              className={`${STICKY_HEADER_CLASSES.name} border-b border-l border-slate-200 bg-slate-100 p-3 text-right`}
                            >
                              اسم المنتج
                            </th>

                            <th
                              className={`${STICKY_HEADER_CLASSES.base} border-b border-l border-slate-200 bg-blue-50 p-3 text-center`}
                            >
                              المعامل الأساسي
                            </th>

                            {branches.map((branch) => (
                              <th
                                key={branch.id}
                                className="sticky top-0 z-40 min-w-28.75 border-b border-l border-slate-200 bg-slate-100 p-3 text-center"
                                title={branch.englishName || ""}
                              >
                                <div className="font-bold">
                                  {branch.name}
                                </div>
                                <div className="mt-1 text-[10px] text-slate-400">
                                  {branch.id}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {supplier.products.map((product, index) => {
                            const selectedType = getPeriodProductType(
                              supplier.period,
                              product,
                            );

                            return (
                              <tr
                                key={product.key}
                                className="border-b border-slate-100 transition hover:bg-orange-50/40"
                              >
                                <td
                                  className={`${STICKY_COLUMN_CLASSES.number} border-l border-slate-200 bg-white p-3 text-center text-slate-500`}
                                >
                                  {index + 1}
                                </td>

                                <td
                                  className={`${STICKY_COLUMN_CLASSES.code} border-l border-slate-200 bg-white p-3 font-mono text-slate-600`}
                                >
                                  {product.barcode ||
                                    product.itemean ||
                                    "-"}
                                </td>

                                <td
                                  className={`${STICKY_COLUMN_CLASSES.name} border-l border-slate-200 bg-white p-3`}
                                >
                                  <div className="font-bold text-slate-800">
                                    {product.name}
                                  </div>

                                  <div className="mt-1 text-[10px] text-slate-400">
                                    {getProductTypeText(selectedType)}
                                    {product.unitName
                                      ? ` — ${product.unitName}`
                                      : ""}
                                  </div>
                                </td>

                                <td
                                  className={`${STICKY_COLUMN_CLASSES.base} border-l border-slate-200 bg-blue-50 p-2 text-center`}
                                >
                                  {renderFactorEditor(
                                    supplier,
                                    supplier.period,
                                    product,
                                  )}
                                </td>

                                {branches.map((branch) => (
                                  <td
                                    key={branch.id}
                                    className="border-l border-slate-100 p-2 text-center"
                                  >
                                    {renderFactorEditor(
                                      supplier,
                                      supplier.period,
                                      product,
                                      branch,
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}

                          {supplier.products.length === 0 && (
                            <tr>
                              <td
                                colSpan={branches.length + 4}
                                className="p-8 text-center text-slate-500"
                              >
                                لا توجد منتجات مرتبطة بهذا المورد.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>
                          المنتجات: {supplier.products.length}
                        </span>

                        <span>
                          معاملات محددة:{" "}
                          {countProductFactors(
                            supplier.period?.productFactors,
                          )}
                        </span>

                        <span>
                          تعديلات الفروع:{" "}
                          {countOverrides(supplier.period?.overrides)}
                        </span>
                      </div>

                      {supplier.period?.attachment && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadPeriodAttachment(
                              supplier.period.attachment,
                            )
                          }
                          className="text-xs font-bold text-blue-700 hover:underline"
                        >
                          📎 ملف الفترة:{" "}
                          {supplier.period.attachment.originalName}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* History */}
          {showHistory && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle
                title="سجل الفترات التاريخية"
                description="عرض الفترات السابقة لكل مورد ومعاملات المنتجات المسجلة خلالها."
              />

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearchedHistorySupplier(historySupplier.trim());
                }}
                className="mb-5 flex flex-wrap gap-2"
              >
                <input
                  value={historySupplier}
                  onChange={(event) =>
                    setHistorySupplier(event.target.value)
                  }
                  placeholder="ابحث باسم المورد أو معرّفه..."
                  className={`${inputClass} flex-1`}
                />

                <button
                  type="submit"
                  className={`${actionButtonClass} bg-slate-800 text-white hover:bg-slate-900`}
                >
                  بحث
                </button>
              </form>

              {!searchedHistorySupplier.trim() ? (
                <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  أدخل اسم المورد أو معرّفه لعرض سجل الفترات.
                </p>
              ) : filteredHistory.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  لا توجد فترات مسجلة لهذا المورد.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-212.5 text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3 text-right">المورد</th>
                        <th className="p-3 text-right">بداية الفترة</th>
                        <th className="p-3 text-right">نهاية الفترة</th>
                        <th className="p-3 text-center">الحالة</th>
                        <th className="p-3 text-center">
                          المنتجات بمعامل
                        </th>
                        <th className="p-3 text-center">
                          تعديلات الفروع
                        </th>
                        <th className="p-3 text-center">المرفق</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredHistory.map((period) => {
                        const status = getPeriodStatus(period);

                        const historyProducts =
                          period.productsSnapshot ||
                          getSupplierProducts(period.supplierId);

                        return (
                          <Fragment key={period.id}>
                            <tr className="border-t border-slate-100">
                              <td className="p-3 font-semibold text-slate-800">
                                {period.supplierName}
                                <div className="mt-1 text-xs text-slate-400">
                                  {period.supplierId}
                                </div>
                              </td>

                              <td className="p-3">
                                {formatDate(period.startDate)}
                              </td>

                              <td className="p-3">
                                {period.endDate
                                  ? formatDate(period.endDate)
                                  : "مفتوحة"}
                              </td>

                              <td className="p-3 text-center">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${getPeriodStatusClass(
                                    status,
                                  )}`}
                                >
                                  {status}
                                </span>
                              </td>

                              <td className="p-3 text-center">
                                {countProductFactors(
                                  period.productFactors,
                                )}
                              </td>

                              <td className="p-3 text-center">
                                {countOverrides(period.overrides)}
                              </td>

                              <td className="p-3 text-center">
                                {period.attachment ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      downloadPeriodAttachment(
                                        period.attachment,
                                      )
                                    }
                                    className="font-semibold text-blue-700 hover:underline"
                                  >
                                    📎 تحميل
                                  </button>
                                ) : (
                                  <span className="text-slate-400">
                                    لا يوجد
                                  </span>
                                )}
                              </td>
                            </tr>

                            <tr className="bg-slate-50">
                              <td colSpan={7} className="p-3">
                                <details>
                                  <summary className="cursor-pointer font-semibold text-slate-600">
                                    عرض معاملات المنتجات في هذه الفترة
                                  </summary>

                                  <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                    <table className="w-full min-w-175 text-xs">
                                      <thead className="bg-slate-100">
                                        <tr>
                                          <th className="p-3 text-right">
                                            المنتج
                                          </th>
                                          <th className="p-3 text-center">
                                            النوع
                                          </th>
                                          <th className="p-3 text-center">
                                            المعامل الأساسي
                                          </th>
                                          <th className="p-3 text-center">
                                            عدد تعديلات الفروع
                                          </th>
                                        </tr>
                                      </thead>

                                      <tbody>
                                        {historyProducts.map((product) => {
                                          const productKey =
                                            product.key || product.id;

                                          const productType =
                                            period.productTypes?.[
                                              productKey
                                            ] ||
                                            product.type ||
                                            "white";

                                          return (
                                            <tr
                                              key={productKey}
                                              className="border-t border-slate-100"
                                            >
                                              <td className="p-3">
                                                {product.name}
                                              </td>

                                              <td className="p-3 text-center">
                                                {getProductTypeText(
                                                  productType,
                                                )}
                                              </td>

                                              <td className="p-3 text-center font-bold text-blue-700">
                                                {formatNumber(
                                                  period.productFactors?.[
                                                    productKey
                                                  ],
                                                )}
                                              </td>

                                              <td className="p-3 text-center">
                                                {
                                                  Object.keys(
                                                    period.overrides?.[
                                                      productKey
                                                    ] || {},
                                                  ).length
                                                }
                                              </td>
                                            </tr>
                                          );
                                        })}

                                        {!historyProducts.length && (
                                          <tr>
                                            <td
                                              colSpan={4}
                                              className="p-4 text-center text-slate-400"
                                            >
                                              لا توجد تفاصيل منتجات محفوظة
                                              لهذه الفترة.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </details>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Cost Register */}
          {showStockRegister && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle
                title="سجل تكلفة المنتجات"
                description="حساب التكلفة باستخدام سعر البورصة ومعامل المنتج الأعلى بين المعامل الأساسي وتعديلات الفروع."
              />

              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    تاريخ البورصة
                  </label>

                  <input
                    type="date"
                    value={stockSearchDate}
                    onChange={(event) =>
                      setStockSearchDate(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    البحث
                  </label>

                  <input
                    value={stockSearch}
                    onChange={(event) =>
                      setStockSearch(event.target.value)
                    }
                    placeholder="اسم المورد أو المنتج أو الباركود..."
                    className={inputClass}
                  />
                </div>
              </div>

              {costRegisterRows.length === 0 ? (
                <div className="rounded-xl bg-amber-50 p-6 text-center text-sm text-amber-800">
                  لا توجد بيانات تكلفة متاحة لهذا التاريخ. تأكد من وجود
                  بورصة وفترة معاملات نشطة.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-237.5 text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="p-3 text-right">المورد</th>
                        <th className="p-3 text-right">المنتج</th>
                        <th className="p-3 text-center">النوع</th>
                        <th className="p-3 text-center">تاريخ البورصة</th>
                        <th className="p-3 text-center">سعر البورصة</th>
                        <th className="p-3 text-center">مصدر السعر</th>
                        <th className="p-3 text-center">أعلى معامل</th>
                        <th className="p-3 text-center">التكلفة</th>
                      </tr>
                    </thead>

                    <tbody>
                      {costRegisterRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-3 font-semibold text-slate-800">
                            {row.supplier.name}
                          </td>

                          <td className="p-3">{row.product.name}</td>

                          <td className="p-3 text-center">
                            {getProductTypeText(row.productType)}
                          </td>

                          <td className="p-3 text-center">
                            {formatDate(row.exchangeDate)}
                          </td>

                          <td className="p-3 text-center font-semibold">
                            {formatNumber(row.marketPrice)}
                          </td>

                          <td className="p-3 text-center text-xs text-slate-500">
                            {row.priceSource}
                          </td>

                          <td className="p-3 text-center font-bold text-blue-700">
                            {formatNumber(row.highestFactor)}
                          </td>

                          <td className="p-3 text-center font-bold text-green-700">
                            {formatNumber(row.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500">
            <span>
              الموردون: {sourceSuppliers.length}
            </span>

            <span>
              المنتجات المرتبطة: {totalProducts}
            </span>

            <span>
              الفروع: {branches.length}
            </span>

            <span>
              إجمالي الفترات: {totalPeriods}
            </span>
          </div>
        </div>
      </main>
    </Fragment>
  );
}
