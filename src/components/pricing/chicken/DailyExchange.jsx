
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../header.jsx";
import { sendHttpReq } from "../../../lib/httpHandler.jsx";
import { useAuth } from "../../../context/authContext";

import {
  POULTRY_TYPES,
  createExchange,
  createProduct,
  normalizeProduct,
  normalizeProductType,
  normalizeSupplier,
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

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
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

const getExchangeStatus = (exchangeDate, today = getTodayDate()) => {
  if (!exchangeDate) return "ended";

  return exchangeDate >= today ? "active" : "ended";
};

const sortExchanges = (items) =>
  [...items].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );

const normalizeExchange = (exchange) => ({
  ...exchange,
  products: Array.isArray(exchange.products)
    ? exchange.products.map(normalizeProduct)
    : [],
});

const getProductUnitName = (product) => {
  const value =
    product?.unitName ||
    product?.unit_name ||
    product?.unitLabel ||
    product?.unit_label ||
    product?.unit?.a_name ||
    product?.unit?.name;

  if (value) return String(value);

  if (
    typeof product?.unit === "string" &&
    !/^\d+$/.test(product.unit.trim())
  ) {
    return product.unit.trim();
  }

  return "—";
};

const getProductSuppliers = (product) => {
  const suppliers =
    product?.suppliers ||
    product?.selectedSuppliers ||
    product?.selected_suppliers ||
    [];

  if (!Array.isArray(suppliers)) return [];

  return suppliers
    .map(normalizeSupplier)
    .filter(
      (supplier) =>
        supplier?.supplierId && supplier?.supplierName,
    );
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

function DailyExchange() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const today = getTodayDate();

  // كود الموظف صاحب عملية إنشاء البورصة
  const currentUserCode = user?.code
    ? String(user.code)
    : "غير محدد";

  const [date, setDate] = useState(today);

  const [exchanges, setExchanges] = useState(() => {
    const data = getDailyExchangeData();

    return sortExchanges(
      (Array.isArray(data.exchanges) ? data.exchanges : []).map(
        normalizeExchange,
      ),
    );
  });

  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    barcode: "",
    type: "white",
  });

  const [lookupProduct, setLookupProduct] = useState(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);

  const [loadingProduct, setLoadingProduct] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ---------------------------------------------------------------------- */
  /* Local Storage                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const saved = updateDailyExchangeData({ exchanges });

    if (!saved) {
      setError("تعذر حفظ البيانات في المتصفح.");
    }
  }, [exchanges]);

  /* ---------------------------------------------------------------------- */
  /* Selected Exchange                                                      */
  /* ---------------------------------------------------------------------- */

  const currentExchange = useMemo(
    () => exchanges.find((item) => item.date === date) || null,
    [exchanges, date],
  );

  const whitePrice = currentExchange?.whitePrice ?? "";
  const baladiPrice = currentExchange?.baladiPrice ?? "";

  const isExchangeActive =
    getExchangeStatus(date, today) === "active";

  /* ---------------------------------------------------------------------- */
  /* Latest Prices                                                          */
  /* ---------------------------------------------------------------------- */

  const latestWhitePrice = useMemo(() => {
    const exchange = sortExchanges(exchanges).find(
      (item) =>
        item.date <= today &&
        item.whitePrice !== "" &&
        item.whitePrice !== null &&
        item.whitePrice !== undefined &&
        Number.isFinite(Number(item.whitePrice)) &&
        Number(item.whitePrice) > 0,
    );

    return exchange?.whitePrice ?? "";
  }, [exchanges, today]);

  const latestBaladiPrice = useMemo(() => {
    const exchange = sortExchanges(exchanges).find(
      (item) =>
        item.date <= today &&
        item.baladiPrice !== "" &&
        item.baladiPrice !== null &&
        item.baladiPrice !== undefined &&
        Number.isFinite(Number(item.baladiPrice)) &&
        Number(item.baladiPrice) > 0,
    );

    return exchange?.baladiPrice ?? "";
  }, [exchanges, today]);

  const latestExchange = useMemo(() => {
    const eligible = exchanges.filter(
      (exchange) => exchange.date <= today,
    );

    return sortExchanges(
      eligible.length ? eligible : exchanges,
    )[0] || null;
  }, [exchanges, today]);

  const getProductCurrentPrice = (product) => {
    const type = normalizeProductType(product.type);

    return type === "baladi"
      ? latestBaladiPrice
      : latestWhitePrice;
  };

  /* ---------------------------------------------------------------------- */
  /* All Products                                                            */
  /* ---------------------------------------------------------------------- */

  const allProducts = useMemo(() => {
    return exchanges.flatMap((exchange) =>
      (exchange.products || []).map((product) => ({
        ...normalizeProduct(product),
        exchangeDate: exchange.date,
      })),
    );
  }, [exchanges]);

  /* ---------------------------------------------------------------------- */
  /* Update Exchange                                                        */
  /* ---------------------------------------------------------------------- */

  const updateExchange = (updater, targetDate = date) => {
    setExchanges((previous) => {
      const exists = previous.some(
        (item) => item.date === targetDate,
      );

      if (!exists) {
        const newExchange = createExchange(
          targetDate,
          currentUserCode,
        );

        const updated = updater({
          ...newExchange,
          products: [],
        });

        return sortExchanges([...previous, updated]);
      }

      return sortExchanges(
        previous.map((item) =>
          item.date === targetDate
            ? updater({
                ...item,
                products: Array.isArray(item.products)
                  ? item.products
                  : [],
              })
            : item,
        ),
      );
    });

    setError("");
    setSuccess("");
  };

  /* ---------------------------------------------------------------------- */
  /* Daily Prices                                                            */
  /* ---------------------------------------------------------------------- */

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
      setSuccess("");
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
      setError(
        "من فضلك أدخل سعر البورصة البيضاء والبلدي بشكل صحيح.",
      );
      setSuccess("");
      return;
    }

    setExchanges((previous) => {
      const exists = previous.some((item) => item.date === date);

      if (exists) return previous;

      return sortExchanges([
        ...previous,
        createExchange(date, currentUserCode),
      ]);
    });

    setError("");
    setSuccess(
      "تم حفظ أسعار البورصة بنجاح، وسيتم تطبيق أحدث الأسعار على جميع المنتجات.",
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Product Lookup                                                         */
  /* ---------------------------------------------------------------------- */

  const productsForDate = () => {
    const exchange = exchanges.find(
      (item) => item.date === date,
    );

    return exchange?.products || [];
  };

  const handleBarcodeChange = (value) => {
    setForm((previous) => ({
      ...previous,
      barcode: value,
    }));

    setLookupProduct(null);
    setSelectedSuppliers([]);
    setError("");
    setSuccess("");
  };

  const searchProductByBarcode = async () => {
    const searchValue = form.barcode.trim();

    if (!searchValue) {
      setError("من فضلك أدخل باركود أو اسم المنتج.");
      setSuccess("");
      return;
    }

    setLoadingProduct(true);
    setError("");
    setSuccess("");
    setLookupProduct(null);
    setSelectedSuppliers([]);

    try {
      const response = await sendHttpReq(
        `daily-exchange/product/${encodeURIComponent(searchValue)}`,
      );

      if (!response?.success || !response?.product) {
        throw new Error(
          response?.message || "لم يتم العثور على المنتج.",
        );
      }

      const rawProduct = response.product;

      const normalizedSuppliers = Array.isArray(rawProduct.suppliers)
        ? rawProduct.suppliers
            .map(normalizeSupplier)
            .filter(
              (supplier) =>
                supplier?.supplierId &&
                supplier?.supplierName,
            )
        : [];

      const product = normalizeProduct({
        ...rawProduct,
        suppliers: normalizedSuppliers,
      });

      const duplicate = productsForDate().some((item) => {
        const sameBarcode =
          product.barcode &&
          String(item.barcode || "").trim() ===
            String(product.barcode).trim();

        const sameItemean =
          product.itemean &&
          String(item.itemean || "").trim() ===
            String(product.itemean).trim();

        return sameBarcode || sameItemean;
      });

      if (duplicate) {
        throw new Error(
          "هذا المنتج موجود بالفعل في بورصة هذا التاريخ.",
        );
      }

      setLookupProduct(product);

      if (product.suppliers.length === 1) {
        setSelectedSuppliers([
          String(product.suppliers[0].supplierId),
        ]);
      }

      setSuccess(
        product.suppliers.length
          ? `تم العثور على المنتج و ${product.suppliers.length} مورد نشط.`
          : "تم العثور على المنتج، ولكن لا يوجد موردون نشطون مرتبطون به.",
      );
    } catch (requestError) {
      setLookupProduct(null);
      setSelectedSuppliers([]);

      setError(
        requestError.message || "تعذر البحث عن المنتج.",
      );
    } finally {
      setLoadingProduct(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Supplier Selection                                                     */
  /* ---------------------------------------------------------------------- */

  const availableSuppliers = lookupProduct?.suppliers || [];

  const allSuppliersSelected =
    availableSuppliers.length > 0 &&
    selectedSuppliers.length === availableSuppliers.length;

  const selectedSupplierDetails = useMemo(() => {
    return availableSuppliers.filter((supplier) =>
      selectedSuppliers.includes(String(supplier.supplierId)),
    );
  }, [lookupProduct, selectedSuppliers]);

  const toggleSupplier = (supplierId) => {
    const id = String(supplierId);

    setSelectedSuppliers((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const toggleAllSuppliers = () => {
    if (allSuppliersSelected) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(
        availableSuppliers.map((supplier) =>
          String(supplier.supplierId),
        ),
      );
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Add Product                                                            */
  /* ---------------------------------------------------------------------- */

  const addProduct = (event) => {
    event.preventDefault();

    if (!lookupProduct) {
      setError("ابحث عن المنتج بالباركود أو الاسم أولاً.");
      return;
    }

    if (!selectedSuppliers.length) {
      setError("اختر موردًا واحدًا على الأقل.");
      return;
    }

    const suppliers = availableSuppliers
      .filter((supplier) =>
        selectedSuppliers.includes(String(supplier.supplierId)),
      )
      .map((supplier) => ({
        supplierId: String(supplier.supplierId),
        supplierName: String(supplier.supplierName),
      }));

    if (!suppliers.length) {
      setError("لم يتم العثور على الموردين المحددين.");
      return;
    }

    const product = createProduct({
      ...lookupProduct,
      type: normalizeProductType(form.type),
      suppliers,
    });

    updateExchange((exchange) => ({
      ...exchange,
      products: [
        ...(exchange.products || []),
        product,
      ],
    }));

    setForm({
      barcode: "",
      type: "white",
    });

    setLookupProduct(null);
    setSelectedSuppliers([]);
    setSearch("");

    setSuccess("تمت إضافة المنتج والموردين المحددين للبورصة.");
    setError("");
  };

  /* ---------------------------------------------------------------------- */
  /* Update Product                                                         */
  /* ---------------------------------------------------------------------- */

  const updateProduct = (productId, exchangeDate, field, value) => {
    updateExchange(
      (exchange) => ({
        ...exchange,
        products: (exchange.products || []).map((product) => {
          if (product.id !== productId) return product;

          return {
            ...product,
            [field]:
              field === "type"
                ? normalizeProductType(value)
                : value,
          };
        }),
      }),
      exchangeDate,
    );

    setSuccess("تم تحديث بيانات المنتج.");
  };

  /* ---------------------------------------------------------------------- */
  /* Delete Product                                                         */
  /* ---------------------------------------------------------------------- */

  const deleteProduct = (productId, exchangeDate) => {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف المنتج من هذه البورصة؟",
    );

    if (!confirmed) return;

    updateExchange(
      (exchange) => ({
        ...exchange,
        products: (exchange.products || []).filter(
          (product) => product.id !== productId,
        ),
      }),
      exchangeDate,
    );

    setSuccess("تم حذف المنتج من البورصة.");
  };

  /* ---------------------------------------------------------------------- */
  /* Product Search                                                         */
  /* ---------------------------------------------------------------------- */

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    return allProducts.filter((product) => {
      const suppliers = getProductSuppliers(product);

      const supplierNames = suppliers
        .map((supplier) => supplier.supplierName)
        .join(" ")
        .toLowerCase();

      return (
        !value ||
        String(product.name || "").toLowerCase().includes(value) ||
        String(product.barcode || "").toLowerCase().includes(value) ||
        String(product.itemean || "").toLowerCase().includes(value) ||
        supplierNames.includes(value)
      );
    });
  }, [allProducts, search]);

  /* ---------------------------------------------------------------------- */
  /* Statistics                                                             */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo(() => {
    const whiteProducts = allProducts.filter(
      (product) => normalizeProductType(product.type) === "white",
    ).length;

    const baladiProducts = allProducts.filter(
      (product) => normalizeProductType(product.type) === "baladi",
    ).length;

    const suppliersCount = new Set(
      allProducts.flatMap((product) =>
        getProductSuppliers(product).map((supplier) =>
          String(supplier.supplierId),
        ),
      ),
    ).size;

    return {
      products: allProducts.length,
      whiteProducts,
      baladiProducts,
      suppliers: suppliersCount,
    };
  }, [allProducts]);

  /* ---------------------------------------------------------------------- */
  /* Date Selection                                                         */
  /* ---------------------------------------------------------------------- */

  const selectExchangeDate = (selectedDate) => {
    setDate(selectedDate);
    setLookupProduct(null);
    setSelectedSuppliers([]);
    setForm({ barcode: "", type: "white" });
    setError("");
    setSuccess("");
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
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
                إدارة بورصة الدواجن البيضاء والبلدي وربط المنتجات بالموردين
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

        {/* Current Prices */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-extrabold text-slate-800">
              الأسعار الحالية للمنتجات
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              جميع المنتجات تستخدم أحدث أسعار بورصة مسجلة، حتى المنتجات المضافة في الأيام السابقة.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-bold text-blue-800">
                آخر سعر للبورصة البيضاء
              </p>

              <p className="mt-3 text-3xl font-extrabold text-blue-700">
                {formatPrice(latestWhitePrice)}
                <span className="mr-2 text-sm font-semibold">جنيه</span>
              </p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-bold text-orange-800">
                آخر سعر للبورصة البلدي
              </p>

              <p className="mt-3 text-3xl font-extrabold text-orange-700">
                {formatPrice(latestBaladiPrice)}
                <span className="mr-2 text-sm font-semibold">جنيه</span>
              </p>
            </div>
          </div>

          {latestExchange && (
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
              أحدث بورصة مسجلة بتاريخ:{" "}
              <strong className="text-slate-700">
                {formatDate(latestExchange.date)}
              </strong>
            </div>
          )}
        </section>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "إجمالي المنتجات",
              value: stats.products,
              description: "جميع المنتجات في كل البورصات",
              icon: "📦",
              color: "text-blue-700",
              bg: "bg-blue-50",
            },
            {
              title: "منتجات الدواجن البيضاء",
              value: stats.whiteProducts,
              description: "تستخدم آخر سعر للبورصة البيضاء",
              icon: "🐔",
              color: "text-blue-700",
              bg: "bg-blue-50",
            },
            {
              title: "منتجات الدواجن البلدي",
              value: stats.baladiProducts,
              description: "تستخدم آخر سعر للبورصة البلدي",
              icon: "🍗",
              color: "text-orange-700",
              bg: "bg-orange-50",
            },
            {
              title: "الموردون المرتبطون",
              value: stats.suppliers,
              description: "عدد الموردين المرتبطين بالمنتجات",
              icon: "🏢",
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

                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${stat.bg}`}>
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
                onChange={(event) => selectExchangeDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                اختر تاريخًا لمراجعة بورصته أو إضافة منتجات إليه.
              </p>
            </div>

            <div className="mb-6 flex items-end">
              <button
                type="button"
                onClick={() => selectExchangeDate(today)}
                className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700 transition hover:bg-orange-100"
              >
                العودة إلى بورصة اليوم
              </button>
            </div>
          </div>
        </section>

        {/* Daily Prices */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="text-lg font-extrabold text-slate-800">
              أسعار البورصة اليومية
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              أدخل سعر البيضاء والبلدي لهذا التاريخ. الأسعار الجديدة ستنعكس على جميع المنتجات.
            </p>
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
                      السعر الأساسي للمنتجات البيضاء
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
                      السعر الأساسي للمنتجات البلدي
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
                الأسعار تحفظ محليًا، ولا يتم تعديل أسعار المنتجات الأصلية في قاعدة البيانات.
              </p>

              <button
                type="submit"
                className="rounded-xl bg-orange-600 px-8 py-3 font-bold text-white shadow-sm transition hover:bg-orange-700 active:scale-[0.98]"
              >
                حفظ أسعار البورصة
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-800">
                حالة البورصة
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                تتحدد تلقائيًا حسب تاريخ البورصة.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${
                isExchangeActive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${isExchangeActive ? "bg-green-600" : "bg-red-600"}`} />
              {isExchangeActive ? "البورصة مستمرة" : "البورصة منتهية"}
            </span>
          </div>

          {currentExchange?.createdBy && (
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              أنشئت بواسطة:{" "}
              <span className="font-bold text-slate-700">
                {currentExchange.createdBy}
              </span>
            </div>
          )}
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

        {/* Add Product */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl">
                ➕
              </div>

              <div>
                <h2 className="font-extrabold text-slate-800">
                  إضافة منتج للبورصة
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  ابحث بالباركود أو اسم المنتج أو رقم الصنف لجلب المنتج والموردين النشطين من قاعدة البيانات.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  باركود أو اسم المنتج
                </label>

                <input
                  type="text"
                  value={form.barcode}
                  onChange={(event) =>
                    handleBarcodeChange(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      searchProductByBarcode();
                    }
                  }}
                  placeholder="امسح الباركود أو اكتب اسم المنتج..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <button
                type="button"
                onClick={searchProductByBarcode}
                disabled={loadingProduct}
                className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingProduct ? "جاري البحث..." : "بحث عن المنتج"}
              </button>
            </div>

            {lookupProduct && (
              <div className="space-y-5 rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                      تم العثور على المنتج
                    </span>

                    <h3 className="mt-3 text-lg font-extrabold text-slate-800">
                      {lookupProduct.name}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                      <span>
                        الباركود: <strong>{lookupProduct.barcode}</strong>
                      </span>

                      <span>
                        رقم الصنف: <strong>{lookupProduct.itemean || "—"}</strong>
                      </span>

                      <span>
                        الوحدة: <strong>{getProductUnitName(lookupProduct)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="min-w-48">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      نوع البورصة
                    </label>

                    <select
                      value={normalizeProductType(form.type)}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          type: normalizeProductType(event.target.value),
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-orange-400"
                    >
                      {Object.entries(POULTRY_TYPES).map(([type, item]) => (
                        <option key={type} value={type}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Suppliers */}
                <div className="border-t border-blue-200 pt-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-slate-800">
                        الموردون النشطون
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        اختر الموردين الذين تريد ربطهم بهذا المنتج.
                      </p>
                    </div>

                    {availableSuppliers.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllSuppliers}
                        className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        {allSuppliersSelected
                          ? "إلغاء تحديد الكل"
                          : "تحديد كل الموردين"}
                      </button>
                    )}
                  </div>

                  {availableSuppliers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {availableSuppliers.map((supplier) => {
                        const checked = selectedSuppliers.includes(
                          String(supplier.supplierId),
                        );

                        return (
                          <label
                            key={supplier.supplierId}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                              checked
                                ? "border-blue-400 bg-white shadow-sm"
                                : "border-slate-200 bg-white hover:border-blue-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleSupplier(supplier.supplierId)
                              }
                              className="h-5 w-5 accent-blue-600"
                            />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {supplier.supplierName}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                رقم المورد: {supplier.supplierId}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                      هذا المنتج ليس له موردون نشطون حاليًا.
                    </div>
                  )}

                  {/* Selected Suppliers */}
                  <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h4 className="font-extrabold text-green-800">
                        الموردون المختارون
                      </h4>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {selectedSupplierDetails.length} مورد
                      </span>
                    </div>

                    {selectedSupplierDetails.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {selectedSupplierDetails.map((supplier) => (
                          <div
                            key={supplier.supplierId}
                            className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-white p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {supplier.supplierName}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                رقم المورد: {supplier.supplierId}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-lg bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                              ✓ مختار
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-green-300 bg-white p-4 text-center text-sm text-slate-500">
                        لم يتم اختيار أي مورد حتى الآن.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-blue-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-600">
                    تم اختيار {selectedSuppliers.length} من{" "}
                    {availableSuppliers.length} مورد.
                  </p>

                  <button
                    type="button"
                    onClick={addProduct}
                    disabled={!selectedSuppliers.length}
                    className="rounded-xl bg-orange-600 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    إضافة المنتج للبورصة
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* All Products */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                جميع المنتجات وأسعارها الحالية
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                يعرض المنتجات من جميع البورصات، ويحسب سعر كل منتج من أحدث بورصة حسب نوعه.
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
            <table className="w-full min-w-275 border-separate border-spacing-0 text-center text-sm">
              <thead>
                <tr>
                  {[
                    "#",
                    "تاريخ الإضافة",
                    "باركود المنتج",
                    "اسم المنتج",
                    "الوحدة",
                    "الموردون المختارون",
                    "نوع البورصة",
                    "السعر الحالي",
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
                    <td colSpan={9} className="p-10 text-center text-slate-400">
                      لا توجد منتجات مسجلة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, index) => {
                    const type = normalizeProductType(product.type);
                    const suppliers = getProductSuppliers(product);
                    const currentPrice = getProductCurrentPrice(product);

                    return (
                      <tr
                        key={`${product.exchangeDate}-${product.id}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="border border-slate-200 p-3 font-bold text-slate-400">
                          {index + 1}
                        </td>

                        <td className="border border-slate-200 p-3 text-slate-600">
                          {formatDate(product.exchangeDate)}
                        </td>

                        <td className="border border-slate-200 p-3 font-semibold text-slate-600">
                          {product.barcode || "—"}
                        </td>

                        <td className="border border-slate-200 p-3 text-right font-bold text-slate-800">
                          {product.name || "—"}
                        </td>

                        <td className="border border-slate-200 p-3 text-slate-600">
                          {getProductUnitName(product)}
                        </td>

                        <td className="border border-slate-200 p-3 text-right">
                          {suppliers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {suppliers.map((supplier, supplierIndex) => (
                                <span
                                  key={`${supplier.supplierId}-${supplierIndex}`}
                                  className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700"
                                >
                                  {supplier.supplierName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              لا يوجد موردون محفوظون
                            </span>
                          )}
                        </td>

                        <td className="border border-slate-200 p-3">
                          <select
                            value={type}
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                product.exchangeDate,
                                "type",
                                event.target.value,
                              )
                            }
                            className={`w-full min-w-36 rounded-lg border px-3 py-2 text-xs font-bold outline-none ${
                              type === "white"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-orange-200 bg-orange-50 text-orange-700"
                            }`}
                          >
                            <option value="white">دواجن بيضاء</option>
                            <option value="baladi">دواجن بلدي</option>
                          </select>
                        </td>

                        <td className="border border-slate-200 p-3">
                          <span
                            className={`inline-flex min-w-24 items-center justify-center rounded-lg px-3 py-2 font-extrabold ${
                              type === "white"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-orange-50 text-orange-700"
                            }`}
                          >
                            {formatPrice(currentPrice)}
                          </span>
                        </td>

                        <td className="border border-slate-200 p-3">
                          <button
                            type="button"
                            onClick={() =>
                              deleteProduct(product.id, product.exchangeDate)
                            }
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
            إجمالي المنتجات في جميع البورصات: {allProducts.length}
          </div>
        </section>

        {/* Exchange History */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="font-extrabold text-slate-800">
              سجل البورصات السابقة
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              يحتفظ كل يوم بأسعاره التاريخية، بينما تستخدم المنتجات أحدث الأسعار المسجلة.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 border-separate border-spacing-0 text-center text-sm">
              <thead>
                <tr>
                  {[
                    "التاريخ",
                    "بورصة البيضاء",
                    "بورصة البلدي",
                    "عدد المنتجات",
                    "أنشئت بواسطة",
                    "الحالة",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="border border-slate-200 bg-slate-100 p-3"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sortExchanges(exchanges).map((exchange) => {
                  const isActive =
                    getExchangeStatus(exchange.date, today) === "active";

                  return (
                    <tr
                      key={exchange.date}
                      onClick={() => selectExchangeDate(exchange.date)}
                      className={`cursor-pointer transition hover:bg-orange-50 ${
                        exchange.date === date ? "bg-orange-50" : ""
                      }`}
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

                      <td className="border border-slate-200 p-3 font-bold text-slate-700">
                        {exchange.products?.length || 0}
                      </td>

                      <td className="border border-slate-200 p-3 font-bold text-slate-700">
                        {exchange.createdBy || "غير محدد"}
                      </td>

                      <td className="border border-slate-200 p-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${
                            isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${isActive ? "bg-green-600" : "bg-red-600"}`} />
                          {isActive ? "مستمرة" : "منتهية"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {exchanges.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا توجد بورصات مسجلة حتى الآن.
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
