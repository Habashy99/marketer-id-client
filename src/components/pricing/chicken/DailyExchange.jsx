
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../header.jsx";

import {
  SUPPLIERS,
  POULTRY_TYPES,
  INITIAL_PRODUCTS,
  createExchange,
  createProduct,
} from "./data/constantsDailyExchange";

import {
  getDailyExchangeData,
  updateDailyExchangeData,
} from "./data/dailyExchangeStorage";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatPrice = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
};

const formatDate = (date) => {
  if (!date) return "—";

  const [year, month, day] = String(date).slice(0, 10).split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

function DailyExchange() {
  const navigate = useNavigate();
  const today = getTodayDate();

  /* ---------------------------------------------------------------------- */
  /* Load Saved Data                                                        */
  /* ---------------------------------------------------------------------- */

  const [date, setDate] = useState(today);

  const [exchanges, setExchanges] = useState(() => {
    const savedData = getDailyExchangeData();

    return savedData.exchanges.map((exchange) => ({
      ...exchange,
      supplierPrices: exchange.supplierPrices || {},
    }));
  });

  const [products, setProducts] = useState(() =>
    INITIAL_PRODUCTS.map(createProduct),
  );

  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    barcode: "",
    name: "",
    supplierId: "",
    type: "white",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ---------------------------------------------------------------------- */
  /* Save Exchanges Automatically                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const saved = updateDailyExchangeData({
      exchanges,
    });

    if (!saved) {
      setError("تعذر حفظ البيانات. تأكد من مساحة التخزين في المتصفح.");
    }
  }, [exchanges]);

  /* ---------------------------------------------------------------------- */
  /* Current Exchange                                                        */
  /* ---------------------------------------------------------------------- */

  const currentExchange = useMemo(
    () => exchanges.find((item) => item.date === date) || null,
    [exchanges, date],
  );

  const whitePrice = currentExchange?.whitePrice ?? "";
  const baladiPrice = currentExchange?.baladiPrice ?? "";

  /* ---------------------------------------------------------------------- */
  /* Supplier Helpers                                                        */
  /* ---------------------------------------------------------------------- */

  const getSupplierName = (supplierId) => {
    const supplier = SUPPLIERS.find(
      (item) => String(item.id) === String(supplierId),
    );

    return supplier?.name || "غير محدد";
  };

  const getSupplierPrice = (supplierId, type) => {
    if (!supplierId) return "";

    const override =
      currentExchange?.supplierPrices?.[supplierId]?.[type];

    if (override !== undefined && override !== null && override !== "") {
      return override;
    }

    return type === "white" ? whitePrice : baladiPrice;
  };

  const hasSupplierOverride = (supplierId, type) => {
    const value =
      currentExchange?.supplierPrices?.[supplierId]?.[type];

    return value !== undefined && value !== null && value !== "";
  };

  const getProductPrice = (product) => {
    if (!product.supplierId) return "";

    return getSupplierPrice(product.supplierId, product.type);
  };

  /* ---------------------------------------------------------------------- */
  /* Statistics                                                              */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo(() => {
    const whiteProducts = products.filter(
      (product) => product.type === "white",
    ).length;

    const baladiProducts = products.filter(
      (product) => product.type === "baladi",
    ).length;

    const overriddenCount = currentExchange
      ? Object.values(currentExchange.supplierPrices || {}).reduce(
          (total, supplier) =>
            total +
            ["white", "baladi"].filter(
              (type) =>
                supplier?.[type] !== undefined &&
                supplier?.[type] !== null &&
                supplier?.[type] !== "",
            ).length,
          0,
        )
      : 0;

    return {
      products: products.length,
      suppliers: SUPPLIERS.length,
      whiteProducts,
      baladiProducts,
      overridden: overriddenCount,
    };
  }, [products, currentExchange]);

  /* ---------------------------------------------------------------------- */
  /* Exchange Helpers                                                        */
  /* ---------------------------------------------------------------------- */

  const updateExchange = (updater) => {
    setExchanges((previous) => {
      const exists = previous.some((item) => item.date === date);

      if (!exists) {
        const newExchange = {
          ...createExchange(date),
          supplierPrices: {},
        };

        const updatedExchange = updater(newExchange);

        return [...previous, updatedExchange].sort((a, b) =>
          b.date.localeCompare(a.date),
        );
      }

      return previous
        .map((item) =>
          item.date === date
            ? updater({
                ...item,
                supplierPrices: item.supplierPrices || {},
              })
            : item,
        )
        .sort((a, b) => b.date.localeCompare(a.date));
    });

    setError("");
    setSuccess("");
  };

  const handleBasePriceChange = (type, value) => {
    updateExchange((exchange) => ({
      ...exchange,
      [type === "white" ? "whitePrice" : "baladiPrice"]: value,
    }));
  };

  const saveDailyExchange = (event) => {
    event.preventDefault();

    if (!date) {
      setError("من فضلك اختر تاريخ البورصة.");
      return;
    }

    const currentWhite = Number(whitePrice);
    const currentBaladi = Number(baladiPrice);

    if (
      whitePrice === "" ||
      baladiPrice === "" ||
      !Number.isFinite(currentWhite) ||
      !Number.isFinite(currentBaladi) ||
      currentWhite <= 0 ||
      currentBaladi <= 0
    ) {
      setError("من فضلك أدخل سعر البورصة البيضاء والبلدي بشكل صحيح.");
      setSuccess("");
      return;
    }

    const saved = updateDailyExchangeData({
      exchanges,
    });

    if (!saved) {
      setError("تعذر حفظ أسعار البورصة.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("تم حفظ أسعار البورصة اليومية بنجاح.");
  };

  /* ---------------------------------------------------------------------- */
  /* Supplier Price Updates                                                  */
  /* ---------------------------------------------------------------------- */

  const updateSupplierPrice = (supplierId, type, value) => {
    updateExchange((exchange) => {
      const supplierPrices = {
        ...(exchange.supplierPrices || {}),
      };

      const supplier = {
        ...(supplierPrices[supplierId] || {}),
      };

      if (value === "") {
        delete supplier[type];
      } else {
        supplier[type] = value;
      }

      if (Object.keys(supplier).length === 0) {
        delete supplierPrices[supplierId];
      } else {
        supplierPrices[supplierId] = supplier;
      }

      return {
        ...exchange,
        supplierPrices,
      };
    });
  };

  const resetSupplierPrice = (supplierId, type) => {
    updateSupplierPrice(supplierId, type, "");
  };

  /* ---------------------------------------------------------------------- */
  /* Product Form                                                            */
  /* ---------------------------------------------------------------------- */

  const handleFormChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  };

  const addProduct = (event) => {
    event.preventDefault();

    const barcode = form.barcode.trim();
    const name = form.name.trim();

    if (!barcode || !name || !form.supplierId || !form.type) {
      setError("من فضلك أدخل الباركود والاسم واختر المورد ونوع البورصة.");
      return;
    }

    const duplicate = products.some(
      (product) => product.barcode === barcode,
    );

    if (duplicate) {
      setError("هذا الباركود موجود بالفعل.");
      return;
    }

    setProducts((previous) => [
      ...previous,
      createProduct({
        barcode,
        name,
        supplierId: form.supplierId,
        type: form.type,
      }),
    ]);

    setForm({
      barcode: "",
      name: "",
      supplierId: "",
      type: "white",
    });

    setError("");
    setSuccess("تمت إضافة المنتج وربطه بالمورد والبورصة بنجاح.");
  };

  /* ---------------------------------------------------------------------- */
  /* Update Existing Product                                                 */
  /* ---------------------------------------------------------------------- */

  const updateProduct = (productId, field, value) => {
    setProducts((previous) =>
      previous.map((product) =>
        product.id === productId
          ? { ...product, [field]: value }
          : product,
      ),
    );

    setError("");
    setSuccess("تم تحديث بيانات المنتج بنجاح.");
  };

  /* ---------------------------------------------------------------------- */
  /* Product Search                                                          */
  /* ---------------------------------------------------------------------- */

  const filteredProducts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return products.filter((product) => {
      const supplierName = getSupplierName(product.supplierId).toLowerCase();

      return (
        !searchValue ||
        product.name.toLowerCase().includes(searchValue) ||
        product.barcode.toLowerCase().includes(searchValue) ||
        supplierName.includes(searchValue)
      );
    });
  }, [products, search]);

  /* ---------------------------------------------------------------------- */
  /* Delete Product                                                          */
  /* ---------------------------------------------------------------------- */

  const deleteProduct = (productId) => {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا المنتج؟",
    );

    if (!confirmed) return;

    setProducts((previous) =>
      previous.filter((product) => product.id !== productId),
    );

    setSuccess("تم حذف المنتج بنجاح.");
    setError("");
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <div className="sticky top-0 z-50">
        <Header user={true} />
      </div>

      <main className="mx-auto max-w-[1900px] space-y-6 p-3 md:p-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-2xl shadow-sm">
              🐔
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 md:text-3xl">
                البورصة
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                إدارة بورصة الدواجن البيضاء والبلدي وأسعار الموردين اليومية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span>→</span>
            رجوع
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "إجمالي المنتجات",
              value: stats.products,
              description: "عدد المنتجات المسجلة",
              icon: "📦",
              color: "text-blue-700",
              bg: "bg-blue-50",
            },
            {
              title: "منتجات الدواجن البيضاء",
              value: stats.whiteProducts,
              description: "منتجات مرتبطة بالبورصة البيضاء",
              icon: "🐔",
              color: "text-blue-700",
              bg: "bg-blue-50",
            },
            {
              title: "منتجات الدواجن البلدي",
              value: stats.baladiProducts,
              description: "منتجات مرتبطة بالبورصة البلدي",
              icon: "🍗",
              color: "text-orange-700",
              bg: "bg-orange-50",
            },
            {
              title: "تعديلات الموردين",
              value: stats.overridden,
              description: "أسعار مختلفة عن سعر البورصة",
              icon: "✏️",
              color: "text-purple-700",
              bg: "bg-purple-50",
            },
          ].map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <p className={`mt-3 text-2xl font-extrabold ${stat.color}`}>
                    {stat.value.toLocaleString("en-US")}
                  </p>
                </div>

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${stat.bg}`}
                >
                  {stat.icon}
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        {/* Date Filter */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                تاريخ البورصة
              </label>

              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                يمكنك اختيار تاريخ سابق لمراجعة بورصة ذلك اليوم.
              </p>
            </div>

            <div className="mb-6 flex items-end">
              <button
                type="button"
                onClick={() => {
                  setDate(today);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
              >
                العودة إلى بورصة اليوم
              </button>
            </div>
          </div>
        </section>

        {/* Daily Exchange Prices */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">
                  تسجيل أسعار البورصة اليومية
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  أدخل سعر الدواجن البيضاء والبلدي مرة واحدة في اليوم.
                </p>
              </div>

              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                {formatDate(date)}
              </span>
            </div>
          </div>

          <form onSubmit={saveDailyExchange} className="p-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                    🐔
                  </div>

                  <div>
                    <h3 className="font-extrabold text-blue-900">
                      بورصة الدواجن البيضاء
                    </h3>

                    <p className="mt-1 text-xs text-blue-700">
                      السعر الأساسي للبيضاء
                    </p>
                  </div>
                </div>

                <label className="mb-2 block text-sm font-bold text-blue-900">
                  سعر البورصة
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={whitePrice}
                  onChange={(event) =>
                    handleBasePriceChange("white", event.target.value)
                  }
                  placeholder="مثال: 70"
                  className="w-full rounded-xl border border-blue-200 bg-white px-4 py-4 text-2xl font-extrabold text-blue-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-2xl">
                    🍗
                  </div>

                  <div>
                    <h3 className="font-extrabold text-orange-900">
                      بورصة الدواجن البلدي
                    </h3>

                    <p className="mt-1 text-xs text-orange-700">
                      السعر الأساسي للبلدي
                    </p>
                  </div>
                </div>

                <label className="mb-2 block text-sm font-bold text-orange-900">
                  سعر البورصة
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={baladiPrice}
                  onChange={(event) =>
                    handleBasePriceChange("baladi", event.target.value)
                  }
                  placeholder="مثال: 75"
                  className="w-full rounded-xl border border-orange-200 bg-white px-4 py-4 text-2xl font-extrabold text-orange-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                أسعار الموردين ستعتمد تلقائيًا على هذه الأسعار ما لم يتم تعديلها.
              </p>

              <button
                type="submit"
                className="rounded-xl bg-orange-600 px-8 py-3 font-bold text-white shadow-sm transition hover:bg-orange-700 active:scale-[0.98]"
              >
                حفظ أسعار البورصة
              </button>
            </div>
          </form>
        </section>

        {/* Messages */}
        {(error || success) && (
          <div
            className={`flex items-center gap-2 rounded-xl border p-4 text-sm font-medium ${
              error
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-green-100 bg-green-50 text-green-700"
            }`}
          >
            <span>{error ? "⚠️" : "✓"}</span>
            {error || success}
          </div>
        )}

        {/* Suppliers Prices */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                أسعار الموردين
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                يمكنك تعديل سعر مورد معين دون التأثير على باقي الموردين.
              </p>
            </div>

            <span className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
              {SUPPLIERS.length} مورد
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="h-3 w-3 rounded-sm border border-slate-300 bg-white" />
              سعر البورصة الأساسي
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="h-3 w-3 rounded-sm border border-orange-200 bg-orange-100" />
              سعر معدل للمورد
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-212.5 border-separate border-spacing-0 text-center text-sm">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="border border-slate-300 bg-slate-800 p-3 text-white"
                  >
                    #
                  </th>

                  <th
                    rowSpan={2}
                    className="min-w-56 border border-slate-300 bg-slate-800 p-3 text-white"
                  >
                    اسم المورد
                  </th>

                  <th
                    colSpan={2}
                    className="border border-slate-300 bg-blue-700 p-3 font-extrabold text-white"
                  >
                    أسعار الدواجن البيضاء والبلدي
                  </th>
                </tr>

                <tr>
                  <th className="min-w-64 border border-slate-300 bg-blue-100 p-3 font-bold text-blue-900">
                    الدواجن البيضاء
                  </th>

                  <th className="min-w-64 border border-slate-300 bg-orange-100 p-3 font-bold text-orange-900">
                    الدواجن البلدي
                  </th>
                </tr>
              </thead>

              <tbody>
                {SUPPLIERS.map((supplier, index) => {
                  const whiteOverridden = hasSupplierOverride(
                    supplier.id,
                    "white",
                  );

                  const baladiOverridden = hasSupplierOverride(
                    supplier.id,
                    "baladi",
                  );

                  return (
                    <tr key={supplier.id} className="hover:bg-slate-50">
                      <td className="border border-slate-200 bg-white p-3 font-bold text-slate-400">
                        {index + 1}
                      </td>

                      <td className="border border-slate-200 bg-white p-3 text-right font-bold text-slate-800">
                        {supplier.name}
                      </td>

                      <td
                        className={`border border-slate-200 p-3 ${
                          whiteOverridden ? "bg-orange-50" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={getSupplierPrice(supplier.id, "white")}
                            disabled={whitePrice === ""}
                            onChange={(event) =>
                              updateSupplierPrice(
                                supplier.id,
                                "white",
                                event.target.value,
                              )
                            }
                            placeholder="سعر البيضاء"
                            className={`w-28 rounded-lg border px-3 py-2 text-center font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                              whiteOverridden
                                ? "border-orange-200 bg-orange-50 text-orange-800"
                                : "border-slate-200 bg-white text-blue-800"
                            }`}
                          />

                          {whiteOverridden && (
                            <button
                              type="button"
                              onClick={() =>
                                resetSupplierPrice(supplier.id, "white")
                              }
                              title="إرجاع إلى سعر البورصة"
                              className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-orange-700 shadow-sm transition hover:bg-orange-100"
                            >
                              افتراضي
                            </button>
                          )}
                        </div>

                        {whiteOverridden && (
                          <p className="mt-1 text-[11px] font-bold text-orange-600">
                            سعر معدل
                          </p>
                        )}
                      </td>

                      <td
                        className={`border border-slate-200 p-3 ${
                          baladiOverridden ? "bg-orange-50" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={getSupplierPrice(supplier.id, "baladi")}
                            disabled={baladiPrice === ""}
                            onChange={(event) =>
                              updateSupplierPrice(
                                supplier.id,
                                "baladi",
                                event.target.value,
                              )
                            }
                            placeholder="سعر البلدي"
                            className={`w-28 rounded-lg border px-3 py-2 text-center font-bold outline-none focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                              baladiOverridden
                                ? "border-orange-200 bg-orange-50 text-orange-800"
                                : "border-slate-200 bg-white text-orange-800"
                            }`}
                          />

                          {baladiOverridden && (
                            <button
                              type="button"
                              onClick={() =>
                                resetSupplierPrice(supplier.id, "baladi")
                              }
                              title="إرجاع إلى سعر البورصة"
                              className="rounded-lg bg-white px-2 py-2 text-xs font-bold text-orange-700 shadow-sm transition hover:bg-orange-100"
                            >
                              افتراضي
                            </button>
                          )}
                        </div>

                        {baladiOverridden && (
                          <p className="mt-1 text-[11px] font-bold text-orange-600">
                            سعر معدل
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500">
            تعديل سعر مورد في خانة البيضاء لا يؤثر على سعر البلدي، والعكس صحيح.
            الأسعار المعدلة تخص المورد والتاريخ المحدد فقط.
          </div>
        </section>

        {/* Add Product */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl">
                ➕
              </div>

              <div>
                <h2 className="font-extrabold text-slate-800">
                  إضافة منتج جديد
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  اختر المورد ونوع البورصة وسيتم تحديد السعر تلقائيًا.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <form
              onSubmit={addProduct}
              className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-5"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  باركود المنتج
                </label>

                <input
                  type="text"
                  value={form.barcode}
                  onChange={(event) =>
                    handleFormChange("barcode", event.target.value)
                  }
                  placeholder="أدخل الباركود"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  اسم المنتج
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    handleFormChange("name", event.target.value)
                  }
                  placeholder="أدخل اسم المنتج"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  اسم المورد
                </label>

                <select
                  value={form.supplierId}
                  onChange={(event) =>
                    handleFormChange("supplierId", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white"
                >
                  <option value="">اختر المورد</option>

                  {SUPPLIERS.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  نوع البورصة
                </label>

                <select
                  value={form.type}
                  onChange={(event) =>
                    handleFormChange("type", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition focus:border-orange-400 focus:bg-white"
                >
                  {Object.entries(POULTRY_TYPES).map(([type, item]) => (
                    <option key={type} value={type}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 active:scale-[0.98]"
              >
                <span className="text-lg">+</span>
                إضافة المنتج
              </button>
            </form>

            {form.supplierId && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <span className="font-bold">السعر المتوقع للمنتج: </span>
                {formatPrice(getSupplierPrice(form.supplierId, form.type))}
                <span className="mr-1 text-xs text-blue-600">
                  حسب أسعار المورد في تاريخ {formatDate(date)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Products Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                المنتجات المرتبطة بالبورصة
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                يمكنك تغيير المورد أو نوع البورصة، والسعر يتحدث تلقائيًا.
              </p>
            </div>

            <div className="relative w-full md:max-w-sm">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث بالاسم أو الباركود أو المورد..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-262.5 border-separate border-spacing-0 text-center text-sm">
              <thead>
                <tr>
                  {[
                    "#",
                    "باركود المنتج",
                    "اسم المنتج",
                    "نوع البورصة",
                    "الإجراءات",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="border border-slate-300 bg-slate-800 p-3 text-white"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400">
                      لا توجد منتجات مطابقة للبحث.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, index) => {
                    return (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="border border-slate-200 p-3 font-bold text-slate-400">
                          {index + 1}
                        </td>

                        <td className="border border-slate-200 p-3 font-semibold text-slate-600">
                          {product.barcode}
                        </td>

                        <td className="border border-slate-200 p-3 text-right font-bold text-slate-800">
                          {product.name}
                        </td>

                        <td className="border border-slate-200 p-3">
                          <select
                            value={product.type}
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "type",
                                event.target.value,
                              )
                            }
                            className={`w-full min-w-36 rounded-lg border px-3 py-2 text-xs font-bold outline-none ${
                              product.type === "white"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-orange-200 bg-orange-50 text-orange-700"
                            }`}
                          >
                            {Object.entries(POULTRY_TYPES).map(([type, item]) => (
                              <option key={type} value={type}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border border-slate-200 p-3">
                          <button
                            type="button"
                            onClick={() => deleteProduct(product.id)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                          >
                            حذف المنتج
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500">
            إجمالي المنتجات: {products.length}
          </div>
        </section>

        {/* Exchange History */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="font-extrabold text-slate-800">
              سجل البورصات السابقة
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              اختر تاريخًا للرجوع إلى أسعار البورصة وتعديلات الموردين.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-175 border-separate border-spacing-0 text-center text-sm">
              <thead>
                <tr>
                  <th className="border border-slate-200 bg-slate-100 p-3">
                    التاريخ
                  </th>

                  <th className="border border-slate-200 bg-blue-50 p-3 text-blue-900">
                    بورصة البيضاء
                  </th>

                  <th className="border border-slate-200 bg-orange-50 p-3 text-orange-900">
                    بورصة البلدي
                  </th>

                  <th className="border border-slate-200 bg-slate-100 p-3">
                    الحالة
                  </th>
                </tr>
              </thead>

              <tbody>
                {[...exchanges]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((exchange) => {
                    const isOngoing = exchange.date >= today;

                    return (
                      <tr
                        key={exchange.date}
                        className={exchange.date === date ? "bg-orange-50" : ""}
                      >
                        <td className="border border-slate-200 p-3 font-bold text-slate-700">
                          {formatDate(exchange.date)}
                        </td>

                        <td className="border border-slate-200 p-3 font-bold text-blue-700">
                          {formatPrice(exchange.whitePrice)}
                        </td>

                        <td className="border border-slate-200 p-3 font-bold text-orange-700">
                          {formatPrice(exchange.baladiPrice)}
                        </td>

                        <td className="border border-slate-200 p-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${
                              isOngoing
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isOngoing ? "bg-green-600" : "bg-red-600"
                              }`}
                            />

                            {isOngoing ? "مستمرة" : "منتهية"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                {exchanges.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      لا توجد بورصات مسجلة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DailyExchange;
