export const ALLOWED_FILE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "pdf",
  "xls",
  "xlsx",
];

export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

export const BRANCHES = Array.from({ length: 44 }, (_, index) => ({
  id: index + 1,
  name: `فرع ${index + 1}`,
}));

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

export const INITIAL_PRODUCT_OVERRIDES = {
  1: { 1: { 1: 2.3, 5: 2.1 } },
  3: { 2: { 2: 3.1 } },
  5: { 4: { 3: 2.5 } },
};

export const createInitialStockPrices = (today) => [
  { id: 1, productId: 1, date: today, price: 100, source: "سوق الجملة" },
  { id: 2, productId: 2, date: today, price: 95, source: "سوق الجملة" },
  { id: 3, productId: 3, date: today, price: 180, source: "سوق الجملة" },
  { id: 4, productId: 4, date: today, price: 120, source: "سوق الجملة" },
  { id: 5, productId: 5, date: today, price: 150, source: "سوق الجملة" },
  { id: 6, productId: 6, date: today, price: 110, source: "سوق الجملة" },
  { id: 7, productId: 7, date: today, price: 170, source: "سوق الجملة" },
  { id: 8, productId: 8, date: today, price: 160, source: "سوق الجملة" },
  { id: 9, productId: 9, date: today, price: 85, source: "سوق الجملة" },
  { id: 10, productId: 10, date: today, price: 90, source: "سوق الجملة" },
  { id: 11, productId: 11, date: today, price: 75, source: "سوق الجملة" },
  { id: 12, productId: 12, date: today, price: 130, source: "سوق الجملة" },
  { id: 13, productId: 13, date: today, price: 190, source: "سوق الجملة" },
  { id: 14, productId: 14, date: today, price: 140, source: "سوق الجملة" },
  { id: 15, productId: 15, date: today, price: 80, source: "سوق الجملة" },
];

export const STICKY_COLUMN_CLASSES = {
  number: "sticky right-0 z-20 w-[56px] min-w-[56px] max-w-[56px]",
  code: "sticky right-[56px] z-20 w-[160px] min-w-[160px] max-w-[160px]",
  name: "sticky right-[216px] z-20 w-[220px] min-w-[220px] max-w-[220px]",
  base: "sticky right-[436px] z-20 w-[130px] min-w-[130px] max-w-[130px]",
};

export const STICKY_HEADER_CLASSES = {
  number: "sticky right-0 top-0 z-50 w-[56px] min-w-[56px] max-w-[56px]",
  code: "sticky right-[56px] top-0 z-50 w-[160px] min-w-[160px] max-w-[160px]",
  name: "sticky right-[216px] top-0 z-50 w-[220px] min-w-[220px] max-w-[220px]",
  base: "sticky right-[436px] top-0 z-50 w-[130px] min-w-[130px] max-w-[130px]",
};