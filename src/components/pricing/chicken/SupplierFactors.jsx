import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../header.jsx";

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
  BRANCHES,
  INITIAL_PRODUCTS,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCT_OVERRIDES,
  createInitialStockPrices,
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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getPeriodStatus = (period, today = getLocalToday()) => {
  if (period.startDate > today) {
    return "مستقبلية";
  }

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

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });

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

const downloadPeriodAttachment = (attachment) => {
  if (!attachment?.file) {
    alert(
      "بيانات المرفق محفوظة، لكن محتوى الملف نفسه غير محفوظ بعد إعادة فتح الصفحة. يلزم استخدام IndexedDB لحفظ الملف وإتاحته للتنزيل.",
    );
    return;
  }

  const url = URL.createObjectURL(attachment.file);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    attachment.fileName || attachment.originalName || "attachment";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// عند تداخل فترتين في يوم واحد، يتم اختيار الفترة ذات تاريخ البداية الأحدث.
const getActivePeriod = (supplier, date) =>
  supplier.periods
    ?.filter(
      (period) =>
        period.startDate <= date && (!period.endDate || period.endDate >= date),
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

const cloneObject = (value) => JSON.parse(JSON.stringify(value || {}));

/* -------------------------------------------------------------------------- */
/* Initial Data                                                               */
/* -------------------------------------------------------------------------- */

const createInitialSuppliers = () =>
  INITIAL_SUPPLIERS.map((supplier) => {
    const productFactors = {};

    INITIAL_PRODUCTS.filter((product) =>
      product.supplierIds.includes(supplier.id),
    ).forEach((product) => {
      productFactors[product.id] = supplier.baseFactor;
    });

    return {
      id: supplier.id,
      code: supplier.code,
      name: supplier.name,
      periods: [
        {
          id: `period-${supplier.id}-1`,
          startDate: "2026-09-01",
          endDate: null,
          productFactors,
          overrides: cloneObject(INITIAL_PRODUCT_OVERRIDES[supplier.id] || {}),
          attachment: null,
        },
      ],
    };
  });

/**
 * تجهيز البيانات المحملة من التخزين.
 * إذا لم توجد بيانات محفوظة، نستخدم البيانات الأولية.
 */
const loadInitialPageData = () => {
  try {
    const saved = getSupplierFactorsData();

    const suppliers =
      Array.isArray(saved?.suppliers) && saved.suppliers.length
        ? saved.suppliers
        : createInitialSuppliers();

    const stockPrices =
      Array.isArray(saved?.stockPrices) && saved.stockPrices.length
        ? saved.stockPrices
        : createInitialStockPrices(TODAY);

    return {
      suppliers,
      stockPrices,
    };
  } catch (error) {
    console.error("Failed to initialize supplier factors:", error);

    return {
      suppliers: createInitialSuppliers(),
      stockPrices: createInitialStockPrices(TODAY),
    };
  }
};

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({ title, value, description, icon, color }) {
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
          <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${colors[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Supplier Factors Page                                                      */
/* -------------------------------------------------------------------------- */

function SupplierFactors() {
  const navigate = useNavigate();

  // تحميل البيانات مرة واحدة عند فتح الصفحة.
  const [initialData] = useState(loadInitialPageData);

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [suppliers, setSuppliers] = useState(initialData.suppliers);
  const [products] = useState(INITIAL_PRODUCTS);
  const [stockPrices, setStockPrices] = useState(initialData.stockPrices);
  const [dailyExchangeData] = useState(getDailyExchangeData);

  const [search, setSearch] = useState("");
  const [searchedSupplierCode, setSearchedSupplierCode] = useState("");
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);
  const [showSupplierTable, setShowSupplierTable] = useState(false);
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

  const [historySupplierCode, setHistorySupplierCode] = useState("");
  const [searchedHistorySupplierCode, setSearchedHistorySupplierCode] =
    useState("");

  const [stockSearchDate, setStockSearchDate] = useState(TODAY);
  const [stockSearch, setStockSearch] = useState("");

  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

  const actionButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition active:scale-[0.98]";

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
  /* Memoized Data                                                            */
  /* ------------------------------------------------------------------------ */

  const supplierGroups = useMemo(() => {
    const query = searchedSupplierCode.trim().toLowerCase();

    // لا تعرض أي منتجات قبل البحث أو اختيار عرض كل الموردين.
    if (!showAllSuppliers && !query) return [];

    return suppliers
      .map((supplier) => {
        const period = getActivePeriod(supplier, selectedDate);

        const supplierProducts = products.filter((product) =>
          product.supplierIds.includes(supplier.id),
        );

        return {
          ...supplier,
          period,
          products: supplierProducts,
        };
      })
      .filter((supplier) => {
        if (showAllSuppliers) return true;

        return supplier.code.trim().toLowerCase() === query;
      });
  }, [
    suppliers,
    products,
    searchedSupplierCode,
    showAllSuppliers,
    selectedDate,
  ]);

  const allPeriods = useMemo(
    () =>
      suppliers.flatMap((supplier) =>
        (supplier.periods || []).map((period) => ({
          ...period,
          supplierId: supplier.id,
          supplierCode: supplier.code,
          supplierName: supplier.name,
        })),
      ),
    [suppliers],
  );

  const filteredHistory = useMemo(() => {
    const code = searchedHistorySupplierCode.trim().toLowerCase();

    if (!code) return [];

    return allPeriods
      .filter((period) => period.supplierCode.trim().toLowerCase() === code)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [allPeriods, searchedHistorySupplierCode]);

  const costRegisterRows = useMemo(() => {
    const exchange = getExchangeByDate(
      dailyExchangeData.exchanges,
      stockSearchDate || selectedDate,
    );

    if (!exchange) return [];

    const query = stockSearch.trim().toLowerCase();
    const rows = [];

    suppliers.forEach((supplier) => {
      const period = getActivePeriod(supplier, stockSearchDate || selectedDate);
      if (!period) return;

      products
        .filter((product) => product.supplierIds.includes(supplier.id))
        .forEach((product) => {
          const productFactor = Number(period.productFactors?.[product.id]);
          const branchFactors = Object.values(
            period.overrides?.[product.id] || {},
          )
            .map(Number)
            .filter((value) => Number.isFinite(value) && value > 0);

          const validFactors = [productFactor, ...branchFactors].filter(
            (value) => Number.isFinite(value) && value > 0,
          );
          const highestFactor = validFactors.length
            ? Math.max(...validFactors)
            : null;

          // الصنف البلدي يأخذ سعر البلدي، وباقي أصناف القائمة سعر الأبيض.
          const type = /بلدي/.test(product.name) ? "baladi" : "white";
          const marketPrice = getSupplierExchangePrice({
            exchange,
            supplierId: supplier.id,
            type,
          });
          const adjustedPrice = exchange.supplierPrices?.[supplier.id]?.[type];
          const hasSupplierPrice =
            adjustedPrice !== undefined &&
            adjustedPrice !== null &&
            adjustedPrice !== "" &&
            Number.isFinite(Number(adjustedPrice)) &&
            Number(adjustedPrice) > 0;

          const cost =
            marketPrice !== null && highestFactor !== null
              ? marketPrice * highestFactor
              : null;

          const row = {
            id: `${supplier.id}-${product.id}`,
            supplier,
            product,
            exchangeDate: exchange.date,
            type,
            marketPrice,
            priceSource: hasSupplierPrice
              ? "بورصة معدلة للمورد"
              : "سعر البورصة العام",
            highestFactor,
            cost,
          };

          if (
            !query ||
            `${supplier.code} ${supplier.name} ${product.code} ${product.name}`
              .toLowerCase()
              .includes(query)
          ) {
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
    products,
    stockSearchDate,
    selectedDate,
    stockSearch,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Statistics                                                               */
  /* ------------------------------------------------------------------------ */

  const totalProducts = supplierGroups.reduce(
    (total, supplier) => total + supplier.products.length,
    0,
  );

  const totalOverrides = supplierGroups.reduce(
    (total, supplier) => total + countOverrides(supplier.period?.overrides),
    0,
  );

  const totalPeriods = allPeriods.length;

  /* ------------------------------------------------------------------------ */
  /* Product Price and Factors                                                */
  /* ------------------------------------------------------------------------ */

  const getProductPrice = (productId, date, supplierId) => {
    const product = products.find(
      (item) => String(item.id) === String(productId),
    );
    if (!product) return null;

    const exchange = getExchangeByDate(dailyExchangeData.exchanges, date);
    if (!exchange) return null;

    const type = /بلدي/.test(product.name) ? "baladi" : "white";
    const price = getSupplierExchangePrice({
      exchange,
      supplierId,
      type,
    });

    if (price === null) return null;

    const adjustedPrice = exchange.supplierPrices?.[supplierId]?.[type];
    const hasSupplierPrice =
      adjustedPrice !== undefined &&
      adjustedPrice !== null &&
      adjustedPrice !== "" &&
      Number.isFinite(Number(adjustedPrice)) &&
      Number(adjustedPrice) > 0;

    return {
      price,
      date: exchange.date,
      source: hasSupplierPrice ? "بورصة معدلة للمورد" : "سعر البورصة العام",
    };
  };

  // معامل الفرع له الأولوية، وإلا يتم استخدام معامل الصنف الافتراضي.
  const getFactor = (period, productId, branchId = null) => {
    if (!period) return null;

    const productFactor = period.productFactors?.[productId];

    if (
      productFactor === undefined ||
      productFactor === null ||
      productFactor === ""
    ) {
      return null;
    }

    if (branchId !== null) {
      const branchFactor = period.overrides?.[productId]?.[branchId];

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

  const getOverridesCount = (period) => countOverrides(period?.overrides);

  const getConfiguredProductsCount = (period) =>
    countProductFactors(period?.productFactors);

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
  const getPreviousDate = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };
  /* ------------------------------------------------------------------------ */
  /* Add New Period                                                           */
  /* ------------------------------------------------------------------------ */

  const handleAddPeriod = (event) => {
    event.preventDefault();

    const supplierId = Number(newPeriod.supplierId);
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
      (item) => String(item.id) === String(supplierId),
    );

    if (!supplier) return;

    const latestPeriod = [...(supplier.periods || [])].sort((a, b) =>
      b.startDate.localeCompare(a.startDate),
    )[0];

    if (latestPeriod && startDate <= latestPeriod.startDate) {
      alert("تاريخ بداية الفترة الجديدة يجب أن يكون بعد بداية آخر فترة");
      return;
    }

    const supplierProducts = products.filter((product) =>
      product.supplierIds.includes(supplierId),
    );

    if (!supplierProducts.length) {
      alert("لا توجد أصناف مرتبطة بهذا المورد");
      return;
    }

    const newPeriodId = `period-${supplierId}-${Date.now()}`;

    // تاريخ اليوم السابق لبداية الفترة الجديدة.
    const previousEndDate = getPreviousDate(startDate);

    // نسخ معاملات الأصناف من الفترة السابقة.
    // استثناءات الفروع لا تنتقل إلى الفترة الجديدة.
    const previousProductFactors = cloneObject(
      latestPeriod?.productFactors || {},
    );

    const attachment = {
      file,
      originalName: file.name,
      fileName: createPeriodFileName(supplier.name, startDate, file),
      size: file.size,
      type: file.type,
      extension,
    };

    setSuppliers((previous) =>
      previous.map((item) => {
        if (String(item.id) !== String(supplierId)) return item;

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
              overrides: {},
              attachment,
            },
          ],
        };
      }),
    );

    const initialInputs = {};

    supplierProducts.forEach((product) => {
      const previousValue = previousProductFactors[product.id];

      initialInputs[product.id] =
        previousValue !== undefined ? String(previousValue) : "";
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
  /* Configure New Period                                                     */
  /* ------------------------------------------------------------------------ */

  const configurationSupplier = configurationTarget
    ? suppliers.find(
        (supplier) =>
          String(supplier.id) === String(configurationTarget.supplierId),
      )
    : null;

  const configurationProducts = configurationTarget
    ? products.filter((product) =>
        product.supplierIds.includes(configurationTarget.supplierId),
      )
    : [];

  const handleSaveProductFactors = (event) => {
    event.preventDefault();

    if (!configurationTarget) return;

    const invalidProduct = configurationProducts.find((product) => {
      const rawValue = productFactorInputs[product.id];
      const value = Number(rawValue);

      return (
        rawValue === undefined ||
        !String(rawValue).trim() ||
        !Number.isFinite(value) ||
        value <= 0
      );
    });

    if (invalidProduct) {
      alert(`يرجى إدخال معامل صحيح للصنف: ${invalidProduct.name}`);
      return;
    }

    const nextProductFactors = {};

    configurationProducts.forEach((product) => {
      nextProductFactors[product.id] = Number(productFactorInputs[product.id]);
    });

    setSuppliers((previous) =>
      previous.map((supplier) => {
        if (String(supplier.id) !== String(configurationTarget.supplierId)) {
          return supplier;
        }

        return {
          ...supplier,
          periods: supplier.periods.map((period) =>
            period.id === configurationTarget.periodId
              ? {
                  ...period,
                  productFactors: {
                    ...period.productFactors,
                    ...nextProductFactors,
                  },
                }
              : period,
          ),
        };
      }),
    );

    setConfigurationTarget(null);
    setProductFactorInputs({});
    alert("تم حفظ معاملات الأصناف بنجاح");
  };

  /* ------------------------------------------------------------------------ */
  /* Edit Factor                                                              */
  /* ------------------------------------------------------------------------ */

  const startEditing = (
    supplierId,
    periodId,
    productId,
    branchId,
    currentValue,
    type,
  ) => {
    setEditingCell({
      supplierId,
      periodId,
      productId,
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

    if (!editingValue.trim() || !Number.isFinite(value) || value <= 0) {
      alert("يجب إدخال معامل صحيح أكبر من صفر");
      return;
    }

    const { supplierId, periodId, productId, branchId, type } = editingCell;

    setSuppliers((previous) =>
      previous.map((supplier) => {
        if (String(supplier.id) !== String(supplierId)) return supplier;

        return {
          ...supplier,
          periods: supplier.periods.map((period) => {
            if (period.id !== periodId) return period;

            if (type === "product") {
              return {
                ...period,
                productFactors: {
                  ...period.productFactors,
                  [productId]: value,
                },
              };
            }

            const nextOverrides = cloneObject(period.overrides);

            const productOverrides = {
              ...(nextOverrides[productId] || {}),
            };

            const productFactor = period.productFactors?.[productId];

            if (value === Number(productFactor)) {
              delete productOverrides[branchId];
            } else {
              productOverrides[branchId] = value;
            }

            if (Object.keys(productOverrides).length) {
              nextOverrides[productId] = productOverrides;
            } else {
              delete nextOverrides[productId];
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

  const resetBranch = (supplierId, periodId, productId, branchId) => {
    setSuppliers((previous) =>
      previous.map((supplier) => {
        if (String(supplier.id) !== String(supplierId)) return supplier;

        return {
          ...supplier,
          periods: supplier.periods.map((period) => {
            if (period.id !== periodId) return period;

            const nextOverrides = cloneObject(period.overrides);

            if (nextOverrides[productId]) {
              delete nextOverrides[productId][branchId];

              if (!Object.keys(nextOverrides[productId]).length) {
                delete nextOverrides[productId];
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
  /* Delete Supplier                                                          */
  /* ------------------------------------------------------------------------ */

  const deleteSupplier = (supplierId) => {
    const supplier = suppliers.find(
      (item) => String(item.id) === String(supplierId),
    );

    if (!supplier) return;

    if (
      !window.confirm(
        `هل تريد حذف المورد "${supplier.name}" من البيانات المحفوظة؟`,
      )
    ) {
      return;
    }

    setSuppliers((previous) =>
      previous.filter((item) => String(item.id) !== String(supplierId)),
    );

    if (String(editingCell?.supplierId) === String(supplierId)) {
      cancelEditing();
    }

    if (String(configurationTarget?.supplierId) === String(supplierId)) {
      setConfigurationTarget(null);
      setProductFactorInputs({});
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Factor Editor                                                            */
  /* ------------------------------------------------------------------------ */

  const renderFactorEditor = (supplier, period, product, branch = null) => {
    if (!period) {
      return (
        <span className="text-xs font-semibold text-red-500">لا توجد فترة</span>
      );
    }

    const type = branch ? "branch" : "product";
    const productFactor = period.productFactors?.[product.id];

    if (
      productFactor === undefined ||
      productFactor === null ||
      productFactor === ""
    ) {
      return (
        <span className="text-xs font-semibold text-red-500">غير محدد</span>
      );
    }

    const branchOverride = branch
      ? period.overrides?.[product.id]?.[branch.id]
      : undefined;

    const isOverridden =
      branchOverride !== undefined &&
      branchOverride !== null &&
      branchOverride !== "";

    const isEditing =
      String(editingCell?.supplierId) === String(supplier.id) &&
      editingCell?.periodId === period.id &&
      String(editingCell?.productId) === String(product.id) &&
      editingCell?.type === type &&
      (type === "product" ||
        String(editingCell?.branchId) === String(branch.id));

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
            onChange={(event) => setEditingValue(event.target.value)}
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
              product.id,
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
              ? "تعديل معامل الصنف الافتراضي لجميع الفروع"
              : `تعديل معامل ${branch.name} لهذا الصنف`
          }
        >
          {formatNumber(currentValue)}
        </button>

        {branch && isOverridden && (
          <button
            type="button"
            onClick={() =>
              resetBranch(supplier.id, period.id, product.id, branch.id)
            }
            className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 transition hover:bg-orange-200"
            title="إعادة معامل الفرع إلى معامل الصنف الافتراضي"
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
    <>
      <div className="sticky top-0 z-50">
        <Header user={true} />
      </div>

      <main dir="rtl" className="min-h-screen bg-slate-100 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1900px]">
          {/* Page heading */}

          <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <span>نظام التسعير</span>
                <span>/</span>
                <span className="font-semibold text-orange-600">
                  معاملات الموردين
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 md:text-3xl">
                معاملات الموردين
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                معامل مستقل لكل صنف، يطبق تلقائيًا على الفروع الـ44، مع إمكانية
                تخصيص معامل مختلف لأي فرع.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/pricing/poultry")}
              className={`${actionButtonClass} border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700`}
            >
              <span>→</span>
              العودة لقسم الدواجن
            </button>
          </div>

          {/* Statistics */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="إجمالي الموردين"
              value={suppliers.length}
              description="عدد الموردين المسجلين"
              icon="📦"
              color="orange"
            />

            <StatCard
              title="المنتجات المعروضة"
              value={totalProducts}
              description="المنتجات المرتبطة بالموردين"
              icon="🛒"
              color="blue"
            />

            <StatCard
              title="معاملات الفروع المخصصة"
              value={totalOverrides}
              description="استثناءات معاملات الأصناف والفروع"
              icon="⚙️"
              color="purple"
            />

            <StatCard
              title="فترات المعاملات"
              value={totalPeriods}
              description="الفترات المحفوظة"
              icon="📅"
              color="green"
            />
          </div>

          {/* Main controls */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-800">
                    إعدادات معاملات الموردين
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    اختر التاريخ المطلوب لمراجعة معاملات الأصناف والفروع السارية
                    في هذا التاريخ.
                  </p>
                </div>

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                  ● الحفظ التلقائي مفعل
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5 md:flex-row md:flex-wrap md:items-end md:px-6">
              <div className="w-full md:max-w-xs">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  تاريخ مراجعة المعاملات
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className={inputClass}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowPeriodForm((value) => !value);
                  setSelectedPeriodFile(null);
                }}
                className={`${actionButtonClass} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}
              >
                ↻ إضافة فترة معاملات
              </button>
            </div>

            {/* Add period */}

            {showPeriodForm && (
              <div className="border-t border-blue-100 bg-blue-50/50 p-5 md:p-6">
                <h3 className="font-bold text-slate-800">
                  إضافة فترة معاملات جديدة
                </h3>

                <p className="mb-4 mt-1 text-xs leading-6 text-slate-500">
                  اختر المورد وتاريخ بداية الفترة وأرفق ملف الفترة. بعد إنشاء
                  الفترة ستظهر أصناف المورد لإدخال معامل مستقل لكل صنف. تاريخ
                  نهاية الفترة السابقة يساوي تاريخ بداية الفترة الجديدة، وتظل
                  الفترة السابقة مستمرة طوال يوم النهاية.
                </p>

                <form
                  onSubmit={handleAddPeriod}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      المورد
                    </label>

                    <select
                      value={newPeriod.supplierId}
                      onChange={(event) =>
                        setNewPeriod((previous) => ({
                          ...previous,
                          supplierId: event.target.value,
                        }))
                      }
                      className={inputClass}
                      required
                    >
                      <option value="">اختر المورد</option>

                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.code} - {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      بداية الفترة الجديدة
                    </label>

                    <input
                      type="date"
                      value={newPeriod.startDate}
                      onChange={(event) =>
                        setNewPeriod((previous) => ({
                          ...previous,
                          startDate: event.target.value,
                        }))
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  {/* Required attachment */}

                  <div className="md:col-span-2 xl:col-span-3">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      مرفق الفترة <span className="text-red-500">*</span>
                    </label>

                    <div className="rounded-xl border-2 border-dashed border-blue-200 bg-white p-5 transition hover:border-blue-400">
                      <input
                        id="period-attachment"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,image/jpeg,image/png,image/webp,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={handlePeriodFileChange}
                        className="hidden"
                      />

                      <label
                        htmlFor="period-attachment"
                        className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center"
                      >
                        <span className="text-4xl">📎</span>

                        <span className="font-bold text-slate-700">
                          اضغط لاختيار ملف الفترة
                        </span>

                        <span className="text-xs text-slate-400">
                          الصور JPG / JPEG / PNG / WEBP، وملفات PDF وExcel
                        </span>

                        <span className="text-xs text-slate-400">
                          الحد الأقصى لحجم الملف 20 MB
                        </span>
                      </label>

                      {selectedPeriodFile && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="text-2xl">
                                {getFileIcon(
                                  getFileExtension(selectedPeriodFile.name),
                                )}
                              </span>

                              <div className="min-w-0">
                                <p className="break-all text-sm font-bold text-slate-800">
                                  {selectedPeriodFile.name}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {formatFileSize(selectedPeriodFile.size)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={removePeriodFile}
                              className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200"
                            >
                              إزالة الملف
                            </button>
                          </div>

                          {newPeriod.supplierId && newPeriod.startDate && (
                            <div className="mt-3 border-t border-green-200 pt-3">
                              <p className="text-xs text-slate-500">
                                اسم الملف بعد إعادة التسمية:
                              </p>

                              <p className="mt-1 break-all text-sm font-bold text-green-800">
                                {createPeriodFileName(
                                  suppliers.find(
                                    (item) =>
                                      String(item.id) ===
                                      String(newPeriod.supplierId),
                                  )?.name || "المورد",
                                  newPeriod.startDate,
                                  selectedPeriodFile,
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {!selectedPeriodFile && (
                        <p className="mt-3 text-center text-xs font-semibold text-red-500">
                          إرفاق الملف مطلوب لإنشاء الفترة
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={!selectedPeriodFile}
                      className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      إنشاء الفترة وعرض الأصناف
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Configure products in the new period */}

            {configurationTarget && (
              <div className="border-t border-purple-200 bg-purple-50/50 p-5 md:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-800">
                      تحديد معاملات أصناف المورد
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      المورد: {configurationSupplier?.name || "-"}
                      {" • "}
                      بداية الفترة: {formatDate(configurationTarget.startDate)}
                    </p>
                  </div>

                  <span className="rounded-full bg-purple-100 px-3 py-2 text-xs font-bold text-purple-700">
                    {configurationProducts.length} صنف
                  </span>
                </div>

                <form onSubmit={handleSaveProductFactors}>
                  <div className="overflow-x-auto rounded-xl border border-purple-100 bg-white">
                    <table className="w-full min-w-162.5 text-right text-sm">
                      <thead className="bg-slate-800 text-white">
                        <tr>
                          <th className="p-4">#</th>
                          <th className="p-4">كود الصنف</th>
                          <th className="p-4">اسم الصنف</th>
                          <th className="p-4">معامل الصنف</th>
                          <th className="p-4">تطبيق المعامل</th>
                        </tr>
                      </thead>

                      <tbody>
                        {configurationProducts.map((product, index) => (
                          <tr
                            key={product.id}
                            className="border-t border-slate-100"
                          >
                            <td className="p-4 text-slate-500">{index + 1}</td>

                            <td className="p-4 font-mono text-xs">
                              {product.code}
                            </td>

                            <td className="p-4 font-semibold text-slate-800">
                              {product.name}
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                required
                                value={productFactorInputs[product.id] ?? ""}
                                onChange={(event) =>
                                  setProductFactorInputs((previous) => ({
                                    ...previous,
                                    [product.id]: event.target.value,
                                  }))
                                }
                                placeholder="أدخل معامل الصنف"
                                className="w-full max-w-48 rounded-lg border border-slate-200 px-3 py-2 text-center font-bold outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                              />
                            </td>

                            <td className="p-4">
                              <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                                جميع الفروع الـ44
                              </span>
                            </td>
                          </tr>
                        ))}

                        {configurationProducts.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-8 text-center text-slate-400"
                            >
                              لا توجد أصناف مرتبطة بهذا المورد.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs leading-6 text-slate-500">
                      المعامل الذي تدخله هنا سيكون افتراضيًا للفروع الـ44.
                      ويمكنك لاحقًا تعديل معامل أي فرع من الجدول الرئيسي.
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfigurationTarget(null);
                          setProductFactorInputs({});
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        إغلاق
                      </button>

                      <button
                        type="submit"
                        className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-purple-700"
                      >
                        حفظ معاملات الأصناف
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </section>

          {/* Main suppliers table */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center md:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  منتجات الموردين ومعاملات الفروع
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {showSupplierTable
                    ? `تاريخ المراجعة: ${formatDate(selectedDate)} • الفروع: ${BRANCHES.length}`
                    : "الجدول مخفي. اضغط لعرض بيانات الموردين."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextVisible = !showSupplierTable;

                  setShowSupplierTable(nextVisible);
                  setSearch("");
                  setSearchedSupplierCode("");
                  setShowAllSuppliers(false);
                }}
                className={`${actionButtonClass} shrink-0 ${
                  showSupplierTable
                    ? "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                {showSupplierTable ? "إخفاء الجدول" : "عرض منتجات الموردين"}
              </button>
            </div>

            {showSupplierTable && (
              <>
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row md:px-6">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      🔍
                    </span>

                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setSearchedSupplierCode(search.trim());
                          setShowAllSuppliers(false);
                        }
                      }}
                      placeholder="أدخل كود المورد..."
                      className={`${inputClass} pr-11`}
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setSearchedSupplierCode("");
                          setShowAllSuppliers(false);
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!search.trim()}
                    onClick={() => {
                      setSearchedSupplierCode(search.trim());
                      setShowAllSuppliers(false);
                    }}
                    className={`${actionButtonClass} shrink-0 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    بحث
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSearchedSupplierCode("");
                      setShowAllSuppliers(true);
                    }}
                    className={`${actionButtonClass} shrink-0 border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100`}
                  >
                    عرض كل الموردين
                  </button>
                </div>
                {!showAllSuppliers && !searchedSupplierCode.trim() ? (
                  <div className="p-12 text-center">
                    <div className="text-4xl">🔎</div>

                    <p className="mt-3 font-bold text-slate-700">
                      أدخل كود المورد لعرض منتجاته
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      لن تظهر المنتجات إلا بعد البحث بكود المورد أو اختيار عرض
                      كل الموردين.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-600 md:px-6">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-green-500" />
                        معامل الفرع الافتراضي من معامل الصنف
                      </span>

                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-orange-500" />
                        معامل فرع معدل
                      </span>

                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-blue-500" />
                        معامل الصنف
                      </span>

                      <span className="mr-auto text-slate-400">
                        اضغط على قيمة المعامل لتعديلها
                      </span>
                    </div>

                    <div className="relative isolate w-full overflow-auto">
                      <table className="min-w-[4910px] border-separate border-spacing-0 text-center text-sm">
                        <thead>
                          <tr>
                            <th
                              rowSpan={2}
                              className={`${STICKY_HEADER_CLASSES.number} border-b border-l border-slate-200 bg-slate-800 p-3 text-white`}
                            >
                              #
                            </th>

                            <th
                              rowSpan={2}
                              className={`${STICKY_HEADER_CLASSES.code} border-b border-l border-slate-200 bg-slate-800 p-3 text-white`}
                            >
                              كود المنتج
                            </th>

                            <th
                              rowSpan={2}
                              className={`${STICKY_HEADER_CLASSES.name} border-b border-l border-slate-200 bg-slate-800 p-3 text-white`}
                            >
                              اسم المنتج
                            </th>

                            <th
                              rowSpan={2}
                              className={`${STICKY_HEADER_CLASSES.base} border-b border-l border-slate-200 bg-blue-700 p-3 text-white`}
                            >
                              معامل الصنف
                            </th>

                            <th
                              colSpan={BRANCHES.length}
                              className="sticky top-0 z-40 border-b border-slate-200 bg-orange-600 p-3 font-bold text-white"
                            >
                              معاملات الصنف في الفروع
                            </th>

                            <th
                              rowSpan={2}
                              className="sticky top-0 z-40 min-w-28 border-b border-r border-slate-200 bg-slate-800 p-3 text-white"
                            >
                              الحالة
                            </th>
                          </tr>

                          <tr>
                            {BRANCHES.map((branch) => (
                              <th
                                key={branch.id}
                                className="sticky top-11 z-30 min-w-24 border-b border-l border-orange-200 bg-orange-50 p-3 font-bold text-orange-800"
                              >
                                {branch.name}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {supplierGroups.map((supplier) => (
                            <Fragment key={supplier.id}>
                              <tr>
                                <td
                                  colSpan={4}
                                  className="sticky right-0 z-30 min-w-141.5 border-b border-t border-orange-200 bg-orange-50 px-5 py-3 text-right"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-lg">
                                        📦
                                      </span>

                                      <div>
                                        <div className="font-extrabold text-slate-800">
                                          {supplier.name}
                                        </div>

                                        <div className="mt-1 text-xs text-slate-500">
                                          {supplier.code}
                                          {" • "}
                                          {supplier.products.length} منتج
                                          {" • "}
                                          {supplier.period
                                            ? `${getConfiguredProductsCount(supplier.period)} صنف له معامل`
                                            : "لا توجد فترة سارية"}
                                          {" • "}
                                          {supplier.period
                                            ? `${getOverridesCount(supplier.period)} استثناء فرع`
                                            : ""}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      {supplier.period ? (
                                        (() => {
                                          const status = getPeriodStatus(
                                            supplier.period,
                                          );

                                          return (
                                            <span
                                              className={`rounded-lg px-3 py-2 text-xs font-semibold ${getPeriodStatusClass(status)}`}
                                            >
                                              الفترة:{" "}
                                              {formatDate(
                                                supplier.period.startDate,
                                              )}
                                              {" — "}
                                              {supplier.period.endDate
                                                ? formatDate(
                                                    supplier.period.endDate,
                                                  )
                                                : "بدون نهاية"}
                                              {" • "}
                                              {status}
                                            </span>
                                          );
                                        })()
                                      ) : (
                                        <span className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">
                                          لا توجد فترة سارية في التاريخ المحدد
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteSupplier(supplier.id)
                                        }
                                        className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                                      >
                                        🗑 حذف المورد
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                <td
                                  colSpan={BRANCHES.length + 1}
                                  className="border-b border-t border-orange-200 bg-orange-50"
                                />
                              </tr>

                              {supplier.products.map(
                                (product, productIndex) => {
                                  const price = getProductPrice(
                                    product.id,
                                    selectedDate,
                                    supplier.id,
                                  );

                                  const factor = getFactor(
                                    supplier.period,
                                    product.id,
                                    null,
                                  );

                                  const estimatedCost =
                                    price && factor !== null
                                      ? Number(price.price) * Number(factor)
                                      : null;

                                  return (
                                    <tr
                                      key={`${supplier.id}-${product.id}`}
                                      className="group"
                                    >
                                      <td
                                        className={`${STICKY_COLUMN_CLASSES.number} border-b border-l border-slate-200 bg-white p-3 font-bold text-slate-500 group-hover:bg-slate-50`}
                                      >
                                        {productIndex + 1}
                                      </td>

                                      <td
                                        className={`${STICKY_COLUMN_CLASSES.code} border-b border-l border-slate-200 bg-white p-3 font-mono text-xs font-semibold text-slate-700 group-hover:bg-slate-50`}
                                      >
                                        {product.code}
                                      </td>

                                      <td
                                        className={`${STICKY_COLUMN_CLASSES.name} border-b border-l border-slate-200 bg-white p-3 text-right group-hover:bg-slate-50`}
                                      >
                                        <div className="font-bold text-slate-800">
                                          {product.name}
                                        </div>

                                        <div className="mt-1 text-[10px] text-slate-400">
                                          {supplier.name}
                                        </div>

                                        <div className="mt-1 text-[10px] text-slate-500">
                                          سعر البورصة:{" "}
                                          {price
                                            ? `${formatNumber(price.price)} (${formatDate(price.date)})`
                                            : "غير مسجل"}
                                          {" • "}
                                          التكلفة الأساسية:{" "}
                                          {estimatedCost !== null
                                            ? formatNumber(estimatedCost)
                                            : "—"}
                                        </div>
                                      </td>

                                      <td
                                        className={`${STICKY_COLUMN_CLASSES.base} border-b border-l border-slate-200 bg-blue-50 p-2`}
                                      >
                                        {renderFactorEditor(
                                          supplier,
                                          supplier.period,
                                          product,
                                        )}
                                      </td>

                                      {BRANCHES.map((branch) => {
                                        const override =
                                          supplier.period?.overrides?.[
                                            product.id
                                          ]?.[branch.id];

                                        const hasOverride =
                                          override !== undefined &&
                                          override !== null &&
                                          override !== "";

                                        const branchFactor = getFactor(
                                          supplier.period,
                                          product.id,
                                          branch.id,
                                        );

                                        return (
                                          <td
                                            key={branch.id}
                                            className={`border-b border-l border-slate-100 p-2 transition ${
                                              hasOverride
                                                ? "bg-orange-50 group-hover:bg-orange-100/70"
                                                : "bg-white group-hover:bg-slate-50"
                                            }`}
                                            title={
                                              branchFactor !== null
                                                ? `التكلفة التقديرية: ${
                                                    price
                                                      ? formatNumber(
                                                          Number(price.price) *
                                                            Number(
                                                              branchFactor,
                                                            ),
                                                        )
                                                      : "لا يوجد سعر بورصة"
                                                  }`
                                                : "لم يتم تحديد معامل الصنف"
                                            }
                                          >
                                            {renderFactorEditor(
                                              supplier,
                                              supplier.period,
                                              product,
                                              branch,
                                            )}
                                          </td>
                                        );
                                      })}

                                      <td className="border-b border-r border-slate-100 bg-white p-2 group-hover:bg-slate-50">
                                        {factor !== null ? (
                                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                            نشط
                                          </span>
                                        ) : (
                                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                                            يحتاج معامل
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                },
                              )}

                              {supplier.products.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={BRANCHES.length + 5}
                                    className="border-b border-slate-100 bg-white p-6 text-center text-sm text-slate-400"
                                  >
                                    لا توجد منتجات مرتبطة بهذا المورد حاليًا.
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}

                          {supplierGroups.length === 0 && (
                            <tr>
                              <td
                                colSpan={BRANCHES.length + 5}
                                className="bg-white p-12 text-center"
                              >
                                <div className="text-4xl">🔎</div>

                                <p className="mt-3 font-bold text-slate-700">
                                  لا توجد نتائج مطابقة
                                </p>

                                <p className="mt-1 text-sm text-slate-400">
                                  تأكد من كود المورد أو اضغط على «عرض كل
                                  الموردين».
                                </p>

                                <button
                                  type="button"
                                  onClick={() => setSearch("")}
                                  className="mt-4 rounded-lg bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
                                >
                                  عرض كل الموردين
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 p-5 md:px-6">
                      <h3 className="mb-3 text-sm font-bold text-slate-700">
                        طريقة حساب التكلفة
                      </h3>

                      <div className="grid grid-cols-1 gap-3 text-xs leading-6 text-slate-500 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="mb-1 block font-bold text-blue-700">
                            01 - معامل الصنف
                          </span>
                          يتم تحديد معامل مستقل لكل صنف تابع للمورد، ويُستخدم
                          هذا المعامل تلقائيًا في جميع الفروع الـ44.
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="mb-1 block font-bold text-orange-700">
                            02 - معامل الفرع
                          </span>
                          يمكن تعديل معامل أي فرع لصنف معين دون التأثير على باقي
                          الفروع أو الأصناف. ويمكن إرجاعه إلى معامل الصنف
                          الافتراضي.
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="mb-1 block font-bold text-green-700">
                            03 - حساب التكلفة
                          </span>
                          تكلفة الصنف الأساسية = آخر سعر سوق مسجل في أو قبل
                          التاريخ المحدد × معامل الصنف. وتُحسب تكلفة كل فرع
                          باستخدام معامل الفرع، أو معامل الصنف عند عدم وجود
                          استثناء.
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </section>

          {/* Historical periods register */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  📚 السجل التاريخي لمعاملات الموردين
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  مراجعة جميع الفترات السابقة والحالية ومعاملات الأصناف
                  واستثناءات الفروع والمرفقات.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowHistory((value) => !value)}
                className={`${actionButtonClass} border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100`}
              >
                {showHistory ? "إخفاء السجل" : "عرض السجل التاريخي"}
              </button>
            </div>

            {showHistory && (
              <div className="p-5 md:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      كود المورد
                    </label>

                    <input
                      value={historySupplierCode}
                      onChange={(event) => {
                        setHistorySupplierCode(event.target.value);
                        setSearchedHistorySupplierCode("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setSearchedHistorySupplierCode(
                            historySupplierCode.trim(),
                          );
                        }
                      }}
                      className={inputClass}
                      placeholder="اكتب كود المورد لعرض جميع فتراته ومعاملاته..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSearchedHistorySupplierCode(historySupplierCode.trim())
                    }
                    disabled={!historySupplierCode.trim()}
                    className={`${actionButtonClass} bg-orange-600 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    عرض
                  </button>
                </div>

                {!searchedHistorySupplierCode.trim() ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
                    أدخل كود المورد واضغط على عرض لإظهار جميع معاملاته في كل
                    الفترات والفروع.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-262.5 text-right text-sm">
                      <thead className="bg-slate-800 text-white">
                        <tr>
                          <th className="p-4">المورد</th>
                          <th className="p-4">بداية الفترة</th>
                          <th className="p-4">نهاية الفترة</th>
                          <th className="p-4">مرفق الفترة</th>
                          <th className="p-4">الأصناف ذات المعامل</th>
                          <th className="p-4">استثناءات الفروع</th>
                          <th className="p-4">الحالة</th>
                          <th className="p-4">التفاصيل</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredHistory.map((period) => {
                          const status = getPeriodStatus(period);

                          return (
                            <Fragment key={period.id}>
                              <tr className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-4">
                                  <div className="font-bold text-slate-800">
                                    {period.supplierName}
                                  </div>

                                  <div className="mt-1 text-xs text-slate-400">
                                    {period.supplierCode}
                                  </div>
                                </td>

                                <td className="p-4 font-semibold text-slate-700">
                                  {formatDate(period.startDate)}
                                </td>

                                <td className="p-4 text-slate-600">
                                  {period.endDate
                                    ? formatDate(period.endDate)
                                    : "بدون نهاية"}
                                </td>

                                <td className="p-4">
                                  {period.attachment ? (
                                    <div className="flex min-w-44 flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">
                                          {getFileIcon(
                                            period.attachment.extension,
                                          )}
                                        </span>

                                        <span className="break-all text-xs font-semibold text-slate-700">
                                          {period.attachment.fileName ||
                                            period.attachment.originalName}
                                        </span>
                                      </div>

                                      <span className="text-xs text-slate-400">
                                        {formatFileSize(period.attachment.size)}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          downloadPeriodAttachment(
                                            period.attachment,
                                          )
                                        }
                                        className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                      >
                                        ⬇ تنزيل المرفق
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      لا يوجد مرفق
                                    </span>
                                  )}
                                </td>

                                <td className="p-4 font-bold text-blue-700">
                                  {getConfiguredProductsCount(period)}
                                </td>

                                <td className="p-4">
                                  {countOverrides(period.overrides)}
                                </td>

                                <td className="p-4">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getPeriodStatusClass(status)}`}
                                  >
                                    {status}
                                  </span>
                                </td>

                                <td className="p-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDate(period.startDate);

                                      window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                      });
                                    }}
                                    className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                  >
                                    مراجعة الفترة
                                  </button>
                                </td>
                              </tr>

                              <tr className="border-b border-slate-200 bg-slate-50">
                                <td colSpan={8} className="p-3">
                                  <details>
                                    <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                                      عرض معاملات الأصناف والفروع المحفوظة في
                                      هذه الفترة
                                    </summary>

                                    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                      <table className="min-w-[4200px] text-center text-xs">
                                        <thead className="bg-slate-100 text-slate-700">
                                          <tr>
                                            <th className="sticky right-0 z-20 bg-slate-100 p-3">
                                              كود المنتج
                                            </th>

                                            <th className="sticky right-32.5 z-20 bg-slate-100 p-3">
                                              اسم المنتج
                                            </th>

                                            <th className="bg-blue-50 p-3">
                                              معامل الصنف
                                            </th>

                                            {BRANCHES.map((branch) => (
                                              <th
                                                key={branch.id}
                                                className="min-w-20 p-3"
                                              >
                                                {branch.name}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>

                                        <tbody>
                                          {products
                                            .filter((product) =>
                                              product.supplierIds.includes(
                                                period.supplierId,
                                              ),
                                            )
                                            .map((product) => {
                                              const productFactor =
                                                period.productFactors?.[
                                                  product.id
                                                ];

                                              return (
                                                <tr
                                                  key={product.id}
                                                  className="border-t border-slate-100"
                                                >
                                                  <td className="sticky right-0 z-10 bg-white p-3 font-mono">
                                                    {product.code}
                                                  </td>

                                                  <td className="sticky right-32.5 z-10 bg-white p-3 text-right font-semibold">
                                                    {product.name}
                                                  </td>

                                                  <td className="bg-blue-50 p-3 font-bold text-blue-700">
                                                    {productFactor !== undefined
                                                      ? formatNumber(
                                                          productFactor,
                                                        )
                                                      : "غير محدد"}
                                                  </td>

                                                  {BRANCHES.map((branch) => {
                                                    const override =
                                                      period.overrides?.[
                                                        product.id
                                                      ]?.[branch.id];

                                                    const value =
                                                      override ?? productFactor;

                                                    return (
                                                      <td
                                                        key={branch.id}
                                                        className={`p-3 ${
                                                          override !== undefined
                                                            ? "bg-orange-50 font-bold text-orange-700"
                                                            : "text-slate-600"
                                                        }`}
                                                      >
                                                        {value !== undefined
                                                          ? formatNumber(value)
                                                          : "—"}
                                                      </td>
                                                    );
                                                  })}
                                                </tr>
                                              );
                                            })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </details>
                                </td>
                              </tr>
                            </Fragment>
                          );
                        })}

                        {filteredHistory.length === 0 && (
                          <tr>
                            <td
                              colSpan={8}
                              className="p-8 text-center text-slate-400"
                            >
                              لا توجد فترات مطابقة لعملية البحث.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Calculated supplier cost register */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  🧮 سجل تكلفة منتجات الموردين
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  التكلفة = سعر البورصة (المعدل للمورد إن وجد) × أعلى معامل بين
                  معامل الصنف ومعاملات الفروع الـ44. يتم استخدام آخر بورصة مسجلة
                  في التاريخ المحدد أو قبله.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowStockRegister((value) => !value)}
                className={`${actionButtonClass} border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100`}
              >
                {showStockRegister ? "إخفاء سجل التكلفة" : "عرض سجل التكلفة"}
              </button>
            </div>

            {showStockRegister && (
              <div className="p-5 md:p-6">
                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      تاريخ حساب التكلفة
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

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      البحث بالمورد أو المنتج
                    </label>

                    <input
                      value={stockSearch}
                      onChange={(event) => setStockSearch(event.target.value)}
                      className={inputClass}
                      placeholder="كود المورد أو اسمه أو كود المنتج أو اسمه..."
                    />
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-lg bg-slate-100 px-3 py-2">
                    عدد النتائج: {costRegisterRows.length}
                  </span>
                  {costRegisterRows[0]?.exchangeDate && (
                    <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                      تاريخ البورصة المستخدمة:{" "}
                      {formatDate(costRegisterRows[0].exchangeDate)}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-262.5 text-right text-sm">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="p-4">كود المورد</th>
                        <th className="p-4">اسم المورد</th>
                        <th className="p-4">كود المنتج</th>
                        <th className="p-4">اسم المنتج</th>
                        <th className="p-4">نوع البورصة</th>
                        <th className="p-4">سعر البورصة</th>
                        <th className="p-4">مصدر السعر</th>
                        <th className="p-4">أعلى معامل</th>
                        <th className="p-4">التكلفة المحسوبة</th>
                      </tr>
                    </thead>

                    <tbody>
                      {costRegisterRows.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                            {item.supplier.code}
                          </td>
                          <td className="p-4 font-semibold text-slate-800">
                            {item.supplier.name}
                          </td>
                          <td className="p-4 font-mono text-xs">
                            {item.product.code}
                          </td>
                          <td className="p-4 font-semibold text-slate-800">
                            {item.product.name}
                          </td>
                          <td className="p-4">
                            <span
                              className={`rounded-lg px-3 py-1 text-xs font-semibold ${item.type === "baladi" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}
                            >
                              {item.type === "baladi" ? "بلدي" : "أبيض"}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-blue-700">
                            {item.marketPrice !== null
                              ? formatNumber(item.marketPrice)
                              : "—"}
                          </td>
                          <td className="p-4 text-xs text-slate-600">
                            {item.priceSource}
                          </td>
                          <td className="p-4 font-bold text-orange-700">
                            {item.highestFactor !== null
                              ? formatNumber(item.highestFactor)
                              : "—"}
                          </td>
                          <td className="p-4 font-extrabold text-green-700">
                            {item.cost !== null
                              ? formatNumber(item.cost)
                              : "لا يمكن الحساب"}
                          </td>
                        </tr>
                      ))}

                      {costRegisterRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="p-8 text-center text-slate-400"
                          >
                            لا توجد نتائج. تأكد من وجود بورصة مسجلة في التاريخ
                            المحدد، وفترة سارية للمورد، ومعامل للصنف.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Footer */}

          <div className="mt-4 text-center text-xs text-slate-400">
            معاملات الموردين • {suppliers.length} مورد • {products.length} منتج
            • {BRANCHES.length} فرع • {allPeriods.length} فترة محفوظة
          </div>
        </div>
      </main>
    </>
  );
}

export default SupplierFactors;
