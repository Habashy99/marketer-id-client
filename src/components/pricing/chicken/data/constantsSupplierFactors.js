
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

/**
 * مفتاح ثابت للمنتج:
 * itemean أولاً، ثم barcode، ثم id كحل أخير.
 */
export const getStableProductKey = (product) => {
  const itemean = String(product?.itemean ?? "").trim();

  if (itemean) {
    return `itemean:${itemean}`;
  }

  const barcode = String(product?.barcode ?? "").trim();

  if (barcode) {
    return `barcode:${barcode}`;
  }

  const id = String(product?.id ?? "").trim();

  return id ? `legacy:${id}` : "";
};

/**
 * توحيد شكل المنتج القادم من البورصة.
 */
export const normalizeSupplierFactorProduct = (product) => {
  const key = getStableProductKey(product);

  const rawType = String(product?.type ?? "")
    .trim()
    .toLowerCase();

  const type =
    rawType === "baladi" ||
    rawType === "white" ||
    rawType.includes("بلدي") ||
    rawType.includes("balady")
      ? rawType === "white"
        ? "white"
        : "baladi"
      : "white";

  return {
    ...product,
    id: key,
    key,
    code: String(
      product?.itemean ||
        product?.barcode ||
        product?.id ||
        ""
    ),
    name: String(
      product?.name ||
        product?.a_name ||
        "منتج بدون اسم"
    ),
    barcode: String(product?.barcode ?? ""),
    itemean: String(product?.itemean ?? ""),
    type,
    unitName: String(
      product?.unitName ||
        product?.unit ||
        ""
    ),
    suppliers: Array.isArray(product?.suppliers)
      ? product.suppliers
      : [],
  };
};

/**
 * أعمدة الجدول الثابتة.
 */
export const STICKY_COLUMN_CLASSES = {
  number:
    "sticky right-0 z-20 w-[56px] min-w-[56px] max-w-[56px]",

  code:
    "sticky right-[56px] z-20 w-[160px] min-w-[160px] max-w-[160px]",

  name:
    "sticky right-[216px] z-20 w-[220px] min-w-[220px] max-w-[220px]",

  base:
    "sticky right-[436px] z-20 w-[130px] min-w-[130px] max-w-[130px]",
};

export const STICKY_HEADER_CLASSES = {
  number:
    "sticky right-0 top-0 z-50 w-[56px] min-w-[56px] max-w-[56px]",

  code:
    "sticky right-[56px] top-0 z-50 w-[160px] min-w-[160px] max-w-[160px]",

  name:
    "sticky right-[216px] top-0 z-50 w-[220px] min-w-[220px] max-w-[220px]",

  base:
    "sticky right-[436px] top-0 z-50 w-[130px] min-w-[130px] max-w-[130px]",
};
