import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../header.jsx";

import { TODAY, CATEGORIES } from "./data/constantsSellingPrices";

import {
  getDailyExchangeData,
  getExchangeByDate,
  getSupplierExchangePrice,
  getActiveSupplierPeriod,
  getHighestSupplierFactor,
  getProfitMargins,
  saveProfitMargins,
} from "./data/dailyExchangeStorage.js";

/* -------------------------------------------------------------------------- */
/* Product Helpers                                                            */
/* -------------------------------------------------------------------------- */

const getStableProductKey = (product) => {
  const itemean = String(product?.itemean ?? "").trim();
  if (itemean) return `itemean:${itemean}`;

  const barcode = String(product?.barcode ?? "").trim();
  if (barcode) return `barcode:${barcode}`;

  const id = String(product?.id ?? "").trim();

  if (id) {
    return /^(itemean|barcode|legacy):/.test(id) ? id : `legacy:${id}`;
  }

  return "";
};

const getProductIdentifiers = (product) => {
  return [
    product?.id,
    product?.originalId,
    product?.itemean,
    product?.barcode,
    product?.code,
    product?.key,
  ]
    .filter(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== "",
    )
    .map(String);
};

const productsMatch = (first, second) => {
  const firstIds = getProductIdentifiers(first);
  const secondIds = new Set(getProductIdentifiers(second));

  return firstIds.some((id) => secondIds.has(id));
};

const marginBelongsToProduct = (margin, product) => {
  const marginProductId = String(margin?.productId ?? "");

  return getProductIdentifiers(product).some(
    (identifier) => identifier === marginProductId,
  );
};

const normalizeProduct = (product) => {
  const key = getStableProductKey(product);

  if (!key) return null;

  const rawType = String(product?.type ?? "")
    .trim()
    .toLowerCase();

  const type =
    rawType === "baladi" ||
    rawType.includes("بلدي") ||
    rawType.includes("balady")
      ? "baladi"
      : "white";

  const supplierIds = [
    ...(Array.isArray(product?.supplierIds) ? product.supplierIds : []),

    ...(Array.isArray(product?.suppliers)
      ? product.suppliers.map((supplier) =>
          typeof supplier === "object"
            ? (supplier.supplierId ?? supplier.id)
            : supplier,
        )
      : []),
  ]
    .filter((id) => id !== undefined && id !== null && id !== "")
    .map(String);

  return {
    ...product,
    id: key,
    key,
    originalId: product?.id,
    code: String(
      product?.itemean ||
        product?.barcode ||
        product?.code ||
        product?.id ||
        "",
    ),
    barcode: String(product?.barcode ?? ""),
    itemean: String(product?.itemean ?? ""),
    name: String(product?.name || product?.a_name || "منتج بدون اسم"),
    type,
    supplierIds: [...new Set(supplierIds)],
  };
};

/**
 * تجميع المنتجات الفعلية من مصادر النظام:
 * 1. كتالوج الدواجن.
 * 2. منتجات البورصة.
 * 3. لقطات المنتجات المحفوظة داخل فترات الموردين.
 *
 * يتم دمج المنتجات باستخدام itemean أو barcode لمنع التكرار.
 * لا يتم تعديل البيانات المحفوظة أو نقلها بين المصادر.
 */
const getProductsFromSystem = (data) => {
  const catalog = Array.isArray(data?.poultryProducts)
    ? data.poultryProducts
    : [];

  const exchangeProducts = (
    Array.isArray(data?.exchanges) ? data.exchanges : []
  ).flatMap((exchange) =>
    Array.isArray(exchange?.products) ? exchange.products : [],
  );

  const suppliers = Array.isArray(data?.supplierFactors?.suppliers)
    ? data.supplierFactors.suppliers
    : [];

  const supplierProducts = suppliers.flatMap((supplier) => {
    const periods = Array.isArray(supplier?.periods) ? supplier.periods : [];

    return periods.flatMap((period) => {
      const snapshots = Array.isArray(period?.productsSnapshot)
        ? period.productsSnapshot
        : [];

      return snapshots.map((product) => ({
        ...product,
        supplierIds: [
          ...(Array.isArray(product?.supplierIds) ? product.supplierIds : []),
          supplier.id,
        ],
      }));
    });
  });

  // البورصة هي المصدر الأساسي عند وجود بيانات المنتج بها.
  const allProducts = [...catalog, ...supplierProducts, ...exchangeProducts];

  const productsMap = new Map();

  allProducts.forEach((rawProduct) => {
    const product = normalizeProduct(rawProduct);

    if (!product) return;

    const existing = productsMap.get(product.id);

    if (!existing) {
      productsMap.set(product.id, product);
      return;
    }

    productsMap.set(product.id, {
      ...existing,
      ...product,

      // الاحتفاظ بمعرف المنتج الأصلي إن كان متاحًا.
      originalId: product.originalId || existing.originalId,

      // دمج الموردين دون تكرار.
      supplierIds: [
        ...new Set([
          ...(existing.supplierIds || []),
          ...(product.supplierIds || []),
        ]),
      ],
    });
  });

  // ربط كل منتج بجميع الموردين الذين لديهم Snapshot مطابق.
  productsMap.forEach((product, key) => {
    const relatedSupplierIds = new Set(product.supplierIds || []);

    suppliers.forEach((supplier) => {
      const periods = Array.isArray(supplier?.periods) ? supplier.periods : [];

      const hasProduct = periods.some((period) => {
        const snapshots = Array.isArray(period?.productsSnapshot)
          ? period.productsSnapshot
          : [];

        return snapshots.some((snapshot) => productsMatch(product, snapshot));
      });

      if (hasProduct && supplier?.id !== undefined) {
        relatedSupplierIds.add(String(supplier.id));
      }
    });

    // دعم الموردين المرتبطين مباشرة بمنتج البورصة.
    exchangeProducts.forEach((exchangeProduct) => {
      if (!productsMatch(product, exchangeProduct)) return;

      (exchangeProduct.suppliers || []).forEach((supplier) => {
        const supplierId =
          typeof supplier === "object"
            ? (supplier.supplierId ?? supplier.id)
            : supplier;

        if (
          supplierId !== undefined &&
          supplierId !== null &&
          supplierId !== ""
        ) {
          relatedSupplierIds.add(String(supplierId));
        }
      });

      (exchangeProduct.supplierIds || []).forEach((supplierId) => {
        if (
          supplierId !== undefined &&
          supplierId !== null &&
          supplierId !== ""
        ) {
          relatedSupplierIds.add(String(supplierId));
        }
      });
    });

    productsMap.set(key, {
      ...product,
      supplierIds: [...relatedSupplierIds],
    });
  });

  return [...productsMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ar"),
  );
};

/* -------------------------------------------------------------------------- */
/* General Helpers                                                            */
/* -------------------------------------------------------------------------- */

const formatDate = (value) => {
  if (!value) return "-";

  const [year, month, day] = String(value).split("-");

  return `${day}/${month}/${year}`;
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPrice = (value) =>
  Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "-";

const getActivePeriod = (periods, date) =>
  periods
    .filter(
      (period) =>
        period.startDate <= date && (!period.endDate || period.endDate >= date),
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null;

const getPreviousDate = (date) => {
  const value = new Date(`${date}T12:00:00`);

  value.setDate(value.getDate() - 1);

  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
};

const getNextDate = (date) => {
  const value = new Date(`${date}T12:00:00`);

  value.setDate(value.getDate() + 1);

  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
};

const getPeriodStatus = (period) => {
  if (period.startDate > TODAY) return "قادمة";
  if (period.endDate && period.endDate < TODAY) return "منتهية";

  return "مستمرة";
};

const getPeriodStatusClass = (period) => {
  const status = getPeriodStatus(period);

  if (status === "قادمة") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "منتهية") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-green-100 text-green-700";
};

const createEmptyCategoryMargins = () =>
  Object.fromEntries(CATEGORIES.map((category) => [category, ""]));

const createMarginId = () =>
  `margin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/* -------------------------------------------------------------------------- */
/* Supplier Helpers                                                           */
/* -------------------------------------------------------------------------- */

const hasSupplierExchangeOverride = (exchange, supplierId, type) => {
  const value = exchange?.supplierPrices?.[supplierId]?.[type];

  return value !== undefined && value !== null && value !== "";
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

function SellingPrices() {
  const navigate = useNavigate();

  /* ---------------------------------------------------------------------- */
  /* System Data                                                            */
  /* ---------------------------------------------------------------------- */

  const [dailyData] = useState(() => getDailyExchangeData());

  const products = useMemo(() => getProductsFromSystem(dailyData), [dailyData]);

  const suppliers = Array.isArray(dailyData?.supplierFactors?.suppliers)
    ? dailyData.supplierFactors.suppliers
    : [];

  const exchanges = Array.isArray(dailyData?.exchanges)
    ? dailyData.exchanges
    : [];

  /* ---------------------------------------------------------------------- */
  /* Profit Margins                                                         */
  /* ---------------------------------------------------------------------- */

  const [margins, setMargins] = useState(() => {
    const savedMargins = getProfitMargins();

    return Array.isArray(savedMargins) ? savedMargins : [];
  });

  useEffect(() => {
    saveProfitMargins(margins);
  }, [margins]);

  /* ---------------------------------------------------------------------- */
  /* Main Filters                                                           */
  /* ---------------------------------------------------------------------- */

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* History Filters                                                        */
  /* ---------------------------------------------------------------------- */

  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [historyCategory, setHistoryCategory] = useState("");

  const [showAllHistoryCategories, setShowAllHistoryCategories] =
    useState(true);

  const [historyStartDate, setHistoryStartDate] = useState(TODAY);

  const [reviewingHistoryId, setReviewingHistoryId] = useState(null);

  /* ---------------------------------------------------------------------- */
  /* Form                                                                   */
  /* ---------------------------------------------------------------------- */

  const [form, setForm] = useState({
    productId: "",
    category: CATEGORIES[0],
    startDate: TODAY,
    profitMargin: "",
    categoryMargins: createEmptyCategoryMargins(),
  });

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

  const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition active:scale-[0.98]";

  /* ---------------------------------------------------------------------- */
  /* Cost Calculation                                                       */
  /* ---------------------------------------------------------------------- */

  const getProductCost = (product, date) => {
    if (!product) return null;

    const exchange = getExchangeByDate(exchanges, date);

    if (!exchange) return null;

    const relatedSuppliers = suppliers.filter((supplier) =>
      (product.supplierIds || []).some(
        (supplierId) => String(supplierId) === String(supplier.id),
      ),
    );

    const supplierCosts = relatedSuppliers
      .map((supplier) => {
        const period = getActiveSupplierPeriod(supplier, date);

        const supplierPeriods = Array.isArray(supplier.periods)
          ? supplier.periods
          : [];

        if (supplierPeriods.length > 0 && !period) {
          return null;
        }

        // استخدام دالة التخزين الأصلية لحساب أعلى معامل
        // للمنتج، بما يشمل معاملات الفروع.
        const factor = getHighestSupplierFactor({
          supplier,
          productId: product.id,
          date,
        });

        if (factor === null) return null;

        const rawExchangePrice = getSupplierExchangePrice({
          exchange,
          supplierId: supplier.id,
          type: product.type,
        });

        const exchangePrice = Number(rawExchangePrice);

        if (
          rawExchangePrice === null ||
          rawExchangePrice === undefined ||
          rawExchangePrice === "" ||
          !Number.isFinite(exchangePrice) ||
          exchangePrice <= 0
        ) {
          return null;
        }

        const calculatedCost = exchangePrice * factor;

        const isOverridden = hasSupplierExchangeOverride(
          exchange,
          supplier.id,
          product.type,
        );

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierCode: supplier.code,
          factor,
          exchangePrice,
          exchangePriceType: isOverridden ? "سعر معدل" : "السعر الأساسي",
          exchangeDate: exchange.date,
          cost: calculatedCost,
        };
      })
      .filter(Boolean);

    if (!supplierCosts.length) return null;

    supplierCosts.sort((a, b) => b.cost - a.cost);

    const highestCost = supplierCosts[0];

    return {
      exchangeDate: exchange.date,
      exchangeType: product.type,
      supplierCosts,
      relatedSupplierCount: supplierCosts.length,
      highestCost: highestCost.cost,

      supplier: {
        id: highestCost.supplierId,
        name: highestCost.supplierName,
        code: highestCost.supplierCode,
      },

      factor: highestCost.factor,
      exchangePrice: highestCost.exchangePrice,
      exchangePriceType: highestCost.exchangePriceType,
      cost: highestCost.cost,
    };
  };

  /* ---------------------------------------------------------------------- */
  /* Current Margins                                                        */
  /* ---------------------------------------------------------------------- */

  const currentRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products
      .filter((product) => {
        if (!keyword) return true;

        return `${product.barcode} ${product.itemean} ${product.name} ${product.code}`
          .toLowerCase()
          .includes(keyword);
      })
      .map((product) => {
        const costInfo = getProductCost(product, selectedDate);

        const productMargins = margins.filter((item) =>
          marginBelongsToProduct(item, product),
        );

        const categoryData = CATEGORIES.map((category) => {
          const period = getActivePeriod(
            productMargins.filter((item) => item.category === category),
            selectedDate,
          );

          const cost = costInfo?.cost ?? null;
          const profitMargin = period?.profitMargin ?? null;

          const profit =
            cost !== null && profitMargin !== null
              ? (cost * profitMargin) / 100
              : null;

          return {
            category,
            period,
            profitMargin,
            profit,
            sellingPrice: profit !== null ? Math.round(cost + profit) : null,
          };
        });

        return {
          ...product,
          costInfo,
          cost: costInfo?.cost ?? null,
          categoryData,
        };
      });
  }, [products, margins, search, selectedDate, exchanges, suppliers]);

  /* ---------------------------------------------------------------------- */
  /* Filtered Main Table                                                    */
  /* ---------------------------------------------------------------------- */

  const filteredRows = useMemo(() => {
    if (!selectedCategory && !showAllCategories) {
      return [];
    }

    if (showAllCategories) return currentRows;

    return currentRows.map((product) => ({
      ...product,
      categoryData: product.categoryData.filter(
        (item) => item.category === selectedCategory,
      ),
    }));
  }, [currentRows, selectedCategory, showAllCategories]);

  /* ---------------------------------------------------------------------- */
  /* Statistics                                                             */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo(() => {
    const availableProducts = currentRows.filter(
      (item) => item.cost !== null,
    ).length;

    const activeMargins = currentRows.reduce(
      (total, product) =>
        total +
        product.categoryData.filter((item) => item.profitMargin !== null)
          .length,
      0,
    );

    const averageMarginValues = currentRows.flatMap((product) =>
      product.categoryData
        .filter((item) => item.profitMargin !== null)
        .map((item) => item.profitMargin),
    );

    const averageMargin = averageMarginValues.length
      ? averageMarginValues.reduce((sum, value) => sum + value, 0) /
        averageMarginValues.length
      : 0;

    return {
      products: products.length,
      availableProducts,
      activeMargins,
      averageMargin,
    };
  }, [currentRows, products.length]);

  /* ---------------------------------------------------------------------- */
  /* History                                                                */
  /* ---------------------------------------------------------------------- */

  const history = useMemo(() => {
    if (!historyCategory && !showAllHistoryCategories) {
      return [];
    }

    const keyword = search.trim().toLowerCase();

    return margins
      .filter((item) => {
        const product = products.find((productItem) =>
          marginBelongsToProduct(item, productItem),
        );

        if (!product) return false;

        const matchesSearch =
          !keyword ||
          `${product.barcode} ${product.itemean} ${product.name} ${product.code}`
            .toLowerCase()
            .includes(keyword);

        const matchesCategory =
          showAllHistoryCategories || item.category === historyCategory;

        const matchesStartDate = item.startDate >= historyStartDate;

        return matchesSearch && matchesCategory && matchesStartDate;
      })
      .map((item) => ({
        ...item,
        product: products.find((product) =>
          marginBelongsToProduct(item, product),
        ),
      }))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [
    margins,
    products,
    search,
    historyCategory,
    showAllHistoryCategories,
    historyStartDate,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Reviewed History Details                                               */
  /* ---------------------------------------------------------------------- */

  const reviewedDetails = useMemo(() => {
    if (!reviewingHistoryId) return null;

    const historyItem = margins.find((item) => item.id === reviewingHistoryId);

    if (!historyItem) return null;

    const product = products.find((item) =>
      marginBelongsToProduct(historyItem, item),
    );

    if (!product) return null;

    const reviewDate = historyItem.startDate;

    const costInfo = getProductCost(product, reviewDate);

    const productMargins = margins.filter((item) =>
      marginBelongsToProduct(item, product),
    );

    const categoryData = CATEGORIES.map((category) => {
      const period = getActivePeriod(
        productMargins.filter((item) => item.category === category),
        reviewDate,
      );

      const cost = costInfo?.cost ?? null;
      const profitMargin = period?.profitMargin ?? null;

      const profit =
        cost !== null && profitMargin !== null
          ? (cost * profitMargin) / 100
          : null;

      return {
        category,
        period,
        profitMargin,
        profit,
        sellingPrice: profit !== null ? Math.round(cost + profit) : null,
      };
    });

    return {
      product,
      reviewDate,
      costInfo,
      categoryData,
    };
  }, [reviewingHistoryId, margins, products, exchanges, suppliers]);

  /* ---------------------------------------------------------------------- */
  /* Form Helpers                                                           */
  /* ---------------------------------------------------------------------- */

  const resetForm = (date = selectedDate) => {
    setForm({
      productId: "",
      category: selectedCategory || CATEGORIES[0],
      startDate: date,
      profitMargin: "",
      categoryMargins: createEmptyCategoryMargins(),
    });

    setEditingId(null);
  };

  const openAddForm = (
    productId = "",
    category = selectedCategory || CATEGORIES[0],
    date = selectedDate,
  ) => {
    setForm({
      productId: String(productId || ""),
      category,
      startDate: date,
      profitMargin: "",
      categoryMargins: createEmptyCategoryMargins(),
    });

    setEditingId(null);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleEdit = (item) => {
    if (!item) return;

    if (item.endDate && item.endDate < TODAY) {
      alert(
        "هذه فترة تاريخية منتهية ولا يمكن تعديلها. يمكنك إنشاء فترة جديدة.",
      );
      return;
    }

    const relatedProduct = products.find((product) =>
      marginBelongsToProduct(item, product),
    );

    if (!relatedProduct) {
      alert("تعذر العثور على المنتج المرتبط بفترة هامش الربح.");
      return;
    }

    const newStartDate =
      selectedDate > item.startDate
        ? selectedDate
        : getNextDate(item.startDate);

    setEditingId(item.id);

    setForm({
      productId: String(relatedProduct.id),
      category: item.category,
      startDate: newStartDate,
      profitMargin: String(item.profitMargin),
      categoryMargins: createEmptyCategoryMargins(),
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ---------------------------------------------------------------------- */
  /* Submit Form                                                            */
  /* ---------------------------------------------------------------------- */

  const handleSubmit = (event) => {
    event.preventDefault();

    const productId = String(form.productId || "").trim();

    const product = products.find((item) => String(item.id) === productId);

    if (!product) {
      alert("يرجى اختيار منتج صحيح من كتالوج الدواجن.");
      return;
    }

    if (!form.startDate) {
      alert("يرجى تحديد تاريخ بداية الفترة.");
      return;
    }

    const createPeriod = (category, profitMargin) => ({
      id: createMarginId(),

      // نفس معرف المنتج الأساسي المستخدم في ManufacturingCost.
      // الأولوية للباركود حتى تتم المطابقة مع baseProductId.
      productId: String(product.barcode || product.id),

      category,
      startDate: form.startDate,
      endDate: null,
      profitMargin,
    });

    /* ------------------------------------------------------------------ */
    /* Edit: One category only                                             */
    /* ------------------------------------------------------------------ */

    if (editingId !== null) {
      const profitMargin = Number(form.profitMargin);

      if (
        form.profitMargin === "" ||
        !Number.isFinite(profitMargin) ||
        profitMargin < 0
      ) {
        alert("يرجى إدخال هامش ربح صحيح.");
        return;
      }

      const matchingPeriods = margins.filter(
        (item) =>
          marginBelongsToProduct(item, product) &&
          item.category === form.category,
      );

      const editingPeriod = matchingPeriods.find(
        (item) => item.id === editingId,
      );

      if (!editingPeriod) {
        alert("الفترة المطلوب تعديلها غير موجودة.");
        return;
      }

      if (editingPeriod.endDate && editingPeriod.endDate < TODAY) {
        alert("هذه الفترة منتهية بالفعل.");
        return;
      }

      if (form.startDate <= editingPeriod.startDate) {
        alert(`يجب اختيار تاريخ بعد ${formatDate(editingPeriod.startDate)}.`);
        return;
      }

      const laterPeriod = matchingPeriods.find(
        (item) => item.id !== editingId && item.startDate >= form.startDate,
      );

      if (laterPeriod) {
        alert(
          `يوجد سجل آخر يبدأ في ${formatDate(laterPeriod.startDate)} أو بعده.`,
        );
        return;
      }

      const overlappingPeriods = matchingPeriods.filter(
        (item) =>
          item.id !== editingId &&
          item.startDate < form.startDate &&
          (!item.endDate || item.endDate >= form.startDate),
      );

      const newPeriod = createPeriod(form.category, profitMargin);

      setMargins((previous) => [
        ...previous.map((item) => {
          const shouldClose =
            item.id === editingId ||
            overlappingPeriods.some((period) => period.id === item.id);

          return shouldClose
            ? {
                ...item,
                endDate: getPreviousDate(form.startDate),
              }
            : item;
        }),
        newPeriod,
      ]);

      if (form.startDate <= TODAY) {
        setSelectedDate(form.startDate);
      }

      resetForm();
      setShowForm(false);

      alert(
        `تم إنشاء فترة جديدة للمنتج "${product.name}" في فئة "${form.category}" بنجاح.`,
      );

      return;
    }

    /* ------------------------------------------------------------------ */
    /* Add: All categories for one product                                */
    /* ------------------------------------------------------------------ */

    const categoryValues = CATEGORIES.map((category) => ({
      category,
      value: form.categoryMargins?.[category] ?? "",
    }));

    const missingCategories = categoryValues.filter(
      (item) => item.value === "",
    );

    if (missingCategories.length > 0) {
      alert(
        `يرجى إدخال هوامش الربح لجميع الفئات.\nالفئات الناقصة: ${missingCategories
          .map((item) => item.category)
          .join("، ")}`,
      );
      return;
    }

    const invalidCategory = categoryValues.find((item) => {
      const value = Number(item.value);

      return !Number.isFinite(value) || value < 0;
    });

    if (invalidCategory) {
      alert(`هامش الربح في فئة "${invalidCategory.category}" غير صحيح.`);
      return;
    }

    const newPeriods = [];

    // التحقق من كل الفئات قبل إنشاء أي فترة.
    for (const item of categoryValues) {
      const matchingPeriods = margins.filter(
        (period) =>
          marginBelongsToProduct(period, product) &&
          period.category === item.category,
      );

      const laterPeriod = matchingPeriods.find(
        (period) => period.startDate >= form.startDate,
      );

      if (laterPeriod) {
        alert(
          `يوجد هامش ربح للمنتج "${product.name}" في فئة "${item.category}" يبدأ في ${formatDate(laterPeriod.startDate)} أو بعده. اختر تاريخًا مناسبًا.`,
        );
        return;
      }

      newPeriods.push(createPeriod(item.category, Number(item.value)));
    }

    // إغلاق الفترة السابقة لكل فئة بشكل مستقل.
    setMargins((previous) => {
      const updatedMargins = previous.map((period) => {
        if (!marginBelongsToProduct(period, product)) {
          return period;
        }

        const newCategoryPeriod = newPeriods.find(
          (newPeriod) => newPeriod.category === period.category,
        );

        if (
          !newCategoryPeriod ||
          period.startDate >= form.startDate ||
          (period.endDate && period.endDate < form.startDate)
        ) {
          return period;
        }

        return {
          ...period,
          endDate: getPreviousDate(form.startDate),
        };
      });

      return [...updatedMargins, ...newPeriods];
    });

    if (form.startDate <= TODAY) {
      setSelectedDate(form.startDate);
    }

    resetForm();
    setShowForm(false);

    alert(
      `تم حفظ هوامش الربح لجميع الفئات (${CATEGORIES.length}) للمنتج "${product.name}" بنجاح.`,
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Delete Period                                                          */
  /* ---------------------------------------------------------------------- */

  const deletePeriod = (id) => {
    if (!window.confirm("هل تريد حذف فترة هامش الربح هذه؟")) {
      return;
    }

    setMargins((previous) => previous.filter((item) => item.id !== id));

    if (editingId === id) {
      resetForm();
      setShowForm(false);
    }

    if (reviewingHistoryId === id) {
      setReviewingHistoryId(null);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Statistics Cards                                                       */
  /* ---------------------------------------------------------------------- */

  const statCards = [
    {
      title: "إجمالي الأصناف",
      value: stats.products,
      description: "عدد المنتجات الفعلية في كتالوج الدواجن",
      icon: "📦",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      title: "الأصناف ذات التكلفة",
      value: stats.availableProducts,
      description: "أصناف لها بورصة ومعاملة مورد سارية",
      icon: "💰",
      color: "text-green-700",
      bg: "bg-green-50",
    },
    {
      title: "هوامش الربح السارية",
      value: stats.activeMargins,
      description: "هوامش مستقلة حسب الصنف والفئة",
      icon: "📊",
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      title: "متوسط هامش الربح",
      value: `${money(stats.averageMargin)}%`,
      description: "متوسط الهوامش السارية",
      icon: "📈",
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
  ];

  const displayedCategories = showAllCategories
    ? CATEGORIES
    : selectedCategory
      ? [selectedCategory]
      : [];

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <>
      <div className="sticky top-0 z-50">
        <Header user={true} />
      </div>

      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 px-3 py-6 md:px-6 md:py-8"
      >
        <div className="mx-auto max-w-[1900px]">
          {/* Page Header */}

          <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <span>نظام التسعير</span>
                <span>/</span>
                <span className="font-semibold text-orange-600">
                  هامش ربح الأصناف
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                  📊
                </div>

                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800 md:text-3xl">
                    هامش ربح الأصناف
                  </h1>

                  <p className="mt-2 text-sm text-slate-500">
                    إدارة هوامش الربح وأسعار البيع بشكل مستقل لكل صنف وفئة.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/pricing/poultry")}
              className={`${buttonClass} border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50`}
            >
              ← إدارة قطاع الدواجن
            </button>
          </div>

          {/* Statistics */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {stat.title}
                    </p>

                    <p className={`mt-2 text-2xl font-extrabold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${stat.bg}`}
                  >
                    {stat.icon}
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>

          {/* Settings */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 md:px-6">
              <div>
                <h2 className="font-extrabold text-slate-800">
                  إعدادات عرض الأسعار
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  اختر تاريخ التسعير والفئة المطلوب مراجعتها.
                </p>
              </div>

              <span className="rounded-full bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                ● حساب التكلفة تلقائي
              </span>
            </div>

            <div className="flex flex-col gap-4 p-5 md:flex-row md:flex-wrap md:items-end md:px-6">
              <div className="w-full md:max-w-xs">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  تاريخ التسعير
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="w-full md:max-w-xs">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  فئة التسعير
                </label>

                <select
                  value={selectedCategory}
                  onChange={(event) => {
                    setSelectedCategory(event.target.value);
                    setShowAllCategories(false);
                  }}
                  className={inputClass}
                >
                  <option value="">اختر الفئة لعرض أسعارها</option>

                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("");
                  setShowAllCategories(true);
                }}
                className={`${buttonClass} ${
                  showAllCategories
                    ? "bg-orange-700 text-white"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                عرض أسعار كل الفئات
              </button>

              <button
                type="button"
                onClick={() => {
                  console.log("Add margin button clicked");

                  if (showForm) {
                    resetForm();
                    setShowForm(false);
                  } else {
                    openAddForm();
                  }
                }}
                className={`${buttonClass} ${
                  showForm
                    ? "bg-slate-700 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {showForm ? "× إغلاق النموذج" : "+ إضافة هوامش ربح لمنتج"}
              </button>
            </div>

            {/* Add / Edit Form */}

            {showForm && (
              <div className="border-t border-orange-100 bg-orange-50/40 p-5 md:p-6">
                <div className="mb-5">
                  <h3 className="font-extrabold text-slate-800">
                    {editingId !== null
                      ? "إنشاء فترة جديدة لهامش ربح"
                      : "إضافة هوامش الربح للمنتج"}
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    اختر المنتج أولًا، ثم أدخل هامش الربح لكل فئة بشكل مستقل.
                    سيتم حفظ جميع الفئات معًا دون التأثير على المنتجات الأخرى.
                  </p>
                </div>

                {products.length === 0 ? (
                  <div className="rounded-xl border border-orange-200 bg-white p-5 text-sm text-orange-700">
                    لا توجد منتجات فعلية في كتالوج الدواجن حاليًا. أضف المنتجات
                    أولًا من إدارة قطاع الدواجن.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          المنتج
                        </label>

                        <select
                          value={form.productId}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              productId: event.target.value,
                            }))
                          }
                          className={inputClass}
                          disabled={editingId !== null}
                          required
                        >
                          <option value="">اختر المنتج</option>

                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {product.code}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          بداية الفترة
                        </label>

                        <input
                          type="date"
                          value={form.startDate}
                          min={
                            editingId !== null
                              ? getNextDate(
                                  margins.find((item) => item.id === editingId)
                                    ?.startDate || TODAY,
                                )
                              : undefined
                          }
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              startDate: event.target.value,
                            }))
                          }
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>

                    {editingId === null ? (
                      <>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="font-extrabold text-slate-800">
                              هوامش الربح حسب الفئة
                            </h4>

                            <p className="mt-1 text-xs text-slate-500">
                              أدخل نسبة مستقلة لكل فئة.
                            </p>
                          </div>

                          <span className="rounded-full bg-orange-100 px-3 py-2 text-xs font-bold text-orange-700">
                            {CATEGORIES.length} فئات
                          </span>
                        </div>

                        {form.productId ? (
                          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                            المنتج المختار:{" "}
                            <strong>
                              {
                                products.find(
                                  (item) => item.id === form.productId,
                                )?.name
                              }
                            </strong>
                          </div>
                        ) : (
                          <div className="mb-4 rounded-xl border border-dashed border-orange-300 bg-white p-4 text-center text-sm text-orange-700">
                            اختر المنتج من القائمة بالأعلى لبدء إدخال هوامش
                            الفئات.
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {CATEGORIES.map((category, index) => (
                            <div
                              key={category}
                              className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <label
                                  htmlFor={`margin-${index}`}
                                  className="text-sm font-bold text-slate-700"
                                >
                                  {category}
                                </label>

                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-50 text-xs font-extrabold text-orange-700">
                                  {index + 1}
                                </span>
                              </div>

                              <div className="relative">
                                <input
                                  id={`margin-${index}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={form.categoryMargins?.[category] ?? ""}
                                  onChange={(event) =>
                                    setForm((previous) => ({
                                      ...previous,
                                      categoryMargins: {
                                        ...previous.categoryMargins,
                                        [category]: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="مثال: 20"
                                  className={`${inputClass} pl-12`}
                                  required
                                  disabled={!form.productId}
                                />

                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                                  %
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          الفئة: {form.category}
                        </label>

                        <div className="relative max-w-md">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.profitMargin}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                profitMargin: event.target.value,
                              }))
                            }
                            placeholder="مثال: 20"
                            className={`${inputClass} pl-12`}
                            required
                          />

                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                            %
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          سيتم إنشاء فترة جديدة لهذه الفئة فقط.
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={!form.productId}
                        className={`${buttonClass} bg-orange-600 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {editingId !== null
                          ? "✓ حفظ وإنشاء فترة جديدة"
                          : "✓ حفظ هوامش الفئات"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setShowForm(false);
                        }}
                        className={`${buttonClass} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </section>

          {/* Main Selling Prices Table */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center md:px-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">
                  أسعار بيع الأصناف حسب الفئة
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  تاريخ التسعير: {formatDate(selectedDate)}
                  {" • "}
                  {showAllCategories
                    ? "جميع الفئات"
                    : selectedCategory || "لم يتم اختيار فئة"}
                  {" • "}
                  عدد الأصناف: {filteredRows.length}
                </p>
              </div>

              <div className="relative w-full lg:max-w-sm">
                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                  🔍
                </span>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث بالباركود أو اسم الصنف..."
                  className={`${inputClass} pr-11`}
                />
              </div>
            </div>

            {!selectedCategory && !showAllCategories ? (
              <div className="p-12 text-center">
                <div className="mb-3 text-4xl">📊</div>

                <h3 className="font-extrabold text-slate-700">
                  اختر فئة لعرض أسعار الأصناف
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  يمكنك اختيار فئة التسعير من الإعدادات أو الضغط على عرض أسعار
                  كل الفئات.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-5 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500 md:px-6">
                  <span>
                    <span className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                    سعر بيع متاح
                  </span>

                  <span>
                    <span className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
                    هامش الربح
                  </span>

                  <span>
                    <span className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                    تفاصيل التكلفة
                  </span>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="min-w-225 w-full border-separate border-spacing-0 text-center text-sm">
                    <thead>
                      <tr>
                        <th
                          rowSpan={2}
                          className="sticky right-0 z-30 min-w-14 border-b border-l border-slate-200 bg-slate-800 p-3 text-white"
                        >
                          #
                        </th>

                        <th
                          rowSpan={2}
                          className="sticky right-14 z-30 min-w-32 border-b border-l border-slate-200 bg-slate-800 p-3 text-white"
                        >
                          كود المنتج
                        </th>

                        <th
                          rowSpan={2}
                          className="sticky right-46 z-30 min-w-56 border-b border-l border-slate-200 bg-slate-800 p-3 text-white"
                        >
                          اسم المنتج
                        </th>

                        <th
                          rowSpan={2}
                          className="min-w-64 border-b border-l border-slate-200 bg-blue-700 p-3 text-white"
                        >
                          تفاصيل أعلى تكلفة
                        </th>

                        <th
                          colSpan={displayedCategories.length}
                          className="border-b border-slate-200 bg-orange-600 p-3 text-white"
                        >
                          أسعار البيع وهوامش الربح
                        </th>
                      </tr>

                      <tr>
                        {displayedCategories.map((category) => (
                          <th
                            key={category}
                            className="min-w-44 border-b border-l border-orange-200 bg-orange-50 p-3 font-bold text-orange-800"
                          >
                            {category}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((product, index) => (
                        <tr
                          key={product.id}
                          className="group hover:bg-slate-50"
                        >
                          <td className="sticky right-0 z-20 border-b border-l border-slate-200 bg-white p-3 font-bold text-slate-500 group-hover:bg-slate-50">
                            {index + 1}
                          </td>

                          <td className="sticky right-14 z-20 border-b border-l border-slate-200 bg-white p-3 font-mono text-xs font-bold text-slate-700 group-hover:bg-slate-50">
                            {product.code || product.barcode || product.itemean}
                          </td>

                          <td className="sticky right-46 z-20 border-b border-l border-slate-200 bg-white p-3 text-right group-hover:bg-slate-50">
                            <div className="font-bold text-slate-800">
                              {product.name}
                            </div>

                            <div className="mt-1 text-[10px] text-slate-400">
                              {product.costInfo?.relatedSupplierCount || 0} مورد
                              مرتبط
                            </div>
                          </td>

                          {/* Cost Details */}

                          <td className="border-b border-l border-slate-200 bg-blue-50 p-3">
                            {product.costInfo ? (
                              <div className="min-w-55 space-y-2 text-right">
                                <div className="rounded-lg border border-blue-100 bg-white p-3">
                                  <p className="text-[10px] text-slate-500">
                                    سعر البورصة
                                  </p>

                                  <p className="mt-1 font-extrabold text-slate-800">
                                    {money(product.costInfo.exchangePrice)} جنيه
                                  </p>

                                  <div className="mt-1 text-[10px] text-slate-400">
                                    {product.costInfo.exchangePriceType}
                                    {" • "}
                                    {formatDate(product.costInfo.exchangeDate)}
                                  </div>
                                </div>

                                <div className="rounded-lg border border-blue-200 bg-white p-3">
                                  <p className="text-[10px] text-slate-500">
                                    أعلى تكلفة محسوبة
                                  </p>

                                  <p className="mt-1 text-xl font-extrabold text-blue-700">
                                    {money(product.costInfo.highestCost)} جنيه
                                  </p>

                                  <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                                    <p>
                                      المورد:{" "}
                                      <strong>
                                        {product.costInfo.supplier.name}
                                      </strong>
                                    </p>

                                    <p>
                                      كود المورد:{" "}
                                      <strong>
                                        {product.costInfo.supplier.code}
                                      </strong>
                                    </p>

                                    <p>
                                      المعامل الأعلى:{" "}
                                      <strong className="text-orange-700">
                                        × {product.costInfo.factor}
                                      </strong>
                                    </p>
                                  </div>

                                  <div className="mt-3 rounded-md bg-blue-50 p-2 text-center">
                                    <p className="text-[10px] text-blue-600">
                                      معادلة حساب التكلفة
                                    </p>

                                    <p className="mt-1 font-extrabold text-blue-800">
                                      {money(product.costInfo.exchangePrice)}
                                      {" × "}
                                      {product.costInfo.factor}
                                      {" = "}
                                      {money(product.costInfo.highestCost)}
                                    </p>
                                  </div>
                                </div>

                                <details className="rounded-lg border border-slate-200 bg-white p-2 text-right">
                                  <summary className="cursor-pointer text-[11px] font-bold text-blue-700">
                                    مقارنة جميع الموردين (
                                    {product.costInfo.supplierCosts.length})
                                  </summary>

                                  <div className="mt-2 space-y-2">
                                    {product.costInfo.supplierCosts.map(
                                      (supplier) => (
                                        <div
                                          key={supplier.supplierId}
                                          className={`rounded-md border p-2 text-[10px] ${
                                            supplier.supplierId ===
                                            product.costInfo.supplier.id
                                              ? "border-green-200 bg-green-50"
                                              : "border-slate-100 bg-slate-50"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <strong className="text-slate-700">
                                              {supplier.supplierName}
                                            </strong>

                                            {supplier.supplierId ===
                                              product.costInfo.supplier.id && (
                                              <span className="font-bold text-green-700">
                                                الأعلى
                                              </span>
                                            )}
                                          </div>

                                          <p className="mt-1 text-slate-500">
                                            سعر البورصة:{" "}
                                            {money(supplier.exchangePrice)}
                                          </p>

                                          <p className="text-slate-500">
                                            مصدر السعر:{" "}
                                            {supplier.exchangePriceType}
                                          </p>

                                          <p className="text-slate-500">
                                            المعامل: × {supplier.factor}
                                          </p>

                                          <p className="mt-1 font-extrabold text-slate-800">
                                            التكلفة: {money(supplier.cost)} جنيه
                                          </p>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </details>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                لا توجد بورصة أو معاملات موردين سارية في التاريخ
                                المحدد
                              </span>
                            )}
                          </td>

                          {/* Category Prices */}

                          {product.categoryData.map((item) => (
                            <td
                              key={item.category}
                              className="border-b border-l border-slate-100 p-3"
                            >
                              {item.profitMargin !== null ? (
                                <div className="flex flex-col items-center gap-2">
                                  <span className="rounded-lg bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                                    هامش {money(item.profitMargin)}%
                                  </span>

                                  <span className="font-extrabold text-green-700">
                                    {item.sellingPrice !== null
                                      ? `${formatPrice(item.sellingPrice)} جنيه`
                                      : "التكلفة غير متاحة"}
                                  </span>

                                  <span className="text-[10px] text-slate-400">
                                    الربح:{" "}
                                    {item.profit !== null
                                      ? `${money(item.profit)} جنيه`
                                      : "-"}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleEdit(item.period)}
                                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                                  >
                                    تعديل الهامش
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAddForm(
                                      product.id,
                                      item.category,
                                      selectedDate,
                                    )
                                  }
                                  className="rounded-lg border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"
                                >
                                  + إعداد هوامش المنتج
                                </button>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {filteredRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={4 + displayedCategories.length}
                            className="p-12 text-center text-slate-400"
                          >
                            لا توجد منتجات فعلية مطابقة للبحث.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Explanation */}

                <div className="border-t border-slate-100 bg-slate-50 p-5">
                  <h3 className="mb-3 font-bold text-slate-700">
                    آلية حساب التكلفة وسعر البيع
                  </h3>

                  <div className="grid grid-cols-1 gap-3 text-xs leading-6 text-slate-500 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <span className="mb-1 block font-bold text-blue-700">
                        01 - تحديد سعر البورصة
                      </span>
                      يتم جلب آخر بورصة بتاريخ لا يتجاوز تاريخ التسعير، مع
                      استخدام السعر المعدل للمورد إن وجد.
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <span className="mb-1 block font-bold text-orange-700">
                        02 - حساب تكلفة الموردين
                      </span>
                      يتم حساب تكلفة كل مورد حسب معامل المنتج ومعاملات الفروع،
                      ثم اختيار أعلى تكلفة.
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <span className="mb-1 block font-bold text-green-700">
                        03 - حساب سعر البيع
                      </span>
                      سعر البيع = أعلى تكلفة × (1 + هامش ربح الفئة ÷ 100)، ثم
                      تقريب الناتج لأقرب جنيه صحيح.
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Historical Register */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:px-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">
                  📚 السجل التاريخي لهوامش الربح
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  جميع فترات هوامش الربح محفوظة لكل منتج وفئة بشكل مستقل.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowHistory((value) => {
                    if (value) {
                      setHistoryCategory("");
                      setShowAllHistoryCategories(true);
                      setReviewingHistoryId(null);
                    }

                    return !value;
                  });
                }}
                className={`${buttonClass} border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100`}
              >
                {showHistory ? "إخفاء السجل" : "عرض السجل التاريخي"}
              </button>
            </div>

            {showHistory && (
              <div className="space-y-5 p-5 md:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      من تاريخ
                    </label>

                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(event) => {
                        setHistoryStartDate(event.target.value);
                        setReviewingHistoryId(null);
                      }}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      اختر الفئة
                    </label>

                    <select
                      value={historyCategory}
                      onChange={(event) => {
                        setHistoryCategory(event.target.value);
                        setShowAllHistoryCategories(false);
                        setReviewingHistoryId(null);
                      }}
                      className={inputClass}
                    >
                      <option value="">اختر الفئة لعرض السجل</option>

                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryCategory("");
                        setShowAllHistoryCategories(true);
                        setReviewingHistoryId(null);
                      }}
                      className={`${buttonClass} w-full ${
                        showAllHistoryCategories
                          ? "bg-orange-700 text-white"
                          : "bg-orange-600 text-white hover:bg-orange-700"
                      }`}
                    >
                      عرض كل الفئات
                    </button>
                  </div>
                </div>

                {!historyCategory && !showAllHistoryCategories ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <div className="mb-3 text-3xl">📋</div>

                    <p className="font-bold text-slate-700">
                      اختر فئة لعرض سجل هوامش الربح
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      أو اضغط على زر عرض كل الفئات.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800">
                          {showAllHistoryCategories
                            ? "جميع الفئات"
                            : `سجل فئة ${historyCategory}`}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          عرض الفترات التي تبدأ من تاريخ:{" "}
                          {formatDate(historyStartDate)}
                        </p>
                      </div>

                      <span className="rounded-full bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">
                        عدد الفترات: {history.length}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-237.5 text-right text-sm">
                        <thead className="bg-slate-800 text-white">
                          <tr>
                            <th className="p-4">المنتج</th>
                            <th className="p-4">الفئة</th>
                            <th className="p-4">بداية الفترة</th>
                            <th className="p-4">نهاية الفترة</th>
                            <th className="p-4">هامش الربح</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">الإجراءات</th>
                          </tr>
                        </thead>

                        <tbody>
                          {history.map((item) => {
                            const status = getPeriodStatus(item);

                            const isReviewing = reviewingHistoryId === item.id;

                            return (
                              <Fragment key={item.id}>
                                <tr
                                  className={`border-b border-slate-100 hover:bg-slate-50 ${
                                    isReviewing ? "bg-blue-50" : ""
                                  }`}
                                >
                                  <td className="p-4">
                                    <div className="font-bold text-slate-800">
                                      {item.product?.name}
                                    </div>

                                    <div className="mt-1 font-mono text-xs text-slate-400">
                                      {item.product?.code}
                                    </div>
                                  </td>

                                  <td className="p-4">
                                    <span className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                                      {item.category}
                                    </span>
                                  </td>

                                  <td className="p-4 font-semibold text-slate-700">
                                    {formatDate(item.startDate)}
                                  </td>

                                  <td className="p-4 text-slate-600">
                                    {item.endDate
                                      ? formatDate(item.endDate)
                                      : "مستمرة بدون تاريخ نهاية"}
                                  </td>

                                  <td className="p-4 font-extrabold text-orange-700">
                                    {money(item.profitMargin)}%
                                  </td>

                                  <td className="p-4">
                                    <div className="flex flex-col items-center gap-2">
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${getPeriodStatusClass(item)}`}
                                      >
                                        {status}
                                      </span>

                                      {item.startDate > TODAY && (
                                        <span className="whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                                          يبدأ يوم {formatDate(item.startDate)}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-4">
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleEdit(item)}
                                        disabled={status === "منتهية"}
                                        className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        إنشاء فترة جديدة
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => deletePeriod(item.id)}
                                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                                      >
                                        حذف
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setReviewingHistoryId((current) =>
                                            current === item.id
                                              ? null
                                              : item.id,
                                          )
                                        }
                                        className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                                          isReviewing
                                            ? "bg-orange-600 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                      >
                                        {isReviewing
                                          ? "إغلاق المراجعة"
                                          : "مراجعة"}
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Review Details */}

                                {isReviewing && reviewedDetails && (
                                  <tr className="bg-blue-50/50">
                                    <td
                                      colSpan={7}
                                      className="border-b border-blue-200 p-4 md:p-6"
                                    >
                                      <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                          <div>
                                            <h3 className="text-lg font-extrabold text-slate-800">
                                              مراجعة المنتج:{" "}
                                              {reviewedDetails.product.name}
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                              تاريخ المراجعة:{" "}
                                              {formatDate(
                                                reviewedDetails.reviewDate,
                                              )}
                                              {" • "}
                                              الفئة: {item.category}
                                            </p>
                                          </div>

                                          <span className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">
                                            هامش الفترة:{" "}
                                            {money(item.profitMargin)}%
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                            <h4 className="mb-3 font-extrabold text-blue-800">
                                              تفاصيل التكلفة
                                            </h4>

                                            {reviewedDetails.costInfo ? (
                                              <div className="space-y-3 text-sm">
                                                <div className="rounded-lg bg-white p-3">
                                                  <p className="text-xs text-slate-500">
                                                    سعر البورصة
                                                  </p>

                                                  <p className="mt-1 text-lg font-extrabold text-slate-800">
                                                    {money(
                                                      reviewedDetails.costInfo
                                                        .exchangePrice,
                                                    )}{" "}
                                                    جنيه
                                                  </p>

                                                  <p className="mt-1 text-xs text-slate-400">
                                                    {
                                                      reviewedDetails.costInfo
                                                        .exchangePriceType
                                                    }
                                                    {" • "}
                                                    {formatDate(
                                                      reviewedDetails.costInfo
                                                        .exchangeDate,
                                                    )}
                                                  </p>
                                                </div>

                                                <div className="rounded-lg bg-white p-3">
                                                  <p className="text-xs text-slate-500">
                                                    أعلى تكلفة محسوبة
                                                  </p>

                                                  <p className="mt-1 text-xl font-extrabold text-blue-700">
                                                    {money(
                                                      reviewedDetails.costInfo
                                                        .highestCost,
                                                    )}{" "}
                                                    جنيه
                                                  </p>

                                                  <p className="mt-2 text-xs text-slate-600">
                                                    المورد:{" "}
                                                    <strong>
                                                      {
                                                        reviewedDetails.costInfo
                                                          .supplier.name
                                                      }
                                                    </strong>
                                                  </p>

                                                  <p className="text-xs text-slate-600">
                                                    المعامل الأعلى: ×{" "}
                                                    {
                                                      reviewedDetails.costInfo
                                                        .factor
                                                    }
                                                  </p>
                                                </div>
                                              </div>
                                            ) : (
                                              <p className="text-sm text-slate-400">
                                                لا توجد بورصة أو معاملات موردين
                                                سارية في تاريخ هذه الفترة.
                                              </p>
                                            )}
                                          </div>

                                          <div className="rounded-xl border border-slate-200 p-4">
                                            <h4 className="mb-3 font-extrabold text-slate-800">
                                              مقارنة جميع الموردين (
                                              {reviewedDetails.costInfo
                                                ?.supplierCosts.length || 0}
                                              )
                                            </h4>

                                            <div className="space-y-2">
                                              {reviewedDetails.costInfo?.supplierCosts.map(
                                                (supplier) => (
                                                  <div
                                                    key={supplier.supplierId}
                                                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                                                  >
                                                    <strong>
                                                      {supplier.supplierName}
                                                    </strong>

                                                    <p className="mt-2 text-slate-600">
                                                      سعر البورصة:{" "}
                                                      {money(
                                                        supplier.exchangePrice,
                                                      )}{" "}
                                                      جنيه
                                                    </p>

                                                    <p className="text-slate-600">
                                                      المعامل: ×{" "}
                                                      {supplier.factor}
                                                    </p>

                                                    <p className="mt-1 font-extrabold text-slate-800">
                                                      التكلفة:{" "}
                                                      {money(supplier.cost)}{" "}
                                                      جنيه
                                                    </p>
                                                  </div>
                                                ),
                                              )}

                                              {!reviewedDetails.costInfo && (
                                                <p className="text-sm text-slate-400">
                                                  لا توجد بيانات موردين متاحة
                                                  لهذا التاريخ.
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* All Category Prices */}

                                        <div className="mt-5">
                                          <h4 className="mb-3 font-extrabold text-slate-800">
                                            أسعار البيع لجميع الفئات لهذا المنتج
                                          </h4>

                                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                                            {reviewedDetails.categoryData.map(
                                              (category) => (
                                                <div
                                                  key={category.category}
                                                  className={`rounded-xl border p-4 text-center ${
                                                    category.category ===
                                                    item.category
                                                      ? "border-orange-300 bg-orange-50"
                                                      : "border-slate-200 bg-slate-50"
                                                  }`}
                                                >
                                                  <p className="text-xs font-bold text-slate-600">
                                                    {category.category}
                                                  </p>

                                                  {category.profitMargin !==
                                                  null ? (
                                                    <>
                                                      <p className="mt-3 rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
                                                        هامش{" "}
                                                        {money(
                                                          category.profitMargin,
                                                        )}
                                                        %
                                                      </p>

                                                      <p className="mt-3 text-lg font-extrabold text-green-700">
                                                        {category.sellingPrice !==
                                                        null
                                                          ? `${formatPrice(category.sellingPrice)} جنيه`
                                                          : "التكلفة غير متاحة"}
                                                      </p>

                                                      <p className="mt-1 text-xs text-slate-500">
                                                        الربح:{" "}
                                                        {category.profit !==
                                                        null
                                                          ? `${money(category.profit)} جنيه`
                                                          : "-"}
                                                      </p>
                                                    </>
                                                  ) : (
                                                    <p className="mt-4 text-xs text-slate-400">
                                                      لا يوجد هامش ربح ساري
                                                    </p>
                                                  )}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}

                          {history.length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="p-10 text-center text-slate-400"
                              >
                                لا توجد فترات محفوظة تبدأ من التاريخ المحدد
                                وتطابق الفئة المختارة.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Footer */}

          <div className="mt-5 text-center text-xs text-slate-400">
            هامش ربح الأصناف • {products.length} منتج فعلي • {CATEGORIES.length}{" "}
            فئات • {margins.length} فترة محفوظة
          </div>
        </div>
      </main>
    </>
  );
}

export default SellingPrices;
