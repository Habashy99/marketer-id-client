
/* -------------------------------------------------------------------------- */
/* Dates                                                                       */
/* -------------------------------------------------------------------------- */

// تاريخ اليوم تلقائيًا حسب توقيت الجهاز المحلي.
const getTodayDate = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const TODAY = getTodayDate();

// بداية الفترات التجريبية.
export const INITIAL_START_DATE = "2026-11-12";

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export const CATEGORIES = [
  "الإسكندرية",
  "القاهرة",
  "المنصورة",
  "الساحل الشمالي",
  "الغردقة",
  "الجيزة",
  "أسيوط",
];

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

export const INITIAL_PRODUCTS = [
  { id: 1, code: "100001", name: "دجاج بلدي فريش", supplierIds: [1, 2] },
  { id: 2, code: "100002", name: "دجاج أبيض فريش", supplierIds: [1, 3] },
  { id: 3, code: "100003", name: "فيليه دجاج فريش", supplierIds: [1, 2, 4] },
  { id: 4, code: "100004", name: "وراك دجاج فريش", supplierIds: [2, 5] },
  { id: 5, code: "100005", name: "شيش طاووق دجاج فريش", supplierIds: [1, 3] },
  { id: 6, code: "100006", name: "دبوس دجاج فريش", supplierIds: [3, 5] },
  { id: 7, code: "100007", name: "صدور دجاج بالعظم فريش", supplierIds: [1, 4] },
  { id: 8, code: "100008", name: "وراك دجاج مخلية فريش", supplierIds: [2, 4] },
  { id: 9, code: "100009", name: "كبد وقوانص دجاج فريش", supplierIds: [5, 6] },
  { id: 10, code: "100010", name: "كبد صافي دجاج فريش", supplierIds: [6, 7] },
  { id: 11, code: "100011", name: "أجنحة دجاج فريش", supplierIds: [3, 7] },
  { id: 12, code: "100012", name: "دجاج مجمد", supplierIds: [2, 8] },
  { id: 13, code: "100013", name: "صدور دجاج مجمدة", supplierIds: [4, 8] },
  { id: 14, code: "100014", name: "وراك دجاج مجمدة", supplierIds: [5, 9] },
  { id: 15, code: "100015", name: "أجنحة دجاج مجمدة", supplierIds: [7, 10] },
];

/* -------------------------------------------------------------------------- */
/* Suppliers                                                                   */
/* -------------------------------------------------------------------------- */

export const INITIAL_SUPPLIERS = [
  { id: 1, code: "SUP-001", name: "مورد الإسكندرية", baseFactor: 1.7 },
  { id: 2, code: "SUP-002", name: "مورد النور", baseFactor: 1.55 },
  { id: 3, code: "SUP-003", name: "مورد الصفوة", baseFactor: 2.8 },
  { id: 4, code: "SUP-004", name: "مورد الأمل", baseFactor: 1.3 },
  { id: 5, code: "SUP-005", name: "مورد الخير", baseFactor: 1.7 },
  { id: 6, code: "SUP-006", name: "مورد المستقبل", baseFactor: 2 },
  { id: 7, code: "SUP-007", name: "مورد الدلتا", baseFactor: 1.8 },
  { id: 8, code: "SUP-008", name: "مورد المتحدة", baseFactor: 1.2 },
  { id: 9, code: "SUP-009", name: "مورد السلام", baseFactor: 1.3 },
  { id: 10, code: "SUP-010", name: "مورد المدينة", baseFactor: 0.8 },
];

/* -------------------------------------------------------------------------- */
/* Product Overrides                                                           */
/* -------------------------------------------------------------------------- */

export const INITIAL_PRODUCT_OVERRIDES = {
  1: { 1: { 1: 2.3, 5: 2.1 } },
  3: { 2: { 2: 3.1 } },
  5: { 4: { 3: 2.5 } },
};

/* -------------------------------------------------------------------------- */
/* Stock Prices                                                                */
/* -------------------------------------------------------------------------- */

export const INITIAL_STOCK_PRICES = [
  { id: 1, productId: 1, date: TODAY, price: 100, source: "سوق الجملة" },
  { id: 2, productId: 2, date: TODAY, price: 95, source: "سوق الجملة" },
  { id: 3, productId: 3, date: TODAY, price: 180, source: "سوق الجملة" },
  { id: 4, productId: 4, date: TODAY, price: 120, source: "سوق الجملة" },
  { id: 5, productId: 5, date: TODAY, price: 150, source: "سوق الجملة" },
  { id: 6, productId: 6, date: TODAY, price: 110, source: "سوق الجملة" },
  { id: 7, productId: 7, date: TODAY, price: 170, source: "سوق الجملة" },
  { id: 8, productId: 8, date: TODAY, price: 160, source: "سوق الجملة" },
  { id: 9, productId: 9, date: TODAY, price: 85, source: "سوق الجملة" },
  { id: 10, productId: 10, date: TODAY, price: 90, source: "سوق الجملة" },
  { id: 11, productId: 11, date: TODAY, price: 75, source: "سوق الجملة" },
  { id: 12, productId: 12, date: TODAY, price: 130, source: "سوق الجملة" },
  { id: 13, productId: 13, date: TODAY, price: 190, source: "سوق الجملة" },
  { id: 14, productId: 14, date: TODAY, price: 140, source: "سوق الجملة" },
  { id: 15, productId: 15, date: TODAY, price: 80, source: "سوق الجملة" },
];

/* -------------------------------------------------------------------------- */
/* Supplier Periods                                                            */
/* -------------------------------------------------------------------------- */

export const INITIAL_SUPPLIER_PERIODS = INITIAL_SUPPLIERS.map(
  (supplier) => ({
    ...supplier,
    periods: [
      {
        id: `supplier-${supplier.id}-period-1`,
        startDate: INITIAL_START_DATE,
        endDate: null,
        baseFactor: supplier.baseFactor,
        overrides: INITIAL_PRODUCT_OVERRIDES[supplier.id] || {},
      },
    ],
  }),
);

/* -------------------------------------------------------------------------- */
/* Initial Profit Margins                                                      */
/* -------------------------------------------------------------------------- */

export const createInitialMargins = () =>
  INITIAL_PRODUCTS.flatMap((product) =>
    CATEGORIES.map((category, index) => ({
      id: `${product.id}-${index + 1}`,
      productId: product.id,
      category,
      startDate: INITIAL_START_DATE,
      endDate: null,
      profitMargin: 20,
    })),
  );
