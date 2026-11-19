
const STORAGE_KEY = "dailyExchangeData";

const EMPTY_DATA = {
  exchanges: [],
  supplierFactors: {
    suppliers: [],
    stockPrices: [],
  },
  manufacturingProducts: [],
  profitMargins: null,
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const cloneData = (data) => structuredClone(data);

const normalizeSupplierFactors = (data) => {
  const factors =
    data?.supplierFactors &&
    typeof data.supplierFactors === "object" &&
    !Array.isArray(data.supplierFactors)
      ? data.supplierFactors
      : {};

  return {
    ...factors,
    suppliers: Array.isArray(factors.suppliers)
      ? factors.suppliers
      : [],
    stockPrices: Array.isArray(factors.stockPrices)
      ? factors.stockPrices
      : [],
  };
};

const normalizeData = (data) => ({
  ...EMPTY_DATA,
  ...(data && typeof data === "object" ? data : {}),

  exchanges: Array.isArray(data?.exchanges)
    ? data.exchanges
    : [],

  supplierFactors: normalizeSupplierFactors(data),

  manufacturingProducts: Array.isArray(data?.manufacturingProducts)
    ? data.manufacturingProducts
    : [],

  // null تعني أن هوامش الربح لم يتم تهيئتها بعد.
  // [] تعني أنه تم حفظها ولكن لا توجد سجلات حاليًا.
  profitMargins: Array.isArray(data?.profitMargins)
    ? data.profitMargins
    : null,
});

/* -------------------------------------------------------------------------- */
/* Shared Storage                                                             */
/* -------------------------------------------------------------------------- */

export const getDailyExchangeData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return cloneData(EMPTY_DATA);

    return normalizeData(JSON.parse(saved));
  } catch (error) {
    console.error("Failed to load daily exchange data:", error);
    return cloneData(EMPTY_DATA);
  }
};

export const saveDailyExchangeData = (data = {}) => {
  try {
    const current = getDailyExchangeData();

    const nextData = normalizeData({
      ...current,
      ...data,

      exchanges: Array.isArray(data.exchanges)
        ? data.exchanges
        : current.exchanges,

      supplierFactors: {
        ...current.supplierFactors,
        ...(data.supplierFactors || {}),
      },

      manufacturingProducts: Array.isArray(data.manufacturingProducts)
        ? data.manufacturingProducts
        : current.manufacturingProducts,

      profitMargins: Array.isArray(data.profitMargins)
        ? data.profitMargins
        : data.profitMargins === null
          ? null
          : current.profitMargins,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    return true;
  } catch (error) {
    console.error("Failed to save daily exchange data:", error);
    return false;
  }
};

export const updateDailyExchangeData = (updates = {}) => {
  const current = getDailyExchangeData();

  return saveDailyExchangeData({
    ...current,
    ...updates,

    supplierFactors: {
      ...current.supplierFactors,
      ...(updates.supplierFactors || {}),
    },
  });
};

/* -------------------------------------------------------------------------- */
/* Manufacturing Cost Storage                                                 */
/* -------------------------------------------------------------------------- */

export const getManufacturingProducts = () => {
  return getDailyExchangeData().manufacturingProducts;
};

export const saveManufacturingProducts = (products) => {
  if (!Array.isArray(products)) return false;

  return updateDailyExchangeData({
    manufacturingProducts: products,
  });
};

/* -------------------------------------------------------------------------- */
/* Profit Margins Storage                                                     */
/* -------------------------------------------------------------------------- */

export const getProfitMargins = () => {
  return getDailyExchangeData().profitMargins;
};

export const saveProfitMargins = (margins) => {
  if (!Array.isArray(margins)) return false;

  return updateDailyExchangeData({
    profitMargins: margins,
  });
};

/* -------------------------------------------------------------------------- */
/* Supplier Factors Storage                                                   */
/* -------------------------------------------------------------------------- */

export const getSupplierFactorsData = () => {
  const data = getDailyExchangeData();

  return {
    suppliers: data.supplierFactors.suppliers,
    stockPrices: data.supplierFactors.stockPrices,
  };
};

export const saveSupplierFactorsData = ({
  suppliers,
  stockPrices,
} = {}) => {
  const current = getDailyExchangeData();

  return updateDailyExchangeData({
    supplierFactors: {
      ...current.supplierFactors,

      suppliers: Array.isArray(suppliers)
        ? suppliers
        : current.supplierFactors.suppliers,

      stockPrices: Array.isArray(stockPrices)
        ? stockPrices
        : current.supplierFactors.stockPrices,
    },
  });
};

export const saveSuppliers = (suppliers) => {
  if (!Array.isArray(suppliers)) return false;

  const current = getDailyExchangeData();

  return updateDailyExchangeData({
    supplierFactors: {
      ...current.supplierFactors,
      suppliers,
    },
  });
};

export const saveStockPrices = (stockPrices) => {
  if (!Array.isArray(stockPrices)) return false;

  const current = getDailyExchangeData();

  return updateDailyExchangeData({
    supplierFactors: {
      ...current.supplierFactors,
      stockPrices,
    },
  });
};

/* -------------------------------------------------------------------------- */
/* Daily Exchange                                                             */
/* -------------------------------------------------------------------------- */

export const getExchangeByDate = (exchanges, date) => {
  if (!Array.isArray(exchanges) || !date) return null;

  return (
    exchanges
      .filter((exchange) => exchange.date && exchange.date <= date)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null
  );
};

export const getSupplierExchangePrice = ({
  exchange,
  supplierId,
  type,
}) => {
  if (!exchange) return null;

  const basePrice =
    type === "baladi"
      ? exchange.baladiPrice
      : exchange.whitePrice;

  const overriddenPrice =
    exchange.supplierPrices?.[supplierId]?.[type];

  const selectedPrice =
    overriddenPrice !== undefined &&
    overriddenPrice !== null &&
    overriddenPrice !== ""
      ? overriddenPrice
      : basePrice;

  const price = Number(selectedPrice);

  return Number.isFinite(price) && price > 0 ? price : null;
};

/* -------------------------------------------------------------------------- */
/* Supplier Periods                                                           */
/* -------------------------------------------------------------------------- */

export const getActiveSupplierPeriod = (supplier, date) => {
  if (!supplier || !date) return null;

  return (
    supplier.periods
      ?.filter(
        (period) =>
          period.startDate &&
          period.startDate <= date &&
          (!period.endDate || period.endDate >= date),
      )
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null
  );
};

/* -------------------------------------------------------------------------- */
/* Supplier Factors                                                           */
/* -------------------------------------------------------------------------- */

export const getSupplierFactor = ({
  supplier,
  productId,
  branchId,
  date,
}) => {
  const period = getActiveSupplierPeriod(supplier, date);

  if (!period) return null;

  const productFactor = period.productFactors?.[productId];

  if (
    productFactor === undefined ||
    productFactor === null ||
    productFactor === ""
  ) {
    return null;
  }

  const branchFactor =
    branchId !== undefined && branchId !== null && branchId !== ""
      ? period.overrides?.[productId]?.[branchId]
      : undefined;

  const selectedFactor =
    branchFactor !== undefined &&
    branchFactor !== null &&
    branchFactor !== ""
      ? branchFactor
      : productFactor;

  const factor = Number(selectedFactor);

  return Number.isFinite(factor) && factor > 0 ? factor : null;
};

/* -------------------------------------------------------------------------- */
/* Final Supplier Price                                                       */
/* -------------------------------------------------------------------------- */

export const getSupplierFinalPrice = ({
  exchanges,
  suppliers,
  supplierId,
  productId,
  branchId,
  type,
  date,
}) => {
  const exchange = getExchangeByDate(exchanges, date);

  if (!exchange) return null;

  const supplierPrice = getSupplierExchangePrice({
    exchange,
    supplierId,
    type,
  });

  if (supplierPrice === null) return null;

  const supplier = Array.isArray(suppliers)
    ? suppliers.find(
        (item) => String(item.id) === String(supplierId),
      )
    : suppliers?.[supplierId];

  if (!supplier) return null;

  const factor = getSupplierFactor({
    supplier,
    productId,
    branchId,
    date,
  });

  if (factor === null) return null;

  return supplierPrice * factor;
};
