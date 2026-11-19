import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../header.jsx";
import { INITIAL_PRODUCTS } from "./data/constantsSupplierFactors";
import {
  TODAY,
  INITIAL_START_DATE,
  CATEGORIES,
  createInitialMargins,
} from "./data/constantsSellingPrices";

import {
  getDailyExchangeData,
  getExchangeByDate,
  getSupplierExchangePrice,
  getActiveSupplierPeriod,
  getProfitMargins,
  saveProfitMargins,
} from "./data/dailyExchangeStorage.js";

/* -------------------------------------------------------------------------- */
/* Core Products                                                              */
/* -------------------------------------------------------------------------- */

const PRODUCTS = [
  {
    id: 1,
    barcode: "2302012000008",
    name: "دجاج بلدي فريش",
    type: "baladi",
  },
  {
    id: 2,
    barcode: "2302012000009",
    name: "دجاج أبيض فريش",
    type: "white",
  },
  {
    id: 12,
    barcode: "2302012000010",
    name: "دجاج مجمد",
    type: "white",
  },
  {
    id: 7,
    barcode: "2302012000011",
    name: "صدور دجاج",
    type: "white",
  },
  {
    id: 3,
    barcode: "2302009000004",
    name: "فيليه دجاج فريش",
    type: "white",
  },
].map((product) => {
  const supplierProduct = INITIAL_PRODUCTS.find(
    (item) => Number(item.id) === Number(product.id),
  );

  return {
    ...product,
    supplierIds: supplierProduct?.supplierIds || [],
  };
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatDate = (value) => {
  if (!value) return "-";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPrice = (value) =>
  Number.isFinite(value)
    ? Math.round(value).toLocaleString("en-US")
    : "-";

const getActivePeriod = (periods, date) =>
  periods
    .filter(
      (period) =>
        period.startDate <= date &&
        (!period.endDate || period.endDate >= date),
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

  if (status === "قادمة") return "bg-blue-100 text-blue-700";
  if (status === "منتهية") return "bg-slate-100 text-slate-600";

  return "bg-green-100 text-green-700";
};

/* -------------------------------------------------------------------------- */
/* Supplier Factor Helpers                                                    */
/* -------------------------------------------------------------------------- */

const getHighestSupplierFactor = (period, productId, supplier) => {
  const productFactor = Number(period?.productFactors?.[productId]);
  const periodFactor = Number(period?.baseFactor);
  const supplierFactor = Number(supplier?.baseFactor);

  const baseFactor = [
    productFactor,
    periodFactor,
    supplierFactor,
  ].find((value) => Number.isFinite(value) && value > 0);

  if (baseFactor === undefined) return null;

  const branchFactors = Object.values(
    period?.overrides?.[productId] || {},
  )
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);

  return Math.max(baseFactor, ...branchFactors);
};

const hasSupplierExchangeOverride = (exchange, supplierId, type) => {
  const value = exchange?.supplierPrices?.[supplierId]?.[type];

  return value !== undefined && value !== null && value !== "";
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

function SellingPrices() {
  const navigate = useNavigate();

  const [dailyData] = useState(() => getDailyExchangeData());

  const products = PRODUCTS;

  const suppliers = dailyData.supplierFactors?.suppliers || [];
  const exchanges = dailyData.exchanges || [];

  /* ---------------------------------------------------------------------- */
  /* Profit Margins                                                         */
  /* ---------------------------------------------------------------------- */

  const [margins, setMargins] = useState(() => {
    const savedMargins = getProfitMargins();

    if (savedMargins === null) {
      const initialMargins = createInitialMargins();
      saveProfitMargins(initialMargins);
      return initialMargins;
    }

    return savedMargins;
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
    useState(false);

  const [historyStartDate, setHistoryStartDate] =
    useState(INITIAL_START_DATE);

  const [historyEndDate, setHistoryEndDate] = useState(TODAY);

  const [reviewingHistoryId, setReviewingHistoryId] = useState(null);

  /* ---------------------------------------------------------------------- */
  /* Form                                                                   */
  /* ---------------------------------------------------------------------- */

  const [form, setForm] = useState({
    productId: "",
    category: CATEGORIES[0],
    startDate: TODAY,
    profitMargin: "20",
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

        const factor = getHighestSupplierFactor(
          period,
          product.id,
          supplier,
        );

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
          exchangePriceType: isOverridden
            ? "سعر معدل"
            : "السعر الأساسي",
          exchangeDate: exchange.date,
          cost: calculatedCost,
          periodStartDate: period?.startDate || null,
          periodEndDate: period?.endDate || null,
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

        return `${product.barcode} ${product.name}`
          .toLowerCase()
          .includes(keyword);
      })
      .map((product) => {
        const costInfo = getProductCost(product, selectedDate);

        const categoryData = CATEGORIES.map((category) => {
          const period = getActivePeriod(
            margins.filter(
              (item) =>
                String(item.productId) === String(product.id) &&
                item.category === category,
            ),
            selectedDate,
          );

          const cost = costInfo?.cost ?? null;
          const profitMargin = period?.profitMargin ?? null;

          const profit =
            cost !== null && profitMargin !== null
              ? (cost * profitMargin) / 100
              : null;

          const sellingPrice =
            profit !== null ? Math.round(cost + profit) : null;

          return {
            category,
            period,
            profitMargin,
            profit,
            sellingPrice,
          };
        });

        return {
          ...product,
          costInfo,
          cost: costInfo?.cost ?? null,
          categoryData,
        };
      });
  }, [products, margins, search, selectedDate, dailyData]);

  /* ---------------------------------------------------------------------- */
  /* Filtered Main Table                                                    */
  /* ---------------------------------------------------------------------- */

  const filteredRows = useMemo(() => {
    if (!selectedCategory && !showAllCategories) {
      return [];
    }

    if (showAllCategories) {
      return currentRows;
    }

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
        const product = products.find(
          (productItem) =>
            String(productItem.id) === String(item.productId),
        );

        if (!product) return false;

        const matchesSearch =
          !keyword ||
          `${product.barcode} ${product.name}`
            .toLowerCase()
            .includes(keyword);

        const matchesCategory =
          showAllHistoryCategories ||
          item.category === historyCategory;

        const matchesDateRange =
          item.startDate <= historyEndDate &&
          (!item.endDate || item.endDate >= historyStartDate);

        return matchesSearch && matchesCategory && matchesDateRange;
      })
      .map((item) => ({
        ...item,
        product: products.find(
          (product) => String(product.id) === String(item.productId),
        ),
      }))
      .sort((a, b) => {
        const dateCompare = b.startDate.localeCompare(a.startDate);

        return (
          dateCompare ||
          Number(a.productId) - Number(b.productId) ||
          a.category.localeCompare(b.category, "ar")
        );
      });
  }, [
    margins,
    products,
    search,
    historyCategory,
    showAllHistoryCategories,
    historyStartDate,
    historyEndDate,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Reviewed History Details                                               */
  /* ---------------------------------------------------------------------- */

  const reviewedDetails = useMemo(() => {
    if (!reviewingHistoryId) return null;

    const historyItem = margins.find(
      (item) => item.id === reviewingHistoryId,
    );

    if (!historyItem) return null;

    const product = products.find(
      (item) => String(item.id) === String(historyItem.productId),
    );

    if (!product) return null;

    const reviewDate = historyItem.startDate;
    const costInfo = getProductCost(product, reviewDate);

    const categoryData = CATEGORIES.map((category) => {
      const period = getActivePeriod(
        margins.filter(
          (item) =>
            String(item.productId) === String(product.id) &&
            item.category === category,
        ),
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
        sellingPrice:
          profit !== null ? Math.round(cost + profit) : null,
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
      category: CATEGORIES[0],
      startDate: date,
      profitMargin: "20",
    });

    setEditingId(null);
  };

  const openAddForm = (category = CATEGORIES[0], date = selectedDate) => {
    setForm({
      productId: "",
      category,
      startDate: date,
      profitMargin: "20",
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

    const newStartDate =
      selectedDate > item.startDate
        ? selectedDate
        : getNextDate(item.startDate);

    setEditingId(item.id);

    setForm({
      productId: String(item.productId),
      category: item.category,
      startDate: newStartDate,
      profitMargin: String(item.profitMargin),
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

    const profitMargin = Number(form.profitMargin);

    if (
      !form.category ||
      !form.startDate ||
      form.profitMargin === "" ||
      !Number.isFinite(profitMargin) ||
      profitMargin < 0
    ) {
      alert("يرجى إدخال الفئة وتاريخ البداية وهامش الربح بشكل صحيح");
      return;
    }

    /* ------------------------------------------------------------------ */
    /* Edit: Create a new period for one product only                     */
    /* ------------------------------------------------------------------ */

    if (editingId !== null) {
      const productId = Number(form.productId);

      if (!productId) {
        alert("الصنف المحدد غير صحيح");
        return;
      }

      const matchingPeriods = margins.filter(
        (item) =>
          String(item.productId) === String(productId) &&
          item.category === form.category,
      );

      const editingPeriod = matchingPeriods.find(
        (item) => item.id === editingId,
      );

      if (!editingPeriod) {
        alert("الفترة المطلوب تعديلها غير موجودة");
        return;
      }

      if (editingPeriod.endDate && editingPeriod.endDate < TODAY) {
        alert("هذه الفترة منتهية بالفعل.");
        return;
      }

      const laterPeriod = matchingPeriods.find(
        (item) =>
          item.id !== editingId &&
          item.startDate >= form.startDate,
      );

      if (laterPeriod) {
        alert(
          `يوجد سجل آخر يبدأ في ${formatDate(laterPeriod.startDate)} أو بعده. لا يمكن إنشاء فترة قبله.`,
        );
        return;
      }

      if (form.startDate <= editingPeriod.startDate) {
        alert(
          `يجب اختيار تاريخ بعد ${formatDate(editingPeriod.startDate)}`,
        );
        return;
      }

      const overlappingPeriods = matchingPeriods.filter(
        (item) =>
          item.id !== editingId &&
          item.startDate < form.startDate &&
          (!item.endDate || item.endDate >= form.startDate),
      );

      const newPeriod = {
        id: `margin-${productId}-${Date.now()}`,
        productId,
        category: form.category,
        startDate: form.startDate,
        endDate: null,
        profitMargin,
      };

      setMargins((previous) => [
        ...previous.map((item) => {
          const shouldClose =
            item.id === editingId ||
            overlappingPeriods.some(
              (period) => period.id === item.id,
            );

          if (shouldClose) {
            return {
              ...item,
              endDate: getPreviousDate(form.startDate),
            };
          }

          return item;
        }),
        newPeriod,
      ]);

      if (form.startDate <= TODAY) {
        setSelectedDate(form.startDate);
      }

      resetForm();
      setShowForm(false);

      alert("تم إنشاء فترة هامش الربح للصنف بنجاح");

      return;
    }

    /* ------------------------------------------------------------------ */
    /* Add: Apply the margin to every product in the selected category    */
    /* ------------------------------------------------------------------ */

    const newPeriods = [];
    const periodsToClose = new Set();

    /*
     * مهم:
     * نراجع كل صنف داخل الفئة المختارة فقط.
     * لا نلمس أي فترة تابعة لفئة أخرى.
     *
     * الفترة السابقة المفتوحة ليست تعارضًا.
     * سيتم تحديد نهايتها باليوم السابق لبداية الفترة الجديدة.
     */

    for (const product of products) {
      const productPeriods = margins.filter(
        (item) =>
          String(item.productId) === String(product.id) &&
          item.category === form.category,
      );

      /*
       * لا نسمح بإضافة فترة قبل فترة مستقبلية موجودة بالفعل،
       * ولا نسمح بتكرار تاريخ بداية فترة موجودة.
       */
      const laterOrSamePeriod = productPeriods.find(
        (item) => item.startDate >= form.startDate,
      );

      if (laterOrSamePeriod) {
        alert(
          `لا يمكن إضافة الفترة لجميع الأصناف. الصنف "${product.name}" لديه فترة تبدأ في ${formatDate(laterOrSamePeriod.startDate)} أو بعد تاريخ البداية المحدد.`,
        );
        return;
      }

      /*
       * الفترات التي تبدأ قبل الفترة الجديدة
       * وتنتهي في تاريخ بدايتها أو بعدها، أو ليس لها نهاية،
       * يجب إنهاؤها قبل بداية الفترة الجديدة.
       */
      const overlappingPreviousPeriods = productPeriods.filter(
        (item) =>
          item.startDate < form.startDate &&
          (!item.endDate || item.endDate >= form.startDate),
      );

      overlappingPreviousPeriods.forEach((item) => {
        periodsToClose.add(item.id);
      });

      newPeriods.push({
        id: `margin-${product.id}-${Date.now()}-${newPeriods.length}`,
        productId: product.id,
        category: form.category,
        startDate: form.startDate,
        endDate: null,
        profitMargin,
      });
    }

    if (!newPeriods.length) {
      alert("لا توجد أصناف لإضافة هامش الربح إليها");
      return;
    }

    /*
     * الحفظ يتم مرة واحدة بعد نجاح التحقق من جميع الأصناف.
     * يتم إنهاء الفترات السابقة داخل الفئة المختارة فقط.
     */
    setMargins((previous) => [
      ...previous.map((item) => {
        if (periodsToClose.has(item.id)) {
          return {
            ...item,
            endDate: getPreviousDate(form.startDate),
          };
        }

        return item;
      }),
      ...newPeriods,
    ]);

    if (form.startDate <= TODAY) {
      setSelectedDate(form.startDate);
    }

    resetForm();
    setShowForm(false);

    alert(
      `تم تطبيق هامش ربح ${profitMargin}% على جميع أصناف فئة ${form.category} بنجاح.`,
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Delete Period                                                          */
  /* ---------------------------------------------------------------------- */

  const deletePeriod = (id) => {
    if (!window.confirm("هل تريد حذف فترة هامش الربح هذه؟")) return;

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
      description: "عدد الأصناف الأساسية في النظام",
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
      description: "عدد هوامش الربح النشطة للفئات",
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

  /* ---------------------------------------------------------------------- */
  /* Main Table Categories                                                  */
  /* ---------------------------------------------------------------------- */

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
                    إدارة هوامش الربح وأسعار البيع حسب الصنف والفئة والفترة
                    الزمنية.
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
                {showForm ? "× إغلاق النموذج" : "+ إضافة فترة هامش ربح"}
              </button>
            </div>

            {/* Add / Edit Form */}

            {showForm && (
              <div className="border-t border-orange-100 bg-orange-50/40 p-5 md:p-6">
                <div className="mb-5">
                  <h3 className="font-extrabold text-slate-800">
                    {editingId !== null
                      ? "إنشاء فترة جديدة لصنف محدد"
                      : "إضافة هامش ربح لجميع أصناف الفئة"}
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    {editingId !== null
                      ? "سيتم إنشاء فترة جديدة لهذا الصنف فقط مع الاحتفاظ بالفترة السابقة في السجل التاريخي."
                      : "سيتم تطبيق هامش الربح على جميع أصناف الفئة المختارة، مع الاحتفاظ بجميع الفترات السابقة في السجل التاريخي."}
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {editingId !== null && (
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          الصنف
                        </label>

                        <div className={`${inputClass} bg-slate-100`}>
                          {products.find(
                            (product) =>
                              String(product.id) === String(form.productId),
                          )?.name || "الصنف غير موجود"}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        فئة التسعير
                      </label>

                      <select
                        value={form.category}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            category: event.target.value,
                          }))
                        }
                        className={inputClass}
                        disabled={editingId !== null}
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
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
                                  ?.startDate || INITIAL_START_DATE,
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

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        هامش الربح
                      </label>

                      <div className="relative">
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
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className={`${buttonClass} bg-orange-600 text-white hover:bg-orange-700`}
                    >
                      {editingId !== null
                        ? "✓ حفظ وإنشاء فترة جديدة للصنف"
                        : "+ تطبيق على جميع أصناف الفئة"}
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

                  <span>
                    <span className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
                    لا توجد فترة سارية
                  </span>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="min-w-375 w-full border-separate border-spacing-0 text-center text-sm">
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
                          باركود الصنف
                        </th>

                        <th
                          rowSpan={2}
                          className="sticky right-46 z-30 min-w-56 border-b border-l border-slate-200 bg-slate-800 p-3 text-white"
                        >
                          اسم الصنف
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
                            {product.barcode}
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
                                      نوع سعر البورصة:{" "}
                                      <strong>
                                        {product.costInfo.exchangePriceType}
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
                                    {product.costInfo.supplierCosts
                                      .slice()
                                      .sort((a, b) => b.cost - a.cost)
                                      .map((supplier) => (
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
                                            تاريخ البورصة:{" "}
                                            {formatDate(supplier.exchangeDate)}
                                          </p>

                                          <p className="text-slate-500">
                                            أعلى معامل: × {supplier.factor}
                                          </p>

                                          <p className="mt-1 font-extrabold text-slate-800">
                                            التكلفة: {money(supplier.cost)} جنيه
                                          </p>
                                        </div>
                                      ))}
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
                                    openAddForm(item.category, selectedDate)
                                  }
                                  className="rounded-lg border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"
                                >
                                  + إضافة هامش
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
                            لا توجد أصناف مطابقة للبحث.
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
                      يتم جلب آخر بورصة بتاريخ لا يتجاوز تاريخ التسعير. ويُستخدم
                      السعر المعدل للمورد إن وجد، وإلا السعر الأساسي حسب نوع الصنف.
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <span className="mb-1 block font-bold text-orange-700">
                        02 - حساب تكلفة الموردين
                      </span>
                      يتم اختيار أعلى معامل للمورد بين معامل الصنف ومعاملات الفروع
                      الـ44، ثم ضربه في سعر البورصة واختيار أعلى تكلفة.
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
                  جميع فترات هوامش الربح محفوظة لكل صنف وفئة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowHistory((value) => {
                    if (value) {
                      setHistoryCategory("");
                      setShowAllHistoryCategories(false);
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
                {/* History Filters */}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      من تاريخ
                    </label>

                    <input
                      type="date"
                      value={historyStartDate}
                      max={historyEndDate}
                      onChange={(event) => {
                        setHistoryStartDate(event.target.value);
                        setReviewingHistoryId(null);
                      }}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      إلى تاريخ
                    </label>

                    <input
                      type="date"
                      value={historyEndDate}
                      min={historyStartDate}
                      onChange={(event) => {
                        setHistoryEndDate(event.target.value);
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
                      عرض كل هوامش الربح لكل الفئات
                    </button>
                  </div>
                </div>

                {/* History Results */}

                {!historyCategory && !showAllHistoryCategories ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <div className="mb-3 text-3xl">📋</div>

                    <p className="font-bold text-slate-700">
                      اختر فئة لعرض سجل هوامش الربح
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      أو اضغط على زر عرض كل الفئات لعرض جميع السجلات خلال الفترة
                      المحددة.
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
                          الفترة: {formatDate(historyStartDate)}
                          {" - "}
                          {formatDate(historyEndDate)}
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
                            <th className="p-4">الصنف</th>
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
                            const isReviewing =
                              reviewingHistoryId === item.id;

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
                                      {item.product?.barcode}
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
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-bold ${getPeriodStatusClass(
                                        item,
                                      )}`}
                                    >
                                      {status}
                                    </span>
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
                                        onClick={() => {
                                          setReviewingHistoryId((current) =>
                                            current === item.id
                                              ? null
                                              : item.id,
                                          );
                                        }}
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

                                {/* Review Details Row */}

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
                                              مراجعة تفاصيل الصنف:{" "}
                                              {reviewedDetails.product.name}
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                              تاريخ المراجعة:{" "}
                                              {formatDate(
                                                reviewedDetails.reviewDate,
                                              )}
                                              {" • "}
                                              الفئة المحددة: {item.category}
                                            </p>
                                          </div>

                                          <span className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">
                                            هامش الفترة:{" "}
                                            {money(item.profitMargin)}%
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                          {/* Cost Details */}

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

                                                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                                                    <p>
                                                      المورد:{" "}
                                                      <strong>
                                                        {
                                                          reviewedDetails
                                                            .costInfo.supplier
                                                            .name
                                                        }
                                                      </strong>
                                                    </p>

                                                    <p>
                                                      كود المورد:{" "}
                                                      <strong>
                                                        {
                                                          reviewedDetails
                                                            .costInfo.supplier
                                                            .code
                                                        }
                                                      </strong>
                                                    </p>

                                                    <p>
                                                      نوع سعر البورصة:{" "}
                                                      <strong>
                                                        {
                                                          reviewedDetails
                                                            .costInfo
                                                            .exchangePriceType
                                                        }
                                                      </strong>
                                                    </p>

                                                    <p>
                                                      المعامل الأعلى:{" "}
                                                      <strong className="text-orange-700">
                                                        ×{" "}
                                                        {
                                                          reviewedDetails
                                                            .costInfo.factor
                                                        }
                                                      </strong>
                                                    </p>
                                                  </div>

                                                  <div className="mt-3 rounded-lg bg-blue-50 p-3 text-center font-extrabold text-blue-800">
                                                    {money(
                                                      reviewedDetails.costInfo
                                                        .exchangePrice,
                                                    )}
                                                    {" × "}
                                                    {
                                                      reviewedDetails.costInfo
                                                        .factor
                                                    }
                                                    {" = "}
                                                    {money(
                                                      reviewedDetails.costInfo
                                                        .highestCost,
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <p className="text-sm text-slate-400">
                                                لا توجد بورصة أو معاملات موردين
                                                سارية في تاريخ هذه الفترة.
                                              </p>
                                            )}
                                          </div>

                                          {/* All Suppliers */}

                                          <div className="rounded-xl border border-slate-200 p-4">
                                            <h4 className="mb-3 font-extrabold text-slate-800">
                                              مقارنة جميع الموردين (
                                              {reviewedDetails.costInfo
                                                ?.supplierCosts.length || 0}
                                              )
                                            </h4>

                                            <div className="space-y-2">
                                              {reviewedDetails.costInfo?.supplierCosts
                                                .slice()
                                                .sort(
                                                  (a, b) => b.cost - a.cost,
                                                )
                                                .map((supplier) => (
                                                  <div
                                                    key={supplier.supplierId}
                                                    className={`rounded-lg border p-3 text-xs ${
                                                      supplier.supplierId ===
                                                      reviewedDetails.costInfo
                                                        .supplier.id
                                                        ? "border-green-200 bg-green-50"
                                                        : "border-slate-200 bg-slate-50"
                                                    }`}
                                                  >
                                                    <div className="flex justify-between gap-2">
                                                      <strong>
                                                        {
                                                          supplier.supplierName
                                                        }
                                                      </strong>

                                                      {supplier.supplierId ===
                                                        reviewedDetails.costInfo
                                                          .supplier.id && (
                                                        <span className="font-bold text-green-700">
                                                          أعلى تكلفة
                                                        </span>
                                                      )}
                                                    </div>

                                                    <p className="mt-2 text-slate-600">
                                                      سعر البورصة:{" "}
                                                      {money(
                                                        supplier.exchangePrice,
                                                      )}{" "}
                                                      جنيه
                                                    </p>

                                                    <p className="text-slate-600">
                                                      مصدر السعر:{" "}
                                                      {
                                                        supplier.exchangePriceType
                                                      }
                                                    </p>

                                                    <p className="text-slate-600">
                                                      تاريخ البورصة:{" "}
                                                      {formatDate(
                                                        supplier.exchangeDate,
                                                      )}
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
                                                ))}

                                              {!reviewedDetails.costInfo && (
                                                <p className="text-sm text-slate-400">
                                                  لا توجد بيانات موردين متاحة
                                                  لهذا التاريخ.
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Selling Prices */}

                                        <div className="mt-5">
                                          <h4 className="mb-3 font-extrabold text-slate-800">
                                            أسعار البيع وهوامش الربح لجميع
                                            الفئات
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
                                                          ? `${formatPrice(
                                                              category.sellingPrice,
                                                            )} جنيه`
                                                          : "التكلفة غير متاحة"}
                                                      </p>

                                                      <p className="mt-1 text-xs text-slate-500">
                                                        الربح:{" "}
                                                        {category.profit !==
                                                        null
                                                          ? `${money(
                                                              category.profit,
                                                            )} جنيه`
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
                                لا توجد فترات محفوظة تطابق الفئة والفترة المحددة.
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
            هامش ربح الأصناف • {products.length} صنف • {CATEGORIES.length} فئات
            • {margins.length} فترة محفوظة
          </div>
        </div>
      </main>
    </>
  );
}

export default SellingPrices;
