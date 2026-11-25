
const STORAGE_KEY = "dailyExchangeData";
const PROFIT_MARGINS_RESET_KEY = "sellingPricesMarginsResetV1";

const EMPTY_DATA = {
  exchanges: [],
  supplierFactors: {
    suppliers: [],
    stockPrices: [],
    products: [],
  },
  manufacturingProducts: [],
  poultryProducts: [],
  profitMargins: [],
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
    products: Array.isArray(factors.products)
      ? factors.products
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

  poultryProducts: Array.isArray(data?.poultryProducts)
    ? data.poultryProducts
    : [],

  profitMargins: Array.isArray(data?.profitMargins)
    ? data.profitMargins
    : [],
});

/* -------------------------------------------------------------------------- */
/* One-Time Old Profit Margins Reset                                          */
/* -------------------------------------------------------------------------- */

const resetOldProfitMarginsOnce = (data) => {
  try {
    const alreadyReset = localStorage.getItem(PROFIT_MARGINS_RESET_KEY);

    if (alreadyReset === "true") {
      return data;
    }

    const cleanData = {
      ...data,
      profitMargins: [],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
    localStorage.setItem(PROFIT_MARGINS_RESET_KEY, "true");

    return cleanData;
  } catch (error) {
    console.error("Failed to reset old profit margins:", error);
    return data;
  }
};

/* -------------------------------------------------------------------------- */
/* Shared Storage                                                             */
/* -------------------------------------------------------------------------- */

export const getDailyExchangeData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const emptyData = cloneData(EMPTY_DATA);
      return resetOldProfitMarginsOnce(emptyData);
    }

    const normalized = normalizeData(JSON.parse(saved));

    return resetOldProfitMarginsOnce(normalized);
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

      poultryProducts: Array.isArray(data.poultryProducts)
        ? data.poultryProducts
        : current.poultryProducts,

      profitMargins: Array.isArray(data.profitMargins)
        ? data.profitMargins
        : data.profitMargins === null
          ? []
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
/* Poultry Products Storage                                                   */
/* -------------------------------------------------------------------------- */

export const getPoultryProducts = () => {
  return getDailyExchangeData().poultryProducts;
};

export const savePoultryProducts = (products) => {
  if (!Array.isArray(products)) return false;

  return updateDailyExchangeData({
    poultryProducts: products,
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
  const factors = data.supplierFactors || {};

  return {
    suppliers: Array.isArray(factors.suppliers) ? factors.suppliers : [],
    stockPrices: Array.isArray(factors.stockPrices)
      ? factors.stockPrices
      : [],
    products: Array.isArray(factors.products) ? factors.products : [],
  };
};

export const saveSupplierFactorsData = ({
  suppliers,
  stockPrices,
  products,
} = {}) => {
  const current = getDailyExchangeData();
  const currentFactors = current.supplierFactors || {};

  return updateDailyExchangeData({
    supplierFactors: {
      ...currentFactors,

      suppliers: Array.isArray(suppliers)
        ? suppliers
        : currentFactors.suppliers || [],

      stockPrices: Array.isArray(stockPrices)
        ? stockPrices
        : currentFactors.stockPrices || [],

      products: Array.isArray(products)
        ? products
        : currentFactors.products || [],
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

export const saveSupplierProducts = (products) => {
  if (!Array.isArray(products)) return false;

  const current = getDailyExchangeData();

  return updateDailyExchangeData({
    supplierFactors: {
      ...current.supplierFactors,
      products,
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

/* -------------------------------------------------------------------------- */
/* Daily Exchange Helpers                                                     */
/* -------------------------------------------------------------------------- */

export const saveExchange = (exchange) => {
  if (!exchange?.date) return false;

  const data = getDailyExchangeData();
  const exchanges = [...data.exchanges];

  const index = exchanges.findIndex(
    (item) => item.date === exchange.date,
  );

  if (index >= 0) {
    exchanges[index] = {
      ...exchanges[index],
      ...exchange,
    };
  } else {
    exchanges.push(exchange);
  }

  exchanges.sort((a, b) => b.date.localeCompare(a.date));

  return updateDailyExchangeData({ exchanges });
};

export const deleteExchange = (date) => {
  if (!date) return false;

  const data = getDailyExchangeData();

  return updateDailyExchangeData({
    exchanges: data.exchanges.filter(
      (exchange) => exchange.date !== date,
    ),
  });
};

export const getExchangeProducts = (exchange) => {
  return Array.isArray(exchange?.products)
    ? exchange.products
    : [];
};

export const saveExchangeProducts = (date, products) => {
  if (!date || !Array.isArray(products)) return false;

  const data = getDailyExchangeData();

  const exchange = data.exchanges.find(
    (item) => item.date === date,
  );

  if (!exchange) return false;

  return saveExchange({
    ...exchange,
    products,
  });
};

/* -------------------------------------------------------------------------- */
/* Product Key Matching                                                       */
/* -------------------------------------------------------------------------- */

const getMatchingProductKey = (data, productId) => {
  if (!data || typeof data !== "object") return null;

  const rawId = String(productId ?? "").trim();
  if (!rawId) return null;

  const candidates = [
    rawId,
    `barcode:${rawId}`,
    `itemean:${rawId}`,
    `legacy:${rawId}`,
  ];

  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return key;
    }
  }

  return (
    Object.keys(data).find(
      (key) => key === rawId || key.endsWith(`:${rawId}`),
    ) || null
  );
};

/* -------------------------------------------------------------------------- */
/* Highest Supplier Factor                                                    */
/* -------------------------------------------------------------------------- */

export const getHighestSupplierFactor = ({
  supplier,
  productId,
  date,
}) => {
  const period = getActiveSupplierPeriod(supplier, date);

  if (!period) return null;

  const productKey = getMatchingProductKey(
    period.productFactors,
    productId,
  );

  if (!productKey) return null;

  const baseFactor = Number(
    period.productFactors?.[productKey],
  );

  const factors = [];

  if (Number.isFinite(baseFactor) && baseFactor > 0) {
    factors.push(baseFactor);
  }

  const branchOverrides =
    period.overrides?.[productKey] || {};

  Object.values(branchOverrides).forEach((value) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    const factor = Number(value);

    if (Number.isFinite(factor) && factor > 0) {
      factors.push(factor);
    }
  });

  return factors.length ? Math.max(...factors) : null;
};
